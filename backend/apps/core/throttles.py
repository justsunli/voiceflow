import logging

from rest_framework.throttling import UserRateThrottle

logger = logging.getLogger(__name__)


class MethodUserRateThrottle(UserRateThrottle):
    methods = ("POST",)

    def allow_request(self, request, view):
        if request.method not in self.methods:
            return True

        allowed = super().allow_request(request, view)
        if not allowed:
            user_id = getattr(request.user, "id", None)
            ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get(
                "REMOTE_ADDR", ""
            )
            logger.warning(
                "Rate limit exceeded: scope=%s user_id=%s ip=%s path=%s",
                self.scope,
                user_id,
                ip,
                request.path,
            )
        return allowed


class TranscriptionPostRateThrottle(MethodUserRateThrottle):
    scope = "transcription_post"


class CalendarSyncPostRateThrottle(MethodUserRateThrottle):
    scope = "calendar_sync_post"
