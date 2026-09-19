import { useEffect, useState } from 'react'
import { requestApi } from '../services/api.js'
import { useRealtime } from '../hooks/useRealtime.js'
import { TeleConsultationPanel } from './TeleConsultationPanel.jsx'

function DashboardHeader({ role, title, onRefresh, loading }) {
  return <div className="directory-heading"><div><p className="kicker">{role} dashboard</p><h2>{title}</h2></div><button type="button" className="refresh-button" onClick={onRefresh} disabled={loading}>{loading ? 'Loading...' : 'Refresh data'}</button></div>
}

function StateMessage({ loading, error, empty }) {
  if (loading) return <p className="dashboard-state">Loading dashboard data...</p>
  if (error) return <p className="dashboard-error">{error}</p>
  if (empty) return <p className="dashboard-state">Nothing to show yet.</p>
  return null
}

function AppointmentList({ appointments, patientView = false }) {
  return <div className="dashboard-list">{appointments.map((appointment) => <div className="dashboard-list-row" key={appointment.id}><div><strong>{patientView ? appointment.doctor?.user?.name : appointment.patient?.name || appointment.doctor?.user?.name || 'Patient'}</strong><time>{new Date(appointment.scheduledAt).toLocaleString()}</time></div><b>{appointment.status}</b>{appointment.queueEntry && <span>Token {appointment.queueEntry.tokenNumber}</span>}</div>)}</div>
}

function PatientDashboard({ user }) {
  const [data, setData] = useState({ appointments: [], notifications: [], consultations: [] })
  const [queue, setQueue] = useState(null)
  const [consultationEntryId, setConsultationEntryId] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const realtimeStatus = useRealtime(refresh)

  async function refresh() {
    setState('loading'); setError('')
    try {
      const [appointmentResult, notificationResult, consultationResult] = await Promise.all([
        requestApi('/appointments'),
        requestApi(`/users/${user.id}/notifications`),
        requestApi(`/users/${user.id}/consultations`),
      ])
      const currentAppointment = appointmentResult.appointments.find((item) => item.queueEntry && !['COMPLETED', 'CANCELLED'].includes(item.status))
      const nextQueue = currentAppointment ? await requestApi(`/appointments/${currentAppointment.id}/queue`) : null
      setData({ appointments: appointmentResult.appointments, notifications: notificationResult.notifications, consultations: consultationResult.consultations })
      setQueue(nextQueue)
      setConsultationEntryId(currentAppointment?.queueEntry?.id || nextQueue?.queueEntry?.id || null)
      setState('ready')
    } catch (requestError) { setError(requestError.message); setState('error') }
  }

  useEffect(() => { refresh() }, [user.id])
  return <section className="dashboard-section"><DashboardHeader role="Patient" title="Your care timeline" onRefresh={refresh} loading={state === 'loading'} /><p className={`realtime-status ${realtimeStatus}`}>Live updates: {realtimeStatus}</p><div className="dashboard-grid patient-grid"><div className="dashboard-card"><h3>Upcoming appointments</h3><StateMessage loading={state === 'loading'} error={error} empty={!data.appointments.length} />{state === 'ready' && <AppointmentList appointments={data.appointments} patientView />}</div><div className="dashboard-card queue-card"><h3>Current queue</h3>{queue ? <><div className="queue-number">{queue.position || 'Now'}</div><p>Position in line</p><span>Current: {queue.currentPatient?.name || 'No patient'}</span><span>Next: {queue.nextPatient?.name || 'No patient'}</span></> : <StateMessage loading={state === 'loading'} error={error} empty />}</div><div className="dashboard-card"><h3>Notifications</h3><StateMessage loading={state === 'loading'} error={error} empty={!data.notifications.length} />{data.notifications.map((item) => <div className="dashboard-note" key={item.id}><strong>{item.title}</strong><p>{item.message}</p></div>)}</div><div className="dashboard-card"><h3>Consultation history</h3><StateMessage loading={state === 'loading'} error={error} empty={!data.consultations.length} />{data.consultations.map((item) => <div className="dashboard-list-row" key={item.id}><span>{item.status}</span><time>{new Date(item.createdAt).toLocaleDateString()}</time></div>)}</div>{consultationEntryId && <TeleConsultationPanel user={user} queueEntryId={consultationEntryId} roleLabel="Patient" />}</div></section>
}

