# MedConnect API Documentation

Base URL: `/api`

Authentication uses `Authorization: Bearer <JWT>` on protected routes. The JWT contains the authenticated user ID and role.

## Health

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Returns API service status and environment |

## Authentication

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a patient |
| POST | `/auth/login` | Public | Login any supported role |
| GET | `/auth/me` | Required | Return the current safe user |

Registration expects `name`, `email`, `password`, and optional `phone`. Login expects `email` and `password`. Password hashes are never returned.

## Doctors

| Method | Route | Auth | Roles |
|---|---|---|---|
| GET | `/doctors` | Public | List doctors and filters |
| GET | `/doctors/:doctorId` | Public | Read a doctor profile |
| GET | `/doctors/:doctorId/schedule` | Required | Read a doctor schedule |
| POST | `/doctors` | Required | RECEPTIONIST, ADMIN |
| PATCH | `/doctors/:doctorId` | Required | Authorized doctor or staff |
| PATCH | `/doctors/:userId/availability` | Required | Authorized doctor or staff |
| GET | `/doctors/:userId/queue` | Required | Authorized doctor or staff |

## Patients

| Method | Route | Auth | Roles |
|---|---|---|---|
| POST | `/patients` | Required | RECEPTIONIST, ADMIN |
| GET | `/patients` | Required | RECEPTIONIST, ADMIN |

## Appointments

| Method | Route | Auth | Roles |
|---|---|---|---|
| POST | `/appointments` | Required | PATIENT |
| POST | `/appointments/walk-in` | Required | RECEPTIONIST, ADMIN |
| GET | `/appointments` | Required | Role-scoped list |
| GET | `/appointments/:appointmentId` | Required | Owner, assigned doctor, or staff |
| PATCH | `/appointments/:appointmentId/cancel` | Required | Patient owner or staff |
| GET | `/appointments/:appointmentId/queue` | Required | Patient owner, assigned doctor, or staff |

A same-day appointment receives a queue token. Future appointments do not receive a token until the queue date.

## Queue and consultations

| Method | Route | Auth | Roles |
|---|---|---|---|
| POST | `/queue/call-next` | Required | DOCTOR, RECEPTIONIST, ADMIN |
| POST | `/queue/:queueEntryId/start` | Required | DOCTOR |
| POST | `/queue/:queueEntryId/complete` | Required | DOCTOR |
| GET | `/users/:userId/consultations` | Required | Owner or staff |
| GET | `/users/:userId/notifications` | Required | Owner or staff |
| GET | `/users/:userId/appointments` | Required | Owner or staff |

Queue mutations are service-layer protected by doctor assignment and queue status. Completing a consultation advances the next eligible waiting patient.

## Socket.IO

The Socket.IO server shares the backend HTTP origin. The client supplies the JWT in `socket.handshake.auth.token`.

Implemented events include:

- `connection:ready`
- `queue:updated`
- `queue:called`
- `join-consultation`
- `consultation:joined`
- `consultation:participant-joined`
- `consultation:available`
- `consultation:ended`
- `consultation:error`
- `webrtc-offer`
- `webrtc-answer`
- `webrtc-ice-candidate`

Socket authentication and consultation-room authorization are implemented in `server/src/socket/index.js`. Live browser verification requires a running PostgreSQL-backed server, HTTPS for production media access, and camera/microphone permissions.

## Error behavior

Validation and authorization errors return structured HTTP errors through the shared error middleware. Internal stack traces and password hashes are not returned to clients.

## Evidence

- Route definitions: `server/src/routes/`
- Controllers: `server/src/controllers/`
- Auth and role tests: `server/test/auth.test.js`
- Appointment tests: `server/test/appointment.test.js`
- Queue tests: `server/test/queue.test.js`
- Postman collection: `postman/MedConnect.postman_collection.json`
