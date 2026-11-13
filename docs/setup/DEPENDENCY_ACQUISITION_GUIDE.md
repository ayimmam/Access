# Step-by-step dependency acquisition guide

Prepared 13 November 2026 for Access / Track 2. Follow this guide to collect the tools, accounts, configuration, source assets and human review support required by the implementation plan.

Render is the chosen demo host with $100 credit available. Cloudflare R2 is the concrete S3-compatible storage example in this guide. Confirm that provider with the team before activating a storage subscription. Existing S3-compatible storage can supply the equivalent endpoint, region, bucket and credential information.

## 1. Use this acquisition order

| Priority | Dependency | Owner | Completion evidence |
|---|---|---|---|
| First | Local tools and current implementation | Everyone | Build, API and browser checks run |
| First | Render workspace and credit details | Anteneh | Workspace access and cost/expiry record |
| First | Corrected source captions | Biniyam | Reviewed English text and timing |
| First | EthSL interpreter and Deaf reviewer | Anteneh coordinates | Agreed session, scope and recording permissions |
| First | ASL/EthSL motion or provider evaluation | Biniyam + Anteneh | A reproducible reviewed sample and license details |
| Next | Durable asset storage | Anteneh + Hailemichael | Two buckets, scoped credentials and access checks |
| Next | ALX host/identity/progress contracts | Anteneh | Written technical responses and test context |
| Next | Amharic, audio description, PDF and Braille inputs | Biniyam coordinates | Reviewed reference artifacts and profiles |
| When persistent publishing is ready | PostgreSQL and worker/queue | Biniyam + Anteneh | Connection information and a measured processing path |
| When genuine integrations are available | Certificate and recorded-session sources | Anteneh | Authorized verification links and redacted session content |

Use the existing local video demo while these items are collected. Track acquisition status as `pending`, `obtained`, `verified` or `blocked`, with an owner and next action.

## 2. Prepare each development machine

### 2.1 Install the common tools

1. Install Git and an editor.
2. Install Node 24.x using the official Node download page or your existing version manager.
3. Install uv using its OS-specific instructions, then install Python 3.11.
4. Install FFmpeg, including ffprobe.
5. Install Chrome/Chromium and Firefox.
6. Prepare Docker Desktop on macOS/Windows or Docker Engine plus Compose on Linux for the later containerized services.

For macOS with Homebrew already available, the preparation commands are

```sh
brew install git uv ffmpeg gh
uv python install 3.11
```

