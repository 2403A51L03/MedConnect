# MedConnect

MedConnect is a clinic queue management and tele-consultation platform for patients, doctors, and receptionist/admin staff.

## Current foundation

- `client/`: React + Vite frontend with pages, layouts, hooks, and API services
- `server/`: Express backend with routes, controllers, services, middleware, validation, Prisma database configuration, and Socket.IO/WebRTC signaling
- `server/prisma/schema.prisma`: PostgreSQL data model for users, roles, doctors, patients, appointments, and queue tokens
- `AUDIT_REPORT.md`: baseline repository audit
- `PROJECT_ROADMAP.md`: schedule through the final viva
- `INTEGRATION_AUDIT.md`: frontend/backend endpoint and browser verification audit

## Local setup

Requirements: Node.js 20.14+ and PostgreSQL for database work.

```powershell
npm install --prefix client
Copy-Item server/.env.example server/.env
npm install --prefix server
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate
npm run prisma:seed
```

The API can start without a live PostgreSQL connection because the current health route does not query the database. Configure `server/.env` before adding database-backed features or running migrations.

## Development

Run the API:

```powershell
npm run dev:server
```

Run the frontend in another terminal:

```powershell
npm run dev:client
```

The API health check is available at `http://localhost:4000/api/health`. The Vite client runs at `http://localhost:5173` and contains the Review-2 demo flow.

On Windows, create the PostgreSQL database first if it does not already exist:

```powershell
createdb -U postgres medconnect
Copy-Item server/.env.example server/.env
npm run prisma:migrate
npm run prisma:seed
```

Run these in separate terminals:

```powershell
npm run dev:server
npm run dev:client
```

Open `http://localhost:5173`.

## Environment variables

Do not commit `.env` files. Use the checked-in `.env.example` templates:

- `server/.env.example` contains server, CORS, database, and JWT settings.
- `client/.env.example` contains the API base URL.

Authentication, role-based authorization, appointment workflows, notifications, Socket.IO signaling, and WebRTC consultation support are implemented. Their live production behavior still requires a configured PostgreSQL instance, HTTPS deployment, and browser/network verification.

## Consultation management

Doctors follow the consultation flow `Call patient -> Start consultation -> Conduct consultation -> Complete consultation`.

- Consultation records are stored with patient, doctor, appointment, queue entry, start time, end time, status, and optional notes.
- Patients can fetch their own consultation history through `GET /api/users/:userId/consultations`.
- Doctors can start and complete consultations only for their assigned queue entries through `/api/queue/:queueEntryId/start` and `/api/queue/:queueEntryId/complete`.
- Consultation data is protected by the same RBAC and ownership checks used across the API, so one patient cannot view another patient's consultation history.

## Tele-consultation (WebRTC)

WebRTC is implemented as a client-to-client session with Socket.IO for signaling only; the Express server never relays media streams.

- Patients can join a consultation and request camera/microphone permission.
- Doctors can start a consultation and join the same queue entry room.
- The client handles camera/microphone denial, missing devices, connection failures, leave events, and doctor-driven closure.
- Signaling events are scoped to the consultation queue entry and require valid JWT authentication.

## Security audit

A security review was completed for the application. The main protections in place are:

- Password hashing via a one-way password hash before persistence.
- JWT-based authentication for API and Socket.IO sessions, with expiry and token validation.
- Strict CORS allow-list for known frontend origins instead of wildcard access.
- Route-level RBAC and object-level authorization to prevent cross-user access.
- Prisma ORM usage and validation at the service layer to avoid unsafe database queries.
- Safe user serialization so password hashes and raw secrets are never returned to the client.
- Consistent API error handling that avoids leaking internal backend details or stack traces.
- Environment variables kept in `.env` files and not committed to source control.

## Authentication

Patients register through `POST /api/auth/register`. Login for patients, doctors, receptionists, and admins uses `POST /api/auth/login`. The response contains a short-lived JWT access token and safe user data; password hashes are never selected for responses.

Protected requests use `Authorization: Bearer <token>`. `GET /api/auth/me` verifies the token and returns the current safe user. Client logout removes the token and cached user from browser storage; no plaintext password is stored by the client or server.

Run the authentication tests with `npm test --prefix server`. They cover registration, duplicate accounts, valid and invalid passwords, missing tokens, malformed tokens, and expired tokens without requiring a live database.

## Authorization

All domain routes use `requireAuth` first, then apply reusable role and ownership policies. Patients can access only their own appointment, queue, and consultation-history paths. Doctors can access their own appointments and queue, call patients for assigned appointments, update their own availability, and manage assigned consultations. Receptionists and admins can access staff-managed appointment and queue paths, view doctor availability, and act on behalf of users where the route permits it.

Resource checks also verify the database relationship: a signed-in doctor cannot read another doctor's appointment, and a patient cannot read another patient's appointment by changing an ID in the URL. Authorization tests cover all four roles and cross-user denial.

## Doctor management

Doctor directory endpoints:

