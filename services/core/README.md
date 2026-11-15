# Core service

Shared domain models and rules with no UI or host-adapter dependency.

`src/access_core/lessons.py` owns immutable public lesson versions, caption parsing and HTML/text/ZIP/PDF/BRF demonstration exports. `jobs.py` owns fictional career and certificate records. `signing.py` binds draft/reviewed motion assets to the exact lesson, media, caption and course version hashes. Persistent publishing, production authorization and durable metadata remain planned.
