# Track 2 accessible learning media implementation plan

Updated 11 November 2026. This is a build plan, not a completed accessibility audit or a claim of conformance.

## Decisions from the November 10 co-design session

Source: [Understanding Accessibility Co-Design Nov 10 Recording.vtt](<../references/recordings/Understanding Accessibility Co-Design Nov 10 Recording.vtt>). The transcript contains recognition errors; the timestamp references below support paraphrases of clear statements. Unclear wording does not establish a technical specification or legal term. Our final product remains the Web Component and REST API described below.

| Session time | Applicable guidance | Implementation or delivery decision |
|---|---|---|
| 00:12:19–00:13:03; 00:57:17–00:57:29 | Early development is explicitly allowed. | Start the component/API integration before the event. Reserve the event for shared decisions, revisions and testing with co-designers. |
| 00:54:22–00:55:35; 01:01:12–01:02:22 | Build for the existing web learning platform and understand its supplied pages. | Deliver the component inside the supplied Savanna concept page, backed by a working API. Mobile access means a usable mobile web experience; a separate mobile app is outside this product's scope. |
| 00:09:25–00:11:11; 00:56:38–00:57:12; 01:00:08–01:02:39 | AI is allowed; explain tool choices, affordability and retain control of the solution. | Keep transcription/translation providers replaceable, support reviewed manual import, document operating costs and ensure team members can explain and modify the implementation. Detailed AI restrictions were deferred at 00:14:41–00:14:57, so general permission does not settle every processing policy. |
| 00:23:09–00:27:25; 00:33:13–00:33:34 | Different users need different accommodations; define whom the product serves and test actual device limits. | Prioritize Track 2 learners and test caption, sign, audio, text and Braille routes with their intended users. Plain instructions, simple steps and small downloads apply across those routes. |
| 00:35:26–00:40:26 | Co-designers share decisions from the start; testing only with developers or asking for final approval is insufficient. | Keep player layout, sign placement, caption presets, download labels and Braille profiles open to co-designer revision. Do not claim one participant represents all disability groups. |
| 00:40:26–00:42:15 | Ask permission for name, photo, voice and story use, including the pitch; collect less and permit skipping or stopping. | Separate participation consent from recording and pitch/publication consent. Use anonymous task notes by default; let participants stop or skip without pressure. Ask preferred communication and description rather than assigning labels. |
| 00:42:53–00:44:26 | Prepare interpreters, share terms, speak directly to the Deaf participant and allow pauses. | Prepare an accessible lesson brief and technical glossary before interpreter time. Agree Ethiopian Sign Language terms and review feedback directly with the Deaf co-designer. |
| 00:44:26–00:47:26 | Repeat ask, sketch, test, fix and retest at least twice before pitching. | Add the two documented co-design cycles below to the delivery sequence and acceptance evidence. |
| 00:57:32–00:59:08 | Working features and understandable scope matter; buttons must perform their stated actions. | Gate the pitch on completed learner tasks and actual API/download results. Missing assets get honest unavailable states, not simulated successful playback or exports. Mandatory missing features remain delivery gaps. |
| 01:14:06–01:16:57 | Use the supplied platform branding and credit the team. | Match the Savanna host with configurable component theme tokens and accessible contrast; include team attribution. Exact licensing/ownership terms still come from written organizer terms. |

Session logistics relevant to planning: the discussion says teams may have three or four members (00:15:45–00:16:07), so the fourth member is not a prerequisite to starting our work. Plan team coverage on both hackathon days; attendance explanations differ between 00:13:03–00:15:45 and 01:09:20–01:09:48, so individual exceptions should be confirmed with organizers. The recording announces awards on November 21 (01:18:39–01:18:52); this does not determine the code/submission freeze. The session does not enumerate the missing 35-feature checklist or provide production API/authentication contracts.

## Decisions from the November 11 drop-in components session

Source: [Building Drop-in Web Components Recording Nov 11 2026.vtt](<../references/recordings/Building Drop-in Web Components Recording Nov 11 2026.vtt>). References below are paraphrases; recognition errors in protocol names and the mixed-language Q&A are not specifications. The quiz examples explain integration architecture, not additional Track 2 quiz requirements.

| Session time | Lesson | Implementation decision |
|---|---|---|
| 00:03:15–00:05:42; 00:24:48–00:26:38 | One core, multiple thin integration interfaces. | Put publication, version selection, entitlement and export rules in shared service logic. The custom element, REST routes and any later LTI adapter reuse it; do not duplicate those rules for each host. |
| 00:05:51–00:10:54 | Custom tag; settings in/events out; immutable releases; no browser secrets; small and accessible. | Ship a prebuilt, framework-independent element with documented configuration/events, an exact release URL, keyboard/screen-reader evidence and measured compressed bundle size. Lazy-load optional media features. Shadow DOM isolates styling, not security. |
| 00:13:52–00:16:34 | Stable APIs, scoped temporary access, consistent errors and usable examples. | Maintain `/api/v1`, publish migration/deprecation guidance before breaking changes, and provide a working independent API client. Partner credentials remain server-side; finalize production identity with ALX. |
| 00:19:54–00:24:41 | Validate LTI launches; optional extensions support content selection, grades and rosters. | Keep LTI conditional. A future adapter must validate signature, issuer, audience, expiry and replay protection before trusting claims. Deep Linking, grade services and roster access each need an explicit use case and authorized platform support. Playback is not a grade. |
| 00:33:45–00:34:24 | Do not build all three interfaces on day one. | Complete the shared core, component and API first; keep an extension boundary for LTI without delaying mandatory accessible media delivery. |
| 00:34:44–00:37:10 | The supplied platform is static HTML/CSS/JS; enhance existing learning content. Scraping is suggested in Q&A. | Use the supplied fixture and approved content import. If needed, implement a narrow fixture parser with source provenance and review; this suggestion does not authorize authenticated crawling or establish a production API. Do not rebuild the curriculum. |
| 00:38:28–00:41:35 | Organizers provide shared co-designers; builders visit their dedicated space. | Anteneh arranges two task/retest visits, accessible briefs and interpreter coordination. Do not assume a permanently assigned co-designer or uninterrupted availability. Maintain shared decisions despite the shared-space arrangement. |
| 00:41:40–00:43:52 | Submit a functional web MVP, team details and explanatory slides; selected teams present November 21. | Package a working hosted URL and self-contained slides for asynchronous review. The session says no Sunday presentation, but slides still accompany submission. Confirm the form and exact deadline separately. A native mobile application is outside scope. |

