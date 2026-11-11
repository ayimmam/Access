# Access

Accessible learning media for Track 2: a drop-in Web Component backed by a shared REST service and publishing pipeline.

**Status: scaffold only.** No application, endpoints, authentication, conversion jobs or deployment is implemented. No dependencies are installed. Starter modules contain comments only; there are no run/build commands yet.

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
