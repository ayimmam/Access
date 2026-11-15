# Accessibility critique: code remediation and verification

Updated 16 November 2026, Africa/Addis_Ababa. This records local code changes against the supplied A01–A22 critique, not a hackathon gate pass, deployment record or conformance certificate. Human review is required before merge.

## Source and artifact scope

Implementation is isolated on `fix/accessibility-critique` in `/tmp/access-accessibility-fixes`, based on `origin/main` at `48e2b3535c64172b2848bd90dff825e4604aee10`. That baseline is newer than the critique's `30ebada` and was confirmed against the remote before publication. The original `feat/ethsl-hands-preview-reviewed-playback` checkout contains unrelated work and remains unchanged. The user subsequently authorized committing and pushing the remediation branch; this does not authorize merging, deployment or paid provisioning. Human review remains required.

The verification snapshot was taken before committing. Its locally built component release is `1b73acf0ca6bab7b88e071c97cc45ff50c9030d80cbe6a97c2b6da486ba5a13f`, with `working_tree_dirty: true` and the base revision above. The revision identifies the base, not the complete modified source; committing does not change this frozen artifact's provenance. Build from the final reviewed commit in a clean release directory before recording a reproducible release. No submitted live URL has been checked against these bytes.

| Current frozen artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `lesson.js` | 33,704 | `49f701e3bbf844edd20a8ce1f32f2f9de3875bfdc9fce984b70863477eddabc8` |
| `jobs.js` | 53,654 | `4d1749eea667e85ff651952416179061a2e3b06b7c7c432caac0c0458dec586e` |
| `avatar-review.js` | 7,051 | `af3f72e1f284c3de213ff4c48d0d7214b290f18d12fd46881ab69134af3f339e` |
| Optional `timing-avatar-VF5HW4R6.js` | 608,412 | `0c56ccc3094843956e2c2e00a38832d974e702eadff4c83f7bbd4a3d9186cfd3` |

The release writer copies only current esbuild outputs, retains older release directories, checks frozen bytes/metadata and records entry-point SRI. API metadata exposes safe provenance; discovery from the same server is not independent trust. Old pinned installs survive a local rebuild, but clean Docker replacement still requires owner-managed retention of past directories. See [the content/release runbook](../setup/CONTENT_PUBLICATION.md).

Use the critique's inspected physical slide numbering: mandatory Track 2 on 10, portability on 12, co-design on 13, gate on 14, scoring on 15 and stated submission schedule on 16. BRF and recorded-session replay are extra credit. This correction supersedes earlier one-position-lower references in [the judging plan](../planning/JUDGING_PIVOT_PLAN.md); it does not establish a current deadline extension. The implementation plan's security reconciliation remains applicable: public fixtures are legitimate, production ALX identity is unconfirmed and proposed architecture is not an implemented control.

## Findings addressed

“Code repaired” means the stated implementation behavior has local regression coverage, not that a whole criterion, mandatory format or deployed process has passed.

