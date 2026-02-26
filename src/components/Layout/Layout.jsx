import { useState } from 'react'
import { Home, Users, Briefcase, DollarSign, CheckSquare, Settings, Calculator, Menu, X, Compass } from 'lucide-react'
import NotificationsPanel from '../Notifications/NotificationsPanel'
import './Layout.css'

export default function Layout({ children, currentPage, onNavigate, usuario, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'proyectos', label: 'Proyectos', icon: Briefcase },
    { id: 'pagos', label: 'Pagos', icon: DollarSign },
    { id: 'tareas', label: 'Tareas', icon: CheckSquare },
    { id: 'contabilidad', label: 'Contabilidad', icon: Calculator },
    { id: 'servicios', label: 'Servicios', icon: Settings },
  ]

  return (
    <div className="layout">
      {/* Header */}
      <header className="header glass-strong">
        <div className="header-content">
          <div className="logo">
            <Compass size={32} className="logo-icon" />
            <div>
              <h1>Brújula Marketing</h1>
              <p className="subtitle">Gestión Inteligente</p>
            </div>
          </div>

          <div className="header-right">
            <NotificationsPanel onNavigate={onNavigate} />

            <div className="usuario-badge">
              <div className={`user-avatar-sm ${usuario === 'Andrés' ? 'andres' : 'denisse'}`}>
                {usuario?.charAt(0)}
              </div>
              <span className="usuario-nombre">{usuario}</span>
              <button className="btn-logout" onClick={onLogout} title="Cerrar sesión">
                ↩
              </button>
            </div>

            <button 
              className="menu-toggle"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
            {menuItems.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                  onClick={() => {
                    onNavigate(item.id)
                    setMenuOpen(false)
                  }}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Andrés & Denisse © 2024 - Brújula Marketing</p>
      </footer>
    </div>
  )
}