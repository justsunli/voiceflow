from pathlib import Path

import requests
from django.conf import settings


class TranscriptionServiceError(Exception):
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
