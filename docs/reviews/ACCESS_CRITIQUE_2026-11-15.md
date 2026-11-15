# Access: accessibility and hackathon critique sheet

Reviewed 15 November 2026, Addis Ababa time. Source revision: `30ebada` (`Codex/lesson accessibility controls (#15)`). Review branch: `codex/accessibility-judging-critique`. This is an assessment and improvement backlog, not a conformance certificate or an implementation change.

## 1. Verdict

**Access has a credible component/API foundation, but the evidence available does not establish a pass at the hackathon accessibility gate.** The most consequential gaps are reviewed EthSL, reviewed Amharic, validated accessible documents, demonstrated unaided use, and alignment between the deployed release and tested source. Fixing these matters more than adding more catalog pages, avatar experiments, or extra-credit features.

The product's strongest demonstrated qualities are real cross-origin embedding, searchable transcripts, keyboard seek actions, honest fictional credential verification, privacy-preserving job filters, and small portable downloads. These are useful foundations worth retaining. The main weakness is that the number of exposed controls exceeds the number of complete, reviewed learner paths.

This review uses disability-specific task perspectives: blind/screen-reader use, low vision, Deaf/Amharic/sign-language access, motor/keyboard access, cognitive load, and constrained connectivity. An agent cannot stand in for lived experience. Browser accessibility-tree inspection and keyboard operations below are **not** NVDA, TalkBack, VoiceOver, Deaf review, or participant usability testing.

## 2. Judging source and priorities

The supplied scoring source was located in Downloads as `DIGITAL_BRIDGE_Accessibility_Hackathon_Opening_Presentation_14_Nov.pptx`, rather than a PDF. Its slide XML was read directly; the deck was not modified or redistributed. The relevant **physical slide numbers** are:

| Slide | Requirement used in this review |
| --- | --- |
| 10 | Track 2: keyboard/screen-reader player; English and Amharic captions with size/color controls; movable/resizable EthSL; audio description; offline audio/text/light HTML; tagged PDF and HTML with image descriptions; accessible job card/audio at 200% zoom; verifiable certificate links. BRF and recorded-session captions/chat are extra credit. |
| 12 | Script embed, REST/OpenAPI, optional open standard; independent installation by a judge within one hour. Ethiopian context includes Ethiopic script, calendar, low-cost Android/3G, offline. |
| 13 | Co-designer involved throughout and using their own device; final task unaided. |
| 14 | Gate before scoring: unaided task with NVDA, TalkBack, keyboard, 200% zoom and sound off; zero serious/critical axe issues; WCAG 2.2 AA conformance report. |
| 15 | 30 works for intended people; 25 adoption; 15 Ethiopia; 15 quality/security/privacy; 15 sustainability. Also references use of the 21 October feedback. |
| 16 | Submission 15 November, 16:30: code, README, Compose and conformance report. This is the deck's stated schedule, not a newly verified organizer extension or live deadline. |

The older [judging plan](../planning/JUDGING_PIVOT_PLAN.md) cites these slides one position earlier. Use the inspected source numbering above. Its correction that BRF/replay are extra credit takes precedence over the older broad mandatory inventory in the [implementation plan](../planning/TRACK_2_IMPLEMENTATION_PLAN.md). Do not spend mandatory-feature time on optional BRF/replay. The implementation plan's security reconciliation still applies: public fixtures are legitimate, ALX identity remains unconfirmed, and architecture proposals are not implemented controls.

**Priority definitions:** P0 = gate or mandatory-path blocker before a claim of submission readiness; P1 = substantial usability/adoption/correctness risk for the next release; P2 = hardening or clarity improvement; P3 = optional enhancement after mandatory paths pass. Effort estimates are rough engineering planning ranges, excluding human-review scheduling: S = hours, M = 1–2 days, L = several days or an external dependency. They are not deadline commitments.

## 3. Evidence and scope

### Live routes inspected

