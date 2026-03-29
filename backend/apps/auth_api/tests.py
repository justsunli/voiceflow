from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


class CurrentUserApiTests(APITestCase):
    def test_me_returns_csrf_token_for_anonymous_user(self):
        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["authenticated"], False)
        self.assertIsNone(response.data["user"])
        self.assertTrue(response.data.get("csrf_token"))

    def test_me_returns_csrf_token_for_authenticated_user(self):
        user_model = get_user_model()
        user = user_model.objects.create_user(
            username="auth-user",
            email="auth@example.com",
            password="pass12345",
        )
        self.client.force_authenticate(user)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["authenticated"], True)
        self.assertEqual(response.data["user"]["email"], "auth@example.com")
        self.assertTrue(response.data.get("csrf_token"))
