"""Public lesson foundation. Staff and protected-content routes await contracts."""

import hashlib
import json
import logging
import os
import uuid
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.staticfiles import StaticFiles

from access_core.lessons import (
    EXAMPLE_CAPTION_TRANSLATIONS, EXAMPLE_ID, EXAMPLE_VIDEO, W3C_DIRECTORY, W3C_ID, Lesson, Segment,
    captions_vtt, export_lesson, get_lesson, transcript_segments,
)
from access_core.offline_player import player_bytes, player_parts
from access_core.offline_video import Edition, offline_video_path
from access_core.jobs import JOBS, DemoVerification, Job, verify_demo
from access_core.speech_transport import SpeechFailure
from access_api.career_speech import router as career_speech_router
from access_core.signing import Language, load_manifest, public_manifest
from access_api.body_limit import SecurityBodyLimit
from access_api.observability import PublicMetrics, PublicMetricsMiddleware
from access_api.security import configured_store, origin as security_origin, router as security_router
from access_api.security_store import SecurityError


class ErrorDetail(BaseModel):
    code: str
    message: str
    correlation_id: str


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


class Transcript(BaseModel):
    lesson_id: str
    content_version: int
    language: str
    timing: Literal["source-draft", "untimed-text"]
    status: Literal["source-draft", "source-reviewed", "machine-translated-review-pending", "human-reviewed", "synthetic-demo"]
    segments: tuple[Segment, ...]


class ExportItem(BaseModel):
    format: Literal["html", "txt", "zip", "pdf", "brf"]
    label: str
    bytes: int
    sha256: str
    media_type: str
    href: str


class ExportListing(BaseModel):
    lesson_id: str
    content_version: int
    language: str
    items: list[ExportItem]


def file_contents(*media_types: str) -> dict:
    return {media_type: {"schema": {"type": "string", "format": "binary"}} for media_type in media_types}


ROOT = Path(__file__).resolve().parents[4]
security_log = logging.getLogger("access.security")
app = FastAPI(
    title="Access demo API", version="0.1.0", docs_url="/api/docs", redoc_url=None,
    description="Versioned public lesson fixtures, an independent embed, and fictional career and privacy demos. See the HTML developer guide at /docs.",
    responses={404: {"model": ErrorEnvelope}, 422: {"model": ErrorEnvelope}, 500: {"model": ErrorEnvelope}},
)
origins = [origin.strip() for origin in os.environ.get("ACCESS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000").split(",") if origin.strip()]
if "*" in origins:
    raise RuntimeError("ACCESS_ALLOWED_ORIGINS must contain explicit origins")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["If-None-Match", "Content-Type"], expose_headers=["ETag", "X-Correlation-ID", "Retry-After"])
app.add_middleware(SecurityBodyLimit)
public_metrics = PublicMetrics()
app.add_middleware(PublicMetricsMiddleware, metrics=public_metrics)
app.state.security_store = configured_store(ROOT)
app.include_router(security_router)
app.state.career_speech_origins = origins
app.include_router(career_speech_router)


