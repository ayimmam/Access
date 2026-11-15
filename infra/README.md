# Infrastructure

The runnable development container configuration is intentionally kept at the repository root:

- [`Dockerfile`](../Dockerfile) builds the Web Component and locked Python service, then runs Uvicorn as a non-root user.
- [`docker-compose.yml`](../docker-compose.yml) exposes the public fixture API on port 8000 with a read-only root filesystem and read-only source-fixture mounts.
- [Deployment and local demo guidance](../docs/setup/DEPLOYMENT_AND_LOCAL_DEMO.md) records the current Render boundary and smoke checks; deployment remains Anteneh's responsibility.

Start with the root [Docker-first instructions](../README.md#1-install-docker-and-run-the-project). This folder holds infrastructure-specific documentation rather than duplicating the root entry points. Durable databases/object storage, worker orchestration and production protected-content infrastructure are not implemented by the current Compose stack.
