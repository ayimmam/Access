# Initial codebase structure

This structure follows `docs/planning/TRACK_2_IMPLEMENTATION_PLAN.md`. The public lesson API, custom element, video demo and optional avatar capture/retargeting are implemented. See [current behavior and limits](INITIAL_IMPLEMENTATION.md) and the root README for setup. Staff console, queued conversion and hosted offline reader remain scaffolds. Queue technology and durable storage integration await selection.

The API reuses `services/core` for public content, exports and signing bindings. The core has no UI or host-adapter imports. Root Python packaging installs API, core and worker packages, and uv/npm lockfiles record dependencies. Capture dependencies are an optional group. Each Python service keeps a separate `src` package for later independent deployment.

`integrations/savanna` separates fixture mapping from the unconfirmed production identity/enrollment adapter. Examples use public synthetic content only. Preserve the original Savanna captures; create the integrated example separately. LTI remains a later extension, with no launch or grade code scaffolded now.

The first implementation slice connects one public fixture lesson through the component and API. Backend and browser tests cover its working behavior. Container orchestration and protected integration remain future work.

## Authentication decision — 11 November 2026

The user confirmed ALX has not confirmed the authentication contract. The earlier resolved-cookie label in `docs/security/SECURITY_PLAN.md` is corrected. Cookie-related statements elsewhere are conditional design proposals, not evidence of available ALX integration. Confirm identity validation, enrollment, revocation, origin/CSP and deployment before protected content is enabled.