For Windows, Biniyam should use WSL 2 for the shared development toolchain and native Windows for NVDA. For Linux, Hailemichael should confirm the distribution before selecting package commands. Detailed member-specific instructions are linked in the team setup index. [Node installation](https://nodejs.org/en/download), [uv installation](https://docs.astral.sh/uv/getting-started/installation/), [Python management](https://docs.astral.sh/uv/guides/install-python/), [team setup](README.md)

### 2.2 Verify the tools

Run in the development shell

```sh
git --version
node --version
npm --version
uv --version
uv python find 3.11
ffmpeg -version
ffprobe -version
docker version
docker compose version
```

Record versions in the team readiness note. Node should report 24.x for the shared baseline. Docker's client and server should both respond when preparing container work.

### 2.3 Obtain and run the implementation

1. Obtain the implementation branch and current changes from Anteneh. The active local development branch when this guide was written is `feat/public-lesson-foundation`.
2. For a fresh checkout, clone `https://github.com/ayimmam/Access.git`. Use GitHub's available branches to select the shared implementation once it has been pushed.
3. Confirm `pyproject.toml`, `uv.lock`, `package-lock.json` and the `example lessons/` assets are present.
4. From the repository root, run

```sh
uv python install 3.11
uv sync --locked --python 3.11
npm ci
npm run build
npx playwright install chromium
uv run pytest
npm run test:browser
```

On Linux, browser installation can require `npx playwright install --with-deps chromium`. Follow the package manager prompts for system libraries. [Playwright installation](https://playwright.dev/docs/intro)

5. Start the demo in a terminal

```sh
uv run uvicorn access_api.main:app --reload --host 127.0.0.1 --port 8000
```

6. Open `http://127.0.0.1:8000/` and verify the ALX video, English captions, transcript seeking, downloads and local 3D preview.
7. Open `/api/docs` to inspect the API and `/demo/independent` to check the reusable text component.

The dependency lockfiles install the current FastAPI, Uvicorn, Pydantic, TypeScript, esbuild, Three.js, pytest, HTTPX, Playwright and axe packages. The member setup guides list later conversion tools separately.

**Ready when** the demo starts and the available tests complete on the member's machine. Record failures and missing system tools with their error messages.

## 3. Obtain Render access and verify the $100 credit

Owner is Anteneh, with Hailemichael reviewing access and Biniyam sizing the worker.

1. Sign in to the Render dashboard using the account holding the credit.
2. Select the intended workspace and record its name.
3. Inspect its billing/credit details and record the balance, expiry, eligible usage and any payment-method requirement.
4. Record a spending estimate covering the API, later database/worker, storage, build usage and bandwidth. Keep the planned runtime through the judging window in that estimate.
5. Check whether the current workspace plan supports the teammate permissions needed. Use individual accounts and the available roles.
6. Connect GitHub through Account Settings → Git Deployment Credentials → Add credential. Select GitHub and authorize access to `ayimmam/Access`.
7. Confirm that the repository appears in Render's repository picker.
8. Check the current pricing and retain the selected service/tier information with the budget record. Treat the credit as an account balance when estimating costs.

Render's documented connection flow and pricing are the references for these account steps. [Git provider connection](https://render.com/docs/git-provider), [Render pricing](https://render.com/pricing)

### Deployment settings to prepare

Collect the proposed region, linked branch, build command, start command and health endpoint before creating the service. The current app expects a repository-root installation, a built component and the example media files. The health endpoint is `/healthz`.

The start command for a Render service must bind to its assigned port

```sh
uv run uvicorn access_api.main:app --host 0.0.0.0 --port "$PORT"
```

The final build configuration needs Node/npm and Python/uv in the same build environment, or a prepared container. The current local startup instructions supply those requirements. Anteneh should validate the eventual Render build configuration against the repository before deployment. [Render FastAPI deployment](https://render.com/docs/deploy-fastapi)

For each runtime secret, open the service's Environment page and add its key/value. Choose Save only when collecting configuration ahead of a planned deployment. [Render environment variables](https://render.com/docs/configure-environment-variables)

**Ready when** workspace access, credit terms, repository connection and deployment settings are recorded. Creating a live service is the deployment step that follows this preparation.

## 4. Obtain durable object storage

Owners are Anteneh and Hailemichael. Biniyam will connect the application when the storage adapter is implemented.

### 4.1 Create the storage locations

1. Confirm R2 or the team's existing S3-compatible provider.
2. Sign in to the chosen provider and review its storage, operation, download and billing terms.
3. For R2, open R2 Object Storage in the Cloudflare dashboard and complete the required activation flow.
4. Create two named buckets, for example `access-demo-drafts` and `access-demo-published`.
5. Record account ID, bucket names and the provider's region/location settings.
6. Keep draft access private. Decide how approved demo assets will be delivered through the API, signed URLs or a configured public delivery domain.

Follow the provider's current bucket and account instructions. [R2 setup](https://developers.cloudflare.com/r2/get-started/), [bucket creation](https://developers.cloudflare.com/r2/buckets/create-buckets/)

### 4.2 Obtain S3 credentials

1. Open R2 → Manage API Tokens under account details.
2. Create an R2 token with object permissions scoped to the intended bucket(s).
3. Save its Access Key ID, Secret Access Key and S3 endpoint in the team's secret store.
4. Record the endpoint's region/jurisdiction variant. The usual R2 endpoint format is `https://ACCOUNT_ID.r2.cloudflarestorage.com`, with S3 clients using region `auto`.
5. Keep the worker's draft-write access separate from learner delivery. Give the delivery service only the permissions its final adapter needs.

Use the returned S3 credentials when configuring the S3 client. [R2 authentication](https://developers.cloudflare.com/r2/api/tokens/)

### 4.3 Verify storage readiness

1. Upload a harmless small text file through the provider console.
2. Download it and compare its contents.
3. Have Hailemichael verify that a draft object remains inaccessible to an anonymous request.
4. When the application adapter exists, repeat upload/read operations using its scoped credentials and confirm that permissions match the assigned buckets.
5. If browser delivery uses the bucket directly, configure CORS for the exact local and deployed frontend origins. Include the GET/HEAD methods and headers required by the chosen range-request implementation.
6. Test the deployed video/track URLs in the actual browser. Verify playback, seeking and captions through the chosen delivery route.

Browser CORS configuration is documented separately from object permissions. [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/), [S3 SDK example](https://developers.cloudflare.com/r2/examples/aws/boto3/)

**Collect** endpoint, region, bucket names, delivery URL choice, credential references and allowed origins. Keep credential values in runtime configuration.

## 5. Obtain ALX integration answers

Owner is Anteneh. Ask an organizer to connect the team to the Savanna technical owner.

1. Prepare the following request for that owner. Send it through the team's organizer channel when ready.

> We are building Access, the Track 2 accessible learning-media Web Component and REST API. We have the supplied static Savanna pages and a working public video demo. Please provide the supported production integration details for mounting the component, lesson/media/course-version mapping, CSP/allowed origins, server-side learner identity and enrollment verification, access expiry/revocation, and progress/completion handling. Please also identify approved source-media access and the contact who can validate the integration.

2. Collect a written response for each item in the table.

| Contract | Information to obtain | Useful evidence |
|---|---|---|
| Component mount | Supported editor tag/renderer or page mount point | An approved sample embed |
| Lesson mapping | Concept, lesson, media occurrence and course-version identifiers | One sample mapping covering two media items if possible |
| Identity | Supported server exchange, issuer/audience or introspection details, test credentials | A documented test launch/request |
| Enrollment | How the backend verifies lesson entitlement | Allowed and denied enrollment examples |
| Expiry/revocation | Session expiration, logout and revoked-course behavior | Expected error/recovery behavior |
| CSP/origins | Script, API, media and asset origins allowed | Approved origin list |
| Completion | Official endpoint/event policy and authorization | A documented successful request and duplicate/retry behavior |
| Source content | Approved access to master video, subtitles, transcripts and versions | Authorized download/export process |

3. Ask how to obtain a test account/context and how changes are approved.
4. Ask for the official Accessibility Gate checklist and the target host/browser/WebView for judging.
5. Share contract documents and sample identifiers with Biniyam and Hailemichael. Store test secrets separately.

**Ready when** the technical owner has supplied an agreed interface and test context for the feature being integrated. ALX authentication was explicitly unconfirmed in this project as of the last user confirmation.

## 6. Prepare the supplied video and English captions

Owner is Biniyam, with Anteneh coordinating content rights and review.

1. Keep these originals available to the local server

```text
example lessons/We Are Transforming Africa - ALX Africa (720p, h264).mp4
example lessons/into-caption.txt
```

2. Confirm permission to show and distribute the source in the intended local/hosted demo.
3. Inspect the media in the development shell

```sh
ffprobe -v error -show_entries format=duration,size:stream=codec_type,width,height -of json 'example lessons/We Are Transforming Africa - ALX Africa (720p, h264).mp4'
```

4. Compare the result with the observed source, approximately 121.5 seconds, 1280 × 720 and 20.4 MB.
5. Watch the full video with a reviewer. Correct caption wording, punctuation, speaker boundaries and meaningful sounds while preserving the source export.
6. Review start/end timing. The current export has 16 coarse segments, and phrases sometimes cross segment boundaries.
7. Produce a reviewed WebVTT file and plain-text transcript with the reviewer, date and source revision recorded.
8. Send the corrected files and source revision to the implementation owner for versioned import.
9. Verify the imported lesson with playback, caption toggling and transcript seeking.

**Ready when** the team has a reviewed English transcript, timed captions, source identity and distribution permission.

## 7. Obtain EthSL and ASL translation and motion resources

Anteneh coordinates people and access. Biniyam manages source/timeline artifacts. Hailemichael reviews artifact provenance and access.

### 7.1 Prepare the request package

1. Give the adviser or interpreter the consultation brief and authorized video.
2. Open the local demo and choose **Avatar sign language** → EthSL or ASL.
3. Expand **Free sign-motion authoring tools** and download the caption-to-motion worksheet for that language.
4. Include the reviewed English captions, lesson duration and the intended output language with the worksheet.
5. Ask for a short representative sample before planning full-lesson conversion.

The consultation brief includes the attempted approaches, assets and specific technical questions. [Consultation brief](../architecture/ASL_ETHSL_TRANSLATION_CONSULTATION_BRIEF.md)

### 7.2 Arrange human language review

1. Ask organizers for an Ethiopian Sign Language interpreter and Deaf reviewer. Confirm their availability and the length of lesson they can cover.
2. For ASL, arrange a reviewer/interpreter who works in ASL.
3. Share the lesson, corrected script and terminology ahead of the session. Flag metaphors, ALX's name and technical terms.
4. Agree recording, source-reference use, avatar-motion extraction and learner/pitch distribution permissions for the chosen workflow.
5. Agree how to record corrections and approve the exact final rendered sequence.

**Ready when** a reviewer is assigned and a signed sample or approved phrase translation is available for the selected language.

### 7.3 Use the free Performs workspace

1. In the demo's authoring tools, select **Load free Performs workspace**. The hosted page requires internet.
2. If the embed cannot load, use its separate-tab link.
3. Read the supported script/animation formats and load a known authored sample first.
4. Use Animics to author/edit sign instructions and Atelier to prepare custom-avatar configuration where appropriate.
5. Obtain a compatible rigged `.glb`/`.gltf` character and its usage license. Confirm finger articulation and required face controls.
6. Export or retain the exact motion/script files and avatar configuration used for the sample. Record versions and language.
7. Have the language reviewer assess the rendered sample, then provide the approved artifacts for runtime integration.

Performs is MIT-licensed and accepts authored SiGML/BML and keyframe animation. Its included NGT dictionary requires separate target-language resources for our EthSL/ASL lesson. [Performs documentation](https://github.com/upf-gti/performs), [Animics](https://github.com/upf-gti/animics), [Atelier](https://github.com/upf-gti/performs-atelier)

### 7.4 Evaluate an external translation provider

1. Choose a provider based on documented target-language support. Signapse advertises ASL/BSL. Signa is another API lead whose exact suitability needs confirmation.
2. Request confirmation of EthSL or ASL support, a sample using our short passage, allowed output use, available animation/video format, API authentication and estimated lesson cost.
3. Ask whether hand and facial motion can be exported and retargeted to our African-woman character, or whether the output is a fixed rendered signer.
4. Review the sample with the relevant signer before paying for full conversion.
5. If selected, obtain scoped trial/API access through the provider's official account process and store credentials server-side.
6. Record data retention, processing permissions, usage limits and the approved output artifact.

**Ready when** the sample is reproducible, language support is confirmed, and the team has approved its quality, permissions and cost. [Signapse](https://www.signapse.ai/), [Signa API](https://usesigna.org/en/docs)

### 7.5 Handoff the motion resources

Collect target language, source-caption revision/hash, phrase alignment, sign/gloss references, motion files, rig/configuration, hand/face tracks, transition/timing decisions and rendered-review approval. The current app's local preview remains labeled while these artifacts are prepared. [Avatar workflow](../architecture/SIGN_AVATAR_WORKFLOW.md)

## 8. Prepare Amharic, audio description, PDF and Braille

### Amharic captions and fonts

1. Assign an Amharic reviewer and provide the corrected English source.
2. Produce the translation with agreed terminology and confirm its meaning with the reviewer.
3. Fit and review the translated WebVTT on the source timeline.
4. Obtain local Ethiopic font files with their redistribution license. Noto Sans Ethiopic is a candidate to evaluate through its official distribution.
5. Test the actual caption line breaks and generated documents on the Android device.

**Collect** reviewed Amharic text, timed captions, reviewer/source revision and font/license files. [Noto font distribution](https://fonts.google.com/noto)

### Audio description and tagged PDF

1. Have a reviewer identify visual teaching information missing from the narration.
2. Prepare a description script and consented recording, with any required timing changes documented.
3. Prepare one semantic bilingual reference document with headings, an image description and a table.
4. Evaluate WeasyPrint's PDF/UA output on that reference and inspect tags, reading order, text extraction and screen-reader output.
5. Keep the approved sample and conversion settings for the worker implementation.

**Collect** description script/audio, timeline notes and a verified PDF sample. [WeasyPrint PDF/UA guidance](https://doc.courtbouillon.org/weasyprint/stable/common_use_cases.html)

### Braille

1. Arrange a Braille reader/transcriber and identify the actual display or embosser to test.
2. Ask for the language, code, contraction grade, encoding, cells per line and lines per page.
3. Obtain a short expert-approved BRF reference containing headings, numbers, punctuation and representative lesson text.
4. Install Liblouis on the conversion-development machine. On macOS with Homebrew, use `brew install liblouis`.
5. Obtain DAISY Pipeline with the needed Braille modules and follow its selected distribution's runtime requirements.
6. Verify the selected translation table and formatter against the approved sample. For Amharic, obtain the actual accepted table/profile or a reviewed externally transcribed BRF.

**Collect** table/profile, tool versions, approved BRF, reviewer and target-device result. [Liblouis installation](https://formulae.brew.sh/formula/liblouis), [DAISY installation](https://daisy.github.io/pipeline/Get-Help/User-Guide/Installation/)

## 9. Obtain database and worker configuration when needed

Owners are Biniyam and Anteneh. The current fixture API runs from local source data, so database acquisition becomes relevant when the publishing model is ready.

1. Agree the PostgreSQL major version and Render region.
2. In Render, choose New → Postgres and fill in the database name, region, version and compute/storage settings.
3. Select the same region as the connecting services and review the projected charge.
4. After creation, collect the internal connection URL for Render services. Keep any external development connection details in the secret store.
5. Give Biniyam the connection mechanism and let Hailemichael review access configuration.
6. Verify connectivity with a read-only `SELECT 1` through the chosen database client.
7. Apply the project's migrations when they exist and verify data survives a service restart.

Record the URL in the service's runtime configuration under the adapter's agreed name. The existing `.env.example` reserves `ACCESS_DATABASE_URL` for that integration. [Render Postgres setup](https://render.com/docs/postgresql-creating-connecting)

For the worker, first measure one representative conversion's duration and peak memory. Select the job transport with Biniyam, then collect the required queue URL/credentials if that transport uses a broker. Provide draft-storage access and tool/model files to the worker. [Render background workers](https://render.com/docs/background-workers)

## 10. Prepare optional local transcription

Owner is Biniyam. The supplied lesson already has source captions, so correcting those is the immediate path.

1. Verify FFmpeg is available.
2. Create a separate Python 3.11 experiment environment for Whisper.
3. Install `openai-whisper` in that environment using its official instructions.
4. Download a multilingual model such as `small` while online.
5. Transcribe an authorized short English or Amharic sample, record time/memory, and have a language reviewer compare the output.
6. Keep the chosen model/version, license and configuration with the worker preparation notes.
7. Record Biniyam's CPU/NPU model before choosing a vendor runtime. Check model/operator support and actual device use during a benchmark.

Whisper's transcription output can become a review draft in the publishing pipeline. ASL/EthSL translation and motion authoring require their own resources. [Whisper setup and model documentation](https://github.com/openai/whisper)

## 11. Obtain certificate and recorded-session inputs

Owner is Anteneh, with Biniyam preparing import data.

1. Ask ALX for an approved verification URL and the certificate fields the module may display.
2. Test the link through ALX's intended verifier and record expected unavailable/revoked behavior if documented.
3. Retain synthetic credentials for demo-only issuance/verification flows.
4. For replay, obtain the authorized recording, captions and timestamped chat export.
5. Review names/messages for redaction and distribution permission before making a learner-facing fixture.
6. Verify that chat timestamps use the same timeline as the video.

**Collect** verification contract, authorized recording, reviewed captions, sanitized chat and source/version metadata.

## 12. Prepare configuration and verify what the code consumes

Use a secret store for values and a project note for field names, owners and status. The current API reads `ACCESS_ALLOWED_ORIGINS` from its process environment. The standalone Node example reads `ACCESS_API_BASE_URL`. The database and bucket names in `.env.example` reserve future adapter configuration.

| Configuration | Where to obtain it | Current use |
|---|---|---|
| `ACCESS_ALLOWED_ORIGINS` | Actual browser origin list agreed by Anteneh | API CORS middleware |
| `ACCESS_API_BASE_URL` | API deployment URL | Standalone Node API consumer |
| `ACCESS_DATABASE_URL` | Selected database's connection details | Reserved for persistence adapter |
| `ACCESS_DRAFT_STORAGE_BUCKET` | Storage provider | Reserved for storage adapter |
| `ACCESS_PUBLISHED_STORAGE_BUCKET` | Storage provider | Reserved for storage adapter |
| Storage endpoint, region and key references | Storage provider | Final adapter variable names to agree |
| Signing provider key/model/motion references | Selected provider or authoring workflow | Final adapter configuration to agree |
| ALX launch/identity settings | ALX technical owner | Final production adapter contract to agree |

The current app reads the process environment directly. A local `.env` file needs an explicit loading mechanism when that is added. For a POSIX development shell, an origin setting can be passed directly when starting the API

```sh
ACCESS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173 uv run uvicorn access_api.main:app --host 127.0.0.1 --port 8000
```

On Render, enter values on the service's Environment page. Keep browser-exposed configuration limited to public API/asset locations and approved short-lived access mechanisms.

## 13. Send a readiness handoff

Complete this template in the team's normal coordination channel. Replace each status with the observed result and keep secret values in the secret store.

```text
Owner and date
Machine OS and tool versions
Local build / API tests / browser tests result
Render workspace and credit expiry
Storage provider, endpoint region and bucket names
Credential references in the secret store
ALX technical contact and contracts received
Reviewed English caption revision
Amharic review status
EthSL interpreter / Deaf reviewer / session date
ASL reviewer and selected approach
Avatar rig and motion artifacts received
Description / PDF / BRF reference status
Database and worker readiness
Certificate / replay input status
Remaining blockers, owner and next action
```

The current demo can be reviewed throughout acquisition. New storage, database, translation and production-host settings become operational as their implementation adapters are added and verified.
