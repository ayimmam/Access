# Career Gateway voice-navigation evidence

This is public, fictional draft practice, not a recruiting integration. No real employer submission, incentive amount, eligibility decision, account, or contact lookup is implemented. Partner integration and verified eligibility rules need separate review. Optional **Amharic speech through Addis AI** is now implemented behind a private worker; see the [key placement, setup, data limits and Amharic testing guide](ADDIS_AMHARIC_VOICE.md). English still needs no API key.

## Demo and equivalent walkthrough

[Short captioned recording](../evidence/career-voice-demo.mp4) (16 seconds, 0.8 MB). The recording uses **simulated speech recognition and synthesis**, not a real microphone or screen reader. It has visible captions and no audio track. It demonstrates the real host, component, fixture API, saved state and draft UI.

1. Open the Afriwork-style host in **With Access**. Confirm the microphone and **Read prompts and results aloud** stay off even with saved microphone permission. Enable read-aloud if you want the browser voice. With a screen reader, leave it off to keep the guide’s announcements on.
2. Choose **Start voice search** with the keyboard and allow microphone access if prompted. The role question appears. If read-aloud is enabled, the prompt finishes before listening starts. Say **all jobs** (or enter it in **Role or command**). If playback fails, confirm the microphone stays off and use **Listen for a command** to start it directly.
3. The guide announces eleven matches and queues results 1–5: Copywriter, Learning data assistant, CNC bending operator, Junior web developer, Library assistant. Every result uses the same summary as its ordinary card and public JobPosting data.
4. Press **Listen for a command**, then say **save three and four**. The shared shortlist contains `demo-machine-operator` and `demo-web-developer`. This is an add, never an accidental toggle.
5. Say **next** to hear results 6–10. Another Next reaches result 11. Numbers are global within the current filtered search, not renumbered 1–5 on every page. Commands for numbers outside the current page are rejected atomically.
6. Say **shortlist**. Review the operator, then Next for the developer. Back to results restores the prior search/filter selection.
7. Choose **Prepare fictional draft**. Microphone and app speech stop. Type **Demo Candidate**, then **I enjoy testing accessible practice websites.** in the separately requested required fields. Skip optional experience. No profile information is inferred or filled in.
8. Review and edit the supplied information. **Close and discard draft**, **Cancel draft**, or Escape erases the draft without submitting it. Start again to verify the fields are empty.

## Safety and accessibility behavior

- The learner starts recognition explicitly. With `voice-auto-start`, saved microphone permission and read-aloud enabled at Start, the English guide reads each successful response before opening another bounded listening window. Errors, Stop, hiding and permission denial end the loop. Amharic still requires transcript review and does not automatically restart capture. Each request has a 15-second limit. Stop, new commands, filter changes, tab hiding, comparison hiding, page exit and disconnect invalidate pending callbacks. No automatic retry after denied permission.
- Recognition and app synthesis cancel one another; recorded summary playback also stops the guide. In **English**, read-aloud requires the checkbox and prefers an on-device browser voice; another available English browser voice may process the fictional prompt text. **Amharic** uses the separate Addis service and its disclosed retention/billing policy; recognized text requires review before execution.
- Typed commands, native buttons, visible labels, status/error regions and predictable intentional focus transitions are always available. Result pages are not whole-list live regions. Active guided results use one count announcement, rather than duplicating the ordinary card count. App read-aloud defaults off; when enabled, duplicate guide live announcements are disabled. This is a mitigation, **not a tested guarantee** against screen-reader overlap.
- Numbered commands resolve through a snapshot of stable fixture IDs. Changes to ordinary filters cancel capture and require Repeat before accepting new spoken/typed numbers. A late result from an aborted capture cannot save a different listing. Shared saved jobs survive Stop but not a page reload.
- Draft entry uses typed fields or the user's screen reader. It intentionally does not support dictating personal information. Name and introduction are required; relevant experience is optional and skippable. There is no generated biography, contact request, submission button, draft persistence, telemetry event, or draft network request. Draft strings render as text, not HTML.
- Switching to Without Access stops speech/capture and discards the draft; the original comparison is otherwise intact. Eleven fixture jobs preserve the original four IDs, ordering and recordings.

## Automated checks

From a checkout of this branch with its dependencies and browser installed:

```sh
npm run build
uv run pytest
npm run test:browser -- tests/integration/career-gateway.spec.ts tests/integration/career-voice.spec.ts tests/integration/career-amharic.spec.ts
npm run test:vercel-demos
python3 scripts/check_repository.py
bash scripts/check_security_baseline.sh
git diff --check
```

The browser configurations reuse running servers outside CI: ensure those servers serve **this branch**, not an older Docker image. For this run, ignored local configs use API port **8017**, system Chromium, and the original test commands' real fixtures. Host tests route only their localhost API requests to that isolated API, leaving the running port-8000 hands demo untouched. No production endpoint or deployment was changed.

To capture the walkthrough with Playwright's video dependency installed:

```sh
ACCESS_RECORD_DEMO=1 npm run test:vercel-demos -- tests/vercel/career-voice.spec.ts --grep 'captioned simulated'
```

The recording contains fictional fixtures only. The helper banner labels simulated speech, and the guide still executes the real search, stable-ID save and draft actions. Browser speech mocks assert the utterance content/count and capture/synthesis exclusion, but do not make audible output or emulate an assistive technology.

### Original English implementation results

Date: 15 November 2026; commit `ea61039`, before the Amharic extension. Linux; Node 24; Python 3.11; system Chromium. These are historical results, not a claim that new provider/device checks ran. The Amharic guide and updated PR report the extension's validation separately.

| Check | Actual result |
| --- | --- |
| Component typecheck and production build | Passed |
| Full API suite | 45 passed; existing Starlette/httpx deprecation warning |
| Focused career browser suite | 10 passed, including keyboard focus, axe, 320px reflow, stable saves, mocked speech failures and draft privacy |
| Afriwork-style host and comparison suite | 9 passed, including hiding/cancellation and the simulated walkthrough |
| Full integration browser suite | 35 passed, 2 unrelated installer failures; both reproduced on unchanged `origin/main` at `30ebada` |
| Baseline installer comparison | 1 passed, 2 failed on `30ebada`, with the same assertions as the feature branch |
| Repository links/JSON/conflict checks, security baseline, whitespace | Passed |
| Demo recording | Passed; H.264, 1280×900, 16.28 seconds, no audio; representative frames visually inspected |
| NVDA on Windows | **Not run**: no Windows/NVDA test environment available |
| TalkBack on Android | **Not run**: `adb devices -l` found no attached devices |
| Physical microphone, actual speech accuracy and audible native TTS | **Not run**: deterministic browser mocks only |

The full suite is **not green**. Unchanged installer failures: `tests/integration/plug-in.spec.ts:17` overflows at 320px, and the separate-origin generated snippet test at line 45 never finds “Make a learning plan” within five seconds. The baseline used an untouched archive of `30ebada`, the same dependency versions and Chromium, and API port 8019. These are reported, not skipped or repaired in this career PR.

Actual isolated browser commands were `npx playwright test --config artifacts/career.config.ts`, the same config with the two career spec paths for the focused run, and `npx playwright test --config artifacts/career-host.config.ts` for hosts. The ignored configs only replace the API port, Python import path and Chromium executable; the tracked suites add feature coverage, fixture counts and optional isolated-API routing, without relaxing existing assertions. For recording, an identical host config used API 8018 and system ffmpeg through a local Playwright cache path. API validation used `PYTHONPATH=services/core/src:services/api/src:services/worker/src .venv/bin/python -m pytest -q` so it loaded this worktree, not the pre-existing editable installation.

## Required human AT follow-up

Biniyam: NVDA/Windows. Anteneh: Android/TalkBack and UI/privacy. Hailemichael: privacy/security negatives. Record browser, OS, AT and voice versions, input/output settings, task result, unexpected speech, focus location and recovery. Do not call this WCAG conformance or approve the PR on the strength of axe alone.

For **each** NVDA/Chrome or Firefox and TalkBack/Chrome combination:

1. With app Read aloud **off**, run the numbered walkthrough. Confirm role prompt, result count, listening/off states, denial, ambiguity and zero results are announced once, without losing typed/keyboard or touch navigation. Result titles and Save/Details buttons must expose matching names and numbers.
2. In a separate, explicit app Read aloud trial, verify no simultaneous native app utterances or recorded audio. Check whether AT focus announcements still compete with app speech. Turn Read aloud off to recover immediately. If overlap persists, keep app speech off and file the exact reproduction; there is no reliable browser API to detect or mute NVDA/TalkBack.
3. Deny microphone permission. Verify no surprise retry and a fully usable typed path. Try **save**, **save three or four**, **save six and three** on page two, a low-confidence phrase, an unavailable role, and silence. Confirm no unintended save, request or focus jump.
4. While listening, change the ordinary query and then Stop. Check late recognition cannot act. After filters change, Repeat must establish the new numbers. Switch to Without Access or hide the tab: the microphone must switch off.
5. In the shortlist, review each saved title before preparing a draft. Check required-field errors individually, skipped optional content, edit focus, Escape/Cancel and absence of app/microphone speech during fields. Reopen to confirm erasure. Do not record a participant's name, audio, screen, disability disclosure or other private information without separate consent.

Repeat this checklist in Amharic, including transcript review, the Stop/Send distinction, native playback controls, denied recording, service limits and a language change while transcription is pending. Amharic text accuracy and audible Addis output require a native speaker; they are not established by automated tests.

Human review is required before merge. UI/events belong with Anteneh, fixture/API changes with Biniyam, and microphone/draft boundaries with Hailemichael. English and typed Amharic need no deployment, paid service or secret. Live Addis speech is optional, billable and requires the separately configured private worker; no such deployment occurred for the recorded tests.
