const express = require('express');
const router = express.Router();
const creditoController = require('../controllers/creditoController');

// Fase 1: Simulador y Originación (Homebanking)
router.post('/simular', creditoController.simularCredito);
router.post('/solicitar', creditoController.solicitarCredito);

// Fase 2: Evaluación del Asesor (Bandeja de Pendientes)
router.get('/pendientes', creditoController.listarPendientes);
router.put('/:id/evaluar', creditoController.procesarEvaluacion);

// Fase 3: Cartera Activa y Mora antigua
router.get('/aprobados', creditoController.listarAprobados);
router.post('/cobranza', creditoController.guardarGestionCobranza);

// =================================================================
// NUEVO: Módulo de Recuperaciones / Mora (R1-R2-R3) - RÚBRICA
// =================================================================
// R1: Consulta por bandas y KPIs
router.get('/admin/mora', creditoController.obtenerCarteraMora); 
// R2: Registro de gestiones e historial
router.post('/admin/mora/:carteraId/gestion', creditoController.registrarGestionMora); 
// R3: Transición de estados (Judicial / Castigo)
router.patch('/admin/mora/:carteraId/estado', creditoController.transicionEstadoMora); 
// =================================================================

// Consultas de cliente
router.get('/preaprobado/:dni', creditoController.consultarPreAprobado);
router.get('/historial/:clienteId', creditoController.obtenerMiBilletera);

// Backoffice de Administrador
router.get('/admin/usuarios', creditoController.getUsuariosAdmin);
router.patch('/admin/usuarios/:id/estado', creditoController.patchEstadoCuenta);

module.exports = router;