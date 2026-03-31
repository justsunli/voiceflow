from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Avg, Count
from django.utils import timezone

from apps.transcriptions.models import Transcription


class Command(BaseCommand):
    help = "Show transcription latency metrics for authenticated users."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Look back this many days from now (default: 30).",
        )
        parser.add_argument(
            "--mode",
            choices=[Transcription.MODE_TRANSCRIPT, Transcription.MODE_ACTION, "all"],
            default="all",
            help="Filter by transcription mode.",
        )

    def handle(self, *args, **options):
        window_days = options["days"]
        mode = options["mode"]
        window_start = timezone.now() - timedelta(days=window_days)

        queryset = (
            Transcription.objects.filter(created_at__gte=window_start)
            .exclude(processing_duration_ms__isnull=True)
            .exclude(user__isnull=True)
        )
        if mode != "all":
            queryset = queryset.filter(mode=mode)

        summary = queryset.aggregate(
            count=Count("id"),
            avg_ms=Avg("processing_duration_ms"),
        )
        count = summary["count"] or 0
        avg_ms = float(summary["avg_ms"] or 0.0)

        if count == 0:
            self.stdout.write(
                self.style.WARNING(
                    f"No transcription latency data found in the last {window_days} day(s) for mode={mode}."
                )
            )
            return

        ordered = queryset.order_by("processing_duration_ms").values_list("processing_duration_ms", flat=True)
        values = list(ordered)
        p50_ms = values[(count - 1) // 2]
        p95_ms = values[min(count - 1, max(0, int(count * 0.95) - 1))]

        self.stdout.write(self.style.SUCCESS("Transcription latency summary"))
        self.stdout.write(f"window_days: {window_days}")
        self.stdout.write(f"mode: {mode}")
        self.stdout.write(f"count: {count}")
        self.stdout.write(f"avg_ms: {avg_ms:.1f}")
        self.stdout.write(f"p50_ms: {p50_ms}")
        self.stdout.write(f"p95_ms: {p95_ms}")
