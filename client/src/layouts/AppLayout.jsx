export function AppLayout({ children }) {
  const today = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand-lockup" href="#top" aria-label="MedConnect home">
          <div className="brand-mark"><span>+</span></div>
          <div>
            <p className="eyebrow">Connected care platform</p>
            <h1>MedConnect</h1>
          </div>
        </a>
        <nav className="main-nav" aria-label="Primary navigation">
          <a href="#overview">Overview</a>
          <a href="#doctors">Doctors</a>
          <a href="#appointments">Appointments</a>
          <a href="#workspace">Workspace</a>
        </nav>
        <div className="topbar-meta"><span className="status-chip"><i /> Clinic workspace</span><span className="topbar-date">{today}</span></div>
      </header>
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <main id="top">{children}</main>
      <footer className="site-footer"><span>MedConnect</span><span>Appointments, queues, and consultations in one calm workspace.</span><a href="#top">Back to top</a></footer>
    </div>
  )
}
