# 📱 FRONTEND - AERO G CLIENT

## Descripción
Frontend Next.js + React + TypeScript para el sistema de reserva de vuelos AERO G.

## 🏗️ Estructura de Carpetas

```
cliente/
├── app/                    # Rutas Next.js
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout raíz
│   ├── page.tsx          # Página principal
│   └── ...
│
├── components/             # Componentes React
│   ├── AuthForm.tsx       # Formulario de autenticación
│   ├── Dashboard.tsx      # Panel principal
│   ├── LoginForm.tsx      # Formulario de login
│   ├── MyReservations.tsx # Gestión de reservas
│   ├── RegisterForm.tsx   # Formulario de registro
│   ├── ReservationForm.tsx # Creación de reserva
│   ├── PaymentMethodModal.tsx # Modal de pagos
│   └── UserProfile.tsx    # Perfil de usuario
│
├── public/                 # Archivos estáticos
├── node_modules/          # Dependencias
├── package.json           # Dependencias del proyecto
├── tsconfig.json         # Configuración TypeScript
├── tailwind.config.ts    # Configuración Tailwind CSS
├── next.config.ts        # Configuración Next.js
└── .env.local            # Variables de entorno (no commitar)
```

## 🚀 Instalación

### Paso 1: Dependencias
```bash
pnpm install
# o
npm install
```

### Paso 2: Variables de Entorno
Crear `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

### Paso 3: Desarrollo
```bash
pnpm run dev
# Accesible en http://localhost:3000
```

## 📦 Scripts Disponibles

```bash
pnpm run dev      # Inicia servidor de desarrollo
pnpm run build    # Crea build de producción
pnpm run start    # Ejecuta build de producción
pnpm run lint     # Ejecuta ESLint
```

## 🧩 Componentes Principales

### 1. **AuthForm.tsx**
Componente de autenticación general
- Props: `type` (login|register), `onSuccess`
- Maneja login y registro
- Valida campos requeridos

### 2. **ReservationForm.tsx**
Flujo completo de reserva
- Búsqueda de vuelos
- Selección de asientos
- Datos de pasajeros
- Procesamiento de pago
- Guarda tarjetas nuevas

**Estados principales:**
- `selectedFlight` - Vuelo seleccionado
- `selectedSeats` - Asientos seleccionados
- `passengers` - Datos de pasajeros
- `paymentModal` - Control de modal de pago
- `agregarTarjetaModal` - Control de agregar tarjeta

**Funciones principales:**
```typescript
handleFlightSelect(flight)      // Selecciona vuelo
handleSeatSelect(seat)          // Selecciona asiento
handlePassengerChange(index)    // Actualiza pasajero
handleGuardarTarjetaNueva()    // Guarda nueva tarjeta
calcularResumenPago()           // Calcula total del pago
```

### 3. **MyReservations.tsx**
Gestión y historial de reservas
- Lista reservas del usuario
- Permite pagar reservas pendientes
- Visualiza detalles de asientos
- Gestión de tarjetas guardadas

**Estados principales:**
- `reservas` - Listado de reservas
- `pagoModal` - Control de modal de pago
- `asientosPorReserva` - Mapeo de asientos
- `tarjetas` - Tarjetas guardadas del usuario

**Funciones principales:**
```typescript
fetchReservas()                 // Obtiene reservas del usuario
handlePagarAhora(reserva)      // Abre modal de pago
calcularResumenPago()           // Calcula total
handleGuardarTarjetaNueva()    // Guarda tarjeta
confirmarPago()                 // Procesa el pago
```

### 4. **PaymentMethodModal.tsx**
Modal reutilizable para pagos
- Selección de tarjeta
- Ingreso de CVV
- Selección de cuotas
- Resumen de pago
- Agregar tarjeta nueva

**Props:**
```typescript
interface Props {
  open: boolean
  title: string
  cards: TarjetaGuardada[]
  paymentType: 'debito' | 'credito'
  summary: PagoSummary
  onSelectCard: (card) => void
  onClose: () => void
  onConfirm: () => void
  // ... más props
}
```

### 5. **UserProfile.tsx**
Perfil del usuario
- Datos personales
- Gestión de tarjetas guardadas
- Historial de transacciones
- Edición de información

## 🔄 Flujos Principales

### Flujo 1: Reservar Vuelo
```
ReservationForm
  ↓
[Buscar Vuelos]
  ↓
[Seleccionar Vuelo + Asientos]
  ↓
