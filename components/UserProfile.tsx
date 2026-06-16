'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/constants/api';

interface UserProfileProps {
  usuario: any;
}

interface TarjetaGuardada {
  tarjeta_id: number;
  titular: string;
  ultimos4: string;
  marca: string;
  tipo_tarjeta?: string;
  fabricante?: string;
  entidad_bancaria?: string;
}

interface VueloRealizado {
  reserva_id: number;
  codigo_vuelo: string;
  fecha_salida: string;
  fecha_llegada: string;
  origen_nombre: string;
  provincia_origen: string;
  destino_nombre: string;
  provincia_destino: string;
  pago_monto?: number;
  pago_metodo?: string;
  pago_fecha?: string;
  cantidad_pasajeros?: number;
}

interface MovimientoPuntos {
  movimiento_id: number;
  reserva_id?: number;
  tipo: string;
  puntos: number;
  monto_descuento?: number;
  descripcion?: string;
  fecha_movimiento: string;
}

const formatDateTime = (dateTimeString?: string): string => {
  if (!dateTimeString) return 'N/A';
  try {
    const text = String(dateTimeString).replace('T', ' ').split('.')[0].replace('Z', '');
    const [datePart, timePart = '00:00:00'] = text.split(' ');
    const [year, month, day] = datePart.split('-');
    if (!year || !month || !day) return dateTimeString;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} ${timePart}`;
  } catch {
    return dateTimeString;
  }
};

export default function UserProfile({ usuario }: UserProfileProps) {
  const [editando, setEditando] = useState(false);
  const [datosEdit, setDatosEdit] = useState({
    nombre: usuario.nombre || '',
    apellido: usuario.apellido || '',
    email: usuario.email || '',
    telefono: usuario.telefono || '',
    direccion: usuario.direccion || '',
    dni: usuario.dni || '',
  });

  const [tarjeta, setTarjeta] = useState({
    numero: '',
    titular: '',
    vencimiento: '', // MM/AA
  });

  const [agregarTarjeta, setAgregarTarjeta] = useState(false);
  const [tarjetasGuardadas, setTarjetasGuardadas] = useState<TarjetaGuardada[]>([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [erroresEdit, setErroresEdit] = useState<Record<string, string>>({});
  const [erroresTarjeta, setErroresTarjeta] = useState<Record<string, string>>({});
  const [vuelosRealizados, setVuelosRealizados] = useState<VueloRealizado[]>([]);
  const [puntosDisponibles, setPuntosDisponibles] = useState(0);
  const [puntosAcumulados, setPuntosAcumulados] = useState(0);
  const [puntosCanjeados, setPuntosCanjeados] = useState(0);
  const [movimientosPuntos, setMovimientosPuntos] = useState<MovimientoPuntos[]>([]);
  const [paginaMovimientos, setPaginaMovimientos] = useState(1);

  useEffect(() => {
    const cargarTarjeta = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/tarjeta-usuario/${usuario.usuario_id}`);
        const data = await response.json();
        if (response.ok) {
          setTarjetasGuardadas(Array.isArray(data.tarjetas) ? data.tarjetas : []);
        }
      } catch {
        // noop
      }
    };

    cargarTarjeta();
  }, [usuario.usuario_id]);

  useEffect(() => {
    const cargarInfoPerfil = async () => {
      try {
        const [vuelosResp, puntosResp] = await Promise.all([
          fetch(`${API_BASE_URL}/perfil-vuelos-realizados/${usuario.usuario_id}`),
          fetch(`${API_BASE_URL}/perfil-puntos/${usuario.usuario_id}`),
        ]);

        const vuelosData = await vuelosResp.json();
        const puntosData = await puntosResp.json();

        if (vuelosResp.ok) {
          setVuelosRealizados(Array.isArray(vuelosData.vuelos_realizados) ? vuelosData.vuelos_realizados : []);
        }

        if (puntosResp.ok) {
          setPuntosDisponibles(Number(puntosData.puntos_disponibles || 0));
          setPuntosAcumulados(Number(puntosData.puntos_acumulados || 0));
          setPuntosCanjeados(Number(puntosData.puntos_canjeados || 0));
          setMovimientosPuntos(Array.isArray(puntosData.movimientos) ? puntosData.movimientos : []);
        }
      } catch {
        // noop
      }
    };

    cargarInfoPerfil();
  }, [usuario.usuario_id]);

  const handleCambioEdit = (campo: string, valor: string) => {
    let filtered = valor;
    if (campo === 'nombre' || campo === 'apellido') {
      filtered = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    } else if (campo === 'telefono') {
      filtered = valor.replace(/[^0-9]/g, '');
    } else if (campo === 'dni') {
      filtered = valor.replace(/[^0-9]/g, '').slice(0, 9);
    } else if (campo === 'direccion') {
      filtered = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,#\-]/g, '');
    }
    setDatosEdit((prev) => ({ ...prev, [campo]: filtered }));
  };

  const handleCambioTarjeta = (campo: string, valor: string) => {
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
    setTarjeta((prev) => ({ ...prev, [campo]: filtered }));
  };

  const handleGuardarDatos = async () => {
    setMensaje({ tipo: '', texto: '' });
    const sqlPattern = /['";\\`<>=]/;
    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    const soloNumeros = /^\d+$/;
    const direccionValida = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,#\-]+$/;
    const nuevosErrores: Record<string, string> = {};

    if (!datosEdit.nombre.trim() || datosEdit.nombre.trim().length < 2)
      nuevosErrores.nombre = 'El nombre debe tener al menos 2 caracteres.';
    else if (!soloLetras.test(datosEdit.nombre.trim()) || sqlPattern.test(datosEdit.nombre))
      nuevosErrores.nombre = 'El nombre solo puede contener letras.';

    if (!datosEdit.apellido.trim() || datosEdit.apellido.trim().length < 2)
      nuevosErrores.apellido = 'El apellido debe tener al menos 2 caracteres.';
    else if (!soloLetras.test(datosEdit.apellido.trim()) || sqlPattern.test(datosEdit.apellido))
      nuevosErrores.apellido = 'El apellido solo puede contener letras.';

    if (!datosEdit.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datosEdit.email) || sqlPattern.test(datosEdit.email))
      nuevosErrores.email = 'Ingresa un email válido.';

    if (!datosEdit.telefono || !soloNumeros.test(datosEdit.telefono) || datosEdit.telefono.length < 7 || datosEdit.telefono.length > 15)
      nuevosErrores.telefono = 'El teléfono debe contener solo dígitos (7-15).';

    if (!datosEdit.dni || !soloNumeros.test(datosEdit.dni) || datosEdit.dni.length < 7 || datosEdit.dni.length > 9)
      nuevosErrores.dni = 'El DNI debe contener solo dígitos (7-9).';

    if (!datosEdit.direccion.trim() || datosEdit.direccion.trim().length < 5)
      nuevosErrores.direccion = 'La dirección debe tener al menos 5 caracteres.';
    else if (!direccionValida.test(datosEdit.direccion) || sqlPattern.test(datosEdit.direccion))
      nuevosErrores.direccion = 'La dirección contiene caracteres no permitidos.';

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresEdit(nuevosErrores);
      return;
    }

    setErroresEdit({});

    try {
      const response = await fetch(`${API_BASE_URL}/actualizar-perfil`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario_id: usuario.usuario_id,
          ...datosEdit,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo actualizar el perfil.' });
        return;
      }

      setMensaje({ tipo: 'exito', texto: 'Perfil actualizado exitosamente.' });
      setEditando(false);
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' });
    }
  };

  const handleGuardarTarjeta = async () => {
    setMensaje({ tipo: '', texto: '' });
    const sqlPattern = /['";\\`<>=]/;
    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    const nuevosErroresTarjeta: Record<string, string> = {};
    const numLimpio = tarjeta.numero.replace(/\s/g, '');

    if (!/^\d{13,19}$/.test(numLimpio) || sqlPattern.test(tarjeta.numero))
      nuevosErroresTarjeta.numero = 'El número debe contener solo dígitos (13-19).';

    if (!tarjeta.titular.trim() || tarjeta.titular.trim().length < 2 || !soloLetras.test(tarjeta.titular.trim()) || sqlPattern.test(tarjeta.titular))
      nuevosErroresTarjeta.titular = 'El titular solo puede contener letras (mín. 2 caracteres).';

    if (!tarjeta.vencimiento) {
      nuevosErroresTarjeta.vencimiento = 'Ingresa mes y año de vencimiento (MM/AA).';
    } else {
      const match = tarjeta.vencimiento.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
      const hoy = new Date();
      const anioActual = hoy.getFullYear() % 100;
      const mesActual = hoy.getMonth() + 1;

      if (!match) {
        nuevosErroresTarjeta.vencimiento = 'Formato inválido. Usa MM/AA (ej: 06/27).';
      } else {
        const mes = Number(match[1]);
        const anio = Number(match[2]);
        if (anio < anioActual || (anio === anioActual && mes < mesActual)) {
          nuevosErroresTarjeta.vencimiento = 'La tarjeta está vencida.';
        }
      }
    }

    if (Object.keys(nuevosErroresTarjeta).length > 0) {
      setErroresTarjeta(nuevosErroresTarjeta);
      return;
    }

    setErroresTarjeta({});

    try {
      const response = await fetch(`${API_BASE_URL}/agregar-tarjeta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario_id: usuario.usuario_id,
          numero: tarjeta.numero,
          titular: tarjeta.titular,
          vencimiento: tarjeta.vencimiento,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo guardar la tarjeta.' });
        return;
      }

      setMensaje({ tipo: 'exito', texto: 'Tarjeta guardada exitosamente.' });
      setAgregarTarjeta(false);
      setTarjeta({ numero: '', titular: '', vencimiento: '' });
      if (data.tarjeta) {
        setTarjetasGuardadas((prev) => [data.tarjeta, ...prev]);
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' });
    }
  };

  const handleEliminarTarjeta = async (tarjetaId: number) => {
    setMensaje({ tipo: '', texto: '' });
    try {
      const response = await fetch(`${API_BASE_URL}/eliminar-tarjeta/${tarjetaId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo eliminar la tarjeta.' });
        return;
      }

      setTarjetasGuardadas((prev) => prev.filter((tarjetaActual) => tarjetaActual.tarjeta_id !== tarjetaId));
      setMensaje({ tipo: 'exito', texto: 'Tarjeta eliminada correctamente.' });
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Perfil de Usuario</h2>

      {mensaje.texto && (
        <div
          className={`rounded-3xl p-4 ${
            mensaje.tipo === 'exito'
              ? 'border border-green-200 bg-green-50 text-green-700'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold text-slate-900">Datos Personales</h3>
          {!editando && (
            <button
              onClick={() => setEditando(true)}
              className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
            >
              Editar
            </button>
          )}
        </div>

        {editando ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nombre</label>
                <input type="text" value={datosEdit.nombre} onChange={(e) => { handleCambioEdit('nombre', e.target.value); setErroresEdit((p) => ({ ...p, nombre: '' })); }} className={`mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none ${erroresEdit.nombre ? 'border-red-500' : 'border-slate-300'}`} />
                {erroresEdit.nombre && <p className="mt-1 text-sm text-red-600">{erroresEdit.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Apellido</label>
                <input type="text" value={datosEdit.apellido} onChange={(e) => { handleCambioEdit('apellido', e.target.value); setErroresEdit((p) => ({ ...p, apellido: '' })); }} className={`mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none ${erroresEdit.apellido ? 'border-red-500' : 'border-slate-300'}`} />
                {erroresEdit.apellido && <p className="mt-1 text-sm text-red-600">{erroresEdit.apellido}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input type="email" value={datosEdit.email} onChange={(e) => { handleCambioEdit('email', e.target.value); setErroresEdit((p) => ({ ...p, email: '' })); }} className={`mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none ${erroresEdit.email ? 'border-red-500' : 'border-slate-300'}`} />
                {erroresEdit.email && <p className="mt-1 text-sm text-red-600">{erroresEdit.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Teléfono</label>
                <input type="text" value={datosEdit.telefono} onChange={(e) => { handleCambioEdit('telefono', e.target.value); setErroresEdit((p) => ({ ...p, telefono: '' })); }} className={`mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none ${erroresEdit.telefono ? 'border-red-500' : 'border-slate-300'}`} />
                {erroresEdit.telefono && <p className="mt-1 text-sm text-red-600">{erroresEdit.telefono}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">DNI</label>
                <input type="text" value={datosEdit.dni} maxLength={9} onChange={(e) => { handleCambioEdit('dni', e.target.value); setErroresEdit((p) => ({ ...p, dni: '' })); }} className={`mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none ${erroresEdit.dni ? 'border-red-500' : 'border-slate-300'}`} />
                {erroresEdit.dni && <p className="mt-1 text-sm text-red-600">{erroresEdit.dni}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Dirección</label>
                <input type="text" value={datosEdit.direccion} onChange={(e) => { handleCambioEdit('direccion', e.target.value); setErroresEdit((p) => ({ ...p, direccion: '' })); }} className={`mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none ${erroresEdit.direccion ? 'border-red-500' : 'border-slate-300'}`} />
                {erroresEdit.direccion && <p className="mt-1 text-sm text-red-600">{erroresEdit.direccion}</p>}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <button onClick={() => { setEditando(false); setErroresEdit({}); }} className="w-full rounded-full bg-slate-200 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 sm:w-auto">Cancelar</button>
              <button onClick={handleGuardarDatos} className="w-full rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto">Guardar Cambios</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div><p className="text-sm font-medium text-slate-600">Nombre</p><p className="text-lg font-semibold text-slate-900">{datosEdit.nombre}</p></div>
            <div><p className="text-sm font-medium text-slate-600">Apellido</p><p className="text-lg font-semibold text-slate-900">{datosEdit.apellido}</p></div>
            <div><p className="text-sm font-medium text-slate-600">Email</p><p className="text-lg font-semibold text-slate-900">{datosEdit.email}</p></div>
            <div><p className="text-sm font-medium text-slate-600">Teléfono</p><p className="text-lg font-semibold text-slate-900">{datosEdit.telefono}</p></div>
            <div><p className="text-sm font-medium text-slate-600">DNI</p><p className="text-lg font-semibold text-slate-900">{datosEdit.dni}</p></div>
            <div className="md:col-span-2"><p className="text-sm font-medium text-slate-600">Dirección</p><p className="text-lg font-semibold text-slate-900">{datosEdit.direccion}</p></div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold text-slate-900">Tarjeta de Crédito/Débito</h3>
          {!agregarTarjeta && (
            <button onClick={() => setAgregarTarjeta(true)} className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto">Agregar Tarjeta</button>
          )}
        </div>

        {tarjetasGuardadas.length > 0 && (
          <div className="mb-4 space-y-3">
            {tarjetasGuardadas.map((tarjetaGuardada) => (
              <div key={tarjetaGuardada.tarjeta_id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{tarjetaGuardada.tipo_tarjeta || 'No identificado'} - {tarjetaGuardada.fabricante || tarjetaGuardada.marca} - ****{tarjetaGuardada.ultimos4}</p>
                  <p className="text-sm text-slate-600">{tarjetaGuardada.entidad_bancaria || 'Entidad no identificada'}</p>
                </div>
                <button onClick={() => handleEliminarTarjeta(tarjetaGuardada.tarjeta_id)} className="w-full rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 sm:w-auto">Eliminar</button>
              </div>
            ))}
          </div>
        )}

        {agregarTarjeta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl sm:p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Agregar Tarjeta</h3>
              <p className="mb-6 text-slate-700">Completa los datos de tu tarjeta para agregarla a tu perfil.</p>
              <div className="space-y-4">
                <div>
                  <input type="text" placeholder="Número de tarjeta" value={tarjeta.numero} onChange={(e) => { handleCambioTarjeta('numero', e.target.value); setErroresTarjeta((p) => ({ ...p, numero: '' })); }} className={`w-full rounded-lg border p-2 ${erroresTarjeta.numero ? 'border-red-500' : 'border-gray-300'}`} />
                  {erroresTarjeta.numero && <p className="mt-1 text-sm text-red-600">{erroresTarjeta.numero}</p>}
                </div>
                <div>
                  <input type="text" placeholder="Titular" value={tarjeta.titular} onChange={(e) => { handleCambioTarjeta('titular', e.target.value); setErroresTarjeta((p) => ({ ...p, titular: '' })); }} className={`w-full rounded-lg border p-2 ${erroresTarjeta.titular ? 'border-red-500' : 'border-gray-300'}`} />
                  {erroresTarjeta.titular && <p className="mt-1 text-sm text-red-600">{erroresTarjeta.titular}</p>}
                </div>
                <div>
                  <input type="text" placeholder="Vencimiento (MM/AA)" value={tarjeta.vencimiento} maxLength={5} onChange={(e) => { handleCambioTarjeta('vencimiento', e.target.value); setErroresTarjeta((p) => ({ ...p, vencimiento: '' })); }} className={`w-full rounded-lg border p-2 ${erroresTarjeta.vencimiento ? 'border-red-500' : 'border-gray-300'}`} />
                  {erroresTarjeta.vencimiento && <p className="mt-1 text-sm text-red-600">{erroresTarjeta.vencimiento}</p>}
                </div>
              </div>
              <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button onClick={() => { setAgregarTarjeta(false); setErroresTarjeta({}); }} className="w-full rounded-full bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400 sm:w-auto">Cancelar</button>
                <button onClick={handleGuardarTarjeta} className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto">Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <h3 className="mb-4 text-xl font-bold text-slate-900">Programa de Puntos</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">Puntos disponibles</p>
            <p className="text-2xl font-bold text-blue-900">{puntosDisponibles}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-700">Puntos acumulados</p>
            <p className="text-2xl font-bold text-emerald-900">{puntosAcumulados}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-700">Puntos canjeados</p>
            <p className="text-2xl font-bold text-amber-900">{puntosCanjeados}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Acumulas puntos en cada compra confirmada y puedes canjearlos como descuento en tu próximo pasaje.
        </p>

        <div className="mt-4">
          <h4 className="mb-3 text-lg font-semibold text-slate-900">Últimos movimientos</h4>
          {movimientosPuntos.length === 0 ? (
            <p className="text-sm text-slate-600">Aún no tienes movimientos de puntos.</p>
          ) : (
            <>
              <div className="space-y-2">
                {(() => {
                  const elementosPorPagina = 4;
                  const totalPaginas = Math.ceil(movimientosPuntos.length / elementosPorPagina);
                  const inicio = (paginaMovimientos - 1) * elementosPorPagina;
                  const fin = inicio + elementosPorPagina;
                  const movimientosEnPagina = movimientosPuntos.slice(inicio, fin);

                  return movimientosEnPagina.map((mov) => (
                    <div key={mov.movimiento_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-900">
                          {String(mov.tipo || '').toUpperCase()} {mov.tipo === 'CANJE' ? `- ${mov.puntos} pts` : `+ ${mov.puntos} pts`}
                        </p>
                        <p className="text-xs text-slate-600">{formatDateTime(mov.fecha_movimiento)}</p>
                      </div>
                      {mov.reserva_id ? <p className="text-xs text-slate-600">Reserva #{mov.reserva_id}</p> : null}
                      {mov.descripcion ? <p className="text-xs text-slate-600">{mov.descripcion}</p> : null}
                    </div>
                  ));
                })()}
              </div>
              {(() => {
                const elementosPorPagina = 4;
                const totalPaginas = Math.ceil(movimientosPuntos.length / elementosPorPagina);
                if (totalPaginas <= 1) return null;

                return (
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setPaginaMovimientos(Math.max(1, paginaMovimientos - 1))}
                      disabled={paginaMovimientos === 1}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ← Anterior
                    </button>
                    <span className="text-sm text-slate-600">
                      Página {paginaMovimientos} de {totalPaginas}
                    </span>
                    <button
                      onClick={() => setPaginaMovimientos(Math.min(totalPaginas, paginaMovimientos + 1))}
                      disabled={paginaMovimientos === totalPaginas}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente →
                    </button>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <h3 className="mb-4 text-xl font-bold text-slate-900">Historial de Vuelos Realizados</h3>
        {vuelosRealizados.length === 0 ? (
          <p className="text-slate-600">Todavía no tienes vuelos realizados.</p>
        ) : (
          <div className="space-y-3">
            {vuelosRealizados.map((vuelo) => (
              <div key={vuelo.reserva_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-base font-bold text-slate-900">Vuelo {vuelo.codigo_vuelo} - Reserva #{vuelo.reserva_id}</p>
                  <p className="text-xs text-slate-600">Llegada: {formatDateTime(vuelo.fecha_llegada)}</p>
                </div>
                <p className="text-sm text-slate-700">
                  {vuelo.origen_nombre}, {vuelo.provincia_origen} {'->'} {vuelo.destino_nombre}, {vuelo.provincia_destino}
                </p>
                <p className="text-sm text-slate-600">Salida: {formatDateTime(vuelo.fecha_salida)}</p>
                <p className="text-sm text-slate-600">
                  Pago: {vuelo.pago_metodo || '-'} - ${Number(vuelo.pago_monto || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
