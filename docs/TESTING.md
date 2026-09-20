# MedConnect Testing

## Verified locally

Run from the repository root:

```powershell
npm test
npm run build
npm run prisma:validate
```

Current verified result:

- Backend Node test suite: 15 passed, 0 failed
- Frontend Vite production build: passed
- Prisma schema validation: available through the server script

The tests cover authentication, password verification, JWT handling, role policies, ownership policies, appointment validation/conflicts, doctor filtering/validation, queue token issuance, queue progression, unavailable doctors, queue position, and automatic advancement after consultation completion.

## Not verified in this workspace

- Live PostgreSQL migrations and seed against a running database
- Full HTTP smoke tests against a running backend
- Cross-browser Socket.IO event delivery
- Two-browser WebRTC media negotiation
- Production HTTPS, TURN traversal, CORS, and deployment provider behavior

These require a configured database and deployment environment. They must be executed as release gates after provider setup.

## Recommended release test order

1. Validate environment variables without printing their values.
2. Run `npx prisma migrate deploy` against the target database.
3. Start the backend and check `/api/health`.
4. Run the Postman collection in `postman/MedConnect.postman_collection.json`.
5. Verify patient, doctor, and receptionist/admin workflows.
6. Verify Socket.IO authentication and queue events.
7. Verify WebRTC in two browsers over HTTPS if tele-consultation is enabled.
8. Confirm that no secrets or production URLs containing credentials appear in Git history.
