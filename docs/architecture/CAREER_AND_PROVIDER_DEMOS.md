# Career gateway and second-provider demonstrations

Updated 14 November 2026. These are public-fixture demonstrations, not production integrations or accessibility conformance claims. Run the [root setup](../../README.md), including `npm run build`, then open the routes below on `http://127.0.0.1:8000`.

## Afriwork-inspired career gateway

Open `/demo/careers`. The supplied `docs/afriwork job page.pdf` informed the purple announcement strip, white navigation, job list, tags, job facts and filter sidebar. Vacancy content is newly authored and fictional. No real application destinations or employer contact details were copied. The original PDF stays unchanged and is not a runtime dependency.

The host mounts `<access-career-gateway api-base="/api/v1">`. Its versioned bundle is `/components/0.1.0/jobs.js`, with the build-generated digest in `/components/0.1.0/integrity.json`. The Shadow DOM component owns the search/filter/card/detail experience. Another host can supply an absolute API base and load the same bundle with the recorded SRI and `crossorigin="anonymous"`. API CORS requires the exact host origin. Production releases must freeze entry scripts and imported chunks.

Implemented behavior:

- Four fictional vacancies from `GET /api/v1/jobs`, documented in OpenAPI.
- Search by title, employer, skill or summary. OR within job-type/workplace selections, AND across filter categories and selected support offers.
- Filters run locally after the fixture fetch. Support preferences, saved jobs and search text are not sent to the API or persisted to browser storage.
- Save jobs for this component's lifetime. All/saved views, clear filters, empty results and live result counts.
- Native controls, visible focus, responsive layout, semantic job facts, labelled details dialog, Escape to close and focus return.
- Gregorian/Ethiopian deadline formatting through the browser's internationalization support, with a Gregorian fallback on errors. Actual target-device calendar output still needs verification.
- Read-aloud of the exact visible title/employer/summary using an installed local English speech voice. No remote voice is selected and speech starts only after a click. Stop, completion and failure states are present. This is a demo convenience; recorded/downloadable audio and voice availability on target devices remain pending.
- Details show responsibilities, support offered, application-preparation instructions and a fictional certificate verification link. There is no application submission, CV upload, real enrollment or applicant database.
- A job's structured-data link returns `schema.org/JobPosting` fields matching the same fixture. The pages are `noindex`; this demonstrates an API mapping and does not claim search-engine indexing, LTI or Open Badges compliance.

The component emits `access-job-open` with `{ jobId, demo: true }` when details are opened. It does not send learner identifiers, support filters or progress. No publisher/admin APIs are exposed. Actual employer accommodation claims will need source provenance and review before any real deployment.

## Fictional verification

Open `/demo/certificates/DEMO-LEARNING-001`, `/demo/certificates/DEMO-REVOKED-001` or `/demo/certificates/unknown`.

The page calls `GET /api/v1/demo-certificates/{identifier}`. The server determines the status from fixed fictional records. Query parameters cannot change it. Only status, course name and issue date are returned, with `Cache-Control: no-store`. The page explicitly says `DEMO — NOT AN ALX-ISSUED CREDENTIAL`. This does not issue certificates or authenticate real achievements. For actual learners, retain approved links to their issuer's verification service.

## Ethioware-style provider host

Open `/demo/ethioware`. The public [Ethioware Software Engineering Basics course](https://ethioware.jiret.site/course/a7ae0c9b-d104-459d-a67a-a7580d833b0e) was inspected on 14 November 2026. It showed a course title, course/media column, about/requirements sections, expandable module and a course-information sidebar. Its colors and layout informed the local example. No authenticated lesson, learner records, course video or credentials were obtained.

The local page uses the existing `alx-accessible-lesson` element and the same `/components/0.1.0/lesson.js` and API as Savanna. Choose the synthetic text lesson or supplied ALX video, search, resize text, download, and hide/show the tools. The page explicitly distinguishes Access fixtures from provider course content. Its host navigation links to Savanna, the career gateway and installer demo.

The automated browser journey verifies the reusable code path in this second provider-style shell. It does not establish a live Ethioware install. A live integration requires the site's owner/admin, supported mount location, CSP/CORS approval, immutable HTTPS release, lesson mapping and any production access contract. Do not paste browser secrets or captured cookies into the component.

## Evidence and remaining work

This change adds API tests for fictional records, matching JobPosting fields, unknown IDs, forged certificate query parameters and host routes. It adds browser tests for local filtering, saved jobs, dialog focus/keyboard, axe scans, narrow layout, certificate states and the second-provider host. The installer suite tests a real second local origin on port 5173 with normal browser CORS/SRI.

Verification on 14 November 2026: build/typecheck, 18 API tests, repository links, security baseline and diff whitespace checks passed. After approval capacity became available, `CI=true UV_CACHE_DIR=/private/tmp/access-uv-cache npm run test:browser` passed all **22 tests** in Chromium (11.4 seconds). This includes the real second-origin installation with CORS/SRI, local career filtering/saved jobs/dialog focus, certificate states, the Ethioware host, automated axe scans and 320-pixel reflow checks. The cross-origin test uses a real second HTTP server because an intercepted host triggered Chromium's address-space protection. No browser protection was disabled to resolve that failure.

These are local automated results, not GitHub CI results, manual screen-reader evidence, full WCAG conformance or a 3,000-concurrent capacity test. Recorded audio, real-device speech/calendar checks and the human accessibility gate remain pending.

Before judging, test real NVDA/TalkBack, the complete keyboard journey and 200%/400% zoom, and complete the co-designer tasks without assistance. Rerun the automated suite after substantive changes. Confirm local voice behavior or replace it with reviewed recorded audio, validate Ethiopian calendar dates, and record meaningful failure/retry evidence. The full [pivot plan](../planning/JUDGING_PIVOT_PLAN.md) still governs remaining mandatory media, production protection, deployment and capacity work.
