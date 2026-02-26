import { useState, useEffect } from 'react'
import { 
  Settings,
  Plus, 
  Edit2, 
  Trash2, 
  X,
  Save,
  AlertCircle,
  CheckSquare,
  Target,
  Palette,
  Globe,
  Layers,
  ChevronDown,
  ChevronUp,
  GripVertical,
  User,
  Flag,
  Clock,
  DollarSign,
  Package
} from 'lucide-react'
import { supabase } from '../services/supabase'
import { formatCLP } from '../utils/formatters'
import './Servicios.css'

export default function Servicios() {
  const [servicios, setServicios] = useState([])
  const [tareasPlantilla, setTareasPlantilla] = useState({})
  const [expandedServicio, setExpandedServicio] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Modal de Servicio
  const [showModalServicio, setShowModalServicio] = useState(false)
  const [editingServicio, setEditingServicio] = useState(null)
  const [showDeleteServicioConfirm, setShowDeleteServicioConfirm] = useState(false)
  const [servicioToDelete, setServicioToDelete] = useState(null)
  
  // Modal de Tarea
  const [showModalTarea, setShowModalTarea] = useState(false)
  const [editingTarea, setEditingTarea] = useState(null)
  const [currentServicioId, setCurrentServicioId] = useState(null)
  const [showDeleteTareaConfirm, setShowDeleteTareaConfirm] = useState(false)
  const [tareaToDelete, setTareaToDelete] = useState(null)
  
  // Form de Servicio
  const [servicioFormData, setServicioFormData] = useState({
    nombre: '',
    categoria: 'contenido',
    descripcion: '',
    precio_base: ''
  })
  const [servicioErrors, setServicioErrors] = useState({})

  // Form de Tarea
  const [tareaFormData, setTareaFormData] = useState({
    titulo: '',
    descripcion: '',
    orden: 0,
    dias_desde_inicio: 0,
    asignado_a: '',
    prioridad: 'media'
  })
  const [tareaErrors, setTareaErrors] = useState({})

  const equipo = ['Andrés', 'Denisse']
  
  const categorias = [
    { value: 'contenido', label: 'Contenido / Redes Sociales', icon: Palette },
    { value: 'meta-ads', label: 'Meta Ads / Publicidad', icon: Target },
    { value: 'web', label: 'Desarrollo Web', icon: Globe },
    { value: 'combo', label: 'Combo / Paquete', icon: Layers }
  ]

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: serviciosData, error: serviciosError } = await supabase
        .from('servicios')
        .select('*')
        .order('precio_base', { ascending: true })

      if (serviciosError) throw serviciosError
      setServicios(serviciosData || [])

      const { data: tareasData, error: tareasError } = await supabase
        .from('tareas_plantilla')
        .select('*')
        .order('orden', { ascending: true })

      if (tareasError) throw tareasError

      const tareasAgrupadas = {}
      tareasData?.forEach(tarea => {
        if (!tareasAgrupadas[tarea.servicio_id]) {
          tareasAgrupadas[tarea.servicio_id] = []
        }
        tareasAgrupadas[tarea.servicio_id].push(tarea)
      })
      setTareasPlantilla(tareasAgrupadas)

    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  function toggleServicio(servicioId) {
    setExpandedServicio(expandedServicio === servicioId ? null : servicioId)
  }

  function getCategoriaIcon(categoria) {
    switch (categoria) {
      case 'meta-ads': return <Target size={24} />
      case 'contenido': return <Palette size={24} />
      case 'web': return <Globe size={24} />
      case 'combo': return <Layers size={24} />
      default: return <Package size={24} />
    }
  }

  function getCategoriaColor(categoria) {
    switch (categoria) {
      case 'meta-ads': return 'categoria-ads'
      case 'contenido': return 'categoria-contenido'
      case 'web': return 'categoria-web'
      case 'combo': return 'categoria-combo'
      default: return ''
    }
  }

  // ========================================
  // FUNCIONES DE SERVICIO
  // ========================================

  function validateServicioForm() {
    const newErrors = {}
    if (!servicioFormData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    }
    if (!servicioFormData.precio_base || servicioFormData.precio_base <= 0) {
      newErrors.precio_base = 'Ingresa un precio válido'
    }
    setServicioErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmitServicio(e) {
    e.preventDefault()
    if (!validateServicioForm()) return

    try {
      const dataToSave = {
        nombre: servicioFormData.nombre,
        categoria: servicioFormData.categoria,
        descripcion: servicioFormData.descripcion,
        precio_base: parseFloat(servicioFormData.precio_base)
      }

      if (editingServicio) {
        const { error } = await supabase
          .from('servicios')
          .update(dataToSave)
          .eq('id', editingServicio.id)

        if (error) throw error
        alert('✅ Servicio actualizado correctamente')
      } else {
        const { error } = await supabase
          .from('servicios')
          .insert([dataToSave])

        if (error) throw error
        alert('✅ Servicio creado correctamente')
      }

      closeModalServicio()
      loadData()
    } catch (error) {
      console.error('Error guardando servicio:', error)
      alert('❌ Error al guardar el servicio')
    }
  }

  function openModalServicio(servicio = null) {
    if (servicio) {
      setEditingServicio(servicio)
      setServicioFormData({
        nombre: servicio.nombre,
        categoria: servicio.categoria,
        descripcion: servicio.descripcion || '',
        precio_base: servicio.precio_base
      })
    } else {
      setEditingServicio(null)
      setServicioFormData({
        nombre: '',
        categoria: 'contenido',
        descripcion: '',
        precio_base: ''
      })
    }
    setServicioErrors({})
    setShowModalServicio(true)
  }

  function closeModalServicio() {
    setShowModalServicio(false)
    setEditingServicio(null)
    setServicioFormData({
      nombre: '',
      categoria: 'contenido',
      descripcion: '',
      precio_base: ''
    })
    setServicioErrors({})
  }

  function openDeleteServicioConfirm(servicio) {
    setServicioToDelete(servicio)
    setShowDeleteServicioConfirm(true)
  }

  async function handleDeleteServicio() {
    try {
      const { error } = await supabase
        .from('servicios')
        .delete()
        .eq('id', servicioToDelete.id)

      if (error) throw error

      alert('✅ Servicio eliminado correctamente')
      setShowDeleteServicioConfirm(false)
      setServicioToDelete(null)
      loadData()
    } catch (error) {
      console.error('Error eliminando servicio:', error)
      alert('❌ Error al eliminar. Puede que tenga proyectos asociados.')
    }
  }

  // ========================================
  // FUNCIONES DE TAREA PLANTILLA
  // ========================================

  function validateTareaForm() {
    const newErrors = {}
    if (!tareaFormData.titulo.trim()) {
      newErrors.titulo = 'El título es obligatorio'
    }
    setTareaErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmitTarea(e) {
    e.preventDefault()
    if (!validateTareaForm()) return

    try {
      const dataToSave = {
        ...tareaFormData,
        servicio_id: currentServicioId,
        orden: parseInt(tareaFormData.orden) || 0,
        dias_desde_inicio: parseInt(tareaFormData.dias_desde_inicio) || 0
      }

      if (editingTarea) {
        const { error } = await supabase
          .from('tareas_plantilla')
          .update(dataToSave)
          .eq('id', editingTarea.id)

        if (error) throw error
        alert('✅ Tarea plantilla actualizada')
      } else {
        const { error } = await supabase
          .from('tareas_plantilla')
          .insert([dataToSave])

        if (error) throw error
        alert('✅ Tarea plantilla creada')
      }

      closeModalTarea()
      loadData()
    } catch (error) {
      console.error('Error guardando tarea:', error)
      alert('❌ Error al guardar la tarea')
    }
  }

  function openModalTarea(servicioId, tarea = null) {
    setCurrentServicioId(servicioId)
    if (tarea) {
      setEditingTarea(tarea)
      setTareaFormData({
        titulo: tarea.titulo,
        descripcion: tarea.descripcion || '',
        orden: tarea.orden || 0,
        dias_desde_inicio: tarea.dias_desde_inicio || 0,
        asignado_a: tarea.asignado_a || '',
        prioridad: tarea.prioridad || 'media'
      })
    } else {
      setEditingTarea(null)
      const tareasExistentes = tareasPlantilla[servicioId] || []
      const maxOrden = tareasExistentes.length > 0 
        ? Math.max(...tareasExistentes.map(t => t.orden)) 
        : 0
      setTareaFormData({
        titulo: '',
        descripcion: '',
        orden: maxOrden + 1,
        dias_desde_inicio: 0,
        asignado_a: '',
        prioridad: 'media'
      })
    }
    setTareaErrors({})
    setShowModalTarea(true)
  }

  function closeModalTarea() {
    setShowModalTarea(false)
    setEditingTarea(null)
    setCurrentServicioId(null)
    setTareaFormData({
      titulo: '',
      descripcion: '',
      orden: 0,
      dias_desde_inicio: 0,
      asignado_a: '',
      prioridad: 'media'
    })
    setTareaErrors({})
  }

  function openDeleteTareaConfirm(tarea) {
    setTareaToDelete(tarea)
    setShowDeleteTareaConfirm(true)
  }

  async function handleDeleteTarea() {
    try {
      const { error } = await supabase
        .from('tareas_plantilla')
        .delete()
        .eq('id', tareaToDelete.id)

      if (error) throw error

      alert('✅ Tarea plantilla eliminada')
      setShowDeleteTareaConfirm(false)
      setTareaToDelete(null)
      loadData()
    } catch (error) {
      console.error('Error eliminando tarea:', error)
      alert('❌ Error al eliminar la tarea')
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando servicios...</p>
      </div>
    )
  }

  return (
    <div className="servicios-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><Settings size={28} /> Servicios y Tareas Automáticas</h1>
          <p className="page-subtitle">
            Gestiona tus servicios y las tareas que se crean automáticamente
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModalServicio()}>
          <Plus size={20} />
          Nuevo Servicio
        </button>
      </div>

      {/* Info Box */}
      <div className="info-box glass">
        <AlertCircle size={20} />
        <p>
          <strong>¿Cómo funciona?</strong> Cada vez que creas un proyecto con uno de estos servicios, 
          las tareas configuradas aquí se crean automáticamente asignadas al equipo.
        </p>
      </div>

      {/* Lista de Servicios */}
      {servicios.length === 0 ? (
        <div className="empty-state glass">
          <Package size={64} />
          <h3>No hay servicios configurados</h3>
          <p>Crea tu primer servicio para comenzar</p>
          <button className="btn btn-primary" onClick={() => openModalServicio()}>
            <Plus size={20} />
            Crear Primer Servicio
          </button>
        </div>
      ) : (
        <div className="servicios-list">
          {servicios.map(servicio => (
            <div key={servicio.id} className={`servicio-item glass ${getCategoriaColor(servicio.categoria)}`}>
              {/* Header del servicio */}
              <div className="servicio-header">
                <div 
                  className="servicio-header-left"
                  onClick={() => toggleServicio(servicio.id)}
                >
                  <div className="servicio-info">
                    <div className={`servicio-icon ${getCategoriaColor(servicio.categoria)}`}>
                      {getCategoriaIcon(servicio.categoria)}
                    </div>
                    <div>
                      <h3>{servicio.nombre}</h3>
                      <p className="servicio-precio">
                        {formatCLP(servicio.precio_base)}
                        {servicio.categoria !== 'web' ? '/mes' : ' pago único'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="servicio-meta">
                  <span className="tareas-count">
                    <CheckSquare size={16} />
                    {tareasPlantilla[servicio.id]?.length || 0} tareas
                  </span>
                  
                  <div className="servicio-actions">
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        openModalServicio(servicio)
                      }}
                      title="Editar servicio"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDeleteServicioConfirm(servicio)
                      }}
                      title="Eliminar servicio"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <button 
                    className="btn-expand"
                    onClick={() => toggleServicio(servicio.id)}
                  >
                    {expandedServicio === servicio.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {/* Descripción del servicio */}
              {servicio.descripcion && (
                <div className="servicio-descripcion">
                  <p>{servicio.descripcion}</p>
                </div>
              )}

              {/* Tareas del servicio (expandible) */}
              {expandedServicio === servicio.id && (
                <div className="servicio-tareas">
                  <div className="tareas-header">
                    <h4>Tareas Automáticas</h4>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        openModalTarea(servicio.id)
                      }}
                    >
                      <Plus size={16} />
                      Agregar Tarea
                    </button>
                  </div>

                  {(!tareasPlantilla[servicio.id] || tareasPlantilla[servicio.id].length === 0) ? (
                    <div className="no-tareas">
                      <p>No hay tareas configuradas para este servicio</p>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => openModalTarea(servicio.id)}
                      >
                        <Plus size={16} />
                        Crear primera tarea
                      </button>
                    </div>
                  ) : (
                    <div className="tareas-plantilla-list">
                      {tareasPlantilla[servicio.id].map((tarea) => (
                        <div key={tarea.id} className="tarea-plantilla-item">
                          <div className="tarea-orden">
                            <GripVertical size={16} />
                            <span>{tarea.orden}</span>
                          </div>
                          <div className="tarea-plantilla-content">
                            <div className="tarea-plantilla-header">
                              <h5>{tarea.titulo}</h5>
                              <div className="tarea-plantilla-badges">
                                <span className={`prioridad-badge-sm ${getPrioridadColor(tarea.prioridad)}`}>
                                  <Flag size={10} />
                                  {tarea.prioridad}
                                </span>
                                {tarea.asignado_a && (
                                  <span className="asignado-badge-sm">
                                    <User size={10} />
                                    {tarea.asignado_a}
                                  </span>
                                )}
                                <span className="dias-badge">
                                  <Clock size={10} />
                                  Día {tarea.dias_desde_inicio}
                                </span>
                              </div>
                            </div>
                            {tarea.descripcion && (
                              <p className="tarea-plantilla-desc">{tarea.descripcion}</p>
                            )}
                          </div>
                          <div className="tarea-plantilla-actions">
                            <button
                              className="btn-icon-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                openModalTarea(servicio.id, tarea)
                              }}
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="btn-icon-sm btn-icon-danger"
                              onClick={(e) => {
                                e.stopPropagation()
                                openDeleteTareaConfirm(tarea)
                              }}
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ========================================
          MODAL: CREAR/EDITAR SERVICIO
          ======================================== */}
      {showModalServicio && (
        <div className="modal-overlay" onClick={closeModalServicio}>
          <div className="modal glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingServicio ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h2>
              <button className="btn-icon" onClick={closeModalServicio}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitServicio} className="modal-body">
              <div className="form-grid">
                {/* Nombre */}
                <div className="form-group full-width">
                  <label htmlFor="servicio-nombre">
                    Nombre del Servicio <span className="required">*</span>
                  </label>
                  <input
                    id="servicio-nombre"
                    type="text"
                    className={`input ${servicioErrors.nombre ? 'input-error' : ''}`}
                    value={servicioFormData.nombre}
                    onChange={(e) => setServicioFormData({ ...servicioFormData, nombre: e.target.value })}
                    placeholder="Ej: Plan Premium"
                  />
                  {servicioErrors.nombre && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {servicioErrors.nombre}
                    </span>
                  )}
                </div>

                {/* Categoría */}
                <div className="form-group">
                  <label htmlFor="servicio-categoria">Categoría</label>
                  <select
                    id="servicio-categoria"
                    className="input"
                    value={servicioFormData.categoria}
                    onChange={(e) => setServicioFormData({ ...servicioFormData, categoria: e.target.value })}
                  >
                    {categorias.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Precio */}
                <div className="form-group">
                  <label htmlFor="servicio-precio">
                    Precio (CLP) <span className="required">*</span>
                  </label>
                  <input
                    id="servicio-precio"
                    type="number"
                    className={`input ${servicioErrors.precio_base ? 'input-error' : ''}`}
                    value={servicioFormData.precio_base}
                    onChange={(e) => setServicioFormData({ ...servicioFormData, precio_base: e.target.value })}
                    placeholder="319000"
                    min="0"
                    step="1000"
                  />
                  {servicioErrors.precio_base && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {servicioErrors.precio_base}
                    </span>
                  )}
                  {servicioFormData.precio_base && (
                    <span className="help-text">
                      {formatCLP(servicioFormData.precio_base)}
                    </span>
                  )}
                </div>

                {/* Descripción */}
                <div className="form-group full-width">
                  <label htmlFor="servicio-descripcion">Descripción</label>
                  <textarea
                    id="servicio-descripcion"
                    className="input"
                    value={servicioFormData.descripcion}
                    onChange={(e) => setServicioFormData({ ...servicioFormData, descripcion: e.target.value })}
                    placeholder="Descripción del servicio y qué incluye..."
                    rows="4"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModalServicio}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} />
                  {editingServicio ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: CONFIRMAR ELIMINACIÓN DE SERVICIO
          ======================================== */}
      {showDeleteServicioConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteServicioConfirm(false)}>
          <div className="modal modal-sm glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Eliminar Servicio</h2>
              <button className="btn-icon" onClick={() => setShowDeleteServicioConfirm(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="delete-warning">
                <AlertCircle size={48} className="warning-icon" />
                <p>
                  ¿Eliminar el servicio <strong>"{servicioToDelete?.nombre}"</strong>?
                </p>
                <p className="warning-text">
                  Se eliminarán también todas las tareas plantilla asociadas.
                  Los proyectos existentes no se verán afectados.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteServicioConfirm(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleDeleteServicio}>
                <Trash2 size={18} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: CREAR/EDITAR TAREA PLANTILLA
          ======================================== */}
      {showModalTarea && (
        <div className="modal-overlay" onClick={closeModalTarea}>
          <div className="modal glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingTarea ? 'Editar Tarea Plantilla' : 'Nueva Tarea Plantilla'}
              </h2>
              <button className="btn-icon" onClick={closeModalTarea}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitTarea} className="modal-body">
              <div className="form-grid">
                {/* Título */}
                <div className="form-group full-width">
                  <label htmlFor="tarea-titulo">
                    Título de la Tarea <span className="required">*</span>
                  </label>
                  <input
                    id="tarea-titulo"
                    type="text"
                    className={`input ${tareaErrors.titulo ? 'input-error' : ''}`}
                    value={tareaFormData.titulo}
                    onChange={(e) => setTareaFormData({ ...tareaFormData, titulo: e.target.value })}
                    placeholder="Ej: Reunión de onboarding con cliente"
                  />
                  {tareaErrors.titulo && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {tareaErrors.titulo}
                    </span>
                  )}
                </div>

                {/* Descripción */}
                <div className="form-group full-width">
                  <label htmlFor="tarea-descripcion">Descripción</label>
                  <textarea
                    id="tarea-descripcion"
                    className="input"
                    value={tareaFormData.descripcion}
                    onChange={(e) => setTareaFormData({ ...tareaFormData, descripcion: e.target.value })}
                    placeholder="Detalles de qué hacer en esta tarea..."
                    rows="3"
                  />
                </div>

                {/* Orden */}
                <div className="form-group">
                  <label htmlFor="tarea-orden">Orden</label>
                  <input
                    id="tarea-orden"
                    type="number"
                    className="input"
                    value={tareaFormData.orden}
                    onChange={(e) => setTareaFormData({ ...tareaFormData, orden: e.target.value })}
                    min="1"
                  />
                  <span className="help-text">Posición en la lista</span>
                </div>

                {/* Días desde inicio */}
                <div className="form-group">
                  <label htmlFor="tarea-dias">Días desde inicio</label>
                  <input
                    id="tarea-dias"
                    type="number"
                    className="input"
                    value={tareaFormData.dias_desde_inicio}
                    onChange={(e) => setTareaFormData({ ...tareaFormData, dias_desde_inicio: e.target.value })}
                    min="0"
                  />
                  <span className="help-text">Fecha vencimiento automática</span>
                </div>

                {/* Asignado a */}
                <div className="form-group">
                  <label htmlFor="tarea-asignado">Asignar a</label>
                  <select
                    id="tarea-asignado"
                    className="input"
                    value={tareaFormData.asignado_a}
                    onChange={(e) => setTareaFormData({ ...tareaFormData, asignado_a: e.target.value })}
                  >
                    <option value="">Sin asignar</option>
                    {equipo.map(miembro => (
                      <option key={miembro} value={miembro}>{miembro}</option>
                    ))}
                  </select>
                </div>

                {/* Prioridad */}
                <div className="form-group">
                  <label htmlFor="tarea-prioridad">Prioridad</label>
                  <select
                    id="tarea-prioridad"
                    className="input"
                    value={tareaFormData.prioridad}
                    onChange={(e) => setTareaFormData({ ...tareaFormData, prioridad: e.target.value })}
                  >
                    <option value="baja">🟢 Baja</option>
                    <option value="media">🟡 Media</option>
                    <option value="alta">🔴 Alta</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModalTarea}>
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

      {/* ========================================
          MODAL: CONFIRMAR ELIMINACIÓN DE TAREA
          ======================================== */}
      {showDeleteTareaConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteTareaConfirm(false)}>
          <div className="modal modal-sm glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Eliminar Tarea</h2>
              <button className="btn-icon" onClick={() => setShowDeleteTareaConfirm(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="delete-warning">
                <AlertCircle size={48} className="warning-icon" />
                <p>
                  ¿Eliminar la tarea <strong>"{tareaToDelete?.titulo}"</strong>?
                </p>
                <p className="warning-text">
                  Los proyectos existentes no se verán afectados.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteTareaConfirm(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleDeleteTarea}>
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