## Reconciliation with the security documents

Read together: [Security implementation plan](../security/SECURITY_PLAN.md), [original architecture plan](../security/archive/SECURITY_ARCHITECTURE_V2.md), [architecture review](../security/SECURITY_ARCHITECTURE_REVIEW.md), and [revised architecture plan v3.0](<../security/SECURITY_ARCHITECTURE_V3.md>). The review's R-01–R-15 findings and v3.0 controls inform the work below; they are design proposals, not evidence that controls are implemented or audited. This plan uses the following reconciliation where those documents disagree:

- **Identity remains a production dependency.** On 11 November 2026, the user explicitly confirmed ALX has not confirmed authentication. `SECURITY_PLAN.md` previously labeled a Savanna-cookie approach resolved (now corrected), while the architecture documents still request the session-validation contract and this plan previously proposed scoped tokens. Use a server-mediated adapter boundary; obtain ALX's supported identity/enrollment exchange before choosing cookie proxying or scoped browser tokens. Never extract host cookies in JavaScript or assume a shared parent domain grants access. The public fixture demo can proceed independently.
- **Host-origin execution (R-01):** render captions, transcripts and chat as text; sanitize approved rich content at ingestion and restrict permitted URLs. Treat component JavaScript as trusted host-origin code. Pin immutable releases and verify dependency/build provenance; request compatible host CSP. Test malicious inputs in the real embed, including assistive-technology behavior.
- **Authorization and assets (R-02/R-04):** enforce role, assignment, lesson and version scope server-side, including job polling. Return a uniform not-found response for inaccessible resources without disclosing drafts. Separate draft/published storage permissions. Job status contains state and safe recovery metadata; retrieve approved download links through the authorized exports endpoint. Short-lived URLs require accessible expiry/retry handling and must not leak into logs or shared caches.
- **Workers and publication (R-05/R-10/R-14):** restrict fetch destinations, redirects, XML entities and worker egress; isolate non-root conversion jobs with resource limits and pinned dependencies. Staff-authored URLs still need validation. Protect staff mutations against CSRF where cookie authentication is used, and enforce exact-revision approvals server-side. The v3.0 distinct author/reviewer/publisher proposal needs staffing confirmation; do not silently claim separation with one person filling all roles.
- **Sessions and progress (R-03/R-07):** preserve learner position across expiry and provide accessible recovery. Let the server enforce revocation and session lifetime; client activity cannot extend access indefinitely. Treat the proposed 12-hour cap and refresh policy as deployment parameters to agree with ALX. Asset fetches and client progress events do not prove learning or authorize completion; Savanna owns completion policy.
- **Offline and privacy (R-08/R-09):** for packs imported into our hosted reader, verify authenticity and file hashes before rendering, reject tampered packs and retain a valid fallback when available. Keep preferences local and exclude assistive-mode usage, tokens and lesson text from telemetry. Define retention/deletion owners for source files, consent, recordings and operational logs before production; the review's retention periods and takedown SLA need operational agreement.
- **Accessible abuse controls and demo isolation (R-06/R-11/R-12/R-13/R-15):** use account-aware throttling with safe aggregate limits, `Retry-After` and readable recovery; test shared-network learners. Keep independent embeds public for the first demo, isolate demo credentials/data, disable production debug output and retain useful partner API documentation. Staff IdP, recovery, deployment and AI vendor remain configuration decisions, not proven integrations.

Biniyam owns service/storage/worker checks; Hailemichael owns embed, expiry and offline-reader checks; Anteneh coordinates privacy, consent and review evidence, subject to the team assignment confirmation below. Before protected deployment, require negative tests for foreign jobs/drafts, inert malicious text, worker URL restrictions, expiry/logout, throttling recovery and tampered packs. Record results and unresolved risks alongside the accessibility evidence. Do not adopt the security review's residual-risk ratings as achieved outcomes without these checks.

## Co-design process and evidence

Anteneh coordinates co-design with engineering owners participating in both cycles. Before the first meeting, share a short accessible brief in the participant's preferred format, ask about their normal device and assistive tools, agree a manageable session length and arrange interpreter support where needed. Ask how they currently follow a lesson, where they get stuck and how they obtain help. Do not request diagnoses, displacement history or unrelated personal data. Respect organizer compensation/recognition arrangements and report back what changed.

