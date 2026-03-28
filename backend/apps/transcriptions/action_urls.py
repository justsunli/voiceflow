from django.urls import path

from .views import action_collection

urlpatterns = [
    path("", action_collection, name="actions-collection"),
]
