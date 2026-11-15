# WCAG 2.2 AA conformance record

Last updated: 16 November 2026

## Scope and status

This document records evidence for the public-fixture demonstration routes and the two static Vercel demo sites. It is not a claim that Access, ALX Savanna, Ethioware, or the Career Gateway fully conforms to WCAG 2.2 AA. ALX production authentication and protected course integration are outside this scope.

Routes exercised by the browser suites include `/demo/savanna`, `/demo/independent`, `/demo/ethioware`, `/demo/careers`, `/demo/plug-in`, `/demo/privacy`, the fictional certificate route, and the local Ethioware and Career Gateway static sites.

## Automated evidence

Historical checks recorded on 15 November 2026 produced the following counts; they are not evidence for the current dirty task checkout or deployed URLs:

- 31 passing Python API and security tests.
- 26 passing Playwright integration tests against the FastAPI demonstration.
- 6 passing Playwright tests against the two Vercel-site fixtures.
- No critical or serious axe-core findings in the tested views using the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `wcag22aa` rule tags.
- Passing horizontal-reflow assertions at a 320 CSS-pixel viewport for the Ethioware and Career Gateway demo sites.

The automated checks cover named controls, semantic headings and regions, transcript search, caption selection, caption display preferences, visible keyboard focus, dialog focus containment, Escape-key close and focus restoration, component installation/fallback behavior, and privacy/session workflows.

Current code-remediation evidence and source/artifact limitations are recorded in [ACCESSIBILITY_CODE_REMEDIATION.md](testing/ACCESSIBILITY_CODE_REMEDIATION.md). A clean local scan does not establish the deployed gate. A criterion-by-criterion pending register appears below; no criterion is promoted to conformance by an automated assertion alone.

Automated testing cannot establish WCAG conformance by itself. The commands used for this record are:

```text
UV_CACHE_DIR=/private/tmp/access-uv-cache uv run pytest -q
npm run build
npm run test:browser
npm run test:vercel-demos
```

## Media and equivalent formats

The `Colors with Good Contrast` public fixture includes exact-hash W3C English source captions, edition-specific transcripts, audio-described video, audio downloads and a prebuilt pack with a local listening/reading entry page and file hashes. Amharic/Tigrigna drafts and the ALX source-draft transcript remain unpublished until real revision-bound human approval. Unapproved tracks have no learner URL and their media endpoints reject them; ZIP/MP4 export paths apply the same gate.

The existing PDF and BRF prototypes remain intact for review but are excluded from learner downloads. Reviewed document/PDF/BRF imports have a source/hash/publication gate. No actual PDF/UA, equivalent visual-description document or Braille approval has been supplied by this task.

The player contains synchronization, pause-on-buffer, docking and size controls for an approved EthSL recording. Whole-lesson and segment endpoints require exact-render, consent and Deaf/interpreter approval; source/byte changes invalidate them. Research controls are not in the default learner path. The preview remains a calibration tool, never EthSL translation. Native caption presentation is selectable for fullscreen/mobile, but actual device/AT verification remains pending.

## Keyboard checks represented in the suite

- Interactive controls are reachable by keyboard and expose visible focus.
- Career detail dialogs move focus inside the dialog, close with Escape, and restore focus to the invoking control.
- Privacy reauthentication and deletion-confirmation dialogs restore focus after cancellation.
- Transcript cue buttons seek the lesson video without requiring pointer input.
- Before/after comparison controls expose their selected state with `aria-pressed`.

## Human verification still required

Before making a conformance claim, the team still needs documented testing with:

- Blind screen-reader users using NVDA and TalkBack, including media controls, transcript navigation, downloads, and error recovery.
- An Amharic reviewer for caption wording, timing, line breaks, and reading speed.
- A fluent EthSL interpreter and Deaf reviewer for the interpreter recording and its synchronization.
- A Braille reader or transcriber before offering an optional BRF file; BRF is extra credit, not a mandatory gate blocker.
- A PDF/UA specialist or equivalent assistive-technology review for the PDF reading order, tags, and navigation.
- Keyboard-only and low-vision participants on representative mobile and desktop devices, including 400% browser zoom.
- Airplane-mode use of a previously downloaded offline pack and interrupted-download recovery on a constrained connection.

APIs and automated validators may support these reviews, but they do not replace the listed human usability evidence.

## Criterion register

