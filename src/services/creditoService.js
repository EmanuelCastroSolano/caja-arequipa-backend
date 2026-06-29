// src/services/creditoService.js
const creditoRepository = require('../repositories/creditoRepository');

/**
 * Convierte TEA a TEM y calcula la cuota fija mensual (Método Francés)
 */
function calcularCuota(capital, tea, plazoMeses) {
  const teaDecimal = tea / 100;
  // Fórmula de conversión: TEM = (1 + TEA)^(1/12) - 1
  const tem = Math.pow(1 + teaDecimal, 1 / 12) - 1;

  // Fórmula Método Francés: C = P * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
  const factor = Math.pow(1 + tem, plazoMeses);
  const cuota = capital * (tem * factor) / (factor - 1);

  return cuota;
}

/**
 * Genera el cronograma de pagos mes a mes
 */
exports.generarCronograma = (capital, tea, plazoMeses, fechaDesembolso) => {
  const cuotaMensual = calcularCuota(capital, tea, plazoMeses);
  let saldo = capital;
  const cronograma = [];

  const tem = Math.pow(1 + (tea / 100), 1 / 12) - 1;
  let fechaPago = new Date(fechaDesembolso);

  for (let i = 1; i <= plazoMeses; i++) {
    // Aumentar un mes exacto para la siguiente cuota
    fechaPago.setMonth(fechaPago.getMonth() + 1);

    const interes = saldo * tem;
    let amortizacionCapital = cuotaMensual - interes;

    // En la última cuota, el capital a pagar es exactamente el saldo restante
    // Esto evita diferencias de céntimos por el redondeo
    if (i === plazoMeses) {
      amortizacionCapital = saldo;
    }

    saldo = saldo - amortizacionCapital;

    // Guardamos el detalle del mes redondeado a 2 decimales
    cronograma.push({
      numero_cuota: i,
      fecha_pago: fechaPago.toISOString().split('T')[0],
      cuota: Number(cuotaMensual.toFixed(2)),
      capital: Number(amortizacionCapital.toFixed(2)),
      interes: Number(interes.toFixed(2)),
      saldo: Math.max(0, Number(saldo.toFixed(2)))
    });
  }

  return cronograma;
};

exports.registrarSolicitud = async (usuarioId, capital, tea, plazoMeses, conSeguro) => {
  // 1. Calculamos el cronograma matemáticamente con la función que ya teníamos
  const fechaDesembolso = new Date().toISOString().split('T')[0];
  const cronograma = this.generarCronograma(capital, tea, plazoMeses, fechaDesembolso);

  // 2. Preparamos los datos para la tabla solicitudes_credito
  const solicitudData = {
    cliente_id: usuarioId, // ID del cliente autenticado
    monto_solicitado: capital,
    plazo_meses: plazoMeses,
    tasa_tea: tea,
    con_seguro: conSeguro,
    estado: 'Pendiente' 
    // Nota: El score_rds y semaforo los evaluará después el Core Financiero
  };

  const solicitudGuardada = await creditoRepository.crearSolicitudConCronograma(solicitudData, cronograma);
  
  return solicitudGuardada;
};

exports.obtenerPendientes = async () => {
  return await creditoRepository.obtenerPendientes();
};

// Recibe el motivo y lo pasa al repositorio
exports.evaluarRiesgo = async (solicitudId, decision, motivoResolucion) => {
  // Según el UML de tu arquitectura, el estado pasa a 'Desembolsado' directamente
  const estadoFinal = decision === 'Aprobado' ? 'Desembolsado' : 'Rechazado';
  const solicitud = await creditoRepository.actualizarEstado(solicitudId, estadoFinal, motivoResolucion);
  
  if (decision === 'Aprobado') {
    // 1. Pasa a la Cartera Activa
    await creditoRepository.crearCarteraMora({
      solicitud_id: solicitudId,
      dias_atraso: 0,
      monto_vencido: 0.00,
      banda_mora: 'Normal'
    });
    // 2. ¡EL DESEMBOLSO! Sumamos el dinero a la cuenta del cliente
    await creditoRepository.sumarSaldoCliente(solicitud.cliente_id, Number(solicitud.monto_solicitado));
  }
  return solicitud;
};

exports.obtenerHistorialCliente = async (clienteId) => {
  return await creditoRepository.obtenerHistorialCliente(clienteId);
};

exports.obtenerAprobados = async () => {
  return await creditoRepository.obtenerAprobados();
};

exports.registrarCobranza = async (carteraMoraId, usuarioGestorId, tipoGestion, contactoEfectivo, promesaPago, fechaPromesa, observaciones) => {
  
  // Regla de negocio en código: Validamos el CHECK constraint antes de enviar a la BD
  const gestionesValidas = ['Llamada telefonica', 'Visita de campo', 'Carta notarial', 'Pase a Judicial', 'Pase a Castigo'];
  if (!gestionesValidas.includes(tipoGestion)) {
    throw new Error(`El tipo de gestión '${tipoGestion}' no está permitido por el Core Bancario.`);
  }

  // Mapeo idéntico al esquema de tu tabla SQL
  const gestionData = {
    cartera_mora_id: Number(carteraMoraId),
    usuario_gestor_id: usuarioGestorId, // UUID del asesor logueado
    tipo_gestion: tipoGestion,
    contacto_efectivo: Boolean(contactoEfectivo),
    promesa_pago: Boolean(promesaPago),
    fecha_promesa: promesaPago && fechaPromesa ? fechaPromesa : null, // Solo guarda fecha si hay promesa
    observaciones: observaciones
    // fecha_registro se omite porque Supabase aplica el DEFAULT CURRENT_TIMESTAMP automáticamente
  };
  
  return await creditoRepository.registrarCobranza(gestionData);
};

exports.consultarOferta = async (dni) => {
  return await creditoRepository.obtenerOfertaPorDni(dni);
};

exports.listarUsuariosSistema = async () => {
  return await creditoRepository.obtenerTodosLosUsuarios();
};

exports.cambiarControlCuenta = async (usuarioId, nuevoEstado) => {
  return await creditoRepository.actualizarEstadoCuenta(usuarioId, nuevoEstado);
};
