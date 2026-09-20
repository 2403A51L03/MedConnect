import { useCallback, useEffect, useState } from 'react'
import { requestApi } from '../services/api.js'
import { useRealtime } from '../hooks/useRealtime.js'
import { TeleConsultationPanel } from './TeleConsultationPanel.jsx'

function formatStatus(status = '') {
  return status.toLowerCase().replaceAll('_', ' ')
}

function statusClass(status = '') {
  if (['AVAILABLE', 'COMPLETED', 'CALLED'].includes(status)) return ''
  if (['BUSY', 'IN_PROGRESS'].includes(status)) return 'busy'
  if (['CANCELLED', 'UNAVAILABLE', 'NO_SHOW'].includes(status)) return 'offline'
  return ''
}

function DashboardHeader({ role, title, subtitle, onRefresh, loading }) {
  return (
    <div className="directory-heading">
      <div>
        <p className="kicker">{role} workspace</p>
        <h2>{title}</h2>
        {subtitle && <p className="muted-copy">{subtitle}</p>}
      </div>
      <button type="button" className="refresh-button" onClick={onRefresh} disabled={loading}>{loading ? 'Loading...' : 'Refresh data'}</button>
    </div>
  )
}

function StateMessage({ loading, error, empty, emptyText = 'Nothing to show yet.' }) {
  if (loading) return <p className="dashboard-state">Loading workspace data...</p>
  if (error) return <p className="dashboard-error">{error}</p>
  if (empty) return <p className="dashboard-state">{emptyText}</p>
  return null
}

function AppointmentList({ appointments, patientView = false }) {
  return (
    <div className="dashboard-list">
      {appointments.map((appointment) => (
        <div className="dashboard-list-row" key={appointment.id}>
          <div>
            <strong>{patientView ? appointment.doctor?.user?.name : appointment.patient?.name || appointment.doctor?.user?.name || 'Patient'}</strong>
            <time>{new Date(appointment.scheduledAt).toLocaleString()}</time>
          </div>
          <span className={`status-badge ${statusClass(appointment.status)}`}>{formatStatus(appointment.status)}</span>
          {appointment.queueEntry && <b>Token {appointment.queueEntry.tokenNumber}</b>}
        </div>
      ))}
    </div>
  )
}

function Kpis({ items }) {
  return <div className="dashboard-kpi-grid">{items.map(([label, value, tone]) => <div className="kpi-card" key={label}><p className="kpi-label">{label}</p><p className={`kpi-value ${tone || ''}`}>{value}</p></div>)}</div>
}

