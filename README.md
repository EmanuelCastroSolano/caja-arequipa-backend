# Guía Práctica — Laboratorio 2
## Código por Módulo y Framework · Portal Mi Banco

> **Curso:** Desarrollo de Aplicaciones Web | Unidad 1 | Semana 2
> **Patrón común:** `ROUTER → CONTROLLER → SERVICE → REPOSITORY → BASE DE DATOS`
> Solo cambia el lenguaje y la sintaxis. El concepto arquitectural es el mismo en los 6 frameworks.

---

## Tabla de contenidos

| Módulo | Framework | Lenguaje |
|--------|-----------|----------|
| [M1 — Login y Autenticación](#m1--login-y-autenticación) | Node.js + Express | JavaScript |
| [M2 — Cuentas y Saldos](#m2--cuentas-y-saldos) | Laravel | PHP |
| [M3 — Historial de Transacciones](#m3--historial-de-transacciones) | Spring Boot | Java |
| [M4 — Pagos de Servicios](#m4--pagos-de-servicios) | ASP.NET Core | C# |
| [M5 — Simulador de Préstamos](#m5--simulador-de-préstamos) | FastAPI | Python |
| [M6 — Cuenta de Ahorro ](#m6--cuenta-de-ahorro) | Django REST Framework | Python |
| [Tabla resumen](#tabla-resumen--equivalencias) | Todos | — |

---

## M1 — Login y Autenticación
### Framework: Node.js + Express (JavaScript)

**¿Qué construiremos?**
Un endpoint `POST /api/auth/login` que recibe email + password, verifica contra Supabase Auth y devuelve un token JWT.

**Flujo:**
```
POST /api/auth/login → authController.js → authService.js → Supabase Auth → Token JWT
```

---

### Paso 1 — Instalar dependencias

```bash
# Crear el proyecto e instalar paquetes
mkdir portal-login && cd portal-login
npm init -y
npm install express @supabase/supabase-js cors dotenv jsonwebtoken

# Crear archivo .env con las credenciales
# SUPABASE_URL=https://tu-proyecto.supabase.co
# SUPABASE_KEY=tu_anon_key
# JWT_SECRET=mi_secreto_super_seguro_123
```

---

### Paso 2 — Estructura de carpetas

```
portal-login/
├── src/
│   ├── routes/
│   │   └── authRoutes.js        ← Define las URLs disponibles
│   ├── controllers/
│   │   └── authController.js    ← Recibe la petición HTTP
│   └── services/
│       └── authService.js       ← Lógica de autenticación
├── app.js                       ← Servidor Express principal
└── .env                         ← Variables de entorno
```

---

### Paso 3 — `app.js` · Servidor Express

```javascript
// app.js - Punto de entrada del servidor Node.js
const express = require('express');
const cors    = require('cors');
require('dotenv').config(); // carga variables del archivo .env

const authRoutes = require('./src/routes/authRoutes');

const app = express();
app.use(cors());          // permite peticiones del frontend Bootstrap
app.use(express.json());  // parsea el body JSON de cada petición

// Registrar las rutas de autenticación
app.use('/api/auth', authRoutes);

// Ruta de prueba: GET http://localhost:3000/
app.get('/', (req, res) => {
  res.json({ mensaje: 'API Portal Mi Banco funcionando correctamente' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
```

---

### Paso 4 — `authRoutes.js` · Definir rutas

```javascript
// src/routes/authRoutes.js
// Define qué URLs existen y qué controller las maneja
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/authController');

// POST /api/auth/login   → controller.login
router.post('/login',  controller.login);

// POST /api/auth/logout  → controller.logout
router.post('/logout', controller.logout);

// GET  /api/auth/me      → controller.getMe (requiere token)
router.get('/me',      controller.getMe);

module.exports = router;
```

---

### Paso 5 — `authController.js` · Recibir y responder

```javascript
// src/controllers/authController.js
// El Controller recibe req (petición) y res (respuesta)
// Delega la lógica al Service y devuelve JSON al frontend
const authService = require('../services/authService');

// POST /api/auth/login
// Body esperado: { email: 'cliente@banco.com', password: '12345678' }
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que los campos no estén vacíos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y password son obligatorios'
      });
    }

    // Llamar al service para verificar credenciales
    const resultado = await authService.login(email, password);
    res.json({ success: true, data: resultado });

  } catch (error) {
    // Si el service lanza un error, responder con 401 (no autorizado)
    res.status(401).json({ success: false, message: error.message });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    await authService.logout();
    res.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### Paso 6 — `authService.js` · Lógica con Supabase

```javascript
// src/services/authService.js
// Aquí está la lógica real de autenticación
// Se conecta a Supabase Auth para verificar credenciales
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,  // URL de tu proyecto Supabase
  process.env.SUPABASE_KEY   // Clave anónima (anon key)
);

// Función principal de login
exports.login = async (email, password) => {
  // Supabase verifica email y password contra su base de datos
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  // Si hay error (credenciales incorrectas), lanzar excepción
  if (error) throw new Error('Credenciales incorrectas. Inténtalo nuevamente.');

  // Si es correcto, devolver el usuario y el token de sesión
  return {
    usuario: {
      id:     data.user.id,
      email:  data.user.email,
      nombre: data.user.user_metadata?.full_name || 'Cliente'
    },
    token: data.session.access_token // Token JWT para peticiones futuras
  };
};

// Función de logout
exports.logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error('Error al cerrar sesión.');
};
```

---

### Paso 7 — Probar el endpoint

```bash
# 1. Iniciar el servidor
node app.js
# Debería mostrar: Servidor corriendo en puerto 3000

# 2. Probar con Thunder Client (extensión VS Code) o Postman
# Método: POST
# URL:    http://localhost:3000/api/auth/login
# Body (JSON):
{
  "email": "cliente@mibanco.com",
  "password": "12345678"
}

# Respuesta esperada (credenciales correctas):
{
  "success": true,
  "data": {
    "usuario": { "id": "uuid...", "email": "cliente@mibanco.com", "nombre": "Juan" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

# Respuesta esperada (credenciales incorrectas):
{
  "success": false,
  "message": "Credenciales incorrectas. Inténtalo nuevamente."
}
```

---

## M2 — Cuentas y Saldos
### Framework: Laravel (PHP)

**¿Qué construiremos?**
Una API REST completa para CRUD de cuentas bancarias usando Eloquent ORM y rutas de recurso de Laravel.

**Flujo:**
```
GET /api/cuentas → CuentaController → Eloquent Model → tabla cuentas → JSON
```

---

### Paso 1 — Instalar y configurar Laravel

```bash
# Crear proyecto Laravel
composer create-project laravel/laravel portal-cuentas
cd portal-cuentas

# Instalar autenticación con tokens (Sanctum)
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# Configurar la BD en el archivo .env:
DB_CONNECTION=pgsql
DB_HOST=db.tu-proyecto.supabase.co
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=tu_password_supabase
```

---

### Paso 2 — Estructura de carpetas

```
portal-cuentas/
├── app/
│   ├── Http/Controllers/
│   │   └── CuentaController.php    ← CRUD de cuentas
│   └── Models/
│       └── Cuenta.php              ← Modelo Eloquent
├── routes/
│   └── api.php                     ← Definición de rutas API
└── .env                            ← Variables de entorno
```

---

### Paso 3 — `routes/api.php` · Definir rutas

```php
<?php
// routes/api.php
// apiResource crea AUTOMÁTICAMENTE estas 5 rutas:
// GET    /api/cuentas        → index()   (listar todas)
// POST   /api/cuentas        → store()   (crear nueva)
// GET    /api/cuentas/{id}   → show()    (ver una)
// PUT    /api/cuentas/{id}   → update()  (actualizar)
// DELETE /api/cuentas/{id}   → destroy() (eliminar)

use App\Http\Controllers\CuentaController;
use Illuminate\Support\Facades\Route;

// Rutas protegidas: requieren token de autenticación Sanctum
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('cuentas', CuentaController::class);
});

// Iniciar servidor: php artisan serve
```

---

### Paso 4 — `Cuenta.php` · Modelo Eloquent

```php
<?php
// app/Models/Cuenta.php
// El modelo representa la tabla 'cuentas' en la base de datos
// Eloquent traduce $cuenta->save() a INSERT INTO cuentas...
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Cuenta extends Model
{
    protected $table    = 'cuentas';
    protected $fillable = ['user_id', 'tipo', 'numero_cuenta', 'saldo', 'moneda'];
    protected $casts    = [
        'saldo'      => 'decimal:2',
        'created_at' => 'datetime',
    ];

    // Relación: una Cuenta tiene MUCHAS Transacciones (1 a N)
    public function transacciones()
    {
        return $this->hasMany(Transaccion::class);
    }
}
```

---

### Paso 5 — `CuentaController.php` · CRUD completo

```php
<?php
namespace App\Http\Controllers;
use App\Models\Cuenta;
use Illuminate\Http\Request;

class CuentaController extends Controller
{
    // GET /api/cuentas → listar cuentas del usuario autenticado
    public function index()
    {
        $cuentas = Cuenta::where('user_id', auth()->id())
                         ->orderBy('tipo')
                         ->get();
        return response()->json(['success' => true, 'data' => $cuentas]);
    }

    // POST /api/cuentas → crear nueva cuenta con validación
    public function store(Request $request)
    {
        $datos = $request->validate([
            'tipo'          => 'required|in:corriente,ahorro',
            'numero_cuenta' => 'required|string|max:20',
            'saldo'         => 'required|numeric|min:0',
            'moneda'        => 'in:PEN,USD',
        ]);
        $cuenta = Cuenta::create(array_merge($datos, ['user_id' => auth()->id()]));
        return response()->json(['success' => true, 'data' => $cuenta], 201);
    }

    // GET /api/cuentas/{id} → ver una cuenta específica
    public function show($id)
    {
        $cuenta = Cuenta::where('id', $id)
                        ->where('user_id', auth()->id())
                        ->firstOrFail();
        return response()->json(['success' => true, 'data' => $cuenta]);
    }
}
```

---

### Paso 6 — Probar con Postman

```bash
# Iniciar servidor
php artisan serve
# Servidor en: http://localhost:8000

# Prueba 1 — Listar cuentas
# GET http://localhost:8000/api/cuentas
# Header: Authorization: Bearer tu_token_sanctum

# Prueba 2 — Crear cuenta
# POST http://localhost:8000/api/cuentas
# Body (JSON):
{
  "tipo": "corriente",
  "numero_cuenta": "019-1234567",
  "saldo": 4250.00,
  "moneda": "PEN"
}
```

---

## M3 — Historial de Transacciones
### Framework: Spring Boot (Java)

**¿Qué construiremos?**
API REST de transacciones con Spring Data JPA. El BCP usa esta arquitectura para manejar millones de movimientos diarios.

**Flujo:**
```
GET /api/transacciones → @RestController → @Service → JpaRepository → PostgreSQL → JSON
```

---

### Paso 1 — Configurar Spring Boot

```bash
# Ir a https://start.spring.io y generar proyecto con:
# - Spring Web
# - Spring Data JPA
# - Spring Security
# - PostgreSQL Driver
# Descargar y abrir en IntelliJ IDEA o VS Code
```

```properties
# src/main/resources/application.properties
spring.datasource.url=jdbc:postgresql://db.tu-proyecto.supabase.co:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=tu_password
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

server.port=8080
```

---

### Paso 2 — Estructura de carpetas

```
src/main/java/com/mibanco/
├── model/
│   └── Transaccion.java           ← Entidad JPA (mapea la tabla)
├── repository/
│   └── TransaccionRepository.java ← Acceso a BD sin SQL manual
├── service/
│   └── TransaccionService.java    ← Lógica de negocio
├── controller/
│   └── TransaccionController.java ← Endpoints REST
└── MiBancoApplication.java        ← Punto de entrada
```

---

### Paso 3 — `Transaccion.java` · Entidad JPA

```java
// src/main/java/com/mibanco/model/Transaccion.java
package com.mibanco.model;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transacciones")
public class Transaccion {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String tipo; // "debito" o "credito"

    @Column(nullable = false)
    private String descripcion;

    @Column(precision = 12, scale = 2)
    private BigDecimal monto;

    @Column(name = "created_at")
    private LocalDateTime fecha;

    // Getters
    public UUID getId()             { return id; }
    public String getTipo()         { return tipo; }
    public BigDecimal getMonto()    { return monto; }
    public String getDescripcion()  { return descripcion; }
    public LocalDateTime getFecha() { return fecha; }
}
```

---

### Paso 4 — `TransaccionRepository.java` · Acceso a BD

```java
// Spring genera automáticamente el SQL por el nombre del método
package com.mibanco.repository;
import com.mibanco.model.Transaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface TransaccionRepository extends JpaRepository<Transaccion, UUID> {

    // Spring genera: SELECT * FROM transacciones WHERE user_id=? ORDER BY fecha DESC
    List<Transaccion> findByUserIdOrderByFechaDesc(UUID userId);

    // Spring genera: SELECT * FROM transacciones WHERE user_id=? AND tipo=?
    List<Transaccion> findByUserIdAndTipoOrderByFechaDesc(UUID userId, String tipo);

    // Query personalizada con JPQL
    @Query("SELECT t FROM Transaccion t WHERE t.userId = :userId ORDER BY t.fecha DESC")
    List<Transaccion> buscarPorUsuario(UUID userId);
}
```

---

### Paso 5 — `TransaccionService.java` + `TransaccionController.java`

```java
// service/TransaccionService.java
@Service
public class TransaccionService {

    @Autowired
    private TransaccionRepository txnRepo;

    public List<Transaccion> obtenerTransacciones(UUID userId) {
        return txnRepo.findByUserIdOrderByFechaDesc(userId);
    }

    public List<Transaccion> filtrarPorTipo(UUID userId, String tipo) {
        return txnRepo.findByUserIdAndTipoOrderByFechaDesc(userId, tipo);
    }
}
```

```java
// controller/TransaccionController.java
@RestController
@RequestMapping("/api/transacciones")
@CrossOrigin(origins = "*")
public class TransaccionController {

    @Autowired
    private TransaccionService txnService;

    // GET /api/transacciones?userId=uuid
    // GET /api/transacciones?userId=uuid&tipo=debito
    @GetMapping
    public ResponseEntity<?> getTransacciones(
        @RequestParam UUID userId,
        @RequestParam(required = false) String tipo) {

        List<Transaccion> txns = (tipo != null)
            ? txnService.filtrarPorTipo(userId, tipo)
            : txnService.obtenerTransacciones(userId);

        return ResponseEntity.ok(Map.of("success", true, "data", txns));
    }
}
```

---

### Paso 6 — Ejecutar y probar

```bash
mvn spring-boot:run
# Servidor en: http://localhost:8080

# GET http://localhost:8080/api/transacciones?userId=uuid-del-usuario
# GET http://localhost:8080/api/transacciones?userId=uuid&tipo=debito
```

---

## M4 — Pagos de Servicios
### Framework: ASP.NET Core (C#)

**¿Qué construiremos?**
API REST de pagos de servicios (agua, luz, cable) con Entity Framework Core. Arquitectura usada en SUNAT y corporativos peruanos.

**Flujo:**
```
POST /api/pagos → [HttpPost] → IPagoService → EF Core → PostgreSQL → JSON
```

---

### Paso 1 — Crear proyecto y configurar BD

```bash
dotnet new webapi -n PortalPagos
cd PortalPagos
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.EntityFrameworkCore.Design
```

```json
// appsettings.json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=db.tu-proyecto.supabase.co;Database=postgres;Username=postgres;Password=tu_password"
  }
}
```

---

### Paso 2 — Estructura de carpetas

```
PortalPagos/
├── Controllers/
│   └── PagosController.cs     ← Endpoints REST
├── Models/
│   └── Pago.cs                ← Mapeo de tabla
├── Services/
│   ├── IPagoService.cs        ← Interfaz (contrato SOLID)
│   └── PagoService.cs         ← Implementación
├── Data/
│   └── AppDbContext.cs        ← Contexto Entity Framework
└── Program.cs                 ← Punto de entrada y configuración
```

---

### Paso 3 — `Pago.cs` · Modelo

```csharp
// Models/Pago.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PortalPagos.Models
{
    [Table("pagos")]
    public class Pago
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        public string Servicio { get; set; } = string.Empty;
        // Valores válidos: agua | luz | cable | telefono | gas

        [Column("numero_contrato")]
        public string NumeroContrato { get; set; } = string.Empty;

        [Column(TypeName = "decimal(10,2)")]
        public decimal Monto { get; set; }

        public string Estado { get; set; } = "completado";

        public DateTime Fecha { get; set; } = DateTime.UtcNow;
    }
}
```

---

### Paso 4 — `IPagoService.cs` + `PagoService.cs`

```csharp
// Services/IPagoService.cs
namespace PortalPagos.Services
{
    public interface IPagoService
    {
        Task<List<Pago>> ObtenerPagosByUserAsync(Guid userId);
        Task<Pago> RegistrarPagoAsync(Pago pago);
    }
}
```

```csharp
// Services/PagoService.cs
public class PagoService : IPagoService
{
    private readonly AppDbContext _context;
    public PagoService(AppDbContext context) { _context = context; }

    public async Task<List<Pago>> ObtenerPagosByUserAsync(Guid userId)
    {
        return await _context.Pagos
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.Fecha)
            .Take(20)
            .ToListAsync();
    }

    public async Task<Pago> RegistrarPagoAsync(Pago pago)
    {
        _context.Pagos.Add(pago);
        await _context.SaveChangesAsync();
        return pago;
    }
}
```

---

### Paso 5 — `PagosController.cs` · Endpoints con validaciones

```csharp
// Controllers/PagosController.cs
[ApiController]
[Route("api/[controller]")]
public class PagosController : ControllerBase
{
    private readonly IPagoService _pagoService;
    public PagosController(IPagoService pagoService) { _pagoService = pagoService; }

    // GET /api/pagos?userId=uuid
    [HttpGet]
    public async Task<IActionResult> GetPagos([FromQuery] Guid userId)
    {
        var pagos = await _pagoService.ObtenerPagosByUserAsync(userId);
        return Ok(new { success = true, data = pagos });
    }

    // POST /api/pagos
    [HttpPost]
    public async Task<IActionResult> RegistrarPago([FromBody] Pago pago)
    {
        var serviciosValidos = new[] { "agua", "luz", "cable", "telefono", "gas" };
        if (!serviciosValidos.Contains(pago.Servicio))
            return BadRequest(new { success = false, message = "Servicio no válido" });

        if (pago.Monto <= 0 || pago.Monto > 5000)
            return BadRequest(new { success = false, message = "Monto fuera de rango (1 - 5000)" });

        var resultado = await _pagoService.RegistrarPagoAsync(pago);
        return Created("", new { success = true, data = resultado });
    }
}
```

---

### Paso 6 — `Program.cs` · Inyección de dependencias

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Cuando alguien pida IPagoService, entregar PagoService
builder.Services.AddScoped<IPagoService, PagoService>();

builder.Services.AddControllers();
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();
app.UseCors();
app.MapControllers();
app.Run();
```

---

### Paso 7 — Ejecutar y probar

```bash
dotnet run
# Servidor en: http://localhost:5000

# GET  http://localhost:5000/api/pagos?userId=uuid-del-usuario
# POST http://localhost:5000/api/pagos
# Body: { "userId": "uuid", "servicio": "agua", "numeroContrato": "123", "monto": 85.00 }
```

---

## M5 — Simulador de Préstamos
### Framework: FastAPI (Python)

**¿Qué construiremos?**
API del simulador de préstamos con FastAPI. La documentación Swagger se genera **automáticamente** en `/docs` al iniciar el servidor.

**Flujo:**
```
POST /api/prestamos/simular → @router.post → PrestamoService → Supabase Python → JSON + /docs
```

---

### Paso 1 — Instalar FastAPI

```bash
pip install fastapi uvicorn supabase python-dotenv

# Crear archivo .env
# SUPABASE_URL=https://tu-proyecto.supabase.co
# SUPABASE_KEY=tu_anon_key
```

---

### Paso 2 — Estructura de carpetas

```
portal-prestamos/
├── routers/
│   └── prestamos.py          ← Define los endpoints
├── services/
│   └── prestamo_service.py   ← Lógica + fórmula de amortización
├── models/
│   └── schemas.py            ← Validación con Pydantic
├── main.py                   ← Punto de entrada FastAPI
└── .env                      ← Variables de entorno
```

---

### Paso 3 — `schemas.py` · Validación con Pydantic

```python
# models/schemas.py
from pydantic import BaseModel, Field, validator
from uuid import UUID

class PrestamoSimularRequest(BaseModel):
    monto:       float = Field(gt=0, le=100000, description="Monto del préstamo en soles")
    plazo_meses: int   = Field(ge=6,  le=60,    description="Plazo en meses")
    tasa_anual:  float = Field(gt=0, le=50,     description="Tasa de interés anual %")

class PrestamoSolicitudRequest(BaseModel):
    user_id:            UUID
    monto:              float
    plazo_meses:        int
    tasa_anual:         float
    proposito:          str
    ingresos_mensuales: float

    @validator("proposito")
    def validar_proposito(cls, v):
        opciones = ["consumo", "educacion", "salud", "vivienda", "negocio"]
        if v not in opciones:
            raise ValueError(f"Propósito debe ser uno de: {opciones}")
        return v

class PrestamoSimularResponse(BaseModel):
    monto:         float
    cuota_mensual: float
    total_pagar:   float
    total_interes: float
    plazo_meses:   int
    tasa_anual:    float
```

---

### Paso 4 — `prestamo_service.py` · Fórmula de amortización francesa

```python
# services/prestamo_service.py
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

class PrestamoService:

    def calcular_cuota(self, monto: float, plazo: int, tasa_anual: float) -> dict:
        """
        Fórmula de amortización francesa:
        C = P * [r(1+r)^n] / [(1+r)^n - 1]
        Donde: P = monto, r = tasa mensual decimal, n = plazo en meses
        """
        r      = (tasa_anual / 100) / 12
        factor = (1 + r) ** plazo
        cuota  = monto * (r * factor) / (factor - 1)
        total  = cuota * plazo

        return {
            "monto":         round(monto, 2),
            "cuota_mensual": round(cuota, 2),
            "total_pagar":   round(total, 2),
            "total_interes": round(total - monto, 2),
            "plazo_meses":   plazo,
            "tasa_anual":    tasa_anual
        }

    async def guardar_solicitud(self, datos: dict) -> dict:
        response = supabase.table("solicitudes_prestamo").insert({
            "user_id":       str(datos["user_id"]),
            "monto":         datos["monto"],
            "plazo_meses":   datos["plazo_meses"],
            "tasa_anual":    datos["tasa_anual"],
            "cuota_mensual": datos["cuota_mensual"],
            "proposito":     datos["proposito"],
            "estado":        "pendiente"
        }).execute()
        return response.data[0]
```

---

### Paso 5 — `prestamos.py` · Router con endpoints

```python
# routers/prestamos.py
from fastapi import APIRouter
from models.schemas import PrestamoSimularRequest, PrestamoSolicitudRequest
from services.prestamo_service import PrestamoService

router  = APIRouter()
service = PrestamoService()

# POST /api/prestamos/simular — solo calcula, NO guarda en BD
@router.post("/simular", summary="Simular cuota de préstamo")
async def simular_prestamo(datos: PrestamoSimularRequest):
    """Calcula la cuota mensual sin guardar en base de datos."""
    resultado = service.calcular_cuota(datos.monto, datos.plazo_meses, datos.tasa_anual)
    return {"success": True, "data": resultado}

# POST /api/prestamos/solicitar — calcula Y guarda en Supabase
@router.post("/solicitar", summary="Enviar solicitud de préstamo")
async def solicitar_prestamo(datos: PrestamoSolicitudRequest):
    """Calcula la cuota y guarda la solicitud en Supabase con estado 'pendiente'."""
    calculo   = service.calcular_cuota(datos.monto, datos.plazo_meses, datos.tasa_anual)
    solicitud = await service.guardar_solicitud({**datos.dict(), **calculo})
    return {"success": True, "data": solicitud}
```

---

### Paso 6 — `main.py` · Punto de entrada

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import prestamos

app = FastAPI(
    title="Portal Mi Banco — Módulo Préstamos",
    version="1.0.0",
    description="API del simulador de préstamos con documentación automática"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(prestamos.router, prefix="/api/prestamos", tags=["Préstamos"])

# Iniciar:  uvicorn main:app --reload
# API en:   http://localhost:8000
# DOCS en:  http://localhost:8000/docs   ← Swagger UI automático
# REDOC:    http://localhost:8000/redoc
```

---

### Paso 7 — Ejecutar y probar

```bash
uvicorn main:app --reload
# Abrir en el navegador: http://localhost:8000/docs

# Prueba desde terminal (curl):
curl -X POST http://localhost:8000/api/prestamos/simular \
  -H "Content-Type: application/json" \
  -d '{"monto": 10000, "plazo_meses": 12, "tasa_anual": 24}'

# Respuesta esperada:
{
  "success": true,
  "data": {
    "monto": 10000.0,
    "cuota_mensual": 946.40,
    "total_pagar": 11356.80,
    "total_interes": 1356.80,
    "plazo_meses": 12,
    "tasa_anual": 24.0
  }
}
```

---

## M6 — Cuenta de Ahorro
### Framework: Django REST Framework (Python) ⭐ NUEVO

**¿Qué construiremos?**
API REST completa para gestionar la cuenta de ahorro: consultar saldo, registrar depósitos, calcular proyección de crecimiento y verificar el avance hacia la meta de ahorro.

**¿Por qué Django para este módulo?**
Django incluye panel de administración, ORM y migraciones desde el inicio, ideal para módulos con lógica de negocio compleja como el cálculo de proyecciones financieras.

**Flujo:**
```
GET /api/ahorro/{user_id} → AhorroViewSet → AhorroService → Django ORM → Supabase PostgreSQL → JSON
```

---

### Paso 1 — Instalar Django REST Framework

```bash
# Instalar Django y Django REST Framework
pip install django djangorestframework psycopg2-binary python-dotenv

# Crear proyecto Django
django-admin startproject portal_ahorro
cd portal_ahorro

# Crear la app del módulo de ahorro
python manage.py startapp ahorro

# Crear archivo .env en la raíz del proyecto
# DB_NAME=postgres
# DB_USER=postgres
# DB_PASSWORD=tu_password_supabase
# DB_HOST=db.tu-proyecto.supabase.co
# DB_PORT=5432
```

---

### Paso 2 — Estructura de carpetas

```
portal_ahorro/
├── portal_ahorro/
│   ├── settings.py          ← Configuración del proyecto
│   └── urls.py              ← URLs raíz del proyecto
├── ahorro/
│   ├── models.py            ← Modelos Django ORM (tablas BD)
│   ├── serializers.py       ← Convierte objetos a JSON
│   ├── services.py          ← Lógica de negocio (proyecciones)
│   ├── views.py             ← ViewSets (Controller en Django)
│   └── urls.py              ← URLs del módulo ahorro
└── manage.py                ← Herramienta de comandos Django
```

---

### Paso 3 — `settings.py` · Configurar BD y apps

```python
# portal_ahorro/settings.py
import os
from dotenv import load_dotenv

load_dotenv()

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'rest_framework',   # Django REST Framework
    'ahorro',           # nuestra app del módulo
]

# Conexión a PostgreSQL (Supabase)
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     os.getenv('DB_NAME',     'postgres'),
        'USER':     os.getenv('DB_USER',     'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST':     os.getenv('DB_HOST',     'localhost'),
        'PORT':     os.getenv('DB_PORT',     '5432'),
    }
}

# Configuración de Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    # Para producción agregar autenticación JWT aquí
}
```

---

### Paso 4 — `models.py` · Modelos Django ORM

```python
# ahorro/models.py
# Django ORM mapea estas clases a tablas en PostgreSQL
# Equivalente a @Entity en Spring Boot o Eloquent en Laravel
from django.db import models
import uuid

