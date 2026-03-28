from django.conf import settings
from django.db import models


class Transcription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transcriptions")
    audio_file = models.FileField(upload_to="audio/%Y/%m/%d")
    transcript = models.TextField()
    raw_action_suggestion = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Transcription<{self.id}> user={self.user_id}"


class Action(models.Model):
    TYPE_EVENT = "event"
    TYPE_REMINDER = "reminder"
    TYPE_TODO = "todo"
    TYPE_CHOICES = [
        (TYPE_EVENT, "event"),
        (TYPE_REMINDER, "reminder"),
        (TYPE_TODO, "todo"),
    ]

    STATUS_CONFIRMED = "confirmed"
    STATUS_SYNCED = "synced_to_calendar"
    STATUS_CHOICES = [
        (STATUS_CONFIRMED, "confirmed"),
        (STATUS_SYNCED, "synced_to_calendar"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="actions")
    transcription = models.ForeignKey(
        Transcription,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="actions",
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    date = models.DateField(null=True, blank=True)
    time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_CONFIRMED)
    calendar_event_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Action<{self.id}> user={self.user_id} type={self.type}"
