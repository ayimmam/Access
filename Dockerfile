# syntax=docker/dockerfile:1.7

FROM node:24.22.3-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS component-builder

WORKDIR /build

COPY package.json package-lock.json ./
COPY apps/offline-reader/package.json apps/offline-reader/package.json
COPY apps/publishing-console/package.json apps/publishing-console/package.json
COPY packages/lesson-component/package.json packages/lesson-component/package.json
RUN npm ci --include=dev

COPY packages/lesson-component/src packages/lesson-component/src
COPY packages/lesson-component/tsconfig.json packages/lesson-component/tsconfig.json
COPY scripts/write-component-integrity.mjs scripts/write-component-integrity.mjs
RUN npm run build


FROM ghcr.io/astral-sh/uv:0.13.8 AS uv


FROM python:3.11-slim-bookworm AS python-builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

COPY --from=uv /uv /uvx /bin/
COPY pyproject.toml uv.lock ./
COPY services services
RUN uv sync --locked --no-dev --python /usr/local/bin/python


FROM python-builder AS offline-media-builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY ["example lessons", "example lessons"]
RUN /app/.venv/bin/python -m access_core.offline_video
RUN /app/.venv/bin/python -m access_core.exports


FROM python:3.11-slim-bookworm AS speech-runtime

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN addgroup --system access \
    && adduser --system --ingroup access --home /nonexistent --no-create-home access \
    && mkdir /state && chown access:access /state

COPY --from=python-builder --chown=access:access /app/.venv .venv
COPY --chown=access:access services services

USER access

CMD ["uvicorn", "access_worker.speech_gateway:app", "--host", "0.0.0.0", "--port", "8010", "--no-access-log"]


FROM python:3.11-slim-bookworm AS runtime

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN addgroup --system access \
    && adduser --system --ingroup access --home /nonexistent --no-create-home access

COPY --from=python-builder --chown=access:access /app/.venv .venv
COPY --chown=access:access services services
COPY --chown=access:access examples examples
COPY --chown=access:access ["example lessons", "example lessons"]
COPY --chown=access:access Savanna-static-pages Savanna-static-pages
COPY --from=offline-media-builder --chown=access:access /app/artifacts/offline-video artifacts/offline-video
COPY --from=offline-media-builder --chown=access:access /app/artifacts/lesson-exports artifacts/lesson-exports
COPY --from=component-builder --chown=access:access /build/packages/lesson-component/dist packages/lesson-component/dist

USER access

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2).read()"]

CMD ["uvicorn", "access_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
