'use client';

import { useState, useEffect } from 'react';

interface DatosTitular {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
}

interface PasajeroRegistrado {
  usuario_id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
}

interface NuevoPasajeroForm {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  fecha_nacimiento: string;
  password: string;
}

interface ReservationFormProps {
  vuelo: any;
  usuario: any;
  cantidadPasajeros: number;
  onReservaConfirmada?: () => void;
}

export default function ReservationForm({ vuelo, usuario, cantidadPasajeros, onReservaConfirmada }: ReservationFormProps) {
  const [datosTitular, setDatosTitular] = useState<DatosTitular>({
    nombre: usuario.nombre || '',
    apellido: usuario.apellido || '',
    email: usuario.email || '',
    telefono: usuario.telefono || '',
    direccion: usuario.direccion || '',
  });

  const [pasajerosAdicionales, setPasajerosAdicionales] = useState<PasajeroRegistrado[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardandoPasajero, setGuardandoPasajero] = useState(false);
  const [modalError, setModalError] = useState('');
  const [confirmandoReserva, setConfirmandoReserva] = useState(false);
  const [showConfirmingModal, setShowConfirmingModal] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showFormaPagoModal, setShowFormaPagoModal] = useState(false);
  const [tarjetasGuardadas, setTarjetasGuardadas] = useState<any[]>([]);
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState<any>(null);
  const [tipoPago, setTipoPago] = useState<'debito' | 'credito' | null>(null);
  const [cuotas, setCuotas] = useState(1);
  const [mensajeReserva, setMensajeReserva] = useState({ tipo: '', texto: '' });
  const [nuevoPasajero, setNuevoPasajero] = useState<NuevoPasajeroForm>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: '',
    fecha_nacimiento: '',
    password: '',
  });

  const maxPasajerosAdicionales = Math.max(cantidadPasajeros - 1, 0);

  const calcularResumenPago = () => {
    const subtotal = vuelo.precio_base * cantidadPasajeros;
    let interes = 0;
    if (tipoPago === 'credito' && cuotas > 1) {
      interes = 0.05 * (cuotas - 1);
    }
    const total = Math.round((subtotal * (1 + interes)) * 100) / 100;
    const montoPorCuota = Math.round((total / cuotas) * 100) / 100;
    return {
      subtotal,
      interes,
      total,
      montoPorCuota,
    };
  };



  const handleTitularChange = (campo: keyof DatosTitular, valor: string) => {
    let filtered = valor;
    if (campo === 'nombre' || campo === 'apellido') {
      filtered = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    } else if (campo === 'telefono') {
      filtered = valor.replace(/[^0-9]/g, '');
    } else if (campo === 'direccion') {
      filtered = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,#\-]/g, '');
    }
    setDatosTitular((prev) => ({ ...prev, [campo]: filtered }));
  };

  const abrirModalPasajero = () => {
    setModalError('');
    setNuevoPasajero({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      direccion: '',
      fecha_nacimiento: '',
      password: '',
    });
    setMostrarModal(true);
  };

  const cerrarModalPasajero = () => {
    setNuevoPasajero({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      direccion: '',
      fecha_nacimiento: '',
      password: '',
    });
    setMostrarModal(false);
    setModalError('');
  };

  const handleNuevoPasajeroChange = (campo: keyof NuevoPasajeroForm, valor: string) => {
    let filtered = valor;
    if (campo === 'nombre' || campo === 'apellido') {
      filtered = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    } else if (campo === 'telefono') {
      filtered = valor.replace(/[^0-9]/g, '');
    } else if (campo === 'direccion') {
      filtered = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,#\-]/g, '');
    } else if (campo === 'password') {
      filtered = valor.replace(/['";\\`<>=]/g, '');
    }
    setNuevoPasajero((prev) => ({ ...prev, [campo]: filtered }));
  };

  const handlePasajeroAdicionalChange = (
    index: number,
    campo: keyof Omit<PasajeroRegistrado, 'usuario_id'>,
    valor: string
  ) => {
    let filtered = valor;
    if (campo === 'nombre' || campo === 'apellido') {
      filtered = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    } else if (campo === 'telefono') {
      filtered = valor.replace(/[^0-9]/g, '');
    } else if (campo === 'direccion') {
      filtered = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,#\-]/g, '');
    }
    setPasajerosAdicionales((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [campo]: filtered,
      };
      return updated;
    });
  };

  const handleGuardarPasajero = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    const sqlPattern = /['";\\`<>=]/;
    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    const soloNumeros = /^\d+$/;
    const direccionValida = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,#\-]+$/;

    if (!nuevoPasajero.nombre.trim() || nuevoPasajero.nombre.trim().length < 2 || !soloLetras.test(nuevoPasajero.nombre.trim())) {
      setModalError('El nombre solo puede contener letras (mín. 2 caracteres).'); return;
    }
    if (!nuevoPasajero.apellido.trim() || nuevoPasajero.apellido.trim().length < 2 || !soloLetras.test(nuevoPasajero.apellido.trim())) {
      setModalError('El apellido solo puede contener letras (mín. 2 caracteres).'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoPasajero.email) || sqlPattern.test(nuevoPasajero.email)) {
      setModalError('Ingresa un email válido.'); return;
    }
    if (!soloNumeros.test(nuevoPasajero.telefono) || nuevoPasajero.telefono.length < 7 || nuevoPasajero.telefono.length > 15) {
      setModalError('El teléfono debe contener solo dígitos (7-15).'); return;
    }
    if (!nuevoPasajero.direccion.trim() || !direccionValida.test(nuevoPasajero.direccion) || nuevoPasajero.direccion.trim().length < 5) {
      setModalError('La dirección contiene caracteres no permitidos o es muy corta (mín. 5).'); return;
    }
    if (!nuevoPasajero.fecha_nacimiento) {
      setModalError('La fecha de nacimiento es obligatoria.'); return;
    }
    if (!nuevoPasajero.password || nuevoPasajero.password.length < 6 || sqlPattern.test(nuevoPasajero.password)) {
      setModalError('La contraseña debe tener al menos 6 caracteres y no puede contener caracteres no permitidos.'); return;
    }

    setGuardandoPasajero(true);

    try {
      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevoPasajero),
      });

      const data = await response.json();
      if (!response.ok) {
        setModalError(data.error || 'No se pudo registrar el pasajero adicional.');
        return;
      }

      setPasajerosAdicionales((prev) => [
        ...prev,
        {
          usuario_id: data.usuario_id,
          nombre: nuevoPasajero.nombre,
          apellido: nuevoPasajero.apellido,
          email: nuevoPasajero.email,
          telefono: nuevoPasajero.telefono,
          direccion: nuevoPasajero.direccion,
        },
      ]);

      cerrarModalPasajero();
    } catch {
      setModalError('No se pudo conectar con el servidor para registrar el pasajero.');
    } finally {
      setGuardandoPasajero(false);
    }
  };

  // Cargar tarjetas guardadas al montar
  useEffect(() => {
    const cargarTarjetas = async () => {
      try {
        const response = await fetch(`http://localhost:5000/tarjeta-usuario/${usuario.usuario_id}`);
        const data = await response.json();
        if (response.ok && Array.isArray(data.tarjetas)) {
          setTarjetasGuardadas(data.tarjetas);
        }
      } catch {}
    };
    cargarTarjetas();
  }, [usuario.usuario_id]);

  // Paso 1: Modal de confirmación de pago
  const handleConfirmar = () => {
    const sqlPattern = /['";\\`<>=]/;
    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    const soloNumeros = /^\d+$/;
    const direccionValida = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,#\-]+$/;
    const errs: string[] = [];

    if (!datosTitular.nombre.trim() || datosTitular.nombre.trim().length < 2 || !soloLetras.test(datosTitular.nombre.trim()))
      errs.push('El nombre solo puede contener letras (mín. 2 caracteres).');
    if (!datosTitular.apellido.trim() || datosTitular.apellido.trim().length < 2 || !soloLetras.test(datosTitular.apellido.trim()))
      errs.push('El apellido solo puede contener letras (mín. 2 caracteres).');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datosTitular.email) || sqlPattern.test(datosTitular.email))
      errs.push('Email del pasajero principal inválido.');
    if (!soloNumeros.test(datosTitular.telefono) || datosTitular.telefono.length < 7 || datosTitular.telefono.length > 15)
      errs.push('El teléfono debe contener solo dígitos (7-15).');
    if (!datosTitular.direccion.trim() || !direccionValida.test(datosTitular.direccion) || datosTitular.direccion.trim().length < 5)
      errs.push('La dirección contiene caracteres no permitidos o es muy corta (mín. 5).');

    if (errs.length > 0) {
      setMensajeReserva({ tipo: 'error', texto: errs.join(' ') });
      return;
    }
    setMensajeReserva({ tipo: '', texto: '' });
    setShowPagoModal(true);
  };

  // Paso 2: Usuario elige pagar ahora o más tarde
  const handlePagoAhora = () => {
    setShowPagoModal(false);
    setShowFormaPagoModal(true);
  };
  const handlePagarMasTarde = async () => {
    setShowPagoModal(false);
    setShowConfirmingModal(true);
    setShowCheckmark(false);
    setMensajeReserva({ tipo: '', texto: '' });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setShowCheckmark(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setShowConfirmingModal(false);
    setShowCheckmark(false);
    setConfirmandoReserva(true);
    try {
      const pasajeros_adicionales_ids = pasajerosAdicionales.map((p) => p.usuario_id);
      const payload = {
        vuelo_id: vuelo.vuelo_id,
        usuario_principal_id: usuario.usuario_id,
        pasajeros_adicionales: pasajeros_adicionales_ids,
        estado: 'pendiente',
      };
      const response = await fetch('http://localhost:5000/confirmar-reserva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setMensajeReserva({ tipo: 'error', texto: data.error || 'No se pudo crear la reserva.' });
        return;
      }
      setMensajeReserva({ tipo: 'exito', texto: 'Reserva creada como pendiente de pago.' });
      if (onReservaConfirmada) {
        setTimeout(() => { onReservaConfirmada(); }, 2000);
      }
    } catch {
      setMensajeReserva({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' });
    } finally {
      setConfirmandoReserva(false);
    }
  };

  // Paso 3: Selección de tarjeta y forma de pago
  const handleSeleccionarTarjeta = (tarjeta: any) => {
    setTarjetaSeleccionada(tarjeta);
    // Auto-detectar tipo de pago desde tipo_tarjeta de la BD
    const tipo = (tarjeta.tipo_tarjeta || '').toLowerCase();
    if (tipo === 'debito') {
      setTipoPago('debito');
      setCuotas(1);
    } else if (tipo === 'credito') {
      setTipoPago('credito');
      setCuotas(1);
    }
  };
  const handleSeleccionarTipoPago = (tipo: 'debito' | 'credito') => {
    setTipoPago(tipo);
    setCuotas(1);
  };
  const handleSeleccionarCuotas = (n: number) => {
    setCuotas(n);
  };
  const handleConfirmarPago = async () => {
    setShowFormaPagoModal(false);
    setShowConfirmingModal(true);
    setShowCheckmark(false);
    setMensajeReserva({ tipo: '', texto: '' });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setShowCheckmark(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setShowConfirmingModal(false);
    setShowCheckmark(false);
    setConfirmandoReserva(true);
    try {
      const pasajeros_adicionales_ids = pasajerosAdicionales.map((p) => p.usuario_id);
      
      // Paso 1: Crear reserva con estado 'pendiente'
      const payloadReserva = {
        vuelo_id: vuelo.vuelo_id,
        usuario_principal_id: usuario.usuario_id,
        pasajeros_adicionales: pasajeros_adicionales_ids,
        estado: 'pendiente',
      };
      const responseReserva = await fetch('http://localhost:5000/confirmar-reserva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadReserva),
      });
      const dataReserva = await responseReserva.json();
      if (!responseReserva.ok) {
        setMensajeReserva({ tipo: 'error', texto: dataReserva.error || 'No se pudo crear la reserva.' });
        return;
      }
      
      const reserva_id = dataReserva.reserva_ids[0]; // Usar el ID del pasajero principal
      
      // Paso 2: Registrar el pago
      const payloadPago = {
        reserva_id: reserva_id,
        tarjeta_id: tarjetaSeleccionada?.tarjeta_id,
        tipo: tipoPago,
        cuotas: tipoPago === 'credito' ? cuotas : 1,
      };
      const responsePago = await fetch('http://localhost:5000/pagar-reserva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadPago),
      });
      const dataPago = await responsePago.json();
      if (!responsePago.ok) {
        setMensajeReserva({ tipo: 'error', texto: dataPago.error || 'No se pudo procesar el pago.' });
        return;
      }
      
      setMensajeReserva({ tipo: 'exito', texto: 'Reserva confirmada y pago realizado.' });
      if (onReservaConfirmada) {
        setTimeout(() => { onReservaConfirmada(); }, 2000);
      }
    } catch {
      setMensajeReserva({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' });
    } finally {
      setConfirmandoReserva(false);
    }
  };

  return (
    <>
    {/* Modal: ¿Quiere realizar el pago ahora? */}
    {showPagoModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
          <h3 className="text-xl font-bold text-slate-900 mb-4">¿Quiere realizar el pago ahora?</h3>
          <p className="mb-6 text-slate-700">Puedes pagar ahora con tarjeta o dejar la reserva pendiente de pago.</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowPagoModal(false)}
              className="rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300"
            >
              Cancelar
            </button>
            <button
              onClick={handlePagarMasTarde}
              className="rounded-full bg-yellow-500 px-5 py-3 text-sm font-semibold text-white hover:bg-yellow-600"
            >
              Pagar más tarde
            </button>
            <button
              onClick={handlePagoAhora}
              className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Pagar ahora
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal: Selección de tarjeta y forma de pago */}
    {showFormaPagoModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Selecciona tarjeta y forma de pago</h3>
          <div className="mb-4">
            <p className="mb-2 text-slate-700 font-semibold">Tarjetas guardadas:</p>
            {tarjetasGuardadas.length === 0 ? (
              <p className="text-slate-500">No tienes tarjetas guardadas.</p>
            ) : (
              <div className="space-y-2">
                {tarjetasGuardadas.map((t) => (
                  <button
                    key={t.tarjeta_id}
                    onClick={() => handleSeleccionarTarjeta(t)}
                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 ${tarjetaSeleccionada?.tarjeta_id === t.tarjeta_id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-slate-50'} hover:border-blue-400`}
                  >
                    <span>{t.marca} - {t.titular} ****{t.ultimos4}</span>
                    {tarjetaSeleccionada?.tarjeta_id === t.tarjeta_id && <span className="ml-2 text-blue-600 font-bold">Seleccionada</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {tarjetaSeleccionada && tipoPago && (
            <div className="mb-4">
              <p className="mb-2 text-slate-700 font-semibold">Tipo de Pago: <span className="text-blue-600">{tipoPago === 'debito' ? 'Débito' : 'Crédito'}</span></p>
              {tipoPago === 'credito' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cuotas:</label>
                  <select
                    value={cuotas}
                    onChange={(e) => handleSeleccionarCuotas(Number(e.target.value))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                  >
                    {[1, 3, 6, 12].map((n) => (
                      <option key={n} value={n}>{n} cuota{n > 1 ? 's' : ''} {n > 1 ? `(interés ${(n-1)*5}%)` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          {tipoPago && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900 mb-3">Resumen de Pago</p>
              {tipoPago === 'debito' ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Monto a Pagar:</span>
                    <span className="font-semibold text-slate-900">${calcularResumenPago().subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cuota:</span>
                    <span className="font-semibold text-slate-900">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Interés:</span>
                    <span className="font-semibold text-slate-900">0%</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-semibold text-slate-900">${calcularResumenPago().subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Interés ({(calcularResumenPago().interes * 100).toFixed(0)}%):</span>
                    <span className="font-semibold text-slate-900">${(calcularResumenPago().subtotal * calcularResumenPago().interes).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex justify-between">
                    <span className="font-semibold text-slate-900">Total a Pagar:</span>
                    <span className="font-bold text-blue-600">${calcularResumenPago().total}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-600">{cuotas} cuota{cuotas > 1 ? 's' : ''} de:</span>
                    <span className="font-semibold text-slate-900">${calcularResumenPago().montoPorCuota}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowFormaPagoModal(false)}
              className="rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmarPago}
              disabled={!tarjetaSeleccionada || !tipoPago}
              className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Confirmar y pagar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal confirmando reserva */}
    {showConfirmingModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="flex flex-col items-center gap-5 rounded-3xl bg-white px-12 py-10 shadow-2xl">
          {showCheckmark ? (
            <>
              <svg
                className="h-14 w-14 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-xl font-semibold text-slate-800">¡Reserva confirmada!</p>
              <p className="text-sm text-slate-500">Tu reserva fue realizada exitosamente</p>
            </>
          ) : (
            <>
              <svg
                className="h-14 w-14 animate-spin text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <p className="text-xl font-semibold text-slate-800">Confirmando reserva...</p>
              <p className="text-sm text-slate-500">Estamos procesando tu reserva</p>
            </>
          )}
        </div>
      </div>
    )}


    <div className="space-y-6">
      {/* Datos del Vuelo - NO EDITABLE */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Datos del Vuelo</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-slate-600">Código de Vuelo</p>
            <p className="text-lg font-semibold text-slate-900">{vuelo.codigo_vuelo}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Ruta</p>
            <p className="text-lg font-semibold text-slate-900">
              {vuelo.origen_nombre}, {vuelo.provincia_origen} → {vuelo.destino_nombre},
              {vuelo.provincia_destino}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Salida</p>
            <p className="text-lg font-semibold text-slate-900">{vuelo.fecha_salida}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Llegada</p>
            <p className="text-lg font-semibold text-slate-900">{vuelo.fecha_llegada}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Precio por Pasajero</p>
            <p className="text-lg font-semibold text-slate-900">${vuelo.precio_base}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Total Pasajeros</p>
            <p className="text-lg font-semibold text-slate-900">{cantidadPasajeros}</p>
          </div>
        </div>
        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-600">Precio Total</p>
          <p className="text-3xl font-bold text-blue-600">
            ${vuelo.precio_base * cantidadPasajeros}
          </p>
        </div>
      </div>

      {/* Datos del Pasajero Principal */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Pasajero Principal</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nombre</label>
            <input
              type="text"
              value={datosTitular.nombre}
              onChange={(e) => handleTitularChange('nombre', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Apellido</label>
            <input
              type="text"
              value={datosTitular.apellido}
              onChange={(e) => handleTitularChange('apellido', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={datosTitular.email}
              onChange={(e) => handleTitularChange('email', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Teléfono</label>
            <input
              type="text"
              value={datosTitular.telefono}
              onChange={(e) => handleTitularChange('telefono', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Dirección</label>
            <input
              type="text"
              value={datosTitular.direccion}
              onChange={(e) => handleTitularChange('direccion', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
            />
          </div>
          
        </div>
      </div>

      {/* Datos de Pasajeros Adicionales */}
      {maxPasajerosAdicionales > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Pasajeros Adicionales</h2>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              Registrados: {pasajerosAdicionales.length} / {maxPasajerosAdicionales}
            </p>

            {pasajerosAdicionales.length < maxPasajerosAdicionales && (
              <button
                type="button"
                onClick={abrirModalPasajero}
                className="mt-4 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Agregar pasajero
              </button>
            )}

            {pasajerosAdicionales.length > 0 && (
              <div className="mt-6 space-y-3">
                {pasajerosAdicionales.map((pasajero, index) => (
                  <div key={pasajero.usuario_id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-900">Pasajero {index + 2}</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Nombre</label>
                        <input
                          type="text"
                          value={pasajero.nombre}
                          onChange={(e) => handlePasajeroAdicionalChange(index, 'nombre', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Apellido</label>
                        <input
                          type="text"
                          value={pasajero.apellido}
                          onChange={(e) => handlePasajeroAdicionalChange(index, 'apellido', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <input
                          type="email"
                          value={pasajero.email}
                          onChange={(e) => handlePasajeroAdicionalChange(index, 'email', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Teléfono</label>
                        <input
                          type="text"
                          value={pasajero.telefono}
                          onChange={(e) => handlePasajeroAdicionalChange(index, 'telefono', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">Dirección</label>
                        <input
                          type="text"
                          value={pasajero.direccion}
                          onChange={(e) => handlePasajeroAdicionalChange(index, 'direccion', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={handleConfirmar}
            disabled={confirmandoReserva}
            className="flex-1 rounded-3xl bg-blue-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmandoReserva ? 'Confirmando...' : 'Confirmar Reserva'}
          </button>
        </div>

        {mensajeReserva.texto && (
          <div
            className={`rounded-3xl border px-6 py-4 text-base font-semibold ${
              mensajeReserva.tipo === 'exito'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {mensajeReserva.texto}
          </div>
        )}
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Registrar pasajero adicional</h3>
              <button
                type="button"
                onClick={cerrarModalPasajero}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleGuardarPasajero} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={nuevoPasajero.nombre}
                  onChange={(e) => handleNuevoPasajeroChange('nombre', e.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Apellido</label>
                <input
                  type="text"
                  value={nuevoPasajero.apellido}
                  onChange={(e) => handleNuevoPasajeroChange('apellido', e.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={nuevoPasajero.email}
                  onChange={(e) => handleNuevoPasajeroChange('email', e.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                <input
                  type="password"
                  value={nuevoPasajero.password}
                  onChange={(e) => handleNuevoPasajeroChange('password', e.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Teléfono</label>
                <input
                  type="text"
                  value={nuevoPasajero.telefono}
                  onChange={(e) => handleNuevoPasajeroChange('telefono', e.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={nuevoPasajero.fecha_nacimiento}
                  onChange={(e) => handleNuevoPasajeroChange('fecha_nacimiento', e.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Dirección</label>
                <input
                  type="text"
                  value={nuevoPasajero.direccion}
                  onChange={(e) => handleNuevoPasajeroChange('direccion', e.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {modalError && (
                <div className="md:col-span-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  {modalError}
                </div>
              )}

              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cerrarModalPasajero}
                  className="rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPasajero}
                  className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardandoPasajero ? 'Guardando...' : 'Guardar pasajero'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