| Critique IDs | Local change | Remaining requirement |
| --- | --- | --- |
| A01, A08 | Whole-lesson and segment sign media share exact-source/render/consent/Deaf/interpreter approval. Present-but-pending files, altered bytes and withdrawn caption approval cannot publish sign assets. Frontend also requires reviewed status; research controls are opt-in. | Obtain actual fluent, consented EthSL and Deaf/interpreter comprehension, synchronization and phone-size review. No interpretation is invented. |
| A02 | Learner manifests, caption routes, transcript, ZIP and MP4 exclude unapproved captions. Per-language/edition approvals bind exact video, source text, file and content/course revision. Explicit pending/stale English records override the pinned W3C source-reviewed default. | Repair and human-review the ALX transcript and mandatory Amharic; provide actual approval references privately. |
| A03, A14 | [The conformance record](../WCAG_CONFORMANCE.md) registers all 55 current A/AA criteria conservatively as not tested; [the anonymous task template](../../tests/accessibility/TASK_RECORD_TEMPLATE.md) captures assistance, outcomes, decisions and retests. CI config restores real repository/security/build/type/API/browser jobs and a fail-closed aggregate gate. | Participant/AT evidence, exact deployed axe results, GitHub billing/protection enforcement and human PR review. The restored workflow has not run remotely. |
| A04, A13 | Content-hashed component releases, retained chunks, concrete SRI, byte/hash inventory and safe source/dirty metadata replace production-style mutable pins in installers/hosts. Regression retains an old release after a new build and rejects tampering; stale build chunks are excluded. | Authorized release coordination, verified same bytes across all live hosts, retention across deployment and the clean external one-hour stranger install. |
| A05 | Reviewed semantic document imports provide escaped headings/text/image descriptions. PDF/BRF require exact approved imports; unvalidated prototypes remain intact but are not served. | Author equivalent descriptive content and validate the actual PDF, tags, order, fonts, language and AT reading against its hash. |
| A06 | Edition changes replace transcript/search jumps and duration together. Described “Good design” seeks to 31.32, not standard 20.92; a later 74.1-second passage is not clamped to the 63.755556-second standard duration. Sign playback closes before changing editions. | Complete meaning/synchronization review with intended users. |
| A07 | Caption regions expose selected language; loading/errors have separate polite status, gaps remain blank and no English segment silently fills another language or edition. Reviewed described captions can work even when standard English is unpublished. | Actual EN/AM/TI pronunciation/content review with supported AT. AM/TI test approvals are test-only, not fixture approvals. |
| A09 | Prebuilt ZIP landing page has local standard/described audio controls and links, file inventory, sizes, review/version notices, both spoken transcripts and extraction/retry instructions. Text-only packs are labeled honestly. | Unaided download/extract/disconnect/reopen on low-cost Android and interrupted-download recovery. Hosted offline-library application remains a placeholder. |
| A10 | Requests read prebuilt export metadata/files, never regenerate ZIP/PDF. Missing formats produce a partial list; stale/tampered artifacts fail closed. Core content loads separately from downloads, with 15-second abortable requests and a downloads-only retry that preserves search/playback. Direct media sizes are exposed. | Cold-install/container validation and a measured, owner-approved workload; no throughput or cost claim is made. |
| A11 | Selectable native on-video captions, truthful selector synchronization and no duplicate inline captions. Native choices are not forced back to hidden and remembered settings update only with consent. | Actual native fullscreen/mobile/AT tests, especially the intended Android browser. |
| A12 | Dialog stores job identity rather than a detached button; pending search is canceled, filtering completes on close and focus returns to a live matching button or the results heading. | Full keyboard/AT task retest; local rapid and settled cases pass. |
| A15, A17 | Savanna, installer and Ethioware lead with the same W3C practice fixture and honest capability labels. Catalog titles are headings, shared practice is explained, unconfirmed duration units are identified rather than invented, and reviewer tools leave the learner default. | Agree the primary judge URL and complete reviewed lesson; cognitive/low-literacy and large-text testing. Original ALX baseline is retained and labeled as different content. |
| A16 | Preferences stay instance-local unless the learner opts in on a host-provided `instance-id`. Persisted keys include API, lesson, version and instance; scoped reset and blocked-storage recovery are tested. | Product/security review of host identity conventions and shared-device retention wording. No preferences are sent to analytics. |
| A18, A20 | Gregorian calendar label, explicit prerecorded synthetic audio, lifecycle stop/dispose on hide/remove/reconfigure, media-error status, video retry, media sizes and copyable canonical fictional certificate links with manual-copy/retry fallback. | Actual audio/AT/200% zoom recovery; approved issuer contract before real credential use. |
| A19 | Manual review/publish/rebuild/rollback and retention procedure, prebuilt delivery and explicit budget/ownership boundaries. | Measure CPU, latency, egress and reviewer effort; teammate exercise and owner-approved hosting/operating envelope. Staff publishing remains a placeholder. |
| A21, A22 | Unreviewed BRF no longer appears in learner exports; existing BRF and fictional replay prototypes are preserved, not promoted. | Optional verified Braille translation/device testing and actual recorded-session time binding remain deferred until mandatory paths/gate evidence are ready. |

## Local verification

Environment: Node `24.18.0`, npm `11.16.0`, Python `3.11.15`, uv `0.13.8`, installed Chromium `150.0.7871.181`, Playwright `1.65.0`, axe-core `4.14.0`. Existing dependency environments are reused; original media/Savanna captures and lockfiles are unchanged. A test runner initially repointed the shared editable Python project; it was restored offline to the original checkout, with no dependency-version changes. Final isolated tests explicitly use task-source `PYTHONPATH`.

