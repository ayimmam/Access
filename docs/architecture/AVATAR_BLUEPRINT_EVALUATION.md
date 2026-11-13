# Interpreter-recording avatar implementation

Evaluated on 13 November 2026 against the supplied `3D Avatar Implementation Blueprint.md`, the current code and the source lesson. The selected approach uses a fluent interpreter's recording, offline motion authoring and review, followed by browser playback of language-specific GLB clips. EthSL is primary and ASL is the user-selected alternative. The character direction remains an African woman.

## Evaluation and corrections

| Blueprint proposal | Evaluation and implementation decision |
|---|---|
| Record a human interpretation and extract motion offline | Adopted. Translation, capture, retargeting and review are separate stages with their own evidence. |
| Use the proposed 12 corrected phrases | Several phrases introduce unsupported content, including “opens doors to opportunities across the continent” and “The journey requires dedication and resilience.” Cue mappings also differ from the supplied export. The preparation command preserves all 16 actual source cues. A caption reviewer and interpreter must correct and regroup them. |
| Automatic landmark-to-signing conversion | The capture worker exports pose, hand and face observations with explicit coordinate spaces. Skeleton rotations, contact constraints, depth correction and rendered comprehension review remain authoring work. |
| Legacy `mp.solutions.holistic` Python example | Implemented the current Pose, Hand and Face Landmarker Tasks APIs. Face capture includes blendshape coefficients and transformation matrices. The blueprint's Python sample omits facial output. |
| A universal 30-finger/52-ARKit avatar preset | Inspect the chosen mesh, skeleton, morph targets and their mapping. The presence of face coefficients in capture output does not establish compatible morph targets on an exported character. |
| Compress every GLB with Draco immediately | The first player accepts self-contained uncompressed GLB files. Compression, decoder support and measured quality/size belong to a later asset iteration. Per-file delivery is limited to 25 MiB. |
| Clamp playback speed and continue | Approved motion must fit its full source window at the reviewed rate. Oversized clips fail validation. The initial accepted range is 0.5–1.15, adopted as a provisional project parameter requiring interpreter review. |
| Delta-time crossfades while seeking | The player evaluates animation directly from video time. Entry/exit transitions must be baked into the reviewed clip. Timeline borrowing, automatic video holds and runtime crossfades remain future work. |
| A hash stored beside corrected text proves source integrity | Approval is checked against the actual video, caption file, referenced source cues, rig and motion files, along with lesson/media/course versions. Changed assets become stale at delivery. |
| Publish reviewer and consent metadata | Local authoring manifests retain private audit references. Learner API responses exclude them. |
| Guaranteed NPU acceleration, recording time and final file size | Hardware support, capture effort, accuracy, runtime performance and compressed size require measurement. The implemented capture path explicitly uses CPU. |
| Precise dataset vocabulary coverage | The claimed lesson-coverage percentage was unsupported by a reproducible vocabulary comparison. It is excluded from the implementation assumptions. |

Animics provides video-based Keyframe Mode, editing and GLB/BVH/BVHE export under MIT. Its Script and Keyframe modes are separate. It is available from the demo's authoring tools as an external editor. EthSL and ASL output still require language-specific source performance and review. [Animics upstream documentation](https://github.com/upf-gti/animics)

