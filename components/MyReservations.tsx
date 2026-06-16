'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/constants/api';
import PaymentMethodModal from '@/components/PaymentMethodModal';
// Reutilizamos la UI de pago de ReservationForm, pero aquí la lógica es para una reserva existente
interface TarjetaGuardada {
  tarjeta_id: number;
  titular: string;
  numero?: string;
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
  cantidad_pasajeros?: number;
}

interface PasajeroSecundario {
  usuario_secundario_id: number;
  apellido: string;
  nombre: string;
  direccion: string;
  telefono: string;
  dni: string;
  edad: number;
  email: string;
}

interface AsientoReserva {
  asiento_codigo: string;
  numero_pasajero: number;
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

const normalizeLast4 = (value?: string): string => {
  const text = String(value || '').trim();
  return /^\d{4}$/.test(text) ? text : '';
};

const escapeHtml = (value: string): string => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
  const [tipoPago, setTipoPago] = useState<'debito' | 'credito' | 'mercadopago_qr' | null>(null);
  const [cuotas, setCuotas] = useState(1);
  const [showConfirmingModal, setShowConfirmingModal] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [mensajePago, setMensajePago] = useState('');
  const [verificandoQr, setVerificandoQr] = useState(false);
  const [qrCheckoutUrl, setQrCheckoutUrl] = useState('');
  const [cvvPago, setCvvPago] = useState('');
  const [cvvError, setCvvError] = useState('');
  const [secundariosModal, setSecundariosModal] = useState<{ open: boolean; reserva: Reserva | null }>({ open: false, reserva: null });
  const [secundarios, setSecundarios] = useState<PasajeroSecundario[]>([]);
  const [loadingSecundarios, setLoadingSecundarios] = useState(false);
  const [errorSecundarios, setErrorSecundarios] = useState('');
  const [agregarTarjetaModal, setAgregarTarjetaModal] = useState(false);
  const [tarjetaNueva, setTarjetaNueva] = useState({ numero: '', titular: '', vencimiento: '' });
  const [erroresTarjetaNueva, setErroresTarjetaNueva] = useState<Record<string, string>>({});
  const [puntosDisponibles, setPuntosDisponibles] = useState(0);
  const [puntosACanjear, setPuntosACanjear] = useState(0);
  const [asientosPorReserva, setAsientosPorReserva] = useState<Record<number, AsientoReserva[]>>({});
  const [asientosModal, setAsientosModal] = useState<{ open: boolean; reserva: Reserva | null }>({ open: false, reserva: null });
  const [loadingAsientosModal, setLoadingAsientosModal] = useState(false);
  const [errorAsientosModal, setErrorAsientosModal] = useState('');
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

  const cargarPuntos = async () => {
    if (!pagoModal.reserva) return;
    try {
      const response = await fetch(`${API_BASE_URL}/perfil-puntos/${pagoModal.reserva.usuario_id}`);
      const data = await response.json();
      if (response.ok) {
        const disponibles = Math.max(0, Number(data.puntos_disponibles || 0));
        setPuntosDisponibles(disponibles);
        setPuntosACanjear((prev) => Math.min(prev, disponibles));
      }
    } catch {}
  };

  useEffect(() => {
    if (pagoModal.open) {
      cargarTarjetas();
      cargarPuntos();
    }
    if (!pagoModal.open) {
      setTarjetaSeleccionada(null);
      setTipoPago(null);
      setCuotas(1);
      setMensajePago('');
      setQrCheckoutUrl('');
      setCvvPago('');
      setCvvError('');
      setAgregarTarjetaModal(false);
      setTarjetaNueva({ numero: '', titular: '', vencimiento: '' });
      setErroresTarjetaNueva({});
      setPuntosDisponibles(0);
      setPuntosACanjear(0);
    }
  }, [pagoModal.open]);
  
