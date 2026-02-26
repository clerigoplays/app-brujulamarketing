import { useState } from 'react'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Proyectos from './pages/Proyectos'
import Pagos from './pages/Pagos'
import Tareas from './pages/Tareas'
import Servicios from './pages/Servicios'
import Contabilidad from './pages/Contabilidad'
import './index.css'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'clientes':
        return <Clientes />
      case 'proyectos':
        return <Proyectos />
      case 'pagos':
        return <Pagos />
      case 'tareas':
        return <Tareas />
      case 'contabilidad':
        return <Contabilidad />
      case 'servicios':
        return <Servicios />
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

export default App