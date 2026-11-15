# Codebase structure and boundaries

This repository is organized around one rule: hosts and delivery channels stay thin, while lesson/version/export rules remain reusable. The [Track 2 implementation plan](../planning/TRACK_2_IMPLEMENTATION_PLAN.md) is authoritative when an older architecture proposal conflicts with this page.

## Runtime flow

```text
Savanna-style host / independent host / provider showcase
                         |
          packages/lesson-component
      attributes in; minimal host events out
                         |
                 services/api
       transport, validation, CORS, safe errors
                         |
                services/core
 lessons, versions, exports, jobs and asset bindings
                         |
       approved public fixtures and media assets
```

The host owns identity, enrollment, progress and course completion. Access owns its component UI and the accessible assets it publishes. Playback or a component event never completes a host lesson. Production protected content remains blocked on a confirmed ALX identity and enrollment contract.

## Directory map

| Path | Owns | Current state |
|---|---|---|
| `packages/lesson-component/` | Framework-independent lesson, media, career and review UI; public attributes/events; component-owned styles | Implemented and built into `dist/` |
| `services/core/` | Pydantic lesson models, immutable versions, portable exports, fictional jobs and source/asset hash binding | Implemented for public fixtures |
| `services/api/` | FastAPI routes, error envelopes, explicit CORS, static demos, OpenAPI and the isolated security/privacy demo | Implemented for public fixtures |
| `services/worker/` | Offline pose/hand/face capture entry point | Capture implemented; queue, transcription and specialist conversion are pending |
| `examples/` | API-served integration examples and public synthetic assets | Implemented |
| `demos/` | Standalone EthioWare and career showcase sites | Implemented; not live provider integrations |
| `integrations/savanna/` | Host-adapter boundary | Placeholder until ALX supplies supported contracts |
| `example lessons/` | Source media and the complete-media fixture | Active; preserve provenance and review labels |
| `fixtures/` | Small approved test inputs | Active |
| `tests/integration/` | Playwright host/component/security journeys | Active |
| `services/api/tests/` | API, export, signing and security unit/integration tests | Active |
| `tests/vercel/` | Standalone showcase tests | Active |
| `apps/offline-reader/` | Future hosted first-party offline library | Scaffold only |
| `apps/publishing-console/` | Future staff ingest/review/publish UI | Scaffold only |
| `contracts/` | Reserved extracted OpenAPI, manifest and event artifacts | Scaffold; executable contracts currently live with their owning code |
| `infra/` | Container/deployment notes for the root Dockerfile and Compose file | Active documentation |
| `docs/` | Plans, architecture, setup, security, evidence and source references | Active |
| `Savanna-static-pages/` | Preserved upstream capture used as a reference fixture | Submodule; do not modify for product integration |

## Dependency direction

- `services/api` may import `services/core`; `services/core` must not import the API, browser UI or host adapters.
- The Web Component consumes documented HTTP data and must not import Savanna application code or global styles.
- Examples may compose public packages and APIs but must not become the source of domain rules.
- Staff and worker code may create drafts; only reviewed, exact-revision assets may become learner-visible.
- `demos/` and public fixtures contain no captured account data, browser credentials or production learner records.
- Production adapters remain separate from static fixture mapping. A DOM lesson ID is context, not authorization.

## Public contracts today

The current API publishes `/api/v1` resources and generates OpenAPI at `/openapi.json`. Lesson manifests use schema version `1.0`; offline ZIPs include a file/hash manifest; the component emits documented readiness, error and download-request events. These contracts still live beside their implementations so they cannot silently drift from executable behavior. Move generated or hand-maintained artifacts into `contracts/` only when a checked generation/validation step is added.

The root [README](../../README.md) is the installation and demonstration entry point. [INITIAL_IMPLEMENTATION.md](INITIAL_IMPLEMENTATION.md) records detailed implemented behavior and limits. Human accessibility, content and security evidence belongs in `docs/testing/`, `docs/WCAG_CONFORMANCE.md` and the applicable security documents rather than in code comments or marketing claims.

## Adding a feature

Place reusable business rules in `services/core`, expose them through `services/api`, and keep host rendering in `packages/lesson-component` or the appropriate example. Add observable API/browser tests and update the nearest README. Do not populate the publishing console, offline reader, production adapter or worker queue merely to avoid creating a focused module elsewhere; those directories represent specific planned boundaries.

Container orchestration is runnable through the root `Dockerfile` and `docker-compose.yml`. Protected integration, durable publishing storage and a networked conversion queue remain future work.
