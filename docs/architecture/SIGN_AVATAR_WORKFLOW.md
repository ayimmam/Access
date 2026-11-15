# Ethiopian Sign Language hands-only workflow

Updated 15 November 2026. The latest user request replaces the visible African-woman timing character and language selector with an **EthSL-only, wrist-terminated hands view**. Historical ASL/presenter studies and the Performs/NGT workspace are not lesson interpretation and are not loaded by this view. The existing lesson player, lazy Three.js renderer and hash-checked GLB pipeline remain in use. See the [implementation plan](../planning/TRACK_2_IMPLEMENTATION_PLAN.md) and [contributor workflow](../../CONTRIBUTING.md).

## Current delivery and limitations

No consented fluent EthSL performance, approved phrase translation, or rendered Deaf/interpreter approval was supplied. The panel therefore says **3D hands preview · EthSL review pending**. It shows a still, neutral pose; all 16 source motion/video slots are empty. Nothing is automatically mapped from English words or fingerspelled. Captions and the searchable transcript remain accessible.

The original project-authored hand geometry has differentiated finger lengths, tapered palms, thumb bases, opposed thumbs and matte warm-brown surfaces. It is an anatomical **review candidate**, not a professionally validated anatomical model or reviewed EthSL rendition. Review or replace its surfaces before accepting language clips. The reviewable export is generated locally, not shipped as an approved recording.

- [Hands rig](../../packages/lesson-component/src/hands-rig.ts): `access-hands-v1`, 43 hidden joints including 30 finger joints. The original hips/spine/head/shoulder/arm/forearm/wrist hierarchy and body-relative offsets remain. Only hand surfaces beneath `LeftHand` and `RightHand` are visible; they end at the wrists.
- [Renderer](../../packages/lesson-component/src/timing-avatar.ts): `hands-front-v1`, fixed front orthographic camera, soft hemisphere/key/fill lighting and a pale contrasting background. Signer-left is screen-right; no mirroring, orbit controls or motion-dependent zoom. The signing-space bounds are x −1.55…1.55, y 0.15…2.95 and z −1.5…1.5 in the original rig coordinates. Resizing preserves the whole space, not a tightly cropped hand.
- [GLB player](../../packages/lesson-component/src/signing-player.ts): independently binds wrist/finger and hidden reference-joint position/quaternion tracks. Absolute source time determines the clip point; end poses hold until the approved phrase ends. Gaps and unapproved segments stop/reset the previous action and hide a reviewed sequence. A wholly pending lesson retains the neutral preview.
- [Lesson integration](../../packages/lesson-component/src/media-view.ts): renderer loads only after the keyboard-accessible toggle. The panel docks beside or below the video without overlaying captions, transcript or controls. Closing/unmounting aborts loads and disposes rendering resources. Reviewed video works independently of renderer availability, follows the same source clock and pauses synchronized playback on a real stall or failure, with text fallback. Source buffering/seeking holds interpretation playback; intentional video resynchronization is not treated as a failed asset.

Full-space framing necessarily makes hands small at 320px viewport width. There is no automatic zoom to disguise this limitation; the panel advises a larger/landscape display for detailed handshape review. Desktop and mobile UI/framing checks are not evidence of Deaf comprehension or small-screen handshape legibility. Review normal-speed clips at both sizes; use reviewed video, or mark interpretation unavailable, if detail cannot be read.

## Source cue coverage

Baseline: lesson `alx-transforming-africa`, media `alx-africa-intro-v1`, content version 1, course `alx-demo-v1`, source duration 121.496916 seconds. Each row is a **provisional source-cue slot**, not an approved EthSL phrase boundary. Wording remains source-draft, including recognition errors. Short topic labels below identify the source; they are not proposed translations.

| Source cue ID | Start (s) | End (s) | Source topic | Delivery route |
|---|---:|---:|---|---|
| cue-1 | 0 | 1 | Music | Pending |
| cue-2 | 1 | 9 | Community and support | Pending |
| cue-3 | 9 | 19 | Partners and upskilling | Pending |
| cue-4 | 19 | 27 | Learning and self-patience | Pending |
| cue-5 | 27 | 34 | Patience / planting example | Pending |
| cue-6 | 34 | 41 | Understanding concepts | Pending |
| cue-7 | 41 | 50 | Driven people and big dreams | Pending |
| cue-8 | 50 | 57 | Impactful community and change | Pending |
| cue-9 | 57 | 66 | Applying yourself / origins | Pending |
| cue-10 | 66 | 72 | Destination and inspiration | Pending |
| cue-11 | 72 | 80 | Doing hard things / unknown knowledge | Pending |
| cue-12 | 80 | 89 | Learning, belief and hope | Pending |
| cue-13 | 89 | 96 | Achievement / falling down | Pending |
| cue-14 | 96 | 103 | Getting up / complex work | Pending |
| cue-15 | 103 | 110 | Challenges and an open mind | Pending |
| cue-16 | 110 | 121.496916 | Doing your best | Pending |

