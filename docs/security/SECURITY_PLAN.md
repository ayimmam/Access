# Security Implementation Plan — Access / Track 2 Accessible Learning Media

> Based on: `docs/planning/TRACK_2_IMPLEMENTATION_PLAN.md`, architecture diagram, and `Savanna-static-pages` starter code audit.
> Updated 14 November 2026. The [implemented session/privacy architecture](SECURITY_PRIVACY_ARCHITECTURE.md) describes the working local demonstration and current OWASP mapping. The [co-designer test guide](../testing/CO_DESIGN_SECURITY_TESTING.md) supplies the human test sequence. Historical proposals below are reconciled by the implementation plan. Production partner identity/enrollment remains an external contract.

---

## What we are building (security context)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Savanna (ALX host)                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Concept lesson page  →  our Web Component (player, captions, sign,   │  │
│  │  transcript, downloads, job card, certificate link)                    │  │
│  │  Savanna adapter (identity · lesson mapping · progress)                │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
         │  REST /api/v1   │  Authorized asset URLs
         ▼                 ▼
┌──────────────────────────────┐
│  Our backend (FastAPI)       │
│  PostgreSQL + Object storage │
│  Background workers          │
│  Publishing console (React)  │
└──────────────────────────────┘
         │  "Same API contract"
         ▼
  Independent demo website
```

The starter is **pure static HTML** frozen from ALX's local dev app. Key facts:
- `body class="signed_in env_development"` — the host signals auth state via a body class; no token is in the DOM
- One hardcoded Rails CSRF `authenticity_token` exists in the "Mark as complete" form (`concept-with-navigation.html:936`) — this is a **frozen snapshot value**, not a live secret, but it confirms the production form will POST with a real token we must not break or reuse
- `localStorage['sidebar-collapsed']` is the only client-side storage the starter uses
- Three content embed types load external resources at runtime: `::rive data:`, `::github-content data:`, `::chidi data:` (base64-encoded JSON) — the `chidi` block carries `apiUrl`, `jsUrl`, `cssUrl`, and a `systemPrompt` field
- Scripts from `https://oss.maxcdn.com` are referenced for IE8 shims — dead CDN; drop in our integration pages
- No authentication API, no fetch calls, no sessions — the starter is intentionally inert

---

## User Review Required

> [!IMPORTANT]
> The following design decisions cannot be finalized without your answers to the **Open Questions** section at the bottom of this document. The plan below describes what we will build once those decisions are resolved.

> [!CAUTION]
> The frozen CSRF token (`zFMOZGQMJo...`) in `concept-with-navigation.html` must **never** be copied into our module or used as a test fixture. It is a real session-bound Rails token from the dev environment. Treat it as PII and do not commit it anywhere beyond its current location.

> [!WARNING]
> The `::chidi data:` block carries a `systemPrompt` field authored inline in lesson content. If we render or relay this prompt server-side, it is a prompt-injection surface. This must be sandboxed and validated before any AI backend processes it.

---

## Security Architecture by Layer

---

### Layer 1 — Savanna Host Integration (Savanna Adapter)

This is the trust boundary between ALX's system and ours.

#### 1.1 Identity & session handling
- **Never** read the `signed_in` body class as proof of authentication in our module. It is a CSS hint only.
- The learner's identity is established via the **Savanna session cookie** — `HttpOnly`, `Secure`, `SameSite=Lax` (minimum). Our module's API calls must include this cookie; the server validates it on every request.
- All identity checks happen **server-side in the Savanna adapter** — never trust a user ID, role, or enrollment claim supplied by the client.
- The module must fail **closed**: if the session is missing or invalid, render a clearly labeled "sign in required" state rather than partially exposing content.
- Do not store the learner's identity in `localStorage` or `sessionStorage`. Sidebar state (`sidebar-collapsed`) is the only thing the starter stores; keep it that way on the client.
- Because auth uses a session cookie, our API origin must be same-domain or a declared subdomain of Savanna. CORS configuration must use an explicit `Allow-Origin` matching the Savanna domain — **never a wildcard** — with `credentials: true`.

#### 1.2 Progress reporting
- Progress events must flow **from our module → host adapter → Savanna** only. Our module must never mark a lesson complete based solely on media playback.
- Progress writes require the same session credential as the launch. If the session expires mid-lesson, queue the event and replay it after re-authentication — do not silently drop it or accept a spoofed event from a query parameter.

#### 1.3 CSP compatibility
- Our Web Component must mount without relaxing the host's CSP. We do not control Savanna's headers; test against the headers the starter's capture was served under.
- Load all player assets (JS, CSS, fonts, media) from our own origin or pre-approved CDN only. No inline event handlers. Use a nonce-compatible script loading strategy.
- The dead `oss.maxcdn.com` shim references in the starter must not be replicated in our integration pages — they are a supply-chain risk (domain could be re-registered).

