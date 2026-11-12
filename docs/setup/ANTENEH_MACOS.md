# Anteneh — macOS / product, deployment and CI/CD

Read [common setup](COMMON.md) first. You own product implementation, the component/UI integration and deployment/CI/CD, working with Biniyam on contracts and Hailemichael on security gates. Continue coordinating co-design and the submission package.

## Install the workstation tools

Use existing installations where available. Install Apple's command-line tools if missing:

```sh
xcode-select --install
```

With [Homebrew](https://brew.sh/) already installed:

```sh
brew install git uv ffmpeg gh
uv python install 3.11
```

Install Node 24 using the official instructions or your existing version manager, as described in the common guide. Install [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/) for the correct Apple Silicon/Intel architecture, open it and complete initialization. Do not run a second container manager simultaneously against the same intended development context.

Run the common verification commands, then:

```sh
uname -m
gh --version
docker buildx version
```

If using GitHub, authenticate interactively with `gh auth login`, then `gh auth status`; do not paste tokens into documentation. See [GitHub CLI authentication](https://docs.github.com/en/github-cli/github-cli/authenticating-with-github-cli).

## Product preparation

- Prepare Safari, Chrome and Firefox. Enable VoiceOver and learn keyboard navigation through a sample page. Arrange the Android/TalkBack device.
- Download Able Player's release/demo assets and examine required dependencies. Validate Shadow DOM compatibility before selecting it as the component base.
- Agree manifest and public event contracts with Biniyam; keep React confined to the console unless a later design decision explicitly changes that boundary.
- Prepare an authorized short lesson and local font files. Keep original Savanna captures intact and plan the integrated page under `examples/savanna/`.
- After project dependencies exist, install Playwright browsers and run actual keyboard, focus, multi-instance and viewport checks. Automated accessibility scans do not replace VoiceOver/NVDA/TalkBack tests.

## Deployment preparation — accounts and decisions, not deployment yet

Prepare access to the code repository and the selected hosting account. Do not purchase or configure multiple providers before choosing one. The deployment needs:

| Capability | Preparation |
|---|---|
| HTTPS static hosting | Component bundle, console and first-party reader |
| Long-running Python service | API; not just a static-site host |
| Background execution | Separate conversion worker with resource limits |
| PostgreSQL | Persistent database and migrations |
| Object storage | Separate draft/published permissions; approved asset delivery |
| Configuration/secrets | Runtime injection and CI secrets, never frontend variables |
| Logs/health/rollback | Operational checks with no tokens, transcripts or learner PII |

Record provider, region, cost allowance, deployment architecture and image architecture. On an Apple Silicon Mac, an arm64 image is not automatically deployable to an amd64 server; use Buildx for the selected target and test the resulting image. This is especially relevant to media/native-library wheels.

A public-fixture demo can be deployed before ALX authentication is agreed. Do not promise production SSO, change Savanna cookie settings or enable protected lessons without that contract.

## CI/CD implementation checklist for later

No workflow is created by this setup guide. Once code and lockfiles exist, wire these stages with Hailemichael:

1. Locked dependency installation and formatting/type checks.
2. Core/API tests and frontend/browser tests appropriate to implemented behavior.
3. Dependency, secret and container scans; review findings rather than treating an empty scaffold scan as proof.
4. Reproducible bundle/container build and artifact recording.
5. Public-fixture staging deployment, migration handling, smoke checks and rollback.

Use scoped deployment credentials. Keep production credentials away from untrusted pull-request jobs. Pin CI actions and container bases when the workflow is authored. Ask Hailemichael to review the resulting concrete workflow before enabling protected deployment.

## Ready when

- [ ] Common tools, GitHub access (if used), Docker and Buildx work.
- [ ] VoiceOver and target browsers are ready; Android test access is arranged.
- [ ] Hosting options and required account access are recorded, with costs understood.
- [ ] Target image architecture and public-fixture deployment path are agreed.
- [ ] Component/API contract session is scheduled with Biniyam.
- [ ] Security gate ownership is agreed with Hailemichael.
