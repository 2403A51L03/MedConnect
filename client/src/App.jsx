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
      <HomePage />
      <DoctorsPage />
      <AppointmentsPage key={user?.id || 'guest'} />
      <RoleWorkbench user={user} />
    </AppLayout>
  )
}

export default App
