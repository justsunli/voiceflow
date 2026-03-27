from django.contrib.auth import logout
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def current_user(request):
    user = request.user
    if not user.is_authenticated:
        return Response({"authenticated": False, "user": None}, status=status.HTTP_200_OK)

    return Response(
        {
            "authenticated": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.get_full_name() or user.email,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
def logout_view(request):
    logout(request)
    return Response({"success": True}, status=status.HTTP_200_OK)