#### 1.4 iframe / embed isolation
- The `data-static-substitute="iframe"` placeholder in the starter confirms the host uses iframes for some embeds. If we are mounted in an iframe, we must:
  - Validate `window.origin` on any `postMessage` we receive; reject all messages from unexpected origins
  - Never relay `postMessage` content to our API without sanitization
- If we mount as a script embed (Level 1), namespace all CSS (BEM prefix or Shadow DOM) to avoid colliding with Savanna's stylesheet

---

### Layer 2 — REST API (`/api/v1`)

#### 2.1 Authentication
- All non-public endpoints require a **verified bearer token** issued by (or validated against) the host identity provider.
- Token validation must be performed **server-side on every request** — never trust a client-supplied role claim.
- Short-lived tokens only (max 1 hour). Include a silent refresh path so active sessions do not break mid-lesson.

#### 2.2 Authorization (role-based access control)
Roles and their enforced API permissions:

| Role | Allowed operations |
|---|---|
| **Learner** | GET manifest, GET approved assets, GET job card, GET certificate (read-only, own data only) |
| **Author** | POST lesson ingest, GET/PATCH review items (own), GET export status |
| **Reviewer** | GET all review items, PATCH review state (approve/reject), GET export previews |
| **Publisher** | POST publish, POST rollback, DELETE draft |
| **Service account** (worker) | Internal queue endpoints only; not reachable from the internet |

- Enforce role checks at the **route handler level**, not just the middleware. A missing role check on a single endpoint breaks the entire model.
- Authoring and publishing endpoints require the caller to have **both** the appropriate role **and** ownership of (or assignment to) the lesson being modified.

#### 2.3 Input validation & injection prevention
- All inputs validated against strict schemas before processing (FastAPI/Pydantic models are the enforcement layer).
- Caption/transcript text: strip or escape HTML before storing; re-validate on export.
- File uploads:
  - Allowlist MIME types (video/mp4, audio/mp3, text/vtt, application/pdf — enumerate exactly)
  - Enforce maximum file sizes before writing to storage
  - Treat all uploaded filenames as untrusted; generate a UUID-based internal name on ingest
  - Scan upload path for directory traversal sequences before any filesystem operation
- The `::chidi data:` / LLM tutor block carries a `systemPrompt` authored in lesson content. If we ever relay this to an AI backend: validate it is a plain string, enforce a character-count ceiling, and log the full prompt before forwarding. Never execute it as code.

#### 2.4 SSRF prevention
- Background workers must not accept arbitrary URLs for fetching. Any external URL fetch (e.g., downloading a source video the author supplies by URL) must be:
  - Validated against an allowlist of approved source domains
  - Executed via a dedicated egress proxy, not the main API service
  - Subject to response size and content-type limits before the response body is processed

#### 2.5 Export job security
- Export operations (PDF, BRF, offline pack) return a **job ID**, not a file. Files are only downloadable after the job status is `approved` and by an authorized caller.
- Export download URLs must be **time-limited pre-signed URLs** generated at request time — never permanent public links.
- Draft and unapproved exports are only accessible to reviewers and authors, not learners.

#### 2.6 Rate limiting & abuse prevention
- Apply rate limits per authenticated user on:
  - File upload endpoints (prevent storage abuse)
  - Export job creation (prevent CPU/disk exhaustion by background workers)
  - API calls from the independent embed (prevent scraping via the same API contract)
- Return `429 Too Many Requests` with a `Retry-After` header; do not expose rate-limit internals.

#### 2.7 Error handling
- All error responses use a consistent schema: `{ "error": "...", "code": "..." }`. Never return stack traces, internal paths, or database error messages to the client.
- Log full errors server-side with a correlation ID; return only the correlation ID to the client for support lookup.

---

### Layer 3 — Asset Storage

#### 3.1 Separation of draft vs published assets
- Draft assets (not yet approved) live in a **private prefix/bucket** inaccessible via pre-signed URLs to learners.
- Published assets live in a **separate prefix/bucket**. The transition is performed atomically by the publish job, not by renaming files in-place.
- Pre-signed URLs for published assets must be **scoped to the requesting learner's session** where the content is access-controlled, and **unscoped (CDN-cacheable)** only for genuinely public demo content.

#### 3.2 Asset integrity
- Every stored asset has a SHA-256 hash stored in the database at ingest time.
- The API verifies the hash before serving a download link; a hash mismatch blocks delivery and triggers an alert.
- Offline pack manifests include the hash of every included file so the client-side reader can verify integrity after download.

