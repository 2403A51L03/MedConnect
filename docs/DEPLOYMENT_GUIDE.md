# MedConnect Production Deployment Guide

This guide publishes the application with Supabase PostgreSQL and Render for both the Express API and React/Vite client. The checked-in `render.yaml` is a Render Blueprint for both services.

## 1. Prepare the repository

1. Push the project to a private or public GitHub repository.
2. Do not commit `.env`, passwords, database URLs, or private patient data.
3. Confirm these local checks pass:

   ```powershell
   npm run prisma:validate
   npm run test
   npm run lint
   npm run build
   ```

## 2. Create production PostgreSQL

Use Supabase PostgreSQL for this deployment.

1. Create a database and copy its pooled or direct `DATABASE_URL`.
2. Use SSL if the provider requires it, for example `?sslmode=require`.
3. Keep the URL only in the hosting provider's secret settings.
4. Do not use the local Docker credentials in production.

## 3. Push the project to GitHub

1. Create an empty GitHub repository, for example `medconnect-capstone`.
2. From the project root, connect this repository and push the project:

   ```powershell
   git remote add origin https://github.com/YOUR_USERNAME/medconnect-capstone.git
   git add .
   git commit -m "Prepare MedConnect for deployment"
   git push -u origin master
   ```

3. If GitHub uses `main` as the default branch, use `git branch -M main` before pushing.

Never commit `server/.env` or any Supabase password. They are excluded by `.gitignore`.

## 4. Deploy with Render

In Render, select **New -> Blueprint**, connect the GitHub repository, and choose `render.yaml`. Render will create:

- `medconnect-api`: the Express and Socket.IO API
- `medconnect-client`: the static React frontend

### API environment values

The Blueprint creates the API and its build/start/health settings. Its build command also runs the idempotent demo seed after migrations, which is useful on the free Render plan because service Shell access is unavailable. Enter the `sync: false` values in the Render dashboard:

```env
NODE_ENV=production
PORT=10000
CLIENT_ORIGIN=https://medconnect-client.onrender.com
DATABASE_URL=your-managed-postgresql-url
JWT_SECRET=generate-a-long-random-secret
JWT_EXPIRES_IN=1h
```

After the API deploys, copy its Render URL. Then set the client values in the Render static-site environment:

```env
VITE_API_URL=https://medconnect-api.onrender.com/api
VITE_SOCKET_URL=https://medconnect-api.onrender.com
```

Set the API `CLIENT_ORIGIN` to the exact Render static-site URL, then redeploy both services.

The build automatically creates or updates the demo accounts. For a real clinic, remove `&& npm run prisma:seed` from `render.yaml` and replace the demo seed with controlled data entry before accepting real users.

## 5. Verify the live system

1. Open the Render static-site URL and confirm the client loads.
2. Open `https://your-api-host/api/health`; it should return `status: "ok"`.
3. Open `https://your-api-host/api/health/ready`; it should return `status: "ready"` and `database: "connected"`.
4. Register a test patient account.
5. Log in and book an appointment.
6. Log in as a doctor in another browser session and call the patient.
7. Start and complete the consultation.
8. Confirm queue, notification, and consultation history updates.
9. Confirm Socket.IO works over HTTPS.
10. Test camera and microphone permissions on two devices or browser profiles.

## 6. Production security checklist

- Use a strong random `JWT_SECRET` and rotate it when required.
- Restrict `CLIENT_ORIGIN` to the real HTTPS frontend URL.
- Enable database backups and point-in-time recovery.
- Use a custom domain and HTTPS for both services.
- Configure a TURN server for WebRTC users behind restrictive networks.
- Add rate limiting and monitoring before public clinical use.
- Do not use seeded demo passwords for real users.
- Do not store real medical data until privacy, consent, retention, and access policies are approved.
- Review logs for secrets and personal data.

## 7. Release checklist

- [ ] Managed PostgreSQL is available.
- [ ] Prisma migrations completed successfully.
- [ ] Production environment variables are configured as secrets.
- [ ] API health and readiness checks pass.
- [ ] Frontend points to the production API.
- [ ] CORS and Socket.IO use the production frontend origin.
- [ ] Registration, login, appointment, queue, notification, and consultation flows pass.
- [ ] HTTPS and WebRTC permissions are verified.
- [ ] Backups, monitoring, and domain settings are enabled.
