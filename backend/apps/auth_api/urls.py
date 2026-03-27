from django.urls import path

from .views import current_user, logout_view

urlpatterns = [
    path("me/", current_user, name="current-user"),
    path("logout/", logout_view, name="logout"),
]
