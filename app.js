const express = require('express');
const cors    = require('cors');
require('dotenv').config();

// 1. Importar las rutas
const authRoutes = require('./src/routes/authRoutes');
const creditoRoutes = require('./src/routes/creditoRoutes'); // <-- NUEVO: Importamos las rutas de crédito

const app = express();

// ==============================================================
// PARCHE DE SEGURIDAD PARA RECONOCIMIENTO DE IP EN RENDER (Ataque 4)
// ==============================================================
app.set('trust proxy', 1); 
// ==============================================================

// 2. Configurar CORS para permitir que React se conecte y envíe credenciales
app.use(cors({
  origin: 'https://caja-arequipa-frontend.vercel.app',
  credentials: true
})); // <-- MODIFICADO: CORS configurado para aceptar tu frontend

app.use(express.json());

// 3. Registrar las rutas en la API
app.use('/api/auth', authRoutes);
app.use('/api/creditos', creditoRoutes); // <-- NUEVO: Registramos la ruta de créditos

app.get('/', (req, res) => {
  res.json({ mensaje: 'API Portal Mi Banco funcionando correctamente' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
