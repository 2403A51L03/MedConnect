import { useApiHealth } from '../hooks/useApiHealth.js'

const pillars = [
  ['01', 'Clear access', 'Role-aware workspaces for patients, doctors, and reception teams.'],
  ['02', 'One queue', 'Appointments and live tokens share one reliable source of truth.'],
  ['03', 'Human pace', 'Simple tools for the moments a clinic team repeats all day.'],
]

export function HomePage() {
  const apiHealth = useApiHealth()

  return (
    <div className="home-page">
      <section className="intro-panel">
        <div className="hero-badge"><span className="hero-pulse" /> Live clinic coordination</div>
        <p className="kicker">Clinic queue management and tele-consultation</p>
        <h2>Know where care is going next.</h2>
        <p className="intro-copy">
          MedConnect connects the appointment, the token, the live queue, and the consultation so every person knows what happens next.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href="#appointments">Book an appointment <span aria-hidden="true">-&gt;</span></a>
          <a className="button button-secondary" href="#workspace">Open workspace</a>
        </div>
        <div className="health-row" aria-live="polite">
          <span className={`health-dot ${apiHealth.status}`} />
          <span>
            API {apiHealth.status === 'ready' ? `connected at ${apiHealth.data.service}` : apiHealth.status === 'error' ? 'unavailable' : 'checking'}
          </span>
        </div>
      </section>
      <section className="journey-strip" aria-label="MedConnect care journey">
        {['Book', 'Get a token', 'Track the queue', 'Join care', 'Complete'].map((step, index) => (
          <div className="journey-step" key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong>{index < 4 && <b aria-hidden="true">→</b>}</div>
        ))}
      </section>
      <section className="pillars" aria-label="Foundation areas">
        {pillars.map(([number, title, description]) => (
          <article className="pillar" key={number}>
            <span className="pillar-number">{number}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </section>
      <section className="problem-section">
        <div><p className="kicker">Why MedConnect</p><h3>The appointment time is only the beginning.</h3></div>
        <p>Traditional booking tells a patient when to arrive, but not what is happening inside the clinic. MedConnect gives patients a live, understandable view while giving doctors and reception teams the same source of truth.</p>
      </section>
    </div>
  )
}
