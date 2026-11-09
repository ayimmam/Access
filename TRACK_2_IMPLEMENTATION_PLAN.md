# Track 2 accessible learning media implementation plan

Updated 9 November 2026. This is a build plan, not a completed Savanna audit or a claim of conformance.

## Confirmed scope and evidence

Build the content publishing pipeline recommended as option 2B, together with the mandatory embeddable lesson player, offline reader, accessible documents and career gateway. Include Braille export and a recorded session viewer. The user confirms access to the required content production capabilities except an Ethiopian Sign Language interpreter, available during the competition. Starter code is pending.

The eHub dashboard and two user-supplied Savanna screenshots were observed, but an individual lesson or video player was not inspected. Both supplied certificate images were inspected: Freelancer Academy Certificate.png and Professional Foundations Certificate.png. Both print a Savanna certificate authentication URL and QR code. This establishes an existing verification link pattern, not an API, revocation interface, Open Badges implementation or a tested live verification result.

The screenshots show an authenticated ALX Learning course home for Freelancer Academy. A course selector and validated average appear above week tabs and Previous Course Versions. The left navigation includes Access my learning, My courses, Concepts, Conference rooms and Video on demand. A Continue where you left off card previews an Editors Protocol HTML lesson and offers Resume. The second screenshot shows an expanded Ask LEA support panel covering the right side of the page. These are visible navigation and layout facts; they do not establish the underlying routes, media formats, lesson authoring contract, video player behavior or availability of an integration API.

The lesson preview itself says to use an official wrapper and preserve learner text when formatting HTML. Treat this as a content-authoring constraint to investigate with ALX, not proof that the starter exposes that wrapper to our module. The preview could be rendered HTML or an image; inspect the real lesson before choosing an import method.

The official brief confirms the accessibility gate, independent installation and additional credit for all three integration levels. It mentions 35 features without enumerating them. The checklist below is our provisional test inventory, not the organizer's missing list. Source: https://digitalbridge.et/index.html

## Product and integration design

One reviewed lesson version supplies every delivery format. Maintain structured content with stable segment IDs, language, headings, images and descriptions; derive timed captions, full transcripts, documents and Braille from it. Store media files separately with hashes, size, duration, rights, review status and source revision. Avoid separately editing exports that subsequently diverge.

Proposed stack, to validate against the starter: TypeScript embeddable component; React publishing console; Python FastAPI service with generated OpenAPI; PostgreSQL metadata; object storage for assets; a background worker for transcription, media conversion and exports. Package the service and worker with Docker Compose. Preserve a static manifest delivery option so playback is not dependent on a live processing service.

Use a small host adapter for identity, lesson mapping, authorization, course version and progress. Define its interface before the starter arrives; use a plainly identified local demonstration host. When the starter arrives, implement its actual mount point and authentication contract. Do not infer its framework or inject changes into undocumented production pages. Bind assets to a course version as well as a lesson ID so Previous Course Versions cannot silently load current captions or interpretation against older media.

## Savanna placement based on the screenshots

Make the first learner journey: eHub Learning → Savanna course → Access my learning or Resume → a real lesson → accessible player and transcript. Preserve the existing Resume destination and host progress behavior; the module must not mark a lesson complete merely because media played. Confirm whether an ordinary lesson, Video on demand item or both may host the player. The screenshot supplies labels and layout, not route contracts.

Place the player, transcript and downloads inside the lesson's main content area when the starter permits it. Keep global navigation, course selector, week tabs and support access available. Do not add a second large floating control over the existing LEA launcher. If a Savanna sidebar or drawer already occupies the available width, let the sign window dock within the player and keep transcript/caption controls in document flow.

The open LEA panel is a concrete collision case: when it opens, a caption, sign window, player menu, transcript search or download dialog must remain reachable and visible. Test at desktop width and 200% zoom, then on the target phone. The player may reflow or pause and expose a clear Resume action as needed; it must not silently hide controls beneath the panel. Verify keyboard focus order into and out of LEA if host integration permits. Keep this module independent of LEA messaging and content APIs.

Offer offline download from the lesson surface and, if the starter supports it, the related Video on demand or course list item. The screenshot does not show a jobs destination, so place the job card in an explicitly labeled demo career section until ALX designates a genuine Savanna or eHub destination. Keep the certificate share action adjacent to the existing certificate area when integration permits, rather than creating a separate issuer experience.

Level 1: a versioned script mounts an accessible component from a published lesson manifest. Provide two embeds on one page to test ID and state isolation. Namespace styles or use an isolated player frame with an accessible title. Test host CSP, cross-origin assets, focus entry and exit, fullscreen and mobile layout. Protected lessons use an authorized host session or scoped short-lived launch flow, never a secret in script markup.

Level 2: implement documented REST resources for lessons, manifests, review jobs, exports and job cards. Authoring and publishing require role-based authorization. Export operations return a job ID and status; downloads reference immutable versions. Include error schemas, validation examples, authentication documentation and a working external client in OpenAPI. Proposed routes include GET /v1/lessons/{id}/manifest, POST /v1/lessons/{id}/exports, GET /v1/export-jobs/{id}, and GET /v1/jobs/{id}.

Level 3: implement schema.org/JobPosting for the job demonstration first, because it can be demonstrated independently of Savanna launch support. Keep visible content and structured data identical. Use a clearly fictional vacancy on a non-indexed demo page. LTI 1.3 is conditional on starter support; Open Badges 3.0 is conditional on issuer authorization and the actual credential infrastructure. Merely adding fields named after either standard is not conformance.

## Publishing and review

The author uploads an authorized master video, script or source transcript, slides/documents, and image descriptions. The pipeline produces draft timed English captions, Amharic translation, transcript, visual-description script and lightweight media derivatives. Allow reviewed transcript import and manual correction without a paid AI dependency.

Review states are draft, in review, approved, published and superseded. Record approval separately for each language and each asset, with reviewer, date and exact source version. AI output cannot approve itself. A source revision invalidates dependent approvals. Publish an immutable bundle atomically and retain rollback to an earlier reviewed version.

The editorial console must itself work with keyboard and screen reader. Present caption segments as labeled form controls with start/end times, text, speaker and review state. Preview timing, language changes and line wrapping. Validate missing cues, out-of-range times and unintended overlaps; flag rather than automatically reject meaningful simultaneous dialogue.

Do not collect disability diagnoses. Keep processing on the configured host by default, and expose any external processing choice to the content owner. Restrict upload types and size, sanitize HTML/chat/caption inputs, prevent arbitrary server-side URL fetching, and isolate conversion jobs. Limit logs to operational metadata.

## Lesson experience

Evaluate Able Player as the player base against a representative lesson before committing. Its documented capabilities make it a useful candidate, but the resulting integration still needs testing. Provide labeled controls, visible focus, predictable focus return from dialogs, keyboard shortcuts that do not conflict with screen readers, and a searchable transcript with explicit seek actions. Do not announce every moving timestamp or caption through a live region.

Add two integration fixtures to the lesson test page: a long HTML lesson like the visible Editors Protocol preview, and a video lesson reached through Resume or Video on demand. The first tests semantic reading order and whether the module can coexist with existing lesson content; the second tests synchronized media. Do not assume that the observed Editors Protocol lesson contains a video.

English and Amharic captions use reviewed WebVTT, with speaker identification and meaningful sounds. Offer font size, foreground/background color, opacity and reset controls. Supply high-contrast presets. Test Ethiopic glyphs, line breaks and persisted preferences; do not burn captions into the only available video.

Build the Ethiopian Sign Language window now: upload/bind a separate interpretation video; synchronize play, pause, seeks and playback rate; handle buffering and tab visibility; mute the interpretation video's audio. Include drag and resize plus keyboard movement, size presets, docking and reset. Keep the interpreter's face and hands visible and prevent the window from obscuring caption controls. When a required interpretation stream stalls, visibly announce the condition and pause synchronized playback rather than silently continue without it.

Before the competition use a clearly labeled timing test video with a clock, not fabricated interpretation. During the competition, record interpretation of the final approved lesson with the interpreter's consent, review it with the interpreter and Deaf co-designer, and publish only after approval. The implementation may be complete before the content is approved; the required signed lesson cannot be claimed complete until both are ready.

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

Before kick-off: define manifests and adapter contracts; build the independent demo host; prepare the publishing console, exports and fixture lesson; complete reviewed English/Amharic text and description assets; prepare the sign timing fixture and demo certificate; test Braille conversion and tagged PDF generation early because both can reveal toolchain limitations. Confirm whether pre-event implementation is permitted before treating it as submission code.

At kick-off: reconcile the organizer's acceptance list; inspect starter auth, mount points, APIs, CSP, course-version and progress rules; trace Resume, Access my learning, Video on demand and My courses to actual lesson objects; inspect a representative video lesson, its player and the official HTML wrapper; test the expanded LEA panel at zoom; replace the demo adapter; confirm license and permitted pre-event work; agree interpreter recording/review and Braille review arrangements. Keep schedule commitments relative to the organizer's confirmed freeze, since public schedule versions differed during research.

First integrated demonstration: one lesson from ingest through review to publication, player inside the starter, independent script embed, offline pack, accessible job and demo certificate flow. Then complete sign review, Braille proofing and recorded session replay. Prioritize mandatory feature completion and the accessibility gate over additional standards work.

Suggested ownership based on the recommendation: Biniyam owns pipeline/API/exports; Hailemichael owns player/embed/review UI; Anteneh owns source preparation, bilingual review coordination, co-design tasks and adoption documentation. Allocate the fourth team member or mentor support to accessibility verification, Braille/PDF checks and integration testing. Confirm assignments with the team rather than assuming availability.

Deliver source, reproducible Compose setup, fixtures, sample embeds, OpenAPI, data model, installation guide, content publishing guide, test evidence and WCAG conformance report. A fresh installer should demonstrate setup from documentation. Include content review status, known limitations, maintenance owner and an operating-cost estimate based on measured conversion work, storage and review time.

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
34. Starter integration passes authorization and host compatibility checks.
35. Unaided tasks pass the published gate; axe has zero serious/critical findings; WCAG 2.2 AA report records all applicable results and limitations.

The official gate is a necessary delivery target; automated scans alone cannot establish conformance. Keep checks pending until evidence exists. A demonstration with an unreviewed required sign track, inaccessible PDF or unusable offline pack is incomplete even if its controls are implemented.

Additional host-specific checks informed by the screenshots: Resume reaches the same lesson with the module installed; old course versions resolve matching media bundles; opening Ask LEA does not obscure media or trap focus; player and sign window remain usable alongside the navigation at 200% zoom; and the HTML lesson keeps its heading and reading order after integration. These extend the provisional inventory; they are not organizer features.
