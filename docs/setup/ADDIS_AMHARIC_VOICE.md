# Optional Amharic Career Gateway voice

The **With Access** career guide offers **English** and **አማርኛ (Addis AI)**. English keeps the existing browser recognition and on-device synthesis. Amharic uses Addis Scribe transcription and Addis Voices 2 through a private backend worker. Typed Amharic commands, buttons, job summaries and draft fields work without a provider key. The **Without Access** comparison is unchanged.

The Amharic copy is a draft translation, **not yet native-speaker reviewed**. This is fictional job discovery and application practice, not an employer integration. Application drafts remain typed-only in browser memory; they are never sent to Addis AI or an employer.

## Where the key goes

**Revoke/rotate any key previously pasted into chat. Do not reuse it.** No exposed key was used, copied into configuration, or committed for this integration.

From the checkout containing this feature:

```sh
cp .env.example .env
```

Skip the copy if `.env` already exists; preserve its other settings. Edit the ignored **repository-root `.env`**, not anything in `demos/`, Vercel, HTML, JavaScript, or a `VITE_`/`NEXT_PUBLIC_` variable:

- `ADDIS_API_KEY`: the **new, rotated** provider key.
- `ACCESS_SPEECH_WORKER_TOKEN`: a **different**, randomly generated secret of 32–512 ASCII characters, without spaces. Use a password manager; do not reuse the provider key.
- `ACCESS_SPEECH_DAILY_REQUEST_LIMIT`: optionally lower the default 100 requests per UTC day. The allowed range is 1–200.
- `ACCESS_ALLOWED_ORIGINS`: exact browser origins, including the API-hosted demo and any static host you use. For the usual local setup these include `http://localhost:8000`, `http://127.0.0.1:8000`, and `http://127.0.0.1:5174`. Never use a wildcard.

The checked-in [`.env.example`](../../.env.example) intentionally contains names without secret values. Compose injects the provider key **only into the speech worker**. The API receives only the private-worker URL and its separate token. The static site receives neither credential.

## Docker setup

