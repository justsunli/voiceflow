import json
import re
from datetime import date, timedelta
from pathlib import Path

import requests
from django.conf import settings
from django.utils import timezone as django_timezone


class TranscriptionServiceError(Exception):
    pass


class ActionExtractionServiceError(Exception):
    pass


ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ISO_TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")
MERIDIEM_TIME_PATTERN = re.compile(r"^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$")


def _normalize_time(raw_time: str | None) -> str | None:
    if not raw_time:
        return None

    value = raw_time.strip()
    if ISO_TIME_PATTERN.match(value):
        return value

    meridiem_match = MERIDIEM_TIME_PATTERN.match(value)
    if meridiem_match:
        hour = int(meridiem_match.group(1))
        minute = int(meridiem_match.group(2))
        meridiem = meridiem_match.group(3).lower()
        if hour < 1 or hour > 12 or minute > 59:
            return None
        if meridiem == "pm" and hour != 12:
            hour += 12
        if meridiem == "am" and hour == 12:
            hour = 0
        return f"{hour:02d}:{minute:02d}"

    return None


def _has_explicit_year(transcript: str) -> bool:
    if re.search(r"\b(19|20)\d{2}\b", transcript):
        return True
    return bool(re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2}\b", transcript))


def _infer_year(month: int, day: int, reference: date) -> date | None:
    candidates: list[date] = []
    for year in (reference.year - 1, reference.year, reference.year + 1):
        try:
            candidates.append(date(year, month, day))
        except ValueError:
            continue
    if not candidates:
        return None

    future_or_today = [item for item in candidates if item >= reference]
    if future_or_today:
        return min(future_or_today)
    return max(candidates)


def _normalize_date(raw_date: str | None, transcript: str) -> str | None:
    if not raw_date:
        lowered = transcript.lower()
        today = django_timezone.localdate()
        if "day after tomorrow" in lowered:
            return (today + timedelta(days=2)).isoformat()
        if "tomorrow" in lowered:
            return (today + timedelta(days=1)).isoformat()
        if "today" in lowered:
            return today.isoformat()
        if "yesterday" in lowered:
            return (today - timedelta(days=1)).isoformat()
        return None

    value = raw_date.strip()
    if not ISO_DATE_PATTERN.match(value):
        return None

    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        return None

    if _has_explicit_year(transcript):
        return parsed.isoformat()

    today = django_timezone.localdate()
    inferred = _infer_year(parsed.month, parsed.day, today)
    if inferred is None:
        return parsed.isoformat()
    return inferred.isoformat()


def transcribe_audio(audio_path: Path | str, filename: str) -> str:
    api_key = settings.OPENAI_API_KEY
    model = settings.OPENAI_TRANSCRIPTION_MODEL
    language = settings.OPENAI_TRANSCRIPTION_LANGUAGE
    prompt = settings.OPENAI_TRANSCRIPTION_PROMPT
    audio_file_path = Path(audio_path)

    if not api_key:
        raise TranscriptionServiceError("OPENAI_API_KEY is not configured")

    request_data = {"model": model}
    if language:
        request_data["language"] = language
    if prompt:
        request_data["prompt"] = prompt

    with audio_file_path.open("rb") as audio_stream:
        response = requests.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            data=request_data,
            files={"file": (filename, audio_stream, "application/octet-stream")},
            timeout=120,
        )

    if response.status_code >= 400:
        raise TranscriptionServiceError(
            f"OpenAI transcription request failed ({response.status_code}): {response.text}"
        )

    payload = response.json()
    transcript = payload.get("text", "").strip()
    if not transcript:
        raise TranscriptionServiceError("No transcript text returned by transcription provider")

    return transcript


def extract_action_suggestion(transcript: str) -> dict | None:
    api_key = settings.OPENAI_API_KEY
    model = settings.OPENAI_ACTION_MODEL
    if not api_key:
        raise ActionExtractionServiceError("OPENAI_API_KEY is not configured")

    schema = {
        "name": "action_suggestion",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "detected": {"type": "boolean"},
                "type": {"type": ["string", "null"], "enum": ["event", "reminder", "todo", None]},
                "title": {"type": ["string", "null"]},
                "date": {"type": ["string", "null"]},
                "time": {"type": ["string", "null"]},
                "confidence": {"type": ["string", "null"], "enum": ["high", "medium", "low", None]},
            },
            "required": ["detected", "type", "title", "date", "time", "confidence"],
        },
    }

    today = django_timezone.localdate()
    prompt = (
        "Extract a single actionable item from the transcript. "
        "If no clear action exists, return detected=false and all other fields null. "
        f"Today is {today.isoformat()} in local server date context. "
        "Resolve relative dates like today/tomorrow/next Monday against that date. "
        "If month/day is present but year is omitted, infer the most plausible upcoming date. "
        "Use ISO date (YYYY-MM-DD) and 24h time (HH:MM)."
    )

    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": transcript},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": schema,
            },
            "temperature": 0,
        },
        timeout=60,
    )

    if response.status_code >= 400:
        raise ActionExtractionServiceError(
            f"OpenAI action extraction request failed ({response.status_code}): {response.text}"
        )

    payload = response.json()
    try:
        content = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ActionExtractionServiceError("Invalid extraction response payload") from exc

    try:
        parsed = json.loads(content)
    except Exception as exc:  # pragma: no cover
        raise ActionExtractionServiceError("Failed to parse extraction response JSON") from exc

    if not parsed.get("detected"):
        return None

    normalized_date = _normalize_date(parsed.get("date"), transcript)
    normalized_time = _normalize_time(parsed.get("time"))

    suggestion = {
        "type": parsed.get("type"),
        "title": parsed.get("title"),
        "date": normalized_date,
        "time": normalized_time,
        "confidence": parsed.get("confidence"),
    }
    if not suggestion["type"] or not suggestion["title"]:
        return None
    return suggestion
