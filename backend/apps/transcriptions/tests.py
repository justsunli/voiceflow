import json
from datetime import date, time
from unittest.mock import Mock, patch

from allauth.socialaccount.models import SocialAccount, SocialApp, SocialToken
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Action, Transcription
from .services import extract_action_suggestion


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


class ActionCalendarSyncApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="calendar_user",
            email="calendar@example.com",
            password="pass12345",
        )
        self.action = Action.objects.create(
            user=self.user,
            type="event",
            title="Doctor appointment",
            date=date(2026, 3, 27),
            time=time(12, 0),
            timezone="America/Los_Angeles",
        )

    @patch("apps.transcriptions.views.requests.post")
    def test_add_to_calendar_success(self, mock_post: Mock):
        social_account = SocialAccount.objects.create(
            user=self.user,
            provider="google",
            uid="google-uid-1",
        )
        SocialToken.objects.create(account=social_account, token="fake-access-token")

        fake_response = Mock()
        fake_response.status_code = 200
        fake_response.json.return_value = {"id": "calendar-event-123"}
        mock_post.return_value = fake_response

        self.client.force_authenticate(self.user)
        response = self.client.post(f"/api/actions/{self.action.id}/add-to-calendar/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.action.refresh_from_db()
        self.assertEqual(self.action.status, Action.STATUS_SYNCED)
        self.assertEqual(self.action.calendar_event_id, "calendar-event-123")
        first_call_kwargs = mock_post.call_args.kwargs
        self.assertEqual(
            first_call_kwargs["json"]["start"]["timeZone"],
            "America/Los_Angeles",
        )

    def test_add_to_calendar_without_google_account(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(f"/api/actions/{self.action.id}/add-to-calendar/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.transcriptions.views.requests.post")
    def test_add_to_calendar_refreshes_token_when_expired(self, mock_post: Mock):
        social_app = SocialApp.objects.create(
            provider="google",
            name="Google",
            client_id="test-client-id",
            secret="test-client-secret",
        )
        social_account = SocialAccount.objects.create(
            user=self.user,
            provider="google",
            uid="google-uid-2",
        )
        token = SocialToken.objects.create(
            account=social_account,
            app=social_app,
            token="expired-access-token",
            token_secret="refresh-token-value",
        )

        calendar_401 = Mock()
        calendar_401.status_code = 401
        calendar_401.json.return_value = {"error": {"message": "unauthorized"}}

        refresh_response = Mock()
        refresh_response.status_code = 200
        refresh_response.json.return_value = {"access_token": "new-access-token", "expires_in": 3600}

        calendar_success = Mock()
        calendar_success.status_code = 200
        calendar_success.json.return_value = {"id": "calendar-event-999"}

        mock_post.side_effect = [calendar_401, refresh_response, calendar_success]

        self.client.force_authenticate(self.user)
        response = self.client.post(f"/api/actions/{self.action.id}/add-to-calendar/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token.refresh_from_db()
        self.assertEqual(token.token, "new-access-token")

    @patch("apps.transcriptions.views.requests.post")
    def test_add_to_calendar_missing_event_id_is_error(self, mock_post: Mock):
        social_account = SocialAccount.objects.create(
            user=self.user,
            provider="google",
            uid="google-uid-3",
        )
        SocialToken.objects.create(account=social_account, token="fake-access-token")

        fake_response = Mock()
        fake_response.status_code = 200
        fake_response.json.return_value = {"summary": "Doctor appointment"}
        mock_post.return_value = fake_response

        self.client.force_authenticate(self.user)
        response = self.client.post(f"/api/actions/{self.action.id}/add-to-calendar/")

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.action.refresh_from_db()
        self.assertEqual(self.action.status, Action.STATUS_CONFIRMED)
        self.assertIsNone(self.action.calendar_event_id)

    def test_owner_can_delete_action(self):
        self.client.force_authenticate(self.user)
        response = self.client.delete(f"/api/actions/{self.action.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Action.objects.filter(id=self.action.id).exists())

    def test_non_owner_cannot_delete_action(self):
        user_model = get_user_model()
        other_user = user_model.objects.create_user(
            username="other_calendar_user",
            email="other-calendar@example.com",
            password="pass12345",
        )

        self.client.force_authenticate(other_user)
        response = self.client.delete(f"/api/actions/{self.action.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ActionExtractionNormalizationTests(APITestCase):
    @patch("apps.transcriptions.services.requests.post")
    @patch("apps.transcriptions.services.django_timezone.localdate")
    def test_extract_action_suggestion_infers_upcoming_year(self, mock_localdate: Mock, mock_post: Mock):
        mock_localdate.return_value = date(2026, 3, 28)
        extraction_response = Mock()
        extraction_response.status_code = 200
        extraction_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {
                                "detected": True,
                                "type": "event",
                                "title": "Workout class",
                                "date": "2024-03-27",
                                "time": "12:00",
                                "confidence": "high",
                            }
                        )
                    }
                }
            ]
        }
        mock_post.return_value = extraction_response

        suggestion = extract_action_suggestion("I have a workout class on March 27 at 12pm.")

        self.assertIsNotNone(suggestion)
        assert suggestion is not None
        self.assertEqual(suggestion["date"], "2027-03-27")
        self.assertEqual(suggestion["time"], "12:00")

    @patch("apps.transcriptions.services.requests.post")
    @patch("apps.transcriptions.services.django_timezone.localdate")
    def test_extract_action_suggestion_supports_meridiem_time(self, mock_localdate: Mock, mock_post: Mock):
        mock_localdate.return_value = date(2026, 3, 28)
        extraction_response = Mock()
        extraction_response.status_code = 200
        extraction_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {
                                "detected": True,
                                "type": "event",
                                "title": "Workout class",
                                "date": "2026-03-29",
                                "time": "12:00 PM",
                                "confidence": "high",
                            }
                        )
                    }
                }
            ]
        }
        mock_post.return_value = extraction_response

        suggestion = extract_action_suggestion("Tomorrow at 12pm workout class.")

        self.assertIsNotNone(suggestion)
        assert suggestion is not None
        self.assertEqual(suggestion["date"], "2026-03-29")
        self.assertEqual(suggestion["time"], "12:00")