- `GET /api/doctors?available=true&search=Maya&specialty=Medicine` lists safe doctor summaries with consistent `isAvailable` status.
- `GET /api/doctors/:doctorId` returns one doctor profile.
- `GET /api/doctors/:doctorId/schedule` returns appointment time and status for authenticated users.
- `POST /api/doctors` lets receptionists/admins create a doctor account and profile.
- `PATCH /api/doctors/:doctorId` lets staff update a doctor, while a doctor can update their own availability/profile fields.

The React directory supports name and specialty filtering, available-doctor selection, and schedule display. Doctor creation and booking screens will consume the same `doctorId` profile identifier in the next workflow slice.

## Appointments

Appointment endpoints:

- `POST /api/appointments` creates a patient-owned appointment after checking doctor existence, `isAvailable`, future time, doctor conflicts, and patient conflicts.
- `GET /api/appointments` returns the signed-in patient's history, the assigned doctor's schedule, or staff-managed appointments according to role.
- `GET /api/appointments/:appointmentId` returns details only to the patient, assigned doctor, receptionist, or admin.
- `PATCH /api/appointments/:appointmentId/cancel` allows the patient or staff to cancel an appointment when its status still permits cancellation.

Queue issuance remains in `queueService.js`. A same-day booking receives a queue token in the confirmation response; future bookings receive `queueToken: null` until the clinic queue is opened. Cancelling an appointment also cancels its existing queue entry without deleting appointment history.

Queue operations are database-backed and transactional: `POST /api/queue/call-next` selects the lowest eligible waiting token, doctors can start and complete consultations through the queue entry endpoints, and completing a consultation automatically calls the next eligible patient in the same transaction. Queue position, current patient, and next patient are calculated from persisted queue rows, so cancelled and completed entries do not distort the live position.

## Review-2 demo endpoints

- Patient auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Patient booking: `POST /api/appointments`, `GET /api/appointments`, `GET /api/appointments/:appointmentId/queue`
- Doctor workbench: `GET /api/appointments`, `GET /api/doctors/:userId/queue`, `POST /api/queue/call-next`, `POST /api/queue/:queueEntryId/start`, `POST /api/queue/:queueEntryId/complete`
- Receptionist/admin: `GET /api/appointments`, `POST /api/patients`, `POST /api/appointments/walk-in`, `PATCH /api/doctors/:userId/availability`
- Patient dashboard data: `GET /api/users/:userId/notifications`, `GET /api/users/:userId/consultations`
- Staff patient list: `GET /api/patients`

## Database design

- `User` stores identity, credentials, contact data, and the explicit `PATIENT`, `DOCTOR`, `RECEPTIONIST`, or `ADMIN` role.
- `PatientProfile` and `DoctorProfile` extend users only where role-specific data is needed. Receptionists and admins are represented directly by `UserRole`, avoiding unnecessary profile tables.
- `Appointment` belongs to one patient user and one doctor profile. Its status and scheduled time support booking and clinic workflow queries.
- `QueueEntry` is the appointment's token. The one-to-one constraint prevents duplicate tokens for one appointment, while status and timestamps support queue progression.
- `Consultation` links the same appointment and queue entry to its doctor, preserving the `Patient -> Appointment -> QueueEntry -> Consultation` history path.
- `Notification` belongs to a user and uses a type enum, read timestamp, and user/time index for patient and staff notification lists.

The initial migration is in `server/prisma/migrations/20260906000000_initial_database_design`. Apply it with `npm run prisma:migrate` after PostgreSQL is running and `server/.env` has a valid `DATABASE_URL`. Seed development data with `npm run prisma:seed`; the seed is idempotent for its named records and does not reset the database.

## Review-2 demo

Seeded password for every demo account: `MedConnect123!`

- Patient: `patient@medconnect.local`
- Additional patients: `patient2@medconnect.local`, `patient3@medconnect.local`
- Doctor: `doctor@medconnect.local`
- Receptionist: `reception@medconnect.local`
- Admin: `admin@medconnect.local`

Recommended sequence: log in as a patient, choose `Dr. Maya Rao`, book an appointment, and check its queue position. Then log in as the doctor in another browser/private window, review appointments and the queue, call the next patient, start the consultation, and complete it. Completing the consultation automatically calls the next waiting token. Receptionist/admin users can review all appointments, register a patient through `POST /api/patients`, create a walk-in through `POST /api/appointments/walk-in`, and manage a queue by providing the doctor's user ID.

The seed creates three same-day queue entries with tokens 1, 2, and 3. The displayed clock time depends on the machine timezone.

## Documentation and deployment status

- [API_DOCUMENTATION.md](API_DOCUMENTATION.md): implemented API routes and authorization requirements
- [DATABASE_DESIGN.md](DATABASE_DESIGN.md): current Prisma schema and migration notes
- [DEPLOYMENT.md](DEPLOYMENT.md): provider-neutral production deployment procedure and verification checklist
- [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md): evidence-based implementation status
- [FINAL_PROJECT_AUDIT.md](FINAL_PROJECT_AUDIT.md): final requirements audit

The application has not been deployed to a cloud provider from this workspace because no hosting, database, DNS, or deployment credentials are configured. Production URLs therefore remain pending. No secrets are committed; use environment variables or the hosting provider's secret manager.
