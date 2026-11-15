# Containers

The current public-fixture API uses the root [`Dockerfile`](../../Dockerfile) and [`docker-compose.yml`](../../docker-compose.yml). Keeping the only runnable image definition at the root makes the first installation command unambiguous.

Add service-specific image definitions here only when the worker, publishing console or offline reader becomes independently deployable. The current Compose stack does not provide durable publishing storage, a worker queue or production authentication.
