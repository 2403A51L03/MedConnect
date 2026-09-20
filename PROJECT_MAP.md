# MedConnect project map

This map keeps the application easy to explain during a B.Tech viva. The central story is:

**patient books → appointment receives a token → staff/doctor advances the queue → patient is notified → both users join a consultation → doctor completes it → history is stored.**

## Top-level structure

```text
client/
  src/
    App.jsx                         Application composition and page anchors
    App.css                         Shared responsive visual system
    components/
      AuthPanel.jsx                 Register, login, and logout
      DoctorCard.jsx                Safe doctor selection card
      DoctorManagementPanel.jsx     Receptionist/admin doctor controls
      RoleWorkbench.jsx             Patient, doctor, and staff dashboards
      TeleConsultationPanel.jsx     Camera, microphone, WebRTC, and call state
    hooks/
      useRealtime.js                Authenticated Socket.IO refresh events
    layouts/
      AppLayout.jsx                 Header, navigation, and page shell
    pages/
      HomePage.jsx                  Product explanation and care journey
      DoctorsPage.jsx               Searchable doctor directory
      AppointmentsPage.jsx          Patient booking, cancellation, and queue status
    services/
      api.js                        Same-origin/API requests and friendly errors
      auth.js, session.js           Auth state and browser session storage
      appointments.js, doctors.js   Small endpoint-specific client functions
      queue.js                      Queue status requests
```

```text
server/
  src/
    app.js                          Express middleware and route mounting
    server.js                       HTTP + Socket.IO startup
    config/env.js                   Environment configuration
    controllers/                    Request/response orchestration
    middleware/                     JWT authentication and RBAC
    routes/                         URL-level access rules
    services/
      appointmentService.js         Booking, cancellation, and walk-ins
      queueService.js               Token issuance and queue transitions
      notificationService.js        Queue/consultation notifications
    socket/index.js                 Authenticated room membership and signaling
    realtime/hub.js                 Server-side event helpers
    validation/                     Input validation before service calls
    database/prisma.js              Shared Prisma client
  prisma/
    schema.prisma                   PostgreSQL data model and enums
    migrations/                     Versioned database changes
    seed.js                         Fictional demo accounts and queue data
  test/                             Node test runner service and policy tests
```

## How one request travels

1. A React page calls a small client service such as `appointments.js`.
2. `api.js` adds the JWT and converts HTTP errors into user-readable messages.
3. An Express route applies `requireAuth` and role/ownership rules.
4. A controller validates request input and delegates business rules to a service.
5. The service reads or updates PostgreSQL through Prisma.
6. Queue and notification changes are emitted through Socket.IO.
7. `useRealtime` refreshes the relevant role dashboard without putting database logic in React.

## Database relationships to explain

- `User` carries identity and one of four roles.
- `PatientProfile` and `DoctorProfile` extend role-specific data.
- `Appointment` connects one patient to one doctor at a scheduled time.
- `QueueEntry` is the appointment’s daily token and status.
- `Consultation` records the live session and completion history.
- `Notification` stores durable queue and consultation messages.

The `Appointment → QueueEntry → Consultation` chain is intentionally explicit so the queue can be audited after a consultation is completed.

## Security boundaries

- JWT authentication protects HTTP and Socket.IO connections.
- Role checks distinguish patient, doctor, receptionist, and admin capabilities.
- Ownership checks prevent changing an ID in the URL to access another user’s records.
- Socket consultation rooms only accept the assigned patient, assigned doctor, or staff.
- Password hashes, JWT secrets, and internal database errors are never returned to the client.