#### 3.3 Course-version binding
- Assets are bound to **both** a `lesson_id` **and** a `course_version_id`. The "Previous Course Versions" feature in Savanna must not silently serve current captions against older media.
- Enforce this in the manifest-generation query, not just documentation.

---

### Layer 4 — Background Workers

#### 4.1 Isolation
- Workers run in a **separate container** with no inbound internet exposure. They communicate with the API via an internal network only.
- Each worker job is scoped to exactly one asset and one operation. Workers must not read or write assets outside their assigned job scope.
- Worker output is written to the **draft storage prefix** only; it cannot directly publish.

#### 4.2 Secrets access
- Workers access object storage credentials via **Docker secrets or environment variables injected at runtime**, never hardcoded in the image.
- Workers have no database write access except to their own job-status table row.

#### 4.3 External AI service calls
- If transcription or translation calls an external AI API: the request must include only the audio/text content, never learner PII or session tokens.
- Log the fact of the call (timestamp, model, job ID) but not the full response in the standard log. Store the response only in the job's private record, not in a shared log stream.

#### 4.4 Conversion job sandboxing
- Document/Braille conversion (Liblouis, DAISY Pipeline) runs in a **separate subprocess or container** with no network access and a filesystem view limited to the job's input and output paths.
- Fail visibly on conversion errors; never produce a silently truncated output file and mark the job as succeeded.

---

### Layer 5 — Publishing Console (React / staff-facing)

#### 5.1 Authentication
- The console is not embedded in Savanna. It requires its own authenticated session (same identity provider as the API, separate session scope).
- Session tokens are **HttpOnly, Secure, SameSite=Strict** cookies — not stored in `localStorage` or `sessionStorage`.

#### 5.2 Caption / HTML input sanitization
- Caption segment text, image description text, and any HTML authored in the console is sanitized on save using an allowlisted HTML parser (e.g., DOMPurify on the client and `bleach` or equivalent on the server).
- Reject any input containing `<script>`, event handlers, or `javascript:` URLs at both layers.

#### 5.3 Review state integrity
- The review state machine (`draft → in_review → approved → published → superseded`) is enforced **server-side**. The client may request a state transition; the server validates the caller's role and the current state before accepting it.
- An `approved` state is invalidated atomically when the source revision changes. The server enforces this in the same transaction that records the new revision.
- **AI output cannot approve itself.** The `approved` state requires a reviewer user ID that is a human account.

---

### Layer 6 — Offline Pack & Client-Side Reader

#### 6.1 Content
- The offline pack must contain **no learner PII, no session tokens, and no progress data**. It is generic content only.
- Include a `manifest.json` with per-file SHA-256 hashes and version metadata.

#### 6.2 Service worker scope
- The service worker is registered only on **our first-party reader origin**. It cannot intercept Savanna's own requests.
- Cache-busting uses the content hash, not a timestamp, so a failed update does not leave a partial version cached.
- Handle quota errors explicitly; on failure, preserve the last complete version rather than leaving a corrupted cache.

#### 6.3 Offline activity isolation
- The offline reader must **never independently award completion or issue certificates**. Completion events are queued and reconciled with the server when online, subject to the host's rules.

---

### Layer 7 — Certificate Verification

#### 7.1 Demo vs real
- The demo verifier page is served from a **separate route or subdomain** explicitly labeled `DEMO — NOT AN ALX-ISSUED CREDENTIAL`.
- The verification endpoint reads its record from **server-side state only** (database row). It must not trust any query parameter, uploaded image, or client-supplied claim as proof of a credential.
- Real certificate links point to the existing ALX verification URL — we do not reissue or re-sign them.

#### 7.2 Information disclosure
- The verification endpoint returns only: credential status (valid/revoked/unknown/unavailable), course name, and issue date. It must **not** return learner email, learner ID, or any other PII to an unauthenticated caller.
- Demo records use a clearly fictional learner; real certificate images stay local unless publication is separately approved.

---

### Layer 8 — Independent Embed (Level 1)

#### 8.1 Script integrity
- The versioned embed script is served over HTTPS with a `Subresource Integrity` (SRI) hash in the `<script>` tag so hosts can verify it has not been tampered with.
- The script must not make any network requests using credentials from the host page's cookie jar. Authorized lesson content uses a **scoped, short-lived launch token** provided at embed time, never a secret in script markup.

#### 8.2 Style isolation
- Namespace all CSS with a unique prefix or use Shadow DOM to prevent collisions with the host page's styles.
- Test the embed alongside Savanna's own stylesheet (the starter's `application_alx.css`) to confirm no visual or functional collisions.

#### 8.3 Multiple instances
- Each embed instance must maintain **independent state** (player position, caption selection, sign window position). Shared `localStorage` keys must be namespaced by lesson ID and embed instance ID.

---

### Layer 9 — Secrets Management

