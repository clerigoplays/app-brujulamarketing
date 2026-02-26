import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  Save,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  TrendingUp,
  Briefcase,
  CreditCard,
  CalendarRange
} from 'lucide-react'
import { supabase } from '../services/supabase'
import { formatCLP, formatDate, getDaysRemaining, formatDaysRemaining } from '../utils/formatters'
import './Pagos.css'

export default function Pagos() {
  const [pagos, setPagos] = useState([])
  const [filteredPagos, setFilteredPagos] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterPeriodo, setFilterPeriodo] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPago, setEditingPago] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pagoToDelete, setPagoToDelete] = useState(null)
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    pagado: 0,
    pendiente: 0,
    vencido: 0
  })
  
  const [formData, setFormData] = useState({
    proyecto_id: '',
    monto: '',
    fecha_esperada: '',
    fecha_pago: '',
    estado: 'pendiente',
    metodo_pago: '',
    notas: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterPagos()
    calcularEstadisticas()
  }, [searchTerm, filterEstado, filterPeriodo, pagos])

  async function loadData() {
    try {
      const { data: pagosData, error: pagosError } = await supabase
        .from('pagos')
        .select(`
          *,
          proyecto:proyectos(
            id,
            nombre,
            cliente:clientes(nombre, empresa)
          )
        `)
        .order('fecha_esperada', { ascending: false })

      if (pagosError) throw pagosError
      
      const pagosActualizados = pagosData.map(pago => {
        if (pago.estado === 'pendiente') {
          const dias = getDaysRemaining(pago.fecha_esperada)
          if (dias < 0) {
            return { ...pago, estado: 'vencido' }
          }
        }
        return pago
      })
      
      setPagos(pagosActualizados || [])

      const { data: proyectosData, error: proyectosError } = await supabase
        .from('proyectos')
        .select(`
          id,
          nombre,
          precio,
          cliente:clientes(nombre)
        `)
        .eq('estado', 'activo')
        .order('nombre')

      if (proyectosError) throw proyectosError
      setProyectos(proyectosData || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  function filterPagos() {
    let filtered = [...pagos]

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(pago =>
        pago.proyecto?.nombre.toLowerCase().includes(term) ||
        pago.proyecto?.cliente?.nombre.toLowerCase().includes(term) ||
        pago.metodo_pago?.toLowerCase().includes(term)
      )
    }

    // Filtrar por estado
    if (filterEstado !== 'todos') {
      filtered = filtered.filter(p => p.estado === filterEstado)
    }

    // Filtrar por período
    if (filterPeriodo !== 'todos') {
      const hoy = new Date()
      const fechaLimite = new Date()
      
      switch (filterPeriodo) {
        case '1mes':
          fechaLimite.setMonth(hoy.getMonth() - 1)
          break
        case '2meses':
          fechaLimite.setMonth(hoy.getMonth() - 2)
          break
        case '3meses':
          fechaLimite.setMonth(hoy.getMonth() - 3)
          break
        case '6meses':
          fechaLimite.setMonth(hoy.getMonth() - 6)
          break
        case '12meses':
          fechaLimite.setFullYear(hoy.getFullYear() - 1)
          break
        case 'mesactual':
          fechaLimite.setDate(1) // Primer día del mes actual
          break
      }

      filtered = filtered.filter(pago => {
        const fechaPago = pago.fecha_pago ? new Date(pago.fecha_pago) : new Date(pago.fecha_esperada)
        return fechaPago >= fechaLimite
      })
    }

    setFilteredPagos(filtered)
  }

  function calcularEstadisticas() {
    const stats = {
      total: filteredPagos.length,
      pagado: filteredPagos.filter(p => p.estado === 'pagado').reduce((sum, p) => sum + Number(p.monto), 0),
      pendiente: filteredPagos.filter(p => p.estado === 'pendiente').reduce((sum, p) => sum + Number(p.monto), 0),
      vencido: filteredPagos.filter(p => p.estado === 'vencido').reduce((sum, p) => sum + Number(p.monto), 0)
    }
    setEstadisticas(stats)
  }

  function validateForm() {
    const newErrors = {}

    if (!formData.proyecto_id) {
      newErrors.proyecto_id = 'Selecciona un proyecto'
    }

    if (!formData.monto || formData.monto <= 0) {
      newErrors.monto = 'Ingresa un monto válido'
    }

    if (!formData.fecha_esperada) {
      newErrors.fecha_esperada = 'Selecciona la fecha esperada de pago'
    }

    if (formData.estado === 'pagado' && !formData.fecha_pago) {
      newErrors.fecha_pago = 'Ingresa la fecha en que se realizó el pago'
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
        monto: parseFloat(formData.monto),
        fecha_pago: formData.estado === 'pagado' ? formData.fecha_pago : null
      }

      if (editingPago) {
        const { error } = await supabase
          .from('pagos')
          .update(dataToSave)
          .eq('id', editingPago.id)

        if (error) throw error
        alert('✅ Pago actualizado correctamente')
      } else {
        const { error } = await supabase
          .from('pagos')
          .insert([dataToSave])

        if (error) throw error
        alert('✅ Pago registrado correctamente')
      }

      closeModal()
      loadData()
    } catch (error) {
      console.error('Error guardando pago:', error)
      alert('❌ Error al guardar el pago')
    }
  }

  function openModal(pago = null) {
    if (pago) {
      setEditingPago(pago)
      setFormData({
        proyecto_id: pago.proyecto_id,
        monto: pago.monto,
        fecha_esperada: pago.fecha_esperada,
        fecha_pago: pago.fecha_pago || '',
        estado: pago.estado,
        metodo_pago: pago.metodo_pago || '',
        notas: pago.notas || ''
      })
    } else {
      setEditingPago(null)
      setFormData({
        proyecto_id: '',
        monto: '',
        fecha_esperada: '',
        fecha_pago: '',
        estado: 'pendiente',
        metodo_pago: '',
        notas: ''
      })
    }
    setErrors({})
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingPago(null)
    setFormData({
      proyecto_id: '',
      monto: '',
      fecha_esperada: '',
      fecha_pago: '',
      estado: 'pendiente',
      metodo_pago: '',
      notas: ''
    })
    setErrors({})
  }

  function handleProyectoChange(proyectoId) {
    const proyecto = proyectos.find(p => p.id === proyectoId)
    setFormData({
      ...formData,
      proyecto_id: proyectoId,
      monto: proyecto ? proyecto.precio : ''
    })
  }

  function openDeleteConfirm(pago) {
    setPagoToDelete(pago)
    setShowDeleteConfirm(true)
  }

  async function handleDelete() {
    try {
      const { error } = await supabase
        .from('pagos')
        .delete()
        .eq('id', pagoToDelete.id)

      if (error) throw error

      alert('✅ Pago eliminado correctamente')
      setShowDeleteConfirm(false)
      setPagoToDelete(null)
      loadData()
    } catch (error) {
      console.error('Error eliminando pago:', error)
      alert('❌ Error al eliminar el pago')
    }
  }

  function getEstadoIcon(estado) {
    switch (estado) {
      case 'pagado':
        return <CheckCircle size={18} />
      case 'pendiente':
        return <Clock size={18} />
      case 'vencido':
        return <XCircle size={18} />
      default:
        return <Clock size={18} />
    }
  }

  function getEstadoColor(estado) {
    switch (estado) {
      case 'pagado':
        return 'estado-pagado'
      case 'pendiente':
        return 'estado-pendiente'
      case 'vencido':
        return 'estado-vencido'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando pagos...</p>
      </div>
    )
  }

  return (
    <div className="pagos-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><DollarSign size={28} /> Pagos</h1>
          <p className="page-subtitle">
            Control de pagos e ingresos de la agencia
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={20} />
          Registrar Pago
        </button>
      </div>

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon icon-green">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCLP(estadisticas.pagado)}</span>
            <span className="stat-label">Total Pagado</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon icon-orange">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCLP(estadisticas.pendiente)}</span>
            <span className="stat-label">Pendiente de Pago</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon icon-red">
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCLP(estadisticas.vencido)}</span>
            <span className="stat-label">Pagos Vencidos</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon icon-blue">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.total}</span>
            <span className="stat-label">Total de Pagos</span>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="filters-section">
        <div className="search-bar glass">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar por proyecto, cliente o método de pago..."
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
              <option value="pagado">Pagados</option>
              <option value="pendiente">Pendientes</option>
              <option value="vencido">Vencidos</option>
            </select>
          </div>

          <div className="filter-group">
            <CalendarRange size={18} />
            <select
              className="input filter-select"
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value)}
            >
              <option value="todos">Todos los períodos</option>
              <option value="mesactual">Mes actual</option>
              <option value="1mes">Último mes</option>
              <option value="2meses">Últimos 2 meses</option>
              <option value="3meses">Últimos 3 meses</option>
              <option value="6meses">Últimos 6 meses</option>
              <option value="12meses">Último año</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de pagos */}
      {filteredPagos.length === 0 ? (
        <div className="empty-state glass">
          <DollarSign size={64} />
          <h3>
            {searchTerm || filterEstado !== 'todos' || filterPeriodo !== 'todos'
              ? 'No se encontraron pagos'
              : 'Aún no hay pagos registrados'}
          </h3>
          <p>
            {searchTerm || filterEstado !== 'todos' || filterPeriodo !== 'todos'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza registrando el primer pago'}
          </p>
          {!searchTerm && filterEstado === 'todos' && filterPeriodo === 'todos' && (
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={20} />
              Registrar Primer Pago
            </button>
          )}
        </div>
      ) : (
        <div className="pagos-grid">
          {filteredPagos.map(pago => {
            const diasRestantes = getDaysRemaining(pago.fecha_esperada)
            const isUrgente = pago.estado === 'pendiente' && diasRestantes >= 0 && diasRestantes <= 3
            
            return (
              <div key={pago.id} className={`pago-card glass ${getEstadoColor(pago.estado)}`}>
                {/* Header */}
                <div className="pago-card-header">
                  <div className="pago-estado-badge">
                    {getEstadoIcon(pago.estado)}
                    <span>{pago.estado}</span>
                  </div>
                  <div className="pago-actions">
                    <button
                      className="btn-icon"
                      onClick={() => openModal(pago)}
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={() => openDeleteConfirm(pago)}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="pago-card-body">
                  <div className="pago-monto">
                    {formatCLP(pago.monto)}
                  </div>
                  
                  <div className="pago-info">
                    <Briefcase size={14} />
                    <span>{pago.proyecto?.nombre}</span>
                  </div>
                  
                  <div className="pago-info">
                    <Calendar size={14} />
                    <span>
                      {pago.estado === 'pagado' 
                        ? `Pagado el ${formatDate(pago.fecha_pago)}`
                        : `Vence ${formatDaysRemaining(pago.fecha_esperada)}`
                      }
                    </span>
                  </div>

                  {isUrgente && (
                    <div className="pago-alerta">
                      <AlertCircle size={14} />
                      <span>¡Pago próximo a vencer!</span>
                    </div>
                  )}

                  {pago.metodo_pago && (
                    <div className="pago-info">
                      <CreditCard size={14} />
                      <span>{pago.metodo_pago}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="pago-card-footer">
                  <span className="pago-cliente">
                    {pago.proyecto?.cliente?.nombre}
                  </span>
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
                {editingPago ? 'Editar Pago' : 'Registrar Pago'}
              </h2>
              <button className="btn-icon" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                {/* Proyecto */}
                <div className="form-group full-width">
                  <label htmlFor="proyecto">
                    Proyecto <span className="required">*</span>
                  </label>
                  <select
                    id="proyecto"
                    className={`input ${errors.proyecto_id ? 'input-error' : ''}`}
                    value={formData.proyecto_id}
                    onChange={(e) => handleProyectoChange(e.target.value)}
                  >
                    <option value="">Selecciona un proyecto</option>
                    {proyectos.map(proyecto => (
                      <option key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre} - {proyecto.cliente?.nombre} ({formatCLP(proyecto.precio)})
                      </option>
                    ))}
                  </select>
                  {errors.proyecto_id && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.proyecto_id}
                    </span>
                  )}
                </div>

                {/* Monto */}
                <div className="form-group">
                  <label htmlFor="monto">
                    Monto (CLP) <span className="required">*</span>
                  </label>
                  <input
                    id="monto"
                    type="number"
                    className={`input ${errors.monto ? 'input-error' : ''}`}
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    placeholder="150000"
                    min="0"
                    step="1000"
                  />
                  {errors.monto && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.monto}
                    </span>
                  )}
                  {formData.monto && (
                    <span className="help-text">
                      {formatCLP(formData.monto)}
                    </span>
                  )}
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
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </div>

                {/* Fecha Esperada */}
                <div className="form-group">
                  <label htmlFor="fecha_esperada">
                    Fecha Esperada <span className="required">*</span>
                  </label>
                  <input
                    id="fecha_esperada"
                    type="date"
                    className={`input ${errors.fecha_esperada ? 'input-error' : ''}`}
                    value={formData.fecha_esperada}
                    onChange={(e) => setFormData({ ...formData, fecha_esperada: e.target.value })}
                  />
                  {errors.fecha_esperada && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.fecha_esperada}
                    </span>
                  )}
                </div>

                {/* Fecha de Pago (solo si está pagado) */}
                {formData.estado === 'pagado' && (
                  <div className="form-group">
                    <label htmlFor="fecha_pago">
                      Fecha de Pago <span className="required">*</span>
                    </label>
                    <input
                      id="fecha_pago"
                      type="date"
                      className={`input ${errors.fecha_pago ? 'input-error' : ''}`}
                      value={formData.fecha_pago}
                      onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                    />
                    {errors.fecha_pago && (
                      <span className="error-message">
                        <AlertCircle size={14} />
                        {errors.fecha_pago}
                      </span>
                    )}
                  </div>
                )}

                {/* Método de Pago */}
                <div className="form-group full-width">
                  <label htmlFor="metodo_pago">Método de Pago</label>
                  <select
                    id="metodo_pago"
                    className="input"
                    value={formData.metodo_pago}
                    onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                  >
                    <option value="">Selecciona un método</option>
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Flow">Flow</option>
                    <option value="Webpay">Webpay</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                {/* Notas */}
                <div className="form-group full-width">
                  <label htmlFor="notas">Notas</label>
                  <textarea
                    id="notas"
                    className="input"
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Información adicional sobre el pago..."
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
                  {editingPago ? 'Actualizar' : 'Guardar'}
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
                  ¿Estás seguro de eliminar este pago de <strong>{formatCLP(pagoToDelete?.monto)}</strong>?
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