Cycle one happens at the first available co-designer session, before the team locks the learner UI. Walk through a current learning task together, then let the participant choose priorities and try the component prototype on their own device. Use an accessible interactive or verbal prototype when a visual sketch is unsuitable. Observe without coaching during the task attempt, ask what they expected, and agree the next changes. Developers record blockers and implement the agreed revisions.

Cycle two repeats the task on the revised build before the pitch, within the Savanna host and with the real API and downloaded files. Include recovery from lost connectivity or unavailable media. Check whether the change solved the participant's original problem, and ask what they would change next and whether they would use it again. Two cycles are the minimum process target, not a guarantee of accessibility or a substitute for the technical gate. Schedule these before the final afternoon; early work must leave time to change the design.

Use tasks appropriate to each participant rather than asking everyone to test every mode:

- Find and play a lesson, select a preferred caption language and size, then navigate to a relevant transcript passage.
- Enable interpretation, position/resize it, seek and resume while keeping the interpreter and captions usable; review the real signed recording when available.
- Follow the lesson with a screen reader/audio description, reach an image description and understand its teaching point.
- Choose a small offline pack, disconnect and reopen its audio, HTML and text on the participant's phone.
- Download an approved BRF profile and read it using the participant's Braille setup; involve a Braille reader/transcriber for this task.
- Read or listen to a job card at the participant's preferred zoom and share a demo certificate link without another person completing the actions for them.

For each attempt record the build, task, device/browser/assistive tool, chosen mode, observed barrier, outcome, assistance given, agreed change, owner and retest result. Outcomes are completed unaided, completed with help, blocked or stopped by participant. A stopped session is not a participant failure. If help is requested, provide it and record it; do not count the attempt as unaided. Avoid coaching, defending the design or treating a participant's difficulty as their fault. Share the resulting decisions in an accessible format and keep only necessary notes. Record or use identifiable pitch material only with separate explicit permission for that use.

## Confirmed scope and evidence

The final product is an embeddable Web Component backed by our versioned REST API, installed inside existing Savanna lesson pages. Savanna loads the component's JavaScript and supplies its lesson context; the component retrieves reviewed content and export links through our API. The option 2B publishing pipeline produces those resources and provides a supporting staff workflow. The learner experience includes the mandatory accessible player, transcript, offline downloads, accessible documents and career gateway, plus Braille export and recorded session viewing. The user confirms access to the required content production capabilities except an Ethiopian Sign Language interpreter, available during the competition. The supplied `Savanna-static-pages` starter is now available and inspected.

### What the supplied starter establishes

`Savanna-static-pages/README.md` describes three frozen captures from a local development application: paced and self-paced homepages, and a concept page. The application JavaScript and backend are not shipped. `assets/js/static-page.js` recreates selected sidebar, module, week and curriculum-bar interactions; other actions are inert. There is no supplied authentication service, lesson API, publishing service or working completion endpoint. These pages are our host integration fixture; production backend integration still needs an ALX contract.

In `pages/concept-with-navigation.html`, `#curriculum_navigation_content` contains the lesson heading, `.formatted-content .savanna-styles` authored body and a separate Back/Mark as complete section. Use this structure for the first integration. The completion form has an inert action and captured fields; treat captured IDs and tokens as fixture data, never credentials or a production endpoint. The reference text includes nonstandard heading markup and limited image descriptions, so accessibility issues in the host must be recorded separately from component defects.

The same HTML includes authoring help for `::video ID ::`, `::file src: URL ::`, library assets and Chidi InlineChat with `jsUrl`, `cssUrl` and `apiUrl`. This is evidence of a documented embed/configuration pattern in the development capture. It does not prove a generic custom-element authoring tool, a usable content API or support for our proposed tag. Any Savanna editor syntax for our module must be implemented or confirmed by ALX.

The eHub dashboard, two user-supplied Savanna screenshots, and an authenticated lesson in Chrome were observed. Both supplied certificate images were inspected: Freelancer Academy Certificate.png and Professional Foundations Certificate.png. Both print a Savanna certificate authentication URL and QR code. This establishes an existing verification link pattern, not an API, revocation interface, Open Badges implementation or a tested live verification result.

The screenshots show an authenticated ALX Learning course home for Freelancer Academy. A course selector and validated average appear above week tabs and Previous Course Versions. The left navigation includes Access my learning, My courses, Concepts, Conference rooms and Video on demand. A Continue where you left off card previews an Editors Protocol HTML lesson and offers Resume. The second screenshot shows an expanded Ask LEA support panel covering the right side of the page. These are visible navigation and layout facts; they do not establish the underlying routes, media formats, lesson authoring contract, video player behavior or availability of an integration API.

The lesson preview itself says to use an official wrapper and preserve learner text when formatting HTML. Treat this as a content-authoring constraint to investigate with ALX, not proof that the starter exposes that wrapper to our module. The preview could be rendered HTML or an image; inspect the real lesson before choosing an import method.

The current Chrome account shows Data Analytics PF-1: Self-Leadership & Learning Foundations. Its dashboard links directly to a concept lesson under `/concepts/{concept_id}?project_id={project_id}`. The inspected lesson, “Welcome to the Professional Skills Short Courses!”, has a module outline, lesson headings and body text, two embedded Vimeo videos, a separate expandable plain-text transcript for each, a Rive course animation, a Padlet activity, images, and a `Mark as complete` button. One image had a descriptive accessible name; two banner/graphic names were file-like. The first transcript was visible in the accessibility tree when expanded, but the displayed text appeared to contain a truncated word or join. That observation calls for source comparison before reuse; it is not a full transcript accuracy audit. The Vimeo iframe was focusable, but its internal controls were not exposed in the observed parent-page accessibility tree. Caption, audio description and keyboard behavior inside the player remain unverified.

