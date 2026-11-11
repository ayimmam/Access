# Comprehensive Security & Accessibility Architecture Plan — Track 2 Accessible Learning Media Platform

**Document Status:** Consolidated Architecture & Security Plan (v2.0)  
**Target System:** Track 2B Accessible Content Publishing Pipeline, Reference Lesson Player, Offline Reader, & Career Gateway (ALX Savanna / Digital Bridge)  
**Governing Standards:** [W3C WCAG 2.2 Level AA/AAA](https://www.w3.org/TR/WCAG22/), [NIST SP 800-63B Digital Identity Guidelines](https://pages.nist.gov/800-63-4/sp800-63b.html), [W3C WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/), [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html), and [OWASP Mobile M6 Privacy Controls](https://nhimg.org/owasp-mobile-top-10-m6-inadequate-privacy-controls-guide)

> **Zero-Assumption Policy:** All unconfirmed external contracts (such as the `ALX identity and enrollment service` production interface, final cloud vs. local deployment topology, and external AI transcription vendor selection) are explicitly isolated as conditional controls and listed in Section 7 for confirmation before production lock-in.

## 1. System Architecture & Trust Boundaries (Mapped to Architecture Diagram)

The platform architecture comprises three primary subsystem boundaries and four cross-boundary integration nodes, as established in the system architecture diagram, `TRACK_2_IMPLEMENTATION_PLAN.md`, `SECURITY_PLAN.md`, and `ALX_Hackathon_Recommendation (1).docx`.

```
+---------------------------------------------------------------------------------------------------+
| SUBSYSTEM A: CONTENT PUBLISHING PIPELINE (Staff & Co-Design Boundary)                             |
|                                                                                                   |
|  [Approved ALX source content: Media • lesson text • images]                                      |
|         │                                                                                         |
|         ▼                                                                                         |
|  [Accessible staff console (React)] <──(Review & correct)──> [Human review: Amharic • captions •  |
|         │                                                     descriptions • EthSL • Braille]     |
|         ├──(Authoring requests)──────────────────────────┐            │                           |
|         ▼                                                │            ▼                           |
|  [Publish approved version] ──(Publish through API)──────┼───────> (To REST API /api/v1)          |
|                                                          │                                        |
|  [Background workers: Transcription • translation drafts │                                        |
|   Media processing • document/Braille export] <──────────┼──(Queue processing from /api/v1)       |
|         ├──(Draft status)──> [Database]                  │                                        |
|         └──(Draft assets)──> [Asset storage]             │                                        |
+----------------------------------------------------------┼----------------------------------------+
                                                           │
                                                           ▼
+---------------------------------------------------------------------------------------------------+
| SUBSYSTEM B: OUR ACCESSIBLE MEDIA SERVICE (Core Backend & Storage Boundary)                       |
|                                                                                                   |
|  [REST API /api/v1 (FastAPI): OpenAPI • authorization • versioned content]                        |
|         │                                                │                                        |
|         ▼                                                ├──(Stream or download approved assets)  |
|  [Database (PostgreSQL)]                                 ▼                                        |
|   • Lesson & media mappings                       [Asset storage (Object Storage)]                |
|   • Review status • jobs • credential links        • Video • audio • captions • sign recordings   |
|                                                    • HTML • tagged PDF • BRF • offline packs      |
+---------------------------------------------------------------------------------------------------+
          ▲                        ▲                       ▲                        ▲
          │ (Same API contract)    │ (Sync / fetch)        │ (Fetch manifests,      │ (Authorized
          ▼                        ▼                       │  transcripts, exports) │  asset URLs)
[Independent website]    [Offline reader / pack]           │                        │
 • Same script +          • Audio • text • light HTML      │                        │
   Web Component          • Approved BRF                   │                        │
                                   ▲                       │                        │
                                   │ (Save selected        │                        │
                                   │  formats)             │                        │
+----------------------------------┼-----------------------┼------------------------┼---------------+
| SUBSYSTEM C: EXISTING SAVANNA PLATFORM (Host Learner Boundary)                    │               |
|                                  │                       │                        │               |
|  [Concept lesson page] ──> [Accessible lesson Web Component (TypeScript)]         │               |
|                             • Player • captions • sign window                     │               |
|                             • Audio description • transcript                      │               |
|                             • Downloads • career gateway                          │               |
|                                  │               ▲       │                        │               |
|           (Open official         │   (Authorized │       │ (Progress              │               |
|            verification link)    │    launch)    │       ▼  events)               │               |
|                   ▼              │               [Savanna adapter] ───────────────┘               |
|        [ALX certificate verifier]│                • Lesson context • authorization • progress     |
+----------------------------------┼--------------------------------▲-------------------------------+
                                   │                                │
                                   └────────────────────────────────┴──> [ALX identity & enrollment
                                                                          service: Production
                                                                          contract to confirm]
```

### Component Inventory & Trust Zones

| Subsystem / Boundary | Diagram Component | Primary Users / Actors | Trust Level & Security Role |
| :--- | :--- | :--- | :--- |
| **A. Content Publishing Pipeline** | `Approved ALX source content` | Content Authors | Trusted input source (master video, lesson text, slides, image descriptions) requiring MIME, size, and filename validation at ingest. |
| **A. Content Publishing Pipeline** | `Accessible staff console` | Authors, Bilingual Reviewers, EthSL Interpreters, Deaf Co-Designers, Braille Transcribers, Publishers | Authenticated staff zone (React SPA). Enforces keyboard/screen-reader accessibility and strict HTML/WebVTT input sanitization. |
| **A. Content Publishing Pipeline** | `Human review` & `Publish approved version` | Human Reviewers & Publishers | Mandatory human-in-the-loop gate. AI output cannot self-approve; source revisions atomically invalidate prior approvals. |
| **A. Content Publishing Pipeline** | `Background workers` | Internal Service Accounts (Docker) | Isolated, non-internet-exposed worker zone running Liblouis, DAISY Pipeline, PDF tagging, media transcoding, and draft AI transcription. |
| **B. Our Accessible Media Service** | `REST API /api/v1` | Savanna Adapter, Staff Console, Independent Website, Offline Reader | Central policy enforcement point (FastAPI). Enforces RBAC, schema validation, rate limiting, and course-version binding. |
| **B. Our Accessible Media Service** | `Database` (PostgreSQL) | `REST API /api/v1` & `Background workers` (status row only) | Persistent state store for lesson/version mappings, review state machine, export jobs, and demo credential records. |
| **B. Our Accessible Media Service** | `Asset storage` (Object Storage) | `REST API /api/v1`, `Background workers`, `Savanna adapter` | Split into physically or prefix-isolated **Draft** (staff-only) and **Published** (learner-accessible via pre-signed URLs) buckets with SHA-256 verification. |
| **C. Existing Savanna Platform** | `Concept lesson page` & `Accessible lesson Web Component` | ALX Digital Bridge Learners (using NVDA, TalkBack, Braille displays, EthSL, 200% zoom) | Host DOM / Shadow DOM boundary. Coexists with Savanna navigation, `Resume` workflows, and the expandable **Ask LEA** drawer. |
| **C. Existing Savanna Platform** | `Savanna adapter` | Host Backend / Integration Layer | Primary trust bridge between Savanna (`HttpOnly` session cookie) and our service (`Authorized launch`, `Progress events`, `Authorized asset URLs`). |
| **Cross-Boundary Nodes** | `ALX identity and enrollment service` | Savanna Host & Adapter | Authoritative identity/session provider (*Production contract to confirm with ALX*). |
| **Cross-Boundary Nodes** | `Independent website` | External Learners / Evaluators | Level 1 portable script + Web Component embed operating over the `Same API contract` without access to Savanna host cookies. |
| **Cross-Boundary Nodes** | `Offline reader / downloaded pack` | Low-Bandwidth / Offline Android Learners | First-party HTTPS PWA (`service worker` + `localStorage`) and downloadable ZIP packs (`< 5 MB` core audio/text/HTML + approved `.brf`). |
| **Cross-Boundary Nodes** | `ALX certificate verifier` | Learners & External Employers | Dual-mode verification: read-only links to official Savanna URLs (`https://savanna.alxafrica.com/certificates/...`) plus an isolated `DEMO` verifier route. |

## 2. Pillar 1: Accessible Yet Secure Authentication Across All Components

Traditional authentication mechanisms frequently rely on cognitive function tests (memorizing complex character strings, transcribing 6-digit codes under a 30-second timer, or solving visual/audio CAPTCHAs) that violate [WCAG 2.2 SC 3.3.8 Accessible Authentication (Minimum) (Level AA)](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html) and [SC 3.3.9 Accessible Authentication (Enhanced) (Level AAA)](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-enhanced.html). Our platform eliminates these barriers across every component in the architecture diagram while maintaining [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html) assurance.

### 2.1 Existing Savanna Platform (`Concept lesson page`, `Accessible lesson Web Component`, `Savanna adapter`, & `ALX identity and enrollment service`)

* **Zero-Prompt Server-Side Session Delegation**: Learners arriving via `eHub Learning → Savanna course → Access my learning / Resume → Concept lesson page` must never face a secondary login prompt inside the `Accessible lesson Web Component`. Instead, the `Savanna adapter` authenticates the learner using the existing Savanna session cookie (`HttpOnly`, `Secure`, `SameSite=Lax` minimum) shared across the Savanna domain/subdomain ([OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)).
* **Strict Rejection of Client-Side DOM Hints**: The starter audit revealed that Savanna sets `<body class="signed_in env_development">`. Neither the `Accessible lesson Web Component` nor the `Savanna adapter` may ever trust `body.signed_in`, DOM attributes (`data-react-props`), or client-supplied user/enrollment IDs as proof of authentication. Every `Authorized launch` request is verified server-side against the `ALX identity and enrollment service`.
* **Accessible Fail-Closed State**: If the `Savanna adapter` detects a missing, expired, or invalid Savanna session cookie, the component fails closed and renders an accessible, keyboard-focusable sign-in callout (with clear English and Amharic labels, `role="region"`, and a direct link to the Savanna login route that preserves the `Resume` return URL) rather than exposing partial media or throwing an unhandled error.
* **Protection of Host CSRF Tokens**: The frozen Rails `authenticity_token` (`zFMOZGQMJo...`) observed in the "Mark as complete" form (`concept-with-navigation.html:936`) belongs strictly to Savanna's host form submission. Our Web Component must never extract, store, log, or overwrite the host's CSRF token, and must never trigger "Mark as complete" automatically on media end.

### 2.2 Content Publishing Pipeline (`Accessible staff console`, `Human review`, & `Publish approved version`)

* **Passkey-First & SSO Authentication ([W3C WebAuthn](https://www.w3.org/TR/webauthn-3/))**: Because the editorial team includes Deaf co-designers, Ethiopian Sign Language interpreters, and blind/low-vision Braille transcribers, the standalone `Accessible staff console` must support [W3C WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/) (FIDO2 passkeys via platform biometrics such as Android TalkBack fingerprint, Windows Hello, macOS Touch ID, or hardware security keys) alongside OAuth 2.0 / OIDC Single Sign-On. This provides phishing-resistant multi-factor authentication ([NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html)) with zero memorization or transcription ([WCAG 2.2 SC 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)).
* **Accessible Passphrase Fallback ([WCAG 2.2 SC 1.3.5](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html))**: Where passphrases are used as a fallback:
  * Annotate inputs with standard HTML `autocomplete="username"`, `autocomplete="current-password"`, and `autocomplete="new-password"` attributes so password managers and assistive tools auto-fill credentials without manual typing.
  * Never disable paste (`onpaste` / `Ctrl+V`) and always provide an accessible "Show/Hide Passphrase" button (`type="button"`, `aria-pressed="true|false"`, `aria-controls`) so screen-reader and motor-impaired users can verify input before submitting.
  * Enforce a 12-to-15-character minimum length and screen against breached credential lists server-side rather than imposing arbitrary symbol/number composition rules or mandatory 90-day resets ([OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)).
* **Single-Input MFA & Magic Links (Preventing [WCAG Failure F109](https://www.w3.org/WAI/WCAG22/Techniques/failures/F109))**: Never split a 6-digit TOTP/OTP verification code across six separate `<input maxlength="1">` elements, which creates severe screen-reader navigation friction and breaks clipboard paste ([WCAG Technique Failure F109](https://www.w3.org/WAI/WCAG22/Techniques/failures/F109)). Use a single `<input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code">` field with a 10-minute validity window or support one-click magic-link / push confirmation ([OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)).

### 2.3 Our Accessible Media Service (`REST API /api/v1` & `Background workers`)

* **Complete Ban on Visual, Puzzle, and Audio CAPTCHAs**: In accordance with [W3C Inaccessibility of CAPTCHA](https://www.w3.org/TR/turingtest/) and [WCAG 2.2 SC 3.3.9](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-enhanced.html), no endpoint on `REST API /api/v1`, the `Accessible staff console`, the `Independent website`, or the `ALX certificate verifier` may ever challenge a user with a visual puzzle, object-recognition task, or distorted-audio CAPTCHA.
* **Invisible Abuse & Bot Mitigation**: Protect `REST API /api/v1` against credential stuffing, scraping, and worker exhaustion using non-interactive server-side controls:
  * Per-user and per-IP token-bucket rate limiting on file ingest, export job creation (`POST /v1/lessons/{id}/exports`), and manifest fetches, returning `429 Too Many Requests` with a standard `Retry-After` header and a plain-language English/Amharic message.
  * Server-side RBAC enforcement at the FastAPI route handler level across all five roles (`Learner`, `Author`, `Reviewer`, `Publisher`, and internal `Service account`), verifying both role and resource ownership/assignment on every mutating request.
  * Internal network isolation for `Background workers`, authenticating worker status updates via runtime-injected Docker secrets rather than user-facing endpoints.

### 2.4 Cross-Boundary Nodes (`Independent website`, `Offline reader / downloaded pack`, & `ALX certificate verifier`)

* **Independent Website (Level 1 Script + Web Component)**: The portable embed script must never read cookies from the third-party host page's cookie jar. Public demonstration lessons use unauthenticated read-only manifest routes, while protected lessons on external hosts use a short-lived, server-signed launch token issued via `REST API /api/v1`—never embedding static API keys or secrets in `<script>` markup. All script tags must include a `Subresource Integrity` (SRI) SHA-384 hash.
* **Offline Reader / Downloaded Pack**: Downloaded ZIP packs (`Audio • text • light HTML • approved BRF`) require zero authentication to open locally on a learner's Android phone (`file://` or local viewer), eliminating login barriers when offline. For the first-party HTTPS Offline Reader PWA (`service worker` + `localStorage`), initial library saving piggybacks on the learner's active session or passkey without requiring re-authentication on offline launch.
* **ALX Certificate Verifier**: Both the official Savanna certificate verification link (`https://savanna.alxafrica.com/certificates/...`) and the standalone pitch verifier (`DEMO — NOT AN ALX-ISSUED CREDENTIAL`) are publicly readable by employers via direct URL without requiring the employer to create an account, solve a CAPTCHA, or scan a QR code visually.

## 3. Pillar 2: User-Friendly Session Management Across All Components

Strict, unadjustable session timeouts disproportionately lock out users with disabilities who navigate via screen readers (NVDA on desktop, TalkBack on Android), switch devices, refreshable Braille displays, or synchronized Ethiopian Sign Language video. Every stateful component in the diagram must satisfy [WCAG 2.2 SC 2.2.1 Timing Adjustable (Level A)](https://www.w3.org/WAI/WCAG22/Understanding/enough-time.html), [SC 2.2.5 Re-authenticating (Level AAA)](https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html), [SC 2.2.6 Timeouts (Level AAA)](https://www.w3.org/WAI/WCAG22/Understanding/timeouts.html), and [SC 3.3.7 Redundant Entry (Level A)](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html).

### 3.1 Existing Savanna Platform (`Accessible lesson Web Component` & `Savanna adapter`)

* **Assistive-Activity-Aware Silent Token Refresh**: While backend bearer tokens issued by the `Savanna adapter` for `REST API /api/v1` calls remain short-lived (maximum 1-hour TTL per [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)), the adapter performs silent background refresh whenever the learner is actively engaging with the lesson. Active signals include video/audio playback, Ethiopian Sign Language window docking/resizing, transcript search, keyboard focus traversal, or audio-description playback—ensuring a learner is never logged out while watching or reading a long lesson.
* **Accessible Timeout Dialog & Ask LEA Collision Prevention**: If a learner pauses all interaction and approaches an idle session limit:
  * Display an accessible modal dialog (`role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`) announced through an assertive live region at least **2 minutes** (far exceeding the 20-second minimum in [WCAG 2.2 SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/enough-time.html)) before expiration.
  * Allow the learner to extend the session by at least **10×** the default window with a single `Space` or `Enter` keystroke on the default-focused "Stay Signed In" button, and return keyboard focus to the exact prior player/transcript control upon dismissal.
  * Ensure the timeout dialog and player pause/resume controls reflow cleanly at **200% zoom** and narrow mobile widths without being obscured by or trapping focus behind Savanna's expandable **Ask LEA** right-hand support panel.
* **Zero Loss of Progress Events on Session Expiry**: If a learner's Savanna session expires mid-lesson (or their 400 kbps mobile connection drops), `Progress events` emitted by the `Accessible lesson Web Component` are queued locally in an isolated, lesson-namespaced buffer rather than silently dropped. Once the learner re-authenticates, the `Savanna adapter` replays the queued progress events server-side ([WCAG 2.2 SC 2.2.5](https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html)).

### 3.2 Content Publishing Pipeline (`Accessible staff console` & `Human review`)

* **Isolated `HttpOnly` Staff Sessions with Continuous Auto-Save**: The `Accessible staff console` manages sessions via `HttpOnly`, `Secure`, `SameSite=Strict` cookies (never storing tokens in `localStorage` or `sessionStorage`). Because editing timed WebVTT captions, translating Amharic segments, verifying Ethiopic line wrapping, and proofing `.brf` Braille tables are time-intensive tasks:
  * Every caption segment edit, image description change, and review note is auto-saved as a server-side `draft` revision every 15 seconds and on field blur (`onBlur`).
  * If a reviewer or interpreter's session expires after prolonged inactivity, re-authentication restores their exact in-progress segment, timestamp, and cursor focus without losing a single character of work ([WCAG 2.2 SC 2.2.5](https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html) and [SC 3.3.7](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html)).
* **Asynchronous Polling for Long-Running `Background workers`**: Because Braille conversion (Liblouis + DAISY Pipeline), tagged PDF generation, and media transcoding run asynchronously in `Background workers`, export triggers (`POST /v1/lessons/{id}/exports`) immediately return a `job_id`. The console tracks progress via non-blocking status polls (`GET /v1/export-jobs/{id}`) and announces completion once via a polite ARIA live region (`aria-live="polite"`) rather than holding open brittle, long-lived HTTP requests or flooding screen readers with continuous progress percentages.

### 3.3 Cross-Boundary Nodes (`Offline reader / downloaded pack` & `Independent website`)

* **Offline Reader State Persistence & Deferred Sync**: In the first-party HTTPS `Offline reader`, the service worker caches versioned lesson bundles indexed by SHA-256 hash. Learner playback positions, bookmark states, and caption/sign-window preferences persist locally without session timeouts. Explicit completion events are queued locally and reconciled with `REST API /api/v1` and the `Savanna adapter` only when connectivity and an authenticated session are restored; offline activity never self-issues official course completion or certificates.
* **Multi-Instance State Isolation on the `Independent website`**: When two or more instances of the `Accessible lesson Web Component` are mounted on the same page (the Level 1 acceptance test), all client-side UI preferences (`localStorage`) are strictly namespaced by `lesson_id`, `course_version_id`, and `embed_instance_id`—and kept separate from Savanna's host `localStorage['sidebar-collapsed']` key—preventing state collisions across embeds.

## 4. Pillar 3: Privacy Controls That Protect Sensitive Data Without Confusing the User

On a platform built for learners with disabilities, assistive usage patterns (such as selecting Ethiopian Sign Language video, downloading `.brf` Braille files, or enabling audio descriptions) can implicitly reveal sensitive health or disability status. Our privacy architecture applies strict data minimization ([OWASP Mobile M6 Privacy Controls](https://nhimg.org/owasp-mobile-top-10-m6-inadequate-privacy-controls-guide)) and clear, accessible user controls across every component in the diagram.

### 4.1 Platform-Wide Data Minimization: Zero Disability-Diagnosis Collection

* **No Medical or Disability Profiling in `Database` or Logs**: As mandated in `TRACK_2_IMPLEMENTATION_PLAN.md`, the platform **never** collects, infers, or stores disability diagnoses or medical classifications in PostgreSQL, cookies, analytics, or server logs.
* **Functional Format Preferences Only**: Instead of asking *"What is your disability?"*, the `Accessible lesson Web Component` and `Offline reader` store only functional presentation choices—such as caption font size/color/opacity presets, EthSL sign-window size and docking coordinates, audio-description track selection, or preferred Braille output profile (e.g., English UEB uncontracted vs. reviewed Amharic BRF). By decoupling format selection from identity records, any learner can use any format without generating a sensitive disability record.

### 4.2 Bilingual, Plain-Language Privacy Controls (`Accessible lesson Web Component` & `Accessible staff console`)

* **Layered Plain-Language Explanations in English & Amharic**: Avoid dense legal jargon or multi-tab cookie banners that create cognitive barriers. Every privacy or data-sharing choice is presented in concise, plain-language English and Amharic using accessible toggle switches (`role="switch"`, `aria-checked`) with explicit labels explaining *what* is stored, *why* it helps the user, and *how* to turn it off with one click ([GDPR & Information Security Guide](https://blog.mi.hdm-stuttgart.de/index.php/2020/08/19/gdpr-and-information-security-for-startups/)).
* **Prerecorded Audio Summaries for Consent Prompts**: Just as the Career Gateway job card pairs visible text with reviewed prerecorded audio (with play/pause controls and no autoplay), any substantive consent prompt—such as opting in to share lesson context during a human support handover or granting interpreter/Deaf co-designer publication consent in the `Accessible staff console`—provides an equivalent prerecorded audio explanation in English and Amharic.

### 4.3 Component-by-Component Sensitive Data & Side-Channel Controls

* **`Approved ALX source content`, `Accessible staff console`, & `Human review` (Interpreter & Co-Designer Consent)**:
  * Recording and publishing the Ethiopian Sign Language interpretation video requires explicit, documented consent from the interpreter and sign-off from the Deaf co-designer before the review state machine (`draft → in_review → approved → published`) allows publication.
  * For recorded live session replays, staff must sanitize and redact private learner names and personal messages from the time-stamped chat log inside the `Accessible staff console` before the bundle can transition to `approved`.
  * Sanitize all caption cues, transcript segments, chat logs, and image descriptions on both client (DOMPurify) and server (`bleach`/allowlisted parser) to strip `<script>`, inline event handlers, and `javascript:` URIs.
* **`Background workers` & External AI Services (PII Stripping & Prompt-Injection Sandboxing)**:
  * When `Background workers` call an external AI transcription or translation service, the outbound payload is restricted strictly to the raw lesson audio or source text—never including learner PII, staff credentials, or session tokens.
  * The starter audit identified base64-encoded `::chidi data:` blocks containing an inline `systemPrompt` field alongside `apiUrl`, `jsUrl`, and `cssUrl`. If any component relays `systemPrompt` to an AI backend, validate it as a plain string, enforce a strict character ceiling, strip untrusted URLs, and log the sanitized prompt in an isolated audit record to prevent prompt injection and SSRF.
  * Run Liblouis and DAISY Pipeline conversions in network-isolated subprocesses/containers scoped solely to the single job's input/output file paths, writing only to the private **Draft** prefix in `Asset storage`.
* **`Asset storage`, `Database`, & `REST API /api/v1` (Draft/Published Split, Course-Version Binding, & Log Redaction)**:
  * **Physical/Prefix Separation**: Unapproved assets (`draft`, `in_review`) reside in a private storage prefix inaccessible to learners. Atomic publication copies approved assets and their SHA-256 hashes to the **Published** prefix, served via short-lived, session-scoped pre-signed URLs (`Authorized asset URLs`).
  * **Course-Version Binding**: Every manifest query and asset URL binds `lesson_id` + `course_version_id` so learners viewing Savanna's *Previous Course Versions* never receive mismatched captions, sign recordings, or Braille files from a newer lesson revision.
  * **Zero-PII Operational Logging**: API and worker logs record only correlation IDs, timestamps, user roles (never user IDs, names, or emails), endpoints, HTTP statuses, and job durations. Detailed stack traces are never returned to clients (`{ "error": "...", "code": "...", "correlation_id": "..." }`).
* **`Offline reader / downloaded pack` (Zero-PII Portable Bundles)**:
  * Downloaded ZIP packs and PWA cache bundles contain **zero learner PII, zero session cookies, and zero bearer tokens**—only the reviewed audio, text, self-contained semantic HTML, approved `.brf` Braille files, and a `manifest.json` containing SHA-256 file hashes. If learners share an offline ZIP file peer-to-peer via phone storage or Bluetooth, no personal account or session data is ever exposed ([OWASP Mobile M6 Privacy Controls](https://nhimg.org/owasp-mobile-top-10-m6-inadequate-privacy-controls-guide)).
* **`ALX certificate verifier` (Minimal Disclosure & Demo Isolation)**:
  * **Official Savanna Certificates**: For real credentials (such as the inspected *Freelancer Academy* and *Professional Foundations* certificates), the Career Gateway displays a readable summary, links directly to the existing Savanna verification URL (`https://savanna.alxafrica.com/certificates/...`), and provides a keyboard-accessible "Copy Verification Link" button alongside the QR code. Real learner certificate images and real signatures (Fred Swaniker, Jaco Jansen van Rensburg) are never copied into synthetic demo credentials.
  * **Synthetic Pitch Verifier**: The demo verification page is served from an isolated route prominently labeled `DEMO — NOT AN ALX-ISSUED CREDENTIAL`. It queries server-side `Database` state (never trusting URL query parameters or uploaded images) and returns only **credential status** (`valid`, `revoked`, `unknown`, `unavailable`), **course name**, and **issue date** for a fictional demo learner—never exposing learner email addresses or internal user IDs.

## 5. End-to-End Component Security & WCAG 2.2 Matrix (All 11 Diagram Nodes)

| Diagram Component | Accessible Authentication Control | User-Friendly Session Management | Privacy & Data Protection Control | Governing WCAG 2.2 & Security Standards |
| :--- | :--- | :--- | :--- | :--- |
| **1. `Approved ALX source content`** | Authenticated author upload via `Accessible staff console` session; no public ingest. | Chunked/resumable upload support so slow connections do not time out mid-upload. | Strip EXIF/author metadata from uploaded media; replace untrusted filenames with UUIDs; enforce strict MIME allowlists. | [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [WCAG 2.2 SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/enough-time.html) |
| **2. `Accessible staff console`** | FIDO2 Passkeys ([W3C WebAuthn](https://www.w3.org/TR/webauthn-3/)) + SSO; fallback passphrases with `autocomplete`, paste enabled, and show/hide toggle; single-field OTP. | `HttpOnly`, `Secure`, `SameSite=Strict` cookie; continuous 15s draft auto-save; `alertdialog` timeout warning with 10× single-key extension. | Client/server HTML & WebVTT sanitization; explicit interpreter/co-designer consent logging; chat log PII redaction UI. | [WCAG 2.2 SC 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html), [SC 1.3.5](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html), [Failure F109](https://www.w3.org/WAI/WCAG22/Techniques/failures/F109), [SC 2.2.5](https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html) |
| **3. `Human review` & `Publish approved version`** | Role-based verification (`Reviewer` vs. `Publisher`) enforced server-side; human account ID required (AI cannot self-approve). | Review state persists across sessions (`draft → in_review → approved → published`); source edits atomically invalidate stale approvals. | Audit trail records reviewer role, timestamp, and source revision hash without exposing learner PII. | [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html), [WCAG 2.2 SC 3.3.7](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html) |
| **4. `Background workers`** | Internal Docker network only; runtime-injected Docker secrets; scoped per-job service credentials. | Asynchronous job queue (`job_id` polling) with polite ARIA completion announcements in console; no browser timeout dependency. | Zero learner PII sent to external AI APIs; sandboxed Liblouis/DAISY containers with no outbound internet; egress domain allowlist. | [OWASP Mobile M6 Privacy Controls](https://nhimg.org/owasp-mobile-top-10-m6-inadequate-privacy-controls-guide) |
| **5. `REST API /api/v1`** | Server-side token/cookie validation on every request; route-level RBAC + ownership checks; zero CAPTCHAs (rate-limited via `429` + `Retry-After`). | Short-lived tokens (max 1h) with silent refresh endpoint; explicit Savanna-origin CORS (`credentials: true`, no wildcard). | Generic error schema (`correlation_id` only, no stack traces); sanitize `::chidi data:` `systemPrompt`; bind queries to `course_version_id`. | [W3C Inaccessibility of CAPTCHA](https://www.w3.org/TR/turingtest/), [WCAG 2.2 SC 3.3.9](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-enhanced.html), [OWASP Session Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) |
| **6. `Database` (PostgreSQL)** | Runtime-injected DB secrets; worker write access restricted strictly to job-status rows. | Stores server-side auto-saved editorial drafts and idempotent learner progress records for post-timeout recovery. | Zero disability diagnoses stored; logs and tables exclude unnecessary PII; synthetic demo credentials isolated from production records. | [OWASP Mobile M6 Privacy Controls](https://nhimg.org/owasp-mobile-top-10-m6-inadequate-privacy-controls-guide), [WCAG 2.2 SC 2.2.5](https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html) |
| **7. `Asset storage` (Object Storage)** | Pre-signed URLs (`Authorized asset URLs`) scoped to authorized sessions; runtime-injected storage keys. | Time-limited pre-signed download/stream URLs refreshed seamlessly by the adapter when a learner resumes playback. | Strict separation of **Draft** (staff-only) and **Published** buckets; SHA-256 hash verification before serving any asset. | [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) |
| **8. `Concept lesson page` & `Accessible lesson Web Component`** | Zero secondary login prompt; accessible fail-closed sign-in prompt if host session is absent; drop dead `oss.maxcdn.com` shims. | Activity-aware silent refresh during playback/transcript/EthSL use; accessible timeout modal that never collides with **Ask LEA** at 200% zoom. | Stores only functional UI preferences (captions, EthSL dock, Braille profile); bilingual plain-language + audio privacy switches; CSP/Shadow DOM isolation. | [WCAG 2.2 SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/enough-time.html), [SC 2.2.6](https://www.w3.org/WAI/WCAG22/Understanding/timeouts.html), [SC 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html) |
| **9. `Savanna adapter` & `ALX identity and enrollment service`** | Server-side validation of Savanna `HttpOnly` session cookie; ignores client `body.signed_in` class; preserves host Rails CSRF token. | Bridges Savanna host session with `/api/v1`; queues and replays `Progress events` across transient disconnects or re-authentication. | Relays minimal lesson/enrollment context; never stores learner identity in `localStorage` or `sessionStorage`. | [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [WCAG 2.2 SC 2.2.5](https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html) |
| **10. `Independent website` & `Offline reader / downloaded pack`** | SRI-verified script + short-lived launch token for embeds; zero auth required to open local ZIP packs (`< 5 MB`). | Multi-instance `localStorage` namespacing (`lesson_id` + `instance_id`); service worker preserves last valid SHA-256 cached version on quota/network error. | Offline packs contain zero PII, cookies, or tokens; offline reader cannot self-award course completion or certificates. | [WCAG 2.2 SC 2.2.5](https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html), [OWASP Mobile M6 Privacy Controls](https://nhimg.org/owasp-mobile-top-10-m6-inadequate-privacy-controls-guide) |
| **11. `ALX certificate verifier`** | Publicly verifiable by employers without login or CAPTCHA; accessible "Copy Verification Link" button alongside QR code. | Stateless, fast verification lookup with rate limiting to prevent enumeration. | Real certificates link to official Savanna URL; synthetic `DEMO` route returns only status, course name, and issue date for a fictional learner. | [W3C Inaccessibility of CAPTCHA](https://www.w3.org/TR/turingtest/), [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/) |

## 6. Verification & Accessibility-Security Gate Checklist

Before any release or hackathon demonstration, the integrated platform must pass both the **Accessibility Pass/Fail Gate** (unaided task completion, zero critical/serious `axe-core` findings, and WCAG 2.2 AA conformance report) and the following security-accessibility verification checks:

1. **Unaided Authentication & Session Continuity (NVDA & TalkBack)**: Verify that a screen-reader user on desktop (NVDA) and Android (TalkBack) can launch a Savanna lesson, adjust captions/EthSL window, extend an approaching session timeout with a single keypress, and resume without data loss at 200% zoom with the **Ask LEA** panel open.
2. **Passkey & Password-Manager Login on `Accessible staff console`**: Confirm that authors, Deaf co-designers, and Braille reviewers can sign in via WebAuthn passkeys or pasted password-manager credentials (`autocomplete="current-password"`) with zero CAPTCHAs or split OTP boxes.
3. **Offline Pack PII & Hash Audit**: Inspect generated ZIP packs and PWA service-worker caches on the target low-cost Android phone (tested under a 400 kbps down / 150 kbps up / 400 ms latency profile) to confirm zero cookies, tokens, or learner identifiers are present and that SHA-256 manifest verification blocks corrupted files.
4. **Course-Version & Embed Isolation Test**: Mount two instances of the `Accessible lesson Web Component` on the `Independent website` and test *Previous Course Versions* in Savanna to confirm strict style, state, and `course_version_id` isolation.
5. **Credential & Git History Hygiene**: Confirm `.env` is ignored, run `git log --all --full-history -- '*.env' '**secret**'`, verify the frozen Rails `authenticity_token` from `concept-with-navigation.html:936` is absent from all module code, and verify `DEMO — NOT AN ALX-ISSUED CREDENTIAL` returns zero PII across `valid`, `revoked`, `unknown`, and `unavailable` states.

## 7. Open Architectural Questions & Unconfirmed Contracts (Requires Your Confirmation)

In keeping with a strict zero-assumption approach, the following open items from `SECURITY_PLAN.md`, `TRACK_2_IMPLEMENTATION_PLAN.md`, and the architecture diagram (`image_5b8663.jpg`) must be confirmed with you (or ALX at kick-off) to lock in the final implementation rules:

1. **`ALX identity and enrollment service` Production Contract (Diagram Node 9)**: The diagram labels this node *"Production contract to confirm."* Once the `Savanna adapter` receives the learner's `HttpOnly` Savanna session cookie, how does Savanna expose session validation and enrollment verification to our backend (e.g., an internal introspection endpoint, a shared Redis/database session store, or an LTI 1.3 launch payload)?
2. **Deployment Topology & Domain Relationship (`SECURITY_PLAN.md` Q2)**: Will `Our accessible media service` (`REST API /api/v1` and `Asset storage`) and the `Accessible staff console` be deployed under a subdomain of Savanna (so the `SameSite=Lax` Savanna cookie is sent automatically to the adapter) or on a separate domain/cloud VM (which requires a server-to-server proxy in the Savanna host or explicit cross-origin token exchange)?
3. **`Accessible staff console` Identity Provider**: Should staff members (authors, bilingual English/Amharic reviewers, Ethiopian Sign Language interpreters, and Deaf co-designers) authenticate into the React `Accessible staff console` using ALX's existing staff SSO/Identity Provider, or should our FastAPI backend host a dedicated WebAuthn/passkey + magic-link authentication service for the editorial console?
4. **External AI Transcription/Translation Vendor (`SECURITY_PLAN.md` Q3)**: Have you selected a self-hosted model (e.g., local Whisper) or an external cloud API for draft English transcription and Amharic translation in `Background workers`? Confirming this determines whether we enforce strict zero-egress container policies for transcription workers or configure an egress proxy with vendor data-retention controls.
5. **Protected Lessons on the `Independent website` vs. Public Demo**: On the `Independent website` (`Same script + Web Component`), will all embedded lessons be public demonstration lessons, or do you also need the short-lived scoped launch token flow implemented for access-controlled lessons outside Savanna?
6. **Recorded Session Chat Replay Scope**: For the recorded live session viewer mentioned in `TRACK_2_IMPLEMENTATION_PLAN.md`, will chat logs be ingested as static files through the `Accessible staff console` (where reviewers can redact names/PII before approval), or fetched dynamically from an external conference provider API?
