# Public-fixture content and release runbook

Updated 16 November 2026. This is a manual local workflow, not a production staff console, ALX authorization integration, content approval or deployment authorization. Biniyam owns content, Anteneh release/CI/budget, and Hailemichael security review. See [CONTRIBUTING](../../CONTRIBUTING.md), the [judging plan](../planning/JUDGING_PIVOT_PLAN.md) and [security rules](../../.agents/rules/security.md).

## Review before publication

Keep original captures, source captions and media intact. Work on a focused branch. Review English and Amharic against the full selected lesson, including sound coverage, wording, line breaks and timing. Obtain separate participation, recording and publication permission. Do not manufacture approvals for a deadline.

The source W3C English tracks have pinned source-video/caption hashes in `services/core/src/access_core/review.py`, preserving their existing source-reviewed status only for those exact files when no explicit review record exists. An explicit pending, malformed or stale record overrides that default and fails closed; do not delete such a record to evade re-review. Amharic/Tigrigna and the older ALX transcript are not published without a human-approved record. Changing the source invalidates approvals. Required formats remain gaps even if the UI truthfully disables them.

Place approval records and their self-contained files in private `artifacts/reviews/`, or set `ACCESS_REVIEW_DIR` to another private directory. Do not commit records or private review/publication references. Record name:

```text
{lesson_id}-v{content_version}-{standard|described}-{en|am|ti}-{vtt|pdf|brf|document}.json
```

The validated fields are `schema_version: "1.0"`, `lesson_id`, `content_version`, `course_version_id`, `edition`, `language`, `format`, `filename`, `sha256`, `video_sha256`, `source_captions_sha256`, `status`, `review_ref` and `publication_ref`. Use `status: "human-reviewed"` only after actual approval. The references remain private and are never serialized in a learner manifest. Filenames contain only letters, digits, hyphens and underscores with the appropriate extension; no paths, URLs or symlinks outside the directory are accepted. Source files are selected by the public-fixture allowlist, not user-supplied URLs.

- VTT must contain non-overlapping cues inside the selected edition's duration; reviewed bytes are used by the online track, transcript, ZIP and captioned MP4.
- A `document` asset is JSON with `title`, `language`, and nonempty `sections`; each section has `heading`, `text` and optional `image_description`. The approved title/language must match the lesson. Exports escape all text and provide semantic headings. Human review still has to establish equivalent instructional meaning.
- PDF is imported as exact reviewed bytes after validator/manual checks of tags, reading order, language, title, links, fonts and actual AT use. The original prototype is not automatically promoted or served. Attach results to its hash.
- BRF is optional. Import transcriber-approved bytes with the selected encoding/table/device profile; the hand-mapped prototype is not learner-published. Do not substitute transliteration for Amharic Braille.

Whole-lesson sign interpretation uses the same `SigningManifest`/`SigningSegment` contract as reviewed segment assets under private `ACCESS_SIGNING_DIR`. A whole-lesson `interpreter-video` segment covers all current cue IDs, starts at zero and ends at the exact standard duration. It needs consent, reference recording, Deaf/interpreter review, a valid asset hash and the exact `render_revision`. Direct `/media/sign-video` and `/signing-assets/` both fail closed when review, source, file or render changes, or the bound English caption approval is withdrawn. Merely adding `ethsl.mp4` has no publishing effect. The public-fixture signing metadata still exposes original cue references for local authoring; it is not a learner caption track, and no draft signing file is served. See [the signing workflow](../architecture/SIGN_AVATAR_WORKFLOW.md); a 3D calibration preview is never EthSL evidence.

## Build once, serve without conversion

With the existing locked environment and FFmpeg available:

```sh
npm run build
uv run --no-sync python -m access_core.exports
uv run --no-sync python -m access_core.offline_video
```

