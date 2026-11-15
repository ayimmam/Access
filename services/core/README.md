# Core service

Shared domain models and rules with no UI or host-adapter dependency.

`src/access_core/lessons.py` owns public lesson versions and caption parsing. `review.py` gates captions/documents by exact source/file hashes and private approval references; `exports.py` prebuilds approved HTML/text/ZIP/PDF/BRF artifacts. API requests read these artifacts, never regenerate them. `jobs.py` owns fictional career and certificate records. `signing.py` binds segment and whole-lesson sign media to exact-render, Deaf/interpreter review and consent. The [publication runbook](../../docs/setup/CONTENT_PUBLICATION.md) describes the manual public-fixture flow. Production identity and staff publishing remain planned.
