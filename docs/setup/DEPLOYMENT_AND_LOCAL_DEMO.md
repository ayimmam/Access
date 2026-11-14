# Run the co-designer demo and deploy on Render

Updated 14 November 2026. Anteneh owns deployment and the $100 Render credit. This guide covers the current public-fixture service and optional first-party privacy/session demonstration. The [co-designer task guide](../testing/CO_DESIGN_SECURITY_TESTING.md) supplies the testing sequence.

## Local demonstration

From the Access repository root, use the existing environment and build:

```sh
git submodule update --init
uv sync --locked --python 3.11
npm ci
npm run build
uv run uvicorn access_api.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Keep the server terminal open. If the environment and dependencies are already installed, subsequent sessions need only the build after component changes and the final server command. Stop a terminal-launched server with Ctrl+C. Restart using the same command.

| Demonstration | Local URL | First task |
| --- | --- | --- |
| Savanna lesson | `http://127.0.0.1:8000/demo/savanna` | Watch the source video, search the transcript, resize text and download HTML |
| Second provider | `http://127.0.0.1:8000/demo/ethioware` | Use the same tools in the Ethioware-style layout and switch sample lessons |
| Career gateway | `http://127.0.0.1:8000/demo/careers` | Find a role, filter support offered, open details and inspect the fictional verification link |
| Installation | `http://127.0.0.1:8000/demo/plug-in` | Install/remove the component, change host appearance and inspect embed code |
| Privacy and sessions | `http://127.0.0.1:8000/demo/privacy` | Sign in using a facilitator-created fictional account |
| API | `http://127.0.0.1:8000/api/docs` | Inspect the actual versioned endpoints |

The current co-design session starts with the lesson and career pages, as requested. The local server listens on this computer's loopback interface. Other devices need a reachable HTTPS deployment for the complete privacy/session flow. Use the Render URL on a participant's phone when that deployment is ready. Secure session cookies remain enabled.

### Optional privacy-account setup

In another terminal at the repository root:

```sh
uv run python scripts/setup_security_demo.py
```

Choose a fictional alias and a passphrase of at least 15 characters. Enter it locally through the hidden prompt, then restart the API. The account/key/database stay under ignored `artifacts/security/` by default. Use the exact `127.0.0.1:8000` address shown above so the configured Origin matches. The architecture guide explains session and privacy behavior. [Security/privacy architecture](../security/SECURITY_PRIVACY_ARCHITECTURE.md).

### Co-design presentation order

1. Let the participant use their normal device/tool and explain the lesson task in their preferred language.
2. Show the Savanna lesson, then the same component in the Ethioware-style host.
3. Move to Careers and ask them to find a suitable fictional role. Observe search, support filters, detail reading and the certificate link.
4. Show the installation page when discussing adoption with a judge or platform engineer.
5. Use the privacy console after preparing a fictional account and the participant agrees to that exercise.
6. Record unaided, assisted, blocked and skipped outcomes, agree fixes, then retest.

Draft source captions, signing prototypes, unavailable reviewed media and recorded-audio gaps are visible in the interfaces. Device speech depends on an installed local English voice. Capture these limitations in the test record.

## Prepare the source for Render

The latest implementation currently includes local changes on `codex/judging-pivot-plan`. A Git-backed deployment uses a pushed commit, so first commit/push the intended files, obtain human review, pass the actual required checks and merge through protected `main`. Keep generated keys, SQLite files, recordings without publication permission and model weights out of Git. Preserve the Savanna gitlink and `.gitmodules` mapping.

