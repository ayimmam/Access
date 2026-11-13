# ASL and Ethiopian Sign Language avatar consultation brief

Prepared 13 November 2026 for consultation with other LLMs, researchers and developers. This document contains the project context needed to propose an implementable approach. Tool findings below describe research and local experiments performed during this project. Recheck current releases, licenses and service terms before selecting a dependency.

## What we need help solving

We are building Access, a Track 2 accessible learning-media module for the ALX accessibility hackathon. We need to turn a supplied English lesson video and timestamped captions into a comprehensible sign-language performance rendered by an on-screen 3D avatar.

The primary target is **Ethiopian Sign Language (EthSL)**. The user selected **American Sign Language (ASL)** as a second option for English-captioned content. The requested character is an **African woman**, with clear visibility of hands, face and upper body. The user approved an explicitly labeled timing prototype while accurate signing is developed. The desired result is accurate language-specific hand gestures, facial grammar and body movement for the lesson.

The immediate research gap is obtaining a practical translation-and-motion path for these two languages. Our existing application already plays the video, captions and a synchronized 3D timing preview. A workable proposal should identify how to produce the actual signing data, how to render it, and how to verify comprehension with signers.

Please propose concrete libraries, datasets, models, providers or manual-authoring workflows with primary-source links. Explain each resource's supported language, actual input/output, license, asset availability, hardware requirements, vocabulary coverage and integration steps. Separate demonstrated capability, assumptions and work still to implement in your proposed response.

## Project and delivery context

- The final product is a framework-independent custom element, `<alx-accessible-lesson>`, backed by a versioned REST API. It embeds in existing Savanna lesson pages and independent websites.
- Savanna is ALX's web learning platform. We have supplied frozen HTML/CSS/JavaScript captures of paced/self-paced course homepages and a concept lesson. These establish the host's appearance and mount structure. Production identity, enrollment, content and completion contracts await ALX confirmation.
- The current demonstration recreates Savanna's course layout with navigation, course banner, lesson outline, video, transcript, downloads, reflection and session completion. It runs at `http://127.0.0.1:8000/` and `/demo/savanna`.
- Demo hosting is planned on Render with **$100 credit available**. Credit eligibility, expiry and actual service cost require account verification. External provider charges need their own estimate.
- The public demo uses supplied sample media and public fixture routes. Publication rights and production integration must be confirmed for a hosted release.
- Accessibility targets WCAG 2.2 AA, including keyboard control, meaningful names/roles/states, focus, contrast, reflow and screen-reader tasks. The project also includes reviewed English/Amharic captions, interpretation, audio description, accessible HTML/PDF, Braille, offline packs, career resources and session replay.
- The interpreter/signing stream is a first-class learner feature. Co-design with Deaf participants and interpreter review are part of delivery. The original plan also allows a consented recorded-interpreter stream.
- The organizer's full feature checklist and exact WebView judging expectation remain to confirm. The current target host is mobile web.

## Team, hardware and operating constraints

| Owner | Environment | Responsibilities |
|---|---|---|
| Anteneh | macOS | Product/UI building, host integration, deployment, CI/CD and co-design coordination |
| Biniyam | Windows, WSL recommended | Data model, API, pipeline, exports and building. Laptop has a dedicated NPU whose vendor/model remains unknown |
| Hailemichael | Linux, distribution pending | Security features, authorization boundaries and security verification |

Our preparation baseline is Node 24 and Python 3.11. The local machine has FFmpeg. GPU/NPU support on the eventual Render worker has yet to be established. Prefer a solution that can render precomputed content in a normal browser. Precomputing on a development machine is an acceptable candidate if it produces portable artifacts and fits the team workflow.

Free/open-source options are preferred. A useful response may include a paid alternative if its language coverage, review requirements and full-lesson cost are explicit. Distinguish code licenses from model, mesh, dictionary, motion-data and source-video permissions.

## Available lesson assets

| Item | Observed details |
|---|---|
| Video | `example lessons/We Are Transforming Africa - ALX Africa (720p, h264).mp4` |
| Duration | 121.496916 seconds, measured with ffprobe |
| Picture | 1280 × 720, H.264, with an audio stream |
| File size | 20,420,001 bytes |
| Caption source | `example lessons/into-caption.txt` |
| Source format | Timestamp line such as `0:41`, repeated human-readable timestamp, then English text |
| Parsed output | 16 timed segments, starting with `[Music]` |
| Current review status | Source-draft. Recognition errors, punctuation, segmentation and timing need human review |
| Content | ALX community testimonials about support, learning, opportunity, patience, ambition and perseverance |

