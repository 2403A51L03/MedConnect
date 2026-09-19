# MedConnect Database Design

MedConnect uses PostgreSQL through Prisma ORM. The schema source is `server/prisma/schema.prisma` and the initial migration is under `server/prisma/migrations/20260906000000_initial_database_design`.

## Entities

| Model | Purpose | Important relationships |
|---|---|---|
| `User` | Identity, credentials, contact information, and role | Has one optional doctor/patient profile; owns appointments and notifications |
| `DoctorProfile` | Doctor specialization and availability | Belongs to `User`; owns appointments and consultations |
| `PatientProfile` | Patient role extension | Belongs one-to-one to `User` |
| `Appointment` | Patient-doctor booking and workflow status | Belongs to patient and doctor; may have one queue entry and consultation |
| `QueueEntry` | Daily token and queue state | One-to-one with appointment; unique token per queue date |
| `Consultation` | Consultation lifecycle and notes | Links appointment, queue entry, and doctor |
| `Notification` | User-facing workflow notifications | Belongs to user; indexed by read state and creation time |

## Enums

- `UserRole`: `PATIENT`, `DOCTOR`, `RECEPTIONIST`, `ADMIN`
- `AppointmentStatus`: booking and completion lifecycle
- `QueueEntryStatus`: waiting, called, in-progress, completed, skipped, cancelled
- `ConsultationStatus`: scheduled, in-progress, completed, cancelled
- `NotificationType`: appointment, queue, consultation, system
- `AvailabilityStatus`: available, busy, unavailable

## Integrity and indexes

- User email is unique.
- Doctor and patient profiles are one-to-one with users.
- Appointment references enforce patient and doctor ownership.
- Queue entry appointment IDs are unique.
- `(tokenNumber, queueDate)` is unique to prevent duplicate daily tokens.
- Appointment, queue, consultation, and notification indexes support the main dashboard queries.
- Cascading deletes are limited to profile, queue, consultation, and notification relationships where the schema explicitly defines them.

## Operations

Development migration:

```powershell
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate
npm run prisma:seed
```

Production migration:

```powershell
npx prisma generate
npx prisma migrate deploy
```

The schema validates locally without a database connection. A live database connection and `DATABASE_URL` are still required to apply migrations, seed data, and run database-backed workflows.

## Security notes

Passwords are stored as one-way hashes. The application returns safe user projections and uses Prisma query objects rather than raw SQL for application operations. `DATABASE_URL` must be stored as a deployment secret and must never be committed.