The Docker build runs both Python steps. No new paid inference is required at learner playback. Exports live under `artifacts/lesson-exports/{lesson_id}-v{version}/`, configurable through `ACCESS_EXPORT_DIR`. Metadata references SHA-256-named artifacts and a publication hash covering the source and approved alternatives. Optional missing files are omitted rather than crashing the list; stale metadata must be rebuilt before it is served. API handlers read metadata/files and never compress a ZIP or generate a PDF. Tampered hashes fail delivery. Offline-video sidecars bind each generated edition to that publication hash.

Open the actual extracted `index.html`, test local standard/described audio, read both transcripts, check manifest file hashes and confirm no draft/PII/token is included. Desktop automated opening is only supporting evidence; repeat download/extract/disconnect/reopen and interruption recovery on an actual low-cost Android device unaided. A text-only pack is labeled as such. Archive hashes detect corruption; they are not independent publisher-authenticity proof. The hosted offline reader remains a placeholder.

## Freeze and retain the release

`npm run build` freezes every current entry script and optional chunk in `dist/releases/{release_id}/`. The esbuild metafile identifies current outputs so obsolete chunks left in the build directory cannot enter a new release. The ID hashes the complete sorted file inventory, not a mutable version label. Rebuilding retains previous directories and refuses mismatched frozen files or metadata. Identical artifacts retain the original frozen provenance. `release.json` records hashes, byte counts, source revision if known, and whether the working tree was dirty (`null` when Git is unavailable). A dirty checkout's commit is not an exact reproducibility claim.

The public `/api/v1/release` advertises the current frozen directory. Installers copy concrete SRI and a content-hashed URL; discovery metadata is not independent trusted provenance. Human-reviewed distribution of the static integrity manifest is still required. The `/components/0.1.0/` alias remains explicitly mutable and uncached for local compatibility.

For retention across a clean container/image replacement, carry all previously installed release directories into the next release artifact, or configure a retained `ACCESS_COMPONENT_RELEASE_DIR` for the writer and API. A clean image alone contains only its newly built release. Anteneh must choose the already authorized hosting/storage mechanism before deployment; this task does not provision it. Do not delete release directories still referenced by pinned snippets. Keep the relevant backend/source snapshot with component/export artifacts; rolling back only JavaScript can mismatch API contracts.

After human review, Anteneh's authorized release process must record commit, release ID, artifact hashes, checks and submitted URLs. Test every host against those same bytes, including fresh deployed axe/keyboard/error states. Roll back by restoring the recorded source/backend plus retained component/export artifact set, then repeat smoke checks. Do not claim live/source alignment based on local builds.

For a new partner origin: explicitly allow its scheme/host/port in API CORS, allow the component origin in host `script-src`, API in `connect-src`, and media in `media-src`, keep credentialed requests disabled, and preserve a readable fallback. Use HTTPS except local development. Run the README-only one-hour installation on a clean external host with a stranger; current automated local second-origin tests are not that exercise.

## Operating and evidence boundaries

Measure publication time/CPU, each artifact's bytes, request latency under an owner-approved workload, egress per complete learner task and reviewer/interpreter time. Record the machine, command, workload, date and exact artifact. Prefer prebuilt exports, low-data audio and immutable caching; do not invent concurrency or monthly-cost estimates from a single smoke check. Anteneh owns the $100 credit and provider assumptions. No paid resources, deployment, production credentials or capacity tests are authorized by this runbook.

The restored `.github/workflows/ci.yml` defines repository/security, locked build/type/API, media preparation and both browser suites with read-only GitHub permissions and no deployment step. It has not executed remotely here. History records a workflow removal for a billing lock; Anteneh must resolve that account issue, confirm required checks/branch protection and obtain human review. Do not bypass protection or describe the configuration as enforced until remote evidence exists.

Co-design, reviewed Amharic/EthSL/descriptive PDF, NVDA/TalkBack/fullscreen-mobile/zoom, deployed gate, actual one-hour installation and a measured operating envelope remain release dependencies. Record them in [the conformance report](../WCAG_CONFORMANCE.md); automation never supplies these outcomes.