  const calcularResumenPago = () => {
    if (!pagoModal.reserva) return { subtotal: 0, interes: 0, total: 0, montoPorCuota: 0 };
    const subtotal = getTotalBaseReserva(pagoModal.reserva);
    let interes = 0;
    if (tipoPago === 'credito' && cuotas > 1) {
      interes = 0.05 * (cuotas - 1);
    }
    const totalSinDescuento = Math.round((subtotal * (1 + interes)) * 100) / 100;
    const puntosAplicables = Math.max(0, Math.min(puntosACanjear, puntosDisponibles, Math.floor(totalSinDescuento)));
    const total = Math.round(Math.max(0, totalSinDescuento - puntosAplicables) * 100) / 100;
    const montoPorCuota = Math.round((total / cuotas) * 100) / 100;
    return {
      subtotal,
      interes,
      total,
      montoPorCuota,
    };
  };

  const qrImageUrl = qrCheckoutUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrCheckoutUrl)}`
    : '';

  const getCantidadPasajeros = (reserva: Reserva): number => {
    // Primero intentar usar cantidad_pasajeros si viene del backend
    const cantidad = Number(reserva.cantidad_pasajeros);
    if (Number.isFinite(cantidad) && cantidad >= 1) return cantidad;

    // Si pago_monto ya existe, deducir cantidad = pago_monto / precio_base
    const precioBase = Number(reserva.precio_base || 0);
    const pagoMonto = Number(reserva.pago_monto || 0);
    if (pagoMonto > 0 && precioBase > 0) {
      const cantidadDeducida = Math.round(pagoMonto / precioBase);
      if (cantidadDeducida >= 1) return cantidadDeducida;
    }

    // Si no, intentar contar asientos de la reserva
    const asientos = asientosPorReserva[reserva.reserva_id];
    if (Array.isArray(asientos) && asientos.length > 0) {
      console.log(`[getCantidadPasajeros] Usando asientos: ${asientos.length} para reserva ${reserva.reserva_id}`);
      return asientos.length;
    }

    console.log(`[getCantidadPasajeros] No se pudo determinar cantidad, usando fallback 1 para reserva ${reserva.reserva_id}. cantidad_pasajeros=${reserva.cantidad_pasajeros}, asientos=${asientos?.length || 0}`);
    return 1;
  };

  const getTotalBaseReserva = (reserva: Reserva): number => {
    return Number(reserva.precio_base || 0) * getCantidadPasajeros(reserva);
  };

  const handleVerPasajerosAdicionales = async (reserva: Reserva) => {
    setSecundariosModal({ open: true, reserva });
    setLoadingSecundarios(true);
    setErrorSecundarios('');
    setSecundarios([]);

    try {
      const response = await fetch(`${API_BASE_URL}/reserva-secundarios/${reserva.reserva_id}`);
      const data = await response.json();
      if (!response.ok) {
        setErrorSecundarios(data.error || 'No se pudieron cargar los pasajeros adicionales.');
        return;
      }
      setSecundarios(Array.isArray(data.secundarios) ? data.secundarios : []);
    } catch {
      setErrorSecundarios('No se pudo conectar con el servidor.');
    } finally {
      setLoadingSecundarios(false);
    }
  };

  const cargarAsientosDeReserva = async (reservaId: number) => {
    if (asientosPorReserva[reservaId]) {
      return asientosPorReserva[reservaId];
    }

    const response = await fetch(`${API_BASE_URL}/reserva-asientos/${reservaId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron cargar los asientos de la reserva.');
    }

    const asientos: AsientoReserva[] = Array.isArray(data.asientos) ? data.asientos : [];
    setAsientosPorReserva((prev) => ({ ...prev, [reservaId]: asientos }));
    return asientos;
  };

  const handleVerAsientos = async (reserva: Reserva) => {
    setAsientosModal({ open: true, reserva });
    setLoadingAsientosModal(true);
    setErrorAsientosModal('');
    try {
      await cargarAsientosDeReserva(reserva.reserva_id);
    } catch (err: any) {
      setErrorAsientosModal(err?.message || 'No se pudieron cargar los asientos.');
    } finally {
      setLoadingAsientosModal(false);
    }
  };

  const handleImprimirTicket = async (reserva: Reserva) => {
    const pagoConfirmado = String(reserva.pago_estado || '').toLowerCase() === 'confirmado';
    if (reserva.estado !== 'confirmada' || !pagoConfirmado) return;

    let asientos = asientosPorReserva[reserva.reserva_id] || [];
    if (asientos.length === 0) {
      try {
        asientos = await cargarAsientosDeReserva(reserva.reserva_id);
      } catch {
        asientos = [];
      }
    }

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    const asientosTexto = asientos.length > 0
      ? asientos.map((a) => `${a.numero_pasajero}. ${a.asiento_codigo}`).join(' | ')
      : 'No asignado';

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Ticket Reserva #${reserva.reserva_id}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; color: #0f172a; }
      .ticket { border: 2px solid #cbd5e1; border-radius: 16px; padding: 24px; max-width: 820px; margin: 0 auto; }
      h1 { margin: 0 0 6px 0; font-size: 24px; }
      p.muted { margin: 0 0 20px 0; color: #475569; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; }
      .label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
      .value { font-size: 16px; font-weight: 600; margin-top: 2px; }
      .full { grid-column: 1 / -1; }
      .footer { margin-top: 18px; font-size: 12px; color: #64748b; }
      @media print { body { margin: 0; } .ticket { border-width: 1px; } }
    </style>
  </head>
  <body>
    <div class="ticket">
      <h1>Aero G - Ticket de Vuelo</h1>
      <p class="muted">Comprobante de reserva confirmada</p>
      <div class="grid">
        <div>
          <div class="label">Reserva</div>
          <div class="value">#${reserva.reserva_id}</div>
        </div>
        <div>
          <div class="label">Vuelo</div>
          <div class="value">${escapeHtml(reserva.codigo_vuelo)}</div>
        </div>
        <div>
          <div class="label">Pasajero</div>
          <div class="value">${escapeHtml(`${reserva.nombre} ${reserva.apellido}`)}</div>
        </div>
        <div>
          <div class="label">Email</div>
          <div class="value">${escapeHtml(reserva.email)}</div>
        </div>
        <div class="full">
          <div class="label">Ruta</div>
          <div class="value">${escapeHtml(reserva.origen_nombre)}, ${escapeHtml(reserva.provincia_origen)} -> ${escapeHtml(reserva.destino_nombre)}, ${escapeHtml(reserva.provincia_destino)}</div>
        </div>
        <div>
          <div class="label">Salida</div>
          <div class="value">${escapeHtml(formatDateTime(reserva.fecha_salida))}</div>
        </div>
        <div>
          <div class="label">Llegada</div>
          <div class="value">${escapeHtml(formatDateTime(reserva.fecha_llegada))}</div>
        </div>
        <div>
          <div class="label">Asientos</div>
          <div class="value">${escapeHtml(asientosTexto)}</div>
        </div>
        <div>
          <div class="label">Pago</div>
          <div class="value">${escapeHtml(String(reserva.pago_metodo || '-'))} - $${escapeHtml(formatCurrency(Number(reserva.pago_monto || getTotalBaseReserva(reserva))))}</div>
        </div>
      </div>
      <div class="footer">Emitido: ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
    </div>
  </body>
</html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
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
    setCvvPago('');
    setCvvError('');
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

  const handleSeleccionarMercadoPagoQr = () => {
    setTarjetaSeleccionada(null);
    setTipoPago('mercadopago_qr');
    setCuotas(1);
    setCvvPago('');
    setCvvError('');
  };

  const handleCambioTarjetaNueva = (campo: string, valor: string) => {
    let filtered = valor;
    if (campo === 'numero') {
      filtered = valor.replace(/[^0-9\s]/g, '');
    } else if (campo === 'titular') {
      filtered = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    } else if (campo === 'vencimiento') {
      const soloNumeros = valor.replace(/[^0-9]/g, '').slice(0, 4);
      if (soloNumeros.length <= 2) {
        filtered = soloNumeros;
      } else {
        filtered = `${soloNumeros.slice(0, 2)}/${soloNumeros.slice(2)}`;
      }
    }
    setTarjetaNueva((prev) => ({ ...prev, [campo]: filtered }));
  };

  const handleGuardarTarjetaNueva = async () => {
    const nuevosErrores: Record<string, string> = {};
    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    const vencimientoValido = /^\d{2}\/\d{2}$/;

    if (!tarjetaNueva.numero.replace(/\s/g, '')) {
      nuevosErrores.numero = 'Ingresa el número de tarjeta.';
    } else if (!/^\d{13,19}$/.test(tarjetaNueva.numero.replace(/\s/g, ''))) {
      nuevosErrores.numero = 'El número de tarjeta debe tener 13-19 dígitos.';
    }

    if (!tarjetaNueva.titular.trim()) {
      nuevosErrores.titular = 'Ingresa el nombre del titular.';
    } else if (!soloLetras.test(tarjetaNueva.titular.trim())) {
      nuevosErrores.titular = 'El titular solo puede contener letras.';
    }

    if (!tarjetaNueva.vencimiento) {
      nuevosErrores.vencimiento = 'Ingresa la fecha de vencimiento (MM/AA).';
    } else if (!vencimientoValido.test(tarjetaNueva.vencimiento)) {
      nuevosErrores.vencimiento = 'Formato inválido. Usa MM/AA.';
    }

    setErroresTarjetaNueva(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    if (!pagoModal.reserva) return;
    try {
      const response = await fetch(`${API_BASE_URL}/agregar-tarjeta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: pagoModal.reserva.usuario_id,
          numero: tarjetaNueva.numero.replace(/\s/g, ''),
          titular: tarjetaNueva.titular,
          vencimiento: tarjetaNueva.vencimiento,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErroresTarjetaNueva({ general: data.error || 'No se pudo guardar la tarjeta.' });
        return;
      }

      setAgregarTarjetaModal(false);
      setTarjetaNueva({ numero: '', titular: '', vencimiento: '' });
      setErroresTarjetaNueva({});
      await cargarTarjetas();
      if (data.tarjeta) {
        setTarjetaSeleccionada(data.tarjeta);
        setTipoPago(data.tarjeta.tipo_tarjeta?.toLowerCase() === 'debito' ? 'debito' : 'credito');
      }
    } catch (error) {
      setErroresTarjetaNueva({ general: 'Error al guardar la tarjeta. Intenta nuevamente.' });
    }
  };

  // Handler para confirmar pago
  const handleConfirmarPago = async () => {
    if (!pagoModal.reserva || !tipoPago) return;

    if (tipoPago === 'mercadopago_qr') {
      try {
        setMensajePago('');
        const response = await fetch(`${API_BASE_URL}/crear-pago-qr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reserva_id: pagoModal.reserva.reserva_id,
            usuario_email: pagoModal.reserva.email,
            puntos_a_usar: Math.max(0, Math.min(puntosACanjear, puntosDisponibles)),
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          setMensajePago(data.error || 'No se pudo generar el pago QR.');
          return;
        }

        if (data.checkout_url) {
          setQrCheckoutUrl(data.checkout_url);
        }
        setMensajePago('QR generado. Escanealo con Mercado Pago y luego presiona Verificar pago QR.');
      } catch {
        setMensajePago('No se pudo conectar con el servidor.');
      }
      return;
    }

    if (!tarjetaSeleccionada) return;
    if (!/^\d{3,4}$/.test(cvvPago)) {
      setCvvError('Completa el CVV (3 o 4 dígitos).');
      setMensajePago('Ingresa un CVV válido (3 o 4 dígitos).');
      return;
    }
    setCvvError('');

    setShowConfirmingModal(true);
    setShowCheckmark(false);
    setMensajePago('');
    try {
      const payload = {
        reserva_id: pagoModal.reserva.reserva_id,
        tarjeta_id: tarjetaSeleccionada.tarjeta_id,
        tipo: tipoPago,
        cvv: cvvPago,
        cuotas: tipoPago === 'credito' ? cuotas : 1,
        puntos_a_usar: Math.max(0, Math.min(puntosACanjear, puntosDisponibles)),
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
      setShowCheckmark(true);
      setMensajePago('Pago realizado y reserva confirmada.');
      await fetchReservas();
      await cargarPuntos();
      await new Promise((resolve) => setTimeout(resolve, 700));
      setPagoModal({ open: false, reserva: null });
    } catch {
      setMensajePago('No se pudo conectar con el servidor.');
    } finally {
      setShowConfirmingModal(false);
      setShowCheckmark(false);
    }
  };

  const handleVerificarPagoQr = async () => {
    if (!pagoModal.reserva) return;
    try {
      setVerificandoQr(true);
      const response = await fetch(`${API_BASE_URL}/verificar-pago-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reserva_id: pagoModal.reserva.reserva_id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMensajePago(data.error || 'No se pudo verificar el pago QR.');
        return;
      }

      if (data.estado === 'confirmado') {
        setMensajePago('Pago QR confirmado. Reserva actualizada.');
        await fetchReservas();
        await cargarPuntos();
        setTimeout(() => setPagoModal({ open: false, reserva: null }), 1200);
        return;
      }

      if (data.estado === 'pendiente') {
        setMensajePago('El pago sigue pendiente en Mercado Pago.');
        return;
      }

      setMensajePago(data.mensaje || 'El pago aún no fue aprobado.');
    } catch {
      setMensajePago('No se pudo conectar con el servidor para verificar el pago.');
    } finally {
      setVerificandoQr(false);
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

      const reservasCrudas: Reserva[] = Array.isArray(data) ? data : [];
      const reservasUnicas = new Map<number, Reserva>();

      for (const reserva of reservasCrudas) {
        const existente = reservasUnicas.get(reserva.reserva_id);
        if (!existente) {
          reservasUnicas.set(reserva.reserva_id, reserva);
          continue;
        }

        const fechaNueva = Date.parse(reserva.pago_fecha || reserva.fecha_reserva || '');
        const fechaExistente = Date.parse(existente.pago_fecha || existente.fecha_reserva || '');

        if (!Number.isNaN(fechaNueva) && (Number.isNaN(fechaExistente) || fechaNueva >= fechaExistente)) {
          reservasUnicas.set(reserva.reserva_id, reserva);
        }
      }

      const deduplicadas = Array.from(reservasUnicas.values());
      setReservas(deduplicadas);

      const cargas = deduplicadas.map(async (reserva) => {
        try {
          await cargarAsientosDeReserva(reserva.reserva_id);
        } catch {
          // Si falla esta consulta, la reserva sigue visible.
        }
      });
      await Promise.all(cargas);
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
      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Mis Reservas</h2>
      <div className="space-y-4">
        {reservas.map((reserva) => (
          <div
            key={reserva.reserva_id}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-6"
          >
            {/* Header con código y estado */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Código de Vuelo</p>
                <p className="text-lg font-bold text-slate-900">{reserva.codigo_vuelo}</p>
              </div>
              <div className="sm:text-right">
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
                  <p className="mt-1 text-sm text-slate-600">
                    Cantidad de pasajeros: <span className="font-semibold text-slate-900">{getCantidadPasajeros(reserva)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Fecha de Reserva</p>
                  <p className="text-base font-semibold text-slate-900">
                    {formatDateTime(reserva.fecha_reserva)}
                  </p>
                  {getCantidadPasajeros(reserva) <= 1 && (
                    <p className="mt-2 text-sm text-slate-600">
                      Numero de asiento:{' '}
                      <span className="font-semibold text-slate-900">
                        {asientosPorReserva[reserva.reserva_id]?.[0]?.asiento_codigo || 'No asignado'}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Botones de asientos y pasajeros adicionales */}
            {getCantidadPasajeros(reserva) > 1 && (
              <div className="flex flex-col gap-3 border-t border-b border-slate-200 py-4 sm:flex-row sm:gap-2">
                <button
                  onClick={() => handleVerAsientos(reserva)}
                  className="rounded-full bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-700"
                >
                  Numeros de Asiento
                </button>
                <button
                  onClick={() => handleVerPasajerosAdicionales(reserva)}
                  className="rounded-full bg-slate-700 px-8 py-4 text-base font-semibold text-white hover:bg-slate-800"
                >
                  Ver Pasajeros Adicionales
                </button>
              </div>
            )}

            {/* Precio, Método de Pago y Cancelar */}
            <div className="relative border-t border-slate-200 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-600">Monto Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${formatCurrency(
                      reserva.estado === 'confirmada' && reserva.pago_monto
                        ? Number(reserva.pago_monto)
                        : getTotalBaseReserva(reserva)
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Precio base: ${formatCurrency(getTotalBaseReserva(reserva))}</p>
                  {getCantidadPasajeros(reserva) > 1 && (
                    <p className="text-xs text-slate-500">Precio por pasajero: ${formatCurrency(Number(reserva.precio_base || 0))}</p>
                  )}
                </div>
                {reserva.estado === 'confirmada' && reserva.pago_metodo && (
                  <div>
                    <p className="text-sm font-medium text-slate-600">Método de Pago</p>
                    {(() => {
                      const ultimos4 = normalizeLast4(reserva.pago_tarjeta_ultimos4);
                      return (
                        <p className="text-base font-semibold text-slate-900">
                          {reserva.pago_metodo}
                          {ultimos4 ? ` - **** ${ultimos4}` : ''}
                        </p>
                      );
                    })()}
                    <p className="text-xs text-slate-500">
                      Cuotas: {Number(reserva.pago_cuotas || 1)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Monto por cuota: $
                      {formatCurrency(Number(reserva.pago_monto || getTotalBaseReserva(reserva)) / Number(reserva.pago_cuotas || 1))}
                    </p>
                    <p className="text-xs text-slate-500">
                      Interés: {(Number(reserva.pago_interes || 0) * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2 md:absolute md:right-0 md:top-1/2 md:mt-0 md:-translate-y-1/2 md:items-end">
                <button
                  onClick={() => handleCancelar(reserva.reserva_id)}
                  className="rounded-full bg-red-600 px-8 py-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Cancelar
                </button>
                {String(reserva.pago_estado || '').toLowerCase() === 'confirmado' && (
                  <button
                    onClick={() => handleImprimirTicket(reserva)}
                    className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Imprimir ticket (PDF)
                  </button>
                )}
              </div>
            </div>

            {/* Pagar Ahora */}
            {reserva.estado === 'pendiente' && (
              <div className="flex flex-col gap-2 border-t border-slate-200 pt-4">
                <button
                  onClick={() => handlePagarAhora(reserva)}
                  className="rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Pagar Ahora
                </button>
                    {/* Modal de pago para reservas pendientes */}
                    <PaymentMethodModal
                      open={pagoModal.open && Boolean(pagoModal.reserva)}
                      title="Pagar Reserva"
                      cards={tarjetasGuardadas}
                      selectedCardId={tarjetaSeleccionada?.tarjeta_id ?? null}
                      paymentType={tipoPago}
                      installments={cuotas}
                      cvv={cvvPago}
                      cvvError={cvvError}
                      summary={calcularResumenPago()}
                      message={mensajePago}
                      availablePoints={puntosDisponibles}
                      pointsToUse={puntosACanjear}
                      qrCheckoutUrl={qrCheckoutUrl}
                      qrImageUrl={qrImageUrl}
                      showVerifyQrButton
                      isVerifyingQr={verificandoQr}
                      confirmLabel={tipoPago === 'mercadopago_qr' ? 'Generar QR' : 'Confirmar y pagar'}
                      disableConfirm={!tipoPago || (tipoPago !== 'mercadopago_qr' && !tarjetaSeleccionada)}
                      showAddCardModal={agregarTarjetaModal}
                      newCard={tarjetaNueva}
                      newCardErrors={erroresTarjetaNueva}
                      onSelectCard={handleSeleccionarTarjeta}
                      onSelectMercadoPagoQr={handleSeleccionarMercadoPagoQr}
                      onChangeCvv={(value) => {
                        setCvvPago(value.replace(/[^0-9]/g, ''));
                        setCvvError('');
                      }}
                      onChangeInstallments={setCuotas}
                      onChangePointsToUse={(value) => {
                        const max = Math.max(0, puntosDisponibles);
                        setPuntosACanjear(Math.max(0, Math.min(Math.floor(value), max)));
                      }}
                      onOpenAddCard={() => setAgregarTarjetaModal(true)}
                      onClose={() => setPagoModal({ open: false, reserva: null })}
                      onConfirm={handleConfirmarPago}
                      onVerifyQr={handleVerificarPagoQr}
                      onOpenCheckout={() => window.open(qrCheckoutUrl, '_blank', 'noopener,noreferrer')}
                      onCloseAddCard={() => {
                        setAgregarTarjetaModal(false);
                        setErroresTarjetaNueva({});
                      }}
                      onChangeNewCard={(field, value) => {
                        handleCambioTarjetaNueva(field, value);
                        setErroresTarjetaNueva((prev) => ({ ...prev, [field]: '' }));
                      }}
                      onSaveNewCard={handleGuardarTarjetaNueva}
                    />

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

    {secundariosModal.open && secundariosModal.reserva && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-bold text-slate-900">Pasajeros adicionales de la reserva</h3>
            <button
              onClick={() => setSecundariosModal({ open: false, reserva: null })}
              className="w-full rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300 sm:w-auto"
            >
              Cerrar
            </button>
          </div>

          <p className="mb-4 text-sm text-slate-600">
            Vuelo: <span className="font-semibold text-slate-900">{secundariosModal.reserva.codigo_vuelo}</span>
          </p>

          {loadingSecundarios && <p className="text-slate-600">Cargando pasajeros adicionales...</p>}

          {!loadingSecundarios && errorSecundarios && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {errorSecundarios}
            </div>
          )}

          {!loadingSecundarios && !errorSecundarios && secundarios.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Esta reserva no tiene pasajeros adicionales cargados.
            </div>
          )}

          {!loadingSecundarios && !errorSecundarios && secundarios.length > 0 && (
            <div className="space-y-3">
              {secundarios.map((sec, idx) => (
                <div key={sec.usuario_secundario_id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">Pasajero adicional #{idx + 1}</p>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    <p><span className="font-medium text-slate-600">Apellido:</span> {sec.apellido}</p>
                    <p><span className="font-medium text-slate-600">Nombre:</span> {sec.nombre}</p>
                    <p><span className="font-medium text-slate-600">Dirección:</span> {sec.direccion}</p>
                    <p><span className="font-medium text-slate-600">Teléfono:</span> {sec.telefono}</p>
                    <p><span className="font-medium text-slate-600">DNI:</span> {sec.dni}</p>
                    <p><span className="font-medium text-slate-600">Edad:</span> {sec.edad}</p>
                    <p className="md:col-span-2"><span className="font-medium text-slate-600">Email:</span> {sec.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

    {asientosModal.open && asientosModal.reserva && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-bold text-slate-900">Numeros de Asiento</h3>
            <button
              onClick={() => setAsientosModal({ open: false, reserva: null })}
              className="w-full rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300 sm:w-auto"
            >
              Cerrar
            </button>
          </div>

          <p className="mb-4 text-sm text-slate-600">
            Vuelo: <span className="font-semibold text-slate-900">{asientosModal.reserva.codigo_vuelo}</span>
          </p>

          {loadingAsientosModal && <p className="text-slate-600">Cargando asientos...</p>}

          {!loadingAsientosModal && errorAsientosModal && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {errorAsientosModal}
            </div>
          )}

          {!loadingAsientosModal && !errorAsientosModal && (asientosPorReserva[asientosModal.reserva.reserva_id] || []).length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Esta reserva no tiene asientos registrados.
            </div>
          )}

          {!loadingAsientosModal && !errorAsientosModal && (asientosPorReserva[asientosModal.reserva.reserva_id] || []).length > 0 && (
            <div className="space-y-3">
              {(asientosPorReserva[asientosModal.reserva.reserva_id] || []).map((asiento) => (
                <div key={`${asientosModal.reserva?.reserva_id}-${asiento.numero_pasajero}-${asiento.asiento_codigo}`} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-600">
                    Pasajero #{asiento.numero_pasajero}:
                    <span className="ml-2 text-base font-semibold text-slate-900">{asiento.asiento_codigo}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}


