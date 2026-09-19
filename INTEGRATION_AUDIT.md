# Frontend/Backend Integration Audit

Audit date: September 16, 2026

## Shared request contract

All frontend API calls use `client/src/services/api.js` and `requestApi()`.

- Base URL: `VITE_API_URL`, defaulting to `http://localhost:4000/api`
- JSON request bodies receive `Content-Type: application/json`
- Stored JWT receives `Authorization: Bearer <token>`
- JSON responses are parsed consistently
- Error responses use the backend `{ error }` shape
- HTTP 401 clears the client session
- HTTP status is retained on thrown errors
- Local development accepts both `localhost:5173` and `127.0.0.1:5173`

## Endpoint audit

| Frontend use | Method and URL | Backend route | Result |
|---|---|---|---|
| Health hook | `GET /health` | `GET /api/health` | Match |
| Login | `POST /auth/login` | `POST /api/auth/login` | Match |
| Patient registration | `POST /auth/register` | `POST /api/auth/register` | Match |
| Current user | `GET /auth/me` | `GET /api/auth/me` | Match |
| Doctor directory | `GET /doctors?...` | `GET /api/doctors` | Match |
| Doctor schedule | `GET /doctors/:id/schedule` | `GET /api/doctors/:doctorId/schedule` | Match |
| Doctor creation | `POST /doctors` | `POST /api/doctors` | Match |
| Doctor update | `PATCH /doctors/:id` | `PATCH /api/doctors/:doctorId` | Match |
| Appointments | `POST /appointments` | `POST /api/appointments` | Match |
| Appointment list | `GET /appointments` | `GET /api/appointments` | Match |
| Appointment cancellation | `PATCH /appointments/:id/cancel` | `PATCH /api/appointments/:appointmentId/cancel` | Match |
| Queue status | `GET /appointments/:id/queue` | `GET /api/appointments/:appointmentId/queue` | Match |
| Patient notifications | `GET /users/:id/notifications` | `GET /api/users/:userId/notifications` | Match |
| Consultation history | `GET /users/:id/consultations` | `GET /api/users/:userId/consultations` | Match |
| Doctor queue | `GET /doctors/:id/queue` | `GET /api/doctors/:userId/queue` | Match |
| Call next | `POST /queue/call-next` | `POST /api/queue/call-next` | Match |
| Start consultation | `POST /queue/:id/start` | `POST /api/queue/:queueEntryId/start` | Match |
| Complete consultation | `POST /queue/:id/complete` | `POST /api/queue/:queueEntryId/complete` | Match |
| Staff patient registration | `POST /patients` | `POST /api/patients` | Match |
| Walk-in creation | `POST /appointments/walk-in` | `POST /api/appointments/walk-in` | Match |

## Browser verification

Verified against the running local servers on September 16, 2026:

- Vite served the page successfully.
- Document title is `MedConnect | Clinic workspace`.
- Frontend health request reached the API and displayed `API connected at medconnect-api`.
- Local `127.0.0.1` frontend origin was accepted by backend CORS.
- Missing database configuration produced visible doctor-directory error state rather than a stuck loading state.
- Unauthenticated appointment requests are handled as protected API calls.

Full authenticated booking, queue, and role-dashboard browser workflows require PostgreSQL to be running and seeded. The backend and frontend contracts are covered by the automated service tests and the documented seed/demo sequence in `README.md`.
