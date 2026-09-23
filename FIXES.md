# Security and reliability fixes

Based on commit `7f82b5f30fee7af1a0e31af5c8b8db087cee9921`. Changes are local; GitHub and deployed services have not been updated.

## Changes

- Public registration only creates farmer accounts. Government routes also require administrator approval, including for existing government users.
- Farm create/update requests allow only editable fields and cannot replace the authenticated owner or inject MongoDB update operators.
- Harvest advice enforces farm ownership (or approved government access).
- Route fallback returns the actual optimized stop order. Appointments sharing coordinates retain separate identities.
- Government quantity totals normalize kg and tons to quintals.
- Deleted users are denied access. Changing/resetting a password invalidates prior tokens.
- Password-reset UI returns to login instead of creating a session with an incomplete profile.
- Dependency security updates include Next.js 16.3.5 and Nodemailer 10.0.10. Pages Router and React 18 are retained. Next's obsolete lint command was replaced with a typecheck script; the production build uses webpack.

## Setup / migration

Use Node.js 20.9+ (tested with 20.20.2; use a supported Node release on deployment).

From `backend`: `npm ci`, configure `.env`, then `npm test` and `npm start`.
From `frontend`: `npm ci`, configure `.env.local`, then `npm run build` and `npm start`.
Preserve your actual environment settings; this source package excludes `.env.local`.

New officer accounts must first exist as farmer accounts. After independently verifying the person's identity, a trusted operator with database access runs, from `backend`:

```sh
node scripts/approve-officer.js officer@example.com
```

The same command approves an existing government account. This is an administrative operation, not a public HTTP endpoint. Existing unapproved government accounts will lose API access until reviewed. Approval is read from the database on every protected request.

Existing token versions default to zero. No bulk user migration is needed. Password changes revoke older tokens; unrelated existing sessions remain compatible.

## Verification and limits

Regression tests use actual Express routing, validators, JWT verification and password hashing, with mocked database/provider calls. The Next.js production build and typecheck are validated separately. No production data was altered and no real email/SMS was sent.

A successful build and a clean npm audit are not a full security certification. Before rollout, exercise registration/login, officer approval, farm creation, appointments, reset email and notifications against a staging database with your provider configuration. Application request limits now use shared MongoDB counters; operational monitoring still needs deployment configuration. Route fallback distances are straight-line estimates, not verified road distances.


## Second-round fixes (2026-09-20)

Shared request limits now use atomic MongoDB counters, so restarts or multiple API instances do not reset the budget. Authentication allows 100 attempts/IP/15 minutes and 10 attempts/account/15 minutes; reset-email requests allow 3/account/15 minutes. Kissan normalizes login emails before counting the account budget. Notification endpoints allow 30 requests/account/15 minutes and 100/IP/15 minutes where applied, with at most 20 recipients per explicit email/bulk send. Kissan public contact forms allow 5/IP/15 minutes. Rejected requests return 429 with Retry-After; unavailable counter storage returns 503 rather than silently disabling protection.

`TRUST_PROXY_HOPS` defaults to 0. Set it only to the exact number of trusted reverse proxies in your deployment. Do not blindly enable trust for arbitrary forwarded headers. Ensure the RequestLimit collection's TTL index on expiresAt is created if automatic indexes are disabled. Counters hash their identifiers instead of retaining plain email/IP values.

The transaction-backed operations below require **MongoDB Atlas or a replica set**. Standalone MongoDB is no longer sufficient for these operations; there is no unsafe partial-write fallback.

Run `npm test` for isolated regressions. For real database tests, set TEST_MONGO_URI to an isolated localhost MongoDB replica set URI and run `npm run test:integration`. The test suite creates a random test database and removes that database afterward. It rejects non-local URIs to avoid accidentally targeting a production server.

Collection now requires a verified, dispatched appointment and positive numeric quantities. Payments require a transaction reference and must equal the amount calculated at collection. Completed/cancelled/rejected appointments cannot be reopened through generic status, collection, verification or bulk-routing endpoints. Optimistic concurrency rejects competing writes with 409; a simultaneous payment cannot record two completions. Payment amounts are rounded to cents at collection. These endpoints record a payment reference; they do not initiate or independently verify a bank transfer.

