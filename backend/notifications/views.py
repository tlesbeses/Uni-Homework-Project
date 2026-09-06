"""API views for the notifications application.

Everything is scoped to the current user: nobody reads or mutates another
user's notifications. Endpoints are intentionally small and plain (no
viewset) so the count/badge list and the read actions stay unambiguous.
"""

from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.serializers import NotificationSerializer


class _BaseNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.request.user.notifications.all()

    @staticmethod
    def _sweep_read(request_user, days=30):
        """Lazy cleanup: drop notifications read more than ``days`` ago.

        Runs on list without a background job (none exists by design); the
        query touches an indexed, bounded slice so it stays cheap.
        """
        cutoff = timezone.now() - timezone.timedelta(days=days)
        request_user.notifications.filter(
            is_read=True,
            created_at__lt=cutoff,
        ).delete()


class NotificationListView(_BaseNotificationView):
    def get(self, request):
        queryset = self.get_queryset().order_by("-created_at")
        self._sweep_read(request.user)

        if request.query_params.get("unread_only") == "true":
            queryset = queryset.filter(is_read=False)

        paginator = PageNumberPagination()
        paginator.page_size = 15
        paginator.page_size_query_param = "page_size"
        paginator.max_page_size = 100
        page = paginator.paginate_queryset(queryset, request)
        payload = NotificationSerializer(page, many=True).data
        return paginator.get_paginated_response(payload)


class NotificationUnreadCountView(_BaseNotificationView):
    def get(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"count": count})


class NotificationReadView(_BaseNotificationView):
    def post(self, request, pk):
        notification = self.get_queryset().filter(pk=pk).first()
        if notification is None:
            return Response(
                {"detail": "Notificación no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return Response({"id": notification.pk, "is_read": True})


class NotificationReadAllView(_BaseNotificationView):
    def post(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"updated": updated})