from django.conf import settings
from django.db import models


class Transcription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transcriptions")
    audio_file = models.FileField(upload_to="audio/%Y/%m/%d")
    transcript = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Transcription<{self.id}> user={self.user_id}"