The same account's `/dashboards/videos` page displayed “Video library 0 total” while the concept lesson contained two Vimeo embeds. The `/dashboards/my_curriculums` page displayed individual courses, progress/validated scores and course links. It did not expose a certificate link in the portion inspected. These observations make concept lessons the primary media integration point; Video on demand cannot be assumed to list lesson embeds.

The official brief confirms the accessibility gate, independent installation and additional credit for all three integration levels. It mentions 35 features without enumerating them. The checklist below is our provisional test inventory, not the organizer's missing list. Source: https://digitalbridge.et/index.html

## Final component and API design

The proposed public element is `<alx-accessible-lesson>`. One element represents a lesson and can contain several independently identified media items, transcript/document views, download controls and related career resources. It is a framework-independent custom element, so the same distribution can be used in Savanna and an ordinary external HTML page. React may be used in the staff console, but the host need not install React or rebuild its application to consume the element.

Proposed installation contract for a public demonstration lesson:

```html
<script type="module" src="https://media.example.org/components/1.0.0/lesson.js"></script>
<alx-accessible-lesson
  api-base="https://media.example.org/api/v1"
  lesson-id="demo-va-future"
  content-version="1"
  lang="en">
  <a href="/accessible-lessons/demo-va-future">Read the accessible lesson</a>
</alx-accessible-lesson>
```

The example domain, lesson ID and fallback route are proposed demonstration configuration. The API returns structured data and authorized asset URLs; the script implements the browser UI. Installation therefore needs both the component asset and API access. A REST endpoint alone cannot render the controls inside Savanna.

Publish immutable component releases, a changelog and an upgrade/rollback example. Keep API major versions separate from component releases and lesson content versions; never overwrite a published bundle. Document event payload schemas and dispatch public notifications across the shadow boundary with `bubbles: true` and `composed: true`.

Use open Shadow DOM for component-owned markup and styles, with deliberate CSS custom properties for branding. Validate the selected media library inside that boundary before committing to it. If that library requires document-level selectors or injected global styles, adapt it or select another implementation; preserve a real custom-element public interface. Test accessible names and focus within the shadow root, scalable text, forced colors and fullscreen with the sign window. Do not copy Savanna's Bootstrap, global font bundle or page-level CSS into the component payload.

Derive the default visual theme from the supplied Savanna assets, then validate contrast, focus and text scaling independently. Use plain action labels, short instructions and progressive disclosure for advanced media preferences. Make controls for common tasks easy to find, and provide contextual help that explains unavailable media or downloads and links to the host's approved support route. These are component usability choices to validate with co-designers; they do not require adding a new chatbot.

Define `api-base`, `lesson-id`, `content-version` and `lang` as public configuration. Protected content additionally uses a host-provided asynchronous authorization callback through a JavaScript property. Implement initialization, loading, ready, empty, expired-session, unavailable-asset and retry states with readable fallbacks. On disconnect, stop playback, cancel requests and remove listeners; on context changes, discard old responses. Multiple instances and page/module swaps must not duplicate handlers or share the wrong lesson state.

Emit documented DOM events for readiness, recoverable errors, playback-position changes and download status, using names such as `alx-media-ready` and `alx-media-progress`. Events carry the minimum necessary lesson/media identifiers and state, never tokens or transcript text. They are integration notifications; Savanna remains responsible for deciding whether and how to persist activity. Playback and an event must never directly submit the host completion form.

### API resources and authorization

All following routes belong to our service and are proposed contracts, not discovered Savanna endpoints.

| Resource | Consumer and behavior |
|---|---|
| `GET /api/v1/lessons/{id}/manifest?version=...` | Component retrieves a published, authorized version with media slots, language/review status, documents, exports and related resources. |
| `GET /api/v1/lessons/{id}/transcripts/{language}?version=...` | Component retrieves structured reviewed transcript segments; captions remain separately timed assets. |
| `GET /api/v1/lessons/{id}/exports?version=...` | Lists available HTML, text, audio, PDF, BRF and offline bundles, with size, format, language, review status and download access. |
| `POST /api/v1/lessons/{id}/exports` | Authorized publisher requests a new export job for an explicit version/profile; not an unrestricted learner conversion endpoint. |
| `GET /api/v1/export-jobs/{id}` | Authorized caller polls progress and receives an approved result or actionable error. |
| `GET /api/v1/jobs/{id}` | Supplies the accessible job card, audio summary and matching JobPosting fields. |
| `GET /api/v1/credentials/{id}` | Returns authorized display metadata and the official issuer verification URL; demo records carry an explicit demo status. |
| Authoring routes for drafts, assets, reviews and publication | Staff console only; publish requires per-asset approval for the exact revision. |

Document these resources with OpenAPI, request/response examples and stable error codes. Return an explicit schema version in manifests; distinguish unknown lesson, forbidden content, unavailable language, pending review and expired access. Use immutable content versions and ETags for appropriate public caching; protect personalized/authorized responses against shared caching. Support retries safely and idempotency for export creation. Never publish a signed download URL as if it were a permanent offline resource.

