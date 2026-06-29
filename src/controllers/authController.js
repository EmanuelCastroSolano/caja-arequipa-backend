const supabase = require('../config/supabase');

exports.login = async (req, res) => {
  try {
    // Ahora recibimos los datos como un cajero automático
    const { numero_tarjeta, clave_web } = req.body;

    // 1. Buscar a qué correo pertenece esta tarjeta en tu tabla pública
    const { data: usuarioDb, error: dbError } = await supabase
      .from('usuarios')
      .select('id, rol_id, nombres, apellidos, email')
      .eq('numero_tarjeta', numero_tarjeta)
      .single();

    if (dbError || !usuarioDb) {
      throw new Error('El número de tarjeta no existe en nuestros registros');
    }

    // 2. Autenticar silenciosamente en Supabase Auth usando el correo encontrado
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: usuarioDb.email,
      password: clave_web // IMPORTANTE: Esta clave debe coincidir con la contraseña que le pusiste al usuario en Supabase (ej. 12345678)
    });

    if (authError) {
      throw new Error('Clave de internet incorrecta');
    }

    // 3. Devolver los datos con el rol de seguridad al Frontend
    res.json({
      success: true,
      data: {
        token: authData.session.access_token,
        usuario: {
          id: usuarioDb.id,
          email: usuarioDb.email,
          nombre: `${usuarioDb.nombres} ${usuarioDb.apellidos}`,
          rol_id: usuarioDb.rol_id
        }
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

exports.logout = async (req, res) => {
  try {
    await supabase.auth.signOut();

    res.json({
      success: true,
      message: 'Sesión cerrada correctamente'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Ruta getMe funcionando'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};