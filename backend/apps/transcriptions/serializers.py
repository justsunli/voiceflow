from rest_framework import serializers

from .models import Action, Transcription


class TranscriptionSerializer(serializers.ModelSerializer):
    action_suggestion = serializers.SerializerMethodField()

    def get_action_suggestion(self, obj: Transcription):
        return obj.raw_action_suggestion

    class Meta:
        model = Transcription
        fields = ["id", "mode", "transcript", "created_at", "action_suggestion"]


class ActionSerializer(serializers.ModelSerializer):
    transcription_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Action
        fields = [
            "id",
            "transcription_id",
            "type",
            "title",
            "date",
            "time",
            "timezone",
            "status",
            "calendar_event_id",
            "created_at",
        ]
        read_only_fields = ["id", "status", "calendar_event_id", "created_at"]

    def validate_type(self, value: str):
        allowed = {choice[0] for choice in Action.TYPE_CHOICES}
        if value not in allowed:
            raise serializers.ValidationError("Invalid action type")
        return value
