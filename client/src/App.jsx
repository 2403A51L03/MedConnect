import { useState } from 'react'
import { AuthPanel } from './components/AuthPanel.jsx'
import { AppLayout } from './layouts/AppLayout.jsx'
import { RoleWorkbench } from './components/RoleWorkbench.jsx'
import { getStoredUser } from './services/auth.js'
import { HomePage } from './pages/HomePage.jsx'
import { DoctorsPage } from './pages/DoctorsPage.jsx'
import { AppointmentsPage } from './pages/AppointmentsPage.jsx'
import './App.css'

function App() {
  const [user, setUser] = useState(() => getStoredUser())

  return (
    <AppLayout>
      <AuthPanel user={user} onChange={setUser} />
      <div id="overview"><HomePage /></div>
      <div id="workspace"><RoleWorkbench user={user} /></div>
      <div id="doctors"><DoctorsPage /></div>
      <div id="appointments"><AppointmentsPage key={user?.id || 'guest'} /></div>
    </AppLayout>
  )
}

export default App