The importer preserves the supplied wording, removes the repeated human-readable timestamp lines and ends each cue at the next timestamp. The final cue ends at the measured video duration. It generates WebVTT and structured transcript segments.

Representative original cue text follows. Errors are preserved here so an adviser can account for input quality.

| Start | Source caption |
|---|---|
| 0:00 | `[Music]` |
| 0:01 | `when someone is part of Alx I hope that they will feel part of the community first and foremost they're going to feel tremendous support from their peers support from the facilitators support` |
| 0:27 | `patient you know you can't plant a and want to re it tomorrow morning it's not going to happen in anywhere in the world` |
| 0:41 | `you're going to meet incredible people people who are driven who are passionate who are dreaming big and who are working incredibly hard I can confidently say` |
| 1:29 | `know I can achieve what anything that I want to achieve my father used to always say when you fall down pick yourself up` |
| 1:50 | `your best settle for nothing but the best` |

Phrase boundaries can cross these cue boundaries. A proposed translation pipeline should explain caption correction, phrase segmentation, metaphor handling, proper names such as ALX, and the treatment of background music.

## Current implementation

### Application stack

| Layer | Implementation |
|---|---|
| Browser module | TypeScript custom element, open Shadow DOM, esbuild with lazy chunks |
| Video | Native HTML video controls, byte-range MP4 delivery |
| Captions | Native English WebVTT track, visibility/size controls, visible review status |
| Transcript | Search, text sizing, scrollable passages and buttons that seek while preserving keyboard focus |
| 3D preview | Three.js `^0.181.0`, loaded on demand |
| API | FastAPI, Uvicorn and Pydantic, Python 3.11+ |
| Shared core | Typed lesson/media/segment models, caption parsing and deterministic exports |
| Tests | pytest/HTTPX, Playwright/Chromium and axe |
| Future persistence | PostgreSQL and durable object storage are planned |
| Future processing | Isolated background workers, queue technology pending |

### API and media identity

The sample lesson ID is `alx-transforming-africa`, the media ID is `alx-africa-intro-v1`, and the current content version is `1`.

```text
GET /api/v1/lessons/alx-transforming-africa/manifest?version=1
GET /api/v1/lessons/alx-transforming-africa/transcripts/en?version=1
GET /api/v1/lessons/alx-transforming-africa/media/video?version=1
GET /api/v1/lessons/alx-transforming-africa/media/captions?version=1
GET /api/v1/lessons/alx-transforming-africa/exports?version=1
GET /api/v1/lessons/alx-transforming-africa/downloads/zip?version=1
```

OpenAPI is served at `/openapi.json`. The manifest currently describes the preview as `timing-prototype`. Language selection is local to the avatar controls and exported worksheet. Backend translation generation, motion inference and reviewed signing publication remain to implement.

### Local avatar behavior

The original preview used a simple procedural humanoid. It was refined into an original stylized African-woman character with dark skin, coiled hair, a bun and visible hands. Geometry is generated locally through Three.js. Its hand/finger meshes have static shapes, with arm/elbow motion used for clock synchronization. A linguistic handshape library, full articulated finger skeleton and reviewed facial-signing tracks remain to add.

The preview follows the HTML video's current time. Play, pause, seeking and rate changes therefore use the media clock. It supports beside/below placement, reduced motion, hidden-tab handling, lazy loading and disposal on close/disconnect. The persistent interface label identifies its timing-prototype status and language review gap.

The **Avatar sign language** selector offers EthSL and ASL. **Generate avatar preview** opens the local preview. The selection updates language metadata and the caption-to-motion worksheet. Its generated preview currently demonstrates timing, with language-specific signing data awaiting authoring.

### Motion worksheet

The browser can download a JSON worksheet for either target language. Example structure follows, with abbreviated source text.

```json
{
  "schema_version": "1.0",
  "media_id": "alx-africa-intro-v1",
  "source_language": "en",
  "target_sign_language": "ethsl",
  "review_status": "awaiting-translation-and-motion-authoring",
  "character": "African woman",
  "cues": [
    {
      "id": "cue-2",
      "start": 1,
      "end": 9,
      "source_text": "when someone is part of Alx ...",
      "approved_gloss": null,
      "motion_asset": null,
      "non_manual_features": null
    }
  ]
}
```

