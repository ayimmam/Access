# API service

FastAPI transport and validation around shared core rules. Public lesson/media/export routes, fictional jobs and verification, signing-asset binding, uniform errors, explicit CORS, download attachments, OpenAPI and the isolated security/privacy demo are implemented.

Use the root [Docker-first setup](../../README.md#1-install-docker-and-run-the-project), or run `uv run uvicorn access_api.main:app --reload` after `uv sync --locked`. Production staff mutations, durable publishing storage and protected host identity remain pending. See the [implementation notes](../../docs/architecture/INITIAL_IMPLEMENTATION.md).