Verify the deployment commit contains `services/api`, `services/core`, `examples`, component source, the lockfiles, scripts and the supplied `example lessons/` video/caption files. Render reads root `.gitmodules` and clones configured submodules. The build command also initializes the pinned Savanna reference explicitly. [Render Git-provider integration](https://render.com/docs/git-provider).

Before release, use the available checks:

```sh
npm run build
uv run pytest -q
npm run test:browser
python3 scripts/check_repository.py
bash scripts/check_security_baseline.sh
git diff --check
```

Keep GitHub CI status and local test results distinguishable in the handoff. Resolve an account/billing lock that prevents GitHub checks from executing before relying on automated deployment.

## Create the Render web service

1. Connect the GitHub repository to Render and select **New → Web Service**.
2. Choose `ayimmam/Access` and the reviewed `main` branch. Leave Root Directory empty so the repository root is used.
3. Select the **Python 3** native runtime. Python and the component build can share one service because Render's native environment includes Node/npm. [Native tools](https://render.com/docs/native-runtimes).
4. Set the service name, for example `access-demo`, and record its assigned HTTPS origin from Render.
5. Set the build, start and health-check values below. Begin with one instance. The current SQLite security store is a single-host demo design.
6. Select the instance/disk options after reviewing the current dashboard estimate against the credit. Record the expected monthly total, credit expiry and budget alerts. The credit balance does not automatically cap spend.
7. Keep Auto-Deploy **Off** during initial setup and smoke testing. After the reviewed branch's checks run reliably, use **After CI Checks Pass** together with the repository's strict final CI gate and human review. Render also accepts neutral/skipped check conclusions, so preserve the repository's gate that requires verification jobs to succeed. [Render deployment behavior](https://render.com/docs/deploys).

### Build command

Paste this as one command:

```sh
git submodule update --init --depth 1 && npm ci --include=dev && npm run build && uv sync --locked --no-dev --python 3.11
```

The TypeScript/build tools are needed during the component build. The uv command installs the runtime Python dependencies from the lockfile. Media capture/model dependencies are optional preparation tools and stay outside this web-service install.

### Start command for the initial public-fixture deployment

```sh
.venv/bin/uvicorn access_api.main:app --host 0.0.0.0 --port "$PORT" --no-access-log
```

Set Health Check Path to `/healthz`. Render supplies `PORT`; binding to `0.0.0.0` makes the service reachable through Render's routing. The current health endpoint reports process availability and public-fixture mode. Validate the actual demo pages and optional database separately. [FastAPI deployment](https://render.com/docs/deploy-fastapi).

### Runtime settings

| Variable | Value/purpose |
| --- | --- |
| `PYTHON_VERSION` | `3.11.18`, matching the verified local Python patch |
| `NODE_VERSION` | `24`, the team/CI baseline |
| `UV_VERSION` | `0.13.8`, matching the repository CI install |
| `ACCESS_ALLOWED_ORIGINS` | Exact independent host origins that need to fetch public API/assets, comma-separated. Same-origin demos work without extra entries. |
| `ACCESS_SIGNING_DIR` | Optional absolute directory containing reviewed signing manifests/assets when those are provided |

Render supports explicit Python, Node and uv version selection. Confirm the selected versions in build logs. [Python/uv versions](https://render.com/docs/python-version), [Node version](https://render.com/docs/node-version).

## Enable the hosted privacy/session demonstration

### Storage and keys

1. Use a paid web-service instance with a persistent disk if you want accounts/sessions/preferences to survive restarts. Mount the disk at `/var/data` and keep the initial instance count at one. Render's default filesystem is ephemeral, and persistent disks are available on paid services. [Persistent disks](https://render.com/docs/disks).
2. Set `ACCESS_SECURITY_DB` to `/var/data/access-demo.sqlite`.
3. Generate a dedicated hosted-demo Fernet key in an ignored local file without printing it:

```sh
uv run python - <<'PY'
import os
from pathlib import Path
from cryptography.fernet import Fernet

directory = Path("artifacts/render")
directory.mkdir(parents=True, exist_ok=True, mode=0o700)
descriptor = os.open(directory / "access-demo.key", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(descriptor, "wb") as handle:
    handle.write(Fernet.generate_key())
PY
```

If the file already exists, preserve it. Changing the key for an existing database requires a controlled migration.

4. In Render's Environment panel, add a **Secret File** named `access-demo.key`. Transfer the file's contents through that private UI. Set `ACCESS_SECURITY_KEY_FILE` to `/etc/secrets/access-demo.key`. Keep the key separately from the persisted database. [Render secrets](https://render.com/docs/configure-environment-variables).
5. Set `ACCESS_SECURITY_ORIGIN` to the exact assigned HTTPS origin, for example `https://access-demo.onrender.com`, replacing the example with the real address. Include a custom domain only after choosing it as the console's canonical origin.

### HTTPS and trusted proxy settings

Render terminates HTTPS before forwarding to the application. The security middleware needs the correct original scheme and the rate limiter needs trusted client metadata. Configure Uvicorn's proxy trust for Render's actual trusted ingress IPs/CIDRs for this service. Obtain/confirm that list from the deployment environment or Render support, then set `FORWARDED_ALLOW_IPS` accordingly. Its value is an infrastructure setting. Keep it restricted to the managed ingress.

Use this start command once the trusted list is configured:

```sh
.venv/bin/uvicorn access_api.main:app --host 0.0.0.0 --port "$PORT" --no-access-log --proxy-headers --forwarded-allow-ips "$FORWARDED_ALLOW_IPS"
```

Verify the application's HTTPS handling through the public URL before creating learner sessions. A private API response with `https_required` indicates the original scheme is missing or untrusted. Keep HTTPS enforcement enabled while correcting proxy trust. Render's guidance explains restricting forwarded-header trust to the managed load balancer's private addresses. [Proxy configuration](https://render.com/articles/fastapi-production-best-practices).

### Create the fictional hosted account

After the configured service is live, open its Render Shell and run:

```sh
.venv/bin/python scripts/setup_security_demo.py
```

Choose a fictional alias and a passphrase through the hidden prompt. The configured secret file and `/var/data` database are used by this command. Then open the hosted `/demo/privacy` page and test sign-in. Share credentials with the participant privately in a paste/password-manager-compatible format.

## Smoke-test the deployment

Replace the sample origin in this command with your real service URL:

```sh
curl --fail --silent --show-error https://access-demo.onrender.com/healthz
```

Then test the service through a browser:

- `/demo/savanna` loads the video, captions, transcript and offline download.
- `/demo/ethioware` loads the same component and switches demo lesson content.
- `/demo/careers` loads four fictional jobs, local filters, details and verification states.
- `/demo/plug-in` loads build-generated integrity metadata and installs the component.
- `/demo/privacy` reports setup status or accepts the configured fictional account. Confirm Secure/HttpOnly/SameSite cookie flags, recent-auth recovery, sign-out and revocation.
- Privacy responses use no-store and expected framing/CSP headers. Confirm transport is recognized as HTTPS.
- Restart the service and confirm the hosted demo account still exists on the persistent disk.
- Test the complete journey on the co-designer's device and assistive tools, then record failures and retests in the [task guide](../testing/CO_DESIGN_SECURITY_TESTING.md).

For independent installation, add the real host origin to `ACCESS_ALLOWED_ORIGINS`, allow script/API/media sources under the host CSP and copy the absolute embed URLs from `/demo/plug-in`. The Ethioware/Savanna-style pages on this service demonstrate the shared component's behavior. Live partner installation still requires its supported integration access.

## Recovery and rollback

| Symptom | Check |
| --- | --- |
| Missing component or `integrity.json` | Confirm root build command ran and retained `packages/lesson-component/dist/` |
| API startup fails on Savanna image directory | Verify submodule initialization and pinned checkout |
| Video/captions missing | Confirm supplied `example lessons/` files are in the deployed commit |
| Security `origin_rejected` | Match the browser's exact canonical origin/Host to `ACCESS_SECURITY_ORIGIN` |
| Security `https_required` | Correct trusted proxy handling for the original HTTPS scheme |
| Privacy setup-required response | Check runtime secret-file path/key configuration and restart/redeploy after initial setup |
| Accounts disappear after restart | Confirm `ACCESS_SECURITY_DB` points inside the persistent disk |
| Short sign-in wait | Respect `Retry-After`; the demo bounds expensive password work and repeated attempts |
| Signing asset unavailable | Supply reviewed manifests/assets at the configured path and verify lesson/version/hash binding |

Record the last successful deploy and its source commit. Use Render's Deploys page to roll back to a retained successful build, then repeat smoke tests. Preserve the matching key and database state. Disk contents retain state across code rollbacks, so any storage/schema changes need their own backup and recovery procedure. [Render rollback behavior](https://render.com/docs/rollbacks).

## Capacity and delivery boundaries

This setup is the current single-service demonstration. The two-week production work still needs shared session/rate-limit storage, partner identity/enrollment, authorized media delivery/CDN, reviewed alternatives and measured 3,000-concurrent testing. Track media bandwidth separately from compute credit. Follow the [capacity and hardening plan](../planning/JUDGING_PIVOT_PLAN.md) and [security architecture](../security/SECURITY_PRIVACY_ARCHITECTURE.md).

The repository currently has container/Compose placeholders. This guide uses Render's native Python runtime. The organizer's Compose submission deliverable remains an implementation task.
