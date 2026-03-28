from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("transcriptions", "0002_action_and_suggestion"),
    ]

    operations = [
        migrations.AddField(
            model_name="action",
            name="timezone",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
    ]