For private lessons, prefer a Savanna server-mediated launch flow: its authenticated backend checks enrollment and obtains a short-lived, lesson-scoped access token from our service, then the component uses that token for API calls. The exact identity exchange must be agreed with ALX because the static starter supplies none. Keep server credentials on servers and browser tokens in memory. Configure explicit CORS origins for cross-origin delivery; CORS alone is not authorization. A same-origin reverse-proxy deployment is an alternative where ALX hosting supports it. Confirm CSP script, connect and media allowances. The static demo uses explicit public fixture lessons, not copied production sessions.

Use our API for the pipeline and learner delivery; connect to Savanna-owned APIs only when documented and authorized. A lesson identifier in the DOM is context, not proof of entitlement. Start content onboarding with an approved upload/export workflow while the production Savanna content connector is pending.

One reviewed lesson version supplies every delivery format. Maintain structured content with stable segment IDs, language, headings, images and descriptions; derive timed captions, full transcripts, documents and Braille from it. Store media files separately with hashes, size, duration, rights, review status and source revision. Avoid separately editing exports that subsequently diverge.

Proposed implementation stack: TypeScript custom element; React staff publishing console; Python FastAPI service with OpenAPI; PostgreSQL metadata; object storage for assets; a background worker for transcription, media conversion and exports. Package the service and worker with Docker Compose. Serve prebuilt component assets independently of the worker. Once published, playback requires no live transcription job; the downloaded HTML/audio/text/BRF pack works without API access.

Use a small host adapter for identity, lesson mapping, authorization, course version and progress. Implement a static-fixture adapter against the supplied pages and a production adapter when ALX confirms identity and content contracts. Bind assets to a course version as well as a lesson ID so Previous Course Versions cannot silently load current captions or interpretation against older media. The starter's React markers describe captured markup; they do not provide runtime React components to import.

The lesson manifest needs one entry per media occurrence, not merely one per concept: the inspected concept contains two distinct Vimeo videos and two transcripts. Map host course/version, concept ID, media slot or stable media ID, source revision, and approved accessible assets. A URL with a Vimeo video ID can identify the source for planning, but access to the master media, subtitle upload, alternative audio and distribution rights still requires confirmation from ALX. An external script cannot safely assume it may control or replace a cross-origin Vimeo iframe.

## Savanna placement based on the starter and observed pages

Create an integration example derived from `Savanna-static-pages/pages/concept-with-navigation.html`. Mount the element inside `#curriculum_navigation_content`, immediately after the authored `.formatted-content` block and before the Back/Mark as complete controls. That initial placement provides accessible alternatives for the text-only VA lesson without pretending its source contains a video. Add an explicitly labeled, team-owned video fixture to exercise the media requirements. In production, ALX can render the element at the intended lesson/media location or add an approved editor renderer; avoid brittle runtime scraping of the entire page.

Use the paced and self-paced homepage captures for compatibility tests involving sidebar collapse, fixed curriculum bars, week switches and module panel replacement. Their `file://` mode is useful for baseline viewing, but serve the integrated demo from localhost with the real local API for network, CORS and module loading checks. Test deployment over HTTPS for the offline library. Keep a pristine reference fixture and an integrated example so host defects and introduced regressions can be compared.

Make the first learner journey: eHub Learning → Savanna course → Access my learning or Resume → concept lesson → accessible player and transcript. The observed route pattern is `/concepts/{concept_id}?project_id={project_id}`; identifiers are host-owned and must come from the starter, not hardcoded from the observed account. Preserve the existing Resume destination and `Mark as complete` behavior; the module must not mark a lesson complete merely because media played. Treat Video on demand as a separate optional surface because the observed library was empty.

Place the player, transcript and downloads inside the lesson's main content area when the starter permits it. Keep global navigation, course selector, week tabs and support access available. Do not add a second large floating control over the existing LEA launcher. If a Savanna sidebar or drawer already occupies the available width, let the sign window dock within the player and keep transcript/caption controls in document flow.

The open LEA panel is a concrete collision case: when it opens, a caption, sign window, player menu, transcript search or download dialog must remain reachable and visible. Test at desktop width and 200% zoom, then on the target phone. The player may reflow or pause and expose a clear Resume action as needed; it must not silently hide controls beneath the panel. Verify keyboard focus order into and out of LEA if host integration permits. Keep this module independent of LEA messaging and content APIs.

Offer offline download beside each concept's media and a whole-lesson pack that includes the reviewed text and image descriptions. Link to it from Video on demand or My courses only if the starter supplies a supported extension point. Neither the screenshot nor inspected course page showed a jobs destination, so place the job card in an explicitly labeled demo career section until ALX designates a genuine Savanna or eHub destination. Keep the certificate share action adjacent to the existing certificate area when integration permits, rather than creating a separate issuer experience.

Level 1: the versioned script registers the custom element; Savanna or the independent host inserts it with explicit lesson context. Provide two elements on one page to test ID and state isolation. Test host CSP, cross-origin assets, focus entry and exit, fullscreen and mobile layout. Protected lessons use the scoped launch flow described above, never a server secret in script markup.

Level 2: implement the `/api/v1` resources and authorization contract defined above. Deliver OpenAPI with error schemas, validation examples and authentication documentation, plus an external client that demonstrates consuming published resources independently of the component.

Level 3: implement schema.org/JobPosting for the job demonstration first, because it can be demonstrated independently of Savanna launch support. Keep visible content and structured data identical. Use a clearly fictional vacancy on a non-indexed demo page. The November 11 training specifically calls LTI 1.3 its third integration level; JobPosting alone is not evidence of that level. LTI 1.3 is conditional on a registered tool and an available LMS test platform/launch contract, which the static starter does not provide; Open Badges 3.0 is conditional on issuer authorization and the actual credential infrastructure. Merely adding fields named after either standard is not conformance.

