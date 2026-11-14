# Co-designer testing steps for learning, careers and privacy

Prepared 14 November 2026. Anteneh facilitates, Biniyam supports data/media, and Hailemichael operates security scenarios and records technical failures. The co-designer chooses the device, assistive technology, language/interpreter support and tasks relevant to them.

## Prepare before participants arrive

1. Build and run the reviewed demo. Check `/demo/savanna`, `/demo/ethioware`, `/demo/careers` and `/demo/privacy`. Follow the [security setup](../security/SECURITY_PRIVACY_ARCHITECTURE.md). Run the available API/browser checks and record the commit/build, operating system, browser and device.
2. Create one fictional account per exercise using `uv run python scripts/setup_security_demo.py`. Give the alias/passphrase in a format the participant can paste or use with a password manager. Prepare another browser/device for the same account and a separate fictional account for deletion testing.
3. Arrange an EthSL interpreter and reviewed lesson assets where the participant needs signing. Share the lesson brief and technical terms in advance. The current signing prototype and source captions still need the review described in the implementation plan.
4. Ask the participant how they prefer to communicate and whether they want a support person present. Agree breaks, compensation arrangements and permission for notes. Ask separately for screen/audio/video capture and publication. Let them skip or stop a task.
5. Use anonymous participant codes in notes. Close real accounts and notifications before recording. Keep passwords, cookies, disability details and personal documents out of recordings and notes. Use the fictional job and certificate fixtures.
6. Prepare keyboard-only, NVDA/Chrome or Firefox on Windows, TalkBack/Android Chrome and the relevant actual host/WebView where available. Record versions. Test 200% zoom and a separate 400% reflow pass. Test a real low-cost phone and offline opening where possible.

## How to run each task

Read the goal in ordinary language. Ask the participant to attempt it independently. Observe first. If help is needed, record the barrier and intervention before giving help. Mark that attempt assisted. Ask what they expected, agree a change, and repeat the revised task in the second cycle. Participant preferences and scores remain in their own words.

| Task | Goal to read to the participant | Observe and record |
| --- | --- | --- |
| 1. Enter learning | “Open the practice lesson and find a passage about taking breaks.” | Can they locate controls and search results with their normal tool? Does focus stay predictable? |
| 2. Adjust learning | “Choose a comfortable text size and save the lesson to read later.” | Names/states, download identification, zoom, successful offline reopening. Record format gaps. |
| 3. Switch provider | “Find the same learning tools on the Ethioware demonstration page.” | Discovery, hide/show, lesson selection, consistent behavior and clarity of host/component boundary |
| 4. Find a job | “Find a remote writing role and read what it involves.” | Keyboard/search/filter operation, result announcements, meaningful headings, detail-dialog entry and exit |
| 5. Choose support | “Find roles offering written interview questions.” | Comprehension of support labels and privacy explanation, ability to clear/change filters, no request for medical proof |
| 6. Listen/read | “Use the job summary in the way you prefer.” | Text/audio equivalence, local-voice availability, start/stop feedback, sound-off route. Record missing recorded audio as a gap. |
| 7. Verify a link | “Open the example certificate link and tell us its status.” | Valid/revoked/unknown/unavailable wording, fictional-credential disclosure, return path and shareable URL |
| 8. Sign in | “Open Privacy and sessions and sign in using this fictional account.” | Paste/password manager, show-passphrase control, error understanding and focus, no memory/puzzle burden |
| 9. Choose privacy | “Decide whether you want this account to remember your language and caption size.” | Can they understand both choices and save them? Is the default understandable? Can they change their mind? |
| 10. Understand data | “Find out what is stored, then download your demo data.” | Plain-language explanation, discoverable export and filename, ability to open the JSON with appropriate assistance/tooling |
| 11. Session warning | “Keep working when the session warning appears.” | Warning is discoverable with AT, at least two minutes remain, no focus theft or repeated tick announcements, extension action clear |
| 12. Session ended | “Continue after this session has ended.” | Sign-in recovery, unsaved choices retained for the same account, focus and clear success/error feedback |
| 13. Confirm identity | “Download your demo data when asked to confirm your passphrase.” | Dialog label, paste/show support, cancellation and focus return, choices preserved and successful continuation |
| 14. Shared device | “End the session on the other browser, then end all your sessions.” | Current/other-session distinction, understandable start times, revocation confirmation and recovery |
| 15. Delete data | “Using the disposable account, decide whether to delete it and follow your choice.” | Review dialog, Keep account first, safe cancel, explicit final action and successful deletion message |
| 16. Recovery | “Try again after a connection failure or a request to wait.” | Plain next steps, retained input, readable wait interval, no permanent lockout or challenge puzzle |

