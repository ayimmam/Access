# Team setup before the hackathon

Prepared 12 November 2026. Follow the common guide, then your individual guide. These are preparation instructions, not an implemented application or a record of installations already performed.

| Guide | Owner and responsibilities |
|---|---|
| [Common setup](COMMON.md) | Everyone: runtimes, repository access, shared conventions and readiness checks |
| [Dependency acquisition guide](DEPENDENCY_ACQUISITION_GUIDE.md) | Step-by-step collection of accounts, APIs, assets, signing resources and readiness evidence |
| [Avatar co-design testing](AVATAR_CO_DESIGN_TESTING.md) | Load generated motion studies, inspect synchronization and collect timestamped feedback |
| [Windows setup](BINIYAM_WINDOWS.md) | Biniyam: building, data model, API, publishing pipeline and exports |
| [macOS setup](ANTENEH_MACOS.md) | Anteneh: product building, component/UI integration, deployment and CI/CD |
| [Linux setup](HAILEMICHAEL_LINUX.md) | Hailemichael: security implementation, threat checks and release security evidence |

Biniyam's exact CPU/NPU model and Hailemichael's Linux distribution are pending; the user will provide them later. Neither blocks basic setup. Do not install a vendor-specific NPU runtime or copy distro-specific commands until the relevant machine is identified.

The [implementation plan](../planning/TRACK_2_IMPLEMENTATION_PLAN.md) governs scope. ALX authentication remains unconfirmed. All initial development and demos use approved public fixtures.

Demo hosting is confirmed as **Render with $100 credit**. Anteneh’s guide includes budget tracking, branch protection and CI-gated deployment. All contributors follow [the shared workflow](../../CONTRIBUTING.md); agents also read [AGENTS.md](../../AGENTS.md).