function DoctorDashboard({ user }) {
  const [appointments, setAppointments] = useState([]); const [queue, setQueue] = useState([]); const [state, setState] = useState('loading'); const [error, setError] = useState(''); const [message, setMessage] = useState('')
  const realtimeStatus = useRealtime(refresh)
  async function refresh() { setState('loading'); setError(''); try { const [appointmentResult, queueResult] = await Promise.all([requestApi('/appointments'), requestApi(`/doctors/${user.id}/queue`)]); setAppointments(appointmentResult.appointments); setQueue(queueResult.queue); setState('ready') } catch (requestError) { setError(requestError.message); setState('error') } }
  useEffect(() => { refresh() }, [user.id])
  async function queueAction(id, action) { try { await requestApi(`/queue/${id}/${action}`, { method: 'POST', body: JSON.stringify(action === 'complete' ? { notes: 'Review-2 consultation' } : {}) }); setMessage(`Consultation ${action}d.`); await refresh() } catch (requestError) { setMessage(requestError.message) } }
  async function callNext() { try { await requestApi('/queue/call-next', { method: 'POST', body: '{}' }); setMessage('Next patient called.'); await refresh() } catch (requestError) { setMessage(requestError.message) } }
  const current = queue.find((item) => ['CALLED', 'IN_PROGRESS'].includes(item.status))
  return <section className="dashboard-section"><DashboardHeader role="Doctor" title="Today at the clinic" onRefresh={refresh} loading={state === 'loading'} /><p className={`realtime-status ${realtimeStatus}`}>Live updates: {realtimeStatus}</p>{message && <p className="management-message">{message}</p>}<div className="dashboard-grid doctor-grid"><div className="dashboard-card"><h3>Today's appointments</h3><StateMessage loading={state === 'loading'} error={error} empty={!appointments.length} />{state === 'ready' && <AppointmentList appointments={appointments} />}</div><div className="dashboard-card"><h3>Current patient</h3>{current ? <><div className="current-patient">{current.appointment?.patient?.name || 'Patient'}</div><p>Token {current.tokenNumber} · {current.status}</p></> : <StateMessage loading={state === 'loading'} error={error} empty />}</div><div className="dashboard-card queue-card"><h3>Queue</h3>{state === 'ready' && <><button type="button" className="queue-action" onClick={callNext}>Call next patient</button>{queue.length === 0 ? <StateMessage empty /> : queue.map((entry) => <div className="dashboard-list-row" key={entry.id}><span>Token {entry.tokenNumber}</span><b>{entry.status}</b>{entry.status === 'CALLED' && <button type="button" onClick={() => queueAction(entry.id, 'start')}>Start</button>}{entry.status === 'IN_PROGRESS' && <button type="button" onClick={() => queueAction(entry.id, 'complete')}>Complete</button>}</div>)}</>}</div>{current && <TeleConsultationPanel user={user} queueEntryId={current.id} roleLabel="Doctor" />}</div></section>
}