## Publishing and review

The author uploads an authorized master video, script or source transcript, slides/documents, and image descriptions. For an existing Savanna concept, import its lesson text and each expanded transcript only through an ALX-approved export or authoring interface; compare the imported transcript against the actual media before approving it. The pipeline produces draft timed English captions, Amharic translation, transcript, visual-description script and lightweight media derivatives. The current transcripts are useful source drafts, but they are not visibly timed caption files or descriptive transcripts. Allow reviewed transcript import and manual correction without a paid AI dependency.

Review states are draft, in review, approved, published and superseded. Record approval separately for each language and each asset, with reviewer, date and exact source version. AI output cannot approve itself. A source revision invalidates dependent approvals. Publish an immutable bundle atomically and retain rollback to an earlier reviewed version.

The editorial console must itself work with keyboard and screen reader. Present caption segments as labeled form controls with start/end times, text, speaker and review state. Preview timing, language changes and line wrapping. Validate missing cues, out-of-range times and unintended overlaps; flag rather than automatically reject meaningful simultaneous dialogue.

Do not collect disability diagnoses. Keep processing on the configured host by default, and expose any external processing choice to the content owner. Restrict upload types and size, sanitize HTML/chat/caption inputs, prevent arbitrary server-side URL fetching, and isolate conversion jobs. Limit logs to operational metadata.

## Lesson experience

Evaluate Able Player as the player base against the inspected Vimeo-based lesson before committing. Its documented capabilities make it a useful candidate, but it will need an authorized playable media source and host integration. If ALX supplies only a Vimeo embed, test the available Vimeo player APIs and accessible alternatives, and record any mandatory feature that cannot be delivered in that mode. Do not claim a full replacement player from a surrounding script alone. Provide labeled controls, visible focus, predictable focus return from dialogs, keyboard shortcuts that do not conflict with screen readers, and a searchable transcript with explicit seek actions. Do not announce every moving timestamp or caption through a live region.

Add two integration fixtures to the lesson test page: a long HTML lesson like the visible Editors Protocol preview, and a concept lesson shaped like the inspected PF-1 page with two media slots, two transcript disclosures, an interactive embed, images and a separate completion control. The first tests semantic reading order; the second tests synchronized media, content coexistence and independent media asset mapping. Do not assume that the Editors Protocol lesson contains a video.

English and Amharic captions use reviewed WebVTT, with speaker identification and meaningful sounds. Offer font size, foreground/background color, opacity and reset controls. Supply high-contrast presets. Test Ethiopic glyphs, line breaks and persisted preferences; do not burn captions into the only available video.

Build the Ethiopian Sign Language window now: upload/bind a separate interpretation video; synchronize play, pause, seeks and playback rate; handle buffering and tab visibility; mute the interpretation video's audio. Include drag and resize plus keyboard movement, size presets, docking and reset. Keep the interpreter's face and hands visible and prevent the window from obscuring caption controls. When a required interpretation stream stalls, visibly announce the condition and pause synchronized playback rather than silently continue without it.

Before the competition use a clearly labeled timing test video with a clock, not fabricated interpretation. During the competition, record interpretation of the final approved lesson with the interpreter's consent, review it with the interpreter and Deaf co-designer, and publish only after approval. The implementation may be complete before the content is approved; the required signed lesson cannot be claimed complete until both are ready.

Prepare the lesson script, key terminology, interface actions and intended pauses before the interpreter session. Agree signs for new technical terms, keep the interpreter visible, allow one speaker at a time and address the Deaf co-designer directly. Capture terms that were hard to interpret for revision. Agree permission for recording and for its learner/pitch distribution separately. Interpreter availability for a meeting is not automatically consent to publish their recording.

Produce human-reviewed audio description of teaching information visible but absent from narration. Prefer a recorded described media version for predictable offline behavior. If extended descriptions change duration, generate matching captions and sign synchronization for that timeline. Keep an integrated descriptive transcript as well; text-to-speech of the ordinary transcript alone is not audio description.

## Documents and offline delivery

Generate semantic English and Amharic HTML with correct language metadata, headings, lists, table headers, descriptive links, alt text and long image descriptions where needed. Produce a tagged PDF from a toolchain proven on the representative document. Test reading order, tags, embedded Ethiopic fonts and actual screen reader output. A visually correct PDF or successful print-to-PDF operation does not establish accessible tagging.

Offer independent audio, text and HTML downloads as well as a complete ZIP. Include all necessary local assets and avoid external fonts, scripts and remote calls in the lightweight reader. Test opening extracted files on the actual Android phone; do not assume file:// behavior matches hosted HTML. Also provide an explicitly saved offline library in a first-party HTTPS reader, using a service worker and local storage. An embed on another origin cannot automatically cache or control its host site.

Display size and version before download. Detect missing files, quota failures and interrupted downloads. Include hashes and an index; preserve the last complete version when an update fails. Store progress locally and reconcile explicit events when online, subject to the host's rules. Offline activity must not independently award official completion or certificates.

Proposed test profile, not an organizer requirement: a 10-minute lesson with mono audio at 24–32 kbps, approximately 1.8–2.4 MB before overhead; target a core audio/text/HTML pack under 5 MB. Confirm acceptable audio quality with users. Test at 400 kbps down, 150 kbps up, 400 ms latency and interrupted connectivity, then on a real low-cost Android device. Record exact device, browser, network profile and results. Download video and interpretation only on explicit request.