Approved hands-only: **0**. Reviewed interpreter video: **0**. Pending source cues: **16**, explicitly `cue-1` through `cue-16`. Update this table with the interpreter-approved grouping and route when recordings arrive. Include music/non-speech treatment in that review rather than inventing a sign.

## Interpreter and Deaf reviewer handoff

1. Review/correct the source captions against the video and freeze their revision/hash. A qualified EthSL interpreter translates each phrase's contextual meaning and may group **adjacent** cues; retain every original cue ID and record approved start/end boundaries. Do not use the historical unsupported 12-phrase rewrite.
2. Use the **Ethiopian National Association of the Deaf (ENAD) EthSL dictionary/resources** for terminology. The interpreter must supply the applicable edition, entry/page or verified resource URL in the private review record; no dictionary asset or reference recording has been provided here. Dictionary entries do not establish phrase-level grammar.
3. Obtain a fluent EthSL signer's consented performance of the approved phrases, including separate recording and learner/pitch distribution consent. Record the opaque reference recording ID privately. Establish dominance, signer-left/right orientation, body/depth calibration and the intended neutral/rest or hidden gap treatment from that take.
4. Author a self-contained GLB on `access-hands-v1`, retaining original spatial scale and depth. Preserve handshape, thumb opposition, palm/wrist orientation, dominant/supporting roles, deliberate contact/crossing, asymmetry, rhythm, repetitions, holds and transitions. Do not smooth away intended contact or repair motion by guessing. The old presenter capture baker remains a historical tool; its full-character output is **not** accepted by this view and is not an EthSL authoring deliverable.
5. Inspect the actual rendered take for unintended intersections, joint collapse, jitter, fingertip crop and unreadable occlusion at desktop/mobile sizes. No approved take exists to perform this content check now. If meaningful facial grammar, mouthing, gaze, head movement or visible body contact is required—or the hands-only interpretation is ambiguous—set the route to `interpreter-video`. If reviewed video is unavailable, leave the segment pending and preserve captions/transcript.
6. A Deaf fluent EthSL reviewer watches the rendered clip at normal speed **before seeing/hearing the English source**, then explains what it communicates. Save that independent observation before comparison. Compare with the approved phrase and recording; the interpreter checks form and timing. Review the exact rig, clip, render profile and source revision, not just a gloss or skeleton recording. A changed revision requires new approval.
7. Fit only at a comprehensible interpreter-reviewed speed. The validator rejects a clip whose natural duration divided by its approved rate exceeds its source window; return it for timing review rather than truncate, omit a repetition or silently speed it up.

No ASL/NGT assets, generated lesson poses, English word-by-word gestures or automatic fingerspelling are admissible. EthSL fingerspelling is used only when chosen by the interpreter for the approved phrase. Anteneh coordinates UI/co-design, Biniyam owns source/motion artifacts, and Hailemichael reviews provenance/asset controls. Human PR and language review are still required; this agent cannot supply either approval.

## Generate and inspect the neutral rig

Use the existing installed development environment; no extra dependencies or external services are needed:

```sh
uv run python scripts/prepare_signing.py --language ethsl --output-dir artifacts/hands-source
npm run build:hands-preview
node artifacts/build-hands-preview.mjs \
  --manifest artifacts/hands-source/alx-transforming-africa-v1-ethsl.json \
  --output artifacts/hands-review
```

Output must be a **new** directory. The exporter refuses approved/motion-bearing input and does not overwrite an existing package. It writes `access-hands-v1.glb` plus the source-bound pending manifest, with SHA-256 and license information. `artifacts/` is ignored; keep generated rigs and all private recordings/references out of public source/assets. Open the actual generated GLB with the [local review guide](../setup/AVATAR_CO_DESIGN_TESTING.md); generation alone is not review.

## Manifest, validation and publication boundary

The existing [strict manifest flow](../../services/core/src/access_core/signing.py) carries source identity and hashes, `cue_ids`, phrase start/end, caption text/hash, `rig_version`, rig/GLB hashes, `clip_name`, natural duration, approved playback rate, `presentation`, non-manual/ambiguity routing and status. Private records also require `reference_recording_id`, `consent_ref`, `deaf_review_ref`, `interpreter_review_ref` and `review_ref`.

`render_revision(manifest, segment)` binds the reviewed source, boundaries/rate, recording ID, rig, GLB/video revision, language and `hands-front-v1` profile. Store its value as `approved_render_sha256` **only after both human reviews**. Renderer/camera/lighting or geometry changes must bump the relevant profile/rig version and trigger review. These local-file validators are not a production staff approval service; file editing never replaces human review or author/reviewer separation.

