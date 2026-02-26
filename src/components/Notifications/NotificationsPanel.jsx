import { useState, useRef, useEffect } from 'react'
import { 
  Bell, 
  X, 
  DollarSign, 
  CheckSquare, 
  AlertCircle,
  Clock,
  User,
  ChevronRight,
  Filter,
  RefreshCw,
  BellOff
} from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { formatCLP, formatDate } from '../../utils/formatters'
import './NotificationsPanel.css'

export default function NotificationsPanel({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(false)
  const [filtroPersona, setFiltroPersona] = useState('todos')
  const panelRef = useRef(null)
  
  const { 
    notificaciones, 
    noLeidas, 
    loading, 
    recargar,
    getNotificacionesPorPersona 
  } = useNotifications()

  const notificacionesFiltradas = getNotificacionesPorPersona(filtroPersona)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  function handleNotificationClick(notif) {
    setIsOpen(false)
    if (onNavigate && notif.link) {
      onNavigate(notif.link)
    }
  }

  function getIcon(tipo) {
    switch (tipo) {
      case 'pago-vencido':
      case 'pago-proximo':
        return <DollarSign size={18} />
      case 'tarea-vencida':
      case 'tarea-proxima':
      case 'tarea-alta':
        return <CheckSquare size={18} />
      default:
        return <AlertCircle size={18} />
    }
  }

  function getPrioridadClass(prioridad) {
    switch (prioridad) {
      case 'alta': return 'notif-alta'
      case 'media': return 'notif-media'
      case 'baja': return 'notif-baja'
      default: return ''
    }
  }

  function getTipoClass(tipo) {
    if (tipo.includes('pago')) return 'notif-tipo-pago'
    if (tipo.includes('tarea')) return 'notif-tipo-tarea'
    return ''
  }

  return (
    <div className="notifications-container" ref={panelRef}>
      {/* Botón de campana */}
      <button 
        className={`notifications-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Notificaciones"
      >
        <Bell size={22} />
        {noLeidas > 0 && (
          <span className="notifications-badge">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div className="notifications-panel glass-strong">
          {/* Header */}
          <div className="notifications-header">
            <h3>
              <Bell size={18} />
              Notificaciones
            </h3>
            <div className="notifications-actions">
              <button 
                className="btn-icon-sm" 
                onClick={recargar}
                title="Actualizar"
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'spinning' : ''} />
              </button>
              <button 
                className="btn-icon-sm" 
                onClick={() => setIsOpen(false)}
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filtro por persona */}
          <div className="notifications-filter">
            <Filter size={14} />
            <select 
              value={filtroPersona} 
              onChange={(e) => setFiltroPersona(e.target.value)}
              className="filter-select"
            >
              <option value="todos">Todas las notificaciones</option>
              <option value="Andrés">Solo de Andrés</option>
              <option value="Denisse">Solo de Denisse</option>
            </select>
          </div>

          {/* Lista de notificaciones */}
          <div className="notifications-list">
            {loading ? (
              <div className="notifications-loading">
                <div className="loading-spinner-sm"></div>
                <span>Cargando...</span>
              </div>
            ) : notificacionesFiltradas.length === 0 ? (
              <div className="notifications-empty">
                <BellOff size={32} />
                <p>¡Todo en orden!</p>
                <span>No hay notificaciones pendientes</span>
              </div>
            ) : (
              <>
                {/* Resumen */}
                <div className="notifications-summary">
                  <span className="summary-item summary-alta">
                    <AlertCircle size={14} />
                    {notificacionesFiltradas.filter(n => n.prioridad === 'alta').length} urgentes
                  </span>
                  <span className="summary-item summary-total">
                    {notificacionesFiltradas.length} total
                  </span>
                </div>

                {/* Notificaciones */}
                {notificacionesFiltradas.map(notif => (
                  <div 
                    key={notif.id}
                    className={`notification-item ${getPrioridadClass(notif.prioridad)} ${getTipoClass(notif.tipo)}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="notification-icon">
                      {getIcon(notif.tipo)}
                    </div>
                    
                    <div className="notification-content">
                      <div className="notification-header">
                        <span className="notification-title">{notif.titulo}</span>
                        <span className={`notification-priority priority-${notif.prioridad}`}>
                          {notif.prioridad}
                        </span>
                      </div>
                      
                      <p className="notification-message">{notif.mensaje}</p>
                      
                      <div className="notification-meta">
                        {notif.monto && (
                          <span className="meta-item meta-monto">
                            <DollarSign size={12} />
                            {formatCLP(notif.monto)}
                          </span>
                        )}
                        {notif.asignado && (
                          <span className="meta-item meta-asignado">
                            <User size={12} />
                            {notif.asignado}
                          </span>
                        )}
                        {notif.fecha && (
                          <span className="meta-item meta-fecha">
                            <Clock size={12} />
                            {formatDate(notif.fecha)}
                          </span>
                        )}
                      </div>

                      <span className="notification-detalle">{notif.detalle}</span>
                    </div>

                    <ChevronRight size={16} className="notification-arrow" />
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          {notificacionesFiltradas.length > 0 && (
            <div className="notifications-footer">
              <button 
                className="btn-link"
                onClick={() => {
                  setIsOpen(false)
                  onNavigate('tareas')
                }}
              >
                Ver todas las tareas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}