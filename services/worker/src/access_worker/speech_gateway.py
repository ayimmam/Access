"""Private synchronous speech egress, never exposed as a public service."""

import logging
import os
import secrets
import time
import uuid

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse

from access_api.body_limit import SecurityBodyLimit
from access_core.career_speech import SpeechPrompt, TranscriptionRequest
from access_core.speech_transport import SpeechFailure
from access_worker.addis_speech import SLOTS, provider, reserve_request

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(SecurityBodyLimit)
logger = logging.getLogger("access.speech")


def failure(status: int, correlation: str, retry_after: int = 60):
    return JSONResponse({"error": {"code": "speech_limit" if status == 429 else "speech_unavailable",
                                   "message": "Speech unavailable. Use typed controls.", "correlation_id": correlation}},
                        status_code=status, headers={"Cache-Control": "no-store", "X-Correlation-ID": correlation,
                                                    **({"Retry-After": str(retry_after)} if status == 429 else {})})


@app.middleware("http")
async def private_access(request: Request, call_next):
    correlation = str(uuid.uuid4())
    request.state.correlation_id = correlation
    started = time.monotonic()
    if request.url.path != "/healthz":
        token = os.environ.get("ACCESS_SPEECH_WORKER_TOKEN", "")
        supplied = request.headers.get("Authorization", "")
        if not 32 <= len(token) <= 512 or not token.isascii() or not supplied.isascii() or any(ord(char) < 33 for char in token) or not secrets.compare_digest(supplied, f"Bearer {token}"):
            return failure(403, correlation)
        if request.headers.get("Content-Type", "").split(";")[0] != "application/json":
            return failure(415, correlation)
    try:
        response = await call_next(request)
    except Exception:
        response = failure(503, correlation)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Correlation-ID"] = correlation
    if request.url.path in {"/api/v1/career-speech/transcribe", "/api/v1/career-speech/speak"}:
        logger.info("speech_request timestamp=%s correlation=%s role=public-demo endpoint=%s status=%s duration_ms=%s",
                    int(time.time()), correlation, request.url.path, response.status_code, int((time.monotonic() - started) * 1000))
    return response


@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request, error: RequestValidationError):
    return failure(422, request.state.correlation_id)


@app.exception_handler(SpeechFailure)
async def speech_failure(request: Request, error: SpeechFailure):
    return failure(error.status, request.state.correlation_id, error.retry_after)


@app.get("/healthz")
def health():
    return {"status": "ok"}


def run(operation):
    if not SLOTS.acquire(blocking=False):
        raise SpeechFailure(429)
    try:
        if not os.environ.get("ADDIS_API_KEY"):
            raise SpeechFailure()
        reserve_request()
        return operation()
    finally:
        SLOTS.release()


@app.post("/api/v1/career-speech/transcribe")
def transcribe(body: TranscriptionRequest):
    try:
        audio = body.decoded_audio()
    except ValueError:
        raise SpeechFailure(422) from None
    return {"text": run(lambda: provider.transcribe(audio))}


@app.post("/api/v1/career-speech/speak")
def speak(body: SpeechPrompt):
    return Response(run(lambda: provider.synthesize(body)), media_type="audio/mpeg")