The API withholds private audit references and draft/stale assets. Changed source, text, timing, rig, clip, video or binding invalidates effective approval. The browser checks SHA-256, same-origin API asset scope, size limits and self-contained uncompressed GLB structure; it rejects a legacy/full-body rig or unsupported language. Only approved distributable interpreter clips can be served, never the private reference take. Do not configure `ACCESS_SIGNING_DIR` to a private-recordings folder.

```text
GET /api/v1/lessons/alx-transforming-africa/signing-manifest?lang=ethsl&version=1
GET /api/v1/lessons/alx-transforming-africa/signing-assets/{filename}?lang=ethsl&version=1
```

## Verification

Run `npm run build` (includes TypeScript checking), `uv run pytest`, `npm run test:browser`, `python3 scripts/check_repository.py`, `bash scripts/check_security_baseline.sh` and `git diff --check` with the existing tools. No standalone lint/formatter command is configured. A local browser/server override may be required when the bundled Playwright browser is unavailable; record it, do not call an unavailable check passed.

The browser suite uses explicitly **synthetic, non-language** GLB/video fixtures to exercise play/pause, forward/back seeks, holds, rate changes, replay, gap reset, missing/tampered assets, video fallback, keyboard docking, local feedback and source traceability. Its mock approval values are test data, never an approved lesson. Screenshot tests write full desktop/mobile pages and signing-panel crops to `test-results/`; inspect them and retain delivery copies locally under `artifacts/` because test output is replaced on subsequent runs. Automated accessibility scans do not substitute for NVDA/TalkBack, anatomical review or Deaf comprehension testing.

### November 15 verification record

Rechecked before the authorized feature-branch commit after syncing the preserved working tree with `origin/main` at `53b1499`. The final sync reconciles upstream multilingual caption preferences, audio-described media and interpreter controls with the hands-only view; no unmerged paths remain. Hands playback is cleared and disabled on the extended audio-described timeline rather than reusing standard-video timing. Native caption selection also excludes a cue ending exactly at a seek boundary.

| Check | Result |
|---|---|
| `npm run typecheck` and `npm run build` | Passed; TypeScript, lesson/jobs/review bundles and upstream component integrity manifest |
| `npm run build:hands-preview` and neutral export | Passed; reproducible GLB hash, 43 joints, 16 pending slots, zero motion clips |
| `.venv/bin/python -m pytest -q` | 44 passed; existing Starlette/HTTPX deprecation warning |
| `npx playwright test --config artifacts/hands-audit.config.ts tests/integration/avatar-review.spec.ts tests/integration/savanna-media.spec.ts --workers=1 --reporter=line` | 15 passed; includes upstream-caption/extended-timeline regression; system Chromium/SwiftShader, fresh API port 8014; outside sandbox because browser/TestClient execution is blocked inside it |
| `.venv/bin/python scripts/check_repository.py` | Passed for 189 files, including untracked sources and local Markdown links |
| `bash scripts/check_security_baseline.sh` | Passed; limited baseline, not a security audit |
| Python compilation and `git diff --check` | Passed |
| Standalone lint/format | Not configured; no command invented or check bypassed |

The final full browser run had **30 passes and one failure**, with no unrun cases. The plug-in installer's existing text-lesson host overflows at 320px (`plug-in.spec.ts` reflow assertion); this fixture does not render an avatar. That unrelated host issue is left unchanged, so full-repository green status cannot be claimed. Final avatar/media checks all pass. The fresh upstream API and locked environment supersede the earlier missing-route/`cryptography` findings: career, privacy and full API checks now run successfully. Earlier runs included intermittent lesson-loading timeouts and integration failures before the final reconciliation; those failed runs are not counted as passes. Sandbox-blocked runs are not counted as passes; relevant suites were rerun outside it.

Local delivery: `artifacts/ethsl-hands-delivery/` contains the neutral GLB/manifest, desktop/mobile full pages, panel crops and a larger below-video desktop panel. Screenshots were visually inspected: wrist termination, two distinct neutral hands and no fingertip crop; details remain too small for a mobile comprehension claim. Rig SHA-256: `2eecc154cb3ca73d6eb20eade157a22e30f53e986b4150c15c7a9f930f8e2aaf`. The package is reviewable, **not approved EthSL**. Original source fixtures and dependency declarations/lockfiles have no task-authored changes. The final sync installed only upstream's already-pinned Python requirements with `uv sync --locked --inexact`; no paid services or deployment were added. Human PR, anatomical, Deaf/interpreter and device/screen-reader reviews remain outstanding.
