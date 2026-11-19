# Access hackathon judging guide

## Opening

> A learner should be able to find the same lesson passage with the sound off, use audio description, or keep a copy when their connection drops. Access gives an existing learning platform those options through one reusable lesson component. This demonstration uses a public lesson from W3C WAI.

Open `http://127.0.0.1:8000/demo/judging` after starting the local demo. The first task uses **Colors with Good Contrast**, revision 1. Keep the laptop sound off for the first pass. Use the deployed URL only after checking that it serves the same reviewed build and lesson revision. [Local startup and rollback](../setup/DEPLOYMENT_AND_LOCAL_DEMO.md) · [W3C lesson source](https://www.w3.org/WAI/perspective-videos/contrast/).

## Five-minute pitching-day demo

Open the [hosted Savanna page](https://access-plugin.onrender.com/demo/savanna). Verify the hosted release shows **Ask Access** and **Avatar language** before presenting. The backup recording shows the working branch.

| Time | Learner action |
| --- | --- |
| 0:00–1:00 | Use the keyboard throughout. Tab to the skip link and press Enter. Tab to **Ask Access**, open it, and expand the career question in English and then in Amharic. Read the answers and point out the focus indicator. |
| 1:00–2:00 | In the ALX lesson, search for **incredible** and press Enter on **Jump to 0:41**. Play the passage. Show the EthSL pronoun draft, switch to ASL, then Off. Explain the limited coverage and pending review. |
| 2:00–3:15 | Choose **Colors with Good Contrast**. Select Amharic captions, search for **poor contrast** in the English transcript, then show the audio-described edition and its separate timing. |
| 3:15–4:30 | Mark the demo lesson complete. Follow the focused jobs link, search for **data**, and open the fictional Learning data assistant vacancy. |
| 4:30–5:00 | Press Escape and choose **Return to Savanna**. Show the same completed lesson. Invite questions about signing review, independent installation and testing with learners. |

## Three-minute walkthrough

1. **Learn without audio.** Use the skip link, select English captions and search the transcript for `poor contrast`. Press Enter on **Jump to 0:15** and show that focus stays on the button. Play the passage with the sound off. Pause, switch to the audio-described video and show that the same search now has a **Jump to 0:23** result. The captions and transcript jump times follow the selected edition.
2. **Keep learning offline.** Download the ZIP and open its extracted `index.html`. Demonstrate standard audio or audio with description beside the transcript. Have an extracted copy ready for the presentation. The local fixture ZIP was 967 KB. Its manifest records the revision and the SHA-256 hashes of the ten included files.
3. **Move the lesson to another host.** Open the installer from the judging page and select **Install component**. Show `alx-media-ready` with the lesson ID and version, the integrity-checked script snippet and the same manifest in the REST API. If asked about careers, search for `developer`, open the fictional job details and press Escape to return focus. Open the fictional certificate separately to show the public result.
4. **State the remaining requirements.** Reviewed EthSL, human-reviewed Amharic captions, tagged PDF verification, and unaided testing with co-designers and their assistive technology remain open. The hackathon gate remains unverified.

## Questions to prepare for

| Judge and lens | Question to be ready for | Evidence and answer |
| --- | --- | --- |
| Dr. Woinshet Girma Ayansa · Deaf inclusion | Can an EthSL-first learner complete the lesson today, and who has a say in when it is ready? | Reviewed EthSL is unavailable. Show that status next to the player. A Deaf EthSL co-designer and fluent interpreter should agree the technical terms, review the consented recording for meaning and visibility, and evaluate the exact lesson revision on the learner’s own device. Give the Deaf co-designer a release decision and log changes and retests with consent. Written captions are a separate access format. |
| Betel Addisu · engineering and adoption | What does another team need to install and maintain this? | Show the real install, the generated module script, the `alx-media-ready` event and the OpenAPI documentation. A host needs permission to run scripts, an explicitly allowed origin and a compatible content security policy. The public lesson loads without an Access account or inference call. A timed, independent installation on a clean host and an immutable release artifact remain to be demonstrated. |
| Tilahun Bedada · web accessibility and social inclusion | What evidence supports keyboard, screen-reader and low-bandwidth use? | Demonstrate the skip link, caption controls, retained focus, timeline switching and local audio playback. Show the automated browser results and exact scope. NVDA, TalkBack, zoom on real devices and low-cost Android offline playback require recorded human sessions before wider claims. |

For Deaf inclusion, use local sign-language guidance to plan content and co-design. WCAG 2.2 lists prerecorded captions at Level A, prerecorded audio description at Level AA and prerecorded sign language at Level AAA. Track 2 separately requires EthSL, so it remains an open requirement for the submission. [UNICEF ESARO sign-language guidance](https://www.unicef.org/esa/documents/guidance-sign-language-deaf-childrens-education-and-its-use-accessible) · [WCAG 2.2 time-based media criteria](https://www.w3.org/TR/WCAG22/#time-based-media) · [Track 2 judging requirements](ACCESS_CRITIQUE_2026-11-15.md#2-judging-source-and-priorities).

## What would substantiate the next review

| Owner | Evidence to bring |
| --- | --- |
| Biniyam with language reviewers and Deaf co-designers | Approved Amharic captions and consented EthSL, tied to the lesson revision. Check translation, timing, face and hand visibility, seeking and size/position controls. Bring the tagged PDF reading-order and navigation review. |
| Anteneh with disabled co-designers | Have participants find a passage, change formats, and reopen it offline without coaching on their own devices. Record task outcome, assistance, barriers, changes and retests along with browser/AT, zoom, device and connectivity. Include NVDA, TalkBack, keyboard-only, sound-off and low-cost Android tasks. |
| Anteneh and Hailemichael | Time a clean install by someone outside the team. Record the source revision, bundle integrity, allowed origin, rollback, tests and any differences between hosted and local evidence. Have the host owner confirm production identity, enrollment and script contracts before proposing protected content. |

Use the [conformance record](../WCAG_CONFORMANCE.md) for current coverage and gaps, the [co-design and security test notes](../testing/CO_DESIGN_SECURITY_TESTING.md) for demonstration setup, and the [judging plan](../planning/JUDGING_PIVOT_PLAN.md) for the broader adoption and sustainability evidence.
