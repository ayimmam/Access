"""Public, opt-in fictional-career speech facade; provider keys stay in the worker."""

import os
import threading

from fastapi import APIRouter, Request, Response
from starlette.responses import JSONResponse

from access_core.career_speech import MAX_RESPONSE_BYTES, SpeechPrompt, TranscriptionRequest, catalog
from access_core.speech_transport import SpeechFailure, fetch_bounded, json_object, recognized_text

router = APIRouter(prefix="/api/v1/career-speech", tags=["Optional Amharic career speech"])
WORKERS = {"http://127.0.0.1:8010", "http://localhost:8010", "http://speech:8010", "http://access-speech:8010"}
DESTINATIONS = {("http", host, 8010) for host in ("127.0.0.1", "localhost", "speech", "access-speech")}
slots = threading.BoundedSemaphore(2)


def configured() -> bool:
    token = os.environ.get("ACCESS_SPEECH_WORKER_TOKEN", "")
    return (os.environ.get("ACCESS_SPEECH_WORKER_URL", "").rstrip("/") in WORKERS and
            32 <= len(token) <= 512 and token.isascii() and all(ord(char) >= 33 for char in token))


def relay(request: Request, operation: str, body):
    if request.headers.get("origin") not in request.app.state.career_speech_origins:
        raise SpeechFailure(403)
    if request.headers.get("content-type", "").split(";")[0] != "application/json":
        raise SpeechFailure(415)
    if not configured():
        raise SpeechFailure()
    if not slots.acquire(blocking=False):
        raise SpeechFailure(429)
    try:
        worker = os.environ["ACCESS_SPEECH_WORKER_URL"].rstrip("/")
        payload, _ = fetch_bounded(worker + "/api/v1/career-speech/" + operation, destinations=DESTINATIONS,
                                   headers={"Authorization": "Bearer " + os.environ["ACCESS_SPEECH_WORKER_TOKEN"], "Content-Type": "application/json"},
                                   body=body.model_dump_json().encode(), timeout=100,
                                   content_types={"audio/mpeg"} if operation == "speak" else {"application/json"},
                                   limit=MAX_RESPONSE_BYTES if operation == "speak" else 4096)
        return payload
    finally:
        slots.release()


@router.get("/catalog")
def language_catalog():
    return JSONResponse(catalog(configured()), headers={"Cache-Control": "no-store"})


@router.post("/transcribe")
def transcribe(body: TranscriptionRequest, request: Request):
    try:
        body.decoded_audio()
    except ValueError:
        raise SpeechFailure(422) from None
    payload = relay(request, "transcribe", body)
    return JSONResponse({"text": recognized_text(json_object(payload).get("text"))}, headers={"Cache-Control": "no-store"})


@router.post("/speak", responses={200: {"content": {"audio/mpeg": {}}}})
def speak(body: SpeechPrompt, request: Request):
    return Response(relay(request, "speak", body), media_type="audio/mpeg", headers={"Cache-Control": "no-store"})
