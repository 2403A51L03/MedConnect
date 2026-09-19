import { useState } from 'react'
import { login, logout, registerPatient } from '../services/auth.js'

export function AuthPanel({ user, onChange }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    try {
      const authenticatedUser = mode === 'login' ? await login({ email: form.email, password: form.password }) : await registerPatient(form)
      onChange(authenticatedUser)
      setMessage(`Signed in as ${authenticatedUser.role.toLowerCase()}.`)
    } catch (error) {
      setMessage(error.message)
    }
  }

  function signOut() {
    logout()
    onChange(null)
    setMessage('Signed out.')
  }

  if (user) {
    return (
      <section className="auth-panel signed-in">
        <div className="session-copy"><p className="kicker">Active session</p><strong>{user.name}</strong><span>{user.role}</span></div>
        <button className="button button-secondary" type="button" onClick={signOut}>Log out</button>
      </section>
    )
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-title">
      <div className="auth-heading"><div className="auth-icon">+</div><div><p className="kicker">Secure clinic access</p><h2 id="auth-title">Care coordination, made clear.</h2><p className="auth-subtitle">Sign in to manage your appointments, queue position, and consultations.</p></div></div>
      <div className="auth-tabs">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMessage('') }}>Sign in</button>
        <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMessage('') }}>Create account</button>
      </div>
      <form onSubmit={submit}>
        {mode === 'register' && <label><span>Full name</span><input autoComplete="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Aisha Rahman" /></label>}
        <label><span>Email address</span><input autoComplete="email" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label>
        <label><span>Password</span><div className="password-field"><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength="8" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" /><button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
        <button className="button button-primary" type="submit">{mode === 'login' ? 'Continue to workspace' : 'Create patient account'} <span aria-hidden="true">-&gt;</span></button>
      </form>
      {message && <p className="auth-message" aria-live="polite">{message}</p>}
    </section>
  )
}
