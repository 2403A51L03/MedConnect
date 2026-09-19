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
        <p className="kicker">Clinic queue management and tele-consultation</p>
        <h2>A calmer way to move through a clinic day.</h2>
        <p className="intro-copy">
          MedConnect brings booking, queue movement, notifications, and remote consultations into one focused workspace.
        </p>
        <div className="health-row" aria-live="polite">
          <span className={`health-dot ${apiHealth.status}`} />
          <span>
            API {apiHealth.status === 'ready' ? `connected at ${apiHealth.data.service}` : apiHealth.status === 'error' ? 'unavailable' : 'checking'}
          </span>
        </div>
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
    </div>
  )
}