Scope: complete public demo pages, component states, downloads and lesson/job processes. The relevant normative wording is [WCAG 2.2](https://www.w3.org/TR/WCAG22/). `Not tested` means the necessary whole-page/manual evidence is absent, even where supporting tests exist. Applicability is conservative; the human evaluator must justify any eventual not-applicable result. AAA-only criteria and obsolete 4.1.1 are not included.

| Criterion | Level | Applicability | Current result | Evidence needed or supporting scope |
| --- | --- | --- | --- | --- |
| 1.1.1 Non-text Content | A | Applies | Not tested | Full image/control/visual-teaching alternative review; axe is supporting only |
| 1.2.1 Audio-only and Video-only (Prerecorded) | A | Applies | Not tested | Compare all downloadable audio and equivalent text |
| 1.2.2 Captions (Prerecorded) | A | Applies | Not tested | Full chosen lesson sound/speech/timing review; publication-gate tests only |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | A | Applies | Not tested | Reviewed description/document equivalence |
| 1.2.4 Captions (Live) | AA | Live media not currently offered | Not tested | Human confirm scope; static replay is not live |
| 1.2.5 Audio Description (Prerecorded) | AA | Applies | Not tested | W3C described playback/timeline tests support, not complete meaning review |
| 1.3.1 Info and Relationships | A | Applies | Not tested | AT headings/regions/forms/documents; local axe support |
| 1.3.2 Meaningful Sequence | A | Applies | Not tested | Reading order online and in actual PDF |
| 1.3.3 Sensory Characteristics | A | Applies | Not tested | Instructions independent of visual/audio cues |
| 1.3.4 Orientation | AA | Applies | Not tested | Real phone portrait/landscape |
| 1.3.5 Identify Input Purpose | AA | Applies where personal fields exist | Not tested | Fictional/privacy form applicability and autocomplete review |
| 1.4.1 Use of Color | A | Applies | Not tested | Status/selection without color; contrast/state review |
| 1.4.2 Audio Control | A | Applies | Not tested | No autoplay; media stop/hide tests support |
| 1.4.3 Contrast (Minimum) | AA | Applies | Not tested | Full text/state/caption contrast audit |
| 1.4.4 Resize Text | AA | Applies | Not tested | Actual 200% text resizing, not just 320px reflow |
| 1.4.5 Images of Text | AA | Potentially applies | Not tested | Review branding and all visual content |
| 1.4.10 Reflow | AA | Applies | Not tested | 400% browser zoom and full processes; 320px assertions support |
| 1.4.11 Non-text Contrast | AA | Applies | Not tested | Controls/icons/focus/state measurement |
| 1.4.12 Text Spacing | AA | Applies | Not tested | Required spacing overrides without loss |
| 1.4.13 Content on Hover or Focus | AA | Potentially applies | Not tested | Native/host popovers and overlays |
| 2.1.1 Keyboard | A | Applies | Not tested | Native media/full lesson/job tasks; local seek/dialog tests support |
| 2.1.2 No Keyboard Trap | A | Applies | Not tested | All dialogs, native media and fullscreen |
| 2.1.4 Character Key Shortcuts | A | Potentially applies | Not tested | Host/native shortcut applicability and conflicts |
| 2.2.1 Timing Adjustable | A | Applies to session workflows | Not tested | Real expiry/warning/recovery tasks; demo tests support |
| 2.2.2 Pause, Stop, Hide | A | Applies | Not tested | Motion/media with actual users and reduced-motion settings |
| 2.3.1 Three Flashes or Below Threshold | A | Applies | Not tested | Full media/animation flash review |
| 2.4.1 Bypass Blocks | A | Applies | Not tested | Skip/landmark AT use; local skip/axe support |
| 2.4.2 Page Titled | A | Applies | Not tested | Every route/download/state title |
| 2.4.3 Focus Order | A | Applies | Not tested | Complete keyboard paths; rapid-search regression supports |
| 2.4.4 Link Purpose (In Context) | A | Applies | Not tested | AT link lists and error/fallback context |
| 2.4.5 Multiple Ways | AA | Applies to multi-page scope | Not tested | Host navigation/search applicability and reachability |
| 2.4.6 Headings and Labels | AA | Applies | Not tested | AT navigation and cognitive usability; semantic card tests support |
| 2.4.7 Focus Visible | AA | Applies | Not tested | Full controls/states; real high-contrast review |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Applies | Not tested | Sticky header/dialog/zoom focus visibility |
| 2.5.1 Pointer Gestures | A | Potentially applies | Not tested | Native media and any gesture alternatives |
| 2.5.2 Pointer Cancellation | A | Applies | Not tested | Down/up/cancel behavior across controls |
| 2.5.3 Label in Name | A | Applies | Not tested | Voice-control label/name review; axe support |
| 2.5.4 Motion Actuation | A | Not currently offered | Not tested | Human confirm no motion-only operation |
| 2.5.7 Dragging Movements | AA | Potentially applies | Not tested | Interpreter/media positioning alternatives |
| 2.5.8 Target Size (Minimum) | AA | Applies | Not tested | Full target/spacing/exceptions at supported devices |
| 3.1.1 Language of Page | A | Applies | Not tested | Page/document language and AT voice |
| 3.1.2 Language of Parts | AA | Applies | Not tested | EN/AM/TI language metadata tests support; actual pronunciation pending |
| 3.2.1 On Focus | A | Applies | Not tested | No unexpected context changes in all states |
| 3.2.2 On Input | A | Applies | Not tested | Filtering, edition switching and focus predictability |
| 3.2.3 Consistent Navigation | AA | Applies | Not tested | Complete host navigation across pages |
| 3.2.4 Consistent Identification | AA | Applies | Not tested | Shared controls/actions across hosts |
| 3.2.6 Consistent Help | A | Potentially applies | Not tested | Identify and review repeated help mechanisms |
| 3.3.1 Error Identification | A | Applies | Not tested | AT input/media/export/auth errors and recovery |
| 3.3.2 Labels or Instructions | A | Applies | Not tested | Language/form/remember/download instructions with participants |
| 3.3.3 Error Suggestion | AA | Applies | Not tested | Recoverable failures and form advice |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Applies to deletion/data changes | Not tested | Human review of confirmations and reversibility; no real job application |
| 3.3.7 Redundant Entry | A | Potentially applies | Not tested | Complete draft/privacy process review |
| 3.3.8 Accessible Authentication (Minimum) | AA | Applies to privacy demo | Not tested | Password manager/paste/cognitive task and AT use; ALX auth unconfirmed |
| 4.1.2 Name, Role, Value | A | Applies | Not tested | Actual AT/native media plus every component state; axe support |
| 4.1.3 Status Messages | AA | Applies | Not tested | AT loading/error/filter/share announcements without cue flooding |

Unaided NVDA, TalkBack, keyboard, 200% zoom and sound-off tasks, co-designer decisions/retests, the 21 October feedback record where applicable, and serious/critical axe results on the exact submitted live release remain required before a gate claim. Use [the anonymized task template](../tests/accessibility/TASK_RECORD_TEMPLATE.md).
