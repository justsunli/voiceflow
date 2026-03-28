from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("allauth.urls")),
    path("api/auth/", include("apps.auth_api.urls")),
    path("api/transcriptions/", include("apps.transcriptions.urls")),
    path("api/actions/", include("apps.transcriptions.action_urls")),
]
