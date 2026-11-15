# Review the EthSL hands rig and local clips

The current lesson has **no reviewed EthSL recordings**. Its neutral hands preview is not interpretation. The latest hands-only view excludes the historical African-woman/presenter and ASL/NGT studies. Follow the [hands workflow and cue coverage](../architecture/SIGN_AVATAR_WORKFLOW.md) for generation, private review metadata and publication requirements.

## Start a local review

1. Build/start the project with the [root README](../../README.md) commands. Generate the neutral hands GLB and manifest with the hands workflow's commands, using a new output folder.
2. Open `http://127.0.0.1:8000/demo/avatar-review` in a WebGL-capable browser.
3. In **Load a language manifest and its GLB files**, choose the EthSL hands manifest, `access-hands-v1.glb` and any consented EthSL recording-derived draft motion GLBs. Files stay in the browser session; nothing is uploaded.
4. Activate **Load draft performance**. The neutral package reports zero clips and 16 pending slots. Do not load the old presenter-study ZIP: its rig and language motion are not supported.
5. Choose a phrase with **Jump to source cue**. Use **Play / pause rendered clip** to watch at normal speed. The source video and captions start hidden and source audio is muted, so the English cannot prime independent comprehension feedback.

The viewer checks source video/caption hashes, course/content version, unique adjacent source cue IDs, unchanged source text, rig version, asset hashes and track timing. Missing/changed files fail visibly. The lesson's pending neutral pose is useful for visual/keyboard review only; there is no EthSL meaning to assess yet.

## Observe before comparing

A Deaf fluent EthSL reviewer describes what the actual rendered clip communicates before seeing the English caption. Choose **Language and meaning**, enter the independent interpretation, and activate **Save observation at current time**. Only then can **Compare source after saving observation** reveal the source. The reveal resets when the phrase changes. Record comparison feedback separately; the interpreter checks form and timing against the approved phrase and consented take.

Also check both hands and fingertips, finger differentiation, thumb/palm/wrist orientation, inadvertent intersection or joint collapse, jitter and occlusion. Preserve purposeful contact, crossing, asymmetry, repetition and holds. Check source seeks/rates/gaps and the panel at desktop and 320px widths. Small full-space previews cannot establish handshape readability; require reviewed video or pending/text fallback when hands-only meaning cannot be read or requires non-manual grammar/body contact.

## Export feedback, not approval

Download feedback before switching packages, closing or reloading. JSON includes the manifest/source/rig hashes, render profile, clip hashes and cue boundaries, observation timestamps, source playback rate and `blind-comprehension`/`comparison` phase. Its status is always `feedback-only`; it cannot approve a lesson or certify EthSL comprehension. Keep private notes and references in the team's consented review storage, not Git or public assets. Avoid names, contact information and personal details in observations.

Anteneh collects UI/co-design feedback, Biniyam corrects source/motion artifacts and Hailemichael reviews provenance and asset integrity. Both the Deaf reviewer and qualified interpreter must approve the same rendered revision using the workflow's private record before a clip is eligible for publication. No anatomy, language or mobile comprehension approval has been supplied for this package.