| Check | Result | Scope |
| --- | --- | --- |
| `npm run build` | Passed, including TypeScript typecheck | Current component and frozen output inventory; no separate configured lint/formatter |
| Publication and sign/release regressions | 34 passed | Exact approvals, source/file revocation, partial exports, semantic escaping and retained releases |
| Full backend suite | 98 passed; one existing Starlette/httpx deprecation warning | Local API/security/media contracts; not production authorization |
| Focused accessibility browser suite | 12 passed | Edition mapping, language/gaps/native captions, persistence, focus, media cleanup, offline opening and certificate recovery |
| Full integration browser suite | 56 passed | Local complete test inventory, including existing axe/keyboard/privacy/voice/avatar assertions |
| Independent static-host browser suite | 13 passed | Local fixture servers with real cross-origin loading; not live Vercel |
| FFmpeg publication build and `ffprobe` | Passed | Both W3C editions contain English `mov_text` subtitles only; pending translations excluded |
| Actual offline ZIP | 963,393 bytes; all six manifest-listed sizes/SHA-256 hashes match | Extracted index opens and local audio plays with Chromium network disabled; not Android or participant evidence |
| Component release inventory | All four current entry/chunk sizes and SHA-256 hashes match | Frozen files; old-release retention regression also passes |
| CI YAML and syntax | Passed | Parsed jobs, read-only permissions, SHA-pinned actions and aggregate needs; Python compilation and changed JavaScript syntax checks |
| Repository links/JSON/security/diff review | Passed; 236 repository files checked | Includes new/untracked deliverables; not a penetration test or dependency scan |
| Docker clean install and remote workflow | Not run | Existing images/dependencies and billing/provider configuration not changed |
| Live deployments, human AT/media/PDF/Braille/co-design gate | Not run | Remain pending; no inference from green automation |

Final commands run from the isolated worktree with existing dependencies:

```sh
npm run build
PYTHONPATH=services/core/src:services/api/src:services/worker/src .venv/bin/python -m access_core.exports
PYTHONPATH=services/core/src:services/api/src:services/worker/src .venv/bin/python -m access_core.offline_video
PYTHONPATH=services/core/src:services/api/src:services/worker/src .venv/bin/python -m pytest -q -o faulthandler_timeout=30
PYTHONPATH=services/core/src:services/api/src:services/worker/src UV_CACHE_DIR=/tmp/access-uv-cache ACCESS_TEST_CHROMIUM=/usr/bin/chromium ACCESS_TEST_API_PORT=8030 ACCESS_SECURITY_ORIGIN=http://127.0.0.1:8030 ACCESS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:8030 npm run test:browser -- --workers=2 --reporter=line
PYTHONPATH=services/core/src:services/api/src:services/worker/src UV_CACHE_DIR=/tmp/access-uv-cache ACCESS_TEST_CHROMIUM=/usr/bin/chromium ACCESS_TEST_API_PORT=8031 ACCESS_TEST_ETHIOWARE_PORT=5183 ACCESS_TEST_CAREER_PORT=5184 npm run test:vercel-demos -- --workers=2 --reporter=line
python3 scripts/check_repository.py
bash scripts/check_security_baseline.sh
git diff --check
```

Both browser suites are run sequentially because their diagnostic output directories overlap. Existing demo servers are not silently reused. Early attempts failed because the bundled browser was absent, sandbox socket/cache access was restricted, or an older running server was reused; final runs use installed Chromium, isolated ports and permitted local-server access. These environment failures are not live-service findings. Link validation initially lacked the task worktree's Savanna submodule pages/README; linking the original read-only fixture completed the local check without changing source captures. All privacy test subprocesses now use `--no-sync` so verification does not repoint a reused editable environment. A static-host certificate hardcoded-origin failure was repaired. Tightening caption revocation exposed a generated final cue rounded beyond media duration; millisecond flooring and a regression repair the cause without weakening the timing gate.

## Release blockers that code cannot certify

Reviewed mandatory Amharic/EthSL and equivalent descriptive HTML/PDF, consented unaided NVDA/TalkBack/keyboard/zoom/sound-off tasks, the co-designer decision/retest record, current deployed/source alignment and fresh deployed accessibility scans remain blockers. Anteneh must also confirm remote CI billing/check protection, human review, independent installation and release retention. Real Android/offline/fullscreen use and measured operating costs remain unverified. Do not add inference, identity, queue, paid hosting or extra-credit work merely to disguise these gaps.
