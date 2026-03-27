from django.conf import settings
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
