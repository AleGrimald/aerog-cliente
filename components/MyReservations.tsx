'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/constants/api';
// Reutilizamos la UI de pago de ReservationForm, pero aquí la lógica es para una reserva existente
interface TarjetaGuardada {
  tarjeta_id: number;
  titular: string;
  numero: string;
  tipo_tarjeta?: string; // Agregada propiedad tipo_tarjeta
  marca: string;
  ultimos4: string;
}

interface Reserva {
  reserva_id: number;
  usuario_id: number;
  vuelo_id: number;
  fecha_reserva: string;
  estado: string;
  numero_asiento?: string;
  codigo_vuelo: string;
  fecha_salida: string;
  fecha_llegada: string;
  precio_base: number;
  origen_nombre: string;
  provincia_origen: string;
  destino_nombre: string;
  provincia_destino: string;
  nombre: string;
  apellido: string;
  email: string;
  pago_monto?: number;
  pago_metodo?: string;
  pago_interes?: number;
  pago_estado?: string;
  pago_fecha?: string;
  pago_cuotas?: number;
  pago_tarjeta_ultimos4?: string;
}

interface MyReservationsProps {
  usuarioId: number;
}

const formatDateTime = (dateTimeString: string): string => {
  try {
    if (!dateTimeString) return 'N/A';
    // Acepta tanto 'YYYY-MM-DD HH:MM:SS' como 'YYYY-MM-DDTHH:MM:SS'
    let dt = dateTimeString.replace('T', ' ');
    // Si tiene milisegundos, los quita
    dt = dt.split('.')[0];
    // Si termina en Z, lo quita
    dt = dt.replace('Z', '');
    const [datePart, timePart = '00:00:00'] = dt.split(' ');
    const [year, month, day] = datePart.split('-');
    if (!year || !month || !day) return 'Fecha inválida';
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}, ${timePart}`;
  } catch {
    return 'Fecha inválida';
  }
};

const formatCurrency = (value: number): string => {
  return Number(value).toFixed(2);
};

export default function MyReservations({ usuarioId }: MyReservationsProps) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{ open: boolean; reservaId: number | null }>({ open: false, reservaId: null });
  // Para el flujo de pago
  const [pagoModal, setPagoModal] = useState<{ open: boolean; reserva: Reserva | null }>({ open: false, reserva: null });
  const [tarjetasGuardadas, setTarjetasGuardadas] = useState<TarjetaGuardada[]>([]);
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState<TarjetaGuardada | null>(null);
  const [tipoPago, setTipoPago] = useState<'debito' | 'credito' | null>(null);
  const [cuotas, setCuotas] = useState(1);
  const [showConfirmingModal, setShowConfirmingModal] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [mensajePago, setMensajePago] = useState('');
  // Cargar tarjetas guardadas al abrir modal de pago
  const cargarTarjetas = async () => {
    if (!pagoModal.reserva) return;
    try {
        const response = await fetch(`${API_BASE_URL}/tarjeta-usuario/${pagoModal.reserva.usuario_id}`);
      const data = await response.json();
      if (response.ok && Array.isArray(data.tarjetas)) {
        setTarjetasGuardadas(data.tarjetas);
      }
    } catch {}
  };
  useEffect(() => {
    if (pagoModal.open) cargarTarjetas();
    if (!pagoModal.open) {
      setTarjetaSeleccionada(null);
      setTipoPago(null);
      setCuotas(1);
      setMensajePago('');
    }
  }, [pagoModal.open]);
  
  const calcularResumenPago = () => {
    if (!pagoModal.reserva) return { subtotal: 0, interes: 0, total: 0, montoPorCuota: 0 };
    const subtotal = pagoModal.reserva.precio_base;
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
  
  // Handler para abrir modal de pago
  const handlePagarAhora = (reserva: Reserva) => {
    setPagoModal({ open: true, reserva });
    setTarjetaSeleccionada(null);
    setTipoPago(null);
    setCuotas(1);
  };

  const handleSeleccionarTarjeta = (tarjeta: TarjetaGuardada) => {
    setTarjetaSeleccionada(tarjeta);
    // Auto-detectar tipo de pago desde tipo_tarjeta de la BD
    const tipo = tarjeta.tipo_tarjeta ? tarjeta.tipo_tarjeta.toLowerCase() : '';
    if (tipo === 'debito') {
      setTipoPago('debito');
      setCuotas(1);
    } else if (tipo === 'credito') {
      setTipoPago('credito');
      setCuotas(1);
    }
  };

  // Handler para confirmar pago
  const handleConfirmarPago = async () => {
    if (!pagoModal.reserva || !tarjetaSeleccionada || !tipoPago) return;
    setShowConfirmingModal(true);
    setShowCheckmark(false);
    setMensajePago('');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setShowCheckmark(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setShowConfirmingModal(false);
    setShowCheckmark(false);
    try {
      const payload = {
        reserva_id: pagoModal.reserva.reserva_id,
        tarjeta_id: tarjetaSeleccionada.tarjeta_id,
        tipo: tipoPago,
        cuotas: tipoPago === 'credito' ? cuotas : 1,
      };
      // Endpoint a implementar en backend: /pagar-reserva
      const response = await fetch(`${API_BASE_URL}/pagar-reserva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setMensajePago(data.error || 'No se pudo procesar el pago.');
        return;
      }
      setMensajePago('Pago realizado y reserva confirmada.');
      await fetchReservas();
      setTimeout(() => setPagoModal({ open: false, reserva: null }), 1200);
    } catch {
      setMensajePago('No se pudo conectar con el servidor.');
    }
  };

  useEffect(() => {
    fetchReservas();
  }, [usuarioId]);

  const fetchReservas = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/mis-reservas/${usuarioId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No se pudieron cargar las reservas.');
        return;
      }

      setReservas(data);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = (reserva_id: number) => {
    setModal({ open: true, reservaId: reserva_id });
  };

  const confirmarCancelacion = async () => {
    if (!modal.reservaId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/cancelar-reserva/${modal.reservaId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'No se pudo cancelar la reserva.');
        setModal({ open: false, reservaId: null });
        return;
      }
      setReservas((prev) => prev.filter((r) => r.reserva_id !== modal.reservaId));
      setModal({ open: false, reservaId: null });
    } catch {
      alert('No se pudo conectar con el servidor.');
      setModal({ open: false, reservaId: null });
    }
  };

  const cerrarModal = () => setModal({ open: false, reservaId: null });

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">Cargando reservas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchReservas}
          className="mt-4 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (reservas.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">No tienes reservas registradas.</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Mis Reservas</h2>
      <div className="space-y-4">
        {reservas.map((reserva) => (
          <div
            key={reserva.reserva_id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
          >
            {/* Header con código y estado */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Código de Vuelo</p>
                <p className="text-lg font-bold text-slate-900">{reserva.codigo_vuelo}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-600">Estado</p>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                    reserva.estado === 'confirmada'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1)}
                </span>
              </div>
            </div>

            {/* Ruta y fechas */}
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-slate-600">Origen</p>
                <p className="text-base font-semibold text-slate-900">
                  {reserva.origen_nombre}, {reserva.provincia_origen}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Destino</p>
                <p className="text-base font-semibold text-slate-900">
                  {reserva.destino_nombre}, {reserva.provincia_destino}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Salida</p>
                <p className="text-base font-semibold text-slate-900">
                  {formatDateTime(reserva.fecha_salida)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Llegada</p>
                <p className="text-base font-semibold text-slate-900">
                  {formatDateTime(reserva.fecha_llegada)}
                </p>
              </div>
            </div>

            {/* Pasajero y fecha de reserva */}
            <div className="mb-4 border-t border-slate-200 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pasajero</p>
                  <p className="text-base font-semibold text-slate-900">
                    {reserva.nombre} {reserva.apellido}
                  </p>
                  <p className="text-sm text-slate-500">{reserva.email}</p>
                  <p className="mt-2 text-sm font-medium text-slate-600">Asiento</p>
                  <p className="text-base font-semibold text-slate-900">
                    {reserva.numero_asiento || 'No asignado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Fecha de Reserva</p>
                  <p className="text-base font-semibold text-slate-900">
                    {formatDateTime(reserva.fecha_reserva)}
                  </p>
                </div>
              </div>
            </div>

            {/* Precio, botón cancelar y Pagar Ahora si pendiente */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 gap-2 flex-wrap">
              <div>
                <p className="text-sm font-medium text-slate-600">Precio</p>
                {reserva.estado === 'confirmada' && reserva.pago_monto ? (
                  <>
                    <p className="text-2xl font-bold text-blue-600">${formatCurrency(reserva.pago_monto)}</p>
                    {Number(reserva.pago_interes || 0) > 0 && (
                      <p className="text-xs text-slate-500">Incluye {(Number(reserva.pago_interes) * 100).toFixed(0)}% de interés</p>
                    )}
                    {Number(reserva.pago_cuotas || 1) > 1 && (
                      <p className="text-xs text-slate-500">
                        {reserva.pago_cuotas} cuotas de $ {formatCurrency(Number(reserva.pago_monto) / Number(reserva.pago_cuotas))}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-2xl font-bold text-blue-600">${reserva.precio_base}</p>
                )}
              </div>
              {reserva.estado === 'confirmada' && reserva.pago_metodo && (
                <div>
                  <p className="text-sm font-medium text-slate-600">Método de Pago</p>
                  <p className="text-base font-semibold text-slate-900">
                    {reserva.pago_metodo}
                    {reserva.pago_tarjeta_ultimos4 ? ` - **** ${reserva.pago_tarjeta_ultimos4}` : ''}
                  </p>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {reserva.estado === 'pendiente' && (
                  <button
                    onClick={() => handlePagarAhora(reserva)}
                    className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Pagar Ahora
                  </button>
                )}
                    {/* Modal de pago para reservas pendientes */}
                    {pagoModal.open && pagoModal.reserva && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
                          <h3 className="text-xl font-bold text-slate-900 mb-4">Pagar Reserva</h3>
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
                              <p className="mb-3 text-slate-700 font-semibold">Tipo de Pago: <span className="text-blue-600">{tipoPago === 'debito' ? 'Débito' : 'Crédito'}</span></p>
                              {tipoPago === 'credito' && (
                                <div className="mb-3">
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Cuotas:</label>
                                  <select
                                    value={cuotas}
                                    onChange={(e) => setCuotas(Number(e.target.value))}
                                    className="rounded-xl border border-slate-300 px-3 py-2"
                                  >
                                    {[1, 3, 6, 12].map((n) => (
                                      <option key={n} value={n}>{n} cuota{n > 1 ? 's' : ''} {n > 1 ? `(interés ${(n-1)*5}%)` : ''}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-sm font-semibold text-slate-900 mb-2">Resumen de Pago</p>
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
                            </div>
                          )}
                          {mensajePago && (
                            <div className="mb-4 text-center text-blue-700 font-semibold">{mensajePago}</div>
                          )}
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => setPagoModal({ open: false, reserva: null })}
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
                        {/* Modal confirmando pago */}
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
                                  <p className="text-xl font-semibold text-slate-800">¡Pago realizado!</p>
                                  <p className="text-sm text-slate-500">Tu reserva fue confirmada exitosamente</p>
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
                                  <p className="text-xl font-semibold text-slate-800">Procesando pago...</p>
                                  <p className="text-sm text-slate-500">Estamos confirmando tu reserva</p>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                <button
                  onClick={() => handleCancelar(reserva.reserva_id)}
                  className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Modal de confirmación de cancelación */}
    {modal.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Cancelar reserva</h3>
          <p className="mb-6 text-slate-700">¿Seguro que deseas cancelar esta reserva? Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={cerrarModal}
              className="rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300"
            >
              No
            </button>
            <button
              onClick={confirmarCancelacion}
              className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              Sí, cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}


