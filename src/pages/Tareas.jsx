import { useState, useEffect } from 'react'
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  Save,
  AlertCircle,
  Calendar,
  User,
  Flag,
  Clock,
  CheckCircle,
  Circle,
  PlayCircle,
  Filter,
  Briefcase,
  Users,
  UserCheck,
  CheckCheck,
  AlertTriangle
} from 'lucide-react'
import { supabase } from '../services/supabase'
import { formatDate, getDaysRemaining, formatDaysRemaining } from '../utils/formatters'
import './Tareas.css'

export default function Tareas() {
  const [tareas, setTareas] = useState([])
  const [filteredTareas, setFilteredTareas] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterAsignado, setFilterAsignado] = useState('todos')
  const [filterPrioridad, setFilterPrioridad] = useState('todos')
  const [filterProyecto, setFilterProyecto] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTarea, setEditingTarea] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [tareaToDelete, setTareaToDelete] = useState(null)
  const [showAccionesMasivas, setShowAccionesMasivas] = useState(false)
  const [proyectosConAlerta, setProyectosConAlerta] = useState([])
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    pendientes: 0,
    enProceso: 0,
    completadas: 0,
    vencidas: 0
  })
  
  const [formData, setFormData] = useState({
    proyecto_id: '',
    titulo: '',
    descripcion: '',
    asignado_a: '',
    prioridad: 'media',
    estado: 'pendiente',
    fecha_vencimiento: ''
  })
  const [errors, setErrors] = useState({})

  // Miembros del equipo
  const equipo = ['Andrés', 'Denisse']

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterTareas()
    calcularEstadisticas()
  }, [searchTerm, filterEstado, filterAsignado, filterPrioridad, filterProyecto, tareas])

  async function loadData() {
    try {
      // Cargar tareas con proyecto Y cliente
      const { data: tareasData, error: tareasError } = await supabase
        .from('tareas')
        .select(`
          *,
          proyecto:proyectos(
            id,
            nombre,
            fecha_fin,
            cliente:clientes(nombre)
          )
        `)
        .order('created_at', { ascending: false })

      if (tareasError) throw tareasError
      setTareas(tareasData || [])

      // Cargar proyectos activos
      const { data: proyectosData, error: proyectosError } = await supabase
        .from('proyectos')
        .select(`
          id,
          nombre,
          fecha_fin,
          cliente:clientes(nombre)
        `)
        .eq('estado', 'activo')
        .order('nombre')

      if (proyectosError) throw proyectosError
      setProyectos(proyectosData || [])

      // Verificar proyectos que terminan en 7 días
      const hoy = new Date()
      const en7Dias = new Date()
      en7Dias.setDate(hoy.getDate() + 7)

      const alertas = proyectosData?.filter(p => {
        if (!p.fecha_fin) return false
        const fechaFin = new Date(p.fecha_fin)
        return fechaFin >= hoy && fechaFin <= en7Dias
      }) || []
      
      setProyectosConAlerta(alertas)

    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  function filterTareas() {
    let filtered = [...tareas]

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(tarea =>
        tarea.titulo.toLowerCase().includes(term) ||
        tarea.descripcion?.toLowerCase().includes(term) ||
        tarea.proyecto?.nombre.toLowerCase().includes(term) ||
        tarea.proyecto?.cliente?.nombre.toLowerCase().includes(term)
      )
    }

    if (filterEstado !== 'todos') {
      filtered = filtered.filter(t => t.estado === filterEstado)
    }

    if (filterAsignado !== 'todos') {
      filtered = filtered.filter(t => t.asignado_a === filterAsignado)
    }

    if (filterPrioridad !== 'todos') {
      filtered = filtered.filter(t => t.prioridad === filterPrioridad)
    }

    if (filterProyecto !== 'todos') {
      filtered = filtered.filter(t => t.proyecto_id === filterProyecto)
    }

    // Ordenar: primero las urgentes, luego por fecha
    filtered.sort((a, b) => {
      // Completadas al final
      if (a.estado === 'completada' && b.estado !== 'completada') return 1
      if (b.estado === 'completada' && a.estado !== 'completada') return -1
      
      // Por prioridad
      const prioridadOrder = { alta: 0, media: 1, baja: 2 }
      if (prioridadOrder[a.prioridad] !== prioridadOrder[b.prioridad]) {
        return prioridadOrder[a.prioridad] - prioridadOrder[b.prioridad]
      }
      
      // Por fecha de vencimiento
      if (a.fecha_vencimiento && b.fecha_vencimiento) {
        return new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento)
      }
      
      return 0
    })

    setFilteredTareas(filtered)
  }

  function calcularEstadisticas() {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const stats = {
      total: tareas.length,
      pendientes: tareas.filter(t => t.estado === 'pendiente').length,
      enProceso: tareas.filter(t => t.estado === 'en-proceso').length,
      completadas: tareas.filter(t => t.estado === 'completada').length,
      vencidas: tareas.filter(t => {
        if (t.estado === 'completada') return false
        if (!t.fecha_vencimiento) return false
        return new Date(t.fecha_vencimiento) < hoy
      }).length
    }
    setEstadisticas(stats)
  }

  function validateForm() {
    const newErrors = {}

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El título es obligatorio'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!validateForm()) return

    try {
      const dataToSave = {
        ...formData,
        proyecto_id: formData.proyecto_id || null
      }

      if (editingTarea) {
        const { error } = await supabase
          .from('tareas')
          .update(dataToSave)
          .eq('id', editingTarea.id)

        if (error) throw error
        alert('✅ Tarea actualizada correctamente')
      } else {
        const { error } = await supabase
          .from('tareas')
          .insert([dataToSave])

        if (error) throw error
        alert('✅ Tarea creada correctamente')
      }

      closeModal()
      loadData()
    } catch (error) {
      console.error('Error guardando tarea:', error)
      alert('❌ Error al guardar la tarea')
    }
  }

  async function toggleEstado(tarea) {
    const nuevoEstado = tarea.estado === 'completada' ? 'pendiente' : 
                        tarea.estado === 'pendiente' ? 'en-proceso' : 'completada'
    
    try {
      const { error } = await supabase
        .from('tareas')
        .update({ 
          estado: nuevoEstado,
          completada_el: nuevoEstado === 'completada' ? new Date().toISOString() : null
        })
        .eq('id', tarea.id)

      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error actualizando estado:', error)
      alert('❌ Error al actualizar la tarea')
    }
  }

  // ========================================
  // ACCIONES MASIVAS
  // ========================================
  async function marcarTodasCompletadas() {
    const tareasParaCompletar = filteredTareas.filter(t => t.estado !== 'completada')
    
    if (tareasParaCompletar.length === 0) {
      alert('No hay tareas pendientes para completar')
      return
    }

    const confirmacion = confirm(
      `¿Marcar ${tareasParaCompletar.length} tarea(s) como completadas?`
    )
    
    if (!confirmacion) return

    try {
      const ids = tareasParaCompletar.map(t => t.id)
      
      const { error } = await supabase
        .from('tareas')
        .update({ 
          estado: 'completada',
          completada_el: new Date().toISOString()
        })
        .in('id', ids)

      if (error) throw error
      
      alert(`✅ ${tareasParaCompletar.length} tareas marcadas como completadas`)
      loadData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al actualizar las tareas')
    }
  }

  async function asignarTodasA(persona) {
    const tareasParaAsignar = filteredTareas.filter(t => t.estado !== 'completada')
    
    if (tareasParaAsignar.length === 0) {
      alert('No hay tareas pendientes para asignar')
      return
    }

    const confirmacion = confirm(
      `¿Asignar ${tareasParaAsignar.length} tarea(s) a ${persona}?`
    )
    
    if (!confirmacion) return

    try {
      const ids = tareasParaAsignar.map(t => t.id)
      
      const { error } = await supabase
        .from('tareas')
        .update({ asignado_a: persona })
        .in('id', ids)

      if (error) throw error
      
      alert(`✅ ${tareasParaAsignar.length} tareas asignadas a ${persona}`)
      setShowAccionesMasivas(false)
      loadData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al asignar las tareas')
    }
  }

  function openModal(tarea = null) {
    if (tarea) {
      setEditingTarea(tarea)
      setFormData({
        proyecto_id: tarea.proyecto_id || '',
        titulo: tarea.titulo,
        descripcion: tarea.descripcion || '',
        asignado_a: tarea.asignado_a || '',
        prioridad: tarea.prioridad,
        estado: tarea.estado,
        fecha_vencimiento: tarea.fecha_vencimiento || ''
      })
    } else {
      setEditingTarea(null)
      setFormData({
        proyecto_id: '',
        titulo: '',
        descripcion: '',
        asignado_a: '',
        prioridad: 'media',
        estado: 'pendiente',
        fecha_vencimiento: ''
      })
    }
    setErrors({})
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingTarea(null)
    setFormData({
      proyecto_id: '',
      titulo: '',
      descripcion: '',
      asignado_a: '',
      prioridad: 'media',
      estado: 'pendiente',
      fecha_vencimiento: ''
    })
    setErrors({})
  }

  function openDeleteConfirm(tarea) {
    setTareaToDelete(tarea)
    setShowDeleteConfirm(true)
  }

  async function handleDelete() {
    try {
      const { error } = await supabase
        .from('tareas')
        .delete()
        .eq('id', tareaToDelete.id)

      if (error) throw error

      alert('✅ Tarea eliminada correctamente')
      setShowDeleteConfirm(false)
      setTareaToDelete(null)
      loadData()
    } catch (error) {
      console.error('Error eliminando tarea:', error)
      alert('❌ Error al eliminar la tarea')
    }
  }

  function getEstadoIcon(estado) {
    switch (estado) {
      case 'completada':
        return <CheckCircle size={20} />
      case 'en-proceso':
        return <PlayCircle size={20} />
      case 'pendiente':
      default:
        return <Circle size={20} />
    }
  }

  function getPrioridadColor(prioridad) {
    switch (prioridad) {
      case 'alta': return 'prioridad-alta'
      case 'media': return 'prioridad-media'
      case 'baja': return 'prioridad-baja'
      default: return ''
    }
  }

  function getAsignadoColor(asignado) {
    switch (asignado) {
      case 'Andrés': return 'asignado-andres'
      case 'Denisse': return 'asignado-denisse'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando tareas...</p>
      </div>
    )
  }

  return (
    <div className="tareas-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><CheckSquare size={28} /> Tareas</h1>
          <p className="page-subtitle">
            Organiza el trabajo del equipo
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowAccionesMasivas(!showAccionesMasivas)}
          >
            <CheckCheck size={20} />
            Acciones Masivas
          </button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={20} />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Alerta de servicios por terminar */}
      {proyectosConAlerta.length > 0 && (
        <div className="alerta-servicios glass">
          <AlertTriangle size={20} />
          <div className="alerta-content">
            <strong>⚠️ Servicios por terminar en los próximos 7 días:</strong>
            <div className="alerta-lista">
              {proyectosConAlerta.map(p => (
                <span key={p.id} className="alerta-item">
                  {p.cliente?.nombre} - {p.nombre} ({formatDate(p.fecha_fin)})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Panel de Acciones Masivas */}
      {showAccionesMasivas && (
        <div className="acciones-masivas glass">
          <div className="acciones-header">
            <h3>Acciones Masivas</h3>
            <span className="tareas-seleccionadas">
              Aplicar a {filteredTareas.filter(t => t.estado !== 'completada').length} tareas pendientes
            </span>
          </div>
          <div className="acciones-buttons">
            <button 
              className="btn btn-success"
              onClick={marcarTodasCompletadas}
            >
              <CheckCheck size={18} />
              Completar Todas
            </button>
            <div className="asignar-grupo">
              <span>Asignar todas a:</span>
              {equipo.map(persona => (
                <button
                  key={persona}
                  className={`btn btn-asignar ${persona === 'Andrés' ? 'btn-andres' : 'btn-denisse'}`}
                  onClick={() => asignarTodasA(persona)}
                >
                  <UserCheck size={18} />
                  {persona}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon icon-orange">
            <Circle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.pendientes}</span>
            <span className="stat-label">Pendientes</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon icon-blue">
            <PlayCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.enProceso}</span>
            <span className="stat-label">En Proceso</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon icon-green">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.completadas}</span>
            <span className="stat-label">Completadas</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon icon-red">
            <AlertCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.vencidas}</span>
            <span className="stat-label">Vencidas</span>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="filters-section">
        <div className="search-bar glass">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar tareas, proyectos o clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <X size={18} />
            </button>
          )}
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <Filter size={18} />
            <select
              className="input filter-select"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="en-proceso">En Proceso</option>
              <option value="completada">Completadas</option>
            </select>
          </div>

          <div className="filter-group">
            <User size={18} />
            <select
              className="input filter-select"
              value={filterAsignado}
              onChange={(e) => setFilterAsignado(e.target.value)}
            >
              <option value="todos">Todo el equipo</option>
              <option value="Andrés">Andrés</option>
              <option value="Denisse">Denisse</option>
            </select>
          </div>

          <div className="filter-group">
            <Flag size={18} />
            <select
              className="input filter-select"
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value)}
            >
              <option value="todos">Todas las prioridades</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <div className="filter-group">
            <Briefcase size={18} />
            <select
              className="input filter-select"
              value={filterProyecto}
              onChange={(e) => setFilterProyecto(e.target.value)}
            >
              <option value="todos">Todos los proyectos</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.cliente?.nombre} - {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de tareas */}
      {filteredTareas.length === 0 ? (
        <div className="empty-state glass">
          <CheckSquare size={64} />
          <h3>
            {searchTerm || filterEstado !== 'todos' || filterAsignado !== 'todos' || filterPrioridad !== 'todos' || filterProyecto !== 'todos'
              ? 'No se encontraron tareas'
              : '¡Todo listo! No hay tareas pendientes'}
          </h3>
          <p>
            {searchTerm || filterEstado !== 'todos' || filterAsignado !== 'todos' || filterPrioridad !== 'todos' || filterProyecto !== 'todos'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Crea una nueva tarea para comenzar'}
          </p>
          {!searchTerm && filterEstado === 'todos' && filterAsignado === 'todos' && filterPrioridad === 'todos' && filterProyecto === 'todos' && (
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={20} />
              Crear Primera Tarea
            </button>
          )}
        </div>
      ) : (
        <div className="tareas-list">
          {filteredTareas.map(tarea => {
            const diasRestantes = getDaysRemaining(tarea.fecha_vencimiento)
            const isVencida = tarea.estado !== 'completada' && diasRestantes !== null && diasRestantes < 0
            const isUrgente = tarea.estado !== 'completada' && diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 2
            
            return (
              <div 
                key={tarea.id} 
                className={`tarea-card glass ${tarea.estado === 'completada' ? 'tarea-completada' : ''} ${isVencida ? 'tarea-vencida' : ''}`}
              >
                {/* Checkbox de estado */}
                <button
                  className={`tarea-checkbox estado-${tarea.estado}`}
                  onClick={() => toggleEstado(tarea)}
                  title={
                    tarea.estado === 'pendiente' ? 'Marcar en proceso' :
                    tarea.estado === 'en-proceso' ? 'Marcar completada' :
                    'Marcar pendiente'
                  }
                >
                  {getEstadoIcon(tarea.estado)}
                </button>

                {/* Contenido */}
                <div className="tarea-content">
                  <div className="tarea-header">
                    <h3 className={tarea.estado === 'completada' ? 'tarea-titulo-completada' : ''}>
                      {tarea.titulo}
                    </h3>
                    <div className="tarea-badges">
                      <span className={`prioridad-badge ${getPrioridadColor(tarea.prioridad)}`}>
                        <Flag size={12} />
                        {tarea.prioridad}
                      </span>
                      {tarea.asignado_a && (
                        <span className={`asignado-badge ${getAsignadoColor(tarea.asignado_a)}`}>
                          <User size={12} />
                          {tarea.asignado_a}
                        </span>
                      )}
                    </div>
                  </div>

                  {tarea.descripcion && (
                    <p className="tarea-descripcion">{tarea.descripcion}</p>
                  )}

                  <div className="tarea-meta">
                    {/* Cliente */}
                    {tarea.proyecto?.cliente?.nombre && (
                      <span className="tarea-cliente">
                        <Users size={14} />
                        {tarea.proyecto.cliente.nombre}
                      </span>
                    )}
                    {/* Proyecto */}
                    {tarea.proyecto && (
                      <span className="tarea-proyecto">
                        <Briefcase size={14} />
                        {tarea.proyecto.nombre}
                      </span>
                    )}
                    {/* Fecha */}
                    {tarea.fecha_vencimiento && (
                      <span className={`tarea-fecha ${isVencida ? 'fecha-vencida' : isUrgente ? 'fecha-urgente' : ''}`}>
                        <Calendar size={14} />
                        {formatDaysRemaining(tarea.fecha_vencimiento)}
                        {isVencida && <AlertCircle size={14} />}
                      </span>
                    )}
                    {tarea.estado === 'completada' && tarea.completada_el && (
                      <span className="tarea-completada-fecha">
                        <CheckCircle size={14} />
                        Completada el {formatDate(tarea.completada_el)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="tarea-actions">
                  <button
                    className="btn-icon"
                    onClick={() => openModal(tarea)}
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={() => openDeleteConfirm(tarea)}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingTarea ? 'Editar Tarea' : 'Nueva Tarea'}
              </h2>
              <button className="btn-icon" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                {/* Título */}
                <div className="form-group full-width">
                  <label htmlFor="titulo">
                    Título <span className="required">*</span>
                  </label>
                  <input
                    id="titulo"
                    type="text"
                    className={`input ${errors.titulo ? 'input-error' : ''}`}
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="¿Qué necesitas hacer?"
                  />
                  {errors.titulo && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.titulo}
                    </span>
                  )}
                </div>

                {/* Descripción */}
                <div className="form-group full-width">
                  <label htmlFor="descripcion">Descripción</label>
                  <textarea
                    id="descripcion"
                    className="input"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Detalles adicionales de la tarea..."
                    rows="3"
                  />
                </div>

                {/* Proyecto */}
                <div className="form-group full-width">
                  <label htmlFor="proyecto">Proyecto (opcional)</label>
                  <select
                    id="proyecto"
                    className="input"
                    value={formData.proyecto_id}
                    onChange={(e) => setFormData({ ...formData, proyecto_id: e.target.value })}
                  >
                    <option value="">Sin proyecto asociado</option>
                    {proyectos.map(proyecto => (
                      <option key={proyecto.id} value={proyecto.id}>
                        {proyecto.cliente?.nombre} - {proyecto.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Asignado a */}
                <div className="form-group">
                  <label htmlFor="asignado_a">Asignar a</label>
                  <select
                    id="asignado_a"
                    className="input"
                    value={formData.asignado_a}
                    onChange={(e) => setFormData({ ...formData, asignado_a: e.target.value })}
                  >
                    <option value="">Sin asignar</option>
                    {equipo.map(miembro => (
                      <option key={miembro} value={miembro}>
                        {miembro}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prioridad */}
                <div className="form-group">
                  <label htmlFor="prioridad">Prioridad</label>
                  <select
                    id="prioridad"
                    className="input"
                    value={formData.prioridad}
                    onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
                  >
                    <option value="baja">🟢 Baja</option>
                    <option value="media">🟡 Media</option>
                    <option value="alta">🔴 Alta</option>
                  </select>
                </div>

                {/* Estado */}
                <div className="form-group">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    className="input"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  >
                    <option value="pendiente">⭕ Pendiente</option>
                    <option value="en-proceso">▶️ En Proceso</option>
                    <option value="completada">✅ Completada</option>
                  </select>
                </div>

                {/* Fecha de vencimiento */}
                <div className="form-group">
                  <label htmlFor="fecha_vencimiento">Fecha de Vencimiento</label>
                  <input
                    id="fecha_vencimiento"
                    type="date"
                    className="input"
                    value={formData.fecha_vencimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} />
                  {editingTarea ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal modal-sm glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar Eliminación</h2>
              <button className="btn-icon" onClick={() => setShowDeleteConfirm(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="delete-warning">
                <AlertCircle size={48} className="warning-icon" />
                <p>
                  ¿Estás seguro de eliminar la tarea <strong>"{tareaToDelete?.titulo}"</strong>?
                </p>
                <p className="warning-text">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <Trash2 size={18} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}