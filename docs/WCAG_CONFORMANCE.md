# WCAG 2.2 AA conformance record

Last updated: 15 November 2026

## Scope and status

This document records evidence for the public-fixture demonstration routes and the two static Vercel demo sites. It is not a claim that Access, ALX Savanna, Ethioware, or the Career Gateway fully conforms to WCAG 2.2 AA. ALX production authentication and protected course integration are outside this scope.

Routes exercised by the browser suites include `/demo/savanna`, `/demo/independent`, `/demo/ethioware`, `/demo/careers`, `/demo/plug-in`, `/demo/privacy`, the fictional certificate route, and the local Ethioware and Career Gateway static sites.

## Automated evidence

On 15 November 2026, the repository checks produced:

- 31 passing Python API and security tests.
- 26 passing Playwright integration tests against the FastAPI demonstration.
- 6 passing Playwright tests against the two Vercel-site fixtures.
- No critical or serious axe-core findings in the tested views using the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `wcag22aa` rule tags.
- Passing horizontal-reflow assertions at a 320 CSS-pixel viewport for the Ethioware and Career Gateway demo sites.

The automated checks cover named controls, semantic headings and regions, transcript search, caption selection, caption display preferences, visible keyboard focus, dialog focus containment, Escape-key close and focus restoration, component installation/fallback behavior, and privacy/session workflows.

Automated testing cannot establish WCAG conformance by itself. The commands used for this record are:

```text
UV_CACHE_DIR=/private/tmp/access-uv-cache uv run pytest -q
npm run build
npm run test:browser
npm run test:vercel-demos
```

## Media and equivalent formats

The `Colors with Good Contrast` public fixture includes W3C source video and English captions, Hasab AI Amharic and Tigrigna caption drafts, an audio-described edition, audio-only downloads, a searchable transcript, and an offline pack with file hashes. The translated caption tracks are labeled `machine-translated-review-pending`; they are not represented as human-reviewed.

The PDF export is a tagged prototype with document language, title metadata, marked content, and a logical structure tree. It has not been validated as PDF/UA by a human screen-reader tester or a dedicated PDF/UA validator. The BRF export is an uncontracted English prototype and has not been approved by a Braille transcriber.

The player contains synchronization, pause-on-buffer, docking, and size controls for a future EthSL interpreter recording. The EthSL control remains disabled until the consented interpreter recording is supplied and evaluated by a fluent EthSL interpreter and Deaf reviewer. The 3D avatar remains a timing prototype and is not an EthSL translation.

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
- A Braille reader or transcriber for the BRF file.
- A PDF/UA specialist or equivalent assistive-technology review for the PDF reading order, tags, and navigation.
- Keyboard-only and low-vision participants on representative mobile and desktop devices, including 400% browser zoom.
- Airplane-mode use of a previously downloaded offline pack and interrupted-download recovery on a constrained connection.

APIs and automated validators may support these reviews, but they do not replace the listed human usability evidence.
