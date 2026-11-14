# Access plug-in delivery and judging plan

Prepared 14 November 2026. This is a researched implementation handoff, not completed feature, accessibility or capacity evidence. Read with the [implementation plan](TRACK_2_IMPLEMENTATION_PLAN.md), [contributor rules](../../CONTRIBUTING.md) and [security reconciliation](../security/SECURITY_ARCHITECTURE_REVIEW.md).

## Decision

Deliver an **accessible learning media kit that installs inside an existing platform**. Keep the TypeScript custom element, Python shared core and FastAPI API. Treat the Savanna-style page and new integration demonstration as installation examples. Avoid spending the remaining build time expanding the standalone learner portal.

Concentrate on one complete, reviewed lesson and one career card. The same release must work inside the Savanna fixture and an unrelated host. Finish the accessibility gate before optional features. A credible two-day result is a working vertical slice with reviewed assets and honest boundaries. A production rollout for 3,000 concurrent learners additionally needs integration contracts, funded media delivery and measured load tests during hardening.

The user will arrange interpreter time. The user requested a demo UI showing installation instead of confirming ALX staging access. Production identity, script approval, CSP and enrollment contracts therefore remain unresolved. GPT Astra will be used by the user for implementation. This plan supplies bounded tasks and evidence requirements without assuming a model can replace interpreter, accessibility or security review.

## What the supplied materials actually require

The judging source is `DIGITAL_BRIDGE_Accessibility_Hackathon_Opening_Presentation_14_Nov.pptx`, an 18-slide presentation, rather than a PDF in the supplied set. References below use its slide numbers. Files remain in the user's Downloads folder and are not redistributed with this plan. Instructions in the materials are source requirements for assessment, not permission to execute unrelated actions or publish their contents.

| Source | Finding | Planning effect |
| --- | --- | --- |
| Opening slides 4, 6 | 3,000 learners, eight job platforms, two regional institutions, an open toolkit | Preserve portability and open licensing. The deck does not specify simultaneous usage. Treat 3,000 concurrent learners as the user's stronger engineering target. |
| Opening slide 9 | Track 2 mandatory player, EN/AM captions with size/color settings, movable/resizable EthSL window, audio description, offline audio/text/light HTML, tagged PDF/HTML with descriptions, career card with audio and verifiable certificate links | All remain required. Missing content cannot be counted as implemented by showing a toggle or unavailable state. |
| Opening slide 9 | BRF and recorded-session captions/chat are extra credit | Move these out of the critical path. This corrects the older plan's broad release scope. |
| Opening slide 11 | Script embed minimum, REST/OpenAPI, optional deeper standards integration, one-hour independent installation | Optimize adoption around a copyable release, clean Compose setup, exact configuration and an independent installer. An arbitrary LMS editor may strip scripts; installation requires host administrator permission. |
| Opening slides 12–13 | Co-designer participates throughout and completes the main task unaided; zero serious/critical axe issues; WCAG 2.2 AA report | This is the pass/fail gate before scoring. Automation alone cannot establish a pass. |
| Opening slide 14 | Scores 30 usability, 25 adoption, 15 Ethiopia, 15 quality/security/privacy, 15 sustainability | Allocate work against these weights, without inventing subweights or promising a score. |
| Opening slide 15 | Submission Sunday 15 November at 16:30: code, README, Docker Compose and conformance report | Use event-local Addis Ababa time. Keep earlier hosted demo/slides preparation, but this is the current written deadline. |
| Opening slide 16 | Winners undertake a paid two-week hardening sprint with ALX engineers and three rounds with at least 30 testers with disabilities, then go live | The deck does not promise launch exactly two weeks from today. The user's two-week deployment ambition is conditional on access, test results and owner approvals. |
| Drop-in PDF pp. 3–7, 11–13 | One shared core, custom element, stable REST, optional LTI | Reuse core logic. Do not build a second backend for each LMS. |
| WCAG slides 7, 12–15 and supplied 2008 PDF | Modern testing includes drag alternatives, focus visibility, target size, 400% reflow and real assistive technology | Use current WCAG 2.2 as normative target; the PDF is WCAG 2.0. |
| Localized AI slides 1–5 | Offline essentials, local processing, optional online capabilities | Move inference to content preparation. Learners should not need a local LLM, NPU, API key or paid inference request. Slides 6–17 contain no extracted slide text in this supplied copy; do not infer additional technical claims. |

