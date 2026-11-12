# Common setup — everyone

Prepared 12 November 2026. Start here before the OS-specific guide.

## Install now

| Tool | Team baseline | Purpose |
|---|---|---|
| Git and editor | Current supported release; editor of choice | Collaboration and editing |
| Node.js / npm | Node 24.x; use its bundled npm | TypeScript component and React console |
| uv / Python | uv and Python 3.11 | Isolated API/worker environments |
| Docker / Compose | Docker Desktop on Windows/macOS; Engine plus Compose plugin on Linux | Reproducible Linux services |
| Browser | Chrome or Chromium and Firefox | Host integration and accessibility checks |
| FFmpeg / ffprobe | OS-supported release | Inspect, extract and convert media |

Install Node 24 using the [official download instructions](https://nodejs.org/en/download). If an existing version manager is available, use it instead of installing a second manager. With nvm already installed on macOS/Linux/WSL:

```sh
nvm install 24
nvm use 24
```

Install uv using its [official OS-specific instructions](https://docs.astral.sh/uv/getting-started/installation/). Then:

```sh
uv python install 3.11
uv python find 3.11
```

Python 3.11 is a preparation baseline for the media toolchain, not a promise that every future dependency has been tested. Do not replace your OS Python. Install application packages into isolated environments when the project manifests are ready.

## Repository and collaboration

1. Get the actual repository URL and collaborator access from Anteneh; clone using your own account. Do not copy somebody else's authenticated checkout or credentials.
2. Keep `Savanna-static-pages/` as the supplied reference. Build modified integration examples in `examples/savanna/`.
3. Work on task branches and coordinate edits to shared contracts. Commit lockfiles once dependencies are selected; record exact runtime versions after the first successful install.
4. Keep `.env`, credentials, private recordings and downloaded model weights out of Git. `.env.example` contains names only. Share configuration through the team's approved secret channel.
5. Never copy the captured Savanna session fields into an API client. Production identity is still unresolved.

The repository currently has **no runnable build, tests, Compose stack or Python package configuration**. Do not run `npm ci`, `uv sync` or `docker compose up` expecting an application. Those commands become relevant only after manifests, lockfiles and Compose services are implemented. Empty scaffold files are not test coverage.

## Libraries to select and lock during implementation

These are proposed dependencies, not packages everyone must install globally now.

| Area | Candidates | Owner |
|---|---|---|
| Component and console | TypeScript, Vite, React/React DOM for console only | Anteneh |
| Accessible player | Able Player plus the dependencies required by its selected release | Anteneh with Biniyam |
| API and validation | `fastapi[standard]`, Pydantic, `pydantic-settings` | Biniyam |
| Data and migrations | PostgreSQL, SQLAlchemy, Alembic, Psycopg | Biniyam |
| Storage | `boto3` if S3-compatible storage is selected | Biniyam + Anteneh |
| Content protection | `nh3`, `defusedxml`; cryptographic library when signed-pack format is defined | Hailemichael + Biniyam |
| Media/export | Whisper (optional), WeasyPrint, Liblouis, DAISY Pipeline | Biniyam |
| Tests | pytest, HTTPX, Playwright, `@axe-core/playwright` | Shared |
| Security tooling | Semgrep; container/dependency scanning with Trivy | Hailemichael |

FastAPI's standard extra includes common server tooling; see [installation](https://fastapi.tiangolo.com/). Able Player remains a candidate until we test its DOM/style assumptions inside our custom element; download its [release and documentation](https://github.com/ableplayer/ableplayer), not an unreviewed CDN bundle. Browser-native WebVTT, fetch, custom elements and ZIP support on Python's standard library avoid unnecessary packages.

Redis/Celery, protected external embeds, LTI libraries, paid AI services and a staff identity provider are deferred decisions. A dedicated worker is planned, but the queue technology is not selected.

## Download before connectivity becomes limited

- Cache the installers and the exact container images chosen by the team. Biniyam and Anteneh agree the PostgreSQL major version; pull that exact version rather than `latest` once selected.
- Download test-browser binaries after Playwright is installed in a separate preparation sandbox or the implemented project. `npx playwright install` needs a locally installed Playwright package; Linux may additionally require `npx playwright install --with-deps` and administrator access. See [Playwright setup](https://playwright.dev/docs/intro).
- Biniyam downloads the chosen multilingual model weights once and records model name, license, size and checksum. Everyone does not need a model or NPU runtime.
- Store approved sample media, English/Amharic text, local Ethiopic fonts and font licenses outside generated build folders. Use synthetic or team-owned samples.
- Prepare a local fallback demo plan. External CDNs, live AI calls and production Savanna access must not be required to play already published content.

## Accessibility and content readiness

Biniyam prepares Windows NVDA; Anteneh prepares macOS VoiceOver and an Android TalkBack test device; Hailemichael prepares keyboard and Linux browser checks. Agree one short sample with headings, a table, an image description, English/Amharic text and captions. Arrange interpreter/Deaf review and Braille review; installing software does not replace these people.

PDF generation must preserve tags, reading order and Ethiopic text. WeasyPrint's PDF/UA mode is a candidate, not automatic compliance: [PDF/UA guidance](https://doc.courtbouillon.org/weasyprint/stable/common_use_cases.html). Prepare a PDF accessibility validator and manual screen-reader review. Liblouis translation and Braille page formatting are separate steps; Amharic tables/profiles remain subject to expert validation.

## Common verification

Run from your chosen development shell after installation:

```sh
git --version
node --version
npm --version
uv --version
uv python find 3.11
docker version
docker compose version
ffmpeg -version
ffprobe -version
```

`node` should report 24.x. `docker version` should show both client and server. Once online, `docker run --rm hello-world` is an optional engine smoke check; it downloads an image and runs a temporary container.

Share this readiness note with the team without secrets:

```text
Name / OS version / CPU architecture:
Node / npm / uv / Python versions:
Docker server + Compose working:
FFmpeg + ffprobe working:
Repository access:
Browsers / assistive tools ready:
Cached tools, images and samples:
Blockers:
```

This verifies tools only. Application, security and accessibility tests remain pending implementation.
