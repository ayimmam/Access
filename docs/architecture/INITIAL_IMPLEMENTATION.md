# Public lesson foundation

The implementation connects `alx-accessible-lesson` to a versioned FastAPI service. The Savanna-style demo plays the supplied ALX video with draft English captions and an optional 3D timing prototype. An independent synthetic English text lesson exercises reuse. The package uses native semantic controls and open Shadow DOM. The embed fetches with credentials omitted and emits composed, bubbling readiness/error/download-request notifications with lesson identifiers.

## API

The service publishes OpenAPI at `/openapi.json` and documentation at `/api/docs`.

| Route | Behavior |
|---|---|
| `/healthz` | Reports the public-fixture service mode |
| `/api/v1/lessons/demo-learning-plan/manifest?version=1` | Immutable public content with schema version and ETag |
| `/api/v1/lessons/demo-learning-plan/transcripts/en?version=1` | Untimed source text segments |
| `/api/v1/lessons/demo-learning-plan/exports?version=1` | Available formats, sizes, SHA-256 and download links |
| `/api/v1/lessons/demo-learning-plan/downloads/{format}?version=1` | Real `html`, `txt` or `zip` attachment |
| `/api/v1/lessons/alx-transforming-africa/manifest?version=1` | Source video metadata, timed transcript and explicit source-draft/prototype status |
| `/api/v1/lessons/alx-transforming-africa/media/video?version=1` | Supplied MP4 with byte-range support for seeking |
| `/api/v1/lessons/alx-transforming-africa/media/captions?version=1` | WebVTT derived from the supplied caption export |
| `/api/v1/lessons/alx-transforming-africa/signing-manifest?lang=ethsl&version=1` | Language-scoped signing status and source/asset hashes |
| `/api/v1/lessons/alx-transforming-africa/signing-assets/{filename}?lang=ethsl&version=1` | Allowlisted rig/motion GLBs bound to effective approval |

Unknown lessons, unavailable versions and unavailable languages return uniform not-found errors. Validation errors omit input values. Errors contain a stable code, readable message and correlation identifier. Protected host integration and staff mutations remain planned. File serving uses explicit demo paths, the built component and approved signing allowlists. The co-design page reads draft motion files selected locally in the browser.

## Component contract

Public attributes are `api-base`, `lesson-id`, `content-version` and `lang`. A context change cancels earlier requests. Disconnect cancels loading, and stale responses cannot replace the new lesson. Each instance owns its search and text-size state.

Events are `alx-media-ready`, `alx-media-error` and `alx-media-download`. The download event reports `requested` when a link is activated. Browser download completion is outside this notification's scope. Theme tokens are `--access-text`, `--access-surface` and `--access-link`.

The component supports text search, text-size selection, downloads and readable error/retry/fallback states. Media lessons add native video controls, caption visibility/size, a scrollable timed transcript and seek buttons that preserve focus. The optional avatar loads Three.js on demand. It follows the media clock, exposes beside/below docking and disposes renderer resources on close/disconnect. `alx-avatar-status` identifies prototype mode. Source text uses text nodes, and resource URLs must belong to the configured API origin and path.

## Examples and limits

`/` and `/demo/savanna` serve the Savanna-style course/video demo with sidebar, course banner, outline, transcript and local session completion. `/demo/independent` serves the independent text embed with a second instance. The supplied Savanna assets provide its logo, and the page recreates the observed layout in accessible native markup. Production ALX contracts remain pending.

The HTML export is self-contained. The deterministic ZIP contains HTML, text and a hash manifest. Media-lesson packs additionally contain English WebVTT. The video is downloaded separately through an explicit action. Hosted offline caching, signature verification and installed-reader behavior remain planned. Test the extracted HTML on target phones.

The source caption export has wording errors and coarse timing. Its review status is visible. The user approved a labeled 3D timing prototype while EthSL interpretation is authored and reviewed through the [avatar workflow](SIGN_AVATAR_WORKFLOW.md). Reviewed translation, EthSL signing, audio description, PDF and BRF remain pending. Screen-reader, co-design and whole-page conformance evidence remain to collect.

The [interpreter-recording implementation](AVATAR_BLUEPRINT_EVALUATION.md) adds optional CPU capture, an original articulated African-woman rig, draft retargeting/GLB baking and approved-clip playback. `/demo/avatar-review` imports locally selected motion studies and exports timestamped feedback. The generated source-gesture sample has 16 clips and separate EthSL/ASL target metadata. Translation remains pending. Follow the [co-design testing guide](../setup/AVATAR_CO_DESIGN_TESTING.md).

## Verification on 13 November 2026

Fifteen pytest API tests and fifteen Playwright checks pass locally. Browser coverage includes the original text/media flows, prototype controls, language worksheets, external workspace loading, approved GLB seeking, local articulated draft playback, changed-asset rejection and feedback export. Single-phrase baking is also tested for complete duration and overflow rejection. Source-media capture completed for 1,457 frames and 16 draft clips per target. Axe scans cover the Savanna demo and local review page. The lesson and review page fit at 320 CSS pixels. Desktop and mobile lesson rendering and the actual draft avatar were inspected. NVDA, TalkBack, co-design comprehension and GitHub execution of the application-check job remain unverified. See the blueprint runbook for the capture sandbox failure and successful retry.