Follow the [base Docker installation](../../README.md#1-install-docker-and-run-the-project) first. Then enable the optional overlay:

```sh
docker compose -f docker-compose.yml -f docker-compose.speech.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.speech.yml up --build -d
```

Use `config --quiet`: ordinary `config`, environment dumps and `docker inspect` may print credentials. Do not paste their output into an issue or recording.

Open `http://localhost:8000/demo/careers` for the API-hosted example. For the Afriwork-style comparison, serve the static host as described in its [README](../../demos/career-gateway/README.md) and include that exact origin in `ACCESS_ALLOWED_ORIGINS`.

The overlay builds the restricted `speech-runtime` target, without Savanna captures, lesson media, or frontend assets. It publishes **no worker port**. The worker runs non-root with a read-only root filesystem, bounded memory/CPU, a private API network and a separate egress network. Only the aggregate request ledger persists in the `speech-budget` volume. Do not remove that volume to bypass limits. A missing/unwritable ledger fails closed.

The ordinary `docker compose up` path does not enable paid speech. To disable a previously enabled worker, stop the overlay's `speech` service and recreate the API using only `docker-compose.yml`. Keep the quota volume. No production deployment or paid service provisioning is part of this change.

The catalog's `speech_enabled` flag means the API relay is configured, not that a provider key, wallet balance, voice or network connection has been verified. Failures remain explicit and leave the typed path available.

### Native or Render configuration

For native development, run `uv run uvicorn access_worker.speech_gateway:app --host 127.0.0.1 --port 8010 --no-access-log` with the rotated provider key, worker token, and `ACCESS_SPEECH_BUDGET_DB` set to a writable local SQLite path outside tracked source. Run the API separately with `ACCESS_SPEECH_WORKER_URL=http://127.0.0.1:8010`, the same worker token, and the exact allowed origins. Do **not** give the API process `ADDIS_API_KEY`. Uvicorn does not load `.env` automatically in these commands; inject the respective variables through your local process manager.

For a later Render release, Anteneh configures the provider key on a **private** speech service, not the static Vercel site or public API. The approved worker destinations are loopback, `speech`, and `access-speech`, on port 8010. Any different private hostname requires an explicit allowlist review. Coordinate persistent quota storage, costs, matching API/component releases, and rollback with Biniyam and Hailemichael. Do not horizontally scale independent ledgers; first design a shared budget policy.

The static preview still loads the configured Render API/component release; publishing a Vercel preview does **not** publish this branch's speech worker, API or bundle. Local branch tests are not evidence that the hosted preview has Amharic enabled.

## Amharic walkthrough

The demo host opts into `voice-auto-start`. If this origin already has microphone permission, opening **With Access** reads a welcome and the English role question, then starts one bounded listening window. After each successful English command, it finishes reading the response before opening the next bounded window. Errors, Stop, hiding or permission denial end the loop. Say **Amharic** to switch without a pointer. If permission is new, prompt, or denied, capture does not start automatically; **Start voice search** receives focus so Enter can request permission. Amharic keeps its transcript-review step and does not automatically restart recording.

1. Select **አማርኛ (Addis AI)** under **Voice language / የድምፅ ቋንቋ**, or say **Amharic** from the English guide. Leave read-aloud off for NVDA/TalkBack, or explicitly enable it to hear the app voice. Say **እንግሊዝኛ** to return to English. Selecting the language alone does not use the microphone or make a provider request unless read-aloud was already active, in which case the guide preserves the hands-free session and asks the next role question.
2. Choose **በድምፅ ፍለጋ ጀምር** (Start voice search). Say **ሁሉም ሥራዎች** (all jobs), or **የድር ገንቢ** (web developer). Capture is one response, at most 15 seconds. **ቀረጻውን ላክ** sends early; **አቁም** discards unsubmitted audio. The time limit also ends and sends the recording.
3. Review/edit the recognized text and choose **ትእዛዙን አስፈጽም**. Addis's documented completed transcription has no confidence score, so this demo never executes it before confirmation. No LLM interprets or executes commands.
4. With all jobs selected, hear/see the count of eleven and results 1–5. Say **ሶስት እና አራት አስቀምጥ**, review, then run it. The original IDs `demo-machine-operator` and `demo-web-developer` are saved. Ethiopic numbers such as **፫ እና ፬ አስቀምጥ** also work.
5. Use **ቀጣይ** (Next), **ቀዳሚ** (Previous), **ድገም** (Repeat), or **ዝርዝር 3** (Details 3). Numbers stay global within the current filtered result set. Filtering invalidates the old numbers until Repeat; unavailable or ambiguous numbers change nothing.
6. Open **የተቀመጡ ሥራዎች** (shortlist), review one job at a time, and choose **ረቂቅ አዘጋጅ**. Microphone and app speech stop. Fill the separately requested fictional name and introduction, optionally add experience, then review/edit/cancel. Closing erases the draft. There is no submission.

Controls remain available when recording, permission, decoding, networking, quota, or provider synthesis fails. Browser playback restrictions may require pressing Play on the returned Amharic audio control. Stop, manual typing, new commands, changing language, filtering, hiding the comparison/tab, page exit and disconnect cancel pending capture/playback and invalidate callbacks.

## Data, limits and vendor contract

- The browser records locally, converts to canonical mono 16 kHz PCM16 WAV, then sends only that bounded audio and explicit consent to the API. Both services validate the format and actual sample count; caller-supplied duration is not trusted. The limit is 480,044 decoded bytes, with a 641,024-byte pre-parse JSON body cap, including chunked requests.
- Synthesis accepts a strict prompt kind, existing fictional job IDs, count and position — **not arbitrary text, URLs, application fields, voice IDs or provider settings**. The server resolves Amharic copy for up to five results. Audio is capped at 2 MiB and text at 3,000 characters. Browser audio uses revoked-on-stop blob URLs, not provider-signed links.
- Public POST routes require an explicit allowed Origin and use no cookies. This is browser request protection, **not user authentication**. Anonymous users share the limited demo budget; a script can exhaust that budget. The private worker additionally requires its separate bearer token. Both API and worker limit concurrent speech operations to two. The persistent worker ledger reserves requests before provider access, caps 30 per minute, and returns `Retry-After` for minute/day exhaustion. There are no automatic retries.
- Only the worker contacts `https://api.addisassistant.com:443`; the fixed destination, redirect refusal, MIME/encoding checks, socket/deadline bounds and response caps are application controls, not a claimed network firewall audit. The API cannot fetch a caller-selected URL. The worker never follows a returned `audio_url` or forwards keys to an audio host.
- Scribe: `POST /api/v1/scribe/transcribe?language=am&backend=turbo&request_id=…`, `x-api-key`, generated multipart filename, `audio` file. Read only `data.text`. Limit command text to 160 characters.
- Voices 2: discover an available Amharic voice through `GET /api/v1/voice/voices?language=am`; use `POST /api/v1/voice/generations/stream` with `mp3_44100`. Require `X-Addis-Audio-Protocol: mp3-frames-v1`, bounded big-endian length-prefixed audio frames, and final successful JSON completion. Addis currently labels this framed response `text/event-stream`; it is still binary framing, not SSE text or a directly playable MP3. Unexpected JSON replay/URLs fail closed instead of being downloaded. New requests get new IDs; the demo does not silently retry or rebill.
- Access keeps audio/transcripts only in request memory, never in analytics, storage, errors or operational logs. Draft values never leave browser memory. The SQLite ledger stores only UTC day, minute bucket and counts. Worker operational log fields are timestamp, correlation ID, public-demo role, fixed endpoint, status and duration; no bodies, authorization headers or provider errors.
- **Provider retention is different.** Addis documents recoverable completed Scribe results for 24 hours and stored Voices 2 clips. Raw-microphone retention, training use and deletion guarantees were not established by the reviewed docs. Do not claim zero vendor retention or process real applicant data. Once accepted upstream, cancelling/disconnecting may still complete generation and billing; browser Stop cannot undo that.
- The documented prices at inspection were 3.5 ETB/1,000 transcribed characters and 5 ETB/generated audio minute. The request cap is **not a money-denominated spending guarantee**. Use a dedicated low-balance demo account and have the owner verify current pricing, retention and wallet controls before live testing.

Documentation inspected 15 November 2026: [introduction](https://docs.addisassistant.com/docs/get-started/introduction), [Scribe](https://docs.addisassistant.com/docs/capabilities/speech-to-text), [Voices 2](https://docs.addisassistant.com/docs/capabilities/text-to-speech), [stream framing/billing](https://docs.addisassistant.com/docs/capabilities/text-to-speech/streaming), [limits](https://docs.addisassistant.com/docs/platform/limits), and [official frame parser](https://github.com/Addis-AI-Org/addisai-js/blob/main/src/core/voice-frames.ts). A later key-authenticated local check confirmed the Amharic voice catalog and one short role-prompt generation; the credential remained in the ignored local `.env` and was not committed.

## Verification and remaining gates

```sh
npm run build
uv run pytest
npm run test:browser -- tests/integration/career-gateway.spec.ts tests/integration/career-voice.spec.ts tests/integration/career-amharic.spec.ts
npm run test:vercel-demos
python3 scripts/check_repository.py
bash scripts/check_security_baseline.sh
git diff --check
```

Use this branch's API and component, not a previously running Docker image. This run isolates the API on port 8020 with ignored `artifacts/career-amharic.config.ts` and `artifacts/career-amharic-host.config.ts`, system Chromium, and the existing dependencies. The port-8000 hands demo is untouched. Tests simulate capture, transcription and playback; they do not send real recordings to Addis. The host's checked-in Permissions Policy is exercised separately, not presented as verification of deployed headers.

### Recorded results — 15 November 2026

| Check | Recorded outcome |
| --- | --- |
| Build and TypeScript checking | Passed |
| Full API suite with this worktree's sources | **82 passed**; existing Starlette/httpx deprecation warning |
| Focused career browser specs, English and Amharic | **17 passed** |
| Full static-host/comparison browser suite | **13 passed** |
| Full integration browser suite, final build | **42 passed, 2 failed**; details below |
| Captioned Amharic recording scenario | **1 passed**; generated MP4 and representative frames inspected |
| Live Addis voice catalog and role prompt | **Passed**; 19 available Amharic voices and a valid 52,848-byte, 8.808-second mono MP3 through the public API/private worker path |
| Optional Compose configuration and final worker image build | Passed with dummy configuration, no provider requests |
| Isolated worker-container smoke | Passed before the final transport allowlist correction; final image rebuilt afterward |

The full integration suite is **not green**. The installer has a 320px overflow assertion failure at `tests/integration/plug-in.spec.ts:17`, also reproduced on untouched `main` (`30ebada`) during the original English work. The final run additionally timed out waiting for the lesson searchbox at `tests/integration/lesson.spec.ts:63`; that timeout remains untriaged and is not claimed to be a baseline failure. An earlier full Amharic run had 43 passes and only the installer failure. No tests were weakened or skipped. Further test runs stopped at the user's request; these are the recorded outcomes, not a new verification claim.

### Short demonstration

[Watch/download the captioned Amharic MP4](../evidence/career-amharic-demo.mp4) — 14.2 seconds, approximately 1.2 MB, H.264, 1280×900, **silent and explicitly labelled simulated Amharic speech**. It shows searching the 11 fictional listings, the first five results, saving results 3 and 4, paging forward, returning to the shortlist, and reviewing a fictional draft. It records the actual local host/component/API with mocked capture, transcription and playback; it is not a live Addis, microphone or assistive-technology recording.

The [English evidence and manual AT checklist](CAREER_VOICE_TESTING.md) remain relevant. The live TTS route completed, but **still pending:** live microphone/Scribe capture and audible browser playback on target devices, Amharic native-speaker review, Windows NVDA, and Android TalkBack. Addis voice generation is not a substitute for native-speaker translation review. This environment is Linux; no Android device was attached. Browser/axe/mocked-speech results do not validate those items. Biniyam owns backend/NVDA follow-up; Anteneh owns UI/device/deployment coordination; Hailemichael reviews credentials, egress, quotas and data boundaries. Human review is required before merge.
