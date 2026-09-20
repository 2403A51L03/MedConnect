# MedConnect User and Admin Guide

This guide uses fictional demo data. Never enter real patient information in a development or demo environment.

## Start the application

1. Start Docker Desktop.
2. From the project root, run:

   ```powershell
   npm install --prefix client
   npm install --prefix server
   npm run db:up
   npm run prisma:migrate
   npm run prisma:seed
   npm run dev:server
   ```

3. In a second terminal, run `npm run dev:client`.
4. Open `http://localhost:5000`.
5. Confirm `http://localhost:4000/api/health/ready` reports `status: "ready"`.

All seeded accounts use the password `MedConnect123!`.

| Role | Email | Main purpose |
| --- | --- | --- |
| Admin | `admin@medconnect.local` | Manage doctors, patients, appointments, and queues |
| Receptionist | `reception@medconnect.local` | Register patients, book walk-ins, and manage queues |
| Doctor | `doctor@medconnect.local` | Review appointments, call patients, and conduct consultations |
| Doctor | `arjun.mehta@medconnect.local` | Cardiology demo account |
| Doctor | `priya.nair@medconnect.local` | Paediatrics demo account |
| Doctor | `rohan.iyer@medconnect.local` | Dermatology demo account |
| Patient | `patient@medconnect.local` | Book appointments and follow a queue |
| Patient | `patient2@medconnect.local` | Test a second patient account |

## Admin workflow

1. Sign in with `admin@medconnect.local` and `MedConnect123!`.
2. Open the admin/staff workspace.
3. Review the doctor directory and availability.
4. Review all appointments and queue entries.
5. Register a new fictional patient.
6. Create a walk-in appointment for a patient and available doctor.
7. Use **Call next** to advance the selected doctor's queue.
8. Mark notifications as read and verify the patient history.
9. Update doctor availability when a doctor becomes unavailable.

Admins can act on behalf of staff workflows, but they should still use fictional data during demonstrations.

## Receptionist workflow

1. Sign in with `reception@medconnect.local` and `MedConnect123!`.
2. Register a patient from the staff panel.
3. Select a doctor and create a walk-in appointment.
4. Check the generated queue token.
5. Call the next waiting patient and monitor queue status.

## Patient workflow

1. Sign in with `patient@medconnect.local` and `MedConnect123!`, or create a new patient account after PostgreSQL is ready.
2. Open the doctor directory and filter by specialty or availability.
3. Book a future appointment with an available doctor.
4. View the queue token, queue position, and patients ahead.
5. Read appointment and queue notifications.
6. Join a consultation when the doctor starts one.
7. Review consultation history after completion.
8. Cancel an appointment only when it is still cancellable.

## Doctor workflow

1. Sign in with `doctor@medconnect.local` and `MedConnect123!`.
2. Review assigned appointments and the waiting queue.
3. Select **Call next patient**.
4. Select **Start consultation**.
5. Join the tele-consultation and allow camera/microphone access when prompted.
6. Select **Complete consultation** and add notes if required.
7. Confirm the next eligible queue token is called automatically.

## Demonstration scenarios

- Duplicate registration: register the same email twice. The second request returns a conflict.
- Invalid login: use a wrong password. The API rejects it without exposing account details.
- Doctor conflict: book the same doctor at the same time. The second booking is rejected.
- Queue progression: call, start, and complete a consultation. The queue changes from `WAITING` to `CALLED`, `IN_PROGRESS`, and `COMPLETED`.
- Authorization: try to access another patient's appointment. Ownership checks reject the request.
- Database outage: stop PostgreSQL and open `/api/health/ready`. The API stays alive but reports `503`; registration explains that the database is unavailable.

## API and test tools

- API reference: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- Postman collection: `postman/MedConnect.postman_collection.json`
- Backend tests: `npm test`
- Frontend checks: `npm run lint` and `npm run build`
