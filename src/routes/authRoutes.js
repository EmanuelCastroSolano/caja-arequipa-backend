const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');

// 1. IMPORTAR LA LIBRERÍA DE SEGURIDAD
const rateLimit = require('express-rate-limit');

// 2. CONFIGURAR EL ESCUDO CONTRA FUERZA BRUTA (5 intentos, 15 minutos)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: {
    success: false,
    message: '🚨 Alerta de Seguridad: Demasiados intentos fallidos. Su IP ha sido bloqueada temporalmente. Intente nuevamente en 15 minutos.'
  },
  standardHeaders: true, 
  legacyHeaders: false,
});

// 3. APLICAR EL ESCUDO (Solo inyectado en el Login)
router.post('/login', loginLimiter, controller.login);

// 4. MANTENER TUS OTRAS RUTAS NORMALES
router.post('/logout', controller.logout);
router.get('/me', controller.getMe);

module.exports = router;