Participant-facing tasks should use terms they understand. Explain a task goal when asked and record the assistance. Avoid coaching the control sequence during an unaided attempt.

## Facilitator security scenarios

Use the local fictional account you created. Replace `practice-learner` with its alias. Run these in the repository terminal while the participant uses `/demo/privacy`. The helper modifies only local demo session times for that alias and exposes no debug HTTP endpoint.

### Warning with sufficient time

```sh
uv run python scripts/security_demo_scenario.py warning --alias practice-learner
```

Ask the participant to select Check session, then continue the task. The helper sets the remaining idle allowance to at most 125 seconds. The warning should appear after approximately five seconds, leaving about two minutes. Observe the announcement and extension action. Extension still respects the 12-hour cap. Use a newly signed-in account for this exercise.

### Expired session and retained choices

Ask the participant to choose a caption size without saving it. Then run the expiry scenario and ask them to select Check session.

```sh
uv run python scripts/security_demo_scenario.py expiry --alias practice-learner
```

They should reach sign-in, paste the fictional credential, and find their unsaved choice preserved. A different account must load its own preferences. Explicit sign-out clears retained private controls.

### Recent authentication

```sh
uv run python scripts/security_demo_scenario.py reauthentication --alias practice-learner
```

Ask the participant to download their data. Cancel once and observe trigger-focus return, then repeat and confirm. The session cookie rotates on success. The participant should not need to handle a token manually.

### Revocation

Sign the same fictional account into two independent browser contexts. In the first, revoke the other browser's session. In the second, select Check session and verify sign-in is required. Repeat with End all my sessions. Hailemichael checks replay rejection separately using automated tests, keeping cookie values out of participant materials.

### Rate-limit recovery

Ask permission to demonstrate a short wait. Hailemichael makes five failed attempts for a disposable alias on the local instance, then tries once more. Observe the plain error and `Retry-After` behavior. Let the interval elapse and retry. Give the participant a valid separate account for their main tasks. Record shared-network behavior as a deployment test, since the current thresholds are single-host demo settings.

### Network and unavailable services

Use browser network tools on the local demo to interrupt a preference request, then restore connectivity. Check that retry preserves the entries and does not claim a failed write succeeded. For a read-aloud-unavailable device, verify that the equivalent text and explanation remain usable. A facilitator can demonstrate verification unavailability with the browser network tools, then restore the route.

## Engineering checks alongside the session

Hailemichael verifies Secure/HttpOnly/SameSite/host-only cookie flags, CSRF/Origin rejection, expiry, replay, foreign-session isolation, account deletion, encrypted preferences, rate-limit concurrency and bounded request bodies through automated tests. Browser storage inspection should show session credentials confined to the HttpOnly cookie. Check CSP/no-store/framing behavior on the deployed target. Keep these technical checks out of the participant's task burden.

Run axe on the actual rendered state, including open dialogs, and record all serious/critical findings. Manually inspect NVDA/TalkBack output, keyboard focus, 200% zoom and 400% reflow. Test the preferred-language option and record that the current privacy console's interface text is English. Check reduced motion/high contrast and readable error states where applicable.

## Record each attempt

| Field | Entry |
| --- | --- |
| Anonymous participant code, consent choices | |
| Build/commit and date | |
| Device, OS, browser and assistive technology/version | |
| Task and expected result | |
| Outcome — unaided, assisted, blocked or skipped | |
| Barrier and exact help given | |
| Participant's words and suggested change | |
| Screenshot/speech evidence reference, if consented | |
| Owner and proposed fix | |
| Second-cycle build and retest result | |

Finish by asking which barriers matter most, agreeing fixes and explaining how the team will report back. Let participants remove identifiable notes or recordings under the agreed consent process. Complete the organizer's gate using actual task results. Keep pending human/device checks visible in the WCAG conformance report and the [implementation plan](../planning/TRACK_2_IMPLEMENTATION_PLAN.md).
