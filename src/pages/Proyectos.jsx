import { calcularDesglose } from '../utils/impuestos'
import { formatCLP, formatDate } from '../utils/formatters'
import { useState, useEffect } from 'react'
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  Save,
  AlertCircle,
  Users,
  Calendar,
  DollarSign,
  Target,
  Palette,
  Globe,
  Filter,
  TrendingUp,
  History,
  Info,
  CheckCircle,
  Clock,
  AlertTriangle,
  Copy,
  FileText
} from 'lucide-react'
import { supabase } from '../services/supabase'
import './Proyectos.css'

export default function Proyectos() {
  const [proyectos, setProyectos] = useState([])
  const [filteredProyectos, setFilteredProyectos] = useState([])
  const [clientes, setClientes] = useState([])
  const [servicios, setServicios] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterCategoria, setFilterCategoria] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProyecto, setEditingProyecto] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [proyectoToDelete, setProyectoToDelete] = useState(null)
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    servicio_id: '',
    nombre: '',
    precio: '',
    estado: 'activo',
    fecha_inicio: '',
    fecha_fin: '',
    notas: '',
    es_historico: false,
    // Campos de pago
    estado_pago: 'pendiente',
    monto_pagado: '',
    fecha_proximo_pago: '',
    tipo_documento: 'factura'
  })
  const [errors, setErrors] = useState({})

  // Calcular monto restante
  const montoRestante = formData.precio && formData.monto_pagado 
    ? parseFloat(formData.precio) - parseFloat(formData.monto_pagado || 0)
    : parseFloat(formData.precio || 0)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterProyectos()
  }, [searchTerm, filterEstado, filterCategoria, proyectos])

  async function loadData() {
    try {
      const { data: proyectosData, error: proyectosError } = await supabase
        .from('proyectos')
        .select(`
          *,
          cliente:clientes(id, nombre, empresa),
          servicio:servicios(id, nombre, categoria, precio_base)
        `)
        .order('created_at', { ascending: false })

      if (proyectosError) throw proyectosError
      setProyectos(proyectosData || [])

      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .eq('estado', 'activo')
        .order('nombre')

      if (clientesError) throw clientesError
      setClientes(clientesData || [])

      const { data: serviciosData, error: serviciosError } = await supabase
        .from('servicios')
        .select('*')
        .order('categoria', { ascending: true })

      if (serviciosError) throw serviciosError
      setServicios(serviciosData || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  function filterProyectos() {
    let filtered = [...proyectos]

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(proyecto =>
        proyecto.nombre.toLowerCase().includes(term) ||
        proyecto.cliente?.nombre.toLowerCase().includes(term) ||
        proyecto.servicio?.nombre.toLowerCase().includes(term)
      )
    }

    if (filterEstado !== 'todos') {
      filtered = filtered.filter(p => p.estado === filterEstado)
    }

    if (filterCategoria !== 'todos') {
      filtered = filtered.filter(p => p.servicio?.categoria === filterCategoria)
    }

    setFilteredProyectos(filtered)
  }

  function validateForm() {
    const newErrors = {}

    if (!formData.cliente_id) {
      newErrors.cliente_id = 'Selecciona un cliente'
    }

    if (!formData.servicio_id) {
      newErrors.servicio_id = 'Selecciona un servicio'
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre del proyecto es obligatorio'
    }

    if (!formData.precio || formData.precio <= 0) {
      newErrors.precio = 'Ingresa un precio válido'
    }

    // Validaciones de pago
    if (formData.estado_pago === 'parcial') {
      if (!formData.monto_pagado || formData.monto_pagado <= 0) {
        newErrors.monto_pagado = 'Ingresa el monto pagado'
      } else if (parseFloat(formData.monto_pagado) >= parseFloat(formData.precio)) {
        newErrors.monto_pagado = 'El monto pagado debe ser menor al precio total'
      }
      if (!formData.fecha_proximo_pago) {
        newErrors.fecha_proximo_pago = 'Ingresa la fecha del próximo pago'
      }
    }

    if (formData.estado_pago === 'pendiente' && !formData.fecha_proximo_pago) {
      newErrors.fecha_proximo_pago = 'Ingresa la fecha límite de pago'
    }

    // Validación para proyectos históricos
    if (formData.es_historico) {
      if (!formData.fecha_inicio) {
        newErrors.fecha_inicio = 'La fecha de inicio es obligatoria para proyectos históricos'
      }
      if (formData.estado === 'activo') {
        newErrors.estado = 'Los proyectos históricos deben estar completados o pausados'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
  e.preventDefault()

  if (!validateForm()) return

  try {
    const dataToSave = {
      cliente_id: formData.cliente_id,
      servicio_id: formData.servicio_id,
      nombre: formData.nombre,
      precio: parseFloat(formData.precio),
      estado: formData.estado,
      fecha_inicio: formData.fecha_inicio || null,
      fecha_fin: formData.fecha_fin || null,
      notas: formData.notas,
      es_historico: formData.es_historico,
      estado_pago: formData.estado_pago,
      monto_pagado: formData.monto_pagado ? parseFloat(formData.monto_pagado) : 0,
      fecha_proximo_pago: formData.fecha_proximo_pago || null,
      tipo_documento: formData.tipo_documento
    }

    if (editingProyecto) {
      // Actualizar proyecto existente
      const { error } = await supabase
        .from('proyectos')
        .update({
          ...dataToSave,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProyecto.id)

      if (error) throw error
      alert('✅ Proyecto actualizado correctamente')
    } else {
      // ========================================
      // CREAR NUEVO PROYECTO
      // ========================================
      const { data: nuevoProyecto, error: errorProyecto } = await supabase
        .from('proyectos')
        .insert([dataToSave])
        .select()
        .single()

      if (errorProyecto) throw errorProyecto

      // ========================================
      // CREAR PAGOS AUTOMÁTICAMENTE
      // ========================================
      const pagosACrear = []
      const fechaBase = formData.fecha_inicio || new Date().toISOString().split('T')[0]
      const precioTotal = parseFloat(formData.precio)
      const montoPagado = formData.monto_pagado ? parseFloat(formData.monto_pagado) : 0

      // CASO 1: Pago completo
      if (formData.estado_pago === 'pagado') {
        pagosACrear.push({
          proyecto_id: nuevoProyecto.id,
          monto: precioTotal,
          fecha_esperada: fechaBase,
          fecha_pago: fechaBase,
          estado: 'pagado',
          metodo_pago: 'Transferencia Bancaria',
          notas: formData.es_historico ? 'Pago histórico - Proyecto completado' : 'Pago completo al inicio del proyecto'
        })
      }
      // CASO 2: Pago parcial
      else if (formData.estado_pago === 'parcial') {
        // Pago 1: Lo que ya pagaron (pagado)
        pagosACrear.push({
          proyecto_id: nuevoProyecto.id,
          monto: montoPagado,
          fecha_esperada: fechaBase,
          fecha_pago: fechaBase,
          estado: 'pagado',
          metodo_pago: 'Transferencia Bancaria',
          notas: 'Pago inicial del proyecto'
        })

        // Pago 2: Lo que falta (pendiente)
        const montoRestante = precioTotal - montoPagado
        if (montoRestante > 0) {
          pagosACrear.push({
            proyecto_id: nuevoProyecto.id,
            monto: montoRestante,
            fecha_esperada: formData.fecha_proximo_pago || fechaBase,
            fecha_pago: null,
            estado: 'pendiente',
            metodo_pago: null,
            notas: 'Saldo pendiente del proyecto'
          })
        }
      }
      // CASO 3: Pago pendiente
      else if (formData.estado_pago === 'pendiente') {
        pagosACrear.push({
          proyecto_id: nuevoProyecto.id,
          monto: precioTotal,
          fecha_esperada: formData.fecha_proximo_pago || fechaBase,
          fecha_pago: null,
          estado: 'pendiente',
          metodo_pago: null,
          notas: 'Pago pendiente del proyecto'
        })
      }

      // Insertar los pagos
      if (pagosACrear.length > 0) {
        const { error: errorPagos } = await supabase
          .from('pagos')
          .insert(pagosACrear)

        if (errorPagos) {
          console.error('Error creando pagos:', errorPagos)
          // No hacemos throw porque el proyecto ya se creó
        }
      }

      // ========================================
      // CREAR TAREAS AUTOMÁTICAS (solo si NO es histórico)
      // ========================================
      if (!formData.es_historico) {
        const { data: tareasPlantilla, error: errorTareas } = await supabase
          .from('tareas_plantilla')
          .select('*')
          .eq('servicio_id', formData.servicio_id)
          .order('orden', { ascending: true })

        if (!errorTareas && tareasPlantilla && tareasPlantilla.length > 0) {
          const fechaInicio = formData.fecha_inicio ? new Date(formData.fecha_inicio) : new Date()
          
          const tareasACrear = tareasPlantilla.map(plantilla => {
            let fechaVencimiento = null
            if (plantilla.dias_desde_inicio >= 0) {
              fechaVencimiento = new Date(fechaInicio)
              fechaVencimiento.setDate(fechaVencimiento.getDate() + plantilla.dias_desde_inicio)
            }

            return {
              proyecto_id: nuevoProyecto.id,
              titulo: plantilla.titulo,
              descripcion: plantilla.descripcion,
              asignado_a: plantilla.asignado_a,
              prioridad: plantilla.prioridad,
              estado: 'pendiente',
              fecha_vencimiento: fechaVencimiento ? fechaVencimiento.toISOString().split('T')[0] : null
            }
          })

          const { error: errorInsertTareas } = await supabase
            .from('tareas')
            .insert(tareasACrear)

          if (errorInsertTareas) {
            console.error('Error creando tareas:', errorInsertTareas)
          }
        }
      }

      // ========================================
      // MENSAJE DE ÉXITO
      // ========================================
      let mensaje = formData.es_historico 
        ? '✅ Proyecto histórico registrado correctamente'
        : '✅ Proyecto creado correctamente'

      if (formData.estado_pago === 'pagado') {
        mensaje += `\n💰 Pago registrado: ${formatCLP(precioTotal)}`
      } else if (formData.estado_pago === 'parcial') {
        mensaje += `\n💰 Pago inicial: ${formatCLP(montoPagado)}`
        mensaje += `\n⏳ Pendiente: ${formatCLP(precioTotal - montoPagado)}`
      } else {
        mensaje += `\n📅 Pago pendiente: ${formatCLP(precioTotal)}`
      }

      if (!formData.es_historico) {
        const { data: tareasCount } = await supabase
          .from('tareas')
          .select('id', { count: 'exact', head: true })
          .eq('proyecto_id', nuevoProyecto.id)
        
        if (tareasCount) {
          mensaje += `\n📋 ${tareasCount} tareas creadas`
        }
      }

      alert(mensaje)
    }

    closeModal()
    loadData()
  } catch (error) {
    console.error('Error guardando proyecto:', error)
    alert('❌ Error al guardar el proyecto: ' + error.message)
  }
}

  function openModal(proyecto = null) {
    if (proyecto) {
      setEditingProyecto(proyecto)
      setFormData({
        cliente_id: proyecto.cliente_id,
        servicio_id: proyecto.servicio_id,
        nombre: proyecto.nombre,
        precio: proyecto.precio,
        estado: proyecto.estado,
        fecha_inicio: proyecto.fecha_inicio || '',
        fecha_fin: proyecto.fecha_fin || '',
        notas: proyecto.notas || '',
        es_historico: proyecto.es_historico || false,
        estado_pago: proyecto.estado_pago || 'pendiente',
        monto_pagado: proyecto.monto_pagado || '',
        fecha_proximo_pago: proyecto.fecha_proximo_pago || '',
        tipo_documento: proyecto.tipo_documento || 'factura'
      })
    } else {
      setEditingProyecto(null)
      setFormData({
        cliente_id: '',
        servicio_id: '',
        nombre: '',
        precio: '',
        estado: 'activo',
        fecha_inicio: '',
        fecha_fin: '',
        notas: '',
        es_historico: false,
        estado_pago: 'pendiente',
        monto_pagado: '',
        fecha_proximo_pago: '',
        tipo_documento: 'factura'
      })
    }
    setErrors({})
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingProyecto(null)
    setFormData({
      cliente_id: '',
      servicio_id: '',
      nombre: '',
      precio: '',
      estado: 'activo',
      fecha_inicio: '',
      fecha_fin: '',
      notas: '',
      es_historico: false,
      estado_pago: 'pendiente',
      monto_pagado: '',
      fecha_proximo_pago: '',
      tipo_documento: 'factura'
    })
    setErrors({})
  }

  function handleServicioChange(servicioId) {
    const servicio = servicios.find(s => s.id === servicioId)
    setFormData({
      ...formData,
      servicio_id: servicioId,
      precio: servicio ? servicio.precio_base : ''
    })
  }

  function handleEstadoPagoChange(estado) {
    const updates = { estado_pago: estado }
    
    if (estado === 'pagado') {
      updates.monto_pagado = formData.precio || ''
      updates.fecha_proximo_pago = ''
    } else if (estado === 'pendiente') {
      updates.monto_pagado = ''
    }
    
    setFormData({ ...formData, ...updates })
  }

function duplicateProyecto(proyecto) {
  // Obtener fecha de hoy para el nuevo proyecto
  const hoy = new Date().toISOString().split('T')[0]
  
  // Calcular fecha próximo pago (30 días desde hoy por defecto)
  const fechaProximoPago = new Date()
  fechaProximoPago.setDate(fechaProximoPago.getDate() + 30)
  
  setEditingProyecto(null) // Importante: es un proyecto NUEVO
  setFormData({
    cliente_id: proyecto.cliente_id,
    servicio_id: proyecto.servicio_id,
    nombre: `${proyecto.nombre} (copia)`,
    precio: proyecto.precio,
    estado: 'activo',
    fecha_inicio: hoy,
    fecha_fin: '',
    notas: proyecto.notas || '',
    es_historico: false,
    estado_pago: 'pendiente',
    monto_pagado: '',
    fecha_proximo_pago: fechaProximoPago.toISOString().split('T')[0],
    tipo_documento: proyecto.tipo_documento || 'factura'
  })
  setErrors({})
  setShowModal(true)
}

  function openDeleteConfirm(proyecto) {
    setProyectoToDelete(proyecto)
    setShowDeleteConfirm(true)
  }

  async function handleDelete() {
    try {
      const { error } = await supabase
        .from('proyectos')
        .delete()
        .eq('id', proyectoToDelete.id)

      if (error) throw error

      alert('✅ Proyecto eliminado correctamente')
      setShowDeleteConfirm(false)
      setProyectoToDelete(null)
      loadData()
    } catch (error) {
      console.error('Error eliminando proyecto:', error)
      alert('❌ Error al eliminar el proyecto')
    }
  }

  function getCategoriaIcon(categoria) {
    switch (categoria) {
      case 'meta-ads': return <Target size={18} />
      case 'contenido': return <Palette size={18} />
      case 'web': return <Globe size={18} />
      default: return <Briefcase size={18} />
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

  function getCategoriaLabel(categoria) {
    switch (categoria) {
      case 'meta-ads': return 'Meta Ads'
      case 'contenido': return 'Contenido'
      case 'web': return 'Desarrollo Web'
      default: return categoria
    }
  }

  function getEstadoPagoIcon(estado) {
    switch (estado) {
      case 'pagado': return <CheckCircle size={16} />
      case 'parcial': return <AlertTriangle size={16} />
      case 'pendiente': return <Clock size={16} />
      default: return <Clock size={16} />
    }
  }

  function getEstadoPagoColor(estado) {
    switch (estado) {
      case 'pagado': return 'pago-completo'
      case 'parcial': return 'pago-parcial'
      case 'pendiente': return 'pago-pendiente'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando proyectos...</p>
      </div>
    )
  }

  return (
    <div className="proyectos-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><Briefcase size={28} /> Proyectos</h1>
          <p className="page-subtitle">
            Gestiona todos los proyectos de la agencia
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={20} />
          Nuevo Proyecto
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="filters-section">
        <div className="search-bar glass">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar por proyecto, cliente o servicio..."
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
              <option value="activo">Activos</option>
              <option value="pausado">Pausados</option>
              <option value="completado">Completados</option>
            </select>
          </div>

          <div className="filter-group">
            <Filter size={18} />
            <select
              className="input filter-select"
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
            >
              <option value="todos">Todas las categorías</option>
              <option value="meta-ads">Meta Ads</option>
              <option value="contenido">Contenido</option>
              <option value="web">Desarrollo Web</option>
            </select>
          </div>

          <div className="stats-badge glass">
            <TrendingUp size={18} />
            <span>{filteredProyectos.length} proyecto{filteredProyectos.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Lista de proyectos */}
      {filteredProyectos.length === 0 ? (
        <div className="empty-state glass">
          <Briefcase size={64} />
          <h3>
            {searchTerm || filterEstado !== 'todos' || filterCategoria !== 'todos'
              ? 'No se encontraron proyectos'
              : 'Aún no hay proyectos'}
          </h3>
          <p>
            {searchTerm || filterEstado !== 'todos' || filterCategoria !== 'todos'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza creando tu primer proyecto'}
          </p>
          {!searchTerm && filterEstado === 'todos' && filterCategoria === 'todos' && (
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={20} />
              Crear Primer Proyecto
            </button>
          )}
        </div>
      ) : (
        <div className="proyectos-grid">
          {filteredProyectos.map(proyecto => (
            <div key={proyecto.id} className="proyecto-card glass">
              {/* Header */}
              <div className="proyecto-card-header">
                <span className={`categoria-badge ${getCategoriaColor(proyecto.servicio?.categoria)}`}>
                  {getCategoriaIcon(proyecto.servicio?.categoria)}
                  {getCategoriaLabel(proyecto.servicio?.categoria)}
                </span>
                <div className="proyecto-actions">
  <button
    className="btn-icon"
    onClick={() => duplicateProyecto(proyecto)}
    title="Duplicar proyecto"
  >
    <Copy size={16} />
  </button>
  <button
    className="btn-icon"
    onClick={() => openModal(proyecto)}
    title="Editar"
  >
    <Edit2 size={16} />
  </button>
  <button
    className="btn-icon btn-icon-danger"
    onClick={() => openDeleteConfirm(proyecto)}
    title="Eliminar"
  >
    <Trash2 size={16} />
  </button>
</div>
              </div>

              {/* Body */}
              <div className="proyecto-card-body">
                <h3>
                  {proyecto.nombre}
                  {proyecto.es_historico && (
                    <span className="badge-historico" title="Proyecto histórico">
                      <History size={14} />
                    </span>
                  )}
                </h3>
                <div className="proyecto-info">
                  <Users size={14} />
                  <span>{proyecto.cliente?.nombre}</span>
                </div>
                <div className="proyecto-info">
                  <Briefcase size={14} />
                  <span>{proyecto.servicio?.nombre}</span>
                </div>
                {proyecto.fecha_inicio && (
                  <div className="proyecto-info">
                    <Calendar size={14} />
                    <span>
                      {formatDate(proyecto.fecha_inicio)}
                      {proyecto.fecha_fin && ` - ${formatDate(proyecto.fecha_fin)}`}
                    </span>
                  </div>
                )}
                
                {/* Estado de pago */}
                <div className={`proyecto-pago ${getEstadoPagoColor(proyecto.estado_pago)}`}>
                  {getEstadoPagoIcon(proyecto.estado_pago)}
                  <div className="pago-detalle">
                    {proyecto.estado_pago === 'pagado' && (
                      <span>Pagado completo</span>
                    )}
                    {proyecto.estado_pago === 'parcial' && (
                      <>
                        <span>Pagado: {formatCLP(proyecto.monto_pagado || 0)}</span>
                        <span className="pago-restante">
                          Pendiente: {formatCLP((proyecto.precio || 0) - (proyecto.monto_pagado || 0))}
                        </span>
                      </>
                    )}
                    {proyecto.estado_pago === 'pendiente' && (
                      <span>Pago pendiente</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="proyecto-card-footer">
                <div className="proyecto-price">
                  <DollarSign size={16} />
                  {formatCLP(proyecto.precio)}
                </div>
                <span className={`status-badge status-${proyecto.estado}`}>
                  {proyecto.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-large glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingProyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h2>
              <button className="btn-icon" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                {/* Proyecto Histórico */}
                {!editingProyecto && (
                  <div className="form-group full-width">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.es_historico}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          es_historico: e.target.checked,
                          estado: e.target.checked ? 'completado' : 'activo',
                          estado_pago: e.target.checked ? 'pagado' : 'pendiente'
                        })}
                      />
                      <span className="checkbox-text">
                        <History size={16} />
                        Este es un proyecto histórico
                      </span>
                    </label>
                    {formData.es_historico && (
                      <div className="info-message">
                        <Info size={14} />
                        <span>
                          Los proyectos históricos no crearán tareas automáticas, 
                          pero sí registrarán el pago correspondiente.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Cliente */}
                <div className="form-group full-width">
                  <label htmlFor="cliente">
                    Cliente <span className="required">*</span>
                  </label>
                  <select
                    id="cliente"
                    className={`input ${errors.cliente_id ? 'input-error' : ''}`}
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                  >
                    <option value="">Selecciona un cliente</option>
                    {clientes.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre} {cliente.empresa ? `(${cliente.empresa})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.cliente_id && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.cliente_id}
                    </span>
                  )}
                </div>

                {/* Servicio */}
                <div className="form-group full-width">
                  <label htmlFor="servicio">
                    Servicio <span className="required">*</span>
                  </label>
                  <select
                    id="servicio"
                    className={`input ${errors.servicio_id ? 'input-error' : ''}`}
                    value={formData.servicio_id}
                    onChange={(e) => handleServicioChange(e.target.value)}
                  >
                    <option value="">Selecciona un servicio</option>
                    <optgroup label="Meta Ads">
                      {servicios.filter(s => s.categoria === 'meta-ads').map(servicio => (
                        <option key={servicio.id} value={servicio.id}>
                          {servicio.nombre} - {formatCLP(servicio.precio_base)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Contenido para Redes">
                      {servicios.filter(s => s.categoria === 'contenido').map(servicio => (
                        <option key={servicio.id} value={servicio.id}>
                          {servicio.nombre} - {formatCLP(servicio.precio_base)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Desarrollo Web">
                      {servicios.filter(s => s.categoria === 'web').map(servicio => (
                        <option key={servicio.id} value={servicio.id}>
                          {servicio.nombre} - {formatCLP(servicio.precio_base)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Combos">
                      {servicios.filter(s => s.categoria === 'combo').map(servicio => (
                        <option key={servicio.id} value={servicio.id}>
                          {servicio.nombre} - {formatCLP(servicio.precio_base)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  {errors.servicio_id && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.servicio_id}
                    </span>
                  )}
                </div>

                {/* Nombre del Proyecto */}
                <div className="form-group full-width">
                  <label htmlFor="nombre">
                    Nombre del Proyecto <span className="required">*</span>
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    className={`input ${errors.nombre ? 'input-error' : ''}`}
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Campaña Verano 2024"
                  />
                  {errors.nombre && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.nombre}
                    </span>
                  )}
                </div>

                {/* Precio */}
                <div className="form-group">
                  <label htmlFor="precio">
                    Precio Total (CLP) <span className="required">*</span>
                  </label>
                  <input
                    id="precio"
                    type="number"
                    className={`input ${errors.precio ? 'input-error' : ''}`}
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    placeholder="319000"
                    min="0"
                    step="1"
                  />
                  {errors.precio && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.precio}
                    </span>
                  )}
                  {formData.precio && (
                    <span className="help-text">
                      {formatCLP(formData.precio)}
                    </span>
                  )}
                </div>

                {/* Estado del Proyecto */}
                <div className="form-group">
                  <label htmlFor="estado">
                    Estado del Proyecto {formData.es_historico && <span className="required">*</span>}
                  </label>
                  <select
                    id="estado"
                    className={`input ${errors.estado ? 'input-error' : ''}`}
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    disabled={formData.es_historico && !editingProyecto}
                  >
                    {!formData.es_historico && <option value="activo">Activo</option>}
                    <option value="pausado">Pausado</option>
                    <option value="completado">Completado</option>
                  </select>
                  {errors.estado && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.estado}
                    </span>
                  )}
                </div>

                {/* SECCIÓN DE PAGO */}
                <div className="form-section full-width">
                  <h3 className="section-title">
                    <DollarSign size={18} />
                    Estado de Pago
                  </h3>
                </div>

                {/* Estado del Pago */}
                <div className="form-group full-width">
                  <label>¿Cuál es el estado del pago?</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="estado_pago"
                        value="pagado"
                        checked={formData.estado_pago === 'pagado'}
                        onChange={(e) => handleEstadoPagoChange(e.target.value)}
                      />
                      <span className="radio-text">
                        <CheckCircle size={16} />
                        Ya pagaron completo
                      </span>
                    </label>

                    <label className="radio-option">
                      <input
                        type="radio"
                        name="estado_pago"
                        value="parcial"
                        checked={formData.estado_pago === 'parcial'}
                        onChange={(e) => handleEstadoPagoChange(e.target.value)}
                      />
                      <span className="radio-text">
                        <AlertTriangle size={16} />
                        Pago parcial
                      </span>
                    </label>

                    <label className="radio-option">
                      <input
                        type="radio"
                        name="estado_pago"
                        value="pendiente"
                        checked={formData.estado_pago === 'pendiente'}
                        onChange={(e) => handleEstadoPagoChange(e.target.value)}
                      />
                      <span className="radio-text">
                        <Clock size={16} />
                        Pago pendiente
                      </span>
                    </label>
                  </div>
                </div>

                {/* Monto Pagado (si es parcial) */}
                {formData.estado_pago === 'parcial' && (
                  <div className="form-group">
                    <label htmlFor="monto_pagado">
                      ¿Cuánto pagaron? <span className="required">*</span>
                    </label>
                    <input
                      id="monto_pagado"
                      type="number"
                      className={`input ${errors.monto_pagado ? 'input-error' : ''}`}
                      value={formData.monto_pagado}
                      onChange={(e) => setFormData({ ...formData, monto_pagado: e.target.value })}
                      placeholder="150000"
                      min="0"
                      step="1000"
                    />
                    {errors.monto_pagado && (
                      <span className="error-message">
                        <AlertCircle size={14} />
                        {errors.monto_pagado}
                      </span>
                    )}
                    {formData.monto_pagado && formData.precio && (
                      <span className="help-text">
                        Pagado: {formatCLP(formData.monto_pagado)} | 
                        Pendiente: {formatCLP(montoRestante)}
                      </span>
                    )}
                  </div>
                )}

                {/* Fecha próximo pago (si no está pagado completo) */}
                {formData.estado_pago !== 'pagado' && (
                  <div className="form-group">
                    <label htmlFor="fecha_proximo_pago">
                      Fecha límite de pago {formData.estado_pago === 'parcial' && <span className="required">*</span>}
                    </label>
                    <input
                      id="fecha_proximo_pago"
                      type="date"
                      className={`input ${errors.fecha_proximo_pago ? 'input-error' : ''}`}
                      value={formData.fecha_proximo_pago}
                      onChange={(e) => setFormData({ ...formData, fecha_proximo_pago: e.target.value })}
                    />
                    {errors.fecha_proximo_pago && (
                      <span className="error-message">
                        <AlertCircle size={14} />
                        {errors.fecha_proximo_pago}
                      </span>
                    )}
                  </div>
                )}

{/* SECCIÓN DE TIPO DE DOCUMENTO */}
<div className="form-section full-width">
  <h3 className="section-title">
    <FileText size={18} />
    Documento Tributario
  </h3>
</div>

{/* Tipo de Documento */}
<div className="form-group full-width">
  <label>¿Qué tipo de documento se entregó?</label>
  <div className="radio-group">
    <label className="radio-option">
      <input
        type="radio"
        name="tipo_documento"
        value="factura"
        checked={formData.tipo_documento === 'factura'}
        onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
      />
      <span className="radio-text">
        <FileText size={16} />
        Factura
      </span>
    </label>

    <label className="radio-option">
      <input
        type="radio"
        name="tipo_documento"
        value="boleta"
        checked={formData.tipo_documento === 'boleta'}
        onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
      />
      <span className="radio-text">
        <FileText size={16} />
        Boleta
      </span>
    </label>

    <label className="radio-option">
      <input
        type="radio"
        name="tipo_documento"
        value="sin_documento"
        checked={formData.tipo_documento === 'sin_documento'}
        onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
      />
      <span className="radio-text">
        <FileText size={16} />
        Sin documento
      </span>
    </label>
  </div>
  
  {/* Preview de desglose */}
  {formData.precio && (
    <div className="desglose-preview">
      {(() => {
        const desglose = calcularDesglose(formData.precio, formData.tipo_documento)
        return (
          <>
            <div className="desglose-row">
              <span>Ingreso bruto:</span>
              <span>{formatCLP(desglose.bruto)}</span>
            </div>
            {formData.tipo_documento !== 'sin_documento' && (
              <>
                <div className="desglose-row">
                  <span>IVA ({desglose.tasas.iva}%):</span>
                  <span className="text-danger">-{formatCLP(desglose.iva)}</span>
                </div>
                <div className="desglose-row">
                  <span>Neto:</span>
                  <span>{formatCLP(desglose.neto)}</span>
                </div>
                <div className="desglose-row">
                  <span>PPM ({desglose.tasas.ppm}%):</span>
                  <span className="text-danger">-{formatCLP(desglose.ppm)}</span>
                </div>
                <div className="desglose-row">
                  <span>Imp. Renta ({desglose.tasas.renta}%):</span>
                  <span className="text-danger">-{formatCLP(desglose.renta)}</span>
                </div>
              </>
            )}
            <div className="desglose-row desglose-total">
              <span>💰 Ganancia líquida:</span>
              <span className="text-success">{formatCLP(desglose.gananciaLiquida)}</span>
            </div>
          </>
        )
      })()}
    </div>
  )}
</div>

                {/* Fecha Inicio */}
                <div className="form-group">
                  <label htmlFor="fecha_inicio">
                    Fecha de Inicio {formData.es_historico && <span className="required">*</span>}
                  </label>
                  <input
                    id="fecha_inicio"
                    type="date"
                    className={`input ${errors.fecha_inicio ? 'input-error' : ''}`}
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                  />
                  {errors.fecha_inicio && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.fecha_inicio}
                    </span>
                  )}
                </div>

                {/* Fecha Fin */}
                <div className="form-group">
                  <label htmlFor="fecha_fin">Fecha de Fin</label>
                  <input
                    id="fecha_fin"
                    type="date"
                    className="input"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                  />
                </div>

                {/* Notas */}
                <div className="form-group full-width">
                  <label htmlFor="notas">Notas</label>
                  <textarea
                    id="notas"
                    className="input"
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Detalles adicionales del proyecto..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} />
                  {editingProyecto ? 'Actualizar' : 'Guardar Proyecto'}
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
                  ¿Estás seguro de eliminar el proyecto <strong>{proyectoToDelete?.nombre}</strong>?
                </p>
                <p className="warning-text">
                  Se eliminarán también todas las tareas y pagos asociados.
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