def add_security_headers(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "frame-ancestors 'none'"


def signing_directory() -> Path:
    return Path(os.environ.get("ACCESS_SIGNING_DIR", str(ROOT / "artifacts/signing")))


@app.get("/api/v1/lessons/{lesson_id}/signing-manifest", tags=["Lessons"],
         responses={503: {"model": ErrorEnvelope, "description": "Signing metadata unavailable"}})
def signing_manifest(lesson_id: str, lang: Language = "ethsl", version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    if lesson.media is None:
        raise HTTPException(404)
    try:
        manifest = load_manifest(lesson, lang, signing_directory())
    except (ValueError, OSError):
        raise HTTPException(503) from None
    return JSONResponse(public_manifest(manifest), headers={"Cache-Control": "no-store"})


@app.get("/api/v1/lessons/{lesson_id}/signing-assets/{filename}", tags=["Lessons"], response_class=Response,
         responses={200: {"content": file_contents("video/mp4", "model/gltf-binary")},
                    206: {"description": "Partial file response", "content": file_contents("video/mp4", "model/gltf-binary")},
                    503: {"model": ErrorEnvelope, "description": "Signing metadata unavailable"}})
def signing_asset(lesson_id: str, filename: str, lang: Language = "ethsl", version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    if not lesson.media:
        raise HTTPException(404)
    try:
        manifest = load_manifest(lesson, lang, signing_directory())
    except (ValueError, OSError):
        raise HTTPException(503) from None
    approved = [s for s in manifest.segments if s.status == "approved"]
    assets = [asset for segment in approved for asset in [segment.motion, segment.interpreter_video] if asset]
    if any(segment.presentation == 'hands-only' for segment in approved) and manifest.rig:
        assets.append(manifest.rig)
    if not any(a and a.filename == filename for a in assets):
        raise HTTPException(404)
    media_type = 'video/mp4' if filename.endswith('.mp4') else 'model/gltf-binary'
    return FileResponse(signing_directory() / filename, media_type=media_type, headers={"Cache-Control": "no-store"})


@app.middleware("http")
async def headers(request: Request, call_next):
    request.state.correlation_id = str(uuid.uuid4())
    is_security = request.url.path.startswith("/api/v1/security/")
    if is_security:
        configured = urlsplit(security_origin(request))
        if request.headers.get("host", "").lower() != configured.netloc.lower():
            response = error_response(request, 403, "host_rejected", "Open the privacy console on its configured site.")
            add_security_headers(response)
            return response
        if request.url.scheme != "https" and not (request.url.scheme == "http" and request.url.hostname in {"127.0.0.1", "localhost"}):
            response = error_response(request, 400, "https_required", "Security endpoints require HTTPS.")
            add_security_headers(response)
            return response
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = request.state.correlation_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    if is_security:
        add_security_headers(response)
        security_log.info(json.dumps({"event": "security_request", "role": getattr(request.state, "user_role", "anonymous"), "status": response.status_code}))
    return response


def error_response(request: Request, status: int, code: str, message: str):
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, "correlation_id": request.state.correlation_id}}, headers={"Cache-Control": "no-store"})


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    return error_response(request, exc.status_code, "not_found" if exc.status_code == 404 else "request_failed", "This resource is unavailable." if exc.status_code == 404 else "The request could not be completed.")


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    if request.url.path.startswith("/api/v1/career-speech/"):
        return error_response(request, 422, "invalid_speech_request", "Check the recording or fictional job selection. Use typed controls instead.")
    return error_response(request, 422, "invalid_request", "Check the lesson version and requested format.")


@app.exception_handler(SpeechFailure)
async def speech_failure(request: Request, exc: SpeechFailure):
    response = error_response(request, exc.status, "speech_limit" if exc.status == 429 else "speech_unavailable", "Speech unavailable. Use typed controls or try again later.")
    if exc.status == 429:
        response.headers["Retry-After"] = str(exc.retry_after)
    return response


@app.exception_handler(SecurityError)
async def security_error(request: Request, exc: SecurityError):
    response = error_response(request, exc.status, exc.code, exc.message)
    if exc.retry_after > 0:
        response.headers["Retry-After"] = str(exc.retry_after)
    return response


@app.exception_handler(Exception)
async def server_error(request: Request, exc: Exception):
    return error_response(request, 500, "service_unavailable", "Please try again later.")


def resolve(lesson_id: str, version: int) -> Lesson:
    try:
        return get_lesson(lesson_id, version)
    except KeyError:
        raise HTTPException(404) from None


@app.get("/api/dashboard", include_in_schema=False)
def api_dashboard():
    return FileResponse(ROOT / "examples/api-dashboard/index.html", headers={
        "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'",
    })


@app.get("/api/dashboard/metrics", include_in_schema=False)
def api_dashboard_metrics():
    return JSONResponse(public_metrics.snapshot(), headers={"Cache-Control": "no-store"})


@app.get("/healthz")
def health():
    return {"status": "ok", "mode": "public-fixtures"}


@app.get("/api/v1/jobs", response_model=list[Job])
def jobs():
    return list(JOBS)


@app.get("/api/v1/jobs/{job_id}/structured-data")
def job_structured_data(job_id: str):
    job = next((item for item in JOBS if item.id == job_id), None)
    if job is None:
        raise HTTPException(404)
    return {
        "@context": "https://schema.org", "@type": "JobPosting",
        "identifier": job.id, "title": job.title, "description": job.summary,
        "hiringOrganization": {"@type": "Organization", "name": job.organization},
        "datePosted": "2026-11-14", "validThrough": job.deadline.isoformat(),
        "employmentType": {"Full-time": "FULL_TIME", "Part-time": "PART_TIME", "Freelance": "CONTRACTOR"}[job.employment_type],
        "jobLocation": {"@type": "Place", "address": {"@type": "PostalAddress", "addressLocality": "Addis Ababa", "addressCountry": "ET"}},
        **({"jobLocationType": "TELECOMMUTE"} if job.workplace == "Remote" else {}),
    }


@app.get("/api/v1/demo-certificates/{identifier}", response_model=DemoVerification)
def demo_certificate(identifier: str):
    return JSONResponse(verify_demo(identifier).model_dump(mode="json"), headers={"Cache-Control": "no-store"})


