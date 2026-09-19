import { useState } from 'react'
import { getStoredUser } from '../services/auth.js'
import { createDoctor, updateDoctor } from '../services/doctors.js'

export function DoctorManagementPanel({ selectedDoctor, onSaved }) {
  const user = getStoredUser()
  const [form, setForm] = useState({ name: '', email: '', password: '', specialization: '' })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  if (!user || !['ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(user.role)) return null

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await createDoctor(form)
      setForm({ name: '', email: '', password: '', specialization: '' })
      setMessage('Doctor profile created.')
      onSaved()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleAvailability() {
    if (!selectedDoctor || user.role !== 'DOCTOR' || selectedDoctor.userId !== user.id) return
    try {
      await updateDoctor(selectedDoctor.id, { availability: selectedDoctor.availability === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE' })
      setMessage('Availability updated.')
      onSaved()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <section className="doctor-management" aria-labelledby="doctor-management-title">
      <div>
        <p className="kicker">Staff tools</p>
        <h3 id="doctor-management-title">Doctor management</h3>
      </div>
      {['ADMIN', 'RECEPTIONIST'].includes(user.role) && (
        <form className="doctor-create-form" onSubmit={submit}>
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Doctor name" />
          <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Work email" />
          <input required minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Temporary password" />
          <input value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} placeholder="Specialty" />
          <button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create doctor'}</button>
        </form>
      )}
      {user.role === 'DOCTOR' && selectedDoctor?.userId === user.id && (
        <button type="button" className="select-doctor" onClick={toggleAvailability}>
          Set {selectedDoctor.availability === 'AVAILABLE' ? 'unavailable' : 'available'}
        </button>
      )}
      {message && <p className="management-message" aria-live="polite">{message}</p>}
    </section>
  )
}