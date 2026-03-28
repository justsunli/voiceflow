from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Transcription


class TranscriptionDetailApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="pass12345",
        )
        self.other_user = user_model.objects.create_user(
            username="other",
            email="other@example.com",
            password="pass12345",
        )
        self.transcription = Transcription.objects.create(
            user=self.user,
            audio_file="audio/test_owner.webm",
            transcript="original transcript",
        )
        self.other_transcription = Transcription.objects.create(
            user=self.other_user,
            audio_file="audio/test_other.webm",
            transcript="other transcript",
        )

    def test_owner_can_patch_transcription(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch(
            f"/api/transcriptions/{self.transcription.id}/",
            {"transcript": "updated transcript"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.transcription.refresh_from_db()
        self.assertEqual(self.transcription.transcript, "updated transcript")

    def test_patch_rejects_empty_transcript(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch(
            f"/api/transcriptions/{self.transcription.id}/",
            {"transcript": "   "},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "'transcript' cannot be empty")

    def test_non_owner_patch_returns_404(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch(
            f"/api/transcriptions/{self.other_transcription.id}/",
            {"transcript": "not allowed"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_delete_transcription(self):
        self.client.force_authenticate(self.user)
        response = self.client.delete(f"/api/transcriptions/{self.transcription.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Transcription.objects.filter(id=self.transcription.id).exists())

    def test_non_owner_delete_returns_404(self):
        self.client.force_authenticate(self.user)
        response = self.client.delete(f"/api/transcriptions/{self.other_transcription.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
