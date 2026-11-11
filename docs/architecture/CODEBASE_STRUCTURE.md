# Initial codebase structure

This structure follows `docs/planning/TRACK_2_IMPLEMENTATION_PLAN.md`. Files are placeholders, not working features. Dependency versions, build tools, queue technology, storage provider and deployment targets are intentionally unselected. Add runnable configuration during implementation, not as misleading empty commands.

The component and staff console consume versioned contracts. API routes and worker orchestration reuse `services/core`; the core must not import host-specific adapters or UI code. Each Python service has a separate `src` package to allow independent packaging later. No packaging/install configuration is active yet.

`integrations/savanna` separates fixture mapping from the unconfirmed production identity/enrollment adapter. Examples use public synthetic content only. Preserve the original Savanna captures; create the integrated example separately. LTI remains a later extension, with no launch or grade code scaffolded now.

The first implementation slice will define schemas, then connect one public fixture lesson through the component and API. Only after implementation should we add dependencies, real test cases, container commands and claims of passing behavior.

## Authentication decision — 11 November 2026

The user confirmed ALX has not confirmed the authentication contract. The earlier resolved-cookie label in `docs/security/SECURITY_PLAN.md` is corrected. Cookie-related statements elsewhere are conditional design proposals, not evidence of available ALX integration. Confirm identity validation, enrollment, revocation, origin/CSP and deployment before protected content is enabled.
