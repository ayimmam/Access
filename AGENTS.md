# Repository instructions for AI agents

Read and follow [CONTRIBUTING.md](CONTRIBUTING.md) for every change, along with the [implementation plan](docs/planning/TRACK_2_IMPLEMENTATION_PLAN.md) and applicable [.agents/rules/security.md](.agents/rules/security.md).

- Inspect the branch and working tree before edits. Work on a focused task branch, preserve unrelated changes, and never push directly or force-push to `main`.
- Respect the requested scope. Setup/documentation requests do not authorize application implementation, installing dependencies or deployment.
- Follow the same relevant checks and human PR review as contributors. Never represent unavailable tests as passing, bypass checks, weaken protection or self-approve an agent-authored PR.
- Check links for documentation changes; use actual available lint/build/tests for code changes. Review the complete diff, including untracked/staged files, and report checks run and remaining gaps.
- Keep secrets, deploy hooks, private content and model weights out of source and output. Never use captured Savanna credentials. ALX authentication is unconfirmed.
- Use the implementation plan's explicit reconciliation for conflicting historical architecture proposals; report unresolved material conflicts instead of silently implementing both.
- Render is the demo platform; Anteneh owns CI/CD and the $100 credit budget. Do not provision paid resources or deploy outside the user's authorized scope. Existing task authorization persists; do not add redundant approval steps.
- Keep original Savanna fixtures intact and avoid unrelated refactors. Do not spawn agents unless the user or applicable instructions explicitly request delegation.

Human owners: Anteneh — product/deployment; Biniyam — data/backend/pipeline; Hailemichael — security. See [team setup](docs/setup/README.md).
