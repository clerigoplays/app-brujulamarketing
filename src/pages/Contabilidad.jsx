import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
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
  Filter,
  FileText,
  Receipt,
  Settings,
  RefreshCw,
  Repeat,
  Wallet,
  PiggyBank,
  Calculator,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  CreditCard
} from 'lucide-react'
import { supabase } from '../services/supabase'
import { formatCLP, formatDate, getDaysRemaining, formatDaysRemaining } from '../utils/formatters'
import { 
  calcularDesglose, 
  calcularTotales, 
  calcularIvaCredito,
  calcularTotalIvaCredito,
  setConfigImpuestos, 
  getConfigImpuestos,
  getFechaVencimientoIva,
  getNombreMes
} from '../utils/impuestos'
import './Contabilidad.css'

export default function Contabilidad() {
  // Estados principales
  const [activeTab, setActiveTab] = useState('resumen')
  const [loading, setLoading] = useState(true)
  const [filterPeriodo, setFilterPeriodo] = useState('mesactual')
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  })
  
  // Datos
  const [proyectos, setProyectos] = useState([])
  const [egresos, setEgresos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [configImpuestos, setConfigImpuestosState] = useState({})
  
  // Totales calculados
  const [totales, setTotales] = useState({
    bruto: 0,
    neto: 0,
    iva: 0,
    ppm: 0,
    renta: 0,
    gananciaLiquida: 0,
    totalEgresos: 0,
    utilidadNeta: 0,
    ivaCredito: 0,
    ivaAPagar: 0
  })
  
  // Modal de egresos
  const [showModalEgreso, setShowModalEgreso] = useState(false)
  const [editingEgreso, setEditingEgreso] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [egresoToDelete, setEgresoToDelete] = useState(null)
  
  // Modal de categorías
  const [showModalCategoria, setShowModalCategoria] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState(null)
  
  // Modal de configuración
  const [showModalConfig, setShowModalConfig] = useState(false)
  
  // Forms
  const [egresoForm, setEgresoForm] = useState({
    categoria_id: '',
    descripcion: '',
    monto: '',
    tipo_documento: 'sin_documento',
    es_recurrente: false,
    dia_vencimiento: '',
    fecha_vencimiento: '',
    fecha_pago: '',
    estado: 'pendiente',
    notas: ''
  })
  
  const [categoriaForm, setCategoriaForm] = useState({
    nombre: '',
    descripcion: '',
    color: '#6366f1'
  })
  
  const [configForm, setConfigForm] = useState({
    iva: 19,
    ppm: 0.125,
    renta: 25
  })
  
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    calcularTotalesDelPeriodo()
  }, [proyectos, egresos, filterPeriodo, mesSeleccionado])

  async function loadData() {
    try {
      // Cargar configuración de impuestos
      const { data: configData } = await supabase
        .from('configuracion')
        .select('*')
      
      if (configData) {
        const config = {}
        configData.forEach(c => {
          config[c.clave] = parseFloat(c.valor)
        })
        setConfigImpuestosState(config)
        setConfigImpuestos(config)
        setConfigForm({
          iva: config.iva || 19,
          ppm: config.ppm || 0.125,
          renta: config.renta || 25
        })
      }

      // Cargar proyectos
      const { data: proyectosData } = await supabase
        .from('proyectos')
        .select(`
          *,
          cliente:clientes(nombre),
          servicio:servicios(nombre)
        `)
        .order('created_at', { ascending: false })

      setProyectos(proyectosData || [])

      // Cargar categorías de egresos
      const { data: categoriasData } = await supabase
        .from('categorias_egreso')
        .select('*')
        .order('nombre')

      setCategorias(categoriasData || [])

      // Cargar egresos
      const { data: egresosData } = await supabase
        .from('egresos')
        .select(`
          *,
          categoria:categorias_egreso(nombre, color)
        `)
        .order('fecha_vencimiento', { ascending: false })

      setEgresos(egresosData || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  function calcularTotalesDelPeriodo() {
    // Filtrar por período o mes específico
    let proyectosFiltrados, egresosFiltrados
    
    if (activeTab === 'iva') {
      // Para la pestaña IVA, usar el mes seleccionado
      const [anio, mes] = mesSeleccionado.split('-').map(Number)
      proyectosFiltrados = proyectos.filter(p => {
        if (!p.fecha_inicio) return false
        const fecha = new Date(p.fecha_inicio)
        return fecha.getFullYear() === anio && fecha.getMonth() + 1 === mes
      })
      egresosFiltrados = egresos.filter(e => {
        const fecha = e.fecha_pago ? new Date(e.fecha_pago) : (e.fecha_vencimiento ? new Date(e.fecha_vencimiento) : null)
        if (!fecha) return false
        return fecha.getFullYear() === anio && fecha.getMonth() + 1 === mes
      })
    } else {
      proyectosFiltrados = filtrarPorPeriodo(proyectos, 'fecha_inicio')
      egresosFiltrados = filtrarPorPeriodo(egresos, 'fecha_vencimiento')
    }
    
    // Calcular totales de ingresos (IVA Débito)
    const totalesIngresos = calcularTotales(proyectosFiltrados)
    
    // Calcular IVA Crédito de egresos con factura
    const { totalIvaCredito } = calcularTotalIvaCredito(egresosFiltrados.filter(e => e.estado === 'pagado'))
    
    // IVA a Pagar = IVA Débito - IVA Crédito
    const ivaAPagar = Math.max(0, totalesIngresos.iva - totalIvaCredito)
    
    // Calcular total de egresos (solo pagados)
    const totalEgresos = egresosFiltrados
      .filter(e => e.estado === 'pagado')
      .reduce((sum, e) => sum + parseFloat(e.monto || 0), 0)
    
    // Utilidad neta = ganancia líquida - egresos
    const utilidadNeta = totalesIngresos.gananciaLiquida - totalEgresos
    
    setTotales({
      ...totalesIngresos,
      totalEgresos,
      utilidadNeta,
      ivaCredito: totalIvaCredito,
      ivaAPagar
    })
  }

  function filtrarPorPeriodo(items, campoFecha) {
    if (filterPeriodo === 'todos') return items
    
    const hoy = new Date()
    let fechaInicio = new Date()
    
    switch (filterPeriodo) {
      case 'mesactual':
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        break
      case '1mes':
        fechaInicio.setMonth(hoy.getMonth() - 1)
        break
      case '3meses':
        fechaInicio.setMonth(hoy.getMonth() - 3)
        break
      case '6meses':
        fechaInicio.setMonth(hoy.getMonth() - 6)
        break
      case '12meses':
        fechaInicio.setFullYear(hoy.getFullYear() - 1)
        break
      default:
        return items
    }
    
    return items.filter(item => {
      const fecha = item[campoFecha]
      if (!fecha) return false
      return new Date(fecha) >= fechaInicio
    })
  }

  // ========================================
  // CRUD EGRESOS
  // ========================================
  
  function validateEgresoForm() {
    const newErrors = {}
    if (!egresoForm.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es obligatoria'
    }
    if (!egresoForm.monto || egresoForm.monto <= 0) {
      newErrors.monto = 'Ingresa un monto válido'
    }
    if (!egresoForm.categoria_id) {
      newErrors.categoria_id = 'Selecciona una categoría'
    }
    if (egresoForm.es_recurrente && !egresoForm.dia_vencimiento) {
      newErrors.dia_vencimiento = 'Ingresa el día de vencimiento mensual'
    }
    if (!egresoForm.es_recurrente && egresoForm.estado === 'pendiente' && !egresoForm.fecha_vencimiento) {
      newErrors.fecha_vencimiento = 'Ingresa la fecha de vencimiento'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmitEgreso(e) {
    e.preventDefault()
    if (!validateEgresoForm()) return

    try {
      let fechaVencimiento = egresoForm.fecha_vencimiento
      
      if (egresoForm.es_recurrente && egresoForm.dia_vencimiento) {
        const hoy = new Date()
        fechaVencimiento = new Date(hoy.getFullYear(), hoy.getMonth(), parseInt(egresoForm.dia_vencimiento))
        if (fechaVencimiento < hoy) {
          fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1)
        }
        fechaVencimiento = fechaVencimiento.toISOString().split('T')[0]
      }

      const dataToSave = {
        categoria_id: egresoForm.categoria_id,
        descripcion: egresoForm.descripcion,
        monto: parseFloat(egresoForm.monto),
        tipo_documento: egresoForm.tipo_documento,
        es_recurrente: egresoForm.es_recurrente,
        dia_vencimiento: egresoForm.es_recurrente ? parseInt(egresoForm.dia_vencimiento) : null,
        fecha_vencimiento: fechaVencimiento || null,
        fecha_pago: egresoForm.estado === 'pagado' ? (egresoForm.fecha_pago || new Date().toISOString().split('T')[0]) : null,
        estado: egresoForm.estado,
        notas: egresoForm.notas
      }

      if (editingEgreso) {
        const { error } = await supabase
          .from('egresos')
          .update(dataToSave)
          .eq('id', editingEgreso.id)
        if (error) throw error
        alert('✅ Egreso actualizado')
      } else {
        const { error } = await supabase
          .from('egresos')
          .insert([dataToSave])
        if (error) throw error
        alert('✅ Egreso registrado')
      }

      closeModalEgreso()
      loadData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al guardar el egreso')
    }
  }

  function openModalEgreso(egreso = null) {
    if (egreso) {
      setEditingEgreso(egreso)
      setEgresoForm({
        categoria_id: egreso.categoria_id || '',
        descripcion: egreso.descripcion,
        monto: egreso.monto,
        tipo_documento: egreso.tipo_documento || 'sin_documento',
        es_recurrente: egreso.es_recurrente,
        dia_vencimiento: egreso.dia_vencimiento || '',
        fecha_vencimiento: egreso.fecha_vencimiento || '',
        fecha_pago: egreso.fecha_pago || '',
        estado: egreso.estado,
        notas: egreso.notas || ''
      })
    } else {
      setEditingEgreso(null)
      setEgresoForm({
        categoria_id: '',
        descripcion: '',
        monto: '',
        tipo_documento: 'sin_documento',
        es_recurrente: false,
        dia_vencimiento: '',
        fecha_vencimiento: '',
        fecha_pago: '',
        estado: 'pendiente',
        notas: ''
      })
    }
    setErrors({})
    setShowModalEgreso(true)
  }

  function closeModalEgreso() {
    setShowModalEgreso(false)
    setEditingEgreso(null)
    setEgresoForm({
      categoria_id: '',
      descripcion: '',
      monto: '',
      tipo_documento: 'sin_documento',
      es_recurrente: false,
      dia_vencimiento: '',
      fecha_vencimiento: '',
      fecha_pago: '',
      estado: 'pendiente',
      notas: ''
    })
    setErrors({})
  }

  async function handleDeleteEgreso() {
    try {
      const { error } = await supabase
        .from('egresos')
        .delete()
        .eq('id', egresoToDelete.id)
      if (error) throw error
      alert('✅ Egreso eliminado')
      setShowDeleteConfirm(false)
      setEgresoToDelete(null)
      loadData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al eliminar')
    }
  }

  async function marcarEgresoPagado(egreso) {
    try {
      const { error } = await supabase
        .from('egresos')
        .update({ 
          estado: 'pagado',
          fecha_pago: new Date().toISOString().split('T')[0]
        })
        .eq('id', egreso.id)
      if (error) throw error
      
      if (egreso.es_recurrente) {
        const proximaFecha = new Date()
        proximaFecha.setMonth(proximaFecha.getMonth() + 1)
        proximaFecha.setDate(egreso.dia_vencimiento)
        
        const { error: errorNuevo } = await supabase
          .from('egresos')
          .insert([{
            categoria_id: egreso.categoria_id,
            descripcion: egreso.descripcion,
            monto: egreso.monto,
            tipo_documento: egreso.tipo_documento,
            es_recurrente: true,
            dia_vencimiento: egreso.dia_vencimiento,
            fecha_vencimiento: proximaFecha.toISOString().split('T')[0],
            estado: 'pendiente',
            notas: egreso.notas
          }])
        
        if (!errorNuevo) {
          alert('✅ Pago registrado y próximo mes generado')
        }
      } else {
        alert('✅ Pago registrado')
      }
      
      loadData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al registrar pago')
    }
  }

  // ========================================
  // CRUD CATEGORÍAS
  // ========================================
  
  async function handleSubmitCategoria(e) {
    e.preventDefault()
    if (!categoriaForm.nombre.trim()) {
      setErrors({ nombre: 'El nombre es obligatorio' })
      return
    }

    try {
      if (editingCategoria) {
        const { error } = await supabase
          .from('categorias_egreso')
          .update(categoriaForm)
          .eq('id', editingCategoria.id)
        if (error) throw error
        alert('✅ Categoría actualizada')
      } else {
        const { error } = await supabase
          .from('categorias_egreso')
          .insert([categoriaForm])
        if (error) throw error
        alert('✅ Categoría creada')
      }
      
      setShowModalCategoria(false)
      setEditingCategoria(null)
      setCategoriaForm({ nombre: '', descripcion: '', color: '#6366f1' })
      loadData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al guardar')
    }
  }

  // ========================================
  // CONFIGURACIÓN DE IMPUESTOS
  // ========================================
  
  async function handleSubmitConfig(e) {
    e.preventDefault()
    try {
      await supabase.from('configuracion').update({ valor: configForm.iva }).eq('clave', 'iva')
      await supabase.from('configuracion').update({ valor: configForm.ppm }).eq('clave', 'ppm')
      await supabase.from('configuracion').update({ valor: configForm.renta }).eq('clave', 'renta')
      
      setConfigImpuestos(configForm)
      alert('✅ Configuración actualizada')
      setShowModalConfig(false)
      loadData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al guardar')
    }
  }

  // Calcular datos para IVA del mes seleccionado
  function getDatosIvaMes() {
    const [anio, mes] = mesSeleccionado.split('-').map(Number)
    const fechaVencimiento = getFechaVencimientoIva(anio, mes)
    const diasRestantes = getDaysRemaining(fechaVencimiento.toISOString().split('T')[0])
    
    return {
      anio,
      mes,
      nombreMes: getNombreMes(mes),
      fechaVencimiento,
      diasRestantes,
      ivaDebito: totales.iva,
      ivaCredito: totales.ivaCredito,
      ivaAPagar: totales.ivaAPagar
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando contabilidad...</p>
      </div>
    )
  }

  const egresosFiltrados = filtrarPorPeriodo(egresos, 'fecha_vencimiento')
  const egresosPendientes = egresosFiltrados.filter(e => e.estado === 'pendiente')
  const datosIva = getDatosIvaMes()

  return (
    <div className="contabilidad-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><Calculator size={28} /> Contabilidad</h1>
          <p className="page-subtitle">
            Control de ingresos, egresos e impuestos
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowModalConfig(true)}>
            <Settings size={20} />
            Impuestos
          </button>
          <button className="btn btn-primary" onClick={() => openModalEgreso()}>
            <Plus size={20} />
            Nuevo Egreso
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs glass">
        <button 
          className={`tab ${activeTab === 'resumen' ? 'active' : ''}`}
          onClick={() => setActiveTab('resumen')}
        >
          <TrendingUp size={18} />
          Resumen
        </button>
        <button 
          className={`tab ${activeTab === 'iva' ? 'active' : ''}`}
          onClick={() => setActiveTab('iva')}
        >
          <CreditCard size={18} />
          IVA Mensual
        </button>
        <button 
          className={`tab ${activeTab === 'egresos' ? 'active' : ''}`}
          onClick={() => setActiveTab('egresos')}
        >
          <ArrowDownCircle size={18} />
          Egresos ({egresosPendientes.length})
        </button>
        <button 
          className={`tab ${activeTab === 'categorias' ? 'active' : ''}`}
          onClick={() => setActiveTab('categorias')}
        >
          <Receipt size={18} />
          Categorías
        </button>
      </div>

      {/* Filtro de período (solo para Resumen y Egresos) */}
      {(activeTab === 'resumen' || activeTab === 'egresos') && (
        <div className="periodo-filter glass">
          <Calendar size={18} />
          <select
            className="input filter-select"
            value={filterPeriodo}
            onChange={(e) => setFilterPeriodo(e.target.value)}
          >
            <option value="mesactual">Mes actual</option>
            <option value="1mes">Último mes</option>
            <option value="3meses">Últimos 3 meses</option>
            <option value="6meses">Últimos 6 meses</option>
            <option value="12meses">Último año</option>
            <option value="todos">Todo el tiempo</option>
          </select>
        </div>
      )}

      {/* TAB: RESUMEN */}
      {activeTab === 'resumen' && (
        <div className="resumen-section">
          {/* Cards principales */}
          <div className="resumen-cards">
            <div className="resumen-card glass ingreso">
              <div className="resumen-icon">
                <ArrowUpCircle size={32} />
              </div>
              <div className="resumen-content">
                <span className="resumen-label">Ingreso Bruto</span>
                <span className="resumen-value">{formatCLP(totales.bruto)}</span>
              </div>
            </div>

            <div className="resumen-card glass impuestos">
              <div className="resumen-icon">
                <FileText size={32} />
              </div>
              <div className="resumen-content">
                <span className="resumen-label">Total Impuestos</span>
                <span className="resumen-value">-{formatCLP(totales.iva + totales.ppm + totales.renta)}</span>
              </div>
            </div>

            <div className="resumen-card glass egresos-card">
              <div className="resumen-icon">
                <ArrowDownCircle size={32} />
              </div>
              <div className="resumen-content">
                <span className="resumen-label">Total Egresos</span>
                <span className="resumen-value">-{formatCLP(totales.totalEgresos)}</span>
              </div>
            </div>

            <div className="resumen-card glass utilidad">
              <div className="resumen-icon">
                <PiggyBank size={32} />
              </div>
              <div className="resumen-content">
                <span className="resumen-label">Utilidad Neta</span>
                <span className={`resumen-value ${totales.utilidadNeta >= 0 ? 'positivo' : 'negativo'}`}>
                  {formatCLP(totales.utilidadNeta)}
                </span>
              </div>
            </div>
          </div>

          {/* Desglose detallado */}
          <div className="desglose-section">
            <div className="desglose-card glass">
              <h3><TrendingUp size={20} /> Desglose de Ingresos</h3>
              <div className="desglose-items">
                <div className="desglose-item">
                  <span>Facturas/Boletas emitidas:</span>
                  <span>{totales.cantidadFacturas + totales.cantidadBoletas}</span>
                </div>
                <div className="desglose-item">
                  <span>Sin documento:</span>
                  <span>{totales.cantidadSinDocumento}</span>
                </div>
                <div className="desglose-item total">
                  <span>Ingreso Bruto Total:</span>
                  <span className="text-primary">{formatCLP(totales.bruto)}</span>
                </div>
              </div>
            </div>

            <div className="desglose-card glass">
              <h3><FileText size={20} /> Desglose de Impuestos</h3>
              <div className="desglose-items">
                <div className="desglose-item">
                  <span>IVA Débito ({configImpuestos.iva || 19}%):</span>
                  <span className="text-danger">-{formatCLP(totales.iva)}</span>
                </div>
                <div className="desglose-item">
                  <span>IVA Crédito (de compras):</span>
                  <span className="text-success">+{formatCLP(totales.ivaCredito)}</span>
                </div>
                <div className="desglose-item">
                  <span>Neto (después de IVA):</span>
                  <span>{formatCLP(totales.neto)}</span>
                </div>
                <div className="desglose-item">
                  <span>PPM ({configImpuestos.ppm || 0.125}%):</span>
                  <span className="text-danger">-{formatCLP(totales.ppm)}</span>
                </div>
                <div className="desglose-item">
                  <span>Imp. Renta ({configImpuestos.renta || 25}%):</span>
                  <span className="text-danger">-{formatCLP(totales.renta)}</span>
                </div>
                <div className="desglose-item total">
                  <span>Ganancia Líquida:</span>
                  <span className="text-success">{formatCLP(totales.gananciaLiquida)}</span>
                </div>
              </div>
            </div>

            <div className="desglose-card glass">
              <h3><Wallet size={20} /> Flujo de Caja</h3>
              <div className="desglose-items">
                <div className="desglose-item">
                  <span>Ganancia Líquida:</span>
                  <span className="text-success">+{formatCLP(totales.gananciaLiquida)}</span>
                </div>
                <div className="desglose-item">
                  <span>Egresos Pagados:</span>
                  <span className="text-danger">-{formatCLP(totales.totalEgresos)}</span>
                </div>
                <div className="desglose-item total">
                  <span>💰 Utilidad Neta:</span>
                  <span className={totales.utilidadNeta >= 0 ? 'text-success' : 'text-danger'}>
                    {formatCLP(totales.utilidadNeta)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: IVA MENSUAL */}
      {activeTab === 'iva' && (
        <div className="iva-section">
          {/* Selector de mes */}
          <div className="mes-selector glass">
            <Calendar size={18} />
            <input
              type="month"
              className="input"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
            />
          </div>

          {/* Card principal de IVA */}
          <div className="iva-card glass">
            <div className="iva-header">
              <h2>IVA {datosIva.nombreMes} {datosIva.anio}</h2>
              <div className={`iva-vencimiento ${datosIva.diasRestantes <= 3 ? 'urgente' : ''}`}>
                <Clock size={18} />
                <span>
                  Vence el {formatDate(datosIva.fechaVencimiento)} 
                  ({datosIva.diasRestantes > 0 
                    ? `en ${datosIva.diasRestantes} días` 
                    : datosIva.diasRestantes === 0 
                      ? '¡HOY!' 
                      : `hace ${Math.abs(datosIva.diasRestantes)} días`})
                </span>
              </div>
            </div>

            <div className="iva-desglose">
              <div className="iva-row">
                <div className="iva-item debito">
                  <span className="iva-label">IVA Débito</span>
                  <span className="iva-sublabel">(IVA de tus ventas)</span>
                  <span className="iva-monto">{formatCLP(datosIva.ivaDebito)}</span>
                </div>

                <div className="iva-operador">−</div>

                <div className="iva-item credito">
                  <span className="iva-label">IVA Crédito</span>
                  <span className="iva-sublabel">(IVA de tus compras con factura)</span>
                  <span className="iva-monto">{formatCLP(datosIva.ivaCredito)}</span>
                </div>

                <div className="iva-operador">=</div>

                <div className="iva-item resultado">
                  <span className="iva-label">IVA a Pagar</span>
                  <span className="iva-sublabel">(antes del 12 de {getNombreMes(datosIva.mes === 12 ? 1 : datosIva.mes + 1)})</span>
                  <span className={`iva-monto ${datosIva.ivaAPagar > 0 ? 'apagar' : 'afavor'}`}>
                    {datosIva.ivaAPagar > 0 ? formatCLP(datosIva.ivaAPagar) : '$0 (a favor)'}
                  </span>
                </div>
              </div>
            </div>

            {datosIva.ivaAPagar > 0 && datosIva.diasRestantes <= 7 && (
              <div className="iva-alerta">
                <AlertTriangle size={20} />
                <span>
                  {datosIva.diasRestantes <= 0 
                    ? '⚠️ ¡El plazo de pago ya venció! Paga lo antes posible para evitar multas.'
                    : datosIva.diasRestantes <= 3
                      ? `⚠️ ¡Quedan solo ${datosIva.diasRestantes} días! Recuerda pagar el IVA.`
                      : `Recuerda pagar el IVA antes del 12 de ${getNombreMes(datosIva.mes === 12 ? 1 : datosIva.mes + 1)}.`}
                </span>
              </div>
            )}
          </div>

          {/* Info adicional */}
          <div className="iva-info glass">
            <h3>📋 ¿Cómo funciona?</h3>
            <ul>
              <li><strong>IVA Débito:</strong> Es el IVA que cobras a tus clientes en tus facturas/boletas.</li>
              <li><strong>IVA Crédito:</strong> Es el IVA que pagas en tus compras cuando te dan factura.</li>
              <li><strong>IVA a Pagar:</strong> Débito − Crédito. Se paga al SII antes del día 12 del mes siguiente.</li>
              <li>Si tus compras con factura son mayores a tus ventas, el IVA queda "a favor" para el próximo mes.</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB: EGRESOS */}
      {activeTab === 'egresos' && (
        <div className="egresos-section">
          {egresosFiltrados.length === 0 ? (
            <div className="empty-state glass">
              <Receipt size={64} />
              <h3>No hay egresos registrados</h3>
              <p>Comienza registrando tus gastos</p>
              <button className="btn btn-primary" onClick={() => openModalEgreso()}>
                <Plus size={20} />
                Registrar Egreso
              </button>
            </div>
          ) : (
            <div className="egresos-grid">
              {egresosFiltrados.map(egreso => {
                const diasRestantes = getDaysRemaining(egreso.fecha_vencimiento)
                const isVencido = egreso.estado === 'pendiente' && diasRestantes < 0
                const isUrgente = egreso.estado === 'pendiente' && diasRestantes >= 0 && diasRestantes <= 3
                const ivaCredito = egreso.tipo_documento === 'factura' 
                  ? calcularIvaCredito(egreso.monto, 'factura').ivaCredito 
                  : 0
                
                return (
                  <div 
                    key={egreso.id} 
                    className={`egreso-card glass ${egreso.estado === 'pagado' ? 'pagado' : ''} ${isVencido ? 'vencido' : ''} ${isUrgente ? 'urgente' : ''}`}
                  >
                    <div className="egreso-header">
                      <div 
                        className="egreso-categoria"
                        style={{ backgroundColor: egreso.categoria?.color || '#6366f1' }}
                      >
                        {egreso.categoria?.nombre || 'Sin categoría'}
                      </div>
                      <div className="egreso-badges">
                        {egreso.es_recurrente && (
                          <span className="badge-recurrente">
                            <Repeat size={14} />
                          </span>
                        )}
                        {egreso.tipo_documento === 'factura' && (
                          <span className="badge-factura">
                            <FileText size={14} />
                            Factura
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="egreso-body">
                      <h3>{egreso.descripcion}</h3>
                      <div className="egreso-monto">
                        {formatCLP(egreso.monto)}
                      </div>
                      
                      {ivaCredito > 0 && (
                        <div className="egreso-iva-credito">
                          <CreditCard size={14} />
                          IVA Crédito: {formatCLP(ivaCredito)}
                        </div>
                      )}
                      
                      <div className="egreso-fechas">
                        {egreso.estado === 'pagado' ? (
                          <span className="fecha-pago">
                            <CheckCircle size={14} />
                            Pagado el {formatDate(egreso.fecha_pago)}
                          </span>
                        ) : (
                          <span className={`fecha-vencimiento ${isVencido ? 'vencido' : isUrgente ? 'urgente' : ''}`}>
                            <Clock size={14} />
                            {formatDaysRemaining(egreso.fecha_vencimiento)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="egreso-footer">
                      {egreso.estado === 'pendiente' && (
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => marcarEgresoPagado(egreso)}
                        >
                          <CheckCircle size={16} />
                          Pagado
                        </button>
                      )}
                      <div className="egreso-actions">
                        <button className="btn-icon" onClick={() => openModalEgreso(egreso)}>
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-icon btn-icon-danger"
                          onClick={() => {
                            setEgresoToDelete(egreso)
                            setShowDeleteConfirm(true)
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: CATEGORÍAS */}
      {activeTab === 'categorias' && (
        <div className="categorias-section">
          <div className="categorias-header">
            <h3>Categorías de Egresos</h3>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingCategoria(null)
                setCategoriaForm({ nombre: '', descripcion: '', color: '#6366f1' })
                setShowModalCategoria(true)
              }}
            >
              <Plus size={16} />
              Nueva Categoría
            </button>
          </div>

          <div className="categorias-grid">
            {categorias.map(cat => (
              <div key={cat.id} className="categoria-card glass">
                <div 
                  className="categoria-color"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="categoria-info">
                  <h4>{cat.nombre}</h4>
                  {cat.descripcion && <p>{cat.descripcion}</p>}
                </div>
                <button 
                  className="btn-icon"
                  onClick={() => {
                    setEditingCategoria(cat)
                    setCategoriaForm({
                      nombre: cat.nombre,
                      descripcion: cat.descripcion || '',
                      color: cat.color
                    })
                    setShowModalCategoria(true)
                  }}
                >
                  <Edit2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: EGRESO */}
      {showModalEgreso && (
        <div className="modal-overlay" onClick={closeModalEgreso}>
          <div className="modal glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEgreso ? 'Editar Egreso' : 'Nuevo Egreso'}</h2>
              <button className="btn-icon" onClick={closeModalEgreso}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitEgreso} className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Categoría <span className="required">*</span></label>
                  <select
                    className={`input ${errors.categoria_id ? 'input-error' : ''}`}
                    value={egresoForm.categoria_id}
                    onChange={(e) => setEgresoForm({ ...egresoForm, categoria_id: e.target.value })}
                  >
                    <option value="">Selecciona una categoría</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                  {errors.categoria_id && <span className="error-message"><AlertCircle size={14} />{errors.categoria_id}</span>}
                </div>

                <div className="form-group full-width">
                  <label>Descripción <span className="required">*</span></label>
                  <input
                    type="text"
                    className={`input ${errors.descripcion ? 'input-error' : ''}`}
                    value={egresoForm.descripcion}
                    onChange={(e) => setEgresoForm({ ...egresoForm, descripcion: e.target.value })}
                    placeholder="Ej: Suscripción Canva Pro"
                  />
                  {errors.descripcion && <span className="error-message"><AlertCircle size={14} />{errors.descripcion}</span>}
                </div>

                <div className="form-group">
                  <label>Monto Total (CLP) <span className="required">*</span></label>
                  <input
                    type="number"
                    className={`input ${errors.monto ? 'input-error' : ''}`}
                    value={egresoForm.monto}
                    onChange={(e) => setEgresoForm({ ...egresoForm, monto: e.target.value })}
                    placeholder="17243"
                    min="0"
                  />
                  {errors.monto && <span className="error-message"><AlertCircle size={14} />{errors.monto}</span>}
                </div>

                <div className="form-group">
                  <label>Estado</label>
                  <select
                    className="input"
                    value={egresoForm.estado}
                    onChange={(e) => setEgresoForm({ ...egresoForm, estado: e.target.value })}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </div>

                {/* Tipo de documento */}
                <div className="form-group full-width">
                  <label>Documento recibido</label>
                  <div className="radio-group-horizontal">
                    <label className="radio-option-sm">
                      <input
                        type="radio"
                        name="tipo_doc_egreso"
                        value="factura"
                        checked={egresoForm.tipo_documento === 'factura'}
                        onChange={(e) => setEgresoForm({ ...egresoForm, tipo_documento: e.target.value })}
                      />
                      <span>Factura</span>
                    </label>
                    <label className="radio-option-sm">
                      <input
                        type="radio"
                        name="tipo_doc_egreso"
                        value="boleta"
                        checked={egresoForm.tipo_documento === 'boleta'}
                        onChange={(e) => setEgresoForm({ ...egresoForm, tipo_documento: e.target.value })}
                      />
                      <span>Boleta</span>
                    </label>
                    <label className="radio-option-sm">
                      <input
                        type="radio"
                        name="tipo_doc_egreso"
                        value="sin_documento"
                        checked={egresoForm.tipo_documento === 'sin_documento'}
                        onChange={(e) => setEgresoForm({ ...egresoForm, tipo_documento: e.target.value })}
                      />
                      <span>Sin documento</span>
                    </label>
                  </div>
                  
                  {/* Preview IVA Crédito */}
                  {egresoForm.tipo_documento === 'factura' && egresoForm.monto && (
                    <div className="iva-credito-preview">
                      <CreditCard size={14} />
                      <span>
                        IVA Crédito a favor: <strong>{formatCLP(calcularIvaCredito(egresoForm.monto, 'factura').ivaCredito)}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={egresoForm.es_recurrente}
                      onChange={(e) => setEgresoForm({ ...egresoForm, es_recurrente: e.target.checked })}
                    />
                    <span className="checkbox-text">
                      <Repeat size={16} />
                      Es un gasto mensual recurrente
                    </span>
                  </label>
                </div>

                {egresoForm.es_recurrente ? (
                  <div className="form-group">
                    <label>Día de vencimiento mensual <span className="required">*</span></label>
                    <input
                      type="number"
                      className={`input ${errors.dia_vencimiento ? 'input-error' : ''}`}
                      value={egresoForm.dia_vencimiento}
                      onChange={(e) => setEgresoForm({ ...egresoForm, dia_vencimiento: e.target.value })}
                      placeholder="15"
                      min="1"
                      max="28"
                    />
                    {errors.dia_vencimiento && <span className="error-message"><AlertCircle size={14} />{errors.dia_vencimiento}</span>}
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Fecha de vencimiento {egresoForm.estado === 'pendiente' && <span className="required">*</span>}</label>
                    <input
                      type="date"
                      className={`input ${errors.fecha_vencimiento ? 'input-error' : ''}`}
                      value={egresoForm.fecha_vencimiento}
                      onChange={(e) => setEgresoForm({ ...egresoForm, fecha_vencimiento: e.target.value })}
                    />
                    {errors.fecha_vencimiento && <span className="error-message"><AlertCircle size={14} />{errors.fecha_vencimiento}</span>}
                  </div>
                )}

                {egresoForm.estado === 'pagado' && (
                  <div className="form-group">
                    <label>Fecha de pago</label>
                    <input
                      type="date"
                      className="input"
                      value={egresoForm.fecha_pago}
                      onChange={(e) => setEgresoForm({ ...egresoForm, fecha_pago: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-group full-width">
                  <label>Notas</label>
                  <textarea
                    className="input"
                    value={egresoForm.notas}
                    onChange={(e) => setEgresoForm({ ...egresoForm, notas: e.target.value })}
                    placeholder="Información adicional..."
                    rows="2"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModalEgreso}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} />
                  {editingEgreso ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CATEGORÍA */}
      {showModalCategoria && (
        <div className="modal-overlay" onClick={() => setShowModalCategoria(false)}>
          <div className="modal modal-sm glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
              <button className="btn-icon" onClick={() => setShowModalCategoria(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitCategoria} className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Nombre <span className="required">*</span></label>
                  <input
                    type="text"
                    className={`input ${errors.nombre ? 'input-error' : ''}`}
                    value={categoriaForm.nombre}
                    onChange={(e) => setCategoriaForm({ ...categoriaForm, nombre: e.target.value })}
                    placeholder="Ej: Marketing"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Descripción</label>
                  <input
                    type="text"
                    className="input"
                    value={categoriaForm.descripcion}
                    onChange={(e) => setCategoriaForm({ ...categoriaForm, descripcion: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Color</label>
                  <input
                    type="color"
                    className="input input-color"
                    value={categoriaForm.color}
                    onChange={(e) => setCategoriaForm({ ...categoriaForm, color: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModalCategoria(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURACIÓN */}
      {showModalConfig && (
        <div className="modal-overlay" onClick={() => setShowModalConfig(false)}>
          <div className="modal modal-sm glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Settings size={20} /> Configuración de Impuestos</h2>
              <button className="btn-icon" onClick={() => setShowModalConfig(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitConfig} className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>IVA (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={configForm.iva}
                    onChange={(e) => setConfigForm({ ...configForm, iva: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>

                <div className="form-group full-width">
                  <label>PPM (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={configForm.ppm}
                    onChange={(e) => setConfigForm({ ...configForm, ppm: parseFloat(e.target.value) })}
                    step="0.001"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Impuesto a la Renta (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={configForm.renta}
                    onChange={(e) => setConfigForm({ ...configForm, renta: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModalConfig(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR */}
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
                <p>¿Eliminar el egreso <strong>"{egresoToDelete?.descripcion}"</strong>?</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDeleteEgreso}>
                <Trash2 size={18} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}