Route creation and route dispatch use transactions. Planning preserves each appointment's approval/verification state; every stop must be verified before dispatch. Invalid or concurrently changed batches roll back completely. An appointment already assigned to a route cannot be assigned again.

Weather notifications now require approved government access. Public farmers cannot trigger messages to themselves or other farmers through this administrative endpoint. Initial appointment payloads can no longer inject collection or grading fields.


# Updated projects — version 3

Use Kissan-app-fixed-v3.zip and vehicle-management-system-fixed-v3.zip. They include all previous fixes and the six additional fixes from the latest review. GitHub and deployed services have not been changed.

## New fixes

1. Vehicle fleet changes (add/update/delete members, add/delete vehicles) and emergency resolution require a company admin. Regular members retain read access, tracking, contacts and emergency reporting.
2. Kissan validates positive farm/crop areas, nonnegative crop yields and coordinate ranges at the database schema layer, covering creation and edits. Invalid edits return 400 without saving.
3. New bookings require an active farm belonging to the farmer. Deactivated farms cannot receive new bookings; existing appointments remain intact.
4. Vehicle creation and owner deletion use transactions that both write the owner record. Concurrent operations retry safely and cannot leave a vehicle referencing a deleted owner.
5. Vehicle years must be whole numbers from 1886 through next year. Plates are uppercased with whitespace removed, with a 32-character maximum and company-specific uniqueness. Invalid input returns 400; duplicate-key races return 409.
6. Kissan AI endpoints share a quota of 10 requests per account per 15-minute window. Harvest dates must be real ISO calendar dates between sowing and 730 days after sowing. Unsupported AI dates return 502 and do not overwrite the saved date. This broad two-year boundary is a consistency check, not agronomic validation for every crop.

## Verification

45 tests passed: 14 Kissan isolated tests, 18 vehicle isolated/frontend tests, and 13 tests against a temporary local MongoDB replica set. Checks cover member permissions, invalid data, deactivated-farm bookings, AI date rejection, plate normalization and 12 simultaneous owner-deletion/vehicle-creation trials, plus the previous regression cases. JavaScript syntax, whitespace and ZIP integrity were also checked. No live AI, email or production database was used. Frontends are unchanged from version 2.

## Deployment steps

Read each archive's FIXES.md and preserve private environment settings. Install dependencies using npm ci and run npm test from each backend. Integration tests use TEST_MONGO_URI pointing to an isolated localhost replica set and npm run test:integration; they create and remove a random test database.

MongoDB Atlas or a replica set is required for vehicle registration, vehicle creation, owner deletion and Kissan bulk-route operations. Provision the declared unique and TTL indexes if automatic index creation is disabled.

For an existing vehicle database, stop API writes and back up the database before enabling the new version. In the vehicle backend, configure MONGO_URI, then run:

    node scripts/normalize-plates.js

This only reports changes and conflicting/invalid record IDs. Resolve reported conflicts by checking the real vehicle records; the script never merges or deletes vehicles. Once the report is clean, apply normalization while API writes remain stopped:

    node scripts/normalize-plates.js --apply

The updates commit together in a transaction. Restart with the new API afterward. This migration has not been run against your production data. Existing invalid vehicle years or Kissan farm/crop values are not automatically rewritten and should be reviewed separately.

Earlier setup requirements still apply: explicit government-account approval, a unique vehicle JWT secret of at least 32 characters, Node.js 20.9+ for Kissan's frontend, correctly configured Gmail OAuth, review of the Maps key exposed in the old vehicle demo, and an exact TRUST_PROXY_HOPS setting if behind trusted reverse proxies.

Search/pagination, audit history, notification queues, multilingual/offline features and deployment/backup automation remain separate feature work. These packages address the six reviewed faults, not those larger enhancements. Payment records do not independently verify bank transfers; emergency alerts do not dispatch responders.
