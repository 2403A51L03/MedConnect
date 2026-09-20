import { useEffect, useState } from 'react'
import { DoctorCard } from '../components/DoctorCard.jsx'
import { DoctorManagementPanel } from '../components/DoctorManagementPanel.jsx'
import { getStoredUser } from '../services/auth.js'
import { getDoctorSchedule, getDoctors } from '../services/doctors.js'

export function DoctorsPage() {
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [doctors, setDoctors] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [status, setStatus] = useState('loading')
  const [refreshKey, setRefreshKey] = useState(0)
  const viewerRole = getStoredUser()?.role

  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      setStatus('loading')
      getDoctors({ search, specialty, available: !viewerRole || viewerRole === 'PATIENT' })
        .then((items) => { if (active) { setDoctors(items); setStatus('ready') } })
        .catch(() => active && setStatus('error'))
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [search, specialty, refreshKey, viewerRole])

  async function selectDoctor(doctor) {
    setSelectedDoctor(doctor)
    try {
      setSchedule(await getDoctorSchedule(doctor.id))
    } catch {
      setSchedule([])
    }
  }

  return (
    <section className="doctor-directory" aria-labelledby="doctor-directory-title">
      <div className="directory-heading">
        <div>
          <p className="kicker">Choose your clinician</p>
          <h2 id="doctor-directory-title">Available doctors</h2>
        </div>
        <p className="directory-count">{status === 'ready' ? `${doctors.length} available` : 'Searching...'}</p>
      </div>
      <div className="doctor-filters">
        <label>
          Search by name
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. Maya Rao" />
        </label>
        <label>
          Specialty
          <input value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="e.g. cardiology" />
        </label>
      </div>
      {status === 'error' && <p className="inline-error">The doctor directory is unavailable right now.</p>}
      {status === 'ready' && doctors.length === 0 && <p className="empty-state">No available doctors match those filters.</p>}
      <div className="doctor-grid">
        {doctors.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} selected={selectedDoctor?.id === doctor.id} onSelect={selectDoctor} />)}
      </div>
      {selectedDoctor && (
        <aside className="schedule-panel" aria-live="polite">
          <p className="kicker">Selected doctor</p>
          <h3>{selectedDoctor.name}'s schedule</h3>
          {schedule.length === 0 ? <p>No scheduled appointments are available to display.</p> : schedule.map((appointment) => (
            <div className="schedule-row" key={appointment.id}>
              <time dateTime={appointment.scheduledAt}>{new Date(appointment.scheduledAt).toLocaleString()}</time>
              <span>{appointment.status.replace('_', ' ')}</span>
            </div>
          ))}
        </aside>
      )}
      <DoctorManagementPanel selectedDoctor={selectedDoctor} onSaved={() => setRefreshKey((value) => value + 1)} />
    </section>
  )
}