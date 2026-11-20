"""Bounded, process-local telemetry for the public demo API."""

from collections import deque
from dataclasses import asdict, dataclass, field
from threading import Lock
from time import monotonic, time

from starlette.types import ASGIApp, Message, Receive, Scope, Send

BUCKET_SECONDS = 120
BUCKET_COUNT = 30
RECENT_LIMIT = 20
PUBLIC_ROUTES = (
    "/api/v1/lessons/{lesson_id}/",
    "/api/v1/jobs",
    "/api/v1/demo-certificates/{identifier}",
)


@dataclass(frozen=True)
class RequestSample:
    timestamp: int
    route: str
    status: int
    duration_ms: float


@dataclass
class Bucket:
    start: int
    responses: list[int] = field(default_factory=lambda: [0, 0, 0, 0])
    duration_ms: float = 0


class PublicMetrics:
    def __init__(self):
        self.started = monotonic()
        self.buckets: dict[int, Bucket] = {}
        self.recent: deque[RequestSample] = deque(maxlen=RECENT_LIMIT)
        self.lock = Lock()

    def record(self, sample: RequestSample):
        start = sample.timestamp // BUCKET_SECONDS * BUCKET_SECONDS
        with self.lock:
            bucket = self.buckets.setdefault(start, Bucket(start))
            bucket.responses[sample.status // 100 - 2] += 1
            bucket.duration_ms += sample.duration_ms
            self.recent.appendleft(sample)
            self.buckets = {
                key: item for key, item in self.buckets.items()
                if start - BUCKET_SECONDS * (BUCKET_COUNT - 1) <= key
            }

    def snapshot(self) -> dict:
        now = int(time())
        start = now // BUCKET_SECONDS * BUCKET_SECONDS
        first = start - BUCKET_SECONDS * (BUCKET_COUNT - 1)
        with self.lock:
            buckets = [
                self.buckets.get(key, Bucket(key))
                for key in range(first, start + 1, BUCKET_SECONDS)
            ]
            total = sum(sum(bucket.responses) for bucket in buckets)
            return {
                "timestamp": now,
                "uptime_seconds": int(monotonic() - self.started),
                "bucket_seconds": BUCKET_SECONDS,
                "total": total,
                "client_errors": sum(bucket.responses[2] for bucket in buckets),
                "server_errors": sum(bucket.responses[3] for bucket in buckets),
                "mean_response_ms": round(sum(bucket.duration_ms for bucket in buckets) / total, 1) if total else None,
                "traffic": [{"start": bucket.start, "responses": bucket.responses.copy()} for bucket in buckets],
                "recent": [asdict(sample) for sample in self.recent if sample.timestamp >= first],
            }


class PublicMetricsMiddleware:
    def __init__(self, app: ASGIApp, metrics: PublicMetrics):
        self.app = app
        self.metrics = metrics

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http" or scope["method"] != "GET" or not scope["path"].startswith("/api/v1/"):
            await self.app(scope, receive, send)
            return

        started = monotonic()
        recorded = False

        def record(status: int):
            nonlocal recorded
            route = getattr(scope.get("route"), "path", "")
            if not recorded and 200 <= status < 600 and route.startswith(PUBLIC_ROUTES):
                self.metrics.record(RequestSample(int(time()), route, status, round((monotonic() - started) * 1000, 1)))
                recorded = True

        async def capture(message: Message):
            if message["type"] == "http.response.start":
                record(message["status"])
            await send(message)

        try:
            await self.app(scope, receive, capture)
        except Exception:
            record(500)
            raise
