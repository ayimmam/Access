# Access Career Gateway host

Static career-discovery demonstration using eleven fictional employers/vacancies, support options, and credential records. It never submits applications or accepts uploads. Optional practice drafts use only voluntarily typed fictional information, remain in memory, and are erased when closed, cancelled, or the component is removed. There is no draft API, storage, analytics, employer integration, or hiring-incentive claim.

## Optional voice navigation

Voice navigation is available only in **With Access**. The **Without Access** comparison keeps its standard search and listings. The host opts in with the `voice-navigation` attribute and sets `voice-paused` when the comparison is hidden, cancelling microphone/speech work and discarding any open draft.

- Choose **Start voice search** to opt in to one microphone response, or **Use typed search**. The browser may send audio to its own recognition provider; Access does not record it. Recognition is never continuous or automatically restarted.
- **Read prompts and results aloud** is off by default, so it does not compete with a screen reader. It uses only an available on-device English voice. While enabled, this guide's live announcements are off; turn it off for NVDA or TalkBack announcements. Speech/provider support is browser-dependent.
- Say/type a role or **all jobs**. Search reuses the existing local filters and resets them for a new guided search. Hear at most five numbered results; use **Next**, **Previous**, **Repeat**, **Details 3**, **Save 3 and 4**, **Shortlist**, or **Stop**. Follow-up listening requires another explicit press. The ordinary search, cards and guide share one saved-job set.
- Review the shortlist one job at a time, then choose **Prepare fictional draft**. Name and introduction are required, asked separately; experience is optional. Draft fields are deliberately **typed only**, with microphone and app speech off, to avoid sending their contents to speech services. Review, edit, or discard; nothing is submitted.

All jobs have equivalent summary text. The original four retain their prerecorded audio; the other seven use the optional on-device read-aloud or the user's screen reader, not broken recording links.

See the [test evidence, demo recording and manual AT checklist](../../docs/setup/CAREER_VOICE_TESTING.md). Automated speech tests use deterministic mocks; they are not evidence of microphone accuracy or NVDA/TalkBack compatibility.

## Host setup

Vercel project settings:

- Root Directory: `demos/career-gateway`
- Framework Preset: Other
- Build Command: empty
- Output Directory: empty

`vercel.json` rewrites `/certificates/:identifier` to the static certificate viewer. For local cross-origin testing, run the Access API on `127.0.0.1:8000` with `http://127.0.0.1:5174` in `ACCESS_ALLOWED_ORIGINS`, then serve this directory on port 5174. The root test command `npm run test:vercel-demos` starts and verifies the required services.

The landing layout, logotype, and mascot reference the [public Afriwork homepage](https://afriworket.com/). The job board layout follows the supplied Sample-Jobs PDF and uses the Access vacancy fixture.
