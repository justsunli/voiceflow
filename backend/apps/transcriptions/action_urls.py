from django.urls import path

from .views import action_collection, add_action_to_calendar

urlpatterns = [
    path("", action_collection, name="actions-collection"),
    path("<int:action_id>/add-to-calendar/", add_action_to_calendar, name="actions-add-to-calendar"),
]
