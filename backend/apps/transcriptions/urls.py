from django.urls import path

from .views import transcription_collection, transcription_detail

urlpatterns = [
    path("", transcription_collection, name="transcriptions-collection"),
    path("<int:transcription_id>/", transcription_detail, name="transcriptions-detail"),
]
