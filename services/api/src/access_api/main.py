"""Public lesson foundation. Staff and protected-content routes await contracts."""

import hashlib
import os
import json
import logging
import time
import uuid
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.staticfiles import StaticFiles

from access_core.lessons import EXAMPLE_VIDEO, Lesson, captions_vtt, export_lesson, get_lesson
from access_core.signing import Language, load_manifest, public_manifest
from access_core.jobs import JOBS, Job, DemoVerification, verify_demo
from access_api.security import router as security_router, configured_store, origin as security_origin, clear_cookie
from access_api.security_store import SecurityError
from access_api.body_limit import SecurityBodyLimit


class ErrorDetail(BaseModel):
    code: str
    message: str
    correlation_id: str


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


ROOT = Path(__file__).resolve().parents[4]
app = FastAPI(
    title="Access public lesson API", version="0.1.0", docs_url="/api/docs", redoc_url=None,
    responses={404: {"model": ErrorEnvelope}, 422: {"model": ErrorEnvelope}, 500: {"model": ErrorEnvelope}},
)
origins = [origin.strip() for origin in os.environ.get("ACCESS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]
if "*" in origins:
    raise RuntimeError("ACCESS_ALLOWED_ORIGINS must contain explicit origins")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET"], allow_headers=["If-None-Match"], expose_headers=["ETag", "X-Correlation-ID"])
app.state.security_store = configured_store(ROOT)
app.include_router(security_router)
app.add_middleware(SecurityBodyLimit)
security_log = logging.getLogger("access.security")
security_log.setLevel(logging.INFO)
if not security_log.handlers:
    security_handler = logging.StreamHandler()
    security_handler.setFormatter(logging.Formatter("%(message)s"))
    security_log.addHandler(security_handler)


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
    assets = [s.motion for s in approved]
    if approved and manifest.rig:
        assets.append(manifest.rig)
    if not any(a and a.filename == filename for a in assets):
        raise HTTPException(404)
    return FileResponse(signing_directory() / filename, media_type="model/gltf-binary", headers={"Cache-Control": "no-store"})


@app.middleware("http")
async def headers(request: Request, call_next):
    request.state.correlation_id = str(uuid.uuid4())
    started = time.monotonic()
    private = request.url.path.startswith("/api/v1/security/")
    if private and request.headers.get("host") != security_origin(request).split("://", 1)[1]:
        response = error_response(request, 403, "origin_rejected", "Open the privacy console using its configured site address.")
    elif private and security_origin(request).startswith("https://") and request.url.scheme != "https":
        response = error_response(request, 400, "https_required", "Open the secure HTTPS address to continue.")
    else:
        response = await call_next(request)
    response.headers["X-Correlation-ID"] = request.state.correlation_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    if private or request.url.path == "/demo/privacy":
        response.headers["Cache-Control"] = "no-store"
        response.headers["Vary"] = "Cookie"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
        route = request.scope.get("route")
        security_log.info(json.dumps({"timestamp": time.time(), "correlation_id": request.state.correlation_id,
                                     "role": getattr(request.state, "user_role", "anonymous"),
                                     "endpoint": getattr(route, "path", "unmatched"), "status": response.status_code,
                                     "duration_ms": round((time.monotonic() - started) * 1000, 2)}))
    return response


@app.exception_handler(SecurityError)
async def security_error(request: Request, exc: SecurityError):
    response = error_response(request, exc.status, exc.code, exc.message)
    if exc.code == "sign_in_required":
        clear_cookie(response)
    if exc.retry_after:
        response.headers["Retry-After"] = str(exc.retry_after)
    return response


def error_response(request: Request, status: int, code: str, message: str):
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, "correlation_id": request.state.correlation_id}}, headers={"Cache-Control": "no-store"})


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    return error_response(request, exc.status_code, "not_found" if exc.status_code == 404 else "request_failed", "This resource is unavailable." if exc.status_code == 404 else "The request could not be completed.")


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    message = "Check the lesson version and requested format."
    if request.url.path.startswith("/api/v1/security/"):
        message = "Check the form fields and selected choices, then try again."
    return error_response(request, 422, "invalid_request", message)


