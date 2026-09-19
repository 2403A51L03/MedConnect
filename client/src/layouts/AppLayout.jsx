export function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark"><span>+</span></div>
        <div>
          <p className="eyebrow">Connected care platform</p>
          <h1>MedConnect</h1>
        </div>
        <div className="topbar-meta"><span className="status-chip"><i /> Services online</span><span className="topbar-date">September 19, 2026</span></div>
      </header>
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <main>{children}</main>
      <footer className="site-footer"><span>MedConnect</span><span>Care that moves with you.</span></footer>
    </div>
  )
}
