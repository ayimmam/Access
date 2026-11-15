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
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.staticfiles import StaticFiles

from access_core.lessons import (
    EXAMPLE_VIDEO, W3C_DIRECTORY, W3C_ID, Lesson, get_lesson,
)
from access_core.offline_video import Edition, offline_video_path
from access_core.review import approved_caption, file_hash, published_lesson
from access_core.exports import export_directory, export_metadata
from access_core.jobs import JOBS, DemoVerification, Job, verify_demo
from access_core.speech_transport import SpeechFailure
from access_api.career_speech import router as career_speech_router
from access_core.signing import Language, load_manifest, public_manifest, whole_lesson_video
from access_api.body_limit import SecurityBodyLimit
from access_api.security import configured_store, origin as security_origin, router as security_router
from access_api.security_store import SecurityError


class ErrorDetail(BaseModel):
    code: str
    message: str
    correlation_id: str


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


ROOT = Path(__file__).resolve().parents[4]
security_log = logging.getLogger("access.security")
app = FastAPI(
    title="Access public lesson API", version="0.1.0", docs_url="/api/docs", redoc_url=None,
    responses={404: {"model": ErrorEnvelope}, 422: {"model": ErrorEnvelope}, 500: {"model": ErrorEnvelope}},
)
origins = [origin.strip() for origin in os.environ.get("ACCESS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000").split(",") if origin.strip()]
if "*" in origins:
    raise RuntimeError("ACCESS_ALLOWED_ORIGINS must contain explicit origins")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["If-None-Match", "Content-Type"], expose_headers=["ETag", "X-Correlation-ID", "Retry-After"])
app.add_middleware(SecurityBodyLimit)
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


