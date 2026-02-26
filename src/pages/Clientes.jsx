import { useState, useEffect } from 'react'
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone,
  Building2,
  X,
  Save,
  AlertCircle,
  Briefcase
} from 'lucide-react'
import { supabase } from '../services/supabase'
import { formatDateTime } from '../utils/formatters'
import './Clientes.css'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [filteredClientes, setFilteredClientes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [clienteToDelete, setClienteToDelete] = useState(null)
  const [estadisticas, setEstadisticas] = useState({})
  
  const [formData, setFormData] = useState({
    nombre: '',
    empresa: '',
    email: '',
    telefono: '',
    estado: 'activo',
    notas: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadClientes()
  }, [])

  useEffect(() => {
    filterClientes()
  }, [searchTerm, clientes])

  async function loadClientes() {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setClientes(data || [])
      
      // Cargar estadísticas de cada cliente
      await loadEstadisticas(data)
    } catch (error) {
      console.error('Error cargando clientes:', error)
      alert('Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  async function loadEstadisticas(clientesData) {
    const stats = {}
    
    for (const cliente of clientesData) {
      // Contar proyectos activos
      const { count } = await supabase
        .from('proyectos')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', cliente.id)
        .eq('estado', 'activo')
      
      stats[cliente.id] = { proyectosActivos: count || 0 }
    }
    
    setEstadisticas(stats)
  }

  function filterClientes() {
    if (!searchTerm.trim()) {
      setFilteredClientes(clientes)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = clientes.filter(cliente =>
      cliente.nombre.toLowerCase().includes(term) ||
      cliente.email.toLowerCase().includes(term) ||
      (cliente.empresa && cliente.empresa.toLowerCase().includes(term))
    )
    setFilteredClientes(filtered)
  }

  function validateForm() {
    const newErrors = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!validateForm()) return

    try {
      if (editingCliente) {
        // Actualizar cliente existente
        const { error } = await supabase
          .from('clientes')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCliente.id)

        if (error) throw error
        alert('✅ Cliente actualizado correctamente')
      } else {
        // Crear nuevo cliente
        const { error } = await supabase
          .from('clientes')
          .insert([formData])

        if (error) throw error
        alert('✅ Cliente creado correctamente')
      }

      closeModal()
      loadClientes()
    } catch (error) {
      console.error('Error guardando cliente:', error)
      if (error.code === '23505') {
        alert('⚠️ Ya existe un cliente con ese email')
      } else {
        alert('❌ Error al guardar el cliente')
      }
    }
  }

  function openModal(cliente = null) {
    if (cliente) {
      setEditingCliente(cliente)
      setFormData({
        nombre: cliente.nombre,
        empresa: cliente.empresa || '',
        email: cliente.email,
        telefono: cliente.telefono || '',
        estado: cliente.estado,
        notas: cliente.notas || ''
      })
    } else {
      setEditingCliente(null)
      setFormData({
        nombre: '',
        empresa: '',
        email: '',
        telefono: '',
        estado: 'activo',
        notas: ''
      })
    }
    setErrors({})
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingCliente(null)
    setFormData({
      nombre: '',
      empresa: '',
      email: '',
      telefono: '',
      estado: 'activo',
      notas: ''
    })
    setErrors({})
  }

  function openDeleteConfirm(cliente) {
    setClienteToDelete(cliente)
    setShowDeleteConfirm(true)
  }

  async function handleDelete() {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteToDelete.id)

      if (error) throw error

      alert('✅ Cliente eliminado correctamente')
      setShowDeleteConfirm(false)
      setClienteToDelete(null)
      loadClientes()
    } catch (error) {
      console.error('Error eliminando cliente:', error)
      alert('❌ Error al eliminar el cliente. Puede que tenga proyectos asociados.')
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando clientes...</p>
      </div>
    )
  }

  return (
    <div className="clientes-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><Users size={28} /> Clientes</h1>
          <p className="page-subtitle">
            Gestiona tu cartera de clientes de Brújula Marketing
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={20} />
          Nuevo Cliente
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="search-bar glass">
        <Search size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre, email o empresa..."
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

      {/* Lista de clientes */}
      {filteredClientes.length === 0 ? (
        <div className="empty-state glass">
          <Users size={64} />
          <h3>
            {searchTerm ? 'No se encontraron clientes' : 'Aún no hay clientes'}
          </h3>
          <p>
            {searchTerm 
              ? 'Intenta con otro término de búsqueda'
              : 'Comienza agregando tu primer cliente'
            }
          </p>
          {!searchTerm && (
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={20} />
              Agregar Primer Cliente
            </button>
          )}
        </div>
      ) : (
        <div className="clientes-grid">
          {filteredClientes.map(cliente => (
            <div key={cliente.id} className="cliente-card glass">
              {/* Header de la card */}
              <div className="cliente-card-header">
                <div className="cliente-avatar">
                  {cliente.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="cliente-actions">
                  <button
                    className="btn-icon"
                    onClick={() => openModal(cliente)}
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={() => openDeleteConfirm(cliente)}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Contenido de la card */}
              <div className="cliente-card-body">
                <h3>{cliente.nombre}</h3>
                {cliente.empresa && (
                  <div className="cliente-info">
                    <Building2 size={14} />
                    <span>{cliente.empresa}</span>
                  </div>
                )}
                <div className="cliente-info">
                  <Mail size={14} />
                  <span>{cliente.email}</span>
                </div>
                {cliente.telefono && (
                  <div className="cliente-info">
                    <Phone size={14} />
                    <span>{cliente.telefono}</span>
                  </div>
                )}
              </div>

              {/* Footer de la card */}
              <div className="cliente-card-footer">
                <span className={`status-badge status-${cliente.estado}`}>
                  {cliente.estado}
                </span>
                {estadisticas[cliente.id] && (
                  <div className="cliente-stats">
                    <Briefcase size={14} />
                    <span>{estadisticas[cliente.id].proyectosActivos} proyectos</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button className="btn-icon" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                {/* Nombre */}
                <div className="form-group">
                  <label htmlFor="nombre">
                    Nombre Completo <span className="required">*</span>
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    className={`input ${errors.nombre ? 'input-error' : ''}`}
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                  />
                  {errors.nombre && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.nombre}
                    </span>
                  )}
                </div>

                {/* Empresa */}
                <div className="form-group">
                  <label htmlFor="empresa">Empresa</label>
                  <input
                    id="empresa"
                    type="text"
                    className="input"
                    value={formData.empresa}
                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                    placeholder="Ej: Empresa SpA"
                  />
                </div>

                {/* Email */}
                <div className="form-group">
                  <label htmlFor="email">
                    Email <span className="required">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={`input ${errors.email ? 'input-error' : ''}`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                  {errors.email && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.email}
                    </span>
                  )}
                </div>

                {/* Teléfono */}
                <div className="form-group">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    id="telefono"
                    type="tel"
                    className="input"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+56 9 1234 5678"
                  />
                </div>

                {/* Estado */}
                <div className="form-group full-width">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    className="input"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
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
                    placeholder="Información adicional sobre el cliente..."
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
                  {editingCliente ? 'Actualizar' : 'Guardar'}
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
                  ¿Estás seguro de eliminar a <strong>{clienteToDelete?.nombre}</strong>?
                </p>
                <p className="warning-text">
                  Esta acción no se puede deshacer y eliminará todos los proyectos asociados.
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