@app.exception_handler(Exception)
async def server_error(request: Request, exc: Exception):
    return error_response(request, 500, "service_unavailable", "Please try again later.")


def resolve(lesson_id: str, version: int) -> Lesson:
    try:
        return get_lesson(lesson_id, version)
    except KeyError:
        raise HTTPException(404) from None


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


@app.get("/api/v1/lessons/{lesson_id}/manifest", response_model=Lesson)
def manifest(request: Request, lesson_id: str, version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    body = lesson.model_dump_json().encode()
    tag = '"' + hashlib.sha256(body).hexdigest() + '"'
    cache_headers = {"ETag": tag, "Cache-Control": "public, max-age=0, must-revalidate"}
    if request.headers.get("if-none-match") == tag:
        return Response(status_code=304, headers=cache_headers)
    return Response(body, media_type="application/json", headers=cache_headers)


@app.get("/api/v1/lessons/{lesson_id}/transcripts/{language}")
def transcript(lesson_id: str, language: str, version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    if language != lesson.language:
        raise HTTPException(404)
    return {"lesson_id": lesson.lesson_id, "content_version": version, "language": language, "timing": "source-draft" if lesson.media else "untimed-text", "segments": lesson.segments}


@app.get("/api/v1/lessons/{lesson_id}/media/{kind}")
def media(lesson_id: str, kind: Literal["video", "captions"], version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    if lesson.media is None:
        raise HTTPException(404)
    if kind == "video":
        return FileResponse(EXAMPLE_VIDEO, media_type="video/mp4", headers={"Cache-Control": "public, max-age=0, must-revalidate"})
    return Response(captions_vtt(lesson), media_type="text/vtt", headers={"Cache-Control": "public, max-age=0, must-revalidate"})


@app.get("/api/v1/lessons/{lesson_id}/exports")
def exports(lesson_id: str, version: int = Query(1, ge=1)):
    lesson = resolve(lesson_id, version)
    items = []
    for format, label in [("html", "Read offline HTML"), ("txt", "Download text"), ("zip", "Download offline pack")]:
        data, media_type, _ = export_lesson(lesson, format)
        items.append({"format": format, "label": label, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "media_type": media_type, "href": f"/api/v1/lessons/{lesson_id}/downloads/{format}?version={version}"})
    return {"lesson_id": lesson_id, "content_version": version, "language": lesson.language, "items": items}


@app.get("/api/v1/lessons/{lesson_id}/downloads/{format}")
def download(lesson_id: str, format: Literal["html", "txt", "zip"], version: int = Query(1, ge=1)):
    data, media_type, suffix = export_lesson(resolve(lesson_id, version), format)
    return Response(data, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{lesson_id}-v{version}.{suffix}"', "Cache-Control": "public, max-age=0, must-revalidate"})


@app.get("/", include_in_schema=False)
def demo():
    return FileResponse(ROOT / "examples/savanna/index.html")


@app.get("/demo/independent", include_in_schema=False)
def independent():
    return FileResponse(ROOT / "examples/independent-embed/index.html")


@app.get("/demo/plug-in", include_in_schema=False)
def plug_in():
    return FileResponse(ROOT / "examples/plug-in-demo/index.html")


@app.get("/demo/privacy", include_in_schema=False)
def privacy_console():
    return FileResponse(ROOT / "examples/privacy/index.html")


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


@app.get("/demo/savanna", include_in_schema=False)
def savanna():
    return FileResponse(ROOT / "examples/savanna/index.html")


app.mount("/components/0.1.0", StaticFiles(directory=ROOT / "packages/lesson-component/dist", check_dir=False), name="component")
app.mount("/demo-assets", StaticFiles(directory=ROOT / "examples/assets"), name="demo-assets")
app.mount("/savanna-reference/img", StaticFiles(directory=ROOT / "Savanna-static-pages/assets/img"), name="savanna-images")
