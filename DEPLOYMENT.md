# Deployment handoff

Status: prepared for deployment, not certified for production. Passing local tests and compilation does not verify production credentials, live provider delivery, backup recovery, availability, or the deployed service.

## Backend setup

- Service root: `backend`; use Node 22.
- Install: `npm ci`; test: `npm test`; start: `npm start`.
- Configure `NODE_ENV=production`, `DEMO_MODE=false`, `MONGODB_URI`, a unique `JWT_SECRET` (at least 32 characters), `FRONTEND_URL`, and `CORS_ORIGIN`.
- `FRONTEND_URL` must be an HTTPS origin. `CORS_ORIGIN` is a comma-separated list of exact HTTPS frontend origins, without paths or wildcards.
- Let the host assign `PORT`. Set `TRUST_PROXY_HOPS` to the exact trusted proxy count for your host; do not guess or enable unrestricted proxy trust.
- Required service settings: SUPPORT_EMAIL, EMAIL_PASSWORD, GEMINI_API_KEY, OPENWEATHER_API_KEY, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_BROWSER_KEY.
- From `backend`, run `npm run check:config` WITH the intended deployment variables. It prints presence/structural checks only and exits nonzero for missing required settings. It does not prove that credentials work.
- Configure readiness monitoring against `/api/health`. It returns 200 only after a database ping succeeds, otherwise 503. Alert on repeated failures and server errors.

## Frontend setup

Set the frontend service root to `frontend`. Use Node 22, install with `npm ci`, build with `npm run build`, and start with `npm start`. Set `NEXT_PUBLIC_DEMO_MODE=false` and `NEXT_PUBLIC_API_URL=https://YOUR-API-HOST/api` BEFORE building. Public values are embedded at build time. `/api` only works if you configure a reverse proxy to the backend; this repository does not provide one.

## Database and secrets: owner actions

1. Rotate the database password previously pasted into chat and update every service using that account. Never paste its replacement into chat or commit it.
2. Use a separate production database and a user restricted to that database; keep staging and demo records out. Restrict network access to the deployment's required addresses.
3. Use Atlas or another replica set because app workflows require transactions.
4. Generate a distinct JWT secret for each app; store it in the hosting secret settings. Changing it invalidates existing logins.
5. Configure scheduled backups with retention appropriate to your data. Restore a backup to an isolated database and verify it before launch. A configured backup without a recovery test is unverified.
6. Configure host log retention and alerts; avoid logging tokens, passwords, request bodies, bank details, or identity documents. A health endpoint alone is not a monitoring service.

## Live acceptance checklist

- HTTPS frontend reaches the correct HTTPS API; valid origin works and unrelated browser origins are rejected.
- Register, log in, log out, reset password, and confirm old tokens are revoked after changing passwords.
- Verify permissions using two separate ordinary accounts; one account must not access another's private data.
- Create, edit, and delete synthetic records; restart the backend and verify persistence.
- Send a clearly labelled test notification only to an address you own, then verify receipt.
- Check rate-limit behavior, database outage reporting, error logs, mobile layout, and recovery after restart.
- Remove demo accounts before admitting real users. Confirm backup restore and alerts work.

## Current evidence and limitations

The earlier checks passed 24 vehicle tests, 17 Kissan tests, a Kissan compilation using a placeholder API URL, and dependency audits. A placeholder build is NOT a usable deployment. Configuration absence in the current shell does not prove a credential is absent from all your private files or accounts. Existing live staging tests and Gmail receipt are historical evidence, not production verification.

GitHub Actions runs tests and dependency audits on pushes and pull requests; Kissan also compiles its frontend. No deploy credentials are stored in the workflow. There is no automatic production deployment.

## Kissan service setup

Use a dedicated support sender and the mail provider's supported credential (for Gmail, a suitable app password where available; never the normal account password). Keep the server Maps key private and restrict the browser Maps key to intended website referrers and required APIs. Configure service quotas and billing alerts. Validate AI, weather and maps using real credentials before advertising these features. Twilio SMS is optional; configure all three Twilio settings if using it.

Government registration/approval must follow the existing administrator procedure. The software alone does not establish official government affiliation. Confirm that handling real identity and bank information fits your intended use and access controls.
