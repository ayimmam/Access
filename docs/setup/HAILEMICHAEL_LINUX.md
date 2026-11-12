# Hailemichael — Linux / security implementation

Read [common setup](COMMON.md) first. You own security features and verification, with Biniyam implementing shared backend controls and Anteneh integrating frontend/deployment safeguards.

## Identify the distribution

The distribution/version is pending; do not assume Ubuntu. Run:

```sh
cat /etc/os-release
uname -m
```

Record distro, version and architecture. Use its package manager for Git, curl, CA certificates, compiler/build tools and FFmpeg. The following is **only for Ubuntu/Debian**:

```sh
sudo apt update
sudo apt install -y git curl ca-certificates build-essential ffmpeg
```

For Fedora, Arch or other distributions, use their own package names and instructions. Install Node 24 and uv from the common guide, then `uv python install 3.11`; do not alter system Python.

Install Docker Engine and the Compose plugin using the [Docker distribution-specific guide](https://docs.docker.com/engine/install/) and [Compose installation guide](https://docs.docker.com/compose/install/linux/). Rootless Docker is an option where supported. Membership of the regular Docker group grants powerful host access; do not work around permission errors with a world-writable Docker socket.

Run the common verification commands. If using a rootful daemon without Docker-group membership, the Docker checks may require `sudo`; follow the chosen installation's privilege model consistently.

## Prepare security tools

Install Semgrep in its isolated tool environment:

```sh
uv tool install semgrep
semgrep --version
```

This follows Semgrep's [CLI installation guidance](https://semgrep.dev/docs/semgrep-ci/sample-ci-configs). If the executable is not on PATH, follow uv's shell-path instructions and reopen the terminal.

Install Trivy using its [official installation instructions](https://trivy.dev/docs/latest/getting-started/installation/) for the actual distribution. Then check:

```sh
trivy --version
```

Download its vulnerability database while online using `trivy image --download-db-only`. Offline results become stale; record the database age and refresh before release. Cache the agreed Semgrep rules locally if offline scans are needed; registry-based rules require network access when not cached. No paid scanning account is required for basic local preparation.

Prepare Chrome/Chromium, Firefox and keyboard-only testing. Cross-check with Biniyam's NVDA and Anteneh's VoiceOver/TalkBack results. A proxy tool such as OWASP ZAP is optional for the local/staging app; it is not required to start, and testing does not extend to ALX production.

## Read before implementing controls

- [Current implementation plan](../planning/TRACK_2_IMPLEMENTATION_PLAN.md), especially security reconciliation.
- [Security implementation plan](../security/SECURITY_PLAN.md).
- [Revised architecture v3](../security/SECURITY_ARCHITECTURE_V3.md) and [review](../security/SECURITY_ARCHITECTURE_REVIEW.md).
- [Agent security rules](../../.agents/rules/security.md).

The older documents/rules contain proposals that need reconciliation before implementation: logging content versus minimizing logs, storage prefixes versus separate permissions, and different authentication assumptions. Record conflicts rather than copying contradictory rules into code. ALX authentication is explicitly unconfirmed; no session cookie or user-controlled lesson ID is proof of entitlement.

## Prepare the verification matrix

These are future checks, not implemented tests or completed audit results:

| Surface | Evidence to implement with the owner |
|---|---|
| API authorization | Foreign job/draft access denied; role plus assignment/version enforced |
| Component | Caption/chat/transcript payloads remain inert; Shadow DOM is not a security boundary |
| Staff mutations | Exact-revision review approval and authentication-appropriate CSRF controls |
| Workers | URL/redirect restrictions, isolated conversion, resource limits, no direct publication |
| Sessions | Accessible expiry/recovery; revocation enforced server-side |
| Downloads/offline | No secrets in packs; authenticity and hashes checked before reader rendering |
| Throttling | Useful retry guidance and no blanket shared-network lockout |
| Deployment | No debug exposure, leaked tokens, public drafts or secrets in frontend bundles |

Coordinate `nh3`/XML handling with Biniyam and CSP/build provenance with Anteneh. Obtain representative malicious and invalid inputs in `fixtures/security/` during implementation. Run tests against local/public-fixture staging only. Do not claim a security gate passed because the scaffold has no executable code to scan.

## Ready when

- [ ] Distribution and architecture recorded, or distro-specific installations left pending.
- [ ] Common toolchain and Docker/Compose work.
- [ ] Semgrep and Trivy installed; necessary rules/database cached with versions recorded.
- [ ] Security-document conflicts and priorities are recorded for the team.
- [ ] Verification matrix is assigned jointly with API/product owners.
- [ ] No production Savanna credentials or access assumptions are needed for the first slice.
