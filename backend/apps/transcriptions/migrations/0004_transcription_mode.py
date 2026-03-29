from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("transcriptions", "0003_action_timezone"),
    ]

    operations = [
        migrations.AddField(
            model_name="transcription",
            name="mode",
            field=models.CharField(
                choices=[("transcript", "transcript"), ("action", "action")],
                default="action",
                max_length=20,
            ),
        ),
    ]