| Route | Observed result |
| --- | --- |
| [Render / Savanna demo](https://access-plugin.onrender.com/) | Loaded ALX source-draft lesson. Skip link focused the main lesson. English source-draft captions only; EthSL unavailable. At 320 CSS pixels document width equaled viewport width. |
| [Ethioware](https://access-ethioware.vercel.app/) | Loaded W3C lesson from Render. Searching `contrast` yielded 3 of 13 passages. Enter on Jump to 0:15 sought to 15.02 seconds and retained button focus. Amharic selection eventually displayed Ethiopic text. Audio-described switch and narrow layout inspected. |
| [Career gateway](https://access-career-gateway.vercel.app/) | Search for `copywriter` yielded one result. Enter opened details with focus on Close. Escape restored trigger focus after results settled; a rapid-search case lost focus, detailed below. Ethiopian calendar displayed Tahsas 6, 2019 AM for the fixture deadline. Width was 320/320 at narrow viewport. |
| [Installer](https://access-plugin.onrender.com/demo/plug-in) | Enter on Install component loaded the text lesson and emitted `alx-media-ready`. This proves the demo mount works, not an independent one-hour installation exercise. |
| [Valid fictional certificate](https://access-career-gateway.vercel.app/certificates/DEMO-LEARNING-001) | Loaded a valid fictional result, course and issue date; explicit non-ALX warning. |
| [Revoked fictional certificate](https://access-career-gateway.vercel.app/certificates/DEMO-REVOKED-001) | Loaded a revoked fictional result. No real credential or learner identity was used. |
| [W3C manifest](https://access-plugin.onrender.com/api/v1/lessons/w3c-colors-with-good-contrast/manifest?version=1) | Public API confirmed pending translations, null sign source and unavailable sign status. |
| [W3C offline pack](https://access-plugin.onrender.com/api/v1/lessons/w3c-colors-with-good-contrast/downloads/zip?version=1) | Downloaded and inspected archive; every declared file hash matched. Included audio, transcripts, captions, prototype PDF/BRF. HTML had no audio links or controls. |

Browser work used the in-app browser's UI, accessibility tree, read-only DOM inspection, and keyboard actions. Initial Chrome capture and browser-connection failures were tooling failures; they are not site downtime findings. Native media controls appeared unnamed in one inspection surface; this is **not classified as a confirmed product defect**, because native-control accessibility depends on browser/AT and the inspection surface.

### Source scope

Reviewed learner and career components, media handling, API routes, lesson/export logic, sign-review validation, demo security routes/store structure, installer/SRI handling, static hosts, Docker/Compose, accessibility/browser/API tests, conformance record and current plans. Worker capture and avatar internals were sampled through their contracts/tests; this is not an exhaustive mathematical/security proof of every line. Original Savanna fixtures, credentials, private sessions and real learner data were not used.

### Limitations that must stay visible

- No disabled participant session, NVDA/TalkBack/VoiceOver run, actual Android device, Braille device or interpreter review was conducted.
- 320-pixel responsive checks are not substitutes for actual 200% text resizing, 400% browser zoom, text-spacing overrides, orientation changes or a full contrast audit.
- No fresh axe scan was run against the live deployments; repository suites scan local test views. A clean local result does not establish the live gate.
- No production login, intrusive exploit testing, load test, cloud configuration inspection, deployment or paid provisioning was performed.
- Downloaded archive structure/hashes were checked; airplane-mode opening and audio use on Android remain untested. PDF/UA correctness remains unverified.
- The deployed commit was not exposed/verified. Visible controls and bundle bytes differ from the freshly built local source; findings explicitly distinguish these scopes.

## 4. Official scoring lens

The deck says a module that fails the gate is not scored. Accordingly, **no invented numeric score is assigned**. The table identifies evidence that would defend each category after the gate passes.

| Category | Weight | Current strengths | Main exposure | Best next evidence |
| --- | ---: | --- | --- | --- |
| Works for intended people | 30 | Search/seek, caption controls, described edition, explicit unavailable states, working job details | Missing EthSL, draft language/content, described-timeline defect, no participant evidence supplied | One complete lesson and career task performed unaided; documented co-designer decisions and retests, including 21 October feedback where applicable |
| Adoption | 25 | Custom element, API, real independent hosts, installer, Compose | Live/source drift, mutable release path, cold-install evidence absent, demo defaults show incomplete lessons | Stranger installs a frozen release on a new origin within one hour using README alone |
| Ethiopia | 15 | Ethiopic caption display, Ethiopian date option, small pack, local filters | Amharic remains unreviewed; English-only surrounding experience; no low-cost Android/3G proof | Reviewed Amharic/EthSL content; actual device/offline task; measured bytes and loading |
| Quality/security/privacy | 15 | Text-based rendering, explicit CORS, version checks, negative tests, fictional zero-PII verifier | Direct sign path bypasses review status; preference retention/isolation; release provenance; incomplete CI evidence | Review-gated assets, current test report, human security review, documented data flow |
| Can be kept running | 15 | Public fixtures avoid learner-time paid inference; locked dependencies; owner plan | Per-request export work, manual content production, no measured operating envelope | Content/review runbook, measured request/export cost, hosting/egress/reviewer budget and rollback evidence |

## 5. Priority register

| ID | Priority | Improvement | Evidence class | Owner | Effort |
| --- | --- | --- | --- | --- | --- |
| A01 | P0 | Deliver real reviewed EthSL | Live + source | Biniyam, Anteneh, interpreter/Deaf co-designer | L |
| A02 | P0 | Complete caption review and learner publication gates | Live + source | Biniyam + language reviewers | M/L |
| A03 | P0 | Produce criterion-level and unaided-task evidence | Repository gap | Anteneh + all owners/co-designers | L |
| A04 | P0 | Match deployed release to reviewed/tested source | Live + bundle comparison | Anteneh | S/M |
| A05 | P0 | Validate required PDF and descriptive documents | Live + source + acknowledged gap | Biniyam + accessibility reviewer | M/L |
| A06 | P1 | Bind transcript seeking to the described timeline | Live + source | Anteneh/Biniyam | M |
| A07 | P1 | Correct caption language and fallback behavior | Live + source | Anteneh | S/M |
| A08 | P1 | Gate direct sign media by exact review approval | Source-confirmed latent risk | Biniyam/Hailemichael | M |
| A09 | P1 | Make offline pack a usable listening/reading entry point | Download + source | Biniyam/Anteneh | M |
| A10 | P1 | Decouple essential playback from export generation | Source | Biniyam | M |
| A11 | P1 | Preserve native/fullscreen caption access | Source; device validation pending | Anteneh | M |
| A12 | P1 | Fix job-dialog focus race during search | Live rapid case + source | Anteneh | S |
| A13 | P1 | Freeze release artifacts and supply independent-install proof | Source + live | Anteneh/Hailemichael | M |
| A14 | P1 | Reconcile CI and conformance evidence with current revision | Repository | Anteneh | S/M |
| A15 | P1 | Lead judging with the most complete single lesson | Live + source | Anteneh | S |
| A16 | P1 | Define preference consent, retention and instance scope | Source | Anteneh/Hailemichael | S/M |
| A17 | P2 | Simplify the course/learner navigation and headings | Live + source | Anteneh + co-designer | S/M |
| A18 | P2 | Make job audio, calendar and certificate sharing coherent | Live + source | Anteneh | S/M |
| A19 | P2 | Establish production and operating-cost boundaries | Source/doc gap | All owners | M/L |
| A20 | P2 | Complete media lifecycle cleanup and failure messages | Source | Anteneh | S/M |
| A21 | P3 | Replace BRF prototype with verified translation | Source | Biniyam + Braille expert | L |
| A22 | P3 | Finish actual recorded-session synchronization | Source | Biniyam/Anteneh | M |

## 6. Detailed findings and acceptance checks

### A01 — P0: EthSL is a missing learner path, not a missing polish item

**Observed:** The deployed W3C manifest has `sign_src: null` and `sign_status: unavailable`; both live learner hosts expose a disabled “EthSL recording awaiting review” control. The live player also offers an avatar sign-language selector, Generate avatar preview and a timing prototype. None establishes comprehensible EthSL interpretation.

**Impact:** A Deaf learner who relies on EthSL cannot complete the intended signed lesson. This is a mandatory Track 2 requirement even though sign interpretation is not an AA requirement by itself. Prototype motion must not be counted as interpretation or as gate evidence.

**Improve:** Choose one short, pedagogically complete lesson, obtain separate recording/publication permission, record fluent interpretation with face/body grammar visible, review with a Deaf co-designer and interpreter, and bind the approved bytes to the lesson revision. Keep motion-authoring tools out of the default learner path.

**Done when:** A Deaf participant follows the lesson unaided, including seek/pause/rate changes and interpreter position/size changes. Record review references, synchronization results and actual phone readability. Sources: [media view](../../packages/lesson-component/src/media-view.ts), [sign contracts](../../services/core/src/access_core/signing.py).

### A02 — P0: Draft captions are publicly selectable, and the default ALX transcript needs repair

**Observed:** W3C Amharic/Tigrigna tracks are explicitly machine-translated-review-pending and are selectable/downloadable. The main Render lesson uses source-draft English with visible broken phrasing, for example “you can't plant a and want to re it tomorrow morning.” This is source text, not an inferred transcription accuracy score.

**Impact:** A sound-off learner or someone reading Amharic may receive incomplete or incorrect meaning. The warnings are honest, but warning labels do not satisfy reviewed-content readiness. Current source exposes drafts in caption controls, MP4 muxing and ZIP exports.

**Improve:** Human-review English timing, punctuation, speech/sound coverage and Amharic wording/line breaks. Store approval per language and source revision; separate reviewer previews from learner-published media. Tigrigna is useful but must not displace mandatory Amharic. Do not invent approvals to unblock the UI.

**Done when:** A reviewer checks the full chosen excerpt against its source; the same approved revisions appear online/offline; changing source invalidates approval. Sources: [lesson definitions](../../services/core/src/access_core/lessons.py) `w3c_lesson`/`example_lesson`, [offline mux](../../services/core/src/access_core/offline_video.py).

### A03 — P0: The gate evidence is not yet a criterion-level conformance report

**Observed:** [WCAG_CONFORMANCE.md](../WCAG_CONFORMANCE.md) is a useful candid summary, but it lists human checks as outstanding and does not provide an applicability/result/evidence row for each relevant A/AA criterion. The accessibility folder directs future evidence collection; no participant task record was established in this review.

**Impact:** A judge cannot infer unaided use from green tests. Missing participant evidence is a gate risk even if all controls look accessible. Absence of evidence here does not prove no co-design occurred elsewhere.

**Improve:** Record tested release/URLs, browser/AT/device versions, task, selected mode, assistance, outcome, barrier, decision and retest. Add criterion status (pass/fail/not tested/not applicable with rationale), scope and evidence. Include consented, anonymized co-designer feedback and how the 21 October feedback affected decisions.

**Done when:** Actual intended users complete the agreed lesson/job task unaided in the required combinations, remaining failures are stated, and serious/critical axe findings are zero on the submitted release and its important states. Use [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for criterion wording. A conformance assertion covers complete pages/processes, not just a component's default view.

### A04 — P0: The deployed component does not match the reviewed source

**Observed:** Live controls include “Generate avatar preview,” ASL selection and “Show 3D timing prototype.” Current source uses “Show 3D hands preview” and removes that learner-facing language selector. The live W3C manifest also omitted the new offline-video fields. After a fresh local build:

| Bundle | Bytes | SHA-256 |
| --- | ---: | --- |
| Live `/components/0.1.0/lesson.js` | 22,001 | `c23e51b622dfe9fb8a26d4ecf9619e8d2b91bfa2dac8af6a4f6f72df8af4339f` |
| Local freshly built `lesson.js` | 28,404 | `550591fab7868632470073fcaf7f91749b900809cda592a244039e225d2a08cd` |

Bytes alone do not identify a Git commit; visible behavior additionally confirms functional drift. **Improve:** Record the intended commit and release manifest, obtain normal human review, deploy through the authorized release process, then run live smoke/axe/keyboard checks. Add safe build identification to release metadata. This audit did not deploy anything.

**Done when:** Submitted URLs, artifact hashes, test report and source commit agree; all three hosts are tested against that same artifact. Anteneh owns release coordination.

### A05 — P0: Tagged PDF is still a prototype; descriptive document content is thin

**Observed:** Live downloads explicitly say PDF verification pending. The conformance record acknowledges missing PDF/UA and screen-reader validation. The exported HTML is a list of timestamp headings and spoken caption paragraphs; it does not carry an integrated description of the visual teaching examples.

**Impact:** A blind learner may get a file that is technically tagged but semantically incomplete. Caption text alone is not evidence of an equivalent descriptive document. Track 2 explicitly requests tagged PDF/HTML with image descriptions.

**Improve:** Author a complete semantic lesson document with meaningful headings and reviewed descriptions of instructional visuals. Validate PDF tags, reading order, language, title, links and font behavior; test the actual file with AT. Keep the prototype label until evidence supports changing it.

**Done when:** The reviewer can read and navigate the exported lesson independently and recover its teaching meaning; validator findings and manual results are attached to the exact export hash. Sources: [export implementation](../../services/core/src/access_core/lessons.py), [PDF generator](../../scripts/generate_accessible_pdf.py).

### A06 — P1: Audio-described playback uses the wrong transcript seek timeline

**Reproduce:** On Ethioware, choose the W3C lesson, search `contrast`, switch to audio-described video, then activate Jump to 0:20. The existing button still passes the standard segment start, 20.92 seconds. The described caption file places the corresponding “Good design…” passage at 31.32 seconds. The UI's restart warning does not resolve this mapping error.

**Cause:** [lesson-element.ts](../../packages/lesson-component/src/lesson-element.ts) around line 206 closes over original segments. [media-view.ts](../../packages/lesson-component/src/media-view.ts) lines 274–293 swaps media/captions only; `seek` around line 353 clamps against the original duration. The standard segment fallback can also display an unrelated line in a gap on the described timeline.

**Improve:** Model each edition with its own duration, transcript/cues and synchronized assets. Switch the transcript with the edition or map stable semantic segment IDs to edition-specific times. Never fill a described-track gap using standard timings.

**Done when:** Every displayed jump reaches the corresponding spoken passage in each edition, including passages beyond the standard duration; search and focus remain usable across the switch. This affects blind learners and users combining description with captions.

### A07 — P1: Amharic captions inherit English, and fallback can contradict language selection

**Observed:** Read-only live DOM inspection after choosing Amharic found Ethiopic text in `.active-caption`, an empty `lang` on that element and an enclosing lesson with `lang="en"`. Immediately after selection, the box initially displayed the English segment before the selected caption loaded.

**Cause:** The component sets article language from `lesson.language`, while caption updates assign only text. `captionText() || segment?.text` silently substitutes English when the chosen track has no active cue.

**Impact:** Speech pronunciation/language switching may be wrong; a learner may think the requested language is active while reading another. Relevant checks include language of parts (3.1.2) and content equivalence; actual AT pronunciation remains to be tested.

**Improve:** Set caption-region language from the active track; explicitly distinguish loading/unavailable from an intentional gap. Do not substitute a different language without a labeled choice. Use a separate polite status for loading/errors rather than announcing every cue.

**Done when:** EN/AM/TI selections expose matching language metadata, blank cue gaps stay blank, slow/failed track fetches have truthful status, and AT testing confirms supported voice behavior. Source: [media view](../../packages/lesson-component/src/media-view.ts) around lines 203 and 263.

### A08 — P1: Direct EthSL media bypasses the stronger review contract

**Source-confirmed risk, not a deployed leak observed today:** `w3c_lesson()` sets `sign_src` whenever `ethsl.mp4` exists and labels it review-pending. The API `media/sign-video` serves that file if present. The frontend enables interpretation based on `sign_src`, without requiring `sign_status === reviewed`. This differs from the rigorous exact-render approval checks in the separate signing-manifest route.

**Impact:** Merely adding a recording file can publish unreviewed or unconsented interpretation through the direct route. It undermines the team's human-review commitment precisely when an interpreter recording arrives.

**Improve:** Use one approval/consent/version gate for both whole-lesson and segment interpretation. The public API should omit/reject unapproved assets; the UI should defend against unexpected pending status too. Do not rely on a disabled button as authorization.

**Done when:** Tests prove that a present-but-pending recording remains unavailable at both manifest and direct media endpoints, and approved bytes become unavailable after source or file changes. Sources: [lessons.py](../../services/core/src/access_core/lessons.py) lines 195–196; [API media route](../../services/api/src/access_api/main.py); [media-view.ts](../../packages/lesson-component/src/media-view.ts) lines 126–127.

### A09 — P1: The offline pack contains audio but its entry page does not help people find it

**Observed:** The live W3C archive contains `audio.mp3` and `audio-described.mp3`, yet `index.html` has no links or audio controls. The archive is about 944.5 KB as advertised, and declared hashes match. The main ALX pack is roughly 4 KB and contains text/captions rather than the required audio route. The hosted offline-reader entry point is explicitly a placeholder.

**Impact:** A blind or low-literacy learner opening the index must discover files through their file manager to listen. “Download offline pack” suggests a complete experience but does not explain format differences across lessons. A valid hash does not make the pack navigable or verify its authenticity independently.

**Improve:** Add an offline landing page with local audio controls, labeled standard/described choices, content inventory, language/review/version/size, and simple extraction/opening instructions. Include the described transcript. Clearly distinguish a text-only pack from an audio/text pack. Do not call the placeholder a functioning offline library.

**Done when:** On a real low-cost Android phone, the participant downloads, extracts, disconnects and reopens reading/audio unaided; interrupted download is recoverable. Sources: [export_lesson](../../services/core/src/access_core/lessons.py), [offline reader](../../apps/offline-reader/src/main.ts).

### A10 — P1: Export work can delay or disable otherwise usable playback

**Source evidence:** The exports metadata endpoint calls `export_lesson` for every format to calculate sizes/hashes, including constructing/compressing the ZIP. The frontend waits for both manifest and exports using `Promise.all`; a missing PDF or export error can therefore turn a valid lesson into “Lesson unavailable.” Requests have cancellation on lifecycle changes but no elapsed timeout/recovery threshold.

**Impact:** Slow CPUs, cold starts or a broken optional document can block transcript/video access. Repeated visitors regenerate identical artifacts, weakening the low-cost story. No throughput limit was measured; this is a design risk, not a claim that current traffic caused an outage.

**Improve:** Prebuild and hash immutable exports at publication, serve metadata cheaply, and render core content independently of optional export availability. Provide bounded waiting, retry and partial-service status. Include audio/video sizes; their direct links currently lack the size metadata promised by the low-data text.

**Done when:** A failed PDF/ZIP endpoint leaves playback/transcript usable; metadata requests do not regenerate artifacts; slow-network tests show meaningful loading and recovery. Sources: [API exports](../../services/api/src/access_api/main.py) around line 252, [lesson load](../../packages/lesson-component/src/lesson-element.ts) around line 151.

### A11 — P1: Caption presentation needs a native fullscreen/mobile route

**Source evidence:** `syncNativeTrackModes` forces the selected native track to `hidden`, rendering captions in a separate paragraph outside the video. Native text-track changes are forced back to those modes. The inline custom box can work, but it is not inside the video element that native fullscreen presents.

**Impact:** A Deaf learner using native mobile/fullscreen playback may lose the visible captions or find the native caption choice overridden. This is a specific architectural concern requiring device verification, not an observed all-browser failure.

**Improve:** Support a native caption presentation mode or fullscreen the complete accessible player container while preserving operable controls; avoid competing selectors. Test Android and the intended browser explicitly. Caption preferences should remain understandable when moving between modes.

**Done when:** Captions remain visible and selectable in inline, fullscreen and supported mobile playback, with no duplicate text and no forced override of the user's active control. Source: [media-view.ts](../../packages/lesson-component/src/media-view.ts) around lines 255–272.

### A12 — P1: Rapid search can remove the job-dialog return-focus target

**Observed:** Filling `copywriter` and immediately opening the existing matching card, then closing with Escape, returned focus to the page body. Repeating after filtering settled correctly restored focus to View details — Copywriter. This was a rapid automated sequence; do not generalize it to every dialog close.

**Cause:** Search schedules `update` after 200 ms. `update` replaces all cards; the dialog stores the old button as `trigger` and later calls `trigger.focus()`. An outstanding search update can detach that button while the dialog is open.

**Improve:** Flush/cancel pending filtering before opening, preserve keyed card elements, or restore to the current matching button by job ID with a safe results-heading fallback. Protect focus when filtering removes the selected item.

**Done when:** A regression test types and opens within the debounce interval, then Escape returns to a live sensible element; settled behavior continues to pass. Source: [career-element.ts](../../packages/lesson-component/src/career-element.ts) around lines 158–165, 193 and 220. Relevant check: focus order (2.4.3).

### A13 — P1: A version-looking URL is not yet evidence of an immutable install

**Observed/source:** `/components/0.1.0` mounts the current `dist` directory. Rebuilding replaces bytes at that path. Static-host loaders retrieve `integrity.json` from the same service immediately before loading the script; installer snippets contain a concrete SRI value, which is useful, but old snippets can break if the same URL changes. Optional chunks are part of the release and also need retention.

**Impact:** A partner cannot confidently pin, cache or roll back an installation. Fetching a digest alongside a mutable script does not independently establish trusted release provenance. Cross-origin delivery works in the observed demos; a new origin still needs explicit CORS configuration.

**Improve:** Publish a new immutable release directory per changed artifact, retain entry points/chunks, document allowed origins and CSP requirements, and provide a static reviewed integrity manifest. Run a timed installation on a clean external host from documentation alone, including an API client and an offline/failure fallback.

**Done when:** An old pinned snippet continues to load unchanged bytes after a new release, the installer records the correct release, and a stranger completes setup within one hour. Sources: [static mount](../../services/api/src/access_api/main.py), [integrity writer](../../scripts/write-component-integrity.mjs), [host loader](../../demos/ethioware/app.js).

### A14 — P1: Repository checks exist, but current CI enforcement and evidence need reconciliation

**Observed:** This checkout has no tracked `.github` workflow (`git ls-files '.github/*'` returned nothing), while contributor/setup documents describe intended jobs and review protection. This does not prove remote branch protection is absent; it was not inspected. The conformance record reports historical counts of 31 Python/26 integration/6 static-host tests, while this audit ran a newer suite.

**Improve:** Confirm actual GitHub workflows/protection with Anteneh; keep mandatory build/type/backend/browser checks in the reviewed release workflow. Update evidence with commit, command, date, count and scope. Add cases for described timelines, caption language/gaps, review gating and rapid dialog focus. Existing tests must not be weakened to get green results.

**Done when:** PR checks execute on the intended source, human review is recorded, and the release report matches that source. Preserve the distinction between repository hygiene, automated accessibility and human conformance. Sources: [CONTRIBUTING](../../CONTRIBUTING.md), [test suites](../../tests/integration/README.md), [conformance record](../WCAG_CONFORMANCE.md).

### A15 — P1: The default demonstration shows the weakest mandatory-media coverage first

**Observed:** Render `/` opens the ALX marketing video with draft English and no description/sign/PDF. The installer defaults to a synthetic text lesson and does not offer the richer W3C lesson in its observed selection. Ethioware calls W3C a “complete media demo” despite missing reviewed sign/Amharic/PDF. Different entry URLs therefore tell different capability stories.

**Improve:** Choose one primary judge URL and one agreed fully reviewed lesson; carry it through the Savanna host, independent host, API and downloads. Add a concise visible capability/status inventory and links to install/evidence. Replace “complete” until it is accurate. Use the demo to show a learner outcome, then portability, then evidence; do not lead with avatar research.

**Done when:** A first-time judge reaches the chosen task without coaching and sees the same lesson/release across hosts. Keep reconstructed-baseline and public-fixture labels. Sources: [Savanna demo](../../examples/savanna/index.html), [installer](../../examples/plug-in-demo/index.html), [Ethioware](../../demos/ethioware/index.html).

### A16 — P1: Media preferences persist automatically and collide between same-media instances

**Source evidence:** `access:${media.id}:media-preferences` is written to localStorage from caption selection, including initialization, and is not scoped to embed instance. There is a reset action, but no explicit “remember on this device” choice. These are preferences, not authentication tokens; no token-storage leak is alleged.

**Impact:** On shared devices, format/language choices persist unexpectedly. Two instances of the same media share stored defaults across reloads, contrary to the repository's independent-instance guidance. This is also a product/privacy inconsistency with the optional consent model in the separate privacy console.

**Improve:** Default to session-local settings or offer an explicit remember choice with plain retention/reset text. Scope persisted state by lesson and documented instance identity, or deliberately document a user-level sharing model with consent. Keep these choices out of analytics.

**Done when:** Denying persistence writes nothing, resetting removes only intended values, blocked storage is harmless, and two same-lesson embeds have tested documented behavior. Source: [media-view.ts](../../packages/lesson-component/src/media-view.ts) lines 95–119.

### A17 — P2: Navigation and wording add avoidable cognitive work

**Observed:** Ethioware's six course cards precede the practice workspace; titles appear as paragraphs rather than headings. Course durations display bare values such as 9 or 12 without units. Multiple catalog choices lead to shared practice content. Long developer-facing explanations, review tools and repeated “What changed” sections compete with learning controls. The skip link is a positive existing escape route.

**Improve:** Make “Start practice lesson” prominent, use card headings and duration units, explain shared sample content before navigation, and put author/reviewer tools on a separate page. Use a small number of learner actions: watch/read/listen/save. Keep required limitation labels adjacent to the affected action, with detailed engineering explanation available separately.

**Done when:** A low-literacy/cognitive-access participant can explain which lesson they opened and choose the needed format without facilitator translation. Test headings navigation and narrow layouts with large text. Sources: [Ethioware markup](../../demos/ethioware/index.html), [media view](../../packages/lesson-component/src/media-view.ts).

### A18 — P2: Career features work, but labels and sharing need completion

**Observed:** Default Deadline calendar says “All” although it means Gregorian; Ethiopian conversion worked. Live page copy says optional on-device reading, while the component offers prerecorded synthetic English audio. Certificate pages correctly distinguish fictional validity but do not offer an obvious copy-verification-link action. The demo cannot establish real ALX credential interoperability.

**Improve:** Label Gregorian/Ethiopian explicitly, align audio descriptions with actual prerecorded behavior, add accessible copy/share-link feedback and a recoverable verification retry, and document how an approved issuer URL will replace the demo. Keep real vacancies/credentials out until authorized contracts exist.

**Done when:** A keyboard/screen-reader user plays/stops a summary, understands the deadline calendar and copies/opens the intended verification link without exposing learner data. Also test 200% zoom and audio failure. Sources: [career component](../../packages/lesson-component/src/career-element.ts), [certificate UI](../../demos/career-gateway/certificate.html), [certificate script](../../demos/career-gateway/certificate.js).

### A19 — P2: Sustainability needs measured costs and a realistic content workflow

**Source evidence:** The service is a public-fixture system; the publishing console and hosted offline reader entry points are placeholders. Strong review rules exist for some sign assets, but there is no completed end-to-end staff publication workflow demonstrated here. Health reports public-fixture process availability, not review completeness, storage health or media readiness.

**Improve:** Document the actual manual ingest/review/publish procedure for the chosen fixture first. Measure export CPU/time, media bytes/egress and human language/interpreter review effort. Give Anteneh a deployment/rollback/budget runbook and Biniyam a content/review runbook. Treat the $100 credit as a budget constraint, not proof of sustainable operations. Confirm ALX identity, enrollment, CSP and ownership before protected rollout.

**Done when:** Another teammate can update one reviewed lesson reproducibly and roll it back; costs are based on measured workload and owner-approved assumptions. Do not add an LLM/queue/PWA/production identity system just to make the architecture diagram look complete. Sources: [publishing stub](../../apps/publishing-console/src/main.tsx), [deployment guide](../setup/DEPLOYMENT_AND_LOCAL_DEMO.md), [API](../../services/api/src/access_api/main.py).

### A20 — P2: Media cleanup and error feedback need targeted hardening

**Source evidence:** Career cleanup cancels speech synthesis but the prerecorded `audio` element is local to render and not explicitly paused in `cleanup`; hide/unmount/reconfigure behavior needs a direct media regression. Player video/caption failures update a note without a dedicated live error status. Audio/direct video downloads lack byte sizes although nearby text says sizes are in the download list. No live failure is asserted for every case.

**Improve:** Own the audio lifecycle explicitly, pause/dispose on removal or mode changes, and announce actionable errors in a polite status region. Show download bytes for each media choice before activation. Avoid autoplay or unnecessary focus movement during recovery.

**Done when:** Start audio, hide/remove/reconfigure the component, and verify silence; inject failed media responses and verify a screen-reader-accessible recovery message without losing transcript access. Sources: [career cleanup](../../packages/lesson-component/src/career-element.ts), [media events](../../packages/lesson-component/src/media-view.ts).

### A21 — P3: BRF is an optional unsafe-to-rely-on prototype, not verified Braille

**Source evidence:** `braille_ready_file` uses a hand-written character mapping and substitutes unknown characters with spaces. It flattens split whitespace and wraps words without a demonstrated full pagination/device profile. It is honestly labeled review pending but is exposed in public downloads and packs.

**Impact:** A Braille user must not rely on this as a correct equivalent lesson. Silent substitution can lose meaning. Extra-credit presentation should not imply transcriber approval.

**Improve after mandatory work:** Use a pinned translator/table and formatter or import an expert-produced BRF; reject unsupported symbols; preserve semantic breaks and reviewed table/image descriptions. Record encoding, cells/line, lines/page and device results. Keep unapproved output in the reviewer path.

**Done when:** A Braille expert approves exact bytes and a user reads them on the intended device. Do not substitute English transliteration for Amharic Braille. Source: [BRF function](../../services/core/src/access_core/lessons.py) around lines 224–254.

### A22 — P3: Recorded-session replay is searchable sample text, not full synchronization

**Source evidence:** Ethioware's replay code filters static entries and announces a count. It does not implement media-time binding or jump-to-time behavior. Its fictional labeling is appropriate.

**Improve after mandatory work:** Bind sanitized/consented chat entries and captions to an actual recording, offer explicit time jumps, retain focus and allow autoscroll to be disabled. Keep names/private messages out of public fixtures unless publication consent exists.

**Done when:** Searching and activating a chat item seeks to the correct recording time; seeking updates context without flooding a live region. Source: [Ethioware app](../../demos/ethioware/app.js) around lines 89–97.

## 7. Recommended work sequence

1. **Freeze the evidence target:** agree the primary URL, lesson, source commit and exact release artifact; label current unavailable mandatory features. Resolve A04/A15 before presenting local results as deployed results.
2. **Finish content with people:** reviewed English/Amharic, consented/reviewed EthSL, descriptive HTML/PDF. This is the largest external dependency; schedule it ahead of optional UI work.
3. **Repair the blocking paths:** described timeline, caption language/fallback, direct sign publication gate, usable offline index and essential-content/export separation.
4. **Retest with intended users:** keyboard, sound off, NVDA, TalkBack, zoom and their actual device. Record unaided/assisted/blocked outcomes accurately and implement agreed changes before retesting.
5. **Verify adoption and release:** one-hour stranger install, immutable bundle/chunks, cross-origin failure recovery, current CI/human review and fresh deployed checks.
6. **Then improve extra credit:** Braille and real replay only after required paths and gate evidence are ready.

Do not interpret this ordering as authorization to deploy, incur costs or bypass review. This task produced a critique only.

## 8. Verification record

| Check | Result in this audit | Scope/qualification |
| --- | --- | --- |
| Initial branch/tree | Clean `main` at `30ebada`; created focused critique branch | No unrelated changes present initially |
| `npm run typecheck` | Passed | Current component source |
| `.venv/bin/python -m pytest -q` | 45 passed, one Starlette/httpx deprecation warning | Local API/security tests; no production authorization claim |
| `npm run build` | Passed | Fresh local artifacts; lesson entry 28,404 bytes, optional avatar chunk approximately 594.2 KB uncompressed |
| `UV_CACHE_DIR=/private/tmp/access-uv-cache npm run test:browser -- --workers=2` | 31 passed after fresh build | Local integration views, including their axe assertions |
| Browser suite environment recovery | Initial run blocked by cache permissions, next by sandbox port binding; rerun with permitted local-server access passed | Environment failures were not hidden or treated as product defects |
| `UV_CACHE_DIR=/private/tmp/access-uv-cache npm run test:vercel-demos -- --workers=2` | 7 passed | Uses local fixtures, not live Vercel URLs; suite reported one effective worker |
| Live task review | Search, keyboard seek, skip link, described switch, job dialog, calendar, installer and valid/revoked verification exercised | Partial expert review, not an end-to-end participant gate |
| Narrow reflow | Render, Ethioware and career pages each measured 320 CSS pixels document width at 320 viewport | Selected states only; not a full zoom/contrast audit |
| Public offline ZIP | All manifest-listed hashes matched downloaded bytes | Reading/listening on Android still pending |
| `python3 scripts/check_repository.py` | Passed, including the report: 203 repository files | Local links/JSON/credential filenames/conflict markers |
| `bash scripts/check_security_baseline.sh` | Passed | Limited baseline patterns; not a vulnerability or penetration-test certificate |
| Docker clean install / one-hour external installer | Not run | Builds can require dependency/image downloads; no new dependencies installed for this documentation task |
| Human AT/media/PDF/Braille/co-design verification | Not run | Must remain pending, not inferred from automated tests |

The only intended repository deliverable is this Markdown file. No application code, fixtures, dependencies, deployment settings or security controls were changed. Normal human review is still required before merging agent-authored documentation.
