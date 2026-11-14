# Plug-in installation demonstration

This fictional training-provider host shows how the existing Access custom element fits inside another platform. It does not claim a production Savanna connection or completion of the required reviewed media.

From the repository root, initialize the supplied fixture and use the existing locked dependencies:

```sh
git submodule update --init
uv sync --locked --python 3.11
npm ci
npm run build
uv run uvicorn access_api.main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/demo/plug-in`.

1. Choose the short text lesson or the supplied ALX video with draft captions.
2. Select **Install component**. The actual component fetches the public fixture API.
3. Change the host appearance, search the lesson and request a download. The host event list displays real events locally, without transmitting analytics.
4. Remove and reinstall. The host content stays in place and component cleanup runs.
5. Expand **Embed code for another website**. Copy the absolute script/API URLs and generated SRI into a separate HTML page served from an origin you control. The API's `ACCESS_ALLOWED_ORIGINS` must include that exact origin. The default allows `http://127.0.0.1:5173` and `http://localhost:5173`.

For a local independent site, save the copied code in a minimal HTML page with a title, `lang="en"`, viewport metadata and a main landmark. Serve its directory with `python3 -m http.server 5173 --bind 127.0.0.1`, then open it using `http://127.0.0.1:5173`. The host does not need npm or our UI framework. Allow the appropriate script, API, media and style sources under the host CSP. Local HTTP is development-only; hosted installs need HTTPS.

`npm run build` generates `packages/lesson-component/dist/integrity.json` from the entry module. Rebuild before using the demo after changing component code. The demo fetches this local release metadata and loads the module with SRI. The metadata comes from the same server, so this is a way to prepare a pinned installation snippet, not independent attestation of a compromised server. Production release work must freeze all chunks and entry files and distribute a trusted digest. Current `/components/0.1.0` development files can change between builds.

The event list is capped at ten entries. A download event means requested, not successful download or lesson completion. Installation does not send credentials, mark host course progress or create learner accounts. Reviewed Amharic, EthSL, description, audio exports and tagged PDF remain governed by the [pivot plan](../../docs/planning/JUDGING_PIVOT_PLAN.md).