function PatientDashboard({ user }) {
  const [data, setData] = useState({ appointments: [], notifications: [], consultations: [] })
  const [queue, setQueue] = useState(null)
  const [consultationEntryId, setConsultationEntryId] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      const [appointmentResult, notificationResult, consultationResult] = await Promise.all([
        requestApi('/appointments'),
        requestApi(`/users/${user.id}/notifications`),
        requestApi(`/users/${user.id}/consultations`),
      ])
      const currentAppointment = appointmentResult.appointments.find((item) => item.queueEntry && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(item.status))
      const nextQueue = currentAppointment ? await requestApi(`/appointments/${currentAppointment.id}/queue`) : null
      const activeQueueEntry = nextQueue && ['CALLED', 'IN_PROGRESS'].includes(nextQueue.queueEntry?.status) ? nextQueue.queueEntry : null
      setData({ appointments: appointmentResult.appointments, notifications: notificationResult.notifications, consultations: consultationResult.consultations })
      setQueue(nextQueue)
      setConsultationEntryId(activeQueueEntry?.id || null)
      setState('ready')
    } catch (requestError) {
      setError(requestError.message)
      setState('error')
    }
  }, [user.id])

  const realtimeStatus = useRealtime(refresh, user.id)

  useEffect(() => { refresh() }, [refresh])

  async function markRead(notificationId) {
    try {
      await requestApi(`/notifications/${notificationId}/read`, { method: 'PATCH' })
      setData((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item) }))
    } catch (requestError) {
      setMessage(requestError.message)
    }
  }

  const active = data.appointments.filter((item) => !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(item.status)).length
  return (
    <section className="dashboard-section" aria-labelledby="patient-workspace-title">
      <DashboardHeader role="Patient" title="Your care timeline" subtitle={`Welcome back, ${user.name}. Follow one clear path from booking to consultation.`} onRefresh={refresh} loading={state === 'loading'} />
      <p className={`realtime-status ${realtimeStatus}`}>Live updates: {realtimeStatus === 'connected' ? 'connected' : 'reconnecting'}</p>
      {message && <p className="management-message" aria-live="polite">{message}</p>}
      <Kpis items={[['Active appointments', active, 'teal'], ['Current token', queue?.queueEntry?.tokenNumber || '—', 'coral'], ['Patients ahead', queue?.position ? Math.max(queue.position - 1, 0) : '—', ''], ['Notifications', data.notifications.filter((item) => !item.readAt).length, 'teal']]} />
      <div className="dashboard-grid patient-grid">
        <div className="dashboard-card queue-card queue-focus">
          <p className="kicker">Live queue</p>
          <h3>{queue ? 'Your place is visible' : 'No active queue yet'}</h3>
          {queue ? <><div className="queue-number">{queue.queueEntry.tokenNumber}</div><p>your token</p><div className="queue-metrics"><div className="queue-metric"><strong>{queue.position || 'Now'}</strong><span>position</span></div><div className="queue-metric"><strong>{Math.max((queue.position || 1) - 1, 0)}</strong><span>patients ahead</span></div><div className="queue-metric"><strong>{queue.currentPatient?.name || '—'}</strong><span>currently serving</span></div></div><span className="status-badge">{formatStatus(queue.queueEntry.status)}</span></> : <StateMessage loading={state === 'loading'} error={error} empty emptyText="Book a same-day appointment to receive a queue token." />}
        </div>
        <div className="dashboard-card">
          <h3>Next appointment</h3>
          {data.appointments[0] ? <><div className="current-patient">{data.appointments[0].doctor?.user?.name || 'Your doctor'}</div><p>{new Date(data.appointments[0].scheduledAt).toLocaleString()}</p><span className={`status-badge ${statusClass(data.appointments[0].status)}`}>{formatStatus(data.appointments[0].status)}</span></> : <StateMessage loading={state === 'loading'} error={error} empty emptyText="No upcoming appointments." />}
        </div>
        <div className="dashboard-card">
          <h3>Notifications <span>{data.notifications.length}</span></h3>
          <StateMessage loading={state === 'loading'} error={error} empty={!data.notifications.length} emptyText="No new clinic updates." />
          {data.notifications.slice(0, 5).map((item) => <button className={`dashboard-note notification-item ${item.readAt ? 'read' : ''}`} type="button" key={item.id} onClick={() => markRead(item.id)}><strong>{item.title}</strong><p>{item.message}</p><small>{item.readAt ? 'Read' : 'Mark as read'}</small></button>)}
        </div>
        <div className="dashboard-card">
          <h3>Consultation history</h3>
          <StateMessage loading={state === 'loading'} error={error} empty={!data.consultations.length} emptyText="No consultation history yet." />
          {data.consultations.slice(0, 5).map((item) => <div className="dashboard-list-row" key={item.id}><span>{formatStatus(item.status)}</span><time>{new Date(item.createdAt).toLocaleDateString()}</time></div>)}
        </div>
        {consultationEntryId && <TeleConsultationPanel user={user} queueEntryId={consultationEntryId} roleLabel="Patient" />}
      </div>
    </section>
  )
}