@app.get("/api/v1/lessons/{lesson_id}/signing-manifest")
def signing_manifest(lesson_id: str, lang: Language = "ethsl", version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    if lesson.media is None:
        raise HTTPException(404)
    try:
        manifest = load_manifest(lesson, lang, signing_directory())
    except (ValueError, OSError):
        raise HTTPException(503) from None
    return JSONResponse(public_manifest(manifest), headers={"Cache-Control": "no-store"})


@app.get("/api/v1/lessons/{lesson_id}/signing-assets/{filename}")
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
    if request.url.path.startswith("/components/releases/") and response.status_code == 200:
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif request.url.path.startswith("/components/0.1.0/"):
        response.headers["Cache-Control"] = "no-store"
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


def learner_lesson(lesson: Lesson) -> Lesson:
    published = published_lesson(lesson)
    if not published.media:
        return published
    try:
        asset = whole_lesson_video(load_manifest(lesson, "ethsl", signing_directory()), lesson)
    except (OSError, ValueError):
        asset = None
    if asset:
        published = published.model_copy(update={"media": published.media.model_copy(update={
            "sign_src": f"/api/v1/lessons/{lesson.lesson_id}/media/sign-video?version={lesson.content_version}",
            "sign_status": "reviewed",
        })})
    return published


@app.get("/healthz")
def health():
    return {"status": "ok", "mode": "public-fixtures"}


@app.get("/api/v1/release")
def release_metadata():
    try:
        data = json.loads((ROOT / "packages/lesson-component/dist/release.json").read_bytes())
    except (OSError, ValueError):
        raise HTTPException(503) from None
    return JSONResponse(data, headers={"Cache-Control": "no-store"})


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


@app.get("/api/v1/lessons/{lesson_id}/manifest", response_model=Lesson)
def manifest(request: Request, lesson_id: str, version: int = Query(1, ge=1)):
    lesson = learner_lesson(resolve(lesson_id, version))
    if lesson.media:
        downloads = {}
        sizes = dict(lesson.media.download_bytes)
        for edition, field in (("standard", "offline_video_src"), ("described", "offline_described_src")):
            path = offline_video_path(lesson_id, version, edition)
            if path and path.is_file():
                downloads[field] = f"/api/v1/lessons/{lesson_id}/offline-video/{edition}?version={version}"
                sizes[field] = path.stat().st_size
        if downloads:
            lesson = lesson.model_copy(update={"media": lesson.media.model_copy(update={**downloads, "download_bytes": sizes})})
    body = lesson.model_dump_json().encode()
    tag = '"' + hashlib.sha256(body).hexdigest() + '"'
    cache_headers = {"ETag": tag, "Cache-Control": "public, max-age=0, must-revalidate"}
    if request.headers.get("if-none-match") == tag:
        return Response(status_code=304, headers=cache_headers)
    return Response(body, media_type="application/json", headers=cache_headers)


@app.get("/api/v1/lessons/{lesson_id}/transcripts/{language}")
def transcript(lesson_id: str, language: str, version: int = Query(1, ge=1)):
    lesson = published_lesson(resolve(lesson_id, version))
    if language != lesson.language:
        raise HTTPException(404)
    return {"lesson_id": lesson.lesson_id, "content_version": version, "language": language,
            "timing": lesson.media.caption_status if lesson.media else "untimed-text", "segments": lesson.segments}


@app.get("/api/v1/lessons/{lesson_id}/media/{kind}")
def media(lesson_id: str, kind: Literal["video", "captions", "captions-am", "captions-ti", "described-video", "described-captions", "audio", "described-audio", "sign-video"], version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    if lesson.media is None:
        raise HTTPException(404)
    if kind in ("captions", "captions-am", "captions-ti", "described-captions"):
        language = "am" if kind == "captions-am" else "ti" if kind == "captions-ti" else "en"
        asset = approved_caption(lesson, language, "described" if kind == "described-captions" else "standard")
        if not asset:
            raise HTTPException(404)
        return FileResponse(asset.path, media_type="text/vtt", headers={"Cache-Control": "no-store"})
    if kind == "sign-video":
        try:
            asset = whole_lesson_video(load_manifest(lesson, "ethsl", signing_directory()), lesson)
        except (OSError, ValueError):
            asset = None
        if not asset:
            raise HTTPException(404)
        return FileResponse(signing_directory() / asset.filename, media_type="video/mp4", headers={"Cache-Control": "no-store"})
    if lesson_id == W3C_ID:
        assets = {
            "video": (W3C_DIRECTORY / "standard.mp4", "video/mp4"),
            "described-video": (W3C_DIRECTORY / "described.mp4", "video/mp4"),
            "audio": (W3C_DIRECTORY / "audio.mp3", "audio/mpeg"),
            "described-audio": (W3C_DIRECTORY / "audio-described.mp3", "audio/mpeg"),
        }
        path, media_type = assets[kind]
        if not path.is_file():
            raise HTTPException(404)
        return FileResponse(path, media_type=media_type, headers={"Cache-Control": "public, max-age=0, must-revalidate"})
    if kind == "video":
        return FileResponse(EXAMPLE_VIDEO, media_type="video/mp4", headers={"Cache-Control": "public, max-age=0, must-revalidate"})
    raise HTTPException(404)


@app.get("/api/v1/lessons/{lesson_id}/offline-video/{edition}", response_class=FileResponse)
def offline_video(lesson_id: str, edition: Edition, version: int = Query(1, ge=1)):
    resolve(lesson_id, version)
    asset = offline_video_path(lesson_id, version, edition)
    if not asset or not asset.is_file():
        raise HTTPException(404)
    return FileResponse(asset, media_type="video/mp4", filename=asset.name,
                        headers={"Cache-Control": "public, max-age=0, must-revalidate"})


@app.get("/api/v1/lessons/{lesson_id}/exports")
def exports(lesson_id: str, version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    try:
        metadata = export_metadata(lesson)
    except ValueError:
        raise HTTPException(503) from None
    return {"lesson_id": lesson_id, "content_version": version, "language": lesson.language,
            "items": [{key: value for key, value in item.items() if key != "filename"} for item in metadata["items"]]}


@app.get("/api/v1/lessons/{lesson_id}/downloads/{format}")
def download(lesson_id: str, format: Literal["html", "txt", "zip", "pdf", "brf"], version: int = Query(1, ge=1), revision: str | None = Query(None, pattern=r"^[0-9a-f]{64}$")):
    try:
        metadata = export_metadata(resolve(lesson_id, version))
    except ValueError:
        raise HTTPException(503) from None
    item = next((item for item in metadata["items"] if item["format"] == format and (revision is None or item["sha256"] == revision)), None)
    if not item:
        raise HTTPException(404)
    path = export_directory() / f"{lesson_id}-v{version}" / item["filename"]
    if file_hash(path) != item["sha256"]:
        raise HTTPException(503)
    return FileResponse(path, media_type=item["media_type"], filename=f"{lesson_id}-v{version}.{format}", headers={"Cache-Control": "no-store"})


@app.get("/", include_in_schema=False)
def demo():
    return FileResponse(ROOT / "examples/savanna/index.html")


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


app.mount("/components/releases", StaticFiles(directory=Path(os.environ.get("ACCESS_COMPONENT_RELEASE_DIR", str(ROOT / "packages/lesson-component/dist/releases"))), check_dir=False), name="component-releases")
app.mount("/components/0.1.0", StaticFiles(directory=ROOT / "packages/lesson-component/dist", check_dir=False), name="component-development")
app.mount("/demo-assets", StaticFiles(directory=ROOT / "examples/assets"), name="demo-assets")
app.mount("/savanna-reference/img", StaticFiles(directory=ROOT / "Savanna-static-pages/assets/img"), name="savanna-images")
