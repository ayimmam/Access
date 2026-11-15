# Security tests

Executable API security tests are colocated with the service in `services/api/tests/test_security.py`, with browser recovery journeys in `tests/integration/privacy.spec.ts`. They cover the isolated demo's cookies, headers, origin/CSRF checks, body limits, encrypted preferences, expiry, reauthentication, session revocation, throttling, account deletion and safe logging.

Production authorization, worker egress/SSRF controls and signed offline-pack verification remain pending because their production services and contracts are not implemented. Follow [`.agents/rules/security.md`](../../.agents/rules/security.md) and the security documentation for the required negative cases.