| Secret type | Storage method |
|---|---|
| DB credentials | Docker secret / env var injected at runtime |
| Object storage keys | Docker secret / env var injected at runtime |
| External AI API keys | Docker secret; never in image layers or git history |
| JWT signing key | Docker secret; rotate on schedule |
| Demo certificate signing key | Separate Docker secret; not shared with the JWT key |

- A `.env.example` file documents required variables **without values**.
- `.env` is in `.gitignore` — verify this is enforced before the first commit of real credentials.
- Run `git log --all --full-history -- '*.env' '**secret**'` before any public push to verify no credentials are in git history.

---

### Layer 10 — Logging & Monitoring

- Logs contain: timestamp, correlation ID, user role (not user ID), endpoint, HTTP status, duration.
- Logs must **not** contain: session tokens, file content, caption text, learner names, or any PII.
- Operational metadata only: job ID, asset hash, export format, review state transition, worker duration.
- Alert on: repeated 401/403 from a single IP (brute-force indicator), export job failures exceeding a threshold, storage hash mismatches.

---

## Findings from Starter Code Audit

| Finding | Severity | Action |
|---|---|---|
| Frozen Rails CSRF token in `concept-with-navigation.html:936` | **Informational** (snapshot value, inert) | Do not copy or reuse it; note it as a reference for where our CSRF protection must hook in |
| Dead `oss.maxcdn.com` CDN references (IE8 shims) | **Medium** (supply-chain risk if the domain is re-registered) | Drop from all our integration pages |
| `body class="env_development"` on all frozen pages | **Informational** | Confirm production Savanna sets `env_production`; our module must not branch behavior on this class |
| `::chidi data:` carries inline `systemPrompt` authored in lesson content | **High** (prompt injection surface if relayed to AI backend) | Validate and sanitize before forwarding; enforce character ceiling; log before use |
| `::github-content data:` loads content from GitHub at runtime | **Medium** (SSRF / content-spoofing if URL is learner-controlled) | Confirm whether the URL in the base64 blob is learner-editable; if so, enforce allowlist |
| `localStorage['sidebar-collapsed']` — only client-side storage in starter | **Low** | Acceptable; ensure our additions are equally non-sensitive |
| `data-react-props` / `data-react-cache-id` attributes visible in DOM | **Informational** | These expose component names to anyone with DevTools; acceptable for a learning platform, not a security risk |

---

## Answers to Open Questions

**Q1 — Auth credential format: ⚠️ UNCONFIRMED**
On 11 November 2026, the user confirmed that ALX has not confirmed the authentication contract. The cookie approach below is a conditional proposal, not an available integration or an approved production requirement. Confirm identity/session validation, enrollment, revocation and deployment topology with ALX before implementation.

If ALX approves a server-mediated cookie approach, the proposed module constraints are:
- Never read or extract the cookie value client-side (it must be `HttpOnly`)
- Make all API calls from the **server-side Savanna adapter** using the session cookie as a credential, not from browser JS
- Validate the session server-side on every API request — never trust a client-supplied role or user ID claim
- Our backend must accept the Savanna session as proof of identity and not issue a second, independent session token that could drift from Savanna's auth state

> [!IMPORTANT]
> If ALX selects a **Savanna-cookie-based integration**, our API and the Savanna host must share a domain or be served under a subdomain relationship. Cross-origin requests will not carry the cookie unless CORS is configured with `credentials: true` and an explicit `Allow-Origin` matching the Savanna domain — not a wildcard. Confirm the production domain relationship before wiring up the adapter.

**Q2 — Deployment target: ⚠️ NOT YET DECIDED**
Security controls for TLS, reverse proxy, and network isolation are planned for both scenarios (cloud VM and local/organizer infra). See Layer 2 for how this affects the CORS/cookie domain requirement above. Update this answer when decided.

**Q3 — AI transcription/translation service: ⚠️ NOT YET DECIDED**
Worker isolation and secrets controls (Layer 4) are written to be service-agnostic. When a service is chosen, add its API key to Docker secrets and document its data-retention and PII handling policy before connecting it to any lesson content.

**Q4 — `::github-content data:` URL ownership: ✅ RESOLVED**
The URL is authored by ALX staff only — it is hardcoded in ALX's lesson authoring system. Learners cannot supply an arbitrary URL. **No learner-facing SSRF protection is needed on this path.** We still must not dynamically fetch arbitrary URLs ourselves; validate that any URL we pass to a downstream fetch matches the expected GitHub domain pattern.

**Q5 — Agent rules encoding: ✅ RESOLVED**
Security controls will be encoded **both** as this plan document **and** as project rules in `.agents/rules/security.md` so the agent enforces them automatically during development. See the separate rules file created alongside this plan.