@app.get("/api/v1/lessons/{lesson_id}/manifest", response_model=Lesson, tags=["Lessons"],
         responses={200: {"headers": {"ETag": {"schema": {"type": "string"}}}},
                    304: {"description": "Manifest unchanged. No response body."}})
def manifest(request: Request, lesson_id: str, version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    if lesson.media:
        downloads = {"offline_player_src": f"/api/v1/lessons/{lesson_id}/offline-player?version={version}"}
        for edition, field in (("standard", "offline_video_src"), ("described", "offline_described_src")):
            path = offline_video_path(lesson_id, version, edition)
            if path and path.is_file():
                downloads[field] = f"/api/v1/lessons/{lesson_id}/offline-video/{edition}?version={version}"
        lesson = lesson.model_copy(update={"media": lesson.media.model_copy(update=downloads)})
    body = lesson.model_dump_json().encode()
    tag = '"' + hashlib.sha256(body).hexdigest() + '"'
    cache_headers = {"ETag": tag, "Cache-Control": "public, max-age=0, must-revalidate"}
    if request.headers.get("if-none-match") == tag:
        return Response(status_code=304, headers=cache_headers)
    return Response(body, media_type="application/json", headers=cache_headers)


@app.get("/api/v1/lessons/{lesson_id}/transcripts/{language}", response_model=Transcript, tags=["Lessons"])
def transcript(lesson_id: str, language: str, version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    try:
        segments = transcript_segments(lesson, language)
    except KeyError:
        raise HTTPException(404) from None
    status = next(track.status for track in lesson.media.caption_tracks if track.language == language) if lesson.media else "synthetic-demo"
    return {"lesson_id": lesson.lesson_id, "content_version": version, "language": language, "timing": "source-draft" if lesson.media else "untimed-text", "status": status, "segments": segments}


@app.get("/api/v1/lessons/{lesson_id}/media/{kind}", tags=["Lessons"], response_class=Response,
         responses={200: {"content": {"text/vtt": {"schema": {"type": "string"}}, **file_contents("video/mp4", "audio/mpeg")}},
                    206: {"description": "Partial file response", "content": file_contents("video/mp4", "audio/mpeg", "text/vtt")}})
def media(lesson_id: str, kind: Literal["video", "captions", "captions-am", "captions-om", "captions-ti", "described-video", "described-captions", "audio", "described-audio", "audio-description", "sign-video"], version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    # Public interpretation is delivered by the review-bound signing asset route.
    if lesson.media is None or kind == "sign-video":
        raise HTTPException(404)
    if lesson_id == W3C_ID:
        assets = {
            "video": (W3C_DIRECTORY / "standard.mp4", "video/mp4"),
            "captions": (W3C_DIRECTORY / "captions.en.vtt", "text/vtt"),
            "captions-am": (W3C_DIRECTORY / "captions.am.vtt", "text/vtt"),
            "captions-ti": (W3C_DIRECTORY / "captions.ti.vtt", "text/vtt"),
            "described-video": (W3C_DIRECTORY / "described.mp4", "video/mp4"),
            "described-captions": (W3C_DIRECTORY / "captions-described.en.vtt", "text/vtt"),
            "audio": (W3C_DIRECTORY / "audio.mp3", "audio/mpeg"),
            "described-audio": (W3C_DIRECTORY / "audio-described.mp3", "audio/mpeg"),
            "audio-description": (W3C_DIRECTORY / "audio-described.mp3", "audio/mpeg"),
        }
        asset = assets.get(kind)
        if asset is None:
            raise HTTPException(404)
        path, media_type = asset
        if not path.is_file():
            raise HTTPException(404)
        return FileResponse(path, media_type=media_type, headers={"Cache-Control": "public, max-age=0, must-revalidate"})
    if kind == "video":
        return FileResponse(EXAMPLE_VIDEO, media_type="video/mp4", headers={"Cache-Control": "public, max-age=0, must-revalidate"})
    if kind == "captions":
        return Response(captions_vtt(lesson), media_type="text/vtt", headers={"Cache-Control": "public, max-age=0, must-revalidate"})
    if lesson_id == EXAMPLE_ID and kind.startswith("captions-"):
        translation = EXAMPLE_CAPTION_TRANSLATIONS.get(kind.removeprefix("captions-"))
        if translation:
            _, path = translation
            if path.is_file():
                return FileResponse(path, media_type="text/vtt", headers={"Cache-Control": "public, max-age=0, must-revalidate"})
    raise HTTPException(404)


@app.get("/api/v1/lessons/{lesson_id}/offline-player", response_class=StreamingResponse, tags=["Lessons"],
         responses={200: {"content": file_contents("text/html")}})
def offline_player(lesson_id: str, version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    try:
        parts, size = player_parts(lesson)
    except (KeyError, FileNotFoundError):
        raise HTTPException(404) from None
    return StreamingResponse(player_bytes(parts), media_type="text/html", headers={
        "Content-Disposition": f'attachment; filename="{lesson_id}-v{version}-player.html"',
        "Content-Length": str(size),
    })


@app.get("/api/v1/lessons/{lesson_id}/offline-video/{edition}", response_class=FileResponse, tags=["Lessons"],
         responses={200: {"content": file_contents("video/mp4")},
                    206: {"description": "Partial file response", "content": file_contents("video/mp4")}})
def offline_video(lesson_id: str, edition: Edition, version: int = Query(1, ge=1)):
    resolve(lesson_id, version)
    asset = offline_video_path(lesson_id, version, edition)
    if not asset or not asset.is_file():
        raise HTTPException(404)
    return FileResponse(asset, media_type="video/mp4", filename=asset.name,
                        headers={"Cache-Control": "public, max-age=0, must-revalidate"})


@app.get("/api/v1/lessons/{lesson_id}/exports", response_model=ExportListing, tags=["Lessons"])
def exports(lesson_id: str, version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    items = []
    formats = [("html", "Read offline HTML"), ("txt", "Download text"), ("zip", "Download offline pack")]
    if lesson_id == W3C_ID:
        formats.extend([
            ("pdf", "Download tagged PDF prototype · verification pending"),
            ("brf", "Download uncontracted English BRF prototype · transcriber review pending"),
        ])
    for format, label in formats:
        data, media_type, _ = export_lesson(lesson, format)
        items.append({"format": format, "label": label, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "media_type": media_type, "href": f"/api/v1/lessons/{lesson_id}/downloads/{format}?version={version}"})
    return {"lesson_id": lesson_id, "content_version": version, "language": lesson.language, "items": items}


@app.get("/api/v1/lessons/{lesson_id}/downloads/{format}", tags=["Lessons"], response_class=Response,
         responses={200: {"content": file_contents("text/html", "text/plain", "application/zip", "application/pdf", "application/octet-stream")}})
def download(lesson_id: str, format: Literal["html", "txt", "zip", "pdf", "brf"], version: int = Query(1, ge=1)):
    try:
        data, media_type, suffix = export_lesson(resolve(lesson_id, version), format)
    except KeyError:
        raise HTTPException(404)
    return Response(data, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{lesson_id}-v{version}.{suffix}"', "Cache-Control": "public, max-age=0, must-revalidate"})


@app.get("/", include_in_schema=False)
def demo():
    return FileResponse(ROOT / "examples/savanna/index.html")


@app.get("/docs", include_in_schema=False)
def developer_docs():
    return FileResponse(ROOT / "examples/api-docs/index.html")


@app.get("/demo/judging", include_in_schema=False)
def judging_demo():
    return FileResponse(ROOT / "examples/judging/index.html")


@app.get("/demo/independent", include_in_schema=False)
def independent():
    return FileResponse(ROOT / "examples/independent-embed/index.html")


@app.get("/demo/careers", include_in_schema=False)
def career_demo():
    return FileResponse(ROOT / "examples/career-gateway/index.html")


@app.get("/demo/ethioware", include_in_schema=False)
def ethioware_demo():
    return FileResponse(ROOT / "examples/ethioware/index.html")


@app.get("/demo/certificates/{identifier}", include_in_schema=False)
def certificate_demo(identifier: str):
    return FileResponse(ROOT / "examples/career-gateway/certificate.html")


@app.get("/demo/avatar-review", include_in_schema=False)
def avatar_review():
    return FileResponse(ROOT / "examples/savanna/avatar-review.html")


@app.get("/demo/plug-in", include_in_schema=False)
def plug_in_demo():
    return FileResponse(ROOT / "examples/plug-in-demo/index.html")


@app.get("/demo/privacy", include_in_schema=False)
def privacy_demo():
    return FileResponse(ROOT / "examples/privacy/index.html")


@app.get("/demo/savanna", include_in_schema=False)
def savanna():
    return FileResponse(ROOT / "examples/savanna/index.html")


app.mount("/components/0.1.0", StaticFiles(directory=ROOT / "packages/lesson-component/dist", check_dir=False), name="component")
app.mount("/demo-assets", StaticFiles(directory=ROOT / "examples/assets"), name="demo-assets")
app.mount("/savanna-reference/img", StaticFiles(directory=ROOT / "Savanna-static-pages/assets/img"), name="savanna-images")
