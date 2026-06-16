'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/constants/api';
import PaymentMethodModal from '@/components/PaymentMethodModal';

interface DatosTitular {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
}

interface PasajeroRegistrado {
  temp_id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  dni: string;
  edad: string;
}

interface NuevoPasajeroForm {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  dni: string;
  edad: string;
}

interface ReservationFormProps {
  vuelo: any;
  usuario: any;
  cantidadPasajeros: number;
  onReservaConfirmada?: () => void;
}

const COLUMNAS_ASIENTOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

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
  const [tipoPago, setTipoPago] = useState<'debito' | 'credito' | 'mercadopago_qr' | null>(null);
  const [cuotas, setCuotas] = useState(1);
  const [mensajeReserva, setMensajeReserva] = useState({ tipo: '', texto: '' });
  const [showAsientosModal, setShowAsientosModal] = useState(false);
  const [asientosSeleccionados, setAsientosSeleccionados] = useState<string[]>([]);
  const [asientosConfirmados, setAsientosConfirmados] = useState(false);
  const [asientosOcupados, setAsientosOcupados] = useState<string[]>([]);
  const [loadingAsientos, setLoadingAsientos] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCheckoutUrl, setQrCheckoutUrl] = useState('');
  const [qrReservaId, setQrReservaId] = useState<number | null>(null);
  const [verificandoQr, setVerificandoQr] = useState(false);
  const [cvvPago, setCvvPago] = useState('');
  const [cvvError, setCvvError] = useState('');
  const [agregarTarjetaModal, setAgregarTarjetaModal] = useState(false);
  const [tarjetaNueva, setTarjetaNueva] = useState({ numero: '', titular: '', vencimiento: '' });
  const [erroresTarjetaNueva, setErroresTarjetaNueva] = useState<Record<string, string>>({});
  const [puntosDisponibles, setPuntosDisponibles] = useState(0);
  const [puntosACanjear, setPuntosACanjear] = useState(0);
  const [nuevoPasajero, setNuevoPasajero] = useState<NuevoPasajeroForm>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: '',
    dni: '',
    edad: '',
  });

  const maxPasajerosAdicionales = Math.max(cantidadPasajeros - 1, 0);

  const asientosRequeridos = cantidadPasajeros;
  const capacidadTotal = Number(vuelo?.capacidad_total) > 0 ? Number(vuelo.capacidad_total) : 0;
  const totalFilas = Math.ceil(capacidadTotal / COLUMNAS_ASIENTOS.length);

  const normalizarAsiento = (asiento: string) => asiento.trim().toUpperCase();

  const asientoExistePorCapacidad = (fila: string, numeroFila: number) => {
    if (capacidadTotal <= 0) return false;
    const idxColumna = COLUMNAS_ASIENTOS.indexOf(fila);
    if (idxColumna < 0) return false;
    const ordenAsiento = ((numeroFila - 1) * COLUMNAS_ASIENTOS.length) + idxColumna + 1;
    return ordenAsiento <= capacidadTotal;
  };

  const cargarAsientosOcupados = async () => {
    try {
      setLoadingAsientos(true);
      const response = await fetch(`${API_BASE_URL}/asientos-vuelo/${vuelo.vuelo_id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron obtener los asientos ocupados.');
      }
      const ocupados = Array.isArray(data.asientos_ocupados)
        ? data.asientos_ocupados.map((a: string) => normalizarAsiento(a))
        : [];
      setAsientosOcupados(ocupados);
    } catch {
      setMensajeReserva({ tipo: 'error', texto: 'No se pudo cargar el mapa de asientos.' });
    } finally {
      setLoadingAsientos(false);
    }
  };

  const abrirModalAsientos = async () => {
    setMensajeReserva({ tipo: '', texto: '' });
    await cargarAsientosOcupados();
    setShowAsientosModal(true);
  };

  const toggleAsiento = (asiento: string) => {
    const asientoNorm = normalizarAsiento(asiento);
    if (asientosOcupados.includes(asientoNorm)) {
      return;
    }
    setAsientosSeleccionados((prev) => {
      if (prev.includes(asientoNorm)) {
        setAsientosConfirmados(false);
        return prev.filter((a) => a !== asientoNorm);
      }
      if (prev.length >= asientosRequeridos) {
        return prev;
      }
      setAsientosConfirmados(false);
      return [...prev, asientoNorm];
    });
  };

  useEffect(() => {
    setAsientosSeleccionados([]);
    setAsientosConfirmados(false);
    setAsientosOcupados([]);
  }, [vuelo.vuelo_id, cantidadPasajeros]);

  const calcularResumenPago = () => {
    const subtotal = vuelo.precio_base * cantidadPasajeros;
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
      dni: '',
      edad: '',
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
      dni: '',
      edad: '',
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
    } else if (campo === 'dni' || campo === 'edad') {
      filtered = valor.replace(/[^0-9]/g, '');
    }
    setNuevoPasajero((prev) => ({ ...prev, [campo]: filtered }));
  };

  const handlePasajeroAdicionalChange = (
    index: number,
    campo: keyof Omit<PasajeroRegistrado, 'temp_id'>,
    valor: string
  ) => {
    let filtered = valor;
    if (campo === 'nombre' || campo === 'apellido') {
      filtered = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    } else if (campo === 'telefono') {
      filtered = valor.replace(/[^0-9]/g, '');
    } else if (campo === 'direccion') {
      filtered = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,#\-]/g, '');
    } else if (campo === 'dni' || campo === 'edad') {
      filtered = valor.replace(/[^0-9]/g, '');
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

    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    const soloNumeros = /^\d+$/;
    const direccionValida = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,#\-]+$/;

    if (!nuevoPasajero.nombre.trim() || nuevoPasajero.nombre.trim().length < 2 || !soloLetras.test(nuevoPasajero.nombre.trim())) {
      setModalError('El nombre solo puede contener letras (mín. 2 caracteres).'); return;
    }
    if (!nuevoPasajero.apellido.trim() || nuevoPasajero.apellido.trim().length < 2 || !soloLetras.test(nuevoPasajero.apellido.trim())) {
      setModalError('El apellido solo puede contener letras (mín. 2 caracteres).'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoPasajero.email)) {
      setModalError('Ingresa un email válido.'); return;
    }
    if (!soloNumeros.test(nuevoPasajero.telefono) || nuevoPasajero.telefono.length < 7 || nuevoPasajero.telefono.length > 15) {
      setModalError('El teléfono debe contener solo dígitos (7-15).'); return;
    }
    if (!nuevoPasajero.direccion.trim() || !direccionValida.test(nuevoPasajero.direccion) || nuevoPasajero.direccion.trim().length < 5) {
      setModalError('La dirección contiene caracteres no permitidos o es muy corta (mín. 5).'); return;
    }
    if (!soloNumeros.test(nuevoPasajero.dni) || nuevoPasajero.dni.length < 7 || nuevoPasajero.dni.length > 10) {
      setModalError('El DNI debe contener solo dígitos (7-10).'); return;
    }

    if (!soloNumeros.test(nuevoPasajero.edad)) {
      setModalError('La edad debe contener solo dígitos.'); return;
    }

    const edadNum = Number(nuevoPasajero.edad);
    if (edadNum < 0 || edadNum > 120) {
      setModalError('La edad debe estar entre 0 y 120.'); return;
    }

    if (pasajerosAdicionales.some((p) => p.dni === nuevoPasajero.dni)) {
      setModalError('Ya agregaste un pasajero con ese DNI.'); return;
    }

    setGuardandoPasajero(true);

    try {
      setPasajerosAdicionales((prev) => [
        ...prev,
        {
          temp_id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          nombre: nuevoPasajero.nombre,
          apellido: nuevoPasajero.apellido,
          email: nuevoPasajero.email,
          telefono: nuevoPasajero.telefono,
          direccion: nuevoPasajero.direccion,
          dni: nuevoPasajero.dni,
          edad: nuevoPasajero.edad,
        },
      ]);

      cerrarModalPasajero();
    } finally {
      setGuardandoPasajero(false);
    }
  };

  const cargarTarjetas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tarjeta-usuario/${usuario.usuario_id}`);
      const data = await response.json();
      if (response.ok && Array.isArray(data.tarjetas)) {
        setTarjetasGuardadas(data.tarjetas);
      }
    } catch {}
  };

  const cargarPuntos = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/perfil-puntos/${usuario.usuario_id}`);
      const data = await response.json();
      if (response.ok) {
        const disponibles = Math.max(0, Number(data.puntos_disponibles || 0));
        setPuntosDisponibles(disponibles);
        setPuntosACanjear((prev) => Math.min(prev, disponibles));
      }
    } catch {}
  };

  // Cargar tarjetas guardadas al montar
  useEffect(() => {
    cargarTarjetas();
  }, [usuario.usuario_id]);

  useEffect(() => {
    if (showFormaPagoModal) {
      cargarPuntos();
    }

    if (!showFormaPagoModal) {
      setAgregarTarjetaModal(false);
      setTarjetaNueva({ numero: '', titular: '', vencimiento: '' });
      setErroresTarjetaNueva({});
      setPuntosDisponibles(0);
      setPuntosACanjear(0);
    }
  }, [showFormaPagoModal]);

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

    if (asientosSeleccionados.length !== asientosRequeridos) {
      setMensajeReserva({
        tipo: 'error',
        texto: `Debes seleccionar ${asientosRequeridos} asiento(s) disponible(s).`,
      });
      return;
    }

    if (!asientosConfirmados) {
      setMensajeReserva({
        tipo: 'error',
        texto: 'Debes confirmar los asientos con el boton Aceptar en la modal.',
      });
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
    if (pasajerosAdicionales.length !== maxPasajerosAdicionales) {
      setMensajeReserva({
        tipo: 'error',
        texto: `Debes cargar ${maxPasajerosAdicionales} pasajero(s) adicional(es) para continuar.`,
      });
      return;
    }

    setShowPagoModal(false);
    setShowConfirmingModal(true);
    setShowCheckmark(false);
    setMensajeReserva({ tipo: '', texto: '' });
    setConfirmandoReserva(true);
    try {
      const payload = {
        vuelo_id: vuelo.vuelo_id,
        usuario_principal_id: usuario.usuario_id,
        asientos_seleccionados: asientosSeleccionados,
        pasajeros_secundarios: pasajerosAdicionales.map((p) => ({
          nombre: p.nombre,
          apellido: p.apellido,
          direccion: p.direccion,
          telefono: p.telefono,
          dni: p.dni,
          edad: Number(p.edad),
          email: p.email,
        })),
        estado: 'pendiente',
      };
      const response = await fetch(`${API_BASE_URL}/confirmar-reserva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setMensajeReserva({ tipo: 'error', texto: data.error || 'No se pudo crear la reserva.' });
        return;
      }
      setShowCheckmark(true);
      setMensajeReserva({ tipo: 'exito', texto: 'Reserva creada como pendiente de pago.' });
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (onReservaConfirmada) {
        onReservaConfirmada();
      }
    } catch {
      setMensajeReserva({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' });
    } finally {
      setShowConfirmingModal(false);
      setShowCheckmark(false);
      setConfirmandoReserva(false);
    }
  };

  // Paso 3: Selección de tarjeta y forma de pago
  const handleSeleccionarTarjeta = (tarjeta: any) => {
    setTarjetaSeleccionada(tarjeta);
    setCvvPago('');
    setCvvError('');
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
  const handleSeleccionarTipoPago = (tipo: 'debito' | 'credito' | 'mercadopago_qr') => {
    setTipoPago(tipo);
    if (tipo === 'mercadopago_qr') {
      setTarjetaSeleccionada(null);
      setCvvPago('');
      setCvvError('');
    }
    setCuotas(1);
  };
  const handleSeleccionarCuotas = (n: number) => {
    setCuotas(n);
  };

  const handleCambioTarjetaNueva = (campo: 'numero' | 'titular' | 'vencimiento', valor: string) => {
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
      nuevosErrores.numero = 'Ingresa el numero de tarjeta.';
    } else if (!/^\d{13,19}$/.test(tarjetaNueva.numero.replace(/\s/g, ''))) {
      nuevosErrores.numero = 'El numero de tarjeta debe tener 13-19 digitos.';
    }

    if (!tarjetaNueva.titular.trim()) {
      nuevosErrores.titular = 'Ingresa el nombre del titular.';
    } else if (!soloLetras.test(tarjetaNueva.titular.trim())) {
      nuevosErrores.titular = 'El titular solo puede contener letras.';
    }

    if (!tarjetaNueva.vencimiento) {
      nuevosErrores.vencimiento = 'Ingresa la fecha de vencimiento (MM/AA).';
    } else if (!vencimientoValido.test(tarjetaNueva.vencimiento)) {
      nuevosErrores.vencimiento = 'Formato invalido. Usa MM/AA.';
    }

    setErroresTarjetaNueva(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/agregar-tarjeta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuario.usuario_id,
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
    } catch {
      setErroresTarjetaNueva({ general: 'Error al guardar la tarjeta. Intenta nuevamente.' });
    }
  };

  const qrImageUrl = qrCheckoutUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrCheckoutUrl)}`
    : '';

  const handleVerificarPagoQr = async () => {
    if (!qrReservaId) return;
    try {
      setVerificandoQr(true);
      const response = await fetch(`${API_BASE_URL}/verificar-pago-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reserva_id: qrReservaId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMensajeReserva({ tipo: 'error', texto: data.error || 'No se pudo verificar el pago QR.' });
        return;
      }

      if (data.estado === 'confirmado') {
        setMensajeReserva({ tipo: 'exito', texto: 'Pago QR confirmado. Reserva actualizada.' });
        setShowQrModal(false);
        setQrCheckoutUrl('');
        setQrReservaId(null);
        if (onReservaConfirmada) {
          setTimeout(() => { onReservaConfirmada(); }, 1200);
        }
        return;
      }

      if (data.estado === 'pendiente') {
        setMensajeReserva({ tipo: 'error', texto: 'El pago sigue pendiente en Mercado Pago.' });
        return;
      }

      setMensajeReserva({ tipo: 'error', texto: data.mensaje || 'El pago aún no fue aprobado.' });
    } catch {
      setMensajeReserva({ tipo: 'error', texto: 'No se pudo conectar con el servidor para verificar el pago.' });
    } finally {
      setVerificandoQr(false);
    }
  };

  const handleConfirmarPago = async () => {
    if (pasajerosAdicionales.length !== maxPasajerosAdicionales) {
      setMensajeReserva({
        tipo: 'error',
        texto: `Debes cargar ${maxPasajerosAdicionales} pasajero(s) adicional(es) para continuar.`,
      });
      return;
    }

    if (tipoPago !== 'mercadopago_qr') {
      if (!tarjetaSeleccionada) {
        setMensajeReserva({ tipo: 'error', texto: 'Selecciona una tarjeta para continuar.' });
        return;
      }
      if (!/^\d{3,4}$/.test(cvvPago)) {
        setCvvError('Completa el CVV (3 o 4 dígitos).');
        setMensajeReserva({ tipo: 'error', texto: 'Ingresa un CVV válido (3 o 4 dígitos).' });
        return;
      }
      setCvvError('');
    }

    setShowFormaPagoModal(false);
    setMensajeReserva({ tipo: '', texto: '' });
    setConfirmandoReserva(true);
    try {
      // Paso 1: Crear reserva con estado 'pendiente'
      const payloadReserva = {
        vuelo_id: vuelo.vuelo_id,
        usuario_principal_id: usuario.usuario_id,
        asientos_seleccionados: asientosSeleccionados,
        pasajeros_secundarios: pasajerosAdicionales.map((p) => ({
          nombre: p.nombre,
          apellido: p.apellido,
          direccion: p.direccion,
          telefono: p.telefono,
          dni: p.dni,
          edad: Number(p.edad),
          email: p.email,
        })),
        estado: 'pendiente',
      };
      const responseReserva = await fetch(`${API_BASE_URL}/confirmar-reserva`, {
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
      if (tipoPago === 'mercadopago_qr') {
        const responsePagoQr = await fetch(`${API_BASE_URL}/crear-pago-qr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reserva_id,
            usuario_email: datosTitular.email || usuario.email,
            puntos_a_usar: Math.max(0, Math.min(puntosACanjear, puntosDisponibles)),
          }),
        });
        const rawPagoQr = await responsePagoQr.text();
        let dataPagoQr: any = {};
        if (rawPagoQr) {
          try {
            dataPagoQr = JSON.parse(rawPagoQr);
          } catch {
            dataPagoQr = {};
          }
        }
        if (!responsePagoQr.ok) {
          setMensajeReserva({
            tipo: 'error',
            texto: dataPagoQr.error || `No se pudo generar el pago QR (HTTP ${responsePagoQr.status}).`,
          });
          return;
        }

        if (dataPagoQr.checkout_url) {
          setQrCheckoutUrl(dataPagoQr.checkout_url);
          setQrReservaId(reserva_id);
          setShowQrModal(true);
        }

        setMensajeReserva({
          tipo: 'exito',
          texto: 'Reserva creada en estado pendiente. Escanea el QR para pagar y luego verifica el estado.',
        });
        return;
      }

      setShowConfirmingModal(true);
      setShowCheckmark(false);

      const payloadPago = {
        reserva_id: reserva_id,
        tarjeta_id: tarjetaSeleccionada?.tarjeta_id,
        tipo: tipoPago,
        cvv: cvvPago,
        cuotas: tipoPago === 'credito' ? cuotas : 1,
        puntos_a_usar: Math.max(0, Math.min(puntosACanjear, puntosDisponibles)),
      };
      const responsePago = await fetch(`${API_BASE_URL}/pagar-reserva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadPago),
      });
      const dataPago = await responsePago.json();
      if (!responsePago.ok) {
        setMensajeReserva({ tipo: 'error', texto: dataPago.error || 'No se pudo procesar el pago.' });
        return;
      }

      setShowCheckmark(true);
      setMensajeReserva({ tipo: 'exito', texto: 'Reserva confirmada y pago realizado.' });
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (onReservaConfirmada) {
        onReservaConfirmada();
      }
    } catch (err) {
      console.error('Error al confirmar pago/reserva:', err);
      setMensajeReserva({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' });
    } finally {
      setShowConfirmingModal(false);
      setShowCheckmark(false);
      setConfirmandoReserva(false);
    }
  };

  return (
    <>
    {/* Modal: ¿Quiere realizar el pago ahora? */}
    {showPagoModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-4">¿Quiere realizar el pago ahora?</h3>
          <p className="mb-6 text-slate-700">Puedes pagar ahora con tarjeta o dejar la reserva pendiente de pago.</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={() => setShowPagoModal(false)}
              className="w-full rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300 sm:w-auto"
            >
              Cancelar
            </button>
            <button
              onClick={handlePagarMasTarde}
              className="w-full rounded-full bg-yellow-500 px-5 py-3 text-sm font-semibold text-white hover:bg-yellow-600 sm:w-auto"
            >
              Pagar más tarde
            </button>
            <button
              onClick={handlePagoAhora}
              className="w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
            >
              Pagar ahora
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal: Selección de tarjeta y forma de pago */}
    <PaymentMethodModal
      open={showFormaPagoModal}
      title="Selecciona tarjeta y forma de pago"
      cards={tarjetasGuardadas}
      selectedCardId={tarjetaSeleccionada?.tarjeta_id ?? null}
      paymentType={tipoPago}
      installments={cuotas}
      cvv={cvvPago}
      cvvError={cvvError}
      summary={calcularResumenPago()}
      message={mensajeReserva.tipo === 'error' ? mensajeReserva.texto : ''}
      availablePoints={puntosDisponibles}
      pointsToUse={puntosACanjear}
      confirmLabel="Confirmar y pagar"
      disableConfirm={!tipoPago || (tipoPago !== 'mercadopago_qr' && !tarjetaSeleccionada)}
      showAddCardModal={agregarTarjetaModal}
      newCard={tarjetaNueva}
      newCardErrors={erroresTarjetaNueva}
      onSelectCard={handleSeleccionarTarjeta}
      onSelectMercadoPagoQr={() => handleSeleccionarTipoPago('mercadopago_qr')}
      onChangeCvv={(value) => {
        setCvvPago(value.replace(/[^0-9]/g, ''));
        setCvvError('');
      }}
      onChangeInstallments={handleSeleccionarCuotas}
      onChangePointsToUse={(value) => {
        const max = Math.max(0, puntosDisponibles);
        setPuntosACanjear(Math.max(0, Math.min(Math.floor(value), max)));
      }}
      onOpenAddCard={() => setAgregarTarjetaModal(true)}
      onClose={() => setShowFormaPagoModal(false)}
      onConfirm={handleConfirmarPago}
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

    {showQrModal && qrCheckoutUrl && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <h3 className="text-xl font-bold text-slate-900">Pagar con Mercado Pago QR</h3>
          <p className="mt-2 text-sm text-slate-600">Escaneá este código con la app de Mercado Pago para completar el pago.</p>

          <div className="mt-4 flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <img src={qrImageUrl} alt="QR Mercado Pago" className="h-72 w-72 max-w-full" />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={handleVerificarPagoQr}
              disabled={verificandoQr}
              className="w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {verificandoQr ? 'Verificando...' : 'Verificar pago QR'}
            </button>
            <button
              onClick={() => window.open(qrCheckoutUrl, '_blank', 'noopener,noreferrer')}
              className="w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Abrir checkout de Mercado Pago
            </button>
            <button
              onClick={() => {
                setShowQrModal(false);
                setQrCheckoutUrl('');
                setQrReservaId(null);
              }}
              className="w-full rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300"
            >
              Cerrar
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

    {showAsientosModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-5 shadow-xl sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Seleccionar Asientos</h3>
              <p className="text-sm text-slate-600">
                Selecciona {asientosRequeridos} asiento(s). No disponibles: gris.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAsientosModal(false)}
              className="w-full rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 sm:w-auto"
            >
              Cerrar
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Disponibles</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">Sin asiento</span>
            <span className="rounded-full bg-slate-300 px-3 py-1 text-slate-700">No disponibles</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">Seleccionados</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 p-3">
            {loadingAsientos ? (
              <p className="py-8 text-center text-slate-500">Cargando asientos...</p>
            ) : capacidadTotal <= 0 ? (
              <p className="py-8 text-center text-slate-500">No se encontro capacidad del avion para este vuelo.</p>
            ) : (
              <div className="min-w-[760px] space-y-2">
                {Array.from({ length: totalFilas }, (_, idxFila) => {
                  const numeroFila = idxFila + 1;
                  return (
                    <div key={numeroFila} className="grid grid-cols-[48px,1fr] gap-2">
                      <div className="flex items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                        {numeroFila}
                      </div>
                      <div className="grid grid-cols-9 gap-2">
                        {[
                          { type: 'seat', code: 'A' },
                          { type: 'seat', code: 'B' },
                          { type: 'aisle', code: 'L' },
                          { type: 'seat', code: 'C' },
                          { type: 'seat', code: 'D' },
                          { type: 'seat', code: 'E' },
                          { type: 'aisle', code: 'R' },
                          { type: 'seat', code: 'F' },
                          { type: 'seat', code: 'G' },
                        ].map((slot) => {
                          if (slot.type === 'aisle') {
                            return <div key={`pasillo-${slot.code}-${numeroFila}`} className="col-span-1" />;
                          }

                          const fila = slot.code;
                          const asiento = `${fila}${numeroFila}`;
                          const existe = asientoExistePorCapacidad(fila, numeroFila);

                          if (!existe) {
                            return (
                              <div
                                key={asiento}
                                className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-400"
                              >
                                --
                              </div>
                            );
                          }

                          const ocupado = asientosOcupados.includes(asiento);
                          const seleccionado = asientosSeleccionados.includes(asiento);
                          return (
                            <button
                              key={asiento}
                              type="button"
                              disabled={ocupado}
                              onClick={() => toggleAsiento(asiento)}
                              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                                ocupado
                                  ? 'cursor-not-allowed border-slate-300 bg-slate-300 text-slate-500'
                                  : seleccionado
                                    ? 'border-blue-600 bg-blue-100 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400'
                              }`}
                            >
                              {asiento}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">
              Seleccionados ({asientosSeleccionados.length}/{asientosRequeridos}):{' '}
              {asientosSeleccionados.length > 0 ? asientosSeleccionados.join(', ') : 'Ninguno'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={cargarAsientosOcupados}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Refrescar disponibilidad
              </button>
              <button
                type="button"
                onClick={() => {
                  if (asientosSeleccionados.length !== asientosRequeridos) {
                    setMensajeReserva({
                      tipo: 'error',
                      texto: `Debes seleccionar ${asientosRequeridos} asiento(s) para confirmar.`,
                    });
                    return;
                  }
                  setAsientosConfirmados(true);
                  setShowAsientosModal(false);
                }}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Aceptar asientos
              </button>
            </div>
          </div>
        </div>
      </div>
    )}


    <div className="space-y-6">
      {/* Datos del Vuelo - NO EDITABLE */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Datos del Vuelo</h2>
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
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Pasajero Principal</h2>
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
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Pasajeros Adicionales</h2>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-600">
              Registrados: {pasajerosAdicionales.length} / {maxPasajerosAdicionales}
            </p>

            {pasajerosAdicionales.length < maxPasajerosAdicionales && (
              <button
                type="button"
                onClick={abrirModalPasajero}
                className="mt-4 w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
              >
                Agregar Pasajero
              </button>
            )}

            {pasajerosAdicionales.length > 0 && (
              <div className="mt-6 space-y-3">
                {pasajerosAdicionales.map((pasajero, index) => (
                  <div key={pasajero.temp_id} className="rounded-2xl border border-slate-200 p-4">
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
                      <div>
                        <label className="block text-sm font-medium text-slate-700">DNI</label>
                        <input
                          type="text"
                          value={pasajero.dni}
                          onChange={(e) => handlePasajeroAdicionalChange(index, 'dni', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Edad</label>
                        <input
                          type="text"
                          value={pasajero.edad}
                          onChange={(e) => handlePasajeroAdicionalChange(index, 'edad', e.target.value)}
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
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={abrirModalAsientos}
            disabled={confirmandoReserva}
            className="w-full rounded-3xl bg-slate-700 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Seleccionar Asiento
          </button>
          <button
            onClick={handleConfirmar}
            disabled={confirmandoReserva}
            className="w-full rounded-3xl bg-blue-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmandoReserva ? 'Confirmando...' : 'Confirmar Reserva'}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Asientos seleccionados ({asientosSeleccionados.length}/{asientosRequeridos}):{' '}
          {asientosSeleccionados.length > 0 ? asientosSeleccionados.join(', ') : 'Aun no seleccionados'}
          <span className="ml-2 font-semibold text-slate-900">
            ({asientosConfirmados ? 'Confirmados' : 'Sin confirmar'})
          </span>
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-bold text-slate-900">Registrar pasajero adicional</h3>
              <button
                type="button"
                onClick={cerrarModalPasajero}
                className="w-full rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 sm:w-auto"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleGuardarPasajero} className="grid gap-4 md:grid-cols-2">
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
                <label className="block text-sm font-medium text-slate-700">Dirección</label>
                <input
                  type="text"
                  value={nuevoPasajero.direccion}
                  onChange={(e) => handleNuevoPasajeroChange('direccion', e.target.value)}
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
                <label className="block text-sm font-medium text-slate-700">DNI</label>
                <input
                  type="text"
                  value={nuevoPasajero.dni}
                  onChange={(e) => handleNuevoPasajeroChange('dni', e.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Edad</label>
                <input
                  type="text"
                  value={nuevoPasajero.edad}
                  onChange={(e) => handleNuevoPasajeroChange('edad', e.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={nuevoPasajero.email}
                  onChange={(e) => handleNuevoPasajeroChange('email', e.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {modalError && (
                <div className="md:col-span-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  {modalError}
                </div>
              )}

              <div className="md:col-span-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarModalPasajero}
                  className="w-full rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300 sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPasajero}
                  className="w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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