The `asl` worksheet uses the same cue identity/timing and selects ASL as its target. We want advice on evolving this draft into a validated translation/motion artifact, including source hashes, motion/rig versions, approval identity and transitions.

## Approaches researched or tried

| Approach | What we actually did | Result and remaining work |
|---|---|---|
| Native media plus captions | Implemented against the supplied MP4 and caption export, tested playback and seeking | Working video/transcript foundation |
| Three.js timing avatar | Implemented and refined locally, tested render/synchronization/disposal | Working labeled preview. Language-specific gesture production remains pending |
| Caption-to-motion worksheet | Implemented downloadable EthSL/ASL cue JSON with empty authoring fields | Useful input for reviewers and motion authors |
| Performs hosted workspace | Read primary docs/license, embedded the documented hosted iframe on demand, verified the real page and canvas initialized | Working external authoring workspace. Authored lesson motion and runtime synchronization with this workspace remain pending |
| Performs as a JavaScript library | Inspected documented integration/API and supported formats | Candidate for a tighter integration. Local library/model vendoring and retargeting remain pending |
| SignON-realizer | Reviewed its project documentation and successor relationship | Legacy research reference. Performs is the successor evaluated for use |
| JASigning / SiGML | Reviewed project and developer documentation | Candidate renderer for authored sign descriptions. Licensing, distribution and matching sign dictionaries require further verification |
| MMS Player | Reviewed repository and paper describing Blender-based synthesis | Candidate offline worker or artifact-generation route. Execution and data adaptation remain pending |
| Signapse | Reviewed provider material advertising ASL and BSL | Candidate service for ASL if budget, output access and review fit. EthSL support remains unverified |
| Signa | Reviewed its API documentation for signing/animation output | Candidate service pending explicit EthSL/ASL support, terms, output format and cost verification |
| CESL resource | Reviewed the dataset project description | Recognition-research data lead. A ready lesson-covering text-to-avatar model and usable motion assets remain unverified |
| Other GitHub translators and ASL research projects | Search results surfaced GenASL, SignBridge, Ensat, three.ws, SignAvatars and Neural Sign Actors | Leads only. Their runnable completeness, data rights, coverage and output quality were not validated in this project |

We have yet to train a translation model, extract sign motion from an interpreter, fine-tune a model, integrate a commercial translation API, or produce a reviewed full-lesson sign sequence. Existing ordinary presenter footage shows the source speakers. A useful motion-transfer proposal should identify the signing performance used as its reference.

## Primary sources and specific findings

