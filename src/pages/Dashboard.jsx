import { useState, useEffect } from 'react'
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  CheckSquare,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Calendar,
  Target,
  Palette,
  Globe
} from 'lucide-react'
import { supabase } from '../services/supabase'
import { formatCLP, formatDate, formatDaysRemaining, getGreeting, getDaysRemaining } from '../utils/formatters'
import './Dashboard.css'

export default function Dashboard() {
  const [stats, setStats] = useState({
    clientes: 0,
    proyectosActivos: 0,
    ingresosMes: 0,
    tareasPendientes: 0
  })
  const [pagosProximos, setPagosProximos] = useState([])
  const [tareasUrgentes, setTareasUrgentes] = useState([])
  const [proyectosRecientes, setProyectosRecientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      // Cargar estadísticas generales
      const [clientesRes, proyectosRes, pagosRes, tareasRes] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact' }),
        supabase.from('proyectos').select('id, precio', { count: 'exact' }).eq('estado', 'activo'),
        supabase.from('pagos').select('monto').eq('estado', 'pagado'),
        supabase.from('tareas').select('id', { count: 'exact' }).eq('estado', 'pendiente')
      ])

      // Calcular ingresos del mes actual
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)
      
      const { data: pagosMes } = await supabase
        .from('pagos')
        .select('monto')
        .eq('estado', 'pagado')
        .gte('fecha_pago', inicioMes.toISOString())

      const ingresosMes = pagosMes?.reduce((sum, p) => sum + Number(p.monto), 0) || 0

      setStats({
        clientes: clientesRes.count || 0,
        proyectosActivos: proyectosRes.count || 0,
        ingresosMes: ingresosMes,
        tareasPendientes: tareasRes.count || 0
      })

      // Cargar pagos próximos (pendientes o vencidos)
      const { data: pagos } = await supabase
        .from('pagos')
        .select(`
          *,
          proyecto:proyectos(nombre, cliente:clientes(nombre))
        `)
        .in('estado', ['pendiente', 'vencido'])
        .order('fecha_esperada', { ascending: true })
        .limit(5)

      setPagosProximos(pagos || [])

      // Cargar tareas urgentes (próximas a vencer o vencidas)
      const { data: tareas } = await supabase
        .from('tareas')
        .select(`
          *,
          proyecto:proyectos(nombre)
        `)
        .neq('estado', 'completada')
        .order('fecha_vencimiento', { ascending: true })
        .limit(5)

      setTareasUrgentes(tareas || [])

      // Cargar proyectos recientes
      const { data: proyectos } = await supabase
        .from('proyectos')
        .select(`
          *,
          cliente:clientes(nombre),
          servicio:servicios(nombre, categoria)
        `)
        .order('created_at', { ascending: false })
        .limit(4)

      setProyectosRecientes(proyectos || [])

    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  function getCategoriaIcon(categoria) {
    switch (categoria) {
      case 'meta-ads': return <Target size={16} />
      case 'contenido': return <Palette size={16} />
      case 'web': return <Globe size={16} />
      default: return <Briefcase size={16} />
    }
  }

  function getCategoriaColor(categoria) {
    switch (categoria) {
      case 'meta-ads': return 'categoria-ads'
      case 'contenido': return 'categoria-contenido'
      case 'web': return 'categoria-web'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando datos...</p>
      </div>
    )
  }

  return (
    <div className="dashboard fade-in">
      {/* Header del Dashboard */}
      <div className="dashboard-header">
        <div>
          <h1>{getGreeting()}, equipo! 👋</h1>
          <p className="dashboard-subtitle">
            Aquí está el resumen de Brújula Marketing
          </p>
        </div>
        <div className="header-date">
          <Calendar size={20} />
          <span>{new Date().toLocaleDateString('es-CL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'America/Santiago'
          })}</span>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon icon-blue">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.clientes}</span>
            <span className="stat-label">Clientes Totales</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon icon-purple">
            <Briefcase size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.proyectosActivos}</span>
            <span className="stat-label">Proyectos Activos</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon icon-green">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCLP(stats.ingresosMes)}</span>
            <span className="stat-label">Ingresos del Mes</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon icon-orange">
            <CheckSquare size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.tareasPendientes}</span>
            <span className="stat-label">Tareas Pendientes</span>
          </div>
        </div>
      </div>

      {/* Contenido principal en grid */}
      <div className="dashboard-grid">
        {/* Pagos Próximos */}
        <div className="dashboard-card glass">
          <div className="card-header">
            <h2><DollarSign size={20} /> Pagos Próximos</h2>
          </div>
          <div className="card-content">
            {pagosProximos.length === 0 ? (
              <div className="empty-state">
                <CheckSquare size={40} />
                <p>¡Todo al día! No hay pagos pendientes</p>
              </div>
            ) : (
              <div className="list">
                {pagosProximos.map(pago => {
                  const dias = getDaysRemaining(pago.fecha_esperada)
                  const isVencido = dias < 0
                  const isUrgente = dias >= 0 && dias <= 3
                  
                  return (
                    <div 
                      key={pago.id} 
                      className={`list-item ${isVencido ? 'item-danger' : isUrgente ? 'item-warning' : ''}`}
                    >
                      <div className="item-info">
                        <span className="item-title">
                          {pago.proyecto?.cliente?.nombre}
                        </span>
                        <span className="item-subtitle">
                          {pago.proyecto?.nombre}
                        </span>
                      </div>
                      <div className="item-right">
                        <span className="item-amount">{formatCLP(pago.monto)}</span>
                        <span className={`item-date ${isVencido ? 'text-danger' : isUrgente ? 'text-warning' : ''}`}>
                          {isVencido && <AlertCircle size={14} />}
                          {formatDaysRemaining(pago.fecha_esperada)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tareas Urgentes */}
        <div className="dashboard-card glass">
          <div className="card-header">
            <h2><Clock size={20} /> Tareas Próximas</h2>
          </div>
          <div className="card-content">
            {tareasUrgentes.length === 0 ? (
              <div className="empty-state">
                <CheckSquare size={40} />
                <p>¡Excelente! No hay tareas pendientes</p>
              </div>
            ) : (
              <div className="list">
                {tareasUrgentes.map(tarea => {
                  const dias = getDaysRemaining(tarea.fecha_vencimiento)
                  const isVencida = dias !== null && dias < 0
                  const isUrgente = dias !== null && dias >= 0 && dias <= 2
                  
                  return (
                    <div 
                      key={tarea.id} 
                      className={`list-item ${isVencida ? 'item-danger' : isUrgente ? 'item-warning' : ''}`}
                    >
                      <div className="item-info">
                        <span className="item-title">{tarea.titulo}</span>
                        <span className="item-subtitle">
                          {tarea.proyecto?.nombre} • {tarea.asignado_a || 'Sin asignar'}
                        </span>
                      </div>
                      <div className="item-right">
                        <span className={`priority-badge priority-${tarea.prioridad}`}>
                          {tarea.prioridad}
                        </span>
                        <span className={`item-date ${isVencida ? 'text-danger' : ''}`}>
                          {tarea.fecha_vencimiento ? formatDaysRemaining(tarea.fecha_vencimiento) : 'Sin fecha'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Proyectos Recientes */}
        <div className="dashboard-card glass full-width">
          <div className="card-header">
            <h2><Briefcase size={20} /> Proyectos Recientes</h2>
          </div>
          <div className="card-content">
            {proyectosRecientes.length === 0 ? (
              <div className="empty-state">
                <Briefcase size={40} />
                <p>Aún no hay proyectos. ¡Agrega tu primer cliente!</p>
              </div>
            ) : (
              <div className="projects-grid">
                {proyectosRecientes.map(proyecto => (
                  <div key={proyecto.id} className="project-card">
                    <div className="project-header">
                      <span className={`categoria-badge ${getCategoriaColor(proyecto.servicio?.categoria)}`}>
                        {getCategoriaIcon(proyecto.servicio?.categoria)}
                        {proyecto.servicio?.categoria === 'meta-ads' && 'Meta Ads'}
                        {proyecto.servicio?.categoria === 'contenido' && 'Contenido'}
                        {proyecto.servicio?.categoria === 'web' && 'Web'}
                      </span>
                      <span className={`status-badge status-${proyecto.estado}`}>
                        {proyecto.estado}
                      </span>
                    </div>
                    <h3>{proyecto.nombre}</h3>
                    <p className="project-client">{proyecto.cliente?.nombre}</p>
                    <div className="project-footer">
                      <span className="project-price">{formatCLP(proyecto.precio)}</span>
                      <span className="project-date">{formatDate(proyecto.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}