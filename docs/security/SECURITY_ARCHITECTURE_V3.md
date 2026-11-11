# Comprehensive Security & Accessibility Architecture Plan — Track 2 Accessible Learning Media Platform (v3.0)

**Document Status:** Consolidated & Threat-Hardened Architecture Plan (v3.0 — Post-Security Review)  
**Target System:** Track 2B Accessible Content Publishing Pipeline, Reference Lesson Player, Savanna Adapter, Offline Reader, & Career Gateway (ALX Savanna / Digital Bridge)  
**Governing Standards:** [W3C WCAG 2.2 Level AA/AAA](https://www.w3.org/TR/WCAG22/), [OWASP Top 10:2025](https://top10.owasp.org/2025/en/), [NIST SP 800-63B Digital Identity Guidelines](https://pages.nist.gov/800-63-4/sp800-63b.html), [W3C WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/), [W3C Content Security Policy Level 3](https://www.w3.org/TR/CSP3/), [W3C Trusted Types](https://www.w3.org/TR/trusted-types/), [RFC 8032 EdDSA (Ed25519)](https://www.rfc-editor.org/info/rfc8032/), [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html), [OWASP Mobile M6 Privacy Controls](https://nhimg.org/owasp-mobile-top-10-m6-inadequate-privacy-controls-guide), and [Ethiopia's Personal Data Protection Proclamation No. 1321/2024](https://justice.gov.et/en/law/personal-data-protection-proclamation/)

> **Standing Accessibility & Security Invariant:** Every security mitigation in this plan is designed so that **zero controls** introduce cognitive function tests, timing pressure, split OTP boxes, or visual/audio puzzles ([WCAG 2.2 SC 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html), [SC 3.3.9](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-enhanced.html), [W3C Inaccessibility of CAPTCHA](https://www.w3.org/TR/turingtest/)). All authentication, session-extension, rate-limit, and verification workflows remain 100% operable unaided with NVDA, TalkBack, refreshable Braille displays, 200% zoom, switch/voice control, and Ethiopian Sign Language (EthSL) workflows.

## 1. Security Design Re-Evaluation & Threat Model Summary

Following the defensive architecture review (`docs/security/SECURITY_ARCHITECTURE_REVIEW.md`), we re-evaluated the v2.0 design against the [OWASP Top 10:2025](https://top10.owasp.org/2025/en/) categories, multi-step attack chains (`C-1` through `C-8`), and assistive-technology privacy inference vectors (`R-01` through `R-15`).

### 1.1 Primary Structural Finding: Host-Origin Execution of the Embedded Web Component (`R-01` / `C-1`)

The single highest-impact structural reality in the architecture is that the `Accessible lesson Web Component` mounts directly inside the Savanna `Concept lesson page` DOM (using Shadow DOM for CSS isolation, **not** a cross-origin `<iframe>`). Because Shadow DOM is a styling boundary rather than a security boundary, **any stored Cross-Site Scripting (XSS) payload that survives sanitization in caption cues, transcripts, image descriptions, or recorded session chat logs executes with Savanna's full origin privileges**. An attacker achieving XSS inside our component could invoke Savanna's "Mark as complete" endpoint using the host's Rails CSRF `authenticity_token`, read learner data exposed in `data-react-props`, or mint launch tokens via the `Savanna adapter`.

To close this vector completely without degrading screen-reader announcements, v3.0 elevates content rendering and sanitization to a **host-origin defense-in-depth control**:
1. **Strict Text-Node-Only Rendering (`textContent`)**: The `Accessible lesson Web Component` is strictly forbidden from using `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `dangerouslySetInnerHTML` for captions, transcripts, descriptions, or chat logs. Rendering exclusively via DOM text nodes (`textContent`) eliminates the DOM XSS sink by construction while providing cleaner, more reliable announcements in NVDA and TalkBack.
2. **Authoritative Server-Side Sanitization at Ingest via [`nh3`](https://pypi.org/project/nh3/)**: We replace the deprecated/unmaintained Python `bleach` library with [`nh3`](https://pypi.org/project/nh3/) (Rust Ammonia bindings) at the API ingest boundary, paired with UTF-8 NFC normalization and strict WebVTT block-grammar validation before storage. Client-side DOMPurify in the `Accessible staff console` serves only as a secondary layer.
3. **Two-Person Integrity (`Author ≠ Reviewer ≠ Publisher`)**: Database and route-level state transitions enforce `author_id ≠ reviewer_id ≠ publisher_id` per `course_version_id` so a single compromised staff account cannot self-approve and publish poisoned captions.
4. **Host CSP & [W3C Trusted Types](https://www.w3.org/TR/trusted-types/)**: Because our component uses `textContent` exclusively, it is [Trusted Types](https://www.w3.org/TR/trusted-types/)-compliant by construction, allowing us to enforce `require-trusted-types-for 'script'` and disallow `unsafe-inline` scripts across our surfaces and recommend the same header baseline for Savanna host pages.

### 1.2 Summary of Re-Evaluated Risks & Architectural Upgrades (`R-01` to `R-15`)

| Risk ID | Severity | Vulnerability / Tension Identified in Review | v3.0 Architectural Remediation | Accessibility Impact |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | **High** | Stored XSS in player content executes at Savanna origin (`C-1`) | Enforce `textContent`-only rendering (CI grep ban on `innerHTML`), authoritative ingest sanitization with [`nh3`](https://pypi.org/project/nh3/), two-person integrity (`author ≠ reviewer ≠ publisher`), and [W3C Trusted Types](https://www.w3.org/TR/trusted-types/) / CSP. | **Positive:** Text nodes announce more predictably in NVDA/TalkBack than injected HTML fragments. |
| **R-02** | **High** | Pre-signed asset URL leakage via `Referer`, link sharing, and shared caches | Cap pre-signed URL TTLs at `≤ 300 s` (stream) and `≤ 60 s` (refresh); adapter refreshes URLs before expiry during active playback; enforce `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, and **physically separate** `draft` vs. `published` buckets. | **Zero friction:** Pre-expiry adapter refresh prevents stream stalls on 400 kbps mobile links. |
| **R-03** | **High** | Indefinite session extension via synthetic client activity + silent refresh (`C-4`) | Restrict refresh arbitration strictly to the server-side `Savanna adapter` based on server-observed API/asset activity; enforce a **12-hour absolute session cap**, refresh-token rotation with reuse detection (family revocation), and full server revocation on logout/password change. | **Preserves [WCAG 2.2 SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/enough-time.html):** 12 hours covers a full study day with a 2-minute accessible warning before cap. |
| **R-04** | **High** | IDOR on `GET /v1/export-jobs/{id}` leaks unapproved drafts & interpreter recordings (`C-2`) | Use UUIDv4 job IDs, enforce `(owner_role, owner_id)` ownership checks, return uniform `404` (never `403`) for foreign IDs, and omit asset paths/content from job status payloads (status + `correlation_id` only). | **Positive:** Uniform bilingual error schema explains next steps clearly without leaking resource existence. |
| **R-05** | **Med-High** | SSRF via DAISY/PDF/AI workers (`C-5`: XXE, `<img src>`, or `apiUrl` reaching `169.254.169.254`) | Disable XML external entities (`resolve_entities=false`, `no_network=true`, DTDs off) in all parsers; route necessary worker egress through an allowlist proxy blocking RFC 1918, CGNAT, link-local, and cloud metadata IPs (+ IMDSv2); hard-reject any URL in `systemPrompt`. | **Zero learner impact:** Purely backend/worker isolation. |
| **R-06** | **Med-High** | Per-IP rate limits cause mass false lockouts under Ethiopian mobile CGNAT (`C-8`) | Key primary rate limits **per authenticated user** (`5/min` auth, `10/hr` export, `120/min` manifest) with a **10× per-IP ceiling**; apply **progressive throttling, never permanent lockouts**; return `429` + `Retry-After` with bilingual plain-language recovery guidance. | **Critical accessibility win:** Prevents classroom/carrier-wide lockouts and preserves [WCAG 2.2 SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/enough-time.html). |
| **R-07** | **Medium** | Client-controlled progress-event replay enables completion fraud (`C-6`) | Validate replay plausibility server-side (monotonic timestamps, bounded playback rates, session-bound queues) and require server-observed pre-signed asset fetches as implicit attestation before recording lesson completion. | **Zero friction:** Legitimate offline/400 kbps learners automatically fetch assets before replaying progress. |
| **R-08** | **Medium** | Offline pack tampering (`C-7`: SHA-256 checks integrity, not authenticity, risking PWA XSS) | Sign canonical `manifest.json` with [RFC 8032 Ed25519](https://www.rfc-editor.org/info/rfc8032/) and pin the public key in the Offline Reader PWA; verify signature + SHA-256 hashes before rendering any pack HTML; on failure, serve last valid cached version + one-click re-download notice. | **Safe fallback:** Never dead-ends an offline learner; announces recovery via `aria-live="polite"`. |
| **R-09** | **Medium** | Disability inference from format-preference telemetry, `User-Agent` logs, and cadence traces | Keep format preferences **client-side only** (`localStorage`); scrub `User-Agent` and `sec-ch-ua` from logs; cap behavioral traces at 30 days; enforce `k ≥ 50` k-anonymity on aggregate analytics; adopt explicit Data-Retention Register & 72h EthSL takedown SLA. | **Protects learner privacy:** Learners use EthSL, Braille, and audio descriptions with zero profiling risk. |
| **R-10** | **Medium** | `SameSite=Strict` staff cookie breaks OIDC/SSO redirect returns; autosave CSRF risk | Use `HttpOnly; Secure; SameSite=Lax` on the IdP callback handoff cookie before establishing the console session (or POST-message continuation), and enforce per-session CSRF tokens + `Origin`/`Sec-Fetch-Site` checks on all mutating routes (including 15s autosaves). | **Prevents SSO lockouts:** Staff using screen readers or switch devices are never trapped in broken login loops. |
| **R-11** | **Low-Med** | Launch-token forwarding on protected `Independent website` embeds | Ship Level 1 with public demo lessons only; when protected embeds are required, bind Ed25519/HS256 launch tokens to `aud` (host origin), `exp` (`≤ 15 min`), `jti` (server replay cache), `lesson_id`, and `course_version_id`. | **Zero friction:** Transparent to learners. |
| **R-12** | **Low-Med** | Public exposure of `/docs`, `/redoc`, `/openapi.json`, and `env_development` debug flags | Gate `/docs` and `/redoc` behind admin auth or disable in production; authenticate `/openapi.json`; disable `DEBUG` and verbose tracebacks; enforce strict HTTP security headers. | **Zero learner impact.** |
| **R-13** | **Low-Med** | Magic-link replay, OTP brute force in 10-min window, and `Host`-header link poisoning | Cap OTP attempts at `≤ 5` per code (then force reissue) with progressive delay; make magic links single-use (10-min expiry) built from a hardcoded allowlisted base URL (never `Host` header); revoke on credential change; enforce SPF/DKIM/DMARC. | **Preserves accessibility:** Caps attempts per *code* rather than locking out the user's account. |
| **R-14** | **Low-Med** | Unmaintained `bleach`; CVE surface in Liblouis, `ffmpeg`, DAISY; untrusted AI model pickles | Replace `bleach` with [`nh3`](https://pypi.org/project/nh3/); generate CycloneDX SBOMs; run Trivy + Dependabot; pin base images by digest and verify Whisper model checksums (no untrusted pickles); run workers as non-root with read-only rootfs, `no-new-privileges`, and `seccomp`. | **Zero learner impact.** |
| **R-15** | **Low** | Certificate-verifier ID enumeration and demo/production DB co-mingling | Enforce constant-time, identical response shapes for `unknown` vs. `revoked` IDs; rate-limit (`60/min/ID`, `300/min/IP`); set `X-Robots-Tag: noindex`; isolate `DEMO` credentials in a separate DB schema with a production startup guard. | **Preserves employer usability:** Fast, CAPTCHA-free verification with copyable links. |

## 2. System Architecture & Trust Boundaries (Mapped to Architecture Diagram)

The diagram below reflects the three core subsystems and four cross-boundary nodes from `image_5b8663.jpg`, updated with the v3.0 security enforcement boundaries:

```
+---------------------------------------------------------------------------------------------------+
| SUBSYSTEM A: CONTENT PUBLISHING PIPELINE (Staff & Co-Design Boundary)                             |
|                                                                                                   |
|  [Approved ALX source content: Media • lesson text • images]                                      |
|         │  (MIME allowlist, size cap, UUID rename, EXIF/sidecar strip)                            |
|         ▼                                                                                         |
|  [Accessible staff console (React)] <──(Review & correct)──> [Human review: Amharic • captions •  |
|   • WebAuthn Passkeys + OIDC (SameSite=Lax callback -> Strict) descriptions • EthSL • Braille]    |
|   • 15s CSRF-protected autosave + DOMPurify                  • DB Provenance: ai_draft | human    |
|         │                                                    • Two-person rule: Author≠Reviewer   |
|         ├──(Authoring requests + CSRF + Origin check)────┐            │                           |
|         ▼                                                │            ▼                           |
|  [Publish approved version (Reviewer≠Publisher)] ────────┼───────> (To REST API /api/v1)          |
|                                                          │                                        |
|  [Background workers (Non-root, RO-fs, seccomp, no-XXE)] ◄──(JSON/Pydantic Queue from /api/v1)    |
|   • Self-hosted Whisper / Egress-proxied AI (zero PII)   │                                        |
|   • Sandboxed Liblouis, DAISY Pipeline, ffmpeg, PDF      │                                        |
|         ├──(GRANT UPDATE status,updated_at only)──> [Database]                                    |
|         └──(Write to isolated DRAFT bucket only)──> [Asset storage (Draft Bucket)]                |
+----------------------------------------------------------┼----------------------------------------+
                                                           │
                                                           ▼
+---------------------------------------------------------------------------------------------------+
| SUBSYSTEM B: OUR ACCESSIBLE MEDIA SERVICE (Core Backend & Storage Boundary)                       |
|                                                                                                   |
|  [REST API /api/v1 (FastAPI): OpenAPI (gated) • RBAC • nh3 ingest sanitizer • CGNAT rate limits]  |
|         │                                                │                                        |
|         ▼                                                ├──(Stream/download: TTL ≤300s,          |
|  [Database (PostgreSQL - Encrypted at Rest)]             │   no-store, no-referrer, Ed25519 sign) |
|   • Prod schema vs. isolated DEMO schema                 ▼                                        |
|   • Hash-chained consent & state audit log        [Asset storage (Physically Split Buckets)]      |
|   • 30-day access-controlled Pseudonym Bridge      • Bucket 1: DRAFT (staff-only, zero learner)   |
|                                                    • Bucket 2: PUBLISHED (SHA-256 + version-bound)|
+---------------------------------------------------------------------------------------------------+
          ▲                        ▲                       ▲                        ▲
          │ (Public demo or        │ (HTTPS + Ed25519      │ (Fetch manifests,      │ (Pre-signed
          │  aud/jti launch token) │  signed manifest)     │  transcripts, exports) │  asset URLs)
          ▼                        ▼                       │                        │
[Independent website]    [Offline reader / pack]           │                        │
 • SRI-pinned script      • Pinned Ed25519 pubkey          │                        │
 • Isolated localStorage  • Zero PII / zero self-award     │                        │
                                   ▲                       │                        │
                                   │ (Save selected        │                        │
                                   │  formats)             │                        │
+----------------------------------┼-----------------------┼------------------------┼---------------+
| SUBSYSTEM C: EXISTING SAVANNA PLATFORM (Host Learner Boundary — Shared Origin DOM)│               |
|                                  │                       │                        │               |
|  [Concept lesson page] ──> [Accessible lesson Web Component (TypeScript)]         │               |
|                             • STRICT textContent-only rendering (zero innerHTML)  │               |
|                             • Trusted-Types compliant • Reflows with Ask LEA      │               |
|                             • Client-only format prefs (zero disability telemetry)│               |
|                                  │               ▲       │                        │               |
|           (Open official         │   (Authorized │       │ (Session-bound         │               |
|            verification link)    │    launch)    │       ▼  progress events)      │               |
|                   ▼              │               [Savanna adapter] ───────────────┘               |
|        [ALX certificate verifier]│                • Server-side cookie & enrollment verification  |
|         • Constant-time uniform  │                • Server-observed refresh arbitration (12h cap) |
|           responses + noindex    │                • Asset-attested completion validation          |
+----------------------------------┼--------------------------------▲-------------------------------+
                                   │                                │
                                   └────────────────────────────────┴──> [ALX identity & enrollment
                                                                          service: Server-to-server
                                                                          introspection / LTI 1.3]
```

## 3. Pillar 1: Accessible Yet Secure Authentication Across All Components

Every authentication flow eliminates cognitive function tests ([WCAG 2.2 SC 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html) and [SC 3.3.9](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-enhanced.html)) while hardening token minting, SSO callbacks, magic links, and CGNAT rate limiting against [OWASP Top 10:2025 A07 Authentication Failures](https://top10.owasp.org/2025/en/).

### 3.1 Existing Savanna Platform (`Concept lesson page`, `Accessible lesson Web Component`, `Savanna adapter`, & `ALX identity and enrollment service`)

* **Zero-Prompt Delegated Auth with CSRF & Origin Hardening (`D-01`)**:
  * Learners launching a lesson from Savanna authenticate transparently via the `HttpOnly`, `Secure`, `SameSite=Lax` Savanna session cookie validated server-side by the `Savanna adapter` against the `ALX identity and enrollment service` ([OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)).
  * To prevent cross-site token-minting attacks against the adapter, all state-changing and token-minting endpoints on the `Savanna adapter` enforce strict `Origin` and `Sec-Fetch-Site` header validation (`same-origin` / `same-site` allowlist) plus a per-session CSRF token. Each minted launch token is single-use (`jti`), scoped to our API audience (`aud`), and capped at a 15-minute initial TTL.
* **Complete Rejection of Client-Supplied Identity & Enrollment Claims (`D-02`)**:
  * Extending the starter-audit rule against trusting `<body class="signed_in env_development">`, the `Savanna adapter` and `REST API /api/v1` reject **all** client-supplied `user_id`, `role`, `enrollment_id`, or `course_version_id` claims in request bodies, query strings, or replayed progress queues. Identity and enrollment entitlement are derived exclusively from the server-verified session.
* **Allowlisted Fail-Closed Sign-In Callout (`D-03`)**:
  * When a session is missing, expired, or unenrolled, the component fails closed and renders a bilingual (English/Amharic) keyboard-focusable region (`role="region"`) with a sign-in or support link.
  * To prevent open-redirect attacks, the `Resume` return URL parameter attached to the sign-in link is validated against a strict server-side allowlist of canonical Savanna origins and relative lesson paths.

### 3.2 Content Publishing Pipeline (`Accessible staff console`, `Human review`, & `Publish approved version`)

* **Passkey-First Authentication & OIDC Cookie Strategy Fix (`D-05`, `R-10`)**:
  * Staff (authors, bilingual English/Amharic reviewers, Ethiopian Sign Language interpreters, Deaf co-designers, and Braille transcribers) authenticate via [W3C WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/) FIDO2 passkeys or ALX OIDC Single Sign-On.
  * **Cookie Strategy Fix (`R-10`)**: Because `SameSite=Strict` cookies are dropped by browsers during cross-site OIDC Identity Provider redirects (locking assistive technology users out of the console upon return), the OIDC callback handoff uses a short-lived `HttpOnly; Secure; SameSite=Lax` state cookie or a `postMessage` continuation, which immediately exchanges into the console's session cookie paired with a per-session CSRF token required on every `POST`, `PATCH`, and `DELETE` request (including 15-second draft autosaves).
  * **Accessible Authenticator Recovery**: If a staff member loses their hardware key or device, account recovery uses admin-assisted re-enrollment verified out-of-band—never cognitive security questions, which violate both [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html) and [WCAG 2.2 SC 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html).
* **Accessible Passphrase Fallback & Breach Screening (`D-06`)**:
  * Passphrase fields include `autocomplete="username"`, `autocomplete="current-password"`, and `autocomplete="new-password"` ([WCAG 2.2 SC 1.3.5](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html)), permit clipboard paste (`onpaste`), and provide an accessible "Show/Hide Passphrase" toggle (`aria-pressed`).
  * Enforce a 12-to-15-character minimum length and screen against a locally cached/k-anonymized breached-password corpus (so password hashes or prefixes are never leaked in external query logs) with zero composition rules or periodic reset mandates ([OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)).
* **Hardened Single-Input OTP & Magic Links (`D-07`, `R-13`)**:
  * Where OTP or magic-link fallbacks are enabled, codes use a single `<input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code">` field (preventing [WCAG Technique Failure F109](https://www.w3.org/WAI/WCAG22/Techniques/failures/F109)).
  * **Brute-Force Protection without Account Lockout**: Each OTP code is valid for 5–10 minutes (accommodating screen-reader users switching between email/SMS and browser) but enforces a hard cap of **`≤ 5` verification attempts per issued code**, after which that code is invalidated and a fresh code must be requested, paired with progressive per-user throttling.
  * **Host-Header Poisoning Prevention (`R-13`)**: Emailed or Telegram magic links are single-use, expire in 10 minutes, are constructed exclusively from an immutable server-configured base URL (never from the incoming HTTP `Host` or `X-Forwarded-Host` header), are immediately revoked upon password/email change, and are sent from a domain enforcing SPF, DKIM, and DMARC (`p=reject`).

### 3.3 CGNAT-Aware, CAPTCHA-Free Abuse Prevention (`REST API /api/v1`, `D-08`, `R-06`)

* **Absolute Ban on Visual and Audio CAPTCHAs**: No surface may ever render visual object recognition, distorted text, or audio CAPTCHAs ([W3C Inaccessibility of CAPTCHA](https://www.w3.org/TR/turingtest/)).
* **CGNAT-Resilient Rate Limiting (`R-06` / `C-8`)**: In Ethiopia, mobile network operators place thousands of learners behind shared Carrier-Grade NAT (CGNAT) IPv4 addresses. Naive per-IP rate limits would trigger mass false `429` lockouts across entire classrooms or regions. We therefore enforce a two-tier **throttle-never-lockout** policy:

| Surface / Endpoint Class | Primary Limit (Per Authenticated User / Token) | Secondary Ceiling (Per IP — CGNAT Safe) | Behavior on Exceeding Limit |
| :--- | :--- | :--- | :--- |
| **Auth / OTP / Token Refresh** | `5 requests / min` (with progressive delay) | `50 requests / min` (`10×` user ceiling) | Return `429 Too Many Requests` + `Retry-After` header + bilingual plain-language notice; **zero permanent account lockouts** ([WCAG 2.2 SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/enough-time.html)). |
| **Export Job Creation (`POST /v1/lessons/{id}/exports`)** | `10 jobs / hour` | `100 jobs / hour` (`10×` user ceiling) | Return `429` + `Retry-After` + polite ARIA live announcement (`aria-live="polite"`) stating exact wait time. |
| **Manifest & Asset URL Fetch** | `120 requests / min` | `1,200 requests / min` (`10×` user ceiling) | Return `429` + `Retry-After`; client player automatically backs off and retries transparently without dropping focus. |
| **Public Certificate Verifier** | `60 requests / min / credential_id` | `300 requests / min / IP` | Constant-time uniform response shape; `X-Robots-Tag: noindex`. |

### 3.4 Cross-Boundary Authentication (`Independent website` & `Offline reader`)

* **Independent Website (`R-11`)**: Level 1 ships with **public demonstration lessons only**, requiring zero credentials or cookies from the third-party host page. When protected embeds are required on external sites, the host exchanges a server-to-server credential for a short-lived (`≤ 15 min`) [RFC 8032 Ed25519](https://www.rfc-editor.org/info/rfc8032/) or HS256 (`≥ 256-bit` rotated secret) launch token carrying mandatory `aud` (exact host origin), `exp`, `jti` (checked against a server-side replay cache), `lesson_id`, and `course_version_id` claims.
* **Cryptographically Signed Offline Packs (`R-08` / `C-7`)**: Downloaded ZIP packs require zero login to open locally, while the Offline Reader PWA verifies an **Ed25519 signature** over the canonical `manifest.json` using a public key pinned in the PWA bundle before rendering any pack HTML. This upgrades SHA-256 integrity into cryptographic authenticity without adding any user-facing login barrier.

## 4. Pillar 2: User-Friendly & Attack-Resilient Session Management

Our session architecture protects assistive-technology users from premature timeouts ([WCAG 2.2 SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/enough-time.html), [SC 2.2.5](https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html), [SC 2.2.6](https://www.w3.org/WAI/WCAG22/Understanding/timeouts.html), [SC 3.3.7](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html)) while neutralizing indefinite session theft (`R-03`), pre-signed URL leakage (`R-02`), and progress-replay completion fraud (`R-07`).

### 4.1 Server-Arbitrated Silent Refresh, 12-Hour Session Cap, & Token Rotation (`R-03` / `C-4`)

* **Server-Observed Refresh Arbitration (No Client "Heartbeat" Trust)**:
  * In v2.0, client-side activity signals could be spoofed by a script emitting synthetic focus or playback events to keep a stolen session alive indefinitely.
  * In v3.0, only the server-side **`Savanna adapter`** may request token refresh from `REST API /api/v1`, driven by **server-observed activity** (legitimate manifest fetches, segment/chunk pre-signed URL refreshes, or progress checkpoints) combined with a **re-validation of the learner's active enrollment and course-version entitlement** on every refresh. If a learner is unenrolled, access terminates within at most one access-token TTL (`≤ 1 hour`).
* **12-Hour Absolute Session Ceiling with Accessible Warning**:
  * Access tokens expire in `≤ 1 hour` and are silently rotated during active study up to an **absolute session ceiling of 12 hours** (covering a full study or editorial workday).
  * **Refresh-Token Rotation & Reuse Detection**: Every refresh issues a new refresh token and invalidates the prior one. If a rotated refresh token is ever presented a second time (indicating token theft), the server immediately revokes the entire refresh-token family and logs a high-priority security alert.
  * **Accessible Idle & Cap Warning ([WCAG 2.2 SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/enough-time.html) & [SC 2.2.6](https://www.w3.org/WAI/WCAG22/Understanding/timeouts.html))**: At least **2 minutes** before an idle timeout expires, the player displays an accessible modal (`role="alertdialog"`, `aria-modal="true"`) announced via an assertive ARIA live region, allowing the learner to extend the idle window by `10×` (up to the 12-hour cap) with a single `Space` or `Enter` keypress and restoring focus cleanly without colliding with Savanna's **Ask LEA** support drawer at 200% zoom.
* **Authoritative Server-Side Logout & Revocation**:
  * Logging out of Savanna or the `Accessible staff console`, changing a passphrase, or updating an email address immediately revokes all active server sessions and refresh-token families in the database and returns `Clear-Site-Data: "cookies", "storage"` on the staff console logout response.

### 4.2 Pre-Signed Asset URL Hygiene & Stall-Free Low-Bandwidth Streaming (`R-02`)

* **Short-Lived Capability URLs (`≤ 300 s` Stream / `≤ 60 s` Refresh)**:
  * Because pre-signed object-storage URLs act as bearer capabilities, `Authorized asset URLs` are issued with a maximum TTL of **300 seconds** for media streaming/downloads and **60 seconds** for manifest refresh hops.
  * To prevent stream stalls on 400 kbps Android connections when a learner pauses or seeks within a 10-minute lesson, the `Savanna adapter` transparently refreshes the pre-signed media URL prior to expiry whenever playback resumes.
* **Anti-Leak Headers on All Asset Hops**:
  * All asset and manifest responses carry `Cache-Control: private, no-store` and `Referrer-Policy: no-referrer` so pre-signed URLs are never cached by shared proxy servers or leaked in HTTP `Referer` headers to third-party links.

### 4.3 Asset-Attested Progress Replay & Zero Data Loss (`R-07` / `C-6`)

* **Preserving Data Across Drops ([WCAG 2.2 SC 2.2.5](https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html) & [SC 3.3.7](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html))**:
  * In the `Accessible staff console`, caption edits, Amharic translations, and Braille review notes auto-save every 15 seconds (protected by CSRF tokens) so zero work is lost across session expiry.
  * In the `Accessible lesson Web Component`, progress events during a 400 kbps network drop or session timeout are queued locally in a buffer keyed by `(learner_session_hash, lesson_id, course_version_id)` so one learner's queued events can never be replayed under a different account on a shared device.
* **Server-Side Plausibility & Completion Attestation (`R-07`)**:
  * To prevent a tampered client from replaying fabricated "100% complete" events to obtain an official ALX certificate, the `Savanna adapter` and `REST API /api/v1` treat client progress events as **advisory until attested**:
    1. Replayed events must have monotonically increasing timestamps and plausible elapsed duration relative to the lesson's media duration and maximum supported playback rate (`≤ 2.0×`).
    2. The server verifies that the learner's session actually requested and received the corresponding `Authorized asset URLs` (recorded at pre-signed URL issuance) before accepting a lesson completion event.

## 5. Pillar 3: Privacy Controls, Biometric Governance, & Disability-Inference Protection

Because assistive format usage can implicitly reveal disability status—and because Ethiopian Sign Language (EthSL) recordings and Amharic voice audio constitute biometric-adjacent personal data under [Ethiopia's Personal Data Protection Proclamation No. 1321/2024](https://justice.gov.et/en/law/personal-data-protection-proclamation/) and GDPR Art. 9—v3.0 enforces strict anti-inference and data-lifecycle controls (`R-09`).

### 5.1 Closing Disability-Inference Side Channels (`R-09`)

* **Zero Disability Diagnoses & Strictly Client-Side Format Preferences**:
  * The platform never requests, infers, or stores medical or disability diagnoses.
  * All functional presentation preferences (caption font size/contrast presets, EthSL sign-window docking/dimensions, audio-description toggle, and UEB/Amharic `.brf` selection) are stored **exclusively in client-side `localStorage`** namespaced by `(lesson_id, course_version_id, embed_instance_id)`. They are never transmitted in analytics events or stored as per-user server profiles. If cross-device preference sync is ever requested by a user in a future release, preferences must be stored as an opaque client-encrypted blob.
* **Eliminating Screen-Reader Fingerprinting in Logs**:
  * Standard web logs record `User-Agent` and `Sec-CH-UA-*` headers that can fingerprint assistive configurations or mobile TalkBack builds. Our API and reverse proxy **scrub `User-Agent` and `Sec-CH-UA-*` headers** from application and operational logs.
  * Any product analytics must be first-party, cookieless, aggregate-only with a **k-anonymity threshold of `k ≥ 50`**, and never segmented by assistive format usage.

### 5.2 Biometric-Adjacent Media & Interpreter Consent Governance

* **Revocable Interpreter & Deaf Co-Designer Consent with 72-Hour Takedown SLA**:
  * EthSL sign-language videos capture the interpreter's face, hands, and signing style. Publishing requires explicit, hash-chained consent records from both the interpreter and the Deaf co-designer in the `Accessible staff console`.
  * We implement a dedicated reverse state transition (`published → withdrawn`) triggered via a **one-click takedown request** (requiring zero re-authentication friction for the interpreter), bound to an operational SLA of **`≤ 72 hours`** to purge the recording from the `published` bucket and invalidate all CDN/edge caches.
* **Strict Prohibition on Biometric / Facial Analysis & External AI Training**:
  * Worker and vendor policies explicitly forbid running facial recognition, identity extraction, or speaker-identification models on EthSL videos or Amharic audio.
  * We adopt **self-hosted Whisper** inside our isolated `Background workers` as the default transcription engine so raw lesson audio never leaves our host boundary. If an external cloud AI API is ever used, it must never receive EthSL video and requires a signed Data Processing Agreement (DPA) enforcing zero data retention and zero model training.

### 5.3 Accessible, Dark-Pattern-Free Consent & Data Deletion (`Proclamation No. 1321/2024` & GDPR Art. 17)

* **3-Tab-Stop Bilingual Plain-Language Switches with Audio Summaries**:
  * All privacy controls in the learner player and staff console are presented in plain-language English and Amharic accompanied by reviewed prerecorded audio summaries (with play/pause controls and no autoplay).
  * Every privacy toggle (`role="switch"`, `aria-checked`) must be reachable within **`≤ 3` `Tab` stops** from the privacy menu button, and turning any optional sharing off requires **a single activation** (`Space`/`Enter`/tap) with zero "confirm you want to opt out" guilt modals or dark patterns.
* **Accessible, Login-Free Data Deletion Flow**:
  * Users (learners, interpreters, or staff) can submit a personal data or consent deletion request via a plain-language English/Amharic form operable with NVDA and TalkBack, requiring zero CAPTCHAs or passwords (verified via a single-use magic link) and completing across database, storage, and backups within a tracked turnaround SLA.

### 5.4 Data-Retention Register & Incident-Response Pseudonym Bridge (`D-16`, `R-09`)

To balance zero-PII operational logs with the ability to investigate security incidents (such as `C-2` IDOR sweeps or `C-4` token reuse), we enforce the following retention schedule and an access-controlled **Pseudonym Bridge**:

| Data Category | Storage Location | Retention Period | Access & Disposal Policy |
| :--- | :--- | :--- | :--- |
| **Operational & Security Event Logs** (`correlation_id`, role, route, status, duration; zero PII/UA) | Centralized Log Store | **30 days** | Automatically rolled into anonymized aggregate counters after 30 days. |
| **Pseudonym Bridge Table** (`correlation_id → internal_user_id`) | Encrypted PostgreSQL Security Schema | **30 days** (hard TTL) | Restricted strictly to incident-response admin role; every `SELECT` is append-only audit-logged. |
| **Learner Progress Checkpoints** | PostgreSQL (`Prod` schema) | **Enrollment duration + 90 days** | Purged or converted to anonymized course-completion aggregates after 90 days post-enrollment. |
| **Interpreter, Co-Designer, & Support Consent Records** | PostgreSQL (Encrypted at rest, hash-chained) | **Published asset lifetime + statutory minimum** | Accessible to `Publisher` and `Audit` roles only; revocable via `published → withdrawn` (`≤ 72h` asset purge). |
| **Draft Caption & Editorial Revisions** | PostgreSQL + `draft` Bucket | **Until version superseded + 30 days** | Automatically purged 30 days after a newer revision transitions to `published`. |
| **Learner Format Preferences** (captions, EthSL dock, Braille profile) | Client `localStorage` only | **Browser-controlled** | Never stored server-side; clearable with one click in player settings. |

## 6. Hardened Controls by Subsystem & Concrete Configuration (`§9` Integration)

### 6.1 HTTP Security Header Baseline (`R-01`, `R-02`, `R-12`)

All first-party origins (`REST API /api/v1`, `Accessible staff console`, `Offline reader` PWA, and `ALX certificate verifier`) enforce the following HTTP response headers (and we recommend the same CSP/Trusted-Types baseline for Savanna host pages mounting our Web Component):

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' https://media.savanna.alxafrica.com; connect-src 'self' https://api.savanna.alxafrica.com; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'; require-trusted-types-for 'script'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()
Cache-Control: private, no-store
```
*(Note: All `Authorized asset URLs` and manifest redirect hops explicitly override `Referrer-Policy` to `no-referrer` and include `X-Robots-Tag: noindex` on verifier routes.)*

### 6.2 Storage, Database, & Export-Job Hardening (`R-02`, `R-04`, `R-15`)

* **Physically Separate Storage Buckets (`D-14`)**: Rather than relying on path prefixes inside a single bucket, `Asset storage` is provisioned as two physically separate buckets (`alx-media-draft` and `alx-media-published`), both with account-level Public Access Block enabled, AES-256 Server-Side Encryption (SSE), and object versioning active. Atomic publication verifies SHA-256 hashes of all approved derivatives before copying them to `alx-media-published` and flipping the database version pointer.
* **IDOR-Proof Export Jobs (`R-04`)**: Export jobs (`POST /v1/lessons/{id}/exports` and `GET /v1/export-jobs/{id}`) use random **UUIDv4** identifiers, verify `(job.owner_role, job.owner_id)` at the route handler, return a uniform `404 Not Found` (never `403 Forbidden`) with a bilingual plain-language message when queried by a non-owner, and return only `{ "job_id": "...", "status": "...", "correlation_id": "..." }`—never embedding draft file paths or caption text in the job status payload.
* **Database Role Separation & Provenance Constraints**:
  * Every content segment carries a non-null database enum `provenance_source IN ('ai_draft', 'human', 'human_corrected_ai')` and a `CHECK` constraint preventing any record with `provenance_source = 'ai_draft'` from entering the `approved` or `published` state.
  * `Background workers` connect using a restricted PostgreSQL role limited to:
    ```sql
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM worker_jobs;
    GRANT SELECT, UPDATE (status, updated_at, error_code) ON TABLE export_jobs TO worker_jobs;
    ```
  * Synthetic demo credentials (`DEMO — NOT AN ALX-ISSUED CREDENTIAL`) reside in a separate `demo_verifier` database schema with a startup guard that refuses to query `demo_verifier` from production Savanna routes (`R-15`).

### 6.3 Worker Container, XML/SSRF, & Supply-Chain Hardening (`R-05`, `R-14`)

* **Container Sandboxing**: `Background workers` (running Liblouis, DAISY Pipeline, `ffmpeg`, HTML-to-tagged-PDF, and Whisper) execute as a non-root UID with `read_only: true` root filesystem (mounting only an ephemeral `/tmp/job-{uuid}` scratch volume), `security_opt: ["no-new-privileges:true"]`, `cap_drop: ["ALL"]`, default `seccomp` profile, and strict CPU/memory cgroup limits.
* **SSRF & XXE Elimination (`R-05` / `C-5`)**:
  * All XML parsers in DAISY Pipeline, DOCX import, and EPUB/HTML processing explicitly disable external entities and network resolution (`resolve_entities=False`, `no_network=True`, `load_dtd=False`).
  * HTML-to-PDF rendering resolves images exclusively from the local `/tmp/job-{uuid}` verified asset bundle—never fetching remote `<img src="http...">` URLs.
  * Any `::chidi data:` `systemPrompt` or lesson metadata field containing a URL is **hard-rejected** (`422 Unprocessable Entity`) at ingest rather than silently stripped, and worker containers have zero outbound internet access except (if an external AI API is ever configured) via a dedicated egress proxy that allowlists only the vendor hostname and blocks RFC 1918, CGNAT (`100.64.0.0/10`), link-local (`169.254.0.0/16`), and cloud metadata (`169.254.169.254` with IMDSv2 `hop limit = 1`).
* **Software Supply Chain Integrity (`R-14`)**:
  * All job queue messages use strict JSON validated by Pydantic schemas (zero `pickle` or `dill` deserialization).
  * CI generates a CycloneDX SBOM on every build, runs Trivy container vulnerability scans, pins Python dependencies by SHA-256 hash (`pip --require-hashes`), pins Docker base images by immutable SHA-256 digest, and verifies SHA-256 checksums of self-hosted Whisper model weights before loading.

## 7. End-to-End Component Security & WCAG 2.2 Matrix (All 11 Diagram Nodes)

| Diagram Component | Accessible Authentication Control | User-Friendly Session Management | Privacy & Threat-Hardened Control | Governing Standards |
| :--- | :--- | :--- | :--- | :--- |
| **1. `Approved ALX source content`** | Authenticated author upload via `Accessible staff console`; CSRF + `Origin` verified. | Resumable chunked uploads so 400 kbps links never time out on master media. | Strict MIME/size allowlist; UUID storage naming; strip EXIF/GPS and caption sidecar metadata at ingest. | [OWASP Top 10:2025 A01/A05](https://top10.owasp.org/2025/en/), [WCAG 2.2 SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/enough-time.html) |
| **2. `Accessible staff console`** | WebAuthn Passkeys + OIDC (`SameSite=Lax` callback handoff → `Strict` session + CSRF token); `autocomplete` passphrase fallback; single-field OTP (`≤5` tries/code). | 15s CSRF-protected draft autosave; `alertdialog` warning 2 min before idle timeout with `10×` single-key extension; `Clear-Site-Data` on logout. | Authoritative [`nh3`](https://pypi.org/project/nh3/) ingest sanitization + DOMPurify; 3-Tab-stop bilingual + audio consent switches; chat-log PII redaction gate. | [WCAG 2.2 SC 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html), [SC 1.3.5](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html), [Failure F109](https://www.w3.org/WAI/WCAG22/Techniques/failures/F109), [W3C WebAuthn](https://www.w3.org/TR/webauthn-3/) |
| **3. `Human review` & `Publish approved version`** | Server-enforced RBAC + two-person integrity (`author_id ≠ reviewer_id ≠ publisher_id`); DB check blocks `ai_draft` self-approval. | Review states (`draft → in_review → approved → published → withdrawn`) persist across sessions; source edits atomically invalidate stale approvals. | Hash-chained consent & review audit log; one-click interpreter takedown (`published → withdrawn`, `≤ 72h` purge SLA). | [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html), [Proclamation No. 1321/2024](https://justice.gov.et/en/law/personal-data-protection-proclamation/) |
| **4. `Background workers`** | Internal Docker network; runtime secrets; narrow DB role (`UPDATE status, updated_at` on `export_jobs` only). | Async `UUIDv4` job polling (`GET /v1/export-jobs/{id}`) with uniform `404` and polite ARIA completion notice. | Non-root, read-only rootfs, `no-new-privileges`, `seccomp`; XML entities disabled (`no-XXE`); self-hosted Whisper (zero PII/video egress); JSON-only queues. | [OWASP Top 10:2025 A03/A10](https://top10.owasp.org/2025/en/), [OWASP Mobile M6](https://nhimg.org/owasp-mobile-top-10-m6-inadequate-privacy-controls-guide) |
| **5. `REST API /api/v1`** | Server-side session/token verification; zero CAPTCHAs; CGNAT-safe per-user primary rate limits (`10×` IP ceiling, throttle-not-lockout). | Access token `≤ 1h` TTL, 12h absolute cap, refresh-token rotation + reuse family revocation; re-verifies enrollment on every refresh. | [`nh3`](https://pypi.org/project/nh3/) + NFC WebVTT validation; hard-reject URLs in `systemPrompt`; gated `/docs`; scrub `User-Agent`/`sec-ch-ua`; bilingual actionable errors. | [W3C Inaccessibility of CAPTCHA](https://www.w3.org/TR/turingtest/), [WCAG 2.2 SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/enough-time.html), [W3C CSP3](https://www.w3.org/TR/CSP3/) |
| **6. `Database` (PostgreSQL)** | Encrypted at rest; runtime secret injection; least-privilege table grants per service role. | Stores auto-saved editorial drafts, refresh-token family trees, and asset-issuance records for completion attestation. | Zero disability diagnoses; 30-day access-controlled Pseudonym Bridge (`correlation_id → user_id`); physically separate `demo_verifier` schema. | [Proclamation No. 1321/2024](https://justice.gov.et/en/law/personal-data-protection-proclamation/), [OWASP Session Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) |
| **7. `Asset storage` (Object Storage)** | Physically separate `alx-media-draft` and `alx-media-published` buckets; account-level public-access block; SSE-AES256. | Pre-signed URLs (`≤ 300s` stream / `≤ 60s` refresh) refreshed pre-expiry by adapter so 400 kbps playback never stalls. | `Cache-Control: private, no-store` and `Referrer-Policy: no-referrer` on all asset hops; SHA-256 verification prior to publish pointer flip. | [OWASP Top 10:2025 A01/A04](https://top10.owasp.org/2025/en/) |
| **8. `Concept lesson page` & `Accessible lesson Web Component`** | Zero secondary login wall; allowlisted fail-closed Savanna sign-in callout; drop dead `oss.maxcdn.com` shims. | Accessible timeout modal (2-min warning, `10×` single-key extension) that reflows cleanly alongside **Ask LEA** at 200% zoom. | **Strict `textContent`-only rendering (zero `innerHTML`)**; [W3C Trusted Types](https://www.w3.org/TR/trusted-types/) compliant; format prefs kept in client `localStorage` only. | [W3C Trusted Types](https://www.w3.org/TR/trusted-types/), [WCAG 2.2 SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/enough-time.html), [SC 2.2.6](https://www.w3.org/WAI/WCAG22/Understanding/timeouts.html) |
| **9. `Savanna adapter` & `ALX identity and enrollment service`** | Validates `HttpOnly` Savanna session cookie via server-to-server introspection / LTI 1.3; enforces CSRF + `Origin`/`Sec-Fetch-Site` on minting; rejects all client identity claims. | Sole arbitrator for silent token refresh based on server-observed activity; queues/replays session-bound progress with asset-fetch attestation. | Relays only enumerated context (`course_id`, `lesson_id`, `course_version_id`, `enrollment: bool`)—never disability or accommodation flags. | [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [WCAG 2.2 SC 2.2.5](https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html) |
| **10. `Independent website` & `Offline reader / downloaded pack`** | Public demo lessons by default on Level 1 (or `aud`/`jti`/`exp` Ed25519 launch tokens); zero login required for local ZIP packs. | Multi-instance `localStorage` namespacing; PWA verifies [RFC 8032 Ed25519](https://www.rfc-editor.org/info/rfc8032/) manifest signature before rendering and falls back to last valid cache on error. | Zero PII, cookies, or tokens in packs; Ed25519 signature prevents tampered-pack XSS; offline reader cannot self-award completion. | [RFC 8032 Ed25519](https://www.rfc-editor.org/info/rfc8032/), [OWASP Mobile M6](https://nhimg.org/owasp-mobile-top-10-m6-inadequate-privacy-controls-guide) |
| **11. `ALX certificate verifier`** | Publicly verifiable by employers with zero login or CAPTCHA; accessible "Copy Verification Link" button next to QR code. | Stateless, fast verification with per-ID (`60/min`) and per-IP (`300/min`) throttling. | Constant-time, identical response shapes for `unknown` vs. `revoked`; `X-Robots-Tag: noindex`; isolated `DEMO` schema with fictional learner data. | [W3C Inaccessibility of CAPTCHA](https://www.w3.org/TR/turingtest/), [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/) |

## 8. Default Architectural Decisions for Previously Open Questions (`§10` Resolution)

While awaiting final confirmation from ALX at kick-off, v3.0 adopts the following **security-and-accessibility-preferred defaults** so engineering can proceed immediately without unsafe assumptions:

1. **`ALX identity and enrollment service` Contract (Diagram Node 9)**: Default to a **server-to-server session introspection endpoint** (or signed **LTI 1.3** launch with strict audience/timestamp/nonce validation) rather than sharing Savanna's internal Redis/database session store across trust boundaries.
2. **Deployment Topology & Cookie Scope**: Default to deploying `REST API /api/v1` and the `Savanna adapter` under a **dedicated subdomain of Savanna** (with narrow host-only cookies, avoiding broad `Domain=` wildcards) so `SameSite=Lax` delegation operates reliably on mobile Android browsers without cross-site cookie blocking.
3. **`Accessible staff console` Identity Provider**: Default to a **dedicated passkey-first ([W3C WebAuthn](https://www.w3.org/TR/webauthn-3/)) authentication service** in our FastAPI backend with optional OIDC federation to ALX staff SSO, using admin-assisted re-enrollment (never security questions) for account recovery.
4. **AI Transcription & Translation Engine**: Default to **self-hosted Whisper** running inside network-isolated `Background workers`, eliminating external biometric-adjacent audio egress, third-party data-retention risks, and cloud bandwidth overhead.
5. **`Independent website` Access Scope**: Default to shipping **public demonstration lessons only** for Level 1 embeds, activating the `aud`/`jti`/`exp` signed launch-token flow only if ALX specifies a protected external embed requirement.
6. **Recorded Session Chat Replay Ingestion**: Default to **static chat file ingestion** through the `Accessible staff console` so human reviewers must complete PII redaction and [`nh3`](https://pypi.org/project/nh3/) sanitization before any session replay bundle can transition to `approved`.
7. **Data Retention & Takedown Enforcement**: Adopt the **Data-Retention Register and 30-day Pseudonym Bridge (Section 5.4)** and the **72-hour EthSL takedown SLA (Section 5.2)** as baseline platform policy.

## 9. Complete 13-Point Security & Accessibility Verification Gate Checklist

Before any release or hackathon evaluation, the platform must pass the **Accessibility Pass/Fail Gate** (unaided task completion, zero critical/serious `axe-core` findings, and WCAG 2.2 AA conformance report) plus all 13 security-accessibility verification gates below:

1. **Unaided Authentication & Session Continuity (NVDA & TalkBack)**: Verify that screen-reader users on desktop (NVDA) and Android (TalkBack) can launch a Savanna lesson, adjust captions/EthSL window, extend an approaching session timeout with a single keypress, and resume without data loss at 200% zoom with the **Ask LEA** panel open.
2. **Passkey, OIDC Callback, & Password-Manager Login on `Accessible staff console`**: Confirm that authors, Deaf co-designers, and Braille reviewers can sign in via WebAuthn passkeys, OIDC redirect (`SameSite=Lax` handoff), or pasted password-manager credentials (`autocomplete="current-password"`) with zero CAPTCHAs or split OTP boxes.
3. **Offline Pack PII & Hash Audit**: Inspect generated ZIP packs and PWA caches on the target low-cost Android phone (400 kbps down / 150 kbps up / 400 ms latency) to confirm zero cookies, tokens, or learner identifiers are present.
4. **Course-Version & Multi-Embed Isolation Test**: Mount two instances of the `Accessible lesson Web Component` on the `Independent website` and test *Previous Course Versions* in Savanna to confirm strict style, `localStorage`, and `course_version_id` isolation.
5. **Credential & Git History Hygiene**: Confirm `.env` is ignored, run `git log --all --full-history -- '*.env' '**secret**'`, verify the frozen Rails `authenticity_token` (`concept-with-navigation.html:936`) is absent from all module code, and verify `DEMO — NOT AN ALX-ISSUED CREDENTIAL` is served from its isolated schema.
6. **Negative Access & IDOR Suite (`R-02`, `R-04`)**: Assert in CI that a `Learner`-role token receives a uniform `404` on every `alx-media-draft` path, every foreign `export-jobs/{id}` UUID, and every unenrolled lesson manifest, with zero stack traces or bucket names in error bodies.
7. **Host-Origin XSS Regression Corpus (`R-01`)**: Run an automated fixture suite of malicious caption cues, transcripts, descriptions, and chat logs (event handlers, `javascript:` URIs, mXSS payloads, malformed WebVTT blocks) under NVDA and TalkBack to confirm all render as inert text via `textContent`; enforce a CI grep check failing on any occurrence of `innerHTML`, `insertAdjacentHTML`, or `dangerouslySetInnerHTML` in the Web Component.
8. **CGNAT Rate-Limit & Accessible 429 UX Test (`R-06`)**: Trigger `429 Too Many Requests` under NVDA and TalkBack and simulate CGNAT (dozens of authenticated users sharing one IP) to confirm per-user primary bucketing prevents false neighbor lockouts, progressive throttling (never lockout) is applied, and the bilingual plain-language `Retry-After` message is announced cleanly.
9. **Session-Attack & Refresh-Reuse Suite (`R-03`)**: Verify that synthetic client-emitted activity events cannot extend a session without server-observed asset/API requests, that sessions terminate at the 12-hour cap, that replaying a rotated refresh token immediately revokes the entire token family, and that logout invalidates tokens server-side.
10. **Offline Pack Ed25519 Authenticity Test (`R-08`)**: Modify a single byte of HTML inside a downloaded offline pack and recompute its SHA-256 hash; verify that the Offline Reader PWA rejects the pack due to [RFC 8032 Ed25519](https://www.rfc-editor.org/info/rfc8032/) signature mismatch before rendering any HTML, preserves the last valid cached version, and announces a one-click re-download option via `aria-live="polite"`.
11. **Worker SSRF & XXE Containment Test (`R-05`)**: Submit lesson documents containing external XML entities (`<!ENTITY xxe SYSTEM "http://169.254.169.254/...">`), remote PDF `<img src>` tags, and URLs inside `::chidi data:` `systemPrompt` payloads; confirm ingest rejects URL-bearing prompts (`422`) and worker containers make zero outbound network connections.
12. **Privacy Telemetry & Deletion Audit (`R-09`)**: Inspect operational logs to confirm zero `User-Agent`, `Sec-CH-UA-*`, format-preference values, or learner PII are recorded; verify that submitting the bilingual login-free data-deletion form purges target records across DB, storage, and caches and that `published → withdrawn` purges EthSL recordings within the SLA.
13. **Two-Person Integrity & AI Provenance Gate Test (`C-1`, `R-14`)**: Attempt `Author`-self-review, `Reviewer`-self-publish, and direct approval of an `ai_draft` segment via `REST API /api/v1`; verify all three are rejected at the handler/database level and recorded in the security event stream.