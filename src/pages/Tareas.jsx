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
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Download,
  Upload
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
  const [proyectoInforme, setProyectoInforme] = useState(null)
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

      const proyectos7dias = proyectosData?.filter(p => {
        if (!p.fecha_fin) return false
        const fechaFin = new Date(p.fecha_fin)
        return fechaFin >= hoy && fechaFin <= en7Dias
      }) || []

      // Filtrar proyectos cuya tarea de informe ya fue completada
      const alertasFiltradas = []
      for (const p of proyectos7dias) {
        const { data: tareaInforme } = await supabase
          .from('tareas')
          .select('estado')
          .eq('proyecto_id', p.id)
          .eq('tipo', 'informe-mensual')
          .maybeSingle()

        if (!tareaInforme || tareaInforme.estado !== 'completada') {
          alertasFiltradas.push(p)
        }
      }
      setProyectosConAlerta(alertasFiltradas)

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

    filtered.sort((a, b) => {
      if (a.estado === 'completada' && b.estado !== 'completada') return 1
      if (b.estado === 'completada' && a.estado !== 'completada') return -1
      
      const prioridadOrder = { alta: 0, media: 1, baja: 2 }
      if (prioridadOrder[a.prioridad] !== prioridadOrder[b.prioridad]) {
        return prioridadOrder[a.prioridad] - prioridadOrder[b.prioridad]
      }
      
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
    const confirmacion = confirm(`¿Marcar ${tareasParaCompletar.length} tarea(s) como completadas?`)
    if (!confirmacion) return

    try {
      const ids = tareasParaCompletar.map(t => t.id)
      const { error } = await supabase
        .from('tareas')
        .update({ estado: 'completada', completada_el: new Date().toISOString() })
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
    const confirmacion = confirm(`¿Asignar ${tareasParaAsignar.length} tarea(s) a ${persona}?`)
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
      case 'completada': return <CheckCircle size={20} />
      case 'en-proceso': return <PlayCircle size={20} />
      case 'pendiente':
      default: return <Circle size={20} />
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

  // ============================================================
  // MODAL INFORME LOCAL
  // ============================================================
  function ModalInformeLocal({ proyecto, onClose }) {
    const [paso, setPaso] = useState(1)
    const [copiado, setCopiado] = useState(false)
    const [guardando, setGuardando] = useState(false)
    const [htmlCode, setHtmlCode] = useState('')
    const [datos, setDatos] = useState({
      rubro: '',
      inversion: '',
      personas_alcanzadas: '',
      impresiones: '',
      frecuencia: '',
      conversaciones: '',
      costo_por_conversion: '',
      ctr: ''
    })

    const labels = {
      rubro: 'Rubro del cliente',
      inversion: 'Inversión total (CLP)',
      personas_alcanzadas: 'Personas alcanzadas',
      impresiones: 'Impresiones',
      frecuencia: 'Frecuencia',
      conversaciones: 'Conversaciones / Leads',
      costo_por_conversion: 'Costo por conversación (CLP)',
      ctr: 'CTR (%)'
    }

    const todosLlenos = Object.values(datos).every(v => v.trim() !== '')

    function generarPrompt() {
      const periodo = proyecto.fecha_fin ? `hasta el ${formatDate(proyecto.fecha_fin)}` : 'período actual'
      return `Eres un experto en marketing digital y publicidad en Meta (Facebook/Instagram). Necesito que generes un informe profesional de resultados de campaña publicitaria en formato HTML completo y autocontenido.

## DATOS DE LA CAMPAÑA
- **Cliente / Proyecto:** ${proyecto.cliente?.nombre} — ${proyecto.nombre}
- **Rubro:** ${datos.rubro}
- **Período:** ${periodo}
- **Inversión total:** $${Number(datos.inversion).toLocaleString('es-CL')}
- **Personas alcanzadas:** ${Number(datos.personas_alcanzadas).toLocaleString('es-CL')}
- **Impresiones:** ${Number(datos.impresiones).toLocaleString('es-CL')}
- **Frecuencia:** ${datos.frecuencia}
- **Conversaciones / Leads generados:** ${datos.conversaciones}
- **Costo por conversación:** $${Number(datos.costo_por_conversion).toLocaleString('es-CL')}
- **CTR:** ${datos.ctr}%

## INSTRUCCIONES DE ANÁLISIS
1. Compara cada métrica con los benchmarks actuales de Meta Ads para el rubro "${datos.rubro}" en Chile/Latinoamérica.
2. Evalúa si el rendimiento es excepcional, bueno, regular o bajo para cada KPI.
3. Identifica los puntos fuertes de la campaña y las oportunidades de mejora.
4. Genera conclusiones estratégicas accionables.
5. Propón 3 próximos pasos concretos y priorizados.

## FORMATO DE ENTREGA
Devuélveme ÚNICAMENTE el código HTML completo, sin texto adicional antes ni después, sin bloques de código markdown. El informe debe seguir EXACTAMENTE esta estructura y estilos del siguiente ejemplo, reemplazando solo los datos del cliente:

\`\`\`html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe Meta Ads - ${datos.periodo || 'Período actual'}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #ffffff; color: #1a1a1a; padding: 50px 60px; max-width: 900px; margin: 0 auto; line-height: 1.6; font-size: 14px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 40px; margin-bottom: 40px; border-bottom: 2px solid #1a1a1a; gap: 20px; }
        .header-text h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 6px; }
        .header-text p { font-size: 14px; color: #666; font-weight: 400; }
        .logo { max-height: 60px; object-fit: contain; flex-shrink: 0; }
        .section { margin-bottom: 45px; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2.5px; color: #999; margin-bottom: 20px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .section-title span { font-size: 14px; }
        .resumen-box { background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%); padding: 35px; margin-bottom: 25px; }
        .resumen-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 25px; margin-bottom: 25px; }
        .resumen-item .numero { font-size: 28px; font-weight: 700; color: #1a1a1a; }
        .resumen-item .label { font-size: 11px; color: #666; font-weight: 500; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .resumen-texto { font-size: 14px; color: #444; line-height: 1.7; padding-top: 20px; border-top: 1px solid #ddd; }
        .resumen-texto strong { color: #1a1a1a; font-weight: 600; }
        .campaña { background: #fff; border: 1px solid #e5e5e5; padding: 30px; margin-bottom: 20px; }
        .campaña-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #eee; flex-wrap: wrap; gap: 10px; }
        .campaña-header h3 { font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
        .tag { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; padding: 6px 14px; font-weight: 600; white-space: nowrap; }
        .tag.winner { background: #1a1a1a; color: #fff; }
        .tag.optimize { background: #f5f5f5; color: #666; border: 1px solid #ddd; }
        .metricas-table { width: 100%; border-collapse: collapse; }
        .metricas-table tr { border-bottom: 1px solid #f0f0f0; }
        .metricas-table tr:last-child { border-bottom: none; }
        .metricas-table td { padding: 12px 0; vertical-align: middle; }
        .metricas-table .metrica-nombre { font-weight: 500; color: #333; width: 35%; }
        .metricas-table .metrica-valor { font-weight: 600; font-size: 16px; width: 25%; }
        .metricas-table .metrica-desc { color: #888; font-size: 12px; font-weight: 400; }
        .highlight { color: #1a1a1a; }
        .star { color: #f4b400; }
        .conclusiones-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
        .conclusion-box { padding: 25px; border: 1px solid #e5e5e5; }
        .conclusion-box.positivo { border-left: 4px solid #4ade80; }
        .conclusion-box.atencion { border-left: 4px solid #fbbf24; }
        .conclusion-box h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .conclusion-box.positivo h4 { color: #16a34a; }
        .conclusion-box.atencion h4 { color: #d97706; }
        .conclusion-item { margin-bottom: 18px; }
        .conclusion-item:last-child { margin-bottom: 0; }
        .conclusion-item strong { display: block; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; font-size: 13px; }
        .conclusion-item p { font-size: 12px; color: #666; line-height: 1.6; }
        .proximos-pasos { background: #f8f9fa; padding: 30px; }
        .paso-item { display: flex; gap: 20px; padding: 20px 0; border-bottom: 1px solid #e5e5e5; }
        .paso-item:last-child { border-bottom: none; padding-bottom: 0; }
        .paso-item:first-child { padding-top: 0; }
        .paso-num { font-size: 24px; font-weight: 700; color: #ddd; min-width: 40px; }
        .paso-content strong { display: block; font-weight: 600; color: #1a1a1a; margin-bottom: 5px; }
        .paso-content p { font-size: 13px; color: #666; line-height: 1.6; }
        .footer { margin-top: 50px; padding-top: 25px; border-top: 1px solid #e5e5e5; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
        .footer p { font-size: 11px; color: #999; }
        .footer-logo { max-height: 35px; opacity: 0.7; }
        @media (max-width: 768px) { body { padding: 30px 25px; } .resumen-grid { grid-template-columns: repeat(2, 1fr); } .conclusiones-grid { grid-template-columns: 1fr; } }
        @media print { .comparativa-box, .tag.winner, .conclusion-box.positivo, .conclusion-box.atencion { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .section { page-break-inside: avoid; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-text">
            <h1>📊 Informe de Resultados Meta Ads</h1>
            <p>[NOMBRE CLIENTE] · [PERÍODO DE LA CAMPAÑA]</p>
        </div>
        <img src="https://drive.google.com/thumbnail?id=1IdNEeZOx1IDXIKjA-iM5VgL0-bPo-j9q&sz=w1000" alt="Logo Agencia" class="logo">
    </div>
    <div class="section">
        <div class="section-title"><span>🎯</span> Resumen Ejecutivo</div>
        <div class="resumen-box">
            <div class="resumen-grid">
                <div class="resumen-item"><div class="numero">[INVERSIÓN]</div><div class="label">Inversión Total</div></div>
                <div class="resumen-item"><div class="numero">[PERSONAS ALCANZADAS]</div><div class="label">Personas Alcanzadas</div></div>
                <div class="resumen-item"><div class="numero">[CONVERSACIONES]</div><div class="label">Conversaciones</div></div>
                <div class="resumen-item"><div class="numero">[COSTO POR CONVERSACIÓN]</div><div class="label">Costo por Conversación</div></div>
            </div>
            <div class="resumen-texto"><strong>En resumen:</strong> [SÍNTESIS EJECUTIVA CON LOS DATOS REALES Y EVALUACIÓN DEL RENDIMIENTO]</div>
        </div>
    </div>
    <div class="section">
        <div class="section-title"><span>📈</span> Resultados de la Campaña</div>
        <div class="campaña">
            <div class="campaña-header">
                <h3>[EMOJI RUBRO] [NOMBRE CLIENTE]</h3>
                <span class="tag winner">[ETIQUETA DE RENDIMIENTO]</span>
            </div>
            <table class="metricas-table">
                <tr><td class="metrica-nombre">Inversión</td><td class="metrica-valor">[INVERSIÓN]</td><td class="metrica-desc">—</td></tr>
                <tr><td class="metrica-nombre">Personas alcanzadas</td><td class="metrica-valor">[VALOR]</td><td class="metrica-desc">Audiencia única impactada</td></tr>
                <tr><td class="metrica-nombre">Impresiones</td><td class="metrica-valor">[VALOR]</td><td class="metrica-desc">Veces que se mostró el anuncio</td></tr>
                <tr><td class="metrica-nombre">Frecuencia</td><td class="metrica-valor">[VALOR]</td><td class="metrica-desc">[EVALUACIÓN FRECUENCIA]</td></tr>
                <tr><td class="metrica-nombre">Conversaciones</td><td class="metrica-valor highlight"><span class="star">⭐</span> [VALOR]</td><td class="metrica-desc">[DESCRIPCIÓN]</td></tr>
                <tr><td class="metrica-nombre">Costo por conversación</td><td class="metrica-valor highlight"><span class="star">⭐</span> [VALOR]</td><td class="metrica-desc">[EVALUACIÓN VS BENCHMARK]</td></tr>
                <tr><td class="metrica-nombre">CTR</td><td class="metrica-valor highlight"><span class="star">⭐</span> [VALOR]%</td><td class="metrica-desc">[EVALUACIÓN VS BENCHMARK DEL RUBRO]</td></tr>
            </table>
        </div>
    </div>
    <div class="section">
        <div class="section-title"><span>💡</span> Conclusiones</div>
        <div class="conclusiones-grid">
            <div class="conclusion-box positivo">
                <h4>✅ Lo Positivo</h4>
                <div class="conclusion-item"><strong>[PUNTO POSITIVO 1]</strong><p>[DETALLE]</p></div>
                <div class="conclusion-item"><strong>[PUNTO POSITIVO 2]</strong><p>[DETALLE]</p></div>
                <div class="conclusion-item"><strong>[PUNTO POSITIVO 3]</strong><p>[DETALLE]</p></div>
            </div>
            <div class="conclusion-box atencion">
                <h4>⚠️ Oportunidades Estratégicas</h4>
                <div class="conclusion-item"><strong>[OPORTUNIDAD 1]</strong><p>[DETALLE]</p></div>
                <div class="conclusion-item"><strong>[OPORTUNIDAD 2]</strong><p>[DETALLE]</p></div>
            </div>
        </div>
    </div>
    <div class="section">
        <div class="section-title"><span>🚀</span> Próximos Pasos</div>
        <div class="proximos-pasos">
            <div class="paso-item"><div class="paso-num">01</div><div class="paso-content"><strong>[PASO 1]</strong><p>[DETALLE]</p></div></div>
            <div class="paso-item"><div class="paso-num">02</div><div class="paso-content"><strong>[PASO 2]</strong><p>[DETALLE]</p></div></div>
            <div class="paso-item"><div class="paso-num">03</div><div class="paso-content"><strong>[PASO 3]</strong><p>[DETALLE]</p></div></div>
        </div>
    </div>
    <div class="footer">
        <p>Informe generado · [MES Y AÑO]</p>
        <img src="https://drive.google.com/thumbnail?id=1IdNEeZOx1IDXIKjA-iM5VgL0-bPo-j9q&sz=w1000" alt="Logo" class="footer-logo">
    </div>
</body>
</html>
\`\`\``
 }

    function copiarPrompt() {
      navigator.clipboard.writeText(generarPrompt())
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    }

    async function procesarHTML() {
      if (!htmlCode.trim()) return
      setGuardando(true)
      try {
        const titulo = `Informe ${proyecto.nombre} — ${formatDate(proyecto.fecha_fin) || new Date().toLocaleDateString('es-CL')}`
        const { error } = await supabase
          .from('informes_campana')
          .insert([{ proyecto_id: proyecto.id, titulo, html_content: htmlCode.trim(), datos_campana: datos }])
        if (error) throw error

        const blob = new Blob([htmlCode.trim()], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `informe-${proyecto.nombre?.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`
        a.click()
        URL.revokeObjectURL(url)
        alert('✅ Informe guardado y descargado correctamente')
        onClose()
      } catch (err) {
        console.error(err)
        alert('❌ Error al guardar el informe')
      } finally {
        setGuardando(false)
      }
    }

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-informe-container" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2 style={{display:'flex',alignItems:'center',gap:8}}>
                <FileText size={20}/> Generar Informe Mensual
              </h2>
              <p style={{fontSize:13,color:'var(--color-text-secondary)',marginTop:2}}>
                {proyecto.cliente?.nombre} — {proyecto.nombre}
              </p>
            </div>
            <button className="btn-icon" onClick={onClose}><X size={20}/></button>
          </div>

          <div className="informe-steps">
            {['Datos campaña','Generar prompt','Pegar HTML'].map((s,i) => (
              <div key={i} className={`step-item ${paso===i+1?'active':paso>i+1?'done':''}`}>
                <div className="step-num">{paso>i+1?'✓':i+1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          <div className="modal-body">
            {paso === 1 && (
              <>
                <div className="csv-upload-bar">
                  <span className="csv-label">¿Tienes el reporte de Meta?</span>
                  <label className="btn-csv">
                    <Upload size={14}/> Cargar CSV
                    <input
                      type="file"
                      accept=".csv"
                      style={{display:'none'}}
                      onChange={async e => {
                        const file = e.target.files[0]
                        if (!file) return
                        const text = await file.text()
                        const lines = text.split('\n').filter(l => l.trim())
                        const sep = lines[0].includes(';') ? ';' : ','
                        function parseCsvLine(line) {
                          const result = []
                          let cur = '', inQ = false
                          for (let i = 0; i < line.length; i++) {
                            const c = line[i]
                            if (c === '"') { inQ = !inQ }
                            else if (c === sep && !inQ) { result.push(cur.trim()); cur = '' }
                            else { cur += c }
                          }
                          result.push(cur.trim())
                          return result
                        }
                        const headers = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g,'').trim())
                        const values = parseCsvLine(lines[1] || '').map(v => v.replace(/^"|"$/g,'').trim())
                        const row = {}
                        headers.forEach((h, i) => { row[h] = values[i] || '' })

                        const mapeo = {
                          'Alcance': 'personas_alcanzadas',
                          'Impresiones': 'impresiones',
                          'Frecuencia': 'frecuencia',
                          'Resultados': 'conversaciones',
                          'Costo por resultados': 'costo_por_conversion',
                          'CTR (porcentaje de clics en el enlace)': 'ctr',
                          'Importe gastado (CLP)': 'inversion',
                        }
                        const nuevos = { ...datos }
                        // Campos que deben redondearse a entero (pesos)
                        const camposEnteros = ['inversion', 'personas_alcanzadas', 'impresiones', 'conversaciones', 'costo_por_conversion']
                        // Campos que conservan decimales
                        const camposDecimales = ['frecuencia', 'ctr']

                        Object.entries(mapeo).forEach(([col, campo]) => {
                          const val = row[col]
                          if (val !== undefined && val !== '') {
                            // El CSV de Meta usa punto como separador decimal (notación anglosajona)
                            // Primero parseamos el número real
                            const numReal = parseFloat(val)
                            if (isNaN(numReal)) {
                              nuevos[campo] = val
                            } else if (camposEnteros.includes(campo)) {
                              // Redondear a entero y mostrar sin decimales
                              nuevos[campo] = String(Math.round(numReal))
                            } else if (camposDecimales.includes(campo)) {
                              // Conservar hasta 2 decimales, usando punto (el campo acepta texto libre)
                              nuevos[campo] = String(Math.round(numReal * 100) / 100)
                            } else {
                              nuevos[campo] = String(numReal)
                            }
                          }
                        })
                        try {
                          const { data: proy } = await supabase
                            .from('proyectos')
                            .select('cliente:clientes(rubro)')
                            .eq('id', proyecto.id)
                            .single()
                          if (proy?.cliente?.rubro) nuevos.rubro = proy.cliente.rubro
                        } catch(_) {}
                        setDatos(nuevos)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                <p className="informe-intro">Revisa o completa los datos antes de continuar.</p>
                <div className="informe-grid">
                  {Object.keys(datos).map(key => (
                    <div key={key} className="form-group">
                      <label>{labels[key]} <span className="required">*</span></label>
                      <input
                        type="text"
                        className="input informe-input"
                        value={datos[key]}
                        onChange={e => setDatos({...datos,[key]:e.target.value})}
                        placeholder={
                          key==='rubro' ? 'Ej: Lácteos, Retail...' :
                          key==='ctr' ? 'Ej: 3.5' :
                          key==='frecuencia' ? 'Ej: 1.82' : 'Ingresa el valor'
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="informe-footer">
                  <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                  <button className="btn btn-primary" onClick={() => setPaso(2)} disabled={!todosLlenos}>
                    Continuar →
                  </button>
                </div>
              </>
            )}

            {paso === 2 && (
              <>
                <p className="informe-intro">Copia este prompt y pégalo en Claude u otra IA. Luego copia el código HTML que te devuelva.</p>
                <div className="prompt-box">
                  <pre className="prompt-text">{generarPrompt()}</pre>
                </div>
                <div className="informe-footer">
                  <button className="btn btn-secondary" onClick={() => setPaso(1)}>← Volver</button>
                  <button className="btn-outline-informe" onClick={copiarPrompt}>
                    {copiado ? <><Check size={16}/> ¡Copiado!</> : <><Copy size={16}/> Copiar Prompt</>}
                  </button>
                  <button className="btn btn-primary" onClick={() => setPaso(3)}>
                    Ya tengo el código →
                  </button>
                </div>
              </>
            )}

            {paso === 3 && (
              <>
                <p className="informe-intro">Pega aquí el código HTML. Se guardará en la base de datos y se descargará localmente.</p>
                <textarea
                  className="html-textarea"
                  value={htmlCode}
                  onChange={e => setHtmlCode(e.target.value)}
                  placeholder={'<!DOCTYPE html>\n<html>\n  ...\n</html>'}
                />
                <div className="informe-footer">
                  <button className="btn btn-secondary" onClick={() => setPaso(2)}>← Volver</button>
                  <button className="btn btn-primary" onClick={procesarHTML} disabled={!htmlCode.trim()||guardando}>
                    {guardando ? 'Guardando...' : <><Download size={16}/> Procesar y Guardar</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tareas-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><CheckSquare size={28} /> Tareas</h1>
          <p className="page-subtitle">Organiza el trabajo del equipo</p>
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

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon icon-blue">
            <CheckSquare size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.total}</span>
            <span className="stat-label">Total Tareas</span>
          </div>
        </div>
        <div className="stat-card glass">
          <div className="stat-icon icon-orange">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.pendientes}</span>
            <span className="stat-label">Pendientes</span>
          </div>
        </div>
        <div className="stat-card glass">
          <div className="stat-icon icon-purple">
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

      {/* Alerta de servicios por terminar */}
      {proyectosConAlerta.length > 0 && (
        <div className="alerta-servicios glass">
          <AlertTriangle size={20} />
          <div className="alerta-content">
            <strong>⚠️ Servicios por terminar en los próximos 7 días:</strong>
            <div className="alerta-lista">
              {proyectosConAlerta.map(p => {
                const dias = getDaysRemaining(p.fecha_fin)
                const esUrgente = dias !== null && dias <= 3
                return (
                  <span key={p.id} className={`alerta-item ${esUrgente ? 'alerta-item-urgente' : ''}`}>
                    {p.cliente?.nombre} - {p.nombre} ({formatDate(p.fecha_fin)})
                    {esUrgente && (
                      <button
                        className="btn-informe-alerta"
                        title="Generar informe mensual"
                        onClick={() => setProyectoInforme(p)}
                      >
                        <FileText size={13}/> Generar informe
                      </button>
                    )}
                  </span>
                )
              })}
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
            <button className="btn btn-success" onClick={marcarTodasCompletadas}>
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
                  <UserCheck size={16} />
                  {persona}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
                    {tarea.proyecto?.cliente?.nombre && (
                      <span className="tarea-cliente">
                        <Users size={14} />
                        {tarea.proyecto.cliente.nombre}
                      </span>
                    )}
                    {tarea.proyecto && (
                      <span className="tarea-proyecto">
                        <Briefcase size={14} />
                        {tarea.proyecto.nombre}
                      </span>
                    )}
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
              <h2>{editingTarea ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
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

                {/* Proyecto */}
                <div className="form-group full-width">
                  <label htmlFor="proyecto">Proyecto</label>
                  <select
                    id="proyecto"
                    className="input"
                    value={formData.proyecto_id}
                    onChange={(e) => setFormData({ ...formData, proyecto_id: e.target.value })}
                  >
                    <option value="">Sin proyecto asignado</option>
                    {proyectos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.cliente?.nombre} - {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descripción */}
                <div className="form-group full-width">
                  <label htmlFor="descripcion">Descripción</label>
                  <textarea
                    id="descripcion"
                    className="input"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Detalles adicionales..."
                    rows="2"
                  />
                </div>

                {/* Asignado a */}
                <div className="form-group">
                  <label htmlFor="asignado">Asignado a</label>
                  <select
                    id="asignado"
                    className="input"
                    value={formData.asignado_a}
                    onChange={(e) => setFormData({ ...formData, asignado_a: e.target.value })}
                  >
                    <option value="">Sin asignar</option>
                    {equipo.map(persona => (
                      <option key={persona} value={persona}>{persona}</option>
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
                    <option value="pendiente">Pendiente</option>
                    <option value="en-proceso">En Proceso</option>
                    <option value="completada">Completada</option>
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

      {/* Modal informe campaña */}
      {proyectoInforme && (
        <ModalInformeLocal
          proyecto={proyectoInforme}
          onClose={() => setProyectoInforme(null)}
        />
      )}
    </div>
  )
}