[Ingresar Datos Pasajeros]
  ↓
[PaymentMethodModal]
  ↓
[Confirmar Pago]
  ↓
Reserva Confirmada
```

### Flujo 2: Pagar Reserva Pendiente
```
MyReservations
  ↓
[Ver Reservas Pendientes]
  ↓
[Click "Pagar Ahora"]
  ↓
[PaymentMethodModal]
  ↓
[Seleccionar Tarjeta + CVV]
  ↓
[Confirmar Pago]
  ↓
Reserva Confirmada
```

## 💳 Cálculo de Totales

El componente `PaymentMethodModal` calcula automáticamente:

```typescript
const summary = {
  subtotal: precio_base * cantidad_pasajeros,
  interes: tipoPago === 'credito' ? 0.05 * (cuotas - 1) : 0,
  total: subtotal * (1 + interes),
  montoPorCuota: total / cuotas
}
```

## 🎨 Estilos

- **Tailwind CSS** - Framework de utilidades
- **Colores**: Blues (primario), grays (neutral)
- **Responsive**: Mobile-first design
- **Componentes**: Botones, inputs, modales personalizados

### Clases Tailwind Comunes
```
Spacing: m-4, p-6, gap-4
Colores: bg-blue-500, text-gray-700
Responsive: sm:, md:, lg:
Efectos: shadow, rounded, hover:
```

## 🔐 Autenticación

Los componentes utilizan JWT:
- Token almacenado en `localStorage`
- Incluido en header `Authorization: Bearer {token}`
- Expira automáticamente (handled by backend)

```typescript
const token = localStorage.getItem('authToken')
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

## 🐛 Debugging

### Console Logs Importantes
```javascript
[getCantidadPasajeros]    - Cantidad de pasajeros detectada
[calcularResumenPago]     - Cálculo de totales
[handlePagarAhora]        - Aperturas de modal
[confirmarPago]           - Procesamiento de pagos
```

### DevTools
1. Abrir DevTools (F12)
2. Ir a pestaña **Console**
3. Filtrar por logs con nombre del componente

### Network Inspector
1. Pestaña **Network**
2. Filtrar por `XHR/Fetch`
3. Ver requests al backend y respuestas

## 🚀 Build y Deployment

### Build Local
```bash
pnpm run build
pnpm run start
# Accesible en http://localhost:3000
```

### Deploy a Vercel
```bash
vercel login
vercel

# O conectar repositorio GitHub directamente
```

### Configurar Variables en Vercel
En Vercel Dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_API_BASE_URL = https://api.aerog.com/api
```

## 📝 Convenciones de Código

### Nombres de Componentes
- PascalCase: `ReservationForm`, `PaymentModal`
- Sufijo por tipo: `*Form`, `*Modal`, `*Button`

### Nombres de States
```typescript
const [reservas, setReservas] = useState([])
const [isLoading, setIsLoading] = useState(false)
const [errorMessage, setErrorMessage] = useState('')
```

### Nombres de Funciones
- camelCase: `handlePagarAhora`, `calcularResumenPago`
- Prefijo: `handle*` (eventos), `fetch*` (API), `calculate*` (lógica)

### Tipos TypeScript
```typescript
interface Reserva {
  reserva_id: number
  usuario_id: number
  vuelo_id: number
  // ...
}

type PaymentType = 'debito' | 'credito'
```

## ⚠️ Problemas Comunes y Soluciones

### Error: "Cannot find module '@components/...'"
**Solución**: Verificar ruta correcta y que el archivo exista

### Error: "API not responding"
**Solución**: 
1. Verificar backend está corriendo (`npm run dev` en server/)
2. Verificar URL en `.env.local`
3. Verificar CORS configurado en backend

### Pago muestra total incorrecto
**Solución**:
1. Abrir DevTools → Console
2. Buscar logs `[getCantidadPasajeros]`
3. Verificar cantidad de pasajeros detectada
4. Si es 1 cuando debería ser 2+, revisar backend

### Tarjeta no se guarda
**Solución**:
1. Verificar endpoint correcto `/api/agregar-tarjeta`
2. Revisar respuesta del servidor
3. Verificar autenticación válida

## 📚 Recursos Adicionales

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🔄 CI/CD

El proyecto usa GitHub Actions para:
- Ejecutar tests al hacer push
- Lint automático
- Deploy automático a Vercel

Ver `.github/workflows/` para configuración.

---

**Versión**: 1.0.0  
**Última actualización**: Mayo 2026
