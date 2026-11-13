# worker

Isolated transcription, conversion and export orchestration; no direct publication.

The optional `access_worker.capture` CLI extracts offline CPU pose, hand and face observations from local interpreter recordings. Install with `uv sync --locked --group capture --python 3.11`. It requires local MediaPipe model files and writes machine-draft JSONL with source/model hashes.

The Node scripts `scripts/avatar-rig.mjs` and `scripts/build_avatar_study.mjs` generate an original articulated character and retarget captured observations into machine-draft GLB clips. See the [capture and reviewed-clip runbook](../../docs/architecture/AVATAR_BLUEPRINT_EVALUATION.md) for commands, coordinate definitions, correction requirements and human review. Transcription, queue orchestration and specialist conversion/export workers remain pending.
