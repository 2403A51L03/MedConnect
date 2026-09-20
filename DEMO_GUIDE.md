# MedConnect demo guide

This is a repeatable demonstration using fictional seeded data. Do not enter real patient information.

## Before the demo

1. Start PostgreSQL and set `DATABASE_URL` in `server/.env`.
2. Run:

   ```bash
   npm install --prefix client
   npm install --prefix server
   npm run prisma:migrate
   npm run prisma:seed
   ```

3. Start the API and client, or use the Replit preview workflow:

   ```bash
   npm run dev:server
   npm run dev:client
   ```

4. Open the client and keep a second browser/private window available for the doctor role.

Every seeded account uses the password `MedConnect123!`:

| Role | Email |
| --- | --- |
| Patient | `patient@medconnect.local` |
| Second patient | `patient2@medconnect.local` |
| Doctor | `doctor@medconnect.local` |
| Receptionist | `reception@medconnect.local` |
| Admin | `admin@medconnect.local` |

## Recommended walkthrough

### 1. Explain the product

Start signed out. Show the landing page sections:

- the problem: waiting-room uncertainty and disconnected clinic tools;
- the care journey: book, receive a token, follow the live queue, consult, and keep history;
- the doctor directory and responsive layout.

### 2. Patient books and receives a token

1. Sign in as `patient@medconnect.local`.
2. In **Appointments**, choose the available seeded doctor, `Dr. Maya Rao`.
3. Choose a future time that satisfies the form’s minimum.
4. Submit the booking.
5. Point out the confirmation and daily queue token.
6. In the patient workspace, show the active appointment, token, position, patients ahead, and notification count.

Expected result: a patient owns the appointment and can see only their own queue status.

### 3. Doctor advances the queue

1. Sign in as `doctor@medconnect.local` in the second browser.
2. Open the doctor workspace.
3. Show today’s appointment count and waiting queue.
4. Select **Call next patient**.
5. Start the called consultation.

Expected result: the queue entry changes `WAITING → CALLED → IN_PROGRESS`; the patient receives a queue/consultation update and the doctor becomes busy.

### 4. Join the tele-consultation

1. Return to the patient window and refresh if the live update has not appeared.
2. Select **Join consultation** and allow camera/microphone access.
3. Join from the doctor window as well.
4. Show the local/remote video areas and mute, camera, and leave controls.

Socket.IO carries signaling only. Media is exchanged client-to-client through WebRTC.

### 5. Complete and verify history

1. In the doctor workspace, select **Complete**.
2. Show that the current consultation closes and the next waiting token is called automatically.
3. In the patient workspace, show the completed notification and consultation history.

Expected result: queue status becomes `COMPLETED`, consultation history persists, and the doctor becomes available for the next patient.

### 6. Staff operations

1. Sign in as `reception@medconnect.local` or `admin@medconnect.local`.
2. Show appointment, doctor availability, patient, and queue-management cards.
3. Register a fictional patient using the form.
4. Select an available doctor and patient, then create a walk-in.
5. Use **Call next** to demonstrate staff queue control.

Expected result: the walk-in is a real patient account/profile, receives a daily token, and appears in the same queue workflow.

## Useful viva checks

- Try booking an unavailable doctor: the selection is disabled in the client and the server rejects the request.
- Try opening another user’s appointment or consultation history by changing an ID: ownership checks reject it.
- Try calling next while a consultation is active: the server returns a conflict rather than skipping the active patient.
- Mark a notification read and refresh: its read state is persisted.
- Cancel an appointment: history remains, but its queue entry is cancelled and no longer changes queue position.

## Verification status

The workspace verifies:

- Prisma schema validation;
- Prisma client generation for the Linux runtime;
- 15 service/auth/policy tests;
- client Oxlint;
- client production build.

Live PostgreSQL flows are not claimed as tested unless PostgreSQL is configured. Browser WebRTC behavior also depends on HTTPS, device permissions, and network ICE/TURN support.