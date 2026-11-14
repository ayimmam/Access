# Security, privacy and accessible session architecture

Updated 14 November 2026. Implemented local demonstration controls live in `access_api/security.py`, `security_store.py`, `body_limit.py` and the first-party privacy console. This document reconciles the earlier security proposals for the current demo and records production integration work separately. Anteneh owns product/deployment, Biniyam the shared service/data contract, and Hailemichael security review.

## Trust boundaries and identity

The independent lesson and career components continue to retrieve public fixtures with credentials omitted. A first-party `/demo/privacy` console uses an independently configured fictional account to exercise security and privacy features. The server establishes its fixed learner role. The browser supplies a credential proof and a CSRF value for mutations. Account/session ownership comes from server records.

```text
Learner's browser
  public lesson/career component -> public fixture endpoints
  first-party privacy console -> Origin + CSRF + session checks
                                  |
                        session/ownership/recent-auth policy
                                  |
                  local SQLite store + runtime encryption key

Production partner -> supported identity/enrollment adapter -> shared policy
```

ALX and Ethioware production identity, enrollment and script/CSP contracts remain pending. A production adapter must validate the provider's identity server-side and call the same policy boundary. Protected LMS embedding will need an approved launch-token or server-mediated exchange, including scope, audience and replay policy. The implemented session cookie belongs to the privacy service's first-party origin. The public component keeps its existing configuration/events.

SQLite provides durable transactional demo state on one host. A 3,000-concurrent deployment needs shared PostgreSQL/session state and distributed throttling, with measured load and failover behavior. Follow the [judging capacity plan](../planning/JUDGING_PIVOT_PLAN.md).

## OWASP mappings

The request's A04 Insecure Design reference uses OWASP 2021 numbering. Current OWASP 2025 places Insecure Design at A06 and Cryptographic Failures at A04. A08 covers software/data integrity. Rate limiting belongs directly to API4:2023 resource consumption and also supports secure design and authentication. [OWASP 2021 A04](https://owasp.org/Top10/2021/A04_2021-Insecure_Design/), [OWASP 2025](https://owasp.org/Top10/2025/), [API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/).

| OWASP 2021 | OWASP 2025 | Current control and verification | Remaining boundary |
| --- | --- | --- | --- |
| A01 Access control | A01 Access control | Every private route checks an active session. Mutations validate CSRF and Origin. Foreign session IDs return 404. Revocation/deletion recheck ownership transactionally. | Partner enrollment, staff role/assignment policy and protected media authorization |
| A02 Cryptography | A04 Cryptography | Secure/HttpOnly/SameSite cookie, TLS enforcement for configured HTTPS origin, scrypt password hashes, hashed opaque sessions, encrypted saved preferences | Managed key custody, volume/backups encryption, migration and rotation procedures |
| A03 Injection | A05 Injection | Parameterized SQLite, strict bounded Pydantic fields, text-only DOM rendering, CSP on privacy surfaces | Rich-content ingestion and isolated renderer review |
| A04 Insecure design | A06 Insecure design | Explicit trust boundaries, bounded sessions, recent authentication for export/revocation/deletion, minimization, consent choice and recovery tests | External identity and production abuse/failover threat review |
| A05 Misconfiguration | A02 Misconfiguration | Exact configured security origin/Host, HTTPS requirement, first-party credential routes, no-store, framing restriction, body limits and safe errors | Reverse-proxy trust, deployed headers and resource limits |
| A06 Components | A03 Supply chain | Lockfiles and integrity digests for entry scripts, existing CI/human review, `cryptography` dependency with registry hashes | Continuous vulnerability scanning, full artifact provenance and immutable chunk release |
| A07 Authentication | A07 Authentication | Uniform login errors, password-manager/paste support, bounded password work, rotation, expiry and replayed-cookie rejection | Partner IdP, production recovery/MFA and credential-change revocation integration |
| A08 Integrity | A08 Integrity | Fernet authentication detects modified saved values. Human content approvals and source hashes remain the publishing contract. | Signed offline packs and production publication workflow |
| A09 Logging | A09 Logging/alerting | Structured security events use correlation, role, route template, status and duration. Tests check omission of credentials. | Central collection, retention enforcement and abuse alerts |
| A10 SSRF | Access-control/design coverage | Local security routes perform local record operations. Existing source-fetch allowlist/worker boundaries remain required. | Production fetch/redirect/DNS and converter egress tests |
| Exceptional-condition coverage | A10 Exceptional conditions | Safe request errors, bounded bodies, atomic writes, busy-sign-in response and client recovery | Storage outage, capacity and disaster-recovery exercises |

