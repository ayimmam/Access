"""Bound security and speech payloads before parsing, including chunked bodies."""

import uuid

from starlette.responses import JSONResponse

from access_core.career_speech import MAX_BODY_BYTES


class SecurityBodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        protected = scope["type"] == "http" and scope["path"].startswith(("/api/v1/security/", "/api/v1/career-speech/"))
        if not protected or scope["method"] in {"GET", "HEAD", "OPTIONS"}:
            await self.app(scope, receive, send)
            return
        messages = []
        size = 0
        limit = MAX_BODY_BYTES if scope["path"] == "/api/v1/career-speech/transcribe" else 4096
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > limit:
                correlation = scope.get("state", {}).get("correlation_id") or str(uuid.uuid4())
                response = JSONResponse({"error": {"code": "payload_too_large", "message": "This form is too large. Shorten the entries and try again.", "correlation_id": correlation}}, status_code=413,
                                        headers={"Cache-Control": "no-store", "X-Correlation-ID": correlation, "X-Content-Type-Options": "nosniff"})
                await response(scope, receive, send)
                return
            messages.append(message)
            if not message.get("more_body", False):
                break
        position = 0

        async def replay():
            nonlocal position
            if position < len(messages):
                message = messages[position]
                position += 1
                return message
            return await receive()

        await self.app(scope, replay, send)
