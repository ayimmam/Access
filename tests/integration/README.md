# Integration tests

Playwright journeys cover independent component instances, failure/retry, context changes, lifecycle cleanup, the Savanna-style media page, the installer on a second origin, career and certificate flows, privacy/session recovery, local avatar review and automated axe scans.

Run them from the repository root with `npm run test:browser`. These browser checks do not replace NVDA, TalkBack, co-design or complete-process testing.

Prebuild with `npm run build` and `uv run python -m access_core.exports` first. Servers are not silently reused: choose an unused `ACCESS_TEST_API_PORT`, or explicitly set `ACCESS_TEST_REUSE_SERVER=1` only when the source/artifacts match. Static tests also accept `ACCESS_TEST_ETHIOWARE_PORT` and `ACCESS_TEST_CAREER_PORT`. `ACCESS_TEST_CHROMIUM=/usr/bin/chromium` uses an installed browser without downloading one. The runner uses the existing environment without syncing dependencies.

`accessibility-fixes.spec.ts` covers edition timelines, language/gaps/track failures, native presentation, independent download failures, opt-in instance storage, rapid dialog focus, hidden/unmounted audio, zero-PII sharing and an extracted desktop offline pack. Calibration mocks in `savanna-media.spec.ts` never represent real content approval. Fullscreen/mobile AT and Android airplane-mode tasks remain human checks.