These mappings describe implemented controls and remaining tests. A Top 10 mapping is an awareness and design tool. The automated tests and human review provide the release evidence.

## Session and credential lifecycle

- Setup prompts for a fictional alias and a 15–256 character passphrase using hidden terminal input. The database stores a keyed alias lookup and a randomly assigned account reference. Passphrases use a random salt and scrypt with N=131072, r=8 and p=1. Each service process allows one memory-intensive password operation at a time and returns 429 with a short retry if busy.
- Successful login creates a 256-bit random opaque value. Its SHA-256 hash is stored server-side. The raw value is carried in `__Host-access_session` with Secure, HttpOnly, SameSite=Lax, path `/` and host-only scope. JavaScript receives a CSRF value and session timing metadata. Session credentials stay in the cookie.
- The demo defaults to 30 minutes of inactivity allowance and a 12-hour absolute cap. A session-status GET leaves the deadline unchanged. The learner explicitly extends the session within the cap. The console provides a two-minute warning without moving focus or announcing every tick. At the absolute cap, sign-in starts a new session.
- Reauthentication confirms the same account's passphrase, atomically replaces the cookie token and CSRF value, and preserves the absolute cap. Old cookie replay fails immediately. Export, individual/all-session revocation and account deletion require authentication within the last five minutes.
- Logout deletes the active session. Revoke-all and account deletion invalidate every session belonging to that account. Session listing uses opaque display references and start/expiry times. Each account has at most ten active sessions. The oldest is revoked as a new session exceeds that limit.
- Expiry hides the private controls and offers sign-in. Unsaved choices remain in page memory for the same account. Explicit sign-out clears the console's retained controls. Signing in to a different account loads that account's choices.