## Braille export

Make Braille a first-class export of the reviewed full lesson, including image descriptions, headings, activities and essential tables. Provide a learner-facing download selector for language, supported Braille code, contraction grade and output profile. Present only profiles that have actually passed review.

Use a host-side translation and formatting worker. Liblouis is the proposed translator; DAISY Pipeline with a formatter is the proposed pagination layer. Translation and page layout are separate responsibilities. Convert structured content into Braille cells, format lines/pages, then serialize a valid BRF file using the selected device-compatible encoding. A Unicode Braille preview or ordinary text renamed .brf is insufficient.

Start with an English UEB uncontracted profile; select and pin a verified translation table during the implementation spike. Add contracted English only after review. Keep page width, lines per page, duplex settings and encoding configurable; 40 cells by 25 lines may serve as an explicitly provisional demo profile, not an assumed user requirement.

Plan Amharic through the same interface. World Braille Usage has an Ethiopia section, but this research did not establish a validated Amharic table in the chosen Liblouis distribution. Confirm the current local Braille convention with an Ethiopian Braille reader/transcriber. Evaluate a maintained table or implement a versioned table from an authoritative reference, with expert review. Do not substitute English translation or transliteration and label it Amharic Braille. Accept externally transcribed, reviewed Amharic BRF as a publication route while automated translation is being validated.

Record source revision, translator/version, table/version, language/code/grade, layout profile, encoding, checksum and reviewer in export metadata. Fail visibly on unsupported characters, symbols and overflow; never silently omit text. Preserve mixed English/Amharic spans and explicitly review numerals, punctuation, names, URLs and abbreviations. Convert tables to a reviewed linear reading order when spatial layout would be unusable. Mathematical notation requires a supported code and specialist review rather than improvised mappings.

Verify generated BRF against expert-approved examples, structural constraints, line and page lengths and expected encoding. Test on an actual Braille display or embosser with a Braille reader. Back-translation is a diagnostic aid, not proof of correctness. Keep unapproved profiles available to reviewers only. Include approved BRF files in offline downloads.

References: https://liblouis.io/documentation/liblouis/Overview.html ; https://daisy.github.io/pipeline/Get-Help/User-Guide/Braille/ ; https://daisy.github.io/pipeline/modules/braille/html-to-pef/doc/ ; https://liblouis.io/braille-specs/world-braille-usage-third-edition.pdf

## Career gateway and session replay

Build a semantic job card with position, employer, location/remote conditions, deadline, essential criteria and descriptive application link. Provide reviewed prerecorded audio plus equivalent visible text, play/pause and no autoplay. Reflow at 200% zoom and narrow width. Use explicit date locale/calendar labels where relevant and store unambiguous underlying dates.

For genuine credentials, display a readable certificate summary and link to the existing ALX verification URL shown on the supplied certificate. Add an accessible copy-link action; a QR code is supplemental. Do not infer a private API or claim that this module has verified a credential merely because a URL exists.

For the pitch, use a separate synthetic certificate record and verification page, visibly labeled DEMO — NOT AN ALX-ISSUED CREDENTIAL. Demonstrate share, valid-demo, revoked-demo, unknown-ID and unavailable-verifier states. The verification page reads a server-side record; it must not trust query parameters or an uploaded image as proof. Do not copy real signatures into a newly issued demo credential. Use a demo learner, and keep real certificate images local unless publication is separately requested.

For recorded live sessions, reuse the player and attach a time-stamped, sanitized chat log. Provide search and explicit jump-to-time actions. Seeking updates the visible transcript/chat context without moving keyboard focus. Let users disable automatic scrolling; do not announce an entire replaying chat stream. Review names and messages for publication permission and redact private content before export.

## Delivery order and ownership

Implementation sequence: (1) define the manifest/OpenAPI schemas and component public interface; (2) build one working path from custom element to real local API to published fixture assets inside the supplied concept page; (3) add reviewed captions, transcript and sign-window timing controls; (4) connect the staff pipeline and HTML/audio/text/PDF/BRF exports; (5) complete job card, certificate links and session replay; (6) run integration, accessibility and independent-installation checks. Run co-design cycle one at the first opportunity and use its decisions throughout implementation; complete cycle two on the revised integrated build before the pitch. Develop the Braille and tagged-PDF conversion spikes early alongside the first component path because either can reveal toolchain limitations. Early development is explicitly permitted by the November 10 session. Start now while retaining room for co-designer changes and treating the static starter as a frontend fixture.

At kick-off: reconcile the organizer's acceptance list; obtain the production auth, API, CSP, course-version and progress contracts absent from the static starter; confirm the approved custom-element mount or authoring renderer; map each embedded video/transcript occurrence; secure approved Vimeo source assets and rights; test the expanded LEA panel at zoom; implement the production adapter when the needed contract is supplied; confirm written licensing and outstanding AI-processing rules; agree interpreter recording/review and Braille review arrangements. Reserve time for both co-design cycles. Keep schedule commitments relative to the organizer's confirmed submission freeze.

First integrated demonstration: one lesson from ingest through review to publication, player inside the starter, independent script embed, offline pack, accessible job and demo certificate flow. Then complete sign review, Braille proofing and recorded session replay. Prioritize mandatory feature completion and the accessibility gate over additional standards work.

