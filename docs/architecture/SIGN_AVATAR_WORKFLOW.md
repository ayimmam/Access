# Caption and Ethiopian Sign Language avatar workflow

The user confirmed Ethiopian Sign Language and approved an explicitly labeled 3D timing prototype on 13 November 2026. The current demo uses the supplied ALX video and timestamped caption export in `example lessons/`. Its target is an interpreter-reviewed EthSL avatar.

The user subsequently selected American Sign Language for the English-caption alternative and requested an African woman character. Both EthSL and ASL are selectable in the media controls. The local preview uses an original dark-skinned woman character with coiled hair, a bun and visible hands. The language choice changes the selected output language and exported motion worksheet. Language-specific lesson motions still await authoring and review.

The supplied interpreter-recording blueprint has now been evaluated and its capture, manifest and reviewed-GLB playback foundation implemented. Follow the [evaluation and authoring runbook](AVATAR_BLUEPRINT_EVALUATION.md) for its corrections, commands, local asset contract and outstanding recordings/rig inputs. The original source has 16 draft cues. The blueprint's proposed 12-phrase rewrite requires correction before recording.

## Free external software search and integration

Performs is the MIT-licensed successor to SignON-realizer. It accepts authored SiGML/BML and glTF/BVH animations. Its supplied gloss dictionary is NGT (Dutch Sign Language). The application now embeds its hosted authoring workspace on demand under **Free sign-motion authoring tools**, with a separate-tab fallback. A network connection is needed for that workspace. [Performs source and integration documentation](https://github.com/upf-gti/performs), [license](https://github.com/upf-gti/performs/blob/main/LICENSE)

Use **Download caption-to-motion worksheet** to export the current video's cue IDs, times, source text and selected EthSL/ASL target. Each cue reserves fields for approved gloss, motion asset and non-manual features. Review status remains awaiting translation and motion authoring. The external workspace is a separate authoring session. Caption text is passed to it through the reviewer's authored input, and its playback is controlled in that session.

The hosted Performs page and its canvas initialized successfully inside the demo during a live Chromium check on November 13. Automated tests separately verify that the workspace loads only on request, closes correctly, and preserves each language's worksheet metadata. Hosted network and model availability remain dependencies for that external session.

MMS Player is free GPL-3.0 software using Blender to synthesize sign animations from MMS instructions. Its backend/rendering setup is a larger dependency for this browser demo. [MMS Player source](https://github.com/DFKI-SignLanguage/MMS-Player)

The CESL research resource provides EthSL sentence videos intended for recognition research, with a limited vocabulary and sentence set. A reusable, licensed text-to-avatar translator covering this lesson was not established in the reviewed material. [CESL dataset project](https://ethio-artifical.github.io/)

The search established free animation and authoring tools. Accurate full-lesson EthSL/ASL performance remains blocked on matching translation and motion assets. The local preview retains its timing-prototype label, and the worksheets keep unprovided motion fields empty. Obtain reviewed interpretation or clips before replacing that status.

## Current demo

Open `/` or `/demo/savanna` for the Savanna-style course page. It includes the source video, English WebVTT captions, caption visibility/size controls, searchable timestamped transcript, seek actions and downloads. The host has working navigation collapse, a session reflection field and explicit demo-only completion.

The caption importer preserves the supplied wording, removes repeated human-readable timestamp labels and ends each cue at the next timestamp. The final cue ends at the probed media duration of 121.496916 seconds. Caption metadata and the interface show source-draft review status. Wording, punctuation, cue segmentation and timing need human comparison against the video.

The optional Three.js panel is labeled **3D timing prototype** with an EthSL review-pending explanation. Its neutral procedural arm movements follow video time. It shows the current cue identity and video clock for synchronization checks. Play, pause, seeking and playback rate use the video's clock. Position controls allow placement beside or below the video. The renderer loads on demand, respects reduced motion, pauses updates in hidden tabs and disposes resources when closed or disconnected.

## Reviewed interpretation pipeline

| Stage | Input and output | Owner and evidence |
|---|---|---|
| Source registration | Lesson/course/media version, authorized master video, caption source and checksums | Biniyam records provenance and distribution rights |
| Caption review | Source text becomes corrected, meaning-preserving, timed English captions | Biniyam coordinates a human reviewer and freezes the exact caption revision |
| EthSL translation | Interpreter translates sentence meaning into EthSL, with sign order, spatial references and non-manual features | Interpreter and Deaf reviewer approve terminology and meaning |
| Motion authoring | Approved interpretation maps to licensed rigged avatar motions, hand/finger articulation and face/body tracks | Author records rig version, motion IDs, cue associations and supported vocabulary |
| Timeline fitting | Motions align to the media timeline while preserving sign comprehension | Interpreter reviews motion speed, transitions, hand/face visibility and any necessary source pauses |
| Rendered review | Actual avatar performance is viewed with captions and source media | Deaf reviewer and interpreter record feedback and exact-revision approval |
| Publication | Approved language-specific motion timeline or signed video joins the immutable lesson manifest | API publishes only the approved artifact and its source binding |
| Playback and retest | Player follows source play/pause/seek/rate and recovers from missing or stalled interpretation | Anteneh tests controls with co-designers and Hailemichael checks asset/version access |

Caption timestamps support synchronization. EthSL translation and animation require authored language-specific data. Build the translation step around phrases and meaning, including facial grammar and spatial references. Unknown signs remain review tasks. A source-caption, rig or translation change invalidates dependent approval.

The future approved artifact should record lesson/media/course version, source-caption hash, sign language, interpreter/reviewer, review state, rig/asset versions, cue start/end times, sign-motion references and non-manual tracks. Bind approval to the rendered revision. A verified provider can return the same artifact or a reviewed signed-video stream. Provider credentials stay server-side.

## Libraries and services evaluated

Three.js is the renderer used for the timing prototype. Its scene, rig and animation APIs provide a browser rendering foundation. [Three.js documentation](https://threejs.org/docs/)

JASigning accepts authored SiGML sign descriptions and renders signing avatars. Evaluate licensing, maintenance, embedding and available EthSL-authored data before adoption. [JASigning project](https://vh.cmp.uea.ac.uk/index.php/JASigning)

Signapse advertises ASL and BSL translation. Its published language coverage does not establish EthSL support. [Signapse](https://www.signapse.ai/)

Signa documents a text-to-sign API and avatar animation output. Obtain explicit EthSL support, motion format, licensing, review arrangements and cost details before integrating it. [Signa API documentation](https://usesigna.org/en/docs)

## Assets to collect next

- Corrected English captions for the supplied video and interpreter-approved EthSL translation.
- Licensed rigged avatar/motion assets with the required hand and face articulation, or a provider able to supply and validate EthSL output.
- Interpreter and Deaf reviewer availability to review the exact rendered sequence.
- The agreed treatment of gaps, unsupported vocabulary and signing that needs more time than the spoken phrase.

An approved recorded interpreter stream remains an implementation route while the avatar motion pipeline is developed. Its recording and publication require consent as described in the implementation plan.
