# External preparation for the first demo

Updated 13 November 2026. Anteneh collects deployment and host contracts, Biniyam prepares source content and data/storage integration, and Hailemichael reviews permissions and security boundaries.

Follow the [step-by-step acquisition guide](DEPENDENCY_ACQUISITION_GUIDE.md) for account screens, configuration fields, ownership and verification steps for this checklist.

| Item to collect | Details needed | Work enabled |
|---|---|---|
| Render workspace | Member access, $100 credit eligibility/expiry, chosen region and spending estimate | Hosted API, static delivery and later worker |
| Durable asset storage | S3-compatible endpoint, region, draft/published bucket names, scoped server credentials and CORS | Reviewed media and export distribution |
| ALX identity and enrollment | Supported server-side exchange, entitlement scope, revocation and expiry behavior | Protected production lessons |
| ALX embed contract | Allowed script/connect/media origins and CSP, editor mount location, stable lesson/media/course-version identifiers | Production Savanna mapping |
| ALX progress rules | Documented completion endpoint/event policy and authorization | Host-owned progress reconciliation |
| Authorized master lesson | Source video/audio and script, distribution rights, approved transcript and image descriptions | Playback, captions, descriptions and media exports |
| English/Amharic review | Reviewed translation and timed WebVTT, local font files with licenses | Bilingual content delivery |
| Ethiopian Sign Language | Interpreter slot, recording/distribution consent, terminology and Deaf reviewer | Approved interpretation |
| EthSL avatar assets/provider | Confirmed EthSL language support, licensed rig and hand/face motion data, approved phrase translation, provider format and scoped server credentials if used | Reviewed 3D interpretation after the timing prototype |
| Braille profile | Expert-reviewed sample BRF, code/table/grade, encoding, page dimensions and target device | Validated BRF conversion |
| Certificate integration | Official verification URL and permitted display metadata | Real certificate links |
| Recorded session | Authorized recording and redacted timestamped chat | Session replay |

Keep secrets in runtime configuration or the team's approved secret store. Share provider names, configuration field names and readiness status in project notes.

## Dependencies supplied by the codebase

The initial implementation uses FastAPI, Uvicorn and Pydantic for the API, TypeScript and esbuild for the custom element, and pytest/HTTPX/Playwright/axe for verification. Lockfiles record resolved versions. Install these from the repository commands in the root README.

The Savanna-style demo now plays the supplied ALX video and draft English captions, with transcript seeking and a Three.js timing prototype. The independent synthetic text lesson is also available. HTML/text/ZIP exports share source lesson data, and the source-video pack includes WebVTT. Review the [avatar workflow](../architecture/SIGN_AVATAR_WORKFLOW.md) for the translation, motion and approval steps. Persistent publishing, reviewed EthSL interpretation, specialist exports and production authentication remain implementation tasks.

## Decisions that can wait

Reviewed manual source imports allow progress before choosing a transcription or translation API. If an external AI provider is selected, collect its data-use terms, retention settings, cost limits and scoped server key. Benchmark local multilingual transcription before selecting an NPU runtime for Biniyam's laptop.

Choose queue technology after measuring conversion jobs. Agree PostgreSQL and storage configuration before adding the persistent publishing model. Obtain the organizer's official gate and clarify the required WebView host for TalkBack testing.
