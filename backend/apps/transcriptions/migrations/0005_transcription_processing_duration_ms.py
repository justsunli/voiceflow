from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("transcriptions", "0004_transcription_mode"),
    ]

    operations = [
        migrations.AddField(
            model_name="transcription",
            name="processing_duration_ms",
            field=models.PositiveIntegerField(blank=True, db_index=True, null=True),
        ),
    ]