Suggested ownership based on the recommendation: Biniyam owns pipeline/API/exports; Hailemichael owns player/embed/review UI; Anteneh owns source preparation, bilingual review coordination, both co-design cycles and adoption documentation. If a fourth member is assigned, prioritize accessibility verification and integration testing; otherwise distribute those checks across the three members and seek specialist Braille/PDF support. Confirm assignments with the team rather than assuming availability.

Deliver source, reproducible Compose setup, fixtures, sample embeds, OpenAPI, data model, installation guide, content publishing guide, test evidence and WCAG conformance report. A fresh installer should demonstrate setup from documentation. Include content review status, known limitations, maintenance owner and an operating-cost estimate based on measured conversion work, storage and review time.

The handover also includes an anonymized co-design decision log showing both cycles and fixes/retests, an inventory of implemented versus unavailable capabilities, replaceable AI-provider configuration and cost assumptions, and a consent check for any identifiable pitch content. Team members should be able to explain a request from component to API to published asset, change a setting or fix a small issue, and demonstrate actual playback/download/verification behavior without presenting generated output they cannot maintain. Keep all mandatory Track 2 capabilities in scope; an honest unavailable state does not count as fulfilling a missing mandatory feature.

Submission package: include the working MVP URL, team names/contact details, and slides explaining the problem, learner journey, installation, architecture, co-design changes, demonstrated capabilities and limitations. Make slides understandable without a live presenter. Anteneh verifies the organizer form, template and submission freeze; prepare the selected-team presentation for November 21 as announced, without treating that date as the submission deadline.

Additional integration evidence: install the pinned bundle on a clean HTML host without a framework build; demonstrate settings and documented events with two independent instances; verify old pinned releases remain available; exercise the API through a separate client with consistent error responses; measure bundle transfer size and slow-network loading; record the security checks above. These supplement the existing 35 checks rather than replacing them.

## Provisional acceptance inventory

These 35 checks are our planning inventory. They are not presented as the organizer's unpublished 35-feature list.

1. All player actions work by keyboard without a trap.
2. Controls expose correct accessible names, roles and states.
3. Focus remains visible and returns predictably after dialogs.
4. Lesson tasks work with NVDA and the chosen desktop browser.
5. Lesson tasks work with TalkBack on the target Android phone.
6. Reviewed English captions preserve meaningful speech and sounds.
7. Reviewed Amharic captions preserve meaning and Ethiopic text.
8. Caption language switches correctly during playback and seeking.
9. Caption size controls remain usable at zoom and narrow widths.
10. Caption colors/backgrounds and reset work accessibly.
11. Transcript search and seeking work without focus theft.
12. Sign video follows play, pause, seek and playback-rate changes.
13. Sign window moves with pointer and keyboard controls.
14. Sign window resizes, docks and resets without hiding essentials.
15. Interpreter and Deaf reviewer approve the published sign asset.
16. Audio description communicates essential visual information.
17. Alternate media timelines preserve caption and sign alignment.
18. Audio, text and HTML work without network access.
19. Interrupted downloads and quota errors leave a recoverable state.
20. Pack sizes and low-bandwidth/device performance are recorded.
21. HTML preserves language, structure and image descriptions.
22. PDF has verified tags, reading order and usable Ethiopic text.
23. English BRF passes expert samples and device/reader testing.
24. Amharic BRF is reviewed; unsupported output is blocked explicitly.
25. BRF includes descriptive content and valid layout/encoding metadata.
26. Session replay captions and chat synchronize and support search.
27. Job card works at 200% zoom with keyboard and screen reader.
28. Job audio summary has equivalent text and accessible controls.
29. Certificate links can be copied and opened by an employer.
30. Demo verification covers valid, revoked, unknown and unavailable states.
31. Script embed works on an independent site and in multiple instances.
32. OpenAPI describes a working external API integration.
33. JobPosting structured data matches the visible demonstration.
34. The custom element retrieves real API data inside the supplied concept page, survives host layout/panel changes, and passes scoped-access checks in the production adapter or clearly labeled test harness.
35. Unaided tasks pass the published gate; axe has zero serious/critical findings; WCAG 2.2 AA report records all applicable results and limitations.

The official gate is a necessary delivery target; automated scans alone cannot establish conformance. Keep checks pending until evidence exists. A demonstration with an unreviewed required sign track, inaccessible PDF or unusable offline pack is incomplete even if its controls are implemented.

Final product acceptance also requires: the same built component running in the supplied Savanna shell and an unrelated HTML site; working API failure/retry and expired-session states; exact lesson/version/media mappings; no duplicate listeners after unmount/remount; no global Bootstrap conflicts; visible fallback content when script/API access fails; correct authorization across courses and tenants; and complete offline reading with the API disconnected. Report component accessibility and whole-page accessibility separately, then resolve any host issue that blocks the required unaided task with ALX. Do not describe frozen markup plus a local API demonstration as verified production Savanna integration.

Additional host-specific checks informed by the screenshots and live navigation: Resume reaches the same concept with the module installed; each of two videos receives its matching transcript and accessible assets; expanded native transcripts remain available or are replaced by a clearly equivalent reviewed transcript; old course versions resolve matching media bundles; opening Ask LEA does not obscure media or trap focus; player and sign window remain usable alongside the navigation at 200% zoom; the Padlet/Rive embeds have meaningful offline text alternatives; `Mark as complete` remains a host action; and the HTML lesson keeps its heading and reading order after integration. These extend the provisional inventory; they are not organizer features.
