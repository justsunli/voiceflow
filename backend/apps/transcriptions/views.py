from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import requests
from allauth.socialaccount.models import SocialAccount, SocialToken
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone as django_timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Action, Transcription
from .serializers import ActionSerializer, TranscriptionSerializer
from .services import (
    ActionExtractionServiceError,
    TranscriptionServiceError,
    extract_action_suggestion,
    transcribe_audio,
)


def _refresh_google_access_token(social_account: SocialAccount, social_token: SocialToken) -> str | None:
    refresh_token = social_token.token_secret or social_account.extra_data.get("refresh_token")
    if not refresh_token:
        return None
    if not social_token.app:
        return None

    response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": social_token.app.client_id,
            "client_secret": social_token.app.secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=20,
    )
    if response.status_code >= 400:
        return None

    payload = response.json()
    access_token = payload.get("access_token")
    if not access_token:
        return None

    social_token.token = access_token
    update_fields = ["token"]

    expires_in = payload.get("expires_in")
    if expires_in:
        social_token.expires_at = django_timezone.now() + timedelta(seconds=int(expires_in))
        update_fields.append("expires_at")

    new_refresh_token = payload.get("refresh_token")
    if new_refresh_token:
        social_token.token_secret = new_refresh_token
        update_fields.append("token_secret")

    social_token.save(update_fields=update_fields)
    return access_token


def _build_calendar_event_payload(action: Action, timezone_name: str) -> dict:
    try:
        tzinfo = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        timezone_name = settings.TIME_ZONE
        tzinfo = ZoneInfo(timezone_name)

    if action.date and action.time:
        start_dt = datetime.combine(action.date, action.time).replace(tzinfo=tzinfo)
        end_dt = start_dt + timedelta(hours=1)
        return {
            "summary": action.title,
            "start": {"dateTime": start_dt.isoformat(), "timeZone": timezone_name},
            "end": {"dateTime": end_dt.isoformat(), "timeZone": timezone_name},
        }

    if action.date:
        end_date = action.date + timedelta(days=1)
        return {
            "summary": action.title,
            "start": {"date": action.date.isoformat()},
            "end": {"date": end_date.isoformat()},
        }

    now = django_timezone.now().astimezone(tzinfo)
    end = now + timedelta(hours=1)
    return {
        "summary": action.title,
        "start": {"dateTime": now.isoformat(), "timeZone": timezone_name},
        "end": {"dateTime": end.isoformat(), "timeZone": timezone_name},
    }


@api_view(["GET", "POST"])
def transcription_collection(request):
    if request.method == "GET":
        queryset = Transcription.objects.filter(user=request.user)
        serializer = TranscriptionSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    audio = request.FILES.get("audio")
    if not audio:
        return Response({"detail": "'audio' file is required"}, status=status.HTTP_400_BAD_REQUEST)

    if audio.size > settings.MAX_AUDIO_UPLOAD_BYTES:
        return Response(
            {
                "detail": (
                    f"Audio file too large. Max size is {settings.MAX_AUDIO_UPLOAD_BYTES} bytes"
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    transcription = Transcription.objects.create(
        user=request.user,
        audio_file=audio,
        transcript="",
    )

    try:
        transcript_text = transcribe_audio(transcription.audio_file.path, audio.name)
    except TranscriptionServiceError as exc:
        transcription.delete()
        return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    transcription.transcript = transcript_text
    try:
        suggestion = extract_action_suggestion(transcript_text)
    except ActionExtractionServiceError:
        suggestion = None

    transcription.raw_action_suggestion = suggestion
    transcription.save(update_fields=["transcript", "raw_action_suggestion"])

    serializer = TranscriptionSerializer(transcription)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
def transcription_detail(request, transcription_id: int):
    transcription = get_object_or_404(Transcription, id=transcription_id, user=request.user)

    if request.method == "DELETE":
        transcription.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    transcript = request.data.get("transcript")
    if not isinstance(transcript, str):
        return Response(
            {"detail": "'transcript' must be a string"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    transcript = transcript.strip()
    if not transcript:
        return Response(
            {"detail": "'transcript' cannot be empty"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    transcription.transcript = transcript
    transcription.save(update_fields=["transcript"])
    serializer = TranscriptionSerializer(transcription)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
def action_collection(request):
    if request.method == "GET":
        queryset = Action.objects.filter(user=request.user)
        serializer = ActionSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    serializer = ActionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    transcription_id = serializer.validated_data.pop("transcription_id", None)
    transcription = None
    if transcription_id is not None:
        transcription = get_object_or_404(Transcription, id=transcription_id, user=request.user)

    action = Action.objects.create(
        user=request.user,
        transcription=transcription,
        **serializer.validated_data,
    )
    output = ActionSerializer(action)
    return Response(output.data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
def action_detail(request, action_id: int):
    action = get_object_or_404(Action, id=action_id, user=request.user)
    action.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
def add_action_to_calendar(request, action_id: int):
    action = get_object_or_404(Action, id=action_id, user=request.user)

    social_account = SocialAccount.objects.filter(user=request.user, provider="google").first()
    if not social_account:
        return Response(
            {"detail": "Google account is not connected"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    social_token = SocialToken.objects.filter(account=social_account).order_by("-id").first()
    if not social_token or not social_token.token:
        return Response(
            {"detail": "Google OAuth token not found. Please reconnect Google."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    timezone_name = action.timezone or settings.TIME_ZONE
    event_payload = _build_calendar_event_payload(action, timezone_name)
    access_token = social_token.token

    response = None
    for attempt in range(2):
        response = requests.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=event_payload,
            timeout=30,
        )

        if response.status_code != 401:
            break

        if attempt == 0:
            refreshed_token = _refresh_google_access_token(social_account, social_token)
            if not refreshed_token:
                break
            access_token = refreshed_token
            continue
        break

    assert response is not None

    if response.status_code == 401:
        return Response(
            {"detail": "Google token expired and refresh failed. Please reconnect Google."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if response.status_code >= 400:
        detail = response.text
        try:
            payload = response.json()
            detail = payload.get("error", {}).get("message") or detail
        except Exception:
            pass
        return Response(
            {"detail": f"Calendar sync failed: {detail}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    payload = response.json()
    event_id = payload.get("id")
    if not event_id:
        return Response(
            {"detail": "Calendar sync failed: missing event id in Google response"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    action.status = Action.STATUS_SYNCED
    action.calendar_event_id = event_id
    action.save(update_fields=["status", "calendar_event_id"])

    serializer = ActionSerializer(action)
    result = serializer.data
    result["calendar_event_link"] = payload.get("htmlLink")
    return Response(result, status=status.HTTP_200_OK)
