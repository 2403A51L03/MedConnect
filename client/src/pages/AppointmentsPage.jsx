import { useEffect, useMemo, useState } from 'react'
import { getStoredUser } from '../services/auth.js'
import { cancelAppointment, createAppointment, getAppointments } from '../services/appointments.js'
import { getDoctorSchedule, getDoctors } from '../services/doctors.js'
import { getQueueStatus } from '../services/queue.js'

function localDateTimeMinimum() {
  const date = new Date(Date.now() + 15 * 60 * 1000)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
}

function formatStatus(status) {
  return status.toLowerCase().replaceAll('_', ' ')
}

export function AppointmentsPage() {
  const user = useMemo(() => getStoredUser(), [])
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [doctorId, setDoctorId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [schedule, setSchedule] = useState([])
  const [message, setMessage] = useState('')
  const [queueStatuses, setQueueStatuses] = useState({})
  const [loading, setLoading] = useState(true)
  const minDateTime = useMemo(localDateTimeMinimum, [])

  async function refreshAppointments() {
    if (!user) return
    setAppointments(await getAppointments())
  }

  useEffect(() => {
    let active = true
    Promise.all([getDoctors(), user ? getAppointments() : Promise.resolve([])])
      .then(([doctorItems, appointmentItems]) => {
        if (!active) return
        setDoctors(doctorItems)
        setAppointments(appointmentItems)
        setLoading(false)
      })
      .catch(() => {
        if (active) {
          setMessage('Sign in to load booking and appointment data.')
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [user])

  async function selectDoctor(value) {
    setDoctorId(value)
    setSchedule(value ? await getDoctorSchedule(value).catch(() => []) : [])
  }

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    try {
      const result = await createAppointment({ doctorId, scheduledAt: new Date(scheduledAt).toISOString() })
      setMessage(result.confirmation.queueToken ? `Appointment confirmed. Queue token: ${result.confirmation.queueToken}` : 'Appointment confirmed.')
      setScheduledAt('')
      await refreshAppointments()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function cancel(id) {
    try {
      await cancelAppointment(id)
      setMessage('Appointment cancelled.')
      await refreshAppointments()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function loadQueueStatus(appointmentId) {
    try {
      const status = await getQueueStatus(appointmentId)
      setQueueStatuses((current) => ({ ...current, [appointmentId]: status }))
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <section className="appointments-page" aria-labelledby="appointments-title">
      <div className="directory-heading">
        <div>
          <p className="kicker">Patient journey</p>
          <h2 id="appointments-title">Appointments</h2>
        </div>
        <p className="directory-count">{user ? 'Your clinic timeline' : 'Sign in to book'}</p>
      </div>
      {user?.role === 'PATIENT' && (
        <div className="booking-layout">
          <form className="booking-form" onSubmit={submit}>
            <label>Doctor
              <select required value={doctorId} onChange={(event) => selectDoctor(event.target.value)}>
                <option value="">Select an available doctor</option>
                {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialization || 'General medicine'}</option>)}
              </select>
            </label>
            <label>Date and time
              <input required type="datetime-local" min={minDateTime} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
            </label>
            <button type="submit">Book appointment</button>
            {schedule.length > 0 && <p className="schedule-hint">Existing appointments for this doctor: {schedule.map((item) => new Date(item.scheduledAt).toLocaleString()).join(', ')}</p>}
          </form>
          <div className="booking-note"><strong>Booking note</strong><p>Same-day bookings receive a queue token. Future bookings receive confirmation first and enter the queue when the clinic day begins.</p></div>
        </div>
      )}
      {message && <p className="management-message" aria-live="polite">{message}</p>}
      <div className="appointment-list">
        {loading && <p className="empty-state">Loading appointments...</p>}
        {!loading && appointments.length === 0 && <p className="empty-state">No appointments yet.</p>}
        {appointments.map((appointment) => (
          <article className="appointment-row" key={appointment.id}>
            <div>
              <strong>{appointment.doctor?.user?.name || 'Doctor'}</strong>
              <time dateTime={appointment.scheduledAt}>{new Date(appointment.scheduledAt).toLocaleString()}</time>
            </div>
            <div className="appointment-meta">
              {appointment.queueEntry && <span>Token {appointment.queueEntry.tokenNumber}</span>}
              {appointment.queueEntry && <button type="button" onClick={() => loadQueueStatus(appointment.id)}>Check queue</button>}
              <span className={`appointment-status ${appointment.status.toLowerCase()}`}>{formatStatus(appointment.status)}</span>
              {user?.role === 'PATIENT' && ['BOOKED', 'CHECKED_IN'].includes(appointment.status) && <button type="button" onClick={() => cancel(appointment.id)}>Cancel</button>}
            </div>
            {queueStatuses[appointment.id] && <p className="queue-summary">Position: {queueStatuses[appointment.id].position || 'current/completed'} · Current patient: {queueStatuses[appointment.id].currentPatient?.name || 'none'} · Next: {queueStatuses[appointment.id].nextPatient?.name || 'none'}</p>}
          </article>
        ))}
      </div>
    </section>
  )
}