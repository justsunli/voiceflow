from django.urls import path

from .views import action_collection, action_detail, add_action_to_calendar

urlpatterns = [
    path("", action_collection, name="actions-collection"),
    path("<int:action_id>/", action_detail, name="actions-detail"),
    path("<int:action_id>/add-to-calendar/", add_action_to_calendar, name="actions-add-to-calendar"),
]
