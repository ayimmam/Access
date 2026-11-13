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

## Render demo deployment — $100 credit available

Confirmed by the user on 12 November 2026: **Render is the demo host and $100 in credit is available.** Anteneh owns deployment and billing tracking. This guide does not provision services or verify the credit in the account.

Use one shared demo environment initially, connected to `ayimmam/Access` and protected `main`. Keep local development on Compose. Avoid paid per-PR environments until their cost is justified.

| Component | Proposed Render placement | Preparation |
|---|---|---|
| Component bundle, console, first-party reader | Static site(s) | Define build outputs and immutable component URLs when implemented |
| FastAPI | Paid web service for the live demo | Bind to Render's assigned port, define a real health endpoint and test restart recovery |
| Conversion pipeline | Separate background worker | Benchmark memory/CPU with Biniyam; choose queue before provisioning its backing service |
| Metadata | Render Postgres | Same suitable region as API/worker; migrations and backup/export procedure |
| Media and exports | Durable object storage, provider still to select | Separate draft/published access; do not rely on service-local temporary files |
| Secrets | Render environment/secrets configuration | Server-side only; no credentials in static builds, logs or repository |

Render [background workers](https://render.com/docs/background-workers) run continuously and do not receive incoming network traffic. They are distinct from the web service. Biniyam's local NPU is not available to a Render worker. Precompute expensive reviewed media locally where appropriate; demonstrate a real short export job if claiming the hosted pipeline works.

Prefer a paid API instance for demo reliability: [free web services spin down after inactivity](https://render.com/docs/free). The smallest tier is a candidate only after measuring memory and processing time. Store uploads and outputs durably; do not assume two services share a filesystem. The Render credit does not automatically cover an external storage provider.

### Budget preparation

Before creating services, verify credit balance, expiry, eligible charges and any payment-method requirements in the actual workspace. Check current [Render pricing](https://render.com/pricing); no tier prices are fixed in this guide.

Prepare a cost sheet with service name, tier, region, storage, rate, intended running period and projected total. Include workspace charges, database/storage, worker time, bandwidth/build overages and any queue service. Suggested operating target: at most **$70 of planned eligible consumption**, retaining **$30 contingency** within the $100 credit; this is an internal planning allocation, not a Render quote or hard billing limit. Track external costs separately.

Review usage daily and after resizing. Avoid leaving experiments or duplicate environments running. Before the credit expires, export required data and stop/remove services that are no longer needed using the provider's supported controls; document which resources continue billing. Do not assume exhausted credit automatically prevents further charges. Preserve the demo through the agreed judging window before teardown.

### Deployment and rollback

1. Confirm repository access and target Linux image architecture. Apple Silicon builds must target the architecture supported by the selected Render runtime; test native-library compatibility.
2. Once runnable code exists, define build/start commands, health checks, database migrations, CORS origins, secrets and durable storage. Keep demo content public and synthetic/authorized; ALX production authentication is still unconfirmed.
3. Connect the GitHub repository and `main`. Use **After CI Checks Pass** after real push-to-main checks exist. Until then, leave automatic deploys **Off**. Do not also trigger a deploy hook for the same commit.
4. CI must run on pull requests and pushes to `main`, with a final always-evaluated gate that fails when a required implementation check fails, is cancelled or unexpectedly skips. Render accepts neutral/skipped checks, so its setting alone does not establish full test coverage. See [Render deploy behavior](https://render.com/docs/deploys).
5. Verify the deployed commit, API health, lesson playback, captions, real downloads, offline reader and one worker job. Keep operational evidence without user data. Preserve a known-good release and database-compatible rollback procedure; an application rollback does not reverse a migration.
6. Rehearse from a phone and a separate browser session before the demo. Freeze risky changes during the presentation window and keep approved offline assets available.

## GitHub branch rules — Anteneh sets up

Repository: `ayimmam/Access`; observed default branch: `main`. These are planned settings, not already-enabled remote protections.

In repository Settings → Rules → Rulesets (or Settings → Branches → branch protection), create an active rule targeting `main`:

- Require a pull request and **one approval from another human teammate**. Agents cannot approve their own work or replace the human review.
- Dismiss stale approvals when new commits are pushed; require approval of the latest reviewable push by someone other than its author, where supported.
- Require conversation resolution and block force pushes/deletion of `main`.
- Apply protections to administrators and avoid routine bypass actors, including automation identities.
- Require the branch to be up to date before merging once CI is in place. Use squash merges to keep a readable history.
- Add required status checks **only after their actual jobs have run successfully**. Select their real names and trusted source application; do not invent required check names that will permanently block PRs.

Enable the PR/review protections first; add CI requirements as implemented. GitHub protection availability depends on repository visibility and account plan: see [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches). If unavailable, document the gap and use manual PR/review plus manual Render deployment; do not claim equivalent enforcement or change repository visibility just to unlock a feature.

The repository includes `.github/workflows/ci.yml` and `scripts/configure_github_protection.sh`. After the workflow has run on GitHub and `gh auth status` succeeds, apply the final settings with `bash scripts/configure_github_protection.sh ayimmam/Access main`. The script requires GitGuardian, `Repository checks` and `Security baseline`; it enforces one approval, dismisses stale reviews, requires approval after the latest push, resolves conversations, keeps history linear, applies rules to administrators and blocks force pushes/deletion.

### Current GitHub setup status — 12 November 2026

- [Pull request #1](https://github.com/ayimmam/Access/pull/1) contains the CI workflow, contributor/agent rules and protection script. GitGuardian passes on the PR.
- The owner changed the repository to public. `main` protection is active with strict/up-to-date checks, GitGuardian required from its GitHub App, one human approval, stale/latest-push approval controls, resolved conversations, linear history and administrator enforcement. Force pushes and deletion are blocked.
- Public visibility fixed the earlier `BuildFailed` startup condition: GitHub now creates both custom jobs with the correct names. Neither receives a runner because GitHub reports that the account is locked due to a billing issue; no workflow step has executed.
- Until the billing lock is resolved, the custom jobs are intentionally not required. To complete enforcement, resolve the GitHub billing/account lock, rerun the workflow, verify both jobs pass, run the protection script to add them, and test direct-push/review/check blocking.

Test with a harmless documentation PR: direct updates to `main` must be rejected, an unreviewed PR blocked, and a failing required check must prevent merging once configured. Then obtain a teammate review, pass the checks and verify normal merging works. Record the rule names and actual required check names. Every contributor and agent follows [CONTRIBUTING.md](../../CONTRIBUTING.md); the root [AGENTS.md](../../AGENTS.md) makes the same expectations discoverable to agents.

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
- [ ] Render credit eligibility/expiry and projected spend are recorded; demo services fit the budget.
- [ ] `main` branch rules are enabled and tested, or the plan/visibility limitation is documented.
- [ ] CI-gated deployment is configured only after actual checks exist.
- [ ] Target image architecture and public-fixture deployment path are agreed.
- [ ] Component/API contract session is scheduled with Biniyam.
- [ ] Security gate ownership is agreed with Hailemichael.
