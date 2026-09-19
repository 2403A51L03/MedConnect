# MedConnect Deployment

## Current deployment status

No cloud deployment was executed from this workspace. There are no configured provider credentials, managed PostgreSQL credentials, DNS records, or production URLs available to record. The repository is deployment-prepared, but production verification remains pending until a target provider is selected and credentials are supplied through its secret manager.

Production URLs:

- Frontend: **Pending provider deployment**
- API: **Pending provider deployment**
- Socket.IO: **Pending provider deployment; same origin as API is recommended**
- Database: **Private managed PostgreSQL URL; never publish**

## Suitable service layout

- Frontend: Vercel, Netlify, or another static host serving `client/dist`
- Backend and Socket.IO: Render, Railway, Fly.io, or an equivalent Node.js service
- Database: Render PostgreSQL, Railway PostgreSQL, Neon, Supabase, or another managed PostgreSQL provider
- Optional WebRTC TURN: Metered, Twilio Network Traversal, or self-hosted coturn

The frontend and backend may be hosted separately, but the backend must allow the exact frontend origin through `CLIENT_ORIGIN`. Socket.IO must be reachable over HTTPS/WSS from the frontend.

## Backend configuration

Set these variables in the backend provider's secret/environment configuration:

```env
NODE_ENV=production
PORT=4000
CLIENT_ORIGIN=https://frontend.example.com
DATABASE_URL=postgresql://...
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=1h
```

Do not commit `.env`, database URLs, JWT secrets, provider tokens, or seed passwords. The root `.gitignore` excludes `.env` files and common generated output.

Build and start commands:

```powershell
npm install --prefix server
npm run prisma:generate --prefix server
npm run prisma:validate --prefix server
npm run prisma:migrate --prefix server
npm start --prefix server
```

Use `prisma migrate deploy`, rather than `prisma migrate dev`, in a production release pipeline. Seed only an explicitly approved demo environment; do not seed production with known demo passwords.

## Frontend configuration

Set the frontend build variable in the static host:

```env
VITE_API_URL=https://api.example.com/api
VITE_SOCKET_URL=https://api.example.com
```

Build command:

```powershell
npm install --prefix client
npm run build --prefix client
```

Publish `client/dist`.

## Pre-deployment gates

- [x] Backend unit/service tests pass locally: 15 passed
- [x] Frontend production build passes locally
- [x] Prisma schema validation is configured and migration exists
- [x] JWT and role middleware tests pass
- [x] Socket.IO authentication and consultation handlers are implemented
- [ ] Live PostgreSQL connection verified in the target environment
- [ ] Production provider credentials configured outside Git
- [ ] HTTPS and exact CORS origin configured

## Post-deployment smoke test

Run these with the actual production URLs and test accounts:

1. `GET /api/health` returns `status: ok`.
2. Register a patient with `POST /api/auth/register`.
3. Log in with `POST /api/auth/login` and store the JWT only in the test client.
4. List doctors, choose an available doctor, and book an appointment.
5. Confirm a same-day queue token and queue position.
6. Open a doctor session and confirm queue updates/call-next behavior.
7. Open a receptionist/admin session and verify patient and walk-in operations.
8. Verify Socket.IO connection authentication and `queue:updated`/`queue:called` events.
9. Start and complete a consultation; confirm notifications and history.
10. For tele-consultation, verify HTTPS camera/microphone permission, both peers joining, and TURN fallback where required.

Record the actual frontend, API, and Socket.IO URLs in this file after deployment. Never record the database URL or any secret.
