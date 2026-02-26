import { useState, useEffect } from 'react'
import Layout from './components/Layout/Layout'
import Login from './components/Login/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Proyectos from './pages/Proyectos'
import Pagos from './pages/Pagos'
import Tareas from './pages/Tareas'
import Servicios from './pages/Servicios'
import Contabilidad from './pages/Contabilidad'
import './index.css'

const SESSION_KEY = 'brujula_user'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [usuario, setUsuario] = useState(null)

  // Restaurar sesión si existe
  useEffect(() => {
    const sesionGuardada = sessionStorage.getItem(SESSION_KEY)
    if (sesionGuardada) {
      setUsuario(sesionGuardada)
    }
  }, [])

  function handleLogin(user) {
    setUsuario(user)
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY)
    setUsuario(null)
    setCurrentPage('dashboard')
  }

  function renderPage() {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />
      case 'clientes': return <Clientes />
      case 'proyectos': return <Proyectos />
      case 'pagos': return <Pagos />
      case 'tareas': return <Tareas />
      case 'contabilidad': return <Contabilidad />
      case 'servicios': return <Servicios />
      default: return <Dashboard />
    }
  }

  if (!usuario) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage} usuario={usuario} onLogout={handleLogout}>
      {renderPage()}
    </Layout>
  )
}

export default App