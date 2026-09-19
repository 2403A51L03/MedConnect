# MedConnect Deployment Guide

This guide covers the expected production preparation for the MedConnect stack without deploying immediately.

## 1. Database setup

1. Create a managed PostgreSQL database.
2. Set the database URL as `DATABASE_URL` in the backend environment.
3. Run Prisma migration and seed commands:

```bash
cd server
npm install
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js
```

Recommended production setup:
- PostgreSQL 14+
- A dedicated database for MedConnect
- Backups enabled
- Strong credentials stored in environment variables, never in source control

## 2. Backend deployment

### Required environment variables

```env
NODE_ENV=production
PORT=4000
CLIENT_ORIGIN=https://your-frontend-domain.com
DATABASE_URL=postgresql://user:password@host:5432/medconnect?schema=public
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1h
```

### Backend build/start

```bash
cd server
npm install
npm run prisma:generate
npm run start
```

### Production notes

- Use a process manager such as PM2 or a hosting platform service.
- Keep logs centralized and avoid raw stack traces in API responses.
- Expose only the API and trusted CORS origins.
- Configure health checks for `/api/health`.

## 3. Frontend deployment

### Build

```bash
cd client
npm install
npm run build
```

### Frontend environment variables

```env
VITE_API_URL=https://your-api-domain.com/api
VITE_SOCKET_URL=https://your-api-domain.com
```

Deploy the generated `dist` folder to a static hosting provider such as Vercel, Netlify, or an S3 bucket behind a CDN.

## 4. CORS and socket configuration

- Restrict CORS to the exact frontend domain(s).
- Allow only secure HTTPS origins in production.
- Use the same `CLIENT_ORIGIN` values on the server and the frontend socket URL.
- Keep Socket.IO signaling on the same host or behind HTTPS termination.

## 5. WebRTC deployment requirements

WebRTC requires secure browser contexts and real network access.

- Use HTTPS in production.
- Ensure STUN/TURN services are configured for NAT traversal.
- Verify browser camera/microphone permission prompts behave correctly behind HTTPS.
- Do not send media through Express; the server should only exchange signaling messages.

## 6. Production verification

After deployment, verify:

1. Backend health endpoint responds successfully.
2. Frontend loads and the app can authenticate.
3. Patient can register, log in, and book an appointment.
4. Queue token is created correctly.
5. Doctor can view queue and call next patient.
6. Consultation can start and complete.
7. Notifications and consultation history load after authorization.
8. CORS and Socket.IO connections work across HTTPS origins.

## 7. Deployment checklist

- [ ] PostgreSQL database is live and seeded
- [ ] `DATABASE_URL` is set correctly
- [ ] `JWT_SECRET` is strong and environment-protected
- [ ] HTTPS is enabled
- [ ] Frontend build passes
- [ ] Backend starts without errors
- [ ] API health returns success
- [ ] Socket.IO auth works on production host
- [ ] Security checks and user access remain correct

Do not deploy until these checks pass in the target environment.