class CuentaAhorro(models.Model):
    """
    Representa la tabla 'cuentas_ahorro' en Supabase.
    Almacena la meta, tasa de interés y fecha de apertura.
    """
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id        = models.UUIDField(null=False)
    saldo          = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    meta_ahorro    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tasa_interes   = models.DecimalField(max_digits=5,  decimal_places=2, default=3.5)
    fecha_apertura = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'cuentas_ahorro'  # nombre exacto de la tabla en Supabase

    def __str__(self):
        return f"Ahorro {self.user_id} — S/ {self.saldo}"


class MovimientoAhorro(models.Model):
    """
    Representa cada depósito o retiro de la cuenta de ahorro.
    Se relaciona con CuentaAhorro (Foreign Key).
    """
    TIPO_CHOICES = [
        ('deposito', 'Depósito'),
        ('retiro',   'Retiro'),
        ('interes',  'Interés generado'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cuenta      = models.ForeignKey(
                    CuentaAhorro,
                    on_delete=models.CASCADE,
                    related_name='movimientos'   # cuenta.movimientos.all()
                  )
    tipo        = models.CharField(max_length=10, choices=TIPO_CHOICES)
    monto       = models.DecimalField(max_digits=12, decimal_places=2)
    descripcion = models.CharField(max_length=200, blank=True)
    fecha       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table  = 'movimientos_ahorro'
        ordering  = ['-fecha']  # más recientes primero

    def __str__(self):
        return f"{self.tipo} S/ {self.monto} — {self.fecha.date()}"
```

---

### Paso 5 — `serializers.py` · Convertir objetos a JSON

```python
# ahorro/serializers.py
# Los Serializers convierten objetos Python <-> JSON
# Es el equivalente a los DTOs (Data Transfer Objects) en Spring Boot
from rest_framework import serializers
from .models import CuentaAhorro, MovimientoAhorro

class MovimientoAhorroSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MovimientoAhorro
        fields = ['id', 'tipo', 'monto', 'descripcion', 'fecha']

class CuentaAhorroSerializer(serializers.ModelSerializer):
    # Incluir los últimos 10 movimientos al serializar la cuenta
    movimientos = MovimientoAhorroSerializer(many=True, read_only=True)
    # Campo calculado (no viene de la BD, lo calcula el serializer)
    porcentaje_meta = serializers.SerializerMethodField()

    class Meta:
        model  = CuentaAhorro
        fields = [
            'id', 'user_id', 'saldo', 'meta_ahorro',
            'tasa_interes', 'fecha_apertura',
            'porcentaje_meta', 'movimientos'
        ]

    def get_porcentaje_meta(self, obj):
        """Calcula el porcentaje de avance hacia la meta de ahorro."""
        if obj.meta_ahorro == 0:
            return 0
        return round(float(obj.saldo) / float(obj.meta_ahorro) * 100, 1)

class DepositoSerializer(serializers.Serializer):
    """Schema para validar los datos de un nuevo depósito."""
    monto       = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)
    descripcion = serializers.CharField(max_length=200, required=False, default='Depósito')
```

---

### Paso 6 — `services.py` · Lógica de negocio

```python
# ahorro/services.py
# Toda la lógica de negocio va aquí, NO en las vistas (views.py)
from decimal import Decimal
from datetime import date
from dateutil.relativedelta import relativedelta  # pip install python-dateutil

class AhorroService:

    def calcular_proyeccion(self, saldo: float, tasa_anual: float,
                             meses: int = 12, deposito_mensual: float = 0) -> list:
        """
        Proyecta el crecimiento del saldo a N meses con interés compuesto.
        Permite simular depósitos mensuales adicionales.

        Fórmula: saldo_nuevo = (saldo + deposito) * (1 + tasa_mensual)
        """
        tasa_mensual = tasa_anual / 100 / 12
        proyeccion   = []
        saldo_actual = float(saldo)
        fecha_actual = date.today()

        for mes in range(1, meses + 1):
            # Aplicar depósito mensual antes del interés
            saldo_actual += float(deposito_mensual)
            # Calcular interés del mes
            interes       = saldo_actual * tasa_mensual
            saldo_actual += interes

            fecha_proyectada = fecha_actual + relativedelta(months=mes)

            proyeccion.append({
                'mes':              mes,
                'fecha':            fecha_proyectada.strftime('%b %Y'),  # ej: "Abr 2025"
                'saldo':            round(saldo_actual, 2),
                'interes_generado': round(interes, 2),
                'deposito_aplicado': round(float(deposito_mensual), 2),
            })

        return proyeccion

    def registrar_deposito(self, cuenta, monto: Decimal, descripcion: str = 'Depósito') -> dict:
        """
        Registra un depósito: actualiza el saldo y crea el movimiento.
        Usa una transacción atómica para garantizar consistencia.
        """
        from django.db import transaction
        from .models import MovimientoAhorro

        with transaction.atomic():
            # Actualizar saldo de la cuenta
            cuenta.saldo += monto
            cuenta.save()

            # Crear el registro del movimiento
            movimiento = MovimientoAhorro.objects.create(
                cuenta      = cuenta,
                tipo        = 'deposito',
                monto       = monto,
                descripcion = descripcion
            )

        return {
            'saldo_nuevo':  float(cuenta.saldo),
            'movimiento_id': str(movimiento.id),
            'mensaje':       f'Depósito de S/ {monto} registrado correctamente'
        }

    def calcular_tiempo_para_meta(self, saldo: float, meta: float,
                                   tasa_anual: float, deposito_mensual: float = 0) -> dict:
        """
        Calcula cuántos meses faltan para alcanzar la meta de ahorro.
        Útil para mostrar al usuario su progreso proyectado.
        """
        if saldo >= meta:
            return {'meses_restantes': 0, 'meta_alcanzada': True}

        tasa_mensual  = tasa_anual / 100 / 12
        saldo_actual  = float(saldo)
        meses         = 0

        while saldo_actual < float(meta) and meses < 600:  # máximo 50 años
            saldo_actual += float(deposito_mensual)
            saldo_actual += saldo_actual * tasa_mensual
            meses        += 1

        return {
            'meses_restantes': meses,
            'años_restantes':  round(meses / 12, 1),
            'meta_alcanzada':  False,
            'deposito_mensual_recomendado': deposito_mensual
        }
```

---

### Paso 7 — `views.py` · ViewSets (Controller en Django)

```python
# ahorro/views.py
# En Django REST Framework se usan ViewSets en lugar de Controllers
# Un ViewSet agrupa todas las acciones CRUD en una sola clase
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CuentaAhorro
from .serializers import CuentaAhorroSerializer, DepositoSerializer
from .services import AhorroService

service = AhorroService()

class AhorroViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la cuenta de ahorro del Portal Mi Banco.
    Genera automáticamente:
      GET    /api/ahorro/           → list()
      GET    /api/ahorro/{id}/      → retrieve()
      POST   /api/ahorro/           → create()
      PUT    /api/ahorro/{id}/      → update()
    """
    serializer_class = CuentaAhorroSerializer

    def get_queryset(self):
        """Filtra las cuentas por user_id recibido como parámetro."""
        user_id = self.request.query_params.get('user_id')
        if user_id:
            return CuentaAhorro.objects.filter(user_id=user_id)
        return CuentaAhorro.objects.none()

    # GET /api/ahorro/{id}/proyeccion/?meses=12&deposito_mensual=500
    @action(detail=True, methods=['get'], url_path='proyeccion')
    def proyeccion(self, request, pk=None):
        """Devuelve la proyección de crecimiento del ahorro a N meses."""
        cuenta          = self.get_object()
        meses           = int(request.query_params.get('meses', 12))
        deposito_mensual = float(request.query_params.get('deposito_mensual', 0))

        proyeccion = service.calcular_proyeccion(
            saldo           = float(cuenta.saldo),
            tasa_anual      = float(cuenta.tasa_interes),
            meses           = meses,
            deposito_mensual = deposito_mensual
        )

        return Response({
            'success':           True,
            'saldo_actual':      float(cuenta.saldo),
            'meta_ahorro':       float(cuenta.meta_ahorro),
            'tasa_anual':        float(cuenta.tasa_interes),
            'proyeccion':        proyeccion,
            'saldo_final':       proyeccion[-1]['saldo'] if proyeccion else float(cuenta.saldo),
        })

    # POST /api/ahorro/{id}/depositar/
    @action(detail=True, methods=['post'], url_path='depositar')
    def depositar(self, request, pk=None):
        """Registra un depósito en la cuenta de ahorro."""
        cuenta     = self.get_object()
        serializer = DepositoSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)

        resultado = service.registrar_deposito(
            cuenta      = cuenta,
            monto       = serializer.validated_data['monto'],
            descripcion = serializer.validated_data.get('descripcion', 'Depósito')
        )

        return Response({'success': True, 'data': resultado}, status=status.HTTP_200_OK)

    # GET /api/ahorro/{id}/tiempo-para-meta/?deposito_mensual=500
    @action(detail=True, methods=['get'], url_path='tiempo-para-meta')
    def tiempo_para_meta(self, request, pk=None):
        """Calcula cuántos meses faltan para alcanzar la meta de ahorro."""
        cuenta           = self.get_object()
        deposito_mensual = float(request.query_params.get('deposito_mensual', 0))

        resultado = service.calcular_tiempo_para_meta(
            saldo            = float(cuenta.saldo),
            meta             = float(cuenta.meta_ahorro),
            tasa_anual       = float(cuenta.tasa_interes),
            deposito_mensual = deposito_mensual
        )

        return Response({'success': True, 'data': resultado})
```

---

### Paso 8 — `urls.py` · Registrar las rutas

```python
# ahorro/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AhorroViewSet

# El Router genera automáticamente todas las URLs del ViewSet
router = DefaultRouter()
router.register(r'ahorro', AhorroViewSet, basename='ahorro')

urlpatterns = [
    path('', include(router.urls)),
]

# URLs generadas automáticamente:
# GET    /api/ahorro/                        → listar cuentas
# POST   /api/ahorro/                        → crear cuenta
# GET    /api/ahorro/{id}/                   → ver cuenta con movimientos
# GET    /api/ahorro/{id}/proyeccion/        → proyección de crecimiento
# POST   /api/ahorro/{id}/depositar/         → registrar depósito
# GET    /api/ahorro/{id}/tiempo-para-meta/  → meses para alcanzar la meta
```

```python
# portal_ahorro/urls.py - URLs raíz del proyecto
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/',   admin.site.urls),  # Panel admin gratuito de Django
    path('api/',     include('ahorro.urls')),
]
```

---

### Paso 9 — Ejecutar migraciones y probar

```bash
# Aplicar migraciones (crea las tablas en Supabase)
python manage.py makemigrations ahorro
python manage.py migrate

# Iniciar servidor
python manage.py runserver
# Servidor en: http://localhost:8000

# Prueba 1 — Ver cuenta de ahorro con movimientos
# GET http://localhost:8000/api/ahorro/?user_id=uuid-del-usuario

# Prueba 2 — Proyección a 12 meses con depósito mensual de S/ 500
# GET http://localhost:8000/api/ahorro/{id}/proyeccion/?meses=12&deposito_mensual=500

# Prueba 3 — Registrar un depósito de S/ 1,000
# POST http://localhost:8000/api/ahorro/{id}/depositar/
# Body (JSON):
{
  "monto": 1000.00,
  "descripcion": "Depósito de ahorro mensual programado"
}

# Respuesta esperada:
{
  "success": true,
  "data": {
    "saldo_nuevo": 13875.50,
    "movimiento_id": "uuid...",
    "mensaje": "Depósito de S/ 1000.00 registrado correctamente"
  }
}

# Prueba 4 — Cuántos meses para la meta con S/ 500 mensuales
# GET http://localhost:8000/api/ahorro/{id}/tiempo-para-meta/?deposito_mensual=500

# Respuesta esperada:
{
  "success": true,
  "data": {
    "meses_restantes": 13,
    "años_restantes": 1.1,
    "meta_alcanzada": false,
    "deposito_mensual_recomendado": 500.0
  }
}
```

---

## Tabla resumen — Equivalencias

| Capa | Node.js | Laravel | Spring Boot | ASP.NET Core | FastAPI | Django REST |
|------|---------|---------|-------------|--------------|---------|-------------|
| **Módulo** | Login | Cuentas | Transacciones | Pagos | Préstamos | **Ahorro** |
| **ROUTER** | `authRoutes.js` | `routes/api.php` | `@GetMapping` | `[HttpGet]` | `@router.post` | `DefaultRouter` |
| **CONTROLLER** | `authController.js` | `CuentaController.php` | `@RestController` | `ControllerBase` | `APIRouter()` | `ViewSet` |
| **SERVICE** | `authService.js` | `CuentaService.php` | `@Service` | `IPagoService` | `PrestamoService()` | `AhorroService()` |
| **ORM / BD** | Supabase JS Client | Eloquent ORM | Spring Data JPA | Entity Framework Core | Supabase Python | Django ORM |
| **INSTALAR** | `npm install express` | `composer install` | `mvn install` | `dotnet restore` | `pip install fastapi` | `pip install django` |
| **INICIAR** | `node app.js` | `php artisan serve` | `mvn spring-boot:run` | `dotnet run` | `uvicorn main:app` | `python manage.py runserver` |
| **PUERTO** | 3000 | 8000 | 8080 | 5000 | 8000 | 8000 |
| **DOCS API** | Thunder Client | Postman | HTTP Client IntelliJ | Swagger integrado | `/docs` automático | `/admin` + Browsable API |

---

## Checklist de la Guía de Laboratorio 2

- [ ] **M1 Node.js** — Ejecutar `node app.js` y probar `POST /api/auth/login` con Thunder Client
- [ ] **M2 Laravel** — Ejecutar `php artisan serve` y probar `GET /api/cuentas` con Postman
- [ ] **M3 Spring Boot** — Ejecutar `mvn spring-boot:run` y probar `GET /api/transacciones`
- [ ] **M4 ASP.NET** — Ejecutar `dotnet run` y probar `POST /api/pagos` con VS Code REST Client
- [ ] **M5 FastAPI** — Ejecutar `uvicorn main:app` y abrir `http://localhost:8000/docs` en el navegador
- [ ] **M6 Django** — Ejecutar `python manage.py runserver` y probar `GET /api/ahorro/{id}/proyeccion/`

---

> **Conclusión clave:** El patrón `Router → Controller → Service → Repository → BD` es idéntico en los 6 frameworks.
> Solo cambia el lenguaje y la sintaxis. Domina el patrón y podrás trabajar con cualquier framework.
