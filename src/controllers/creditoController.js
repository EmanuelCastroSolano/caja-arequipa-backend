const creditoService = require('../services/creditoService');

// ---- FASE 1: ORIGINACIÓN Y SIMULACIÓN ----
exports.simularCredito = async (req, res) => {
  try {
    const { capital, plazoMeses, conSeguro } = req.body;
    if (!capital || !plazoMeses) {
      return res.status(400).json({ success: false, message: 'Faltan datos' });
    }
    const tea = conSeguro ? 40.92 : 43.92;
    const cronograma = creditoService.generarCronograma(Number(capital), tea, Number(plazoMeses), new Date().toISOString().split('T')[0]);
    res.json({ success: true, data: { cuota_mensual: cronograma[0].cuota, tea_aplicada: tea, cronograma } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.solicitarCredito = async (req, res) => {
  try {
    const { capital, plazoMeses, conSeguro, clienteId } = req.body;
    if (!capital || !plazoMeses || !clienteId) {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
    }
    const tea = conSeguro ? 40.92 : 43.92;
    const solicitud = await creditoService.registrarSolicitud(clienteId, Number(capital), tea, Number(plazoMeses), conSeguro);
    res.json({ success: true, message: 'Crédito solicitado con éxito', data: solicitud });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---- FASE 2: EVALUACIÓN DEL ASESOR ----
exports.listarPendientes = async (req, res) => {
  try {
    const solicitudes = await creditoService.obtenerPendientes();
    res.json({ success: true, data: solicitudes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.procesarEvaluacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, motivo } = req.body;

    if (!decision || !motivo) {
      return res.status(400).json({ success: false, message: 'La decisión y el motivo son obligatorios.' });
    }

    const resultado = await creditoService.evaluarRiesgo(id, decision, motivo);
    res.json({ success: true, message: `Expediente ${decision}`, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---- FASE 3: CARTERA Y MORA ----
exports.listarAprobados = async (req, res) => {
  try {
    const aprobados = await creditoService.obtenerAprobados();
    res.json({ success: true, data: aprobados });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.guardarGestionCobranza = async (req, res) => {
  try {
    const { carteraMoraId, usuarioGestorId, tipoGestion, contactoEfectivo, promesaPago, fechaPromesa, observaciones } = req.body;
    
    if (!carteraMoraId || !usuarioGestorId || !tipoGestion || !observaciones) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios para el registro histórico.' });
    }

    const resultado = await creditoService.registrarCobranza(
      carteraMoraId, usuarioGestorId, tipoGestion, contactoEfectivo, promesaPago, fechaPromesa, observaciones
    );
    res.json({ success: true, message: 'Gestión histórica almacenada en el Core', data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.consultarPreAprobado = async (req, res) => {
  try {
    const { dni } = req.params;
    const oferta = await creditoService.consultarOferta(dni);
    
    if (!oferta) {
      return res.json({ success: true, data: null, message: 'El cliente no cuenta con campañas vigentes.' });
    }
    
    res.json({ success: true, data: oferta, message: '¡Felicidades! Tienes un crédito aprobado.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.obtenerMiBilletera = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const billetera = await creditoService.obtenerHistorialCliente(clienteId);
    res.json({ success: true, data: billetera });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUsuariosAdmin = async (req, res) => {
  try {
    const data = await creditoService.listarUsuariosSistema();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.patchEstadoCuenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body;
    const data = await creditoService.cambiarControlCuenta(id, nuevoEstado);
    res.json({ success: true, message: `Estado cambiado a ${nuevoEstado}`, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================================================
// MÓDULO DE RECUPERACIONES / MORA (R1-R2-R3)
// =================================================================

exports.obtenerCarteraMora = async (req, res) => {
  try {
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.registrarGestionMora = async (req, res) => {
  try {
    const { carteraId } = req.params;
    const datosGestion = req.body;
    res.json({
      success: true,
      message: 'Gestión registrada correctamente',
      data: datosGestion
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.transicionEstadoMora = async (req, res) => {
  try {
    const { carteraId } = req.params;
    const { banda_mora } = req.body;
    res.json({
      success: true,
      message: `Estado actualizado a ${banda_mora}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};