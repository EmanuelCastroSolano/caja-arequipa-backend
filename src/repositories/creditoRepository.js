// src/repositories/creditoRepository.js
const supabase = require('../config/supabase');

exports.crearSolicitudConCronograma = async (solicitudData, cronogramaData) => {
  // 1. Insertamos la solicitud principal
  const { data: solicitud, error: errorSolicitud } = await supabase
    .from('solicitudes_credito')
    .insert([solicitudData])
    .select()
    .single();

  if (errorSolicitud) throw new Error('Error al registrar la solicitud: ' + errorSolicitud.message);

  // 2. Asociamos el ID de la solicitud recién creada a cada cuota del cronograma
  const cronogramaConId = cronogramaData.map(cuota => ({
    solicitud_id: solicitud.id,
    numero_cuota: cuota.numero_cuota,
    fecha_vencimiento: cuota.fecha_pago,
    monto_cuota: cuota.cuota,
    capital: cuota.capital,
    interes: cuota.interes,
    saldo: cuota.saldo,
    estado: 'Pendiente'
  }));

  // 3. Insertamos todo el cronograma de golpe
  const { error: errorCronograma } = await supabase
    .from('cronograma_pagos')
    .insert(cronogramaConId);

  if (errorCronograma) throw new Error('Error al guardar el cronograma: ' + errorCronograma.message);

  return solicitud;
};

// Añadimos los datos de riesgo a la consulta de pendientes
exports.obtenerPendientes = async () => {
  const { data, error } = await supabase
    .from('solicitudes_credito')
    .select(`
      *,
      cliente:usuarios!cliente_id (nombres, apellidos, dni, calificacion_riesgo, ingresos_mensuales, deudas_actuales)
    `)
    .eq('estado', 'Pendiente');

  if (error) throw new Error('Error al obtener pendientes: ' + error.message);
  return data;
};

// Añadimos el motivo_resolucion a la actualización
exports.actualizarEstado = async (solicitudId, nuevoEstado, motivoResolucion) => {
  const { data, error } = await supabase
    .from('solicitudes_credito')
    .update({ estado: nuevoEstado, motivo_resolucion: motivoResolucion })
    .eq('id', solicitudId)
    .select()
    .single();

  if (error) throw new Error('Error al actualizar la base de datos: ' + error.message);
  return data;
};

// Traemos los datos directamente desde la Cartera Activa, cruzando hacia la solicitud y el usuario
exports.obtenerAprobados = async () => {
  const { data, error } = await supabase
    .from('cartera_mora')
    .select(`
      id,
      dias_atraso,
      banda_mora,
      solicitud:solicitudes_credito (
        id,
        monto_solicitado,
        cliente:usuarios!cliente_id (nombres, apellidos, dni)
      )
    `);

  if (error) throw new Error('Error al obtener la cartera: ' + error.message);
  return data;
};

// Nueva función para automatizar el desembolso
exports.crearCarteraMora = async (carteraData) => {
  const { error } = await supabase.from('cartera_mora').insert([carteraData]);
  if (error && error.code !== '23505') console.error('Error al insertar cartera:', error.message);
};

exports.registrarCobranza = async (gestionData) => {
  const { data, error } = await supabase
    .from('historial_gestiones')
    .insert([gestionData])
    .select()
    .single();

  if (error) throw new Error('Error de consistencia en historial_gestiones: ' + error.message);
  return data;
};

exports.obtenerOfertaPorDni = async (dni) => {
  const { data, error } = await supabase
    .from('ofertas_preaprobadas')
    .select('*')
    .eq('dni_cliente', dni)
    .single();
    
  // Si el error es PGRST116, significa que "No encontró nada", lo cual es normal si no tiene oferta.
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data || null; 
};

// Sumar dinero a la cuenta de ahorros del cliente
exports.sumarSaldoCliente = async (clienteId, monto) => {
  const { data: user, error: fetchError } = await supabase
    .from('usuarios')
    .select('saldo_cuenta_ahorro')
    .eq('id', clienteId)
    .single();
    
  if (fetchError) throw new Error('Error al leer la cuenta del cliente.');

  const nuevoSaldo = Number(user.saldo_cuenta_ahorro || 0) + Number(monto);
  
  const { error: updateError } = await supabase
    .from('usuarios')
    .update({ saldo_cuenta_ahorro: nuevoSaldo })
    .eq('id', clienteId);
    
  if (updateError) throw new Error('Error al inyectar el dinero en la cuenta.');
};

// Obtener el historial de créditos y el saldo actual
exports.obtenerHistorialCliente = async (clienteId) => {
  const { data: creditos, error } = await supabase
    .from('solicitudes_credito')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('fecha_solicitud', { ascending: false });

  if (error) throw new Error('Error al obtener el historial.');

  const { data: user } = await supabase
    .from('usuarios')
    .select('saldo_cuenta_ahorro')
    .eq('id', clienteId)
    .single();

  return { creditos: creditos || [], saldoActual: user?.saldo_cuenta_ahorro || 0 };
};

exports.obtenerTodosLosUsuarios = async () => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('apellidos', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

exports.actualizarEstadoCuenta = async (usuarioId, nuevoEstado) => {
  const { data, error } = await supabase
    .from('usuarios')
    .update({ estado_cuenta: nuevoEstado })
    .eq('id', usuarioId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};