The official 35-feature programme inventory is still not enumerated in these materials. Our existing 35 checks remain a team inventory. Do not imply that Track 2 is responsible for implementing all three tracks.

## Scoring strategy and evidence

| Panel category | Weight | Work with the strongest direct evidence | Evidence to submit |
| --- | ---: | --- | --- |
| Works for intended people | 30 | Complete a lesson using captions/sign/audio/text, then find the career card, without help; change the design after early feedback | Two consented co-design cycles, task outcomes and retests, participant scores recorded as given, device/AT versions, unresolved barriers |
| Adoptable by another platform | 25 | Install the same bundle in two different hosts, with no learner account in Access; use the API separately | Timed stranger-install exercise under one hour, clean-clone Compose test, embed snippet, OpenAPI example, events/configuration, rollback instructions |
| Built for Ethiopia | 15 | Reviewed Amharic/Ethiopic text, real EthSL, cheap Android/3G/offline experience, usable dates | Translation/reviewer records, offline reopen on a phone, byte sizes, language metadata, Ethiopian/Gregorian date test where dates appear |
| Quality, security, privacy | 15 | Content rendered safely, publication bound to source versions, minimum data, consent before external processing | CI and negative tests, threat model, dependency licenses, a data-flow inventory, no third-party analytics in the default learner path |
| Can be kept running | 15 | Self-hostable core, no required paid AI calls, precomputed outputs, named maintainers | Reproducible setup, upgrade/rollback, cost model, media-storage policy, failures/recovery, ownership and capacity-test results |

The first two categories total 55 points. A polished avatar adds little credible value if a Deaf learner cannot understand the content or a judge cannot install the module. Do not forecast a numerical score before the panel and co-designers assess the work.

## Current code and changes to make

Inspection baseline is commit `1a36d89` plus this planning/demo change. These are source observations, not new production test claims.

Follow-on implementation in this branch adds the requested Afriwork-inspired career component and Ethioware-style learning host. Their current behavior and verification gaps are recorded in the [career/provider demo guide](../architecture/CAREER_AND_PROVIDER_DEMOS.md). The gap table below describes the original inspection baseline; P3 now has fictional job/filter/detail/verification behavior, while recorded audio and human accessibility evidence remain pending. These demos do not authorize or prove changes to either live provider.

| Area | Existing foundation | Two-day modification |
| --- | --- | --- |
| Embedding | `packages/lesson-component` has a custom element, Shadow DOM, lifecycle cleanup and events; independent and Savanna examples exist | Keep its public tag for compatibility. Add a clear installer demo and second-origin test. Document theme tokens, errors and asset CSP. Freeze immutable release files and integrity metadata. |
| API | Public fixture manifests, transcripts, exports, media and OpenAPI | Preserve `/api/v1`. Add reviewed multi-language asset metadata and explicit availability. Never turn public fixture endpoints into protected content by trusting a browser tenant ID. |
| Captions | Source English captions with coarse source timing; adjustable text size | Review timings/sounds, import reviewed Amharic, provide language and accessible color presets. Keep originals intact and write reviewed derivatives with hashes. |
| Signing | Timing prototype and GLB review/capture pipeline | Primary route becomes synchronized interpreter video. Keep avatar behind an explicit experimental choice, excluded from gate evidence. ASL is later optional support; it does not substitute for EthSL. |
| Description | Required audio-description route remains unavailable | Produce one reviewed described soundtrack or described video on the same timeline. If all relevant visuals are already spoken, record that assessment; still show a meaningful description example in the demo. |
| Offline | HTML/TXT/ZIP exports exist, but missing required audio and dedicated reader is a placeholder | Prebuild a small pack containing audio, text, semantic HTML, local styles/fonts if needed and checksums. Actually open it in airplane mode on target Android. No learner tokens/progress in packs. |
| Documents | HTML exists, tagged PDF unavailable | Use one structured source for HTML and PDF. Verify PDF tags, reading order, links, descriptions and Ethiopic text. A print-to-PDF button is insufficient. |
| Career | Planned, not a demonstrated working flow | One synthetic accessible job card, equivalent recorded audio summary, matching JobPosting JSON-LD, and a clearly fictional certificate-verification demonstration or authorized real issuer link. |
| Delivery | CI, MIT code license and pinned Savanna submodule exist; no executable Compose deployment in the inspected tree | Ship an actual Compose file and Dockerfile, lock dependencies, run clean checkout and one-hour install. Keep private media rights separate from code license. |
| Scale | API serves MP4 and regenerates exports per request | Generate once per content revision and deliver assets directly from storage/CDN. Keep API for manifests, authorization and management. |

### Player library decision

Keep the current custom-element interface. Timebox a 60–90 minute **Able Player evaluation** inside that interface. It already documents configurable captions, synchronized sign video, transcripts and described media. Its current module build can import jQuery without a global `window` dependency; DOMPurify is another dependency. It is MIT licensed. These features make it a useful candidate, not evidence that our host integration passes accessibility. [Able Player documentation](https://ableplayer.github.io/ableplayer/), [source and license](https://github.com/ableplayer/ableplayer).

Accept it only if two instances, remount cleanup, host CSS isolation, Amharic strings, keyboard focus, NVDA/TalkBack and constrained CSP work in the spike. If it needs broad DOM/shadow-boundary changes, retain our native media implementation and add only the missing controls. Freeze that decision after the spike; avoid maintaining two player engines in the weekend build. Do not install a new UI framework or rebuild the shell.

### Signing and content production

Reserve interpreter time immediately. Share a short source segment and glossary first. Record participation, recording and public-use consent separately. Capture the face, torso and hands clearly at a resolution/bitrate tested with the Deaf co-designer. Agree the whole demo segment before recording so the delivered lesson has no unexplained unsigned remainder.

Prefer a complete 60–120 second demo lesson, or a clearly bounded excerpt whose transcript, captions, description and sign recording all cover the same interval. Retain source hashes and the approved start/end boundaries. Do not label normal presenter gestures as EthSL or use an LLM to approve a translation. Facial expression and body movement carry meaning as well as hands. [W3C sign-language guidance](https://www.w3.org/WAI/media/av/sign-languages/).

Implement pause/play, seek, speed and buffering synchronization. If sign video stalls, offer a clear way to pause both rather than silently drift. Target under 250 ms drift after settling as an initial engineering goal, to be adjusted with the interpreter. Supply dock-left/right/below and size buttons for click/tap and keyboard operation, in addition to optional dragging. Test visual clarity at enlarged size on the actual phone. Preserve an accessible fallback if the sign asset is unavailable, while reporting the required feature as incomplete.

For description, use a recorded or pre-generated reviewed track. Browser speech voices are optional conveniences and cannot be the only Amharic/offline route. WCAG AA 1.2.5 requires audio description when essential visual information is not already communicated in the audio; a transcript alone does not replace it. [W3C SC 1.2.5](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded.html).

### Document pipeline

Evaluate WeasyPrint's PDF/UA output from controlled semantic HTML with embedded licensed Ethiopic fonts. Its PDF/UA mode helps author structure but requires content and output validation. Restrict the renderer to job-local assets, disable arbitrary network/file fetching and set time/memory limits. Run local veraPDF machine checks and NVDA reading-order checks. A manually remediated, reviewed PDF is an acceptable fixture while the automated generator remains incomplete; describe the boundary accurately. [WeasyPrint specialized PDFs](https://doc.courtbouillon.org/weasyprint/stable/common_use_cases.html#generate-specialized-pdfs), [veraPDF validation limits](https://docs.verapdf.org/validation/).

## Portable architecture

```text
Savanna fixture / independent host / later LMS adapter
    versioned custom element, configuration and host events
                         |
              /api/v1 shared service boundary
                         |
       immutable reviewed lesson manifest + asset references
                         |
       host media service or approved object storage/CDN

Local or isolated worker -> draft assets -> human review -> publish revision
```

The host owns enrollment, progress and completion. Access owns accessible assets and playback. Default learner events should contain lesson/version/action only, without learner identities or transcript content. Do not silently send them to analytics or AI services. The source is public for the demo. Production restricted lessons require a server-mediated identity exchange and authorization on both manifests and media. Shadow DOM provides style encapsulation, not a security boundary. [Custom-element lifecycle documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements).

Proposed manifest extension, to agree with Biniyam and Hailemichael before implementation: schema version, tenant scope for protected deployments, lesson/course/content revision, language, media timeline ID, published status, source hash, review record reference, asset MIME/size/hash/URL, caption languages, sign language, description and export alternatives. Keep personal reviewer details out of public manifests. Derive authorization from server state rather than trusting these client fields.

Level 1 and 2 are the weekend commitment. Demonstrate a genuine `schema.org/JobPosting` mapping for the required job card as a small Level 3 deliverable, with visible fields matching the data. Do not claim LTI or Open Badges compliance from JSON-LD. [JobPosting vocabulary](https://schema.org/JobPosting).

For partner LMSs that disallow script tags, add a thin LTI 1.3 launch adapter in hardening only if a named partner provides registration/testing access. Validate issuer, audience, signature/JWKS, deployment, expiry, nonce/state and replay. Avoid grades, roster scopes and Deep Linking until requested. LTI needs administrator setup and integration tests; it does not make installation universally automatic. [1EdTech LTI](https://www.1edtech.org/standards/lti), [Moodle external tools](https://docs.moodle.org/en/External_tool).

### Release and installation contract

Ship a pinned script URL, SRI, documented configuration and no runtime secrets in markup. Publish all imported chunks as immutable objects with the release. The entry script's SRI alone does not hash every transitive module. Keep previous releases available for rollback. Provide a light-DOM download fallback before upgrade and when fetch fails. Host owners must explicitly allow the module, API and media origins in CSP and the exact host origin in API CORS.

The new `/demo/plug-in` page is a demonstrator with real install/remove/theme/snippet/event behavior. Its integrity manifest is generated from the local build. It is not an immutable public release or a production identity adapter. [Demo instructions](../../examples/plug-in-demo/README.md).

## Designing for 3,000 concurrent learners

Capacity is an acceptance target, not an inference from a framework or an instance size. Separate concurrent active learners, start-arrival rate, API requests, streaming bandwidth and content-processing jobs.

Illustrative assumptions, using decimal units and excluding protocol overhead:

| Workload | Calculation | Implication |
| --- | --- | --- |
| 3,000 learners each receiving 1 Mbps video | 3,000 Mbps = 3 Gbps; one hour = 1,350 GB | Deliver media at the CDN/host media layer, not Python workers. |
| 64 kbps audio-only for all learners | 192 Mbps; one hour = 86.4 GB | Useful lower-bandwidth path, still budget separately. |
| One hour of 1 Mbps video per learner on 14 days | 18,900 GB | Credit alone cannot establish affordability. Add interpreter video bitrate to this total when enabled. |
| 3,000 starts over 60 seconds, four control-plane requests each | 50 starts/s, approximately 200 requests/s | Test burst startup separately from quiet steady playback. |
| Five-minute token refresh for 3,000 active learners | Average 10 refreshes/s | Stagger refreshes; test simultaneous expiry and avoid long-lived browser secrets. This token design is proposed, not implemented. |

Render remains the demo/control-plane platform. Its static sites use a CDN but outbound bandwidth still counts. The current published public-internet overage is $0.15/GB. Thus the illustrative video workload would be about $202.50 per hour of cohort viewing, or $2,835 over 14 such days, **before included allowance, compute and other charges**. This is an overage-rate illustration, not a quote. [Render bandwidth](https://render.com/docs/outbound-bandwidth), [static-site delivery](https://render.com/docs/static-sites).

Preferred production route is authorized existing ALX media delivery, avoiding unnecessary duplication. An alternative is S3-compatible object storage such as R2, subject to content rights, data processing and security approval. R2 documents no egress charge but still charges storage and operations; it is not automatically a private streaming CDN. Public assets can use a configured custom-domain cache. Protected assets need an authorization-aware delivery design so caching never leaks tenant content. Do not use the rate-limited `r2.dev` endpoint as production infrastructure. [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [public delivery](https://developers.cloudflare.com/r2/buckets/public-buckets/).

Use a stateless API for horizontal scale. Any future review/publication state must live in durable shared storage, not per-instance files or in-memory dictionaries. Draft generation is a separate local/isolated worker. No per-viewer transcoding, export generation or inference. Protected responses stay out of shared caches unless an audited edge authorization policy makes them safe. Public content-addressed assets can use long immutable caching. Production source retrieval remains allowlisted.

Render supports manually scaled instances, while autoscaling requires a qualifying workspace plan. Costs multiply per instance. Select sizing only after measurements and do not attach a persistent disk to an API that must horizontally scale. [Render scaling](https://render.com/docs/scaling).

### Capacity verification during hardening

1. Agree the lesson mix, bitrates, viewing duration, startup pattern, origins and percentage using sign/audio/offline with ALX. Include token refresh and pack downloads.
2. Run component/browser tests on actual low-cost Android separately from HTTP load. A 3,000-VU script is not 3,000 browser accessibility tests.
3. On an authorized staging target, test 50/250/1,000 then 3,000 active virtual learners, warm and cold-cache starts, 30-minute steady state, a 60-second start burst and instance restart.
4. Use an arrival-rate workload for startup requests so a slowing server does not hide load by reducing arrivals. Record dropped iterations, generator saturation and achieved rates. [k6 workload models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/).
5. Proposed control-plane targets are p95 under 500 ms, p99 under 1 second and under 0.5% unexpected failures, with zero authorization leaks. Exclude deliberate 401/403 test cases from the service-error denominator, but record them. Confirm target geography and test from representative networks.
6. Record CDN bytes, hit rate, media startup/rebuffering, API CPU/memory, DB connections, queue lag and cost. Validate video Range requests, CORS and sign synchronization through the real delivery path. Test 3G at a stated profile, initially 1 Mbps down, 250 kbps up and 300 ms RTT, then on an actual device/network.
7. No production capacity claim until artifacts identify build, infrastructure, workload, duration and outcomes. Load generators must not overload third-party systems without permission. Estimate traffic cost before a large run.

For the $100 Render demo credit, reserve a proposed $20 for final validation, set an initial $60 service-spend envelope and keep $20 contingency. These are internal allocations, not automatic caps or provider prices. Anteneh verifies credit eligibility/expiry, current quotes and billing alerts before provisioning. Budget production hosting, external storage, human translation/interpreting and ongoing remediation separately. No paid resources are provisioned by this plan.

## Weekend schedule and owners

These are work blocks to sequence within the remaining time before 15 November 16:30 EAT, not a claim of 48 available working hours. Three people can own separate areas, but one person must integrate the shared contracts.

| Block | Anteneh — macOS/product/delivery | Biniyam — Windows/data | Hailemichael — Linux/security |
| --- | --- | --- | --- |
| First 60–90 minutes | Meet co-designer, agree main task, player-library spike, install demo | Freeze one source excerpt and manifest fields; prepare interpreter/glossary | Read privacy/consent boundaries, enumerate tests and gate report |
| Day 1 core build | Caption presets, sign docking/size, keyboard/focus, two-host embed | Reviewed EN/AM cues, interpreter recording integration, description/audio, version binding | Unsafe-input/asset tests, dependency review, public/protected boundary |
| Day 1 end | First unaided task cycle, record barriers, choose fixes | Offline pack and tagged PDF spike; escalate missing content immediately | Automated scan, report gaps, clean checkout and Compose verification |
| Day 2 morning | Fix co-design issues, career card, Ethiopian date/labels where applicable | Prebuilt exports and audio summary, PDF validation, publication records | Cross-origin and failure tests, privacy checks, run genuine CI |
| Day 2 early afternoon | Second task/retest cycle and stranger-install exercise | Confirm all demonstrated assets match the published revision | Verify report/evidence/build consistency, assist release packaging |
| Final 60–90 minutes | Freeze, README, demonstration recording/slides if needed, submit | Verify downloaded artifacts and content licenses | Re-run relevant checks, record failures honestly and secure human review |

Co-design sessions should use the user's own device and preferred settings when possible. Do not repeatedly coach a participant and then count the task as unaided. Record interventions as assisted. Ask permission before recording names, faces or voices, including for pitch use.

If mandatory media is late, shrink the lesson to a complete agreed excerpt rather than build additional unsupported features. If tagged PDF validation fails, repair the output or report the gap; HTML alone does not fulfill the written PDF requirement. If an interpreter recording cannot be delivered, EthSL remains a release risk, not a feature that an avatar prototype can satisfy.

## Two-week hardening and launch gates

| Window | Work and exit evidence |
| --- | --- |
| Days 1–2 | ALX agrees mount/CSP, source-media rights, identity/enrollment exchange, deployment owner, rollout cohort, privacy/data processing and operational budget. Establish staging and rollback. If absent, continue public demonstration only. |
| Days 3–5 | Production adapter and tenant/course/version authorization, private drafts, scoped media delivery, review/publish state, persisted audit metadata. First tester round. |
| Days 6–8 | CDN/storage setup, measured performance/load, low-end Android/offline reliability, PDF/Amharic quality, dependency/security fixes. Second tester round. |
| Days 9–11 | Regression, independent installation, restore/rollback drills, monitoring and support ownership. Third tester round. Organizer requirement is at least 30 testers across three rounds; confirm recruitment and distribution with ALX. |
| Days 12–14 | Resolve blocking findings, approve conformance and security evidence, rehearse 3,000-concurrent scenario, then stage a limited pilot and expand only after agreed metrics pass. |

Release blocks include missing human-reviewed EthSL or Amharic for published lessons, unaided task failures, serious/critical axe defects, missing conformance evidence, authorization leaks, unverified asset rights and failed capacity/budget assumptions. Availability of a public demo does not resolve these blocks. Never bypass branch protection if Actions is blocked by an account problem.

## GPT Astra implementation handoff

Use one bounded task/PR at a time. Read the repository's AGENTS/CONTRIBUTING/security rules and inspect current files first. Preserve the source fixtures and unrelated changes. The following order replaces the earlier broad feature sequence for the weekend.

| Task | Scope and likely files | Required acceptance |
| --- | --- | --- |
| P0 content contract | `services/core`, API models, fixtures | Source/version/language review binding, invalid media and missing alternatives fail honestly, backwards-compatible fixture behavior |
| P1 accessible playback | `packages/lesson-component/src/media-view.ts`, component styles | EN/AM captions and presets; real synchronized sign video; description path; docking/sizing with pointer and keyboard; lifecycle tests |
| P2 asset production | Worker/core export functions, controlled assets | Prebuilt audio/text/HTML/ZIP/PDF of one reviewed lesson, hashes/sizes, airplane-mode test and PDF reading-order evidence |
| P3 career module | Shared core/API plus small component | Semantic job card at 200% zoom, equivalent audio, matching JobPosting, explicit demo verifier or approved issuer link, no fake issuer claims |
| P4 installation/release | Examples, scripts, containers, README | Clean-clone Compose run, pinned bundle/chunks, real API client, second-origin installation, teardown/retry tests |
| P5 evidence | `tests`, accessibility report, co-design log | axe, keyboard, NVDA, TalkBack, 400% reflow, sound-off tasks, honest pending/failed results, humans review |
| P6 production hardening | Adapter, durable review state, storage/CDN, load tooling | Only after host contract, approved infrastructure and explicit release gates |

Suggested task prompt:

> Implement only task Pn from this plan. Start by reporting the existing behavior and exact scope. Keep the public fixture working and preserve original source files. Use reviewed assets supplied for this task; never invent reviewer approval or sign-language content. Add tests for observable behavior and failure cases. Run available checks, inspect the complete diff and report limitations. Do not deploy, change billing, bypass protections or self-approve. If a contract is missing, implement a clearly named test adapter and document the production dependency. Stop expanding scope once acceptance is met.

Do not spend the weekend on avatar motion synthesis, general translation research, browser LLM downloads, NPU optimization, full authoring dashboards, roster/grade integrations, SCORM packaging or new credential issuance. Keep existing experimental code available without making it a default learner dependency. BRF and recorded-session playback are optional only after mandatory work and the gate.

## Dependency preparation

No learner-facing AI API is required. Keep existing locked Node/TypeScript/esbuild, Python/FastAPI/Pydantic, pytest, Playwright and axe. Needed human inputs are reviewed English/Amharic, interpreter/Deaf review, audio-description review and permission to distribute each asset.

Potential additions are Able Player after its integration spike, FFmpeg for offline media production, WeasyPrint plus licensed Ethiopic fonts for controlled PDF output, local veraPDF for validation, and k6 for authorized staging load tests. Pin tested versions and record licenses/vulnerability outcomes when added. Avoid installing all candidates speculatively. NPU hardware and Hailemichael's Linux distribution remain unknown, but neither blocks the proposed learner runtime.

Open questions for ALX are the production identity/CSP/source-media contract, whether a specific Android WebView is in scope, the official programme feature inventory, hosting ownership/budget, media egress route and the exact criterion evidence format. Proceed with the public installer demo while these are resolved. The existing code's MIT license does not license the attached training decks, Savanna branding or interpreter recordings.
