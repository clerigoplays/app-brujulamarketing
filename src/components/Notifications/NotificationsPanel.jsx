import { useState, useRef, useEffect } from 'react'
import { 
  Bell, X, DollarSign, CheckSquare, AlertCircle,
  ChevronRight, Filter, RefreshCw, BellOff,
  FileText, Copy, Check, Download
} from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { formatCLP, formatDate } from '../../utils/formatters'
import { supabase } from '../../services/supabase'
import './NotificationsPanel.css'

// ============================================================
// MODAL GENERADOR DE INFORME — componente independiente
// ============================================================
function ModalInforme({ notif, onClose }) {
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
    const periodo = notif.fecha ? `hasta el ${formatDate(notif.fecha)}` : 'período actual'
    return `Eres un experto en marketing digital y publicidad en Meta (Facebook/Instagram). Necesito que generes un informe profesional de resultados de campaña publicitaria en formato HTML completo y autocontenido.

## DATOS DE LA CAMPAÑA
- **Cliente / Proyecto:** ${notif.cliente} — ${notif.proyecto}
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
      const titulo = `Informe ${notif.proyecto} — ${formatDate(notif.fecha) || new Date().toLocaleDateString('es-CL')}`
      const { error } = await supabase
        .from('informes_campana')
        .insert([{ proyecto_id: notif.proyecto_id, titulo, html_content: htmlCode.trim(), datos_campana: datos }])
      if (error) throw error

      const blob = new Blob([htmlCode.trim()], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `informe-${notif.proyecto?.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`
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

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{display:'flex',alignItems:'center',gap:8}}><FileText size={20}/> Generar Informe Mensual</h2>
            <p style={{fontSize:13,color:'var(--color-text-secondary)',marginTop:2}}>{notif.cliente} — {notif.proyecto}</p>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20}/></button>
        </div>

        {/* Steps */}
        <div className="informe-steps">
          {['Datos campaña', 'Generar prompt', 'Pegar HTML'].map((s, i) => (
            <div key={i} className={`step-item ${paso === i+1 ? 'active' : paso > i+1 ? 'done' : ''}`}>
              <div className="step-num">{paso > i+1 ? '✓' : i+1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>

        <div className="modal-body">

          {/* PASO 1 */}
          {paso === 1 && (
            <>
              <p className="informe-intro">Ingresa los datos reales de la campaña para generar el análisis comparativo con el mercado.</p>
              <div className="informe-grid">
                {Object.keys(datos).map(key => (
                  <div key={key} className="form-group">
                    <label>{labels[key]} <span className="required">*</span></label>
                    <input
                      type="text"
                      className="input informe-input"
                      value={datos[key]}
                      onChange={e => setDatos({...datos, [key]: e.target.value})}
                      placeholder={
                        key === 'rubro' ? 'Ej: Lácteos, Retail...' :
                        key === 'ctr' ? 'Ej: 3.5' :
                        key === 'frecuencia' ? 'Ej: 1.82' : 'Ingresa el valor'
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

          {/* PASO 2 */}
          {paso === 2 && (
            <>
              <p className="informe-intro">Copia este prompt y pégalo en Claude u otra IA. Luego copia el código HTML que te devuelva.</p>
              <div className="prompt-box">
                <pre className="prompt-text">{generarPrompt()}</pre>
              </div>
              <div className="informe-footer">
                <button className="btn btn-secondary" onClick={() => setPaso(1)}>← Volver</button>
                <button className="btn btn-outline-informe" onClick={copiarPrompt}>
                  {copiado ? <><Check size={16}/> ¡Copiado!</> : <><Copy size={16}/> Copiar Prompt</>}
                </button>
                <button className="btn btn-primary" onClick={() => setPaso(3)}>Ya tengo el código →</button>
              </div>
            </>
          )}

          {/* PASO 3 */}
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
                <button className="btn btn-primary" onClick={procesarHTML} disabled={!htmlCode.trim() || guardando}>
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

// ============================================================
// PANEL PRINCIPAL
// ============================================================
export default function NotificationsPanel({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(false)
  const [filtroPersona, setFiltroPersona] = useState('todos')
  const [modalInforme, setModalInforme] = useState(null)
  const panelRef = useRef(null)

  const { notificaciones, noLeidas, loading, recargar, getNotificacionesPorPersona } = useNotifications()
  const notificacionesFiltradas = getNotificacionesPorPersona(filtroPersona)

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target) && !modalInforme) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, modalInforme])

  function handleNotificationClick(notif) {
    setIsOpen(false)
    if (onNavigate && notif.link) onNavigate(notif.link)
  }

  function getIcon(tipo) {
    switch (tipo) {
      case 'pago-vencido': case 'pago-proximo': return <DollarSign size={18}/>
      case 'tarea-vencida': case 'tarea-proxima': case 'tarea-alta': return <CheckSquare size={18}/>
      default: return <AlertCircle size={18}/>
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

  return (
    <>
      <div className="notifications-container" ref={panelRef}>
        <button className={`notifications-trigger ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)} title="Notificaciones">
          <Bell size={22}/>
          {noLeidas > 0 && <span className="notifications-badge">{noLeidas > 9 ? '9+' : noLeidas}</span>}
        </button>

        {isOpen && (
          <div className="notifications-panel glass-strong">
            <div className="notifications-header">
              <h3><Bell size={18}/> Notificaciones</h3>
              <div className="notifications-actions">
                <button className="btn-icon-sm" onClick={recargar} title="Actualizar" disabled={loading}>
                  <RefreshCw size={16} className={loading ? 'spinning' : ''}/>
                </button>
                <button className="btn-icon-sm" onClick={() => setIsOpen(false)} title="Cerrar">
                  <X size={16}/>
                </button>
              </div>
            </div>

            <div className="notifications-filter">
              <Filter size={14}/>
              <select value={filtroPersona} onChange={e => setFiltroPersona(e.target.value)} className="filter-select">
                <option value="todos">Todas las notificaciones</option>
                <option value="Andrés">Solo de Andrés</option>
                <option value="Denisse">Solo de Denisse</option>
              </select>
            </div>

            <div className="notifications-list">
              {loading ? (
                <div className="notifications-loading">
                  <div className="loading-spinner-sm"></div>
                  <span>Cargando...</span>
                </div>
              ) : notificacionesFiltradas.length === 0 ? (
                <div className="notifications-empty">
                  <BellOff size={32}/>
                  <p>Sin notificaciones pendientes</p>
                </div>
              ) : (
                notificacionesFiltradas.map(notif => (
                  <div key={notif.id} className={`notification-item ${getPrioridadClass(notif.prioridad)}`}>
                    <div className="notification-main" onClick={() => handleNotificationClick(notif)}>
                      <div className="notif-icon">{getIcon(notif.tipo)}</div>
                      <div className="notif-content">
                        <span className="notif-titulo">{notif.titulo}</span>
                        <span className="notif-mensaje">{notif.mensaje}</span>
                        <span className="notif-detalle">{notif.detalle}</span>
                        {notif.monto && <span className="notif-monto">{formatCLP(notif.monto)}</span>}
                        {notif.fecha && <span className="notif-fecha">{formatDate(notif.fecha)}</span>}
                      </div>
                      <ChevronRight size={16} className="notif-arrow"/>
                    </div>
                    {notif.mostrarInforme && (
                      <button className="btn-generar-informe" onClick={e => { e.stopPropagation(); setIsOpen(false); setModalInforme(notif) }}>
                        <FileText size={15}/> <span>Generar informe</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {modalInforme && <ModalInforme notif={modalInforme} onClose={() => setModalInforme(null)}/>}
    </>
  )
}