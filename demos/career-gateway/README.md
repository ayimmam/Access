# Access Career Gateway host

Static career-discovery demonstration using eleven fictional employers/vacancies, support options, and credential records. It never submits applications or accepts application uploads. Optional Amharic microphone recordings go only to the bounded speech endpoint after opt-in. Practice drafts use voluntarily typed fictional information, remain in memory, and are erased when closed, cancelled, or the component is removed. There is no draft API, storage, analytics, employer integration, or hiring-incentive claim.

## Optional voice navigation

Voice navigation is available only in **With Access**. The **Without Access** comparison keeps its standard search and listings. The host opts in with `voice-navigation`; `voice-auto-start` welcomes a returning user and starts one-response listening only when microphone permission is already granted. Otherwise Start voice search receives focus for Enter. The host sets `voice-paused` when the comparison is hidden, cancelling microphone/speech work and discarding any open draft.

- Select **English** or **አማርኛ (Addis AI)**. A returning user with granted microphone permission hears the welcome and role question, then gets one listening window without pointer input. After each successful English command, the guide finishes reading its response before opening the next bounded listening window. Errors, Stop, hiding or permission denial end the loop. First-time or denied permission never starts capture automatically. Choose **Start voice search** or press Enter on its focused button to request one response; **Use typed search** remains available. English recognition uses the browser's provider. Amharic sends a bounded recording through a private Access worker to Addis AI and requires reviewing the recognized text before executing it. Amharic capture is not automatically restarted. Stop discards unsent audio, but cannot undo a provider request already accepted upstream.
- **Read prompts and results aloud** is off by default to reduce competition with a screen reader. English uses an available on-device voice; Amharic uses explicitly opted-in Addis Voices 2. While enabled, this guide's live announcements are off; turn it off for NVDA or TalkBack announcements. Actual screen-reader overlap checks remain pending.
- Say/type a role or **all jobs**. Search reuses the existing local filters and resets them for a new guided search. Hear at most five numbered results; use **Next**, **Previous**, **Repeat**, **Details 3**, **Save 3 and 4**, **Shortlist**, or **Stop**. Follow-up listening requires another explicit press. The ordinary search, cards and guide share one saved-job set.
- Review the shortlist one job at a time, then choose **Prepare fictional draft**. Name and introduction are required, asked separately; experience is optional. Draft fields are deliberately **typed only**, with microphone and app speech off, to avoid sending their contents to speech services. Review, edit, or discard; nothing is submitted.

All jobs have equivalent summary text. The original four retain their prerecorded English audio; all eleven have Amharic guide copy, pending native-speaker review. The original English cards, filtering and saved IDs remain shared and unchanged.

For key placement and Docker setup, follow [Optional Amharic voice](../../docs/setup/ADDIS_AMHARIC_VOICE.md). Put a **rotated** key in the ignored repository-root `.env`, never in this static directory or Vercel frontend variables. Typed Amharic works without a key; provider errors leave buttons and typed controls usable. The checked-in career host policy permits microphone access only to its own origin and blob audio playback; it does not grant microphone permission automatically.

See the [test evidence, demo recording and manual AT checklist](../../docs/setup/CAREER_VOICE_TESTING.md). Automated speech tests use deterministic mocks; they are not evidence of microphone accuracy or NVDA/TalkBack compatibility.

## Host setup

Vercel project settings:

- Root Directory: `demos/career-gateway`
- Framework Preset: Other
- Build Command: empty
- Output Directory: empty

`vercel.json` rewrites `/certificates/:identifier` to the static certificate viewer. For local cross-origin testing, run the Access API on `127.0.0.1:8000` with `http://127.0.0.1:5174` in `ACCESS_ALLOWED_ORIGINS`, then serve this directory on port 5174. The root test command `npm run test:vercel-demos` starts and verifies the required services.

The landing layout, logotype, and mascot reference the [public Afriwork homepage](https://afriworket.com/). The job board layout follows the supplied Sample-Jobs PDF and uses the Access vacancy fixture.
