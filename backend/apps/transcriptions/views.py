from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Transcription
from .serializers import TranscriptionSerializer
from .services import TranscriptionServiceError, transcribe_audio


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
    transcription.save(update_fields=["transcript"])

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
