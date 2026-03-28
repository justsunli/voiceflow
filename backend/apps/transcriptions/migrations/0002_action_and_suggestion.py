from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("transcriptions", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="transcription",
            name="raw_action_suggestion",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="Action",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "type",
                    models.CharField(
                        choices=[("event", "event"), ("reminder", "reminder"), ("todo", "todo")],
                        max_length=20,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("date", models.DateField(blank=True, null=True)),
                ("time", models.TimeField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("confirmed", "confirmed"), ("synced_to_calendar", "synced_to_calendar")],
                        default="confirmed",
                        max_length=32,
                    ),
                ),
                ("calendar_event_id", models.CharField(blank=True, max_length=255, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "transcription",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="actions",
                        to="transcriptions.transcription",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="actions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