function StaffDashboard({ user }) {
  const [appointments, setAppointments] = useState([]); const [patients, setPatients] = useState([]); const [doctors, setDoctors] = useState([]); const [doctorId, setDoctorId] = useState(''); const [walkInPatientId, setWalkInPatientId] = useState(''); const [patientForm, setPatientForm] = useState({ name: '', email: '', password: '' }); const [message, setMessage] = useState(''); const [state, setState] = useState('loading')
  const realtimeStatus = useRealtime(refresh)
  async function refresh() { setState('loading'); try { const [appointmentResult, patientResult, doctorResult] = await Promise.all([requestApi('/appointments'), requestApi('/patients'), requestApi('/doctors')]); setAppointments(appointmentResult.appointments); setPatients(patientResult.patients); setDoctors(doctorResult.doctors); setState('ready') } catch (error) { setMessage(error.message); setState('error') } }
  useEffect(() => { refresh() }, [user.id])
  async function registerPatient(event) { event.preventDefault(); if (patientForm.password.length < 8) { setMessage('Patient password must be at least 8 characters.'); return } try { await requestApi('/patients', { method: 'POST', body: JSON.stringify(patientForm) }); setPatientForm({ name: '', email: '', password: '' }); setMessage('Patient registered.'); await refresh() } catch (error) { setMessage(error.message) } }
  async function walkIn(event) { event.preventDefault(); if (!doctorId || !walkInPatientId) { setMessage('Select both a doctor and patient for the walk-in.'); return } try { const result = await requestApi('/appointments/walk-in', { method: 'POST', body: JSON.stringify({ doctorId, patientId: walkInPatientId }) }); setMessage(`Walk-in created with token ${result.confirmation.queueToken}.`); await refresh() } catch (error) { setMessage(error.message) } }
  return <section className="dashboard-section"><DashboardHeader role={user.role} title="Clinic operations" onRefresh={refresh} loading={state === 'loading'} />{message && <p className="management-message">{message}</p>}<div className="dashboard-grid staff-grid"><div className="dashboard-card"><h3>Today's appointments</h3><StateMessage loading={state === 'loading'} error={state === 'error' ? message : ''} empty={!appointments.length} />{state === 'ready' && <AppointmentList appointments={appointments} />}</div><div className="dashboard-card"><h3>Patients <span>{patients.length}</span></h3><StateMessage loading={state === 'loading'} error={state === 'error' ? message : ''} empty={!patients.length} />{patients.slice(0, 8).map((patient) => <div className="dashboard-list-row" key={patient.id}><span>{patient.name}</span><time>{patient.email}</time></div>)}</div><div className="dashboard-card"><h3>Doctors and availability</h3>{doctors.length === 0 && <StateMessage loading={state === 'loading'} empty />}{doctors.map((doctor) => <div className="dashboard-list-row" key={doctor.id}><span>{doctor.name}</span><b className={doctor.isAvailable ? 'available-text' : 'offline-text'}>{doctor.isAvailable ? 'Available' : 'Unavailable'}</b></div>)}</div><div className="dashboard-card"><h3>Walk-in patient</h3><form className="staff-form" onSubmit={walkIn}><select required value={doctorId} onChange={(event) => setDoctorId(event.target.value)}><option value="">Select doctor</option>{doctors.filter((doctor) => doctor.isAvailable).map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select><select required disabled={!patients.length} value={walkInPatientId} onChange={(event) => setWalkInPatientId(event.target.value)}><option value="">Select patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select><button type="submit">Create walk-in</button></form><h3 className="form-heading">Register patient</h3><form className="staff-form" onSubmit={registerPatient}><input required value={patientForm.name} onChange={(event) => setPatientForm({ ...patientForm, name: event.target.value })} placeholder="Name" /><input required type="email" value={patientForm.email} onChange={(event) => setPatientForm({ ...patientForm, email: event.target.value })} placeholder="Email" /><input required minLength="8" type="password" value={patientForm.password} onChange={(event) => setPatientForm({ ...patientForm, password: event.target.value })} placeholder="Temporary password" /><button type="submit">Register patient</button></form></div></div></section>
}

export function RoleWorkbench({ user }) {
  if (!user) return null
  if (user.role === 'PATIENT') return <PatientDashboard user={user} />
  if (user.role === 'DOCTOR') return <DoctorDashboard user={user} />
  return <StaffDashboard user={user} />
}
