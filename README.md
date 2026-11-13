# Access

Accessible learning media for Track 2: a drop-in Web Component backed by a shared REST service and publishing pipeline.

The Savanna-style demo plays the supplied ALX video with draft English captions, searchable timestamped transcript, offline downloads and an optional labeled 3D timing prototype. The [EthSL avatar workflow](docs/architecture/SIGN_AVATAR_WORKFLOW.md) maps the translation and motion-review steps. See the [implementation status](docs/architecture/INITIAL_IMPLEMENTATION.md) and [external preparation list](docs/setup/EXTERNAL_DEPENDENCIES.md).

## Run locally

Use Node 24 or later and Python 3.11 or later, with npm and uv installed. From the repository root, run

```sh
npm ci
npm run build
uv sync --locked
uv run uvicorn access_api.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` for the Savanna-style video demo. The same demo is at `/demo/savanna`, the independent text embed is at `/demo/independent`, and API docs are at `/api/docs`. Keep the supplied `example lessons/` folder available to the server. Downloads work without third-party credentials. Configure explicit additional allowed browser origins through `ACCESS_ALLOWED_ORIGINS` when using an external host.

The [avatar implementation runbook](docs/architecture/AVATAR_BLUEPRINT_EVALUATION.md) covers offline capture, the original articulated rig, GLB baking and reviewed delivery. Open `/demo/avatar-review` to load local draft files and collect co-design feedback using the [testing guide](docs/setup/AVATAR_CO_DESIGN_TESTING.md).

Run verification with

```sh
uv run pytest
npm run typecheck
npx playwright install chromium
npm run test:browser
python3 scripts/check_repository.py
```

## Layout

| Path | Responsibility |
|---|---|
| `apps/publishing-console/` | Future React staff review and publishing UI |
| `apps/offline-reader/` | First-party offline reader; never a service worker on Savanna |
| `packages/lesson-component/` | Framework-independent TypeScript custom element |
| `contracts/` | Future OpenAPI, manifest and event contracts |
| `services/core/` | Shared publication, entitlement, version and export rules |
| `services/api/` | Future FastAPI routes; delegates rules to core |
| `services/worker/` | Isolated conversion work; draft outputs only |
| `integrations/savanna/` | Separate static fixture and future production adapters |
| `examples/` | Independent embed/API consumer and Savanna integration examples |
| `fixtures/` | Approved, non-personal test content |
| `tests/` | Cross-boundary accessibility, integration and security evidence |
| `infra/` | Future Compose, container and deployment configuration |
| `docs/` | Architecture, security and scaffold notes |
| `Savanna-static-pages/` | Preserved upstream reference fixture |

Start with [the implementation plan](docs/planning/TRACK_2_IMPLEMENTATION_PLAN.md) and [scaffold boundaries](docs/architecture/CODEBASE_STRUCTURE.md). Browse the [documentation index](docs/README.md). Security guidance is in `docs/security/` and `.agents/rules/security.md`.

ALX has **not confirmed authentication**. Cookie sharing, session validation, token exchange, enrollment and production topology remain unresolved. Public fixtures must not imply production access.

Prepare development machines using the [team setup guides](docs/setup/README.md).

All team members and AI agents follow [CONTRIBUTING.md](CONTRIBUTING.md). Agent-specific entry instructions are in [AGENTS.md](AGENTS.md).
