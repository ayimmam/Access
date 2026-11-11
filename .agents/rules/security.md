# Security Rules — Access / Track 2 Accessible Learning Media

These rules are enforced automatically during development. Do not bypass or weaken any control
without explicit written approval from the security reviewer.

---

## Authentication & Identity

- NEVER read `body.signed_in`, `body.env_development`, or any CSS body class as proof of
  authentication. These are styling hints only.
- ALL identity checks must happen server-side in the Savanna adapter. Never trust a user ID,
  role, or enrollment flag supplied by the client in a request body or query parameter.
- The session cookie must be `HttpOnly`, `Secure`, and `SameSite=Lax` (minimum). Never store
  session tokens in `localStorage` or `sessionStorage`.
- CORS configuration must specify an **explicit `Allow-Origin`** matching the Savanna production
  domain. A wildcard (`*`) is NEVER permitted on credentialed endpoints.
- When the session is missing or invalid, the module must fail **closed** — render a "sign in
  required" state. Never partially expose content.

---

## Authorization (RBAC)

- Enforce role checks at the **route handler level** for every endpoint, not only in middleware.
- Roles and their maximum allowed operations:
  - `learner`: GET approved manifests/assets/job-card/certificate (own data only)
  - `author`: POST ingest, GET/PATCH own review items, GET export status
  - `reviewer`: GET all review items, PATCH review state, GET export previews
  - `publisher`: POST publish/rollback, DELETE draft
  - `service_account`: Internal job-queue endpoints only; must not be reachable from the internet
- Authoring and publishing endpoints require the caller to have the correct role **and** ownership
  of or assignment to the specific lesson being modified.
- The review state machine (`draft → in_review → approved → published → superseded`) is enforced
  server-side. The client requests a transition; the server validates role and current state.
- **AI-generated output cannot approve itself.** The `approved` state requires a human reviewer ID.
- A source revision change must atomically invalidate all dependent `approved` states in the same
  database transaction.

---

## Input Validation & Injection Prevention

- Validate ALL inputs against strict Pydantic schemas before any processing.
- Caption/transcript text: strip or escape HTML on save (server-side) and re-validate on export.
- File uploads:
  - Accept only an explicit MIME-type allowlist (video/mp4, audio/mp3, text/vtt, application/pdf — enumerate exactly, do not use wildcards)
  - Enforce maximum file sizes before writing to storage
  - Treat all uploaded filenames as untrusted; generate a UUID-based internal name on ingest
  - Reject any path containing `../`, `./`, or null bytes before filesystem operations
- Never pass unvalidated HTML, caption text, or user-supplied strings to `innerHTML`,
  `document.write`, or `eval`.
- DOMPurify (client) and `bleach` or equivalent (server) must be applied to any authored HTML
  before storage. Reject `<script>`, event handler attributes, and `javascript:` URLs at both layers.

---

## LLM / AI Tutor (`::chidi` block)

- The `::chidi data:` block carries a `systemPrompt` field authored inline in lesson content.
  This is a **prompt injection surface**. Before forwarding to any AI backend:
  - Validate the value is a plain string with no embedded instruction delimiters
  - Enforce a character-count ceiling (define the ceiling before first use)
  - Log the full prompt (redacted of learner PII) before forwarding
  - Never execute the systemPrompt as code or evaluate it in any script context
- The `::github-content` URL is authored by ALX staff only and is not user-editable. Still
  validate that any URL we pass to a downstream fetch matches the expected GitHub domain pattern
  before making the request.

---

## SSRF Prevention

- Background workers must NOT accept arbitrary URLs for fetching.
- Any external URL fetch must be validated against an allowlist of approved source domains before
  the request is made.
- External fetches are executed via a dedicated egress path, not the main API service.
- Enforce response size and content-type limits before processing the response body.

---

## Asset Storage & Integrity

- Draft assets must live in a **private storage prefix** inaccessible to learner-scoped pre-signed URLs.
- Published assets live in a **separate prefix**. The transition is atomic — no in-place rename.
- Every asset must have a SHA-256 hash stored in the database at ingest time.
- Pre-signed download URLs are time-limited. No permanent public asset links for access-controlled content.
- Assets are bound to both `lesson_id` AND `course_version_id`. Never serve current-version assets
  against an older lesson version.
- Offline pack manifests include the SHA-256 hash of every included file for client-side integrity verification.

---

## Background Workers

- Workers run in a separate container with **no inbound internet exposure**.
- Each worker job is scoped to exactly one asset and one operation.
- Worker output is written to the **draft storage prefix only** — workers cannot directly publish.
- Workers access credentials via Docker secrets or runtime-injected environment variables.
  Credentials must never be hardcoded in image layers or committed to git.
- Conversion tools (Liblouis, DAISY Pipeline) run with no network access and a filesystem view
  limited to the job's input/output paths.
- Never silently produce a truncated output file and mark the job succeeded. Fail visibly.

---

## Offline Pack & Service Worker

- The offline pack must contain NO learner PII, NO session tokens, and NO progress data.
- The service worker is registered only on our first-party reader origin. It must not intercept
  Savanna's requests.
- Cache-busting uses content hashes, not timestamps.
- Handle quota errors explicitly; on failure, preserve the last complete version.
- The offline reader must NEVER independently award completion or issue certificates.

---

## Certificate Verification

- The demo verifier reads its record from server-side state only.
  NEVER trust any query parameter, uploaded image, or client-supplied claim as proof of a credential.
- The verification endpoint returns only: status, course name, issue date.
  It must NOT return learner email, learner ID, or any PII to an unauthenticated caller.
- Demo records use a clearly fictional learner. The demo page is explicitly labeled
  `DEMO — NOT AN ALX-ISSUED CREDENTIAL`.
- Real certificate links point to the existing ALX verification URL only. We do not reissue or re-sign them.

---

## Independent Embed (Level 1)

- The versioned embed script is served over HTTPS with a Subresource Integrity (SRI) hash in the
  `<script>` tag of any host page.
- The script must not make credentialed requests using the host page's cookie jar.
  Authorized content uses a scoped, short-lived launch token — never a secret in script markup.
- All CSS is namespaced (BEM prefix or Shadow DOM) to prevent collisions with the host stylesheet.
- Multiple embed instances must maintain independent state; shared localStorage keys must be
  namespaced by lesson ID and embed instance ID.
- The dead `oss.maxcdn.com` IE8 shim references in the starter must NOT be replicated in any of
  our integration pages.

---

## Secrets Management

- `.env` is in `.gitignore`. Verify before every push.
- Run `git log --all --full-history -- '*.env' '**secret**'` before any public push.
- A `.env.example` documents required variable names WITHOUT values.
- JWT signing key and demo certificate signing key are stored as separate Docker secrets and
  are never shared with each other.
- Rotate the JWT signing key on a defined schedule.

---

## Logging

- Logs MUST contain: timestamp, correlation ID, user role (not user ID), endpoint, HTTP status, duration.
- Logs MUST NOT contain: session tokens, file content, caption text, learner names, or PII.
- Alert on: repeated 401/403 from a single IP, export job failures above threshold, storage hash mismatches.
- Full error details are logged server-side with a correlation ID. The client receives only the
  correlation ID — never stack traces, internal paths, or database error messages.

---

## CSRF

- The frozen Rails `authenticity_token` value visible in `concept-with-navigation.html` is a
  snapshot from the dev environment. It must NEVER be copied, reused, or treated as a valid token.
- Our POST endpoints require CSRF protection appropriate to their auth mechanism (double-submit
  cookie pattern for cookie-authenticated endpoints; bearer-token endpoints are inherently CSRF-resistant).
