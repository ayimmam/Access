# Access Career Gateway host

Static career-discovery demonstration using fictional employers, vacancies, support options, and credential records. It never accepts applications, uploads, disability disclosures, or personal data.

Vercel project settings:

- Root Directory: `demos/career-gateway`
- Framework Preset: Other
- Build Command: empty
- Output Directory: empty

`vercel.json` rewrites `/certificates/:identifier` to the static certificate viewer. For local cross-origin testing, run the Access API on `127.0.0.1:8000` with `http://127.0.0.1:5174` in `ACCESS_ALLOWED_ORIGINS`, then serve this directory on port 5174. The root test command `npm run test:vercel-demos` starts and verifies the required services.

The landing layout, logotype, and mascot reference the [public Afriwork homepage](https://afriworket.com/). The job board layout follows the supplied Sample-Jobs PDF and uses the Access vacancy fixture.
