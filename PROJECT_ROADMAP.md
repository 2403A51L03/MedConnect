# MedConnect Development Roadmap

Roadmap created: September 6, 2026  
Review-2: September 22, 2026  
Feature-complete target: November 10-12, 2026  
Final stabilization and viva preparation: November 13-24, 2026  
Final Viva: November 25, 2026

## Working principles

- Keep the system understandable for a B.Tech viva.
- Build and verify one end-to-end workflow before adding secondary features.
- Use PostgreSQL, Prisma, Express, React/Vite, JWT, and Socket.IO only where they directly support a requirement.
- Do not add Redis unless a measured requirement makes it necessary.
- Keep secrets in environment variables and commit only `.env.example` templates.
- Each milestone ends with a runnable demo, focused tests, and updated documentation.

## Phase 0: Repository and project foundation

### September 6-7

- Initialize Git and create the repository structure: `client/`, `server/`, and shared documentation.
- Scaffold the Vite React frontend and Express backend.
- Add `.gitignore`, root scripts, README setup instructions, and `.env.example` files.
- Add backend health check and a minimal frontend shell.
- Confirm local install, development start, and build commands.

**Exit check:** a clean clone can install dependencies and run both client and server.

## Phase 1: Database and backend foundation

### September 8-10

- Configure PostgreSQL and Prisma.
- Model users, roles, doctors, patients, appointments, queue tokens, and status fields.
- Create the initial migration and a safe development seed.
- Add Express error handling, request validation, logging appropriate for development, and a database health check.
- Establish route, controller, service, and middleware conventions.

**Exit check:** migration and seed work from a clean database, and the API health/database checks pass.

## Phase 2: Authentication, RBAC, and doctor management

### September 11-14

- Implement registration and login with password hashing and JWT access tokens.
- Add authentication middleware and role checks for patient, doctor, and receptionist/admin.
- Add current-user endpoint and frontend session handling.
- Implement receptionist/admin doctor creation, listing, update, and deactivation.
- Add frontend login, registration, protected routes, and role-aware navigation.

**Exit check:** each role can authenticate and is denied access to routes outside its permissions.

## Phase 3: Appointment and basic queue workflow

### September 15-18

- Implement doctor listing and the patient appointment-booking flow.
- Add appointment listing and status transitions with server-side ownership checks.
- Generate queue tokens for valid appointments with a clear daily ordering rule.
- Implement doctor queue view and receptionist queue controls for calling, serving, skipping, and completing tokens.
- Add frontend pages for booking, appointments, doctor queue, and receptionist queue.

**Exit check:** a seeded or newly registered patient can book an appointment, receive a token, and move through the basic queue workflow.

## Phase 4: Review-2 hardening and demonstration

### September 19-21

- Connect all Review-2 screens to the real API.
- Add loading, validation, empty, unauthorized, and error states.
- Add focused backend integration tests for auth, RBAC, booking, token generation, and queue transitions.
- Prepare a Postman collection and database reset/seed instructions.
- Update README with architecture, setup, API summary, and demo credentials or seed guidance.
- Run a clean-machine-style rehearsal and fix only blockers to the core workflow.

### September 22: Review-2

Demonstrate: login, role-based access, doctor management, patient booking, token generation, and basic queue management in one complete flow.

## Phase 5: Real-time queue and notifications

### September 23-October 3

- Add Socket.IO rooms scoped to clinic/date or appointment context.
- Broadcast queue changes after validated state transitions.
- Add patient live queue position and estimated status view.
- Add in-app notifications for booking confirmation, queue movement, and completion.
- Test reconnect behavior and ensure clients cannot subscribe to unauthorized data.

**Exit check:** queue changes made by a receptionist or doctor appear live for authorized patients and staff.

## Phase 6: Availability, dashboards, and consultation history

### October 4-17

- Implement doctor availability and appointment-slot rules.
- Prevent double booking and invalid booking dates at the service/database boundary.
- Improve doctor and receptionist dashboards with useful queue and appointment summaries.
- Add consultation start, completion, notes metadata, and patient consultation history.
- Add audit-friendly status timestamps without storing unnecessary sensitive data.

**Exit check:** normal clinic scheduling and completed-consultation history work without manual database edits.

## Phase 7: WebRTC tele-consultation

### October 18-30

- Define the consultation authorization and lifecycle before adding media controls.
- Implement Socket.IO signaling for authorized patient-doctor pairs.
- Add WebRTC offer/answer, ICE candidate exchange, join/leave states, mute/camera controls, and failure handling.
- Add a consultation screen linked to an appointment and preserve completion status/history.
- Test same-device and two-browser local scenarios; document network limitations.

**Exit check:** an authorized patient and doctor can establish and end a local tele-consultation, with no cross-appointment access.

## Phase 8: Feature completion and integration testing

### October 31-November 10

- Complete remaining user-facing flows and consistent validation/error handling.
- Add unit tests for core services and integration tests for API permissions and state transitions.
- Add frontend smoke tests for the primary role workflows where practical.
- Perform security review: password handling, JWT expiry, authorization ownership checks, input validation, CORS, and secret handling.
- Remove dead code, simplify fragile abstractions, and keep dependencies minimal.

### November 11-12: Feature-complete checkpoint

Freeze new features after the agreed requirements are demonstrably complete. Record known limitations and prioritize only defects that affect security, data integrity, or the core demo.

## Phase 9: Stabilization, deployment, and viva preparation

### November 13-17

- Fix high-priority defects and rerun the full regression suite.
- Verify migrations and environment configuration from a clean setup.
- Prepare deployment configuration for the selected frontend, backend, and PostgreSQL hosting options.
- Validate production build, CORS, HTTPS assumptions, WebRTC signaling, and database backups/rollback notes.

### November 18-21

- Complete README, API documentation, architecture diagrams, database ER diagram, and test report.
- Capture screenshots and a short demo script for each role.
- Prepare explanation of JWT, RBAC, Prisma schema, queue ordering, Socket.IO, and WebRTC decisions.

### November 22-24

- Run the final clean-environment rehearsal.
- Freeze code except for critical fixes.
- Prepare viva questions, limitations, future work, and a backup demo path.

### November 25: Final Viva

Present the problem, architecture, implemented workflows, security decisions, testing evidence, limitations, and future improvements using the working deployment or a rehearsed local fallback.

## Priority rule

When schedule pressure appears, preserve this order: database integrity, authentication/RBAC, appointment and queue workflow, frontend integration, tests for the core flow, real-time updates, consultation history, WebRTC, deployment polish, and optional enhancements. A reliable queue platform is more valuable than a broad set of unfinished features.