The current cookie serves the first-party privacy demonstration. Browser refresh-token storage is unnecessary for this flow. Future credential changes and IdP events must revoke the corresponding service sessions. Key loss invalidates the ability to access the demo records. Existing data requires a controlled migration when changing the key because it also derives alias lookups and CSRF/device references. [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

## Request, abuse and logging controls

State-changing requests require the exact configured Origin, a same-session CSRF value and an active account. Cross-site Fetch Metadata is rejected. The security routes require the configured Host and HTTPS when the configured origin uses HTTPS. Local development accepts a loopback HTTP origin while preserving the Secure cookie flag. Test target browsers explicitly, since local secure-cookie handling varies.

Security request bodies are capped at 4 KiB before JSON parsing, including chunked bodies. Fields have maximum lengths and allowlists. SQLite parameters carry user values. Privacy controls and errors use text DOM APIs.

Login is limited to five attempts per alias per minute, plus a broader 100/minute network ceiling. Reauthentication has five attempts per account per minute. Authenticated private API calls have 120/account/minute. The limiter uses transactional SQLite counters, keyed identifiers and expiry cleanup. It returns `Retry-After` and a plain recovery message. A full counter store also fails safely. Permanent lockouts and challenge puzzles are absent from this flow.

These are single-host demo values. Test classroom/shared-carrier behavior before production and agree edge-level volumetric controls, shared limits and throughput with ALX. Public media and export endpoints still need CDN/resource controls from the capacity plan. API throttling does not replace DDoS protection.

The privacy routes use no-store, framing restrictions, a restrictive CSP and permission restrictions. HTTPS responses add HSTS. Public integration routes retain their cross-origin delivery requirements. Security logs contain timestamp, generated correlation ID, role, route template, status and duration. Run the privacy demo with `--no-access-log` to avoid raw URL/query logging. Production logging must use the same minimization and enforce retention/alert policies. The current application does not provide a deployed alerting service.

## Data minimization and encryption

| Data | Purpose | Storage and deletion |
| --- | --- | --- |
| Keyed alias lookup, random account reference, salt/hash | Find and verify a fictional account | Local database, removed on account deletion |
| Hashed session reference, owner and times | Authorize, list and revoke sessions | Local database, removed at logout/revocation/deletion or session cleanup |
| Optional language/caption-size choice | Demonstrate a user-controlled preference | Fernet authenticated encryption, default empty, opt-out removes saved values |
| Keyed rate counters | Throttle abuse | Counters expire from the active window during checks, independent of account deletion |
| Minimal security events | Diagnose failed requests and review controls | Process logs, operator retention policy required |
| Search/support filters and unsaved form choices | Current page interaction | Browser memory for that page session |

The privacy console explains stored fields and offers an authenticated JSON export. The preference checkbox starts unchecked for a new account. Clearing it replaces saved preferences with an empty encrypted object. Deletion removes the live account record and cascades session deletion. SQLite secure-delete is enabled. Operator backups and log copies require their own expiry/deletion policy.

Fernet supplies authenticated encryption through the locked `cryptography` library. Default local key/database files live under ignored `artifacts/security/`, with restrictive file permissions where the OS supports them. For deployment, inject keys separately through the platform's secret configuration and use encrypted storage/backups. The encrypted preference field and password/session hashes protect different data. Whole-database encryption and managed KMS remain deployment tasks. [OWASP cryptographic storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html), [Fernet](https://cryptography.io/en/latest/fernet/).

The lockfile selects `cryptography` 50.0.2 with its registry hashes. Its installed metadata declares Apache-2.0 OR BSD-3-Clause. The dependency review checked upstream advisories and the stable changelog, including bundled OpenSSL fixes. Continuous vulnerability scanning remains release infrastructure work. [Upstream advisory](https://github.com/pyca/cryptography/security/advisories/GHSA-537c-gmf6-5ccf), [stable release history](https://cryptography.io/en/latest/changelog/).

## Accessible reauthentication and privacy controls

The console provides native labelled fields, autocomplete hints, paste/password-manager support and show-passphrase controls. Recent-auth prompts use a native dialog, initial focus, Escape/cancel and trigger-focus return. Failed confirmation associates its message with the passphrase field. Expiry recovery preserves current page choices for the same account, and network/rate-limit errors offer a retry without resetting input. Deletion has a review dialog with Keep account focused first.

Validate the complete process with keyboard, NVDA and TalkBack, including the provider page links to this console. Amharic text rendering in lesson materials and the Amharic preference option are separate from translation of this English security console, which remains localization work. [WCAG accessible authentication](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html).

## Run and review

```sh
uv sync --locked --python 3.11
uv run python scripts/setup_security_demo.py
uv run uvicorn access_api.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Open `http://127.0.0.1:8000/demo/privacy`. Restart the API after initial account setup. For a second fictional account, rerun the setup script with a different alias. The script prompts for the credential and preserves existing records. It never prints credential/key values.

Optional configuration variables are `ACCESS_SECURITY_ORIGIN`, `ACCESS_SECURITY_DB`, `ACCESS_SECURITY_KEY_FILE` and `ACCESS_SECURITY_KEY`. Leave unused options unset. The default origin is exactly `http://127.0.0.1:8000`. For hosting, configure the real HTTPS origin, trusted proxy behavior and runtime secret, then verify deployment headers and cookies. Invalid key configuration fails startup. Account routes return an actionable setup-required response until configured.

Hailemichael reviews the new security boundary and negative cases before merge. Biniyam reviews schema, storage and migration changes. Anteneh verifies user flow, privacy wording and deployment configuration. Use the [co-designer testing guide](../testing/CO_DESIGN_SECURITY_TESTING.md) to record human evidence alongside the automated checks.

## Verification record

Local verification on 14 November 2026 passed the build/typecheck, 29 API tests, 25 Chromium browser tests, repository links, security baseline and whitespace checks. API checks exercise ownership, cookie flags, expiry, CSRF/origin rejection, revocation, account deletion, encrypted preferences, bounded bodies, concurrent throttling and redacted logs. Browser checks cover real Secure-cookie login, privacy choices/export, reauthentication focus/cancellation/rotation, retained choices after expiry, warning/extension and deletion review, plus the existing learning/provider/career journeys. Facilitator setup and scenario CLIs were exercised against temporary fictional records.

NVDA, TalkBack, co-designer tasks, deployed TLS/proxy behavior and production capacity remain pending. The current privacy console uses English interface text. Review the automated results together with these human and deployment checks.
