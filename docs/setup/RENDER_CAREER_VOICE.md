# Render setup for career voice navigation

Updated 21 November 2026. Anteneh owns the release and the $100 Render credit. Biniyam and Hailemichael review backend and security settings.

The root [Render Blueprint](../../render.yaml) describes the shared public-fixture API/component service, `access-plugin`, using the native Python setup in [the deployment guide](DEPLOYMENT_AND_LOCAL_DEMO.md#create-the-render-web-service).

## Public service settings

| Setting | Configuration |
| --- | --- |
| Repository / branch | `ayimmam/Access`, reviewed `main`; repository root |
| Runtime | Python; Python `3.11.18`, Node `24`, uv `0.13.8` |
| Build | Initialize the pinned Savanna submodule, install locked npm dependencies, build the component, then `uv sync --locked --no-dev --python 3.11` |
| Start | `.venv/bin/uvicorn access_api.main:app --host 0.0.0.0 --port "$PORT" --no-access-log` |
| Health check | `/healthz` |
| Automatic deployment | Off; release only after human review and the actual required checks |
| Instances / preset | One free public-fixture instance; no database, disk or paid speech service in this Blueprint |

**Do not apply this Blueprint blindly to the existing service.** Confirm its identity, runtime, region, instance plan, existing environment and storage first. The free preset is not authorization to downgrade a paid service, change its runtime or remove storage used by another demo. For an existing paid/privacy deployment, preserve its configuration and use only the relevant build/start settings through the dashboard. No database migration is part of this setup.

Pushing this branch does not apply the Blueprint. Creating or syncing a Blueprint is a separate operational action; turning automatic deployments off does not prevent an initial deployment when a service is created. Do not create a duplicate service, trigger a deploy hook or apply changes under this push-only authorization. See [Render Blueprint configuration](https://render.com/docs/blueprint-spec) and [deployment behavior](https://render.com/docs/deploys).

`ACCESS_ALLOWED_ORIGINS` is deliberately supplied through the Render dashboard, not replaced with a hardcoded list. Preserve every approved origin on the shared API. Include the exact career host origin, `https://access-career-gateway.vercel.app`, and the API-hosted demo origin, `https://access-plugin.onrender.com`, when those are the deployed addresses. Do not use wildcards or copy the local `.env` wholesale. No provider key or worker token belongs in the Blueprint or browser configuration.

### Restore Amharic speech on the existing Render host

Anteneh opens the existing **access-plugin** service in Render and selects **Environment**. Edit the comma-separated `ACCESS_ALLOWED_ORIGINS` value and append `https://access-plugin.onrender.com` if absent. Use the scheme and host only, without a trailing slash. Keep `https://access-career-gateway.vercel.app` and every other approved entry. Choose **Save only** to bundle the change with the next approved deploy, or **Save and deploy** to apply it to the existing build when that redeploy is authorized. [Render environment variables](https://render.com/docs/configure-environment-variables).

The career speech POST routes require an explicit matching `Origin` even when the UI and API share a host. On 21 November 2026, the public preflights for `/speak` and `/transcribe` returned HTTP 400 `Disallowed CORS origin` for the Render origin. Both returned HTTP 200 and echoed the exact approved Vercel origin for Vercel. The catalog returned `speech_enabled: true`.

After the environment update, verify both origins and routes without consuming provider quota:

```sh
for origin in https://access-plugin.onrender.com https://access-career-gateway.vercel.app; do
  for operation in speak transcribe; do
    curl -fsS -i -X OPTIONS \
      -H "Origin: $origin" \
      -H 'Access-Control-Request-Method: POST' \
      -H 'Access-Control-Request-Headers: content-type' \
      "https://access-plugin.onrender.com/api/v1/career-speech/$operation"
  done
done
```

Expect HTTP 200 and each caller's exact `Access-Control-Allow-Origin`. Then follow the [career voice testing checklist](CAREER_VOICE_TESTING.md) on both live hosts. With a consenting tester on the intended device and browser, play the Amharic role prompt, listen through to the end, record a short fictional command, and verify the resulting transcript is editable before confirming it. Record audible playback, recognition, the command outcome, and device/browser details for each host. A successful preflight or catalog request covers configuration only.

Release Savanna voice navigation with a matching reviewed API, component and private speech worker. The Savanna Amharic help button uses the new fixed `lesson-guide` prompt. Once released, verify that prompt plays on `/demo/savanna`, then explicitly record and review an Amharic command. Repeat the [Savanna lesson journey](../../examples/savanna/README.md) on the intended device with real English and Amharic microphone input.

The existing English guide uses browser recognition/synthesis and does not need Addis credentials. The career host loads its versioned component from Render, so a Vercel rebuild alone does not publish a different component. Test browser permission, available voices, keyboard activation, Stop and the typed fallback on the actual HTTPS origin; a successful API health check is not evidence of audible speech or microphone recognition.

## Optional Amharic relay: separate reviewed setup

The public Blueprint intentionally does **not** provision a paid private service, persistent disk or provider subscription. Amharic audio still needs the private worker described in [the Addis voice guide](ADDIS_AMHARIC_VOICE.md#native-or-render-configuration). Typed commands remain available without it.

Before enabling that relay, Anteneh coordinates these settings with Biniyam and Hailemichael:

1. Use a private HTTP service for `access_worker.speech_gateway:app`, on port `8010`, in the same Render workspace/region as the API. A background worker cannot receive the API relay. Use the restricted `speech-runtime` target from [the Dockerfile](../../Dockerfile), or a reviewed image built from that target; expose no public worker URL. See [private services](https://render.com/docs/private-services) and [private networking](https://render.com/docs/private-network).
2. Record the service actual **Internal address**. The current [API relay](../../services/api/src/access_api/career_speech.py) allows only `http://127.0.0.1:8010`, `http://localhost:8010`, `http://speech:8010` and `http://access-speech:8010`. A Render display name is not proof of its DNS hostname. A different generated hostname requires an exact, human-reviewed change to both destination allowlists and negative tests; configuration alone cannot enable it. Do not allow arbitrary URLs, redirects, public hosts or all Render domains. The actual private address is not yet confirmed by this setup.
3. Put a newly rotated `ADDIS_API_KEY` **only on the private worker**. Set a separate random `ACCESS_SPEECH_WORKER_TOKEN` on both worker and API through private runtime settings. Set `ACCESS_SPEECH_WORKER_URL` only to the approved private address. Do not put the provider key on the public API, Vercel or a frontend build variable.
4. Give the worker writable persistent quota storage and set `ACCESS_SPEECH_BUDGET_DB` to that SQLite path. Keep one worker instance and one ledger. Retain the ledger across restarts, releases and rollback; never reset it to bypass limits. The daily request limit defaults to `100` per UTC day and accepts `1`–`200`; it is not a monetary spending cap.
5. Record the dashboard compute/disk estimate, provider usage budget, credit eligibility/expiry and teardown owner before provisioning. Private compute, persistent storage and provider usage require a separately authorized budget. Do not assume the credit balance stops billing automatically.

No authentication contract with ALX is established by this setup. Continue using public fictional career fixtures; never reuse captured Savanna credentials.

## Release checks and rollback

Before merge, validate the YAML against [the official Render schema](https://render.com/schema/render.yaml.json), run the repository link/hygiene and security checks, and review the complete staged diff. Obtain another human review; this branch must not be pushed or merged directly into `main`. Application build/browser/API checks for a later release remain separate from validating these setup files.

After an authorized release, these public GET checks do not generate a provider speech request:

```sh
curl --fail-with-body https://access-plugin.onrender.com/healthz
curl --fail-with-body -H "Origin: https://access-career-gateway.vercel.app" \
  https://access-plugin.onrender.com/api/v1/career-speech/catalog
```

`speech_enabled: false` is expected for an English-only service without the optional relay. `true` establishes only that the API worker URL/token configuration is accepted, not private DNS, matching tokens, provider balance or working audio. Test both languages, Stop, keyboard controls and Amharic transcript confirmation on real devices after the worker is approved; live synthesis/transcription uses provider quota and requires the separate release authorization.

For rollback, deploy the last reviewed matching API/component/worker release or disable the optional API relay configuration. Preserve existing public origins, typed controls, all existing demo storage and the worker quota ledger. Do not remove a disk, delete a ledger or change billing as part of a source rollback.