The blueprint lists retargeting-threejs as MIT. Its current repository license is Apache-2.0. MPFB uses GPLv3 for source code and separate asset/output terms. Record the license of each chosen skin, hair, clothing and motion asset. [Retargeting license](https://github.com/upf-gti/retargeting-threejs/blob/main/LICENSE), [MPFB licensing](https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.md)

MediaPipe Tasks supplies face landmarks, expression blendshapes and transformation matrices. Each coefficient still needs mapping and visual validation on the target rig. Body and hand outputs have their own normalized/world coordinate definitions. [Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker), [Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker), [Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)

## Implemented components

- [Manifest preparation](../../scripts/prepare_signing.py) generates pending EthSL or ASL authoring manifests from the real lesson and its source hashes.
- [Offline capture worker](../../services/worker/src/access_worker/capture.py) streams timestamped JSONL with body and hand observations, face landmarks, expression coefficients, confidence/visibility information and missing detections. Adaptive One-Euro smoothing uses actual frame timestamps. It records model and video hashes and publishes completed output atomically.
- [Original rig generator](../../scripts/avatar-rig.mjs) creates a stylized African-woman character with 43 bones, including 30 articulated finger joints, and 13 facial morph channels. It uses project-authored geometry under the repository MIT license. The channels cover blinking, eyebrows and a limited mouth-expression set.
- [Draft retargeting and GLB baking](../../scripts/build_avatar_study.mjs) maps capture observations to the generated rig and writes bone-quaternion and facial-weight animation tracks. It supports full-timeline capture and individual phrase takes. Missing observations hold the previous bone pose. Contact correction, twist/depth cleanup and comprehension review remain necessary.
- [Signing schemas and binding validation](../../services/core/src/access_core/signing.py) validate timing, language, identity, review references, file hashes and license metadata.
- [Public API](../../services/api/src/access_api/main.py) provides versioned signing manifests and allowlisted assets for the public fixture. Draft and stale motions receive no playable asset URLs.
- [GLB player](../../packages/lesson-component/src/signing-player.ts) verifies hashes, checks clip name/duration/target nodes, and evaluates approved motion from `video.currentTime`. Pause, seek and rate changes share that clock.
- [Media controls](../../packages/lesson-component/src/media-view.ts) load the selected language, clear previous assets when switching and show review status for the current segment. Missing or pending clips retain the explicitly labeled timing prototype.
- [Co-design viewer](../../packages/lesson-component/src/avatar-review.ts) loads draft files selected locally in the browser and exports timestamped feedback. It always presents the performance as an unreviewed motion study. The learner API serves reviewed clips through its existing approval checks.

The local file store is the public-fixture integration boundary. An operator supplies human-reviewed files. Authenticated reviewer actions, durable audit records and transactional publication remain in the wider implementation plan.

## Prepare the source worksheet

Run from the repository root after the normal setup. Each command creates a new file and fails if that filename already exists, preserving earlier authoring work.

```sh
uv sync --locked --python 3.11
uv run python scripts/prepare_signing.py --language ethsl
uv run python scripts/prepare_signing.py --language asl
```

The default output filenames are `artifacts/signing/alx-transforming-africa-v1-ethsl.json` and `artifacts/signing/alx-transforming-africa-v1-asl.json`. Keep raw media, models, consent records and drafts in ignored local storage with access appropriate to participant permission. The `artifacts/` directory is Git-ignored.

Biniyam checks the supplied caption wording and timing against the 121.496916-second video. The interpreter regroups complete meanings, retaining the associated cue IDs and source text. The manifest's `source_text` is the original text joined in cue order. Store corrected recording scripts and review evidence separately. Human-reviewed corrected captions can later become a versioned source revision through the publishing workflow.

## Capture interpreter motion locally

Install the optional capture group on the processing machine. The web API and browser demo use the base dependencies.

```sh
uv sync --locked --group capture --python 3.11
mkdir -p artifacts/models artifacts/capture
curl --fail --location --output artifacts/models/pose_landmarker_lite.task \
  https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
curl --fail --location --output artifacts/models/hand_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
curl --fail --location --output artifacts/models/face_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
```

Use these commands in macOS/Linux or Biniyam's WSL development shell. Keep the model files local and record their downloaded checksums. Review the model's associated distribution terms before sharing it. MediaPipe is Apache-2.0 and OpenCV's installed distribution includes its own license notices. [MediaPipe source and license](https://github.com/google-ai-edge/mediapipe), [OpenCV license](https://github.com/opencv/opencv/blob/4.x/LICENSE)

Record a consented fluent signer with the full signing space visible, sufficient lighting and a stable camera. Review sharpness, face visibility and hand overlap before recording the whole lesson. Anteneh coordinates EthSL and ASL recordings and rendered review with the respective language reviewers.

Replace the input path with an actual interpreter take.

```sh
uv run --group capture python -m access_worker.capture \
  --input artifacts/recordings/ethsl-take-01.mp4 \
  --output artifacts/capture/ethsl-take-01.jsonl \
  --language ethsl \
  --pose-model artifacts/models/pose_landmarker_lite.task \
  --hand-model artifacts/models/hand_landmarker.task \
  --face-model artifacts/models/face_landmarker.task
```

The first JSONL record identifies the video/model hashes and `machine-draft` state. Frame records include `time`, `pose_normalized`, `pose_world`, `pose_visibility`, `hands`, `handedness_ambiguous`, `face_normalized`, `face_blendshapes` and `face_transform`. The last record gives the decoded frame count. Missing observations are explicit. Face expression names come from the model. The worker applies smoothing to body/hand coordinates and preserves face coefficients for later inspection.

## Retarget and review

1. Anteneh supplies a licensed African-woman GLB with articulated fingers, usable facial morphs and an unobstructed signing space. Verify the exported skeleton and morph-target names in Blender. Record provenance for every constituent asset.
2. Biniyam can use Animics Keyframe Mode to capture/edit interpreter video and export a draft animation. Alternatively, feed the worker's JSONL into the implemented draft retargeter for the original project rig. A different rig requires its own bone/rest-pose and face mapping.
3. In Animics or Blender, map the performance to the actual target skeleton. Correct palm orientation, wrist depth, finger joints, body contacts and face grammar. Review occluded sections against the reference recording.
4. Export the rig and animation clips as self-contained GLB 2.0 files. Clip tracks must target the same node names and bind pose as the rig. Face morph order must also match. Bake transitions and rests into each clip. Export in metres, Y-up, facing the camera at positive Z, with the figure positioned for the existing upper-body view.
5. Review the rendered EthSL or ASL sequence with an interpreter and Deaf reviewer. Record the source revision, rig/motion hashes, exact timing, approved playback rate, rights, consent and comprehension feedback in the private review record.
6. When signing exceeds a window, adjust the interpretation, regroup windows with the reviewer or author an agreed longer delivery. The current browser player requires the approved clip to fit the complete window.

Animics integration currently provides an external editor link. Its model compatibility and export quality still need a real signer sample. Blender was unavailable in this workspace. The original procedural rig provides a working articulated character for testing while a more detailed character can be authored later.

## Generate and test the co-design study

The user confirmed that interpreter recordings and a rig were unavailable and requested an implementation for co-design testing. The supplied lesson video was therefore used to exercise capture and retargeting. The generated EthSL-target and ASL-target packages contain the same observed presenter gestures with separate language metadata. Translation remains pending for both targets.

To reproduce the source-gesture study, first prepare the two manifests and download the models as above. Then run

```sh
mkdir -p artifacts/capture
ffmpeg -i "example lessons/We Are Transforming Africa - ALX Africa (720p, h264).mp4" \
  -vf "fps=12,scale=640:-2" -an artifacts/capture/presenter-study.mp4
uv run --group capture python -m access_worker.capture \
  --input artifacts/capture/presenter-study.mp4 \
  --output artifacts/capture/presenter-study.jsonl --language ethsl \
  --pose-model artifacts/models/pose_landmarker_lite.task \
  --hand-model artifacts/models/hand_landmarker.task \
  --face-model artifacts/models/face_landmarker.task
node scripts/build_avatar_study.mjs \
  --manifest artifacts/signing/alx-transforming-africa-v1-ethsl.json \
  --capture artifacts/capture/presenter-study.jsonl \
  --output artifacts/avatar-study/new-ethsl --source-kind presenter-study
```

Repeat the last command with the ASL manifest and a fresh output directory to create an ASL-target package. Generated output directories must be new. The presenter-study mode limits head/torso rotation for frontal visibility. It preserves the observed arm/finger motion subject to monocular tracking quality.

For a future consented interpreter take covering one cue, use `--source-kind interpreter-draft --segment cue-2`. The capture timestamps are placed at that segment's source start. The complete take must fit the source window. The output remains machine-draft, ready for editing and rendered review. Use a new output directory for each take. Full-session interpreter capture can use the same command without `--segment` when it spans the source timeline.

Open `/demo/avatar-review` and select the generated language JSON plus all GLBs from one output folder. The [co-design testing guide](../setup/AVATAR_CO_DESIGN_TESTING.md) covers observations and feedback export. The current generated packages live under `artifacts/avatar-study/co-design/ethsl` and `artifacts/avatar-study/co-design/asl` in this workspace. They remain outside Git with the other generated artifacts.

## Install reviewed clips for the local demo

Place the rig, motion GLBs and the language manifest together under `artifacts/signing/`, or set `ACCESS_SIGNING_DIR` to another private local directory before starting the API. Filenames use letters, digits, underscores and hyphens, followed by `.glb`.

Set the manifest's `rig` and each reviewed segment's `motion` to an object with `filename`, lowercase SHA-256 and actual `license`. A reviewed segment also needs `clip_name`, `natural_duration`, `playback_rate`, `review_ref`, `consent_ref` and `status` set to `approved`. Keep the private references in the operator's file. The public API intentionally removes them from its response. Compute hashes locally, for example with `shasum -a 256 path/to/clip.glb` on macOS or `sha256sum` in Linux/WSL.

The existing pending manifest is the complete template. Update its fields only after human review. A test fixture's synthetic animation carries no linguistic approval.

```sh
npm run build
uv run uvicorn access_api.main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/`, select EthSL or ASL, then open the 3D panel. The API resources are

```text
GET /api/v1/lessons/alx-transforming-africa/signing-manifest?lang=ethsl&version=1
GET /api/v1/lessons/alx-transforming-africa/signing-assets/{filename}?lang=ethsl&version=1
```

Approved segments show the reviewed-motion status while active. Gaps, missing files and invalidated assets use the labeled prototype. Source, text, rig or motion changes require revalidation. The server rechecks bindings on requests and the browser checks downloaded hashes. An already-open page reloads its manifest when the panel is reopened or the language changes. Immediate revocation of assets already in browser memory remains a production publication concern.

## Remaining delivery inputs

- Corrected source script and consented EthSL/ASL interpreter takes.
- Interpreter-specific retargeting calibration, contact/depth cleanup and baked language-specific clips. A more detailed licensed character can replace the generated stylized rig after mapping and review.
- Recorded human approval of the exact rendered performance and its timing.
- Measured authoring effort, clip sizes, browser performance and signing comprehension on the final assets.

No reviewed language assets were supplied with the blueprint. The current lesson continues to show its timing-prototype label until reviewed files are installed. Draft motion studies are available through the co-design viewer.

## Verification on 13 November 2026

The actual MediaPipe models processed a 12-frame smoke clip with increasing timestamps, body/hand detections and up to 52 face coefficients. A full 12-fps source-gesture study processed 1,457 frames and produced 16 GLB clips per target. The generated EthSL-target folder occupies approximately 4.2 MiB before ZIP packaging.

On this macOS machine, MediaPipe initialized an internal graphics service even with CPU inference selected. The sandboxed smoke run aborted during that initialization. The same run outside the sandbox completed. Windows/WSL and Linux execution remain unverified.

Fifteen pytest API tests and fifteen Playwright checks pass locally, along with type checking, build, repository/link checks, syntax and the security baseline. Coverage includes source/asset invalidation, private review-reference handling, draft asset denial, deterministic-seek integration, generated rig import, local draft playback, changed-asset rejection and feedback-only exports. Single-phrase baking preserves the full take and rejects overflow. Synthetic animation fixtures test mechanics. Human comprehension and naturalness ratings remain to collect.

The production npm audit returned zero reported vulnerabilities. A Python vulnerability audit and Windows/WSL/Linux capture runs remain unverified. The API tests report an upstream HTTPX/TestClient deprecation warning. Python syntax validation initially encountered the macOS cache sandbox boundary and passed after setting a writable `PYTHONPYCACHEPREFIX`.
