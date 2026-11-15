# API service

FastAPI transport and validation around shared core rules. Public lesson/media/export routes, fictional jobs and verification, signing-asset binding, uniform errors, explicit CORS, download attachments, OpenAPI and the isolated security/privacy demo are implemented.

Use the root [Docker-first setup](../../README.md#1-install-docker-and-run-the-project), or run `uv run uvicorn access_api.main:app --reload` after `uv sync --locked`. Production staff mutations, durable publishing storage and protected host identity remain pending. See the [implementation notes](../../docs/architecture/INITIAL_IMPLEMENTATION.md).

Run `uv run python -m access_core.exports` before serving downloads; missing/stale artifacts yield partial-service errors without blocking the frontend lesson. `/api/v1/release` exposes safe build metadata and content-hashed component paths. Unapproved translations, source-draft transcripts, sign media and PDF/BRF are not learner-published. See the [content/release procedure](../../docs/setup/CONTENT_PUBLICATION.md); these are public-fixture gates, not confirmed ALX authorization.

The optional `/api/v1/career-speech/catalog`, `/transcribe` and `/speak` routes support the fictional Career Gateway's Amharic guide. The public API never receives the Addis provider key: it relays validated, bounded requests to a separately authenticated private worker. See [configuration, consent, quotas and provider limitations](../../docs/setup/ADDIS_AMHARIC_VOICE.md). There is no application-draft or real employer submission endpoint.
