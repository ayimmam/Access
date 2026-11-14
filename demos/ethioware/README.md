# EthioWare learning host

Static independent-provider demonstration for the Access lesson component. It uses public Access fixtures and does not connect to an Ethioware learner account, enrollment, completion record, or certificate.

Vercel project settings:

- Root Directory: `demos/ethioware`
- Framework Preset: Other
- Build Command: empty
- Output Directory: empty

For local cross-origin testing, run the Access API on `127.0.0.1:8000` with `http://127.0.0.1:5173` in `ACCESS_ALLOWED_ORIGINS`, then serve this directory on port 5173. The root test command `npm run test:vercel-demos` starts and verifies the required services.
