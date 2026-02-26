// Configuración por defecto (se sobreescribe con valores de BD)
let CONFIG_IMPUESTOS = {
  iva: 19.0,
  ppm: 0.125,
  renta: 25.0
}

// Actualizar configuración desde la BD
export function setConfigImpuestos(config) {
  if (config.iva !== undefined) CONFIG_IMPUESTOS.iva = parseFloat(config.iva)
  if (config.ppm !== undefined) CONFIG_IMPUESTOS.ppm = parseFloat(config.ppm)
  if (config.renta !== undefined) CONFIG_IMPUESTOS.renta = parseFloat(config.renta)
}

// Obtener configuración actual
export function getConfigImpuestos() {
  return { ...CONFIG_IMPUESTOS }
}

// Redondear según regla chilena (>= 0.5 sube)
function redondear(valor) {
  return Math.round(valor)
}

/**
 * Calcula el desglose de impuestos para un monto bruto (VENTAS)
 * @param {number} montoBruto - Monto total (IVA incluido si aplica)
 * @param {string} tipoDocumento - 'factura', 'boleta', 'sin_documento'
 * @returns {object} Desglose completo
 */
export function calcularDesglose(montoBruto, tipoDocumento = 'factura') {
  const bruto = parseFloat(montoBruto) || 0
  
  // Sin documento = todo es ganancia líquida
  if (tipoDocumento === 'sin_documento') {
    return {
      bruto: bruto,
      neto: bruto,
      iva: 0,
      ppm: 0,
      renta: 0,
      gananciaLiquida: bruto,
      tipoDocumento: tipoDocumento,
      tasas: {
        iva: 0,
        ppm: 0,
        renta: 0
      }
    }
  }

  // Con factura o boleta
  const tasaIva = CONFIG_IMPUESTOS.iva / 100
  const tasaPpm = CONFIG_IMPUESTOS.ppm / 100
  const tasaRenta = CONFIG_IMPUESTOS.renta / 100

  // Calcular neto (bruto incluye IVA)
  const netoExacto = bruto / (1 + tasaIva)
  const neto = redondear(netoExacto)

  // IVA = bruto - neto
  const iva = bruto - neto

  // PPM sobre el neto
  const ppmExacto = neto * tasaPpm
  const ppm = redondear(ppmExacto)

  // Renta sobre el neto
  const rentaExacto = neto * tasaRenta
  const renta = redondear(rentaExacto)

  // Ganancia líquida = neto - ppm - renta
  const gananciaLiquida = neto - ppm - renta

  return {
    bruto: bruto,
    neto: neto,
    iva: iva,
    ppm: ppm,
    renta: renta,
    gananciaLiquida: gananciaLiquida,
    tipoDocumento: tipoDocumento,
    tasas: {
      iva: CONFIG_IMPUESTOS.iva,
      ppm: CONFIG_IMPUESTOS.ppm,
      renta: CONFIG_IMPUESTOS.renta
    }
  }
}

/**
 * Calcula el IVA crédito de un egreso (COMPRAS)
 * @param {number} montoTotal - Monto total pagado (con IVA incluido)
 * @param {string} tipoDocumento - 'factura', 'boleta', 'sin_documento'
 * @returns {object} Desglose del egreso
 */
export function calcularIvaCredito(montoTotal, tipoDocumento = 'sin_documento') {
  const total = parseFloat(montoTotal) || 0
  
  // Solo facturas generan IVA crédito
  if (tipoDocumento !== 'factura') {
    return {
      total: total,
      neto: total,
      ivaCredito: 0,
      tipoDocumento: tipoDocumento
    }
  }

  const tasaIva = CONFIG_IMPUESTOS.iva / 100
  
  // Calcular neto (total incluye IVA)
  const netoExacto = total / (1 + tasaIva)
  const neto = redondear(netoExacto)
  
  // IVA Crédito = total - neto
  const ivaCredito = total - neto

  return {
    total: total,
    neto: neto,
    ivaCredito: ivaCredito,
    tipoDocumento: tipoDocumento
  }
}

/**
 * Calcula totales de múltiples proyectos
 * @param {array} proyectos - Array de proyectos con precio y tipo_documento
 * @returns {object} Totales agregados
 */
export function calcularTotales(proyectos) {
  const totales = {
    bruto: 0,
    neto: 0,
    iva: 0,
    ppm: 0,
    renta: 0,
    gananciaLiquida: 0,
    cantidadFacturas: 0,
    cantidadBoletas: 0,
    cantidadSinDocumento: 0
  }

  proyectos.forEach(proyecto => {
    const desglose = calcularDesglose(proyecto.precio, proyecto.tipo_documento)
    totales.bruto += desglose.bruto
    totales.neto += desglose.neto
    totales.iva += desglose.iva
    totales.ppm += desglose.ppm
    totales.renta += desglose.renta
    totales.gananciaLiquida += desglose.gananciaLiquida

    if (proyecto.tipo_documento === 'factura') totales.cantidadFacturas++
    else if (proyecto.tipo_documento === 'boleta') totales.cantidadBoletas++
    else totales.cantidadSinDocumento++
  })

  return totales
}

/**
 * Calcula el total de IVA crédito de egresos
 * @param {array} egresos - Array de egresos con monto y tipo_documento
 * @returns {object} Totales de IVA crédito
 */
export function calcularTotalIvaCredito(egresos) {
  let totalIvaCredito = 0
  let totalNetoCompras = 0
  let cantidadConFactura = 0

  egresos.forEach(egreso => {
    if (egreso.tipo_documento === 'factura') {
      const desglose = calcularIvaCredito(egreso.monto, 'factura')
      totalIvaCredito += desglose.ivaCredito
      totalNetoCompras += desglose.neto
      cantidadConFactura++
    }
  })

  return {
    totalIvaCredito,
    totalNetoCompras,
    cantidadConFactura
  }
}

/**
 * Obtiene la fecha de vencimiento de IVA (día 12 del mes siguiente)
 * @param {number} anio 
 * @param {number} mes - 1-12
 * @returns {Date}
 */
export function getFechaVencimientoIva(anio, mes) {
  // El IVA de un mes se paga hasta el 12 del mes siguiente
  let anioSiguiente = anio
  let mesSiguiente = mes + 1
  
  if (mesSiguiente > 12) {
    mesSiguiente = 1
    anioSiguiente++
  }
  
  return new Date(anioSiguiente, mesSiguiente - 1, 12)
}

/**
 * Obtiene el nombre del mes en español
 * @param {number} mes - 1-12
 * @returns {string}
 */
export function getNombreMes(mes) {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return meses[mes - 1] || ''
}