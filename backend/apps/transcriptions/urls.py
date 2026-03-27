from django.urls import path

from .views import transcription_collection

urlpatterns = [
    path("", transcription_collection, name="transcriptions-collection"),
]