Performs is MIT-licensed and supports SiGML/BML scripts plus glTF/BVH animation. It documents iframe and JavaScript-library integration. Its supplied gloss dictionary is NGT. It supports custom rigged avatars and configuration through its associated tools. [Repository](https://github.com/upf-gti/performs), [license](https://github.com/upf-gti/performs/blob/main/LICENSE), [API](https://github.com/upf-gti/performs/blob/main/docs/PerformsAPI.md), [settings](https://github.com/upf-gti/performs/blob/main/docs/PerformsSettings.md)

The current embed opens `https://performs.gti.upf.edu/?controls=true&autoplay=false` on user request. It has an accessible iframe title and a separate-tab fallback. Source captions reach that workspace through reviewer authoring. The local application currently has no cross-origin message bridge for lesson timing or translation. [Hosted Performs](https://performs.gti.upf.edu/)

Animics is an associated sign-animation authoring tool. Performs documentation points to Atelier for avatar configuration. Both deserve evaluation for the manual-authoring and retargeting path. [Animics](https://github.com/upf-gti/animics), [Atelier](https://github.com/upf-gti/performs-atelier)

JASigning synthesizes avatar performance from authored SiGML. Its technical documentation is useful for assessing a notation-driven workflow. [Project](https://vh.cmp.uea.ac.uk/index.php/JASigning), [developer documentation](https://vhg.cmp.uea.ac.uk/tech/jas/vhg2021f/devdoc/index.html)

MMS Player is GPL-3.0 software built around Blender and MMS instructions, with export/rendering options. [Repository](https://github.com/DFKI-SignLanguage/MMS-Player), [paper](https://arxiv.org/abs/2507.16463)

The CESL project describes 1,320 videos, 30 sentences and a 65-word vocabulary. Its stated purpose is supporting EthSL recognition. We need to verify download access, consent/license conditions and suitability for production or motion extraction. [Dataset project](https://ethio-artifical.github.io/)

Signapse advertises ASL and BSL. Signa describes a signing API with animation output. Trial/free availability, costs and exact target-language coverage need direct verification. [Signapse](https://www.signapse.ai/), [Signa API](https://usesigna.org/en/docs)

## Integration and review requirements

- Keep the custom-element interface usable by an ordinary HTML host. Load heavy 3D code/assets when requested.
- Retain explicit language identity across translation, motion, review and publication. Provide an independent coverage result for EthSL and ASL.
- Support hands, finger articulation, palms, orientation, movement, facial grammar, gaze and spatial references at the fidelity required by the target sign sequence.
- Preserve meaningful signing duration and transitions. Define handling for a phrase whose signing needs longer than its speech cue.
- Support pause, seek, rate change and re-entry at arbitrary media times with predictable animation state.
- Bind the final performance to the exact lesson, media, course version, reviewed captions, rig and motion assets. Source changes should invalidate dependent review.
- Use server-side credentials for any provider. Give workers validated/allowlisted sources and constrained file/network access.
- Confirm permissions for avatar meshes, motions, datasets, recordings and distribution. Record interpreter consent and the reviewer's approval of the rendered revision.
- Review linguistic meaning and comprehension with appropriate Deaf signers. Automated UI tests can verify control behavior and timing while linguistic validation requires signer review.

## Evidence collected so far

Nine API tests and eleven Chromium browser tests pass locally. They cover media byte ranges, caption parsing, hashes, errors, video play/pause, seeking, caption controls, local-avatar rendering/synchronization, language choice, worksheets and workspace loading/closing.

The live Performs page and its canvas initialized inside the app during a separate networked Chromium check. Automated tests use a controlled response for the external-workspace interaction to avoid depending on network availability.

Axe scans pass on the tested Savanna-style demo with the local avatar closed and open, and a 320 CSS-pixel overflow check passes. NVDA/TalkBack and co-design results remain pending. Comprehension and full-lesson signing accuracy remain unvalidated.

## Questions for the consulting model

1. What free/open-source stack can produce usable ASL motion for this exact lesson, and what is the separate feasible path for EthSL? Give executable repositories/releases and relevant model or motion files.
2. Which candidate actually performs translation, which produces poses/motion, and which renders a supplied representation? Identify the inputs still required from our team.
3. Can Performs render the proposed result on our African-woman avatar? Specify rig, hand bones, facial controls, configuration, retargeting and export requirements.
4. Is there a licensed EthSL lexicon, SiGML/HamNoSys collection, motion dataset or working text-to-sign model that covers enough of the lesson? Explain the evidence and missing vocabulary.
5. Would recording an interpreter and extracting body/hand/face motion be the fastest accurate route? Name the capture and retargeting tools and explain quality risks and manual correction.
6. If suggesting an LLM for glossing, how will its output be checked, and how does a gloss become a precise handshape/location/orientation/movement sequence? Explain unknown words and non-manual grammar.
7. How should captions be regrouped into sign phrases, and how should timing be handled without compressing signs beyond comprehension? Give a worked example from the supplied cue text.
8. What can realistically be delivered before the hackathon using the current stack and budget? Separate a short reviewed demonstration from eventual full-lesson coverage.
9. What artifact schema and tests should we add? Include license provenance, source binding, missing-sign coverage and signer-review results.
10. If a free path is impractical, what specific paid service supports the exact requested language and output? Estimate cost for a 121.5-second lesson and identify what must be confirmed with the provider.

Please return a ranked comparison, a recommended ASL route, a recommended EthSL route, concrete setup steps, a small integration example, required assets/credentials and explicit unresolved gaps. Ground recommendations in primary sources and flag resources you cannot verify. A demonstrated short sequence with a reproducible source and review plan would help us choose the next implementation step.

## Repository map for advisers who receive the code

```text
docs/planning/TRACK_2_IMPLEMENTATION_PLAN.md
docs/architecture/SIGN_AVATAR_WORKFLOW.md
docs/architecture/INITIAL_IMPLEMENTATION.md
docs/setup/EXTERNAL_DEPENDENCIES.md
packages/lesson-component/src/lesson-element.ts
packages/lesson-component/src/media-view.ts
packages/lesson-component/src/timing-avatar.ts
services/core/src/access_core/lessons.py
services/api/src/access_api/main.py
examples/savanna/index.html
examples/assets/savanna.css
tests/integration/savanna-media.spec.ts
example lessons/
```

This brief is self-contained for consultation. The local plan and code provide implementation detail when available. It includes no API credentials, production sessions or participant-identifying review records.
