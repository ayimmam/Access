# Contributor workflow — people and AI agents

Applies to all team members and agent-authored changes. Read the [implementation plan](docs/planning/TRACK_2_IMPLEMENTATION_PLAN.md), [common setup](docs/setup/COMMON.md) and relevant security guidance first. Anteneh owns product/deployment/CI, Biniyam data/backend/pipeline, and Hailemichael security. Coordinate changes across those boundaries.

## Before editing

- Check the current branch, working-tree status and relevant instructions. Preserve unrelated work; never reset or clean another contributor's changes.
- Use a focused branch from current `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>` or `chore/<topic>`. Do not develop, push directly or force-push on `main`.
- Keep the task scoped. For documentation-only work, do not install packages, implement features or deploy services.
- Confirm dependencies and public API/event/schema changes with the affected owner in the PR. Keep source captures in `Savanna-static-pages/` unchanged unless the task explicitly requires otherwise.

## Checks before requesting review

| Change | Required evidence |
|---|---|
| Every change | Inspect changed files and diff; run `git diff --check`; check for accidental secrets, generated artifacts and unrelated changes |
| Documentation | Verify local links, paths and commands; label assumptions and unimplemented setup accurately |
| TypeScript/UI | Available formatting/type/build checks; keyboard/focus and relevant automated browser tests |
| Python/API/data | Available lint/type/tests; validation, resource ownership and migration checks appropriate to the change |
| Security/auth/storage | Negative cases with Hailemichael; no secrets, draft access, sensitive logs or browser trust shortcuts |
| Media/export/offline | Open actual generated files; verify review/version binding and intended reader/device behavior |
| Dependencies | Justify additions, update lockfiles, inspect licenses and available vulnerability results |
| CI/deployment | Validate config, confirm least-privilege secrets and target architecture, document migrations/cost/rollback |

Run only commands that exist. While the repository is a scaffold, record app tests as **not available**, never passed. Do not create empty tests or suppress failures to obtain green checks. Document exact checks and outcomes, including failures and relevant manual evidence. Resolve new failures before merge; explain existing unrelated failures rather than hiding them.

The initial CI runs two required jobs: `Repository checks` validates local Markdown links, JSON, tracked credential-file names, conflict markers and Python syntax; `Security baseline` checks tracked filenames and a small set of high-confidence key patterns. These are repository-hygiene gates, not application, accessibility or comprehensive security tests. Extend CI with real build and behavior checks as each implementation area becomes runnable.

Use `git status --short`, `git diff --stat`, `git diff`, `git diff --cached` and `git diff --check` to review changes before committing. Inspect untracked files too; ordinary `git diff` does not include them. Never commit `.env`, private keys, deploy hooks, learner data, model weights or unauthorized media. Keep `.env.example` value-free. A scan is supporting evidence, not a substitute for inspecting what is staged.

## Pull requests and review

Explain the concrete change, why it is needed, test evidence, limitations and any migration/deployment effect. One other human teammate reviews before merge; ask the relevant owner for domain-sensitive work. AI-generated work follows the same standard, and its submitting human remains responsible for understanding it.

Resolve review threads, keep approvals current after substantive changes and pass the repository's actual required checks. Do not bypass protection or reduce tests/rules to land a change. Merge through GitHub into `main`; contributors must not rewrite shared branch history. Keep permissions and branch-rule changes with Anteneh, with Hailemichael reviewing security implications.

## Deployment

Render is the demo target with $100 credit available. Anteneh coordinates deployments and tracks costs using the [Render plan](docs/setup/ANTENEH_MACOS.md). Deploy the reviewed `main` commit after real CI checks pass. Do not create paid resources, change billing, trigger deploy hooks or publish a new release merely because a coding task is assigned; follow the user's explicit task scope and any existing deployment authorization. Do not re-request approval already granted for that task.

The initial demo uses public fixtures. ALX identity is unconfirmed, and claims of production integration, accessible exports or security compliance require actual evidence.
