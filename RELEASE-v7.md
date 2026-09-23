# Release v7 status — 23 September 2026

This source includes all fixes through v7. It has not been deployed or pushed to GitHub.

## Verification completed

- 17 isolated Kissan tests passed.
- 6 shared integration tests passed against a disposable local replica set.
- The production frontend build passed and generated 28 pages/routes.
- Production builds reject demo mode, localhost API URLs and unsafe public API configuration.
- The Atlas account `kissan_staging_app` connects with `readWrite` access limited to `kissan_staging` on the `eme` cluster.
- Twelve live staging API checks passed using synthetic records: registration, login, unauthenticated rejection, bank details, farm creation, crop creation, appointment booking, record listing and owner isolation.

## Required before public deployment

- Choose HTTPS frontend and backend hosting URLs, then configure `FRONTEND_URL`, `CORS_ORIGIN` and `NEXT_PUBLIC_API_URL`.
- Configure unique production `JWT_SECRET` and the private `MONGODB_URI` in the hosting secret manager.
- Configure and live-test Gemini, weather, Maps and support email. Configure Twilio only if SMS is enabled.
- Restrict Atlas Network Access to the chosen hosting provider's outbound addresses or private connection before launch. The project currently permits `0.0.0.0/0`.
- Remove synthetic staging records if a clean staging database is desired, then complete a browser walkthrough from a physical device.

Use Node.js 22 or later. Keep `DEMO_MODE=false` and `NEXT_PUBLIC_DEMO_MODE=false` outside local demo previews.
