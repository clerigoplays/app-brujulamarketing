// Configuración para Chile
export const CONFIG = {
  timezone: 'America/Santiago',
  locale: 'es-CL',
  currency: 'CLP'
}

// Formatear a Pesos Chilenos
export function formatCLP(amount) {
  if (amount === null || amount === undefined) return '$0'
  
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Helper: parsea fecha YYYY-MM-DD como fecha local (sin desplazamiento UTC)
function parseDateLocal(date) {
  if (!date) return null
  // Si ya es un objeto Date, devolverlo tal cual
  if (date instanceof Date) return date
  // Si es string tipo "YYYY-MM-DD", parsearlo como local para evitar UTC offset
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  // Para strings con hora (ISO completo), usar Date normal
  return new Date(date)
}

// Formatear fecha corta (DD/MM/YYYY)
export function formatDate(date) {
  if (!date) return '-'
  
  const d = parseDateLocal(date)
  if (!d || isNaN(d)) return '-'

  // Si es fecha sin hora (solo YYYY-MM-DD), formatear directo sin timezone
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return d.toLocaleDateString('es-CL')
  }

  return d.toLocaleDateString('es-CL', {
    timeZone: CONFIG.timezone
  })
}

// Formatear fecha larga (Lunes 15 de Enero, 2024)
export function formatDateLong(date) {
  if (!date) return '-'
  
  const d = parseDateLocal(date)
  if (!d || isNaN(d)) return '-'

  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return d.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return d.toLocaleDateString('es-CL', {
    timeZone: CONFIG.timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Formatear fecha y hora
export function formatDateTime(date) {
  if (!date) return '-'
  
  const d = new Date(date)
  return d.toLocaleString('es-CL', {
    timeZone: CONFIG.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Obtener fecha actual en Chile
export function getChileDate() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: CONFIG.timezone
  }) // Formato YYYY-MM-DD para inputs
}

// Obtener hora actual en Chile
export function getChileTime() {
  return new Date().toLocaleTimeString('es-CL', {
    timeZone: CONFIG.timezone,
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Calcular días restantes
export function getDaysRemaining(date) {
  if (!date) return null
  
  const today = parseDateLocal(
    new Date().toLocaleDateString('en-CA', { timeZone: CONFIG.timezone })
  )
  const target = parseDateLocal(date)
  if (!target || isNaN(target)) return null

  const diffTime = target - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

// Formatear días restantes con texto
export function formatDaysRemaining(date) {
  const days = getDaysRemaining(date)
  
  if (days === null) return '-'
  if (days < 0) return `Hace ${Math.abs(days)} días`
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  return `En ${days} días`
}

// Obtener saludo según hora de Chile
export function getGreeting() {
  const hour = new Date().toLocaleString('en-US', {
    timeZone: CONFIG.timezone,
    hour: 'numeric',
    hour12: false
  })
  
  const h = parseInt(hour)
  
  if (h >= 6 && h < 12) return '¡Buenos días'
  if (h >= 12 && h < 19) return '¡Buenas tardes'
  return '¡Buenas noches'
}