import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { getDaysRemaining } from '../utils/formatters'

export function useNotifications() {
  const [notificaciones, setNotificaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [noLeidas, setNoLeidas] = useState(0)

  const cargarNotificaciones = useCallback(async () => {
    try {
      const notifs = []
      const ahora = new Date()
      ahora.setHours(0, 0, 0, 0)

      // ========================================
      // 1. PAGOS VENCIDOS
      // ========================================
      const { data: pagosVencidos } = await supabase
        .from('pagos')
        .select(`
          *,
          proyecto:proyectos(nombre, cliente:clientes(nombre))
        `)
        .in('estado', ['pendiente', 'vencido'])
        .lt('fecha_esperada', ahora.toISOString().split('T')[0])

      pagosVencidos?.forEach(pago => {
        const dias = Math.abs(getDaysRemaining(pago.fecha_esperada))
        notifs.push({
          id: `pago-vencido-${pago.id}`,
          tipo: 'pago-vencido',
          prioridad: 'alta',
          titulo: 'Pago vencido',
          mensaje: `${pago.proyecto?.cliente?.nombre} - ${pago.proyecto?.nombre}`,
          detalle: `Venció hace ${dias} día${dias !== 1 ? 's' : ''}`,
          monto: pago.monto,
          fecha: pago.fecha_esperada,
          link: 'pagos'
        })
      })

      // ========================================
      // 2. PAGOS PRÓXIMOS (próximos 5 días)
      // ========================================
      const fechaLimite = new Date()
      fechaLimite.setDate(fechaLimite.getDate() + 5)

      const { data: pagosProximos } = await supabase
        .from('pagos')
        .select(`
          *,
          proyecto:proyectos(nombre, cliente:clientes(nombre))
        `)
        .eq('estado', 'pendiente')
        .gte('fecha_esperada', ahora.toISOString().split('T')[0])
        .lte('fecha_esperada', fechaLimite.toISOString().split('T')[0])

      pagosProximos?.forEach(pago => {
        const dias = getDaysRemaining(pago.fecha_esperada)
        let prioridad = 'baja'
        let detalle = `Vence en ${dias} días`
        
        if (dias === 0) {
          prioridad = 'alta'
          detalle = '¡Vence hoy!'
        } else if (dias === 1) {
          prioridad = 'alta'
          detalle = 'Vence mañana'
        } else if (dias <= 3) {
          prioridad = 'media'
        }

        notifs.push({
          id: `pago-proximo-${pago.id}`,
          tipo: 'pago-proximo',
          prioridad,
          titulo: 'Pago próximo',
          mensaje: `${pago.proyecto?.cliente?.nombre} - ${pago.proyecto?.nombre}`,
          detalle,
          monto: pago.monto,
          fecha: pago.fecha_esperada,
          link: 'pagos'
        })
      })

      // ========================================
      // 3. TAREAS VENCIDAS
      // ========================================
      const { data: tareasVencidas } = await supabase
        .from('tareas')
        .select(`
          *,
          proyecto:proyectos(nombre, cliente:clientes(nombre))
        `)
        .neq('estado', 'completada')
        .lt('fecha_vencimiento', ahora.toISOString().split('T')[0])

      tareasVencidas?.forEach(tarea => {
        const dias = Math.abs(getDaysRemaining(tarea.fecha_vencimiento))
        notifs.push({
          id: `tarea-vencida-${tarea.id}`,
          tipo: 'tarea-vencida',
          prioridad: 'alta',
          titulo: 'Tarea vencida',
          mensaje: tarea.titulo,
          detalle: `Venció hace ${dias} día${dias !== 1 ? 's' : ''}`,
          asignado: tarea.asignado_a,
          proyecto: tarea.proyecto?.nombre,
          cliente: tarea.proyecto?.cliente?.nombre,
          fecha: tarea.fecha_vencimiento,
          link: 'tareas'
        })
      })

      // ========================================
      // 4. TAREAS PRÓXIMAS (próximos 3 días)
      // ========================================
      const fechaLimiteTareas = new Date()
      fechaLimiteTareas.setDate(fechaLimiteTareas.getDate() + 3)

      const { data: tareasProximas } = await supabase
        .from('tareas')
        .select(`
          *,
          proyecto:proyectos(nombre, cliente:clientes(nombre))
        `)
        .neq('estado', 'completada')
        .gte('fecha_vencimiento', ahora.toISOString().split('T')[0])
        .lte('fecha_vencimiento', fechaLimiteTareas.toISOString().split('T')[0])

      tareasProximas?.forEach(tarea => {
        const dias = getDaysRemaining(tarea.fecha_vencimiento)
        let prioridad = tarea.prioridad === 'alta' ? 'alta' : 'media'
        let detalle = `Vence en ${dias} días`
        
        if (dias === 0) {
          prioridad = 'alta'
          detalle = '¡Vence hoy!'
        } else if (dias === 1) {
          prioridad = 'alta'
          detalle = 'Vence mañana'
        }

        notifs.push({
          id: `tarea-proxima-${tarea.id}`,
          tipo: 'tarea-proxima',
          prioridad,
          titulo: 'Tarea próxima',
          mensaje: tarea.titulo,
          detalle,
          asignado: tarea.asignado_a,
          proyecto: tarea.proyecto?.nombre,
          cliente: tarea.proyecto?.cliente?.nombre,
          fecha: tarea.fecha_vencimiento,
          link: 'tareas'
        })
      })

      // ========================================
      // 5. TAREAS DE ALTA PRIORIDAD SIN FECHA
      // ========================================
      const { data: tareasAltaPrioridad } = await supabase
        .from('tareas')
        .select(`
          *,
          proyecto:proyectos(nombre, cliente:clientes(nombre))
        `)
        .eq('prioridad', 'alta')
        .eq('estado', 'pendiente')
        .is('fecha_vencimiento', null)

      tareasAltaPrioridad?.forEach(tarea => {
        notifs.push({
          id: `tarea-alta-${tarea.id}`,
          tipo: 'tarea-alta',
          prioridad: 'media',
          titulo: 'Tarea prioritaria pendiente',
          mensaje: tarea.titulo,
          detalle: 'Sin fecha asignada',
          asignado: tarea.asignado_a,
          proyecto: tarea.proyecto?.nombre,
          cliente: tarea.proyecto?.cliente?.nombre,
          link: 'tareas'
        })
      })

      // ========================================
      // 6. SERVICIOS POR TERMINAR (próximos 7 días)
      // ========================================
      const fechaLimiteServicios = new Date()
      fechaLimiteServicios.setDate(fechaLimiteServicios.getDate() + 7)

      const { data: serviciosPorTerminar } = await supabase
        .from('proyectos')
        .select(`
          *,
          cliente:clientes(nombre),
          servicio:servicios(nombre)
        `)
        .eq('estado', 'activo')
        .not('fecha_fin', 'is', null)
        .gte('fecha_fin', ahora.toISOString().split('T')[0])
        .lte('fecha_fin', fechaLimiteServicios.toISOString().split('T')[0])

      for (const proyecto of (serviciosPorTerminar || [])) {
        const dias = getDaysRemaining(proyecto.fecha_fin)
        let prioridad = 'media'
        let detalle = `Termina en ${dias} días`

        if (dias === 0) { prioridad = 'alta'; detalle = '¡Termina hoy!' }
        else if (dias === 1) { prioridad = 'alta'; detalle = 'Termina mañana' }
        else if (dias <= 3) { prioridad = 'alta' }

        // ── Si faltan ≤3 días, crear tarea de informe si no existe ya ──
        if (dias <= 3) {
          const { data: tareaExistente } = await supabase
            .from('tareas')
            .select('id, estado')
            .eq('proyecto_id', proyecto.id)
            .eq('tipo', 'informe-mensual')
            .maybeSingle()

          if (!tareaExistente) {
            // Crear la tarea automáticamente
            await supabase.from('tareas').insert([{
              proyecto_id: proyecto.id,
              titulo: `📊 Generar informe mensual — ${proyecto.nombre}`,
              descripcion: `Campaña de ${proyecto.cliente?.nombre}. Genera el informe de resultados Meta Ads antes del cierre del servicio (${proyecto.fecha_fin}).`,
              prioridad: 'alta',
              estado: 'pendiente',
              fecha_vencimiento: proyecto.fecha_fin,
              tipo: 'informe-mensual',
              metadata: { proyecto_id: proyecto.id, cliente: proyecto.cliente?.nombre }
            }])
          }

          // Solo agregar notificación si la tarea NO está completada
          const tareaCompletada = tareaExistente?.estado === 'completada'
          if (!tareaCompletada) {
            notifs.push({
              id: `servicio-termina-${proyecto.id}`,
              tipo: 'servicio-termina',
              prioridad,
              titulo: '⚠️ Servicio por terminar',
              mensaje: `${proyecto.cliente?.nombre} - ${proyecto.nombre}`,
              detalle,
              proyecto: proyecto.nombre,
              proyecto_id: proyecto.id,
              cliente: proyecto.cliente?.nombre,
              servicio: proyecto.servicio?.nombre,
              fecha: proyecto.fecha_fin,
              link: 'tareas',
              mostrarInforme: true,
              tarea_informe_id: tareaExistente?.id
            })
          }
        } else {
          // Entre 4-7 días: solo notificación informativa sin botón de informe
          notifs.push({
            id: `servicio-termina-${proyecto.id}`,
            tipo: 'servicio-termina',
            prioridad,
            titulo: '⚠️ Servicio por terminar',
            mensaje: `${proyecto.cliente?.nombre} - ${proyecto.nombre}`,
            detalle,
            proyecto: proyecto.nombre,
            proyecto_id: proyecto.id,
            cliente: proyecto.cliente?.nombre,
            servicio: proyecto.servicio?.nombre,
            fecha: proyecto.fecha_fin,
            link: 'proyectos',
            mostrarInforme: false
          })
        }
      }

      // ========================================
      // 7. SERVICIOS TERMINADOS (necesitan renovación)
      // ========================================
      const { data: serviciosTerminados } = await supabase
        .from('proyectos')
        .select(`
          *,
          cliente:clientes(nombre),
          servicio:servicios(nombre)
        `)
        .eq('estado', 'activo')
        .not('fecha_fin', 'is', null)
        .lt('fecha_fin', ahora.toISOString().split('T')[0])

      for (const proyecto of (serviciosTerminados || [])) {
        const dias = Math.abs(getDaysRemaining(proyecto.fecha_fin))

        // Verificar si la tarea de informe ya fue completada
        const { data: tareaInforme } = await supabase
          .from('tareas')
          .select('id, estado')
          .eq('proyecto_id', proyecto.id)
          .eq('tipo', 'informe-mensual')
          .maybeSingle()

        const tareaCompletada = tareaInforme?.estado === 'completada'

        // Crear tarea de informe si no existe
        if (!tareaInforme) {
          await supabase.from('tareas').insert([{
            proyecto_id: proyecto.id,
            titulo: `📊 Generar informe mensual — ${proyecto.nombre}`,
            descripcion: `Campaña de ${proyecto.cliente?.nombre}. Servicio vencido el ${proyecto.fecha_fin}.`,
            prioridad: 'alta',
            estado: 'pendiente',
            fecha_vencimiento: proyecto.fecha_fin,
            tipo: 'informe-mensual',
            metadata: { proyecto_id: proyecto.id, cliente: proyecto.cliente?.nombre }
          }])
        }

        notifs.push({
          id: `servicio-terminado-${proyecto.id}`,
          tipo: 'servicio-terminado',
          prioridad: 'alta',
          titulo: '🔴 Servicio terminado',
          mensaje: `${proyecto.cliente?.nombre} - ${proyecto.nombre}`,
          detalle: `Terminó hace ${dias} día${dias !== 1 ? 's' : ''} - ¿Renovar?`,
          proyecto: proyecto.nombre,
          proyecto_id: proyecto.id,
          cliente: proyecto.cliente?.nombre,
          servicio: proyecto.servicio?.nombre,
          fecha: proyecto.fecha_fin,
          link: 'tareas',
          mostrarInforme: !tareaCompletada
        })
      }

// ========================================
// 8. EGRESOS POR VENCER (próximos 3 días)
// ========================================
const fechaLimiteEgresos = new Date()
fechaLimiteEgresos.setDate(fechaLimiteEgresos.getDate() + 3)

const { data: egresosProximos } = await supabase
  .from('egresos')
  .select(`
    *,
    categoria:categorias_egreso(nombre)
  `)
  .eq('estado', 'pendiente')
  .gte('fecha_vencimiento', ahora.toISOString().split('T')[0])
  .lte('fecha_vencimiento', fechaLimiteEgresos.toISOString().split('T')[0])

egresosProximos?.forEach(egreso => {
  const dias = getDaysRemaining(egreso.fecha_vencimiento)
  let prioridad = 'media'
  let detalle = `Vence en ${dias} días`
  
  if (dias === 0) {
    prioridad = 'alta'
    detalle = '¡Vence hoy!'
  } else if (dias === 1) {
    prioridad = 'alta'
    detalle = 'Vence mañana'
  }

  notifs.push({
    id: `egreso-proximo-${egreso.id}`,
    tipo: 'egreso-proximo',
    prioridad,
    titulo: '💸 Egreso por pagar',
    mensaje: egreso.descripcion,
    detalle,
    monto: egreso.monto,
    categoria: egreso.categoria?.nombre,
    fecha: egreso.fecha_vencimiento,
    link: 'contabilidad'
  })
})

// ========================================
// 9. EGRESOS VENCIDOS
// ========================================
const { data: egresosVencidos } = await supabase
  .from('egresos')
  .select(`
    *,
    categoria:categorias_egreso(nombre)
  `)
  .eq('estado', 'pendiente')
  .lt('fecha_vencimiento', ahora.toISOString().split('T')[0])

egresosVencidos?.forEach(egreso => {
  const dias = Math.abs(getDaysRemaining(egreso.fecha_vencimiento))
  notifs.push({
    id: `egreso-vencido-${egreso.id}`,
    tipo: 'egreso-vencido',
    prioridad: 'alta',
    titulo: '🔴 Egreso vencido',
    mensaje: egreso.descripcion,
    detalle: `Venció hace ${dias} día${dias !== 1 ? 's' : ''}`,
    monto: egreso.monto,
    categoria: egreso.categoria?.nombre,
    fecha: egreso.fecha_vencimiento,
    link: 'contabilidad'
  })
})

// ========================================
// 10. RECORDATORIO DE IVA MENSUAL
// ========================================
const hoyDate = new Date()
const mesActual = hoyDate.getMonth() + 1
const anioActual = hoyDate.getFullYear()

// Calcular el mes anterior (para el IVA que se debe pagar)
let mesPagar = mesActual - 1
let anioPagar = anioActual
if (mesPagar === 0) {
  mesPagar = 12
  anioPagar--
}

// Fecha de vencimiento (día 12 del mes actual)
const fechaVencimientoIva = new Date(anioActual, mesActual - 1, 12)
const diasParaIva = getDaysRemaining(fechaVencimientoIva.toISOString().split('T')[0])

// Solo mostrar si estamos en los primeros 12 días del mes
if (hoyDate.getDate() <= 12 && diasParaIva >= 0) {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  
  let prioridad = 'baja'
  let detalle = `Vence el 12 (en ${diasParaIva} días)`
  
  if (diasParaIva === 0) {
    prioridad = 'alta'
    detalle = '¡Vence HOY!'
  } else if (diasParaIva <= 3) {
    prioridad = 'alta'
    detalle = `¡Vence en ${diasParaIva} días!`
  } else if (diasParaIva <= 5) {
    prioridad = 'media'
  }

  notifs.push({
    id: `iva-mensual-${anioPagar}-${mesPagar}`,
    tipo: 'iva-mensual',
    prioridad,
    titulo: '🧾 Pagar IVA mensual',
    mensaje: `IVA de ${meses[mesPagar - 1]} ${anioPagar}`,
    detalle,
    fecha: fechaVencimientoIva.toISOString().split('T')[0],
    link: 'contabilidad'
  })
}

      // Ordenar por prioridad
      const prioridadOrden = { alta: 0, media: 1, baja: 2 }
      notifs.sort((a, b) => prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad])

      setNotificaciones(notifs)
      setNoLeidas(notifs.filter(n => n.prioridad === 'alta').length)

    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarNotificaciones()

    // Actualizar cada 5 minutos
    const interval = setInterval(cargarNotificaciones, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [cargarNotificaciones])

  // Filtrar por persona
  const getNotificacionesPorPersona = useCallback((persona) => {
    if (!persona || persona === 'todos') return notificaciones
    return notificaciones.filter(n => !n.asignado || n.asignado === persona)
  }, [notificaciones])

  return {
    notificaciones,
    noLeidas,
    loading,
    recargar: cargarNotificaciones,
    getNotificacionesPorPersona
  }
}