function DoctorDashboard({ user }) {
  const [appointments, setAppointments] = useState([])
  const [queue, setQueue] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      const [appointmentResult, queueResult] = await Promise.all([requestApi('/appointments'), requestApi(`/doctors/${user.id}/queue`)])
      setAppointments(appointmentResult.appointments)
      setQueue(queueResult.queue)
      setState('ready')
    } catch (requestError) {
      setError(requestError.message)
      setState('error')
    }
  }, [user.id])

  const realtimeStatus = useRealtime(refresh, user.id)

  useEffect(() => { refresh() }, [refresh])

  async function queueAction(id, action) {
    try {
      await requestApi(`/queue/${id}/${action}`, { method: 'POST', body: JSON.stringify(action === 'complete' ? { notes: 'Consultation completed during clinic workflow.' } : {}) })
      setMessage(action === 'start' ? 'Consultation started.' : 'Consultation completed. The queue advanced.')
      await refresh()
    } catch (requestError) {
      setMessage(requestError.message)
    }
  }

  async function callNext() {
    try {
      await requestApi('/queue/call-next', { method: 'POST', body: '{}' })
      setMessage('Next patient called. Their dashboard has been updated.')
      await refresh()
    } catch (requestError) {
      setMessage(requestError.message)
    }
  }

  const current = queue.find((item) => ['CALLED', 'IN_PROGRESS'].includes(item.status))
  const waiting = queue.filter((item) => item.status === 'WAITING')
  return (
    <section className="dashboard-section" aria-labelledby="doctor-workspace-title">
      <DashboardHeader role="Doctor" title="Today at the clinic" subtitle={`A focused queue view for ${user.name}.`} onRefresh={refresh} loading={state === 'loading'} />
      <p className={`realtime-status ${realtimeStatus}`}>Live updates: {realtimeStatus === 'connected' ? 'connected' : 'reconnecting'}</p>
      {message && <p className="management-message" aria-live="polite">{message}</p>}
      <Kpis items={[["Today's appointments", appointments.length, 'teal'], ['Waiting patients', waiting.length, 'coral'], ['Queue length', queue.length, ''], ['Availability', current ? 'Busy' : 'Ready', current ? 'coral' : 'teal']]} />
      <div className="dashboard-grid doctor-grid">
        <div className="dashboard-card queue-focus">
          <p className="kicker">Queue command</p>
          <h3>Move the next patient forward</h3>
          {current ? <div className="current-patient">Token {current.tokenNumber}<p>{current.appointment?.patient?.name || 'Current patient'} · {formatStatus(current.status)}</p></div> : <StateMessage loading={state === 'loading'} error={error} empty emptyText="No patient is currently in consultation." />}
          <button type="button" className="queue-action primary" onClick={callNext} disabled={state !== 'ready' || Boolean(current) || waiting.length === 0}>Call next patient</button>
          <div className="queue-metrics"><div className="queue-metric"><strong>{current ? current.tokenNumber : '—'}</strong><span>current token</span></div><div className="queue-metric"><strong>{waiting[0]?.tokenNumber || '—'}</strong><span>next token</span></div><div className="queue-metric"><strong>{waiting.length}</strong><span>waiting</span></div></div>
        </div>
        <div className="dashboard-card">
          <h3>Today's appointments</h3>
          <StateMessage loading={state === 'loading'} error={error} empty={!appointments.length} emptyText="No appointments scheduled today." />
          {state === 'ready' && <AppointmentList appointments={appointments} />}
        </div>
        <div className="dashboard-card queue-card">
          <h3>Queue actions</h3>
          <StateMessage loading={state === 'loading'} error={error} empty={!queue.length} emptyText="No patients are currently waiting." />
          {queue.map((entry) => <div className="dashboard-list-row" key={entry.id}><div><strong>Token {entry.tokenNumber}</strong><time>{entry.appointment?.patient?.name || 'Patient'}</time></div><span className={`status-badge ${statusClass(entry.status)}`}>{formatStatus(entry.status)}</span>{entry.status === 'CALLED' && <button type="button" onClick={() => queueAction(entry.id, 'start')}>Start</button>}{entry.status === 'IN_PROGRESS' && <button type="button" onClick={() => queueAction(entry.id, 'complete')}>Complete</button>}</div>)}
        </div>
        <div className="dashboard-card">
          <h3>What happens next</h3>
          <p className="muted-copy">Call the lowest waiting token, start the consultation when the patient is ready, then complete it to automatically advance the queue.</p>
          <span className={`status-badge ${current ? 'busy' : ''}`}>{current ? 'In consultation' : 'Available for next patient'}</span>
        </div>
        {current && <TeleConsultationPanel user={user} queueEntryId={current.id} roleLabel="Doctor" />}
      </div>
    </section>
  )
}

function StaffDashboard({ user }) {
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [doctorId, setDoctorId] = useState('')
  const [walkInPatientId, setWalkInPatientId] = useState('')
  const [patientForm, setPatientForm] = useState({ name: '', email: '', password: '' })
  const [message, setMessage] = useState('')
  const [state, setState] = useState('loading')

  const refresh = useCallback(async () => {
    setState('loading')
    try {
      const [appointmentResult, patientResult, doctorResult] = await Promise.all([requestApi('/appointments'), requestApi('/patients'), requestApi('/doctors')])
      setAppointments(appointmentResult.appointments)
      setPatients(patientResult.patients)
      setDoctors(doctorResult.doctors)
      setState('ready')
    } catch (error) {
      setMessage(error.message)
      setState('error')
    }
  }, [])

  const realtimeStatus = useRealtime(refresh, user.id)

  useEffect(() => { refresh() }, [refresh])

  async function registerPatient(event) {
    event.preventDefault()
    try {
      await requestApi('/patients', { method: 'POST', body: JSON.stringify(patientForm) })
      setPatientForm({ name: '', email: '', password: '' })
      setMessage('Patient registered.')
      await refresh()
    } catch (error) { setMessage(error.message) }
  }

  async function walkIn(event) {
    event.preventDefault()
    if (!doctorId || !walkInPatientId) return setMessage('Select both a doctor and patient for the walk-in.')
    try {
      const result = await requestApi('/appointments/walk-in', { method: 'POST', body: JSON.stringify({ doctorId, patientId: walkInPatientId }) })
      setMessage(`Walk-in created with token ${result.confirmation.queueToken}.`)
      await refresh()
    } catch (error) { setMessage(error.message) }
  }

  async function callDoctorQueue() {
    if (!doctorId) return setMessage('Select a doctor before managing their queue.')
    try {
      await requestApi('/queue/call-next', { method: 'POST', body: JSON.stringify({ doctorUserId: doctors.find((doctor) => doctor.id === doctorId)?.userId }) })
      setMessage('Next patient called.')
      await refresh()
    } catch (error) { setMessage(error.message) }
  }

  const waiting = appointments.filter((item) => item.queueEntry?.status === 'WAITING').length
  const inConsultation = appointments.filter((item) => item.status === 'IN_PROGRESS').length
  const completed = appointments.filter((item) => item.status === 'COMPLETED').length
  return (
    <section className="dashboard-section" aria-labelledby="staff-workspace-title">
      <DashboardHeader role={user.role} title="Clinic operations" subtitle="One screen for the day’s appointments, patients, doctors, and queue activity." onRefresh={refresh} loading={state === 'loading'} />
      <p className={`realtime-status ${realtimeStatus}`}>Live updates: {realtimeStatus === 'connected' ? 'connected' : 'reconnecting'}</p>
      {message && <p className="management-message" aria-live="polite">{message}</p>}
      <Kpis items={[["Today's appointments", appointments.length, 'teal'], ['Waiting patients', waiting, 'coral'], ['In consultation', inConsultation, ''], ['Completed', completed, 'teal']]} />
      <div className="dashboard-grid staff-grid">
        <div className="dashboard-card">
          <h3>Today's appointments</h3>
          <StateMessage loading={state === 'loading'} error={state === 'error' ? message : ''} empty={!appointments.length} emptyText="No appointments today." />
          {state === 'ready' && <AppointmentList appointments={appointments} />}
        </div>
        <div className="dashboard-card">
          <h3>Doctor status <span>{doctors.filter((doctor) => doctor.isAvailable).length} available</span></h3>
          {doctors.map((doctor) => <div className="dashboard-list-row" key={doctor.id}><span>{doctor.name}</span><span className={`status-badge ${statusClass(doctor.availability)}`}>{formatStatus(doctor.availability)}</span></div>)}
        </div>
        <div className="dashboard-card">
          <h3>Queue management</h3>
          <p className="muted-copy">Select a doctor to call the next waiting token or register a walk-in below.</p>
          <div className="staff-queue-form"><select value={doctorId} onChange={(event) => setDoctorId(event.target.value)}><option value="">Select doctor</option>{doctors.filter((doctor) => doctor.isAvailable).map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select><button type="button" className="queue-action primary" onClick={callDoctorQueue}>Call next</button></div>
        </div>
        <div className="dashboard-card">
          <h3>Walk-in patient</h3>
          <form className="staff-form" onSubmit={walkIn}><select required value={doctorId} onChange={(event) => setDoctorId(event.target.value)}><option value="">Select available doctor</option>{doctors.filter((doctor) => doctor.isAvailable).map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select><select required disabled={!patients.length} value={walkInPatientId} onChange={(event) => setWalkInPatientId(event.target.value)}><option value="">Select patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select><button type="submit">Add to queue</button></form>
          <h3 className="form-heading">Register patient</h3>
          <form className="staff-form" onSubmit={registerPatient}><input required value={patientForm.name} onChange={(event) => setPatientForm({ ...patientForm, name: event.target.value })} placeholder="Full name" /><input required type="email" value={patientForm.email} onChange={(event) => setPatientForm({ ...patientForm, email: event.target.value })} placeholder="Email address" /><input required minLength="8" type="password" value={patientForm.password} onChange={(event) => setPatientForm({ ...patientForm, password: event.target.value })} placeholder="Temporary password" /><button type="submit">Register patient</button></form>
        </div>
        <div className="dashboard-card">
          <h3>Patients <span>{patients.length}</span></h3>
          <StateMessage loading={state === 'loading'} error={state === 'error' ? message : ''} empty={!patients.length} emptyText="No patients registered yet." />
          {patients.slice(0, 8).map((patient) => <div className="dashboard-list-row" key={patient.id}><div><strong>{patient.name}</strong><time>{patient.email}</time></div></div>)}
        </div>
      </div>
    </section>
  )
}

export function RoleWorkbench({ user }) {
  if (!user) return <section className="dashboard-section signed-out-workspace"><p className="kicker">Your workspace</p><h2>Sign in to see your care timeline.</h2><p className="muted-copy">Patients, doctors, and clinic teams each see the tools that match their role.</p></section>
  if (user.role === 'PATIENT') return <PatientDashboard user={user} />
  if (user.role === 'DOCTOR') return <DoctorDashboard user={user} />
  return <StaffDashboard user={user} />
}