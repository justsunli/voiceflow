from pathlib import Path

import requests
from django.conf import settings


class TranscriptionServiceError(Exception):
    pass


class ActionExtractionServiceError(Exception):
    pass


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

    prompt = (
        "Extract a single actionable item from the transcript. "
        "If no clear action exists, return detected=false and all other fields null. "
        "Use ISO date (YYYY-MM-DD) and 24h time (HH:MM) when possible."
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
        import json

        parsed = json.loads(content)
    except Exception as exc:  # pragma: no cover
        raise ActionExtractionServiceError("Failed to parse extraction response JSON") from exc

    if not parsed.get("detected"):
        return None

    suggestion = {
        "type": parsed.get("type"),
        "title": parsed.get("title"),
        "date": parsed.get("date"),
        "time": parsed.get("time"),
        "confidence": parsed.get("confidence"),
    }
    if not suggestion["type"] or not suggestion["title"]:
        return None
    return suggestion
