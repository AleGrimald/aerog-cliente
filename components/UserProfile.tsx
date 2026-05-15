'use client';

import { useEffect, useState } from 'react';

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

export default function UserProfile({ usuario }: UserProfileProps) {
  const [editando, setEditando] = useState(false);
  const [datosEdit, setDatosEdit] = useState({
    nombre: usuario.nombre || '',
    apellido: usuario.apellido || '',
    email: usuario.email || '',
    telefono: usuario.telefono || '',
    direccion: usuario.direccion || '',
  });

  const [tarjeta, setTarjeta] = useState({
    numero: '',
    titular: '',
    vencimiento: '',
    cvv: '',
  });

  const [agregarTarjeta, setAgregarTarjeta] = useState(false);
  const [tarjetasGuardadas, setTarjetasGuardadas] = useState<TarjetaGuardada[]>([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [erroresEdit, setErroresEdit] = useState<Record<string, string>>({});
  const [erroresTarjeta, setErroresTarjeta] = useState<Record<string, string>>({});

  useEffect(() => {
    const cargarTarjeta = async () => {
      try {
        const response = await fetch(`http://localhost:5000/tarjeta-usuario/${usuario.usuario_id}`);
        const data = await response.json();
        if (response.ok) {
          setTarjetasGuardadas(Array.isArray(data.tarjetas) ? data.tarjetas : []);
        }
      } catch {
        // Ignoramos error silenciosamente para no romper el perfil.
      }
    };

    cargarTarjeta();
  }, [usuario.usuario_id]);

  const handleCambioEdit = (campo: string, valor: string) => {
    let filtered = valor;
    if (campo === 'nombre' || campo === 'apellido') {
      filtered = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    } else if (campo === 'telefono') {
      filtered = valor.replace(/[^0-9]/g, '');
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
      filtered = valor.replace(/[^0-9/]/g, '');
    } else if (campo === 'cvv') {
      filtered = valor.replace(/[^0-9]/g, '');
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
      const response = await fetch('http://localhost:5000/actualizar-perfil', {
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

    const vencimientoRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!vencimientoRegex.test(tarjeta.vencimiento)) {
      nuevosErroresTarjeta.vencimiento = 'Formato inválido. Usa MM/AA (ej: 12/27).';
    } else {
      const [mes, anio] = tarjeta.vencimiento.split('/').map(Number);
      const ahora = new Date();
      const anioCompleto = 2000 + anio;
      if (anioCompleto < ahora.getFullYear() || (anioCompleto === ahora.getFullYear() && mes < ahora.getMonth() + 1))
        nuevosErroresTarjeta.vencimiento = 'La tarjeta está vencida.';
    }

    if (!/^\d{3,4}$/.test(tarjeta.cvv) || sqlPattern.test(tarjeta.cvv))
      nuevosErroresTarjeta.cvv = 'El CVV debe tener 3 o 4 dígitos.';

    if (Object.keys(nuevosErroresTarjeta).length > 0) {
      setErroresTarjeta(nuevosErroresTarjeta);
      return;
    }
    setErroresTarjeta({});
    try {
      const response = await fetch('http://localhost:5000/agregar-tarjeta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario_id: usuario.usuario_id,
          numero: tarjeta.numero,
          titular: tarjeta.titular,
          vencimiento: tarjeta.vencimiento,
          cvv: tarjeta.cvv,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo guardar la tarjeta.' });
        return;
      }

      setMensaje({ tipo: 'exito', texto: 'Tarjeta guardada exitosamente.' });
      setAgregarTarjeta(false);
      setTarjeta({ numero: '', titular: '', vencimiento: '', cvv: '' });
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
      const response = await fetch(`http://localhost:5000/eliminar-tarjeta/${tarjetaId}`, {
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
      <h2 className="text-2xl font-bold text-slate-900">Perfil de Usuario</h2>

      {/* Mensaje de estado */}
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

      {/* Datos Personales */}
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Datos Personales</h3>
          {!editando && (
            <button
              onClick={() => setEditando(true)}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
                <input
                  type="text"
                  value={datosEdit.nombre}
                  onChange={(e) => { handleCambioEdit('nombre', e.target.value); setErroresEdit((p) => ({ ...p, nombre: '' })); }}
                  className={`mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none ${erroresEdit.nombre ? 'border-red-500' : 'border-slate-300'}`}
                />
                {erroresEdit.nombre && <p className="mt-1 text-sm text-red-600">{erroresEdit.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Apellido</label>
                <input
                  type="text"
                  value={datosEdit.apellido}
                  onChange={(e) => { handleCambioEdit('apellido', e.target.value); setErroresEdit((p) => ({ ...p, apellido: '' })); }}
                  className={`mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none ${erroresEdit.apellido ? 'border-red-500' : 'border-slate-300'}`}
                />
                {erroresEdit.apellido && <p className="mt-1 text-sm text-red-600">{erroresEdit.apellido}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={datosEdit.email}
                  onChange={(e) => { handleCambioEdit('email', e.target.value); setErroresEdit((p) => ({ ...p, email: '' })); }}
                  className={`mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none ${erroresEdit.email ? 'border-red-500' : 'border-slate-300'}`}
                />
                {erroresEdit.email && <p className="mt-1 text-sm text-red-600">{erroresEdit.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Teléfono</label>
                <input
                  type="text"
                  value={datosEdit.telefono}
                  onChange={(e) => { handleCambioEdit('telefono', e.target.value); setErroresEdit((p) => ({ ...p, telefono: '' })); }}
                  className={`mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none ${erroresEdit.telefono ? 'border-red-500' : 'border-slate-300'}`}
                />
                {erroresEdit.telefono && <p className="mt-1 text-sm text-red-600">{erroresEdit.telefono}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Dirección</label>
                <input
                  type="text"
                  value={datosEdit.direccion}
                  onChange={(e) => { handleCambioEdit('direccion', e.target.value); setErroresEdit((p) => ({ ...p, direccion: '' })); }}
                  className={`mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none ${erroresEdit.direccion ? 'border-red-500' : 'border-slate-300'}`}
                />
                {erroresEdit.direccion && <p className="mt-1 text-sm text-red-600">{erroresEdit.direccion}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                onClick={() => { setEditando(false); setErroresEdit({}); }}
                className="rounded-full bg-slate-200 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarDatos}
                className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-600">Nombre</p>
              <p className="text-lg font-semibold text-slate-900">{datosEdit.nombre}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Apellido</p>
              <p className="text-lg font-semibold text-slate-900">{datosEdit.apellido}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Email</p>
              <p className="text-lg font-semibold text-slate-900">{datosEdit.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Teléfono</p>
              <p className="text-lg font-semibold text-slate-900">{datosEdit.telefono}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-slate-600">Dirección</p>
              <p className="text-lg font-semibold text-slate-900">{datosEdit.direccion}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tarjeta de Crédito/Débito */}
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Tarjeta de Crédito/Débito</h3>
          {!agregarTarjeta && (
            <button
              onClick={() => setAgregarTarjeta(true)}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Agregar Tarjeta
            </button>
          )}
        </div>

        {tarjetasGuardadas.length > 0 && (
          <div className="mb-4 space-y-3">
            {tarjetasGuardadas.map((tarjetaGuardada) => (
              <div
                key={tarjetaGuardada.tarjeta_id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {tarjetaGuardada.tipo_tarjeta || 'No identificado'} - {tarjetaGuardada.fabricante || tarjetaGuardada.marca} - ****{tarjetaGuardada.ultimos4}
                  </p>
                  <p className="text-sm text-slate-600">
                    {tarjetaGuardada.entidad_bancaria || 'Entidad no identificada'}
                  </p>
                </div>
                <button
                  onClick={() => handleEliminarTarjeta(tarjetaGuardada.tarjeta_id)}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal para agregar tarjeta */}
        {agregarTarjeta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Agregar Tarjeta</h3>
              <p className="mb-6 text-slate-700">Completa los datos de tu tarjeta para agregarla a tu perfil.</p>
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Número de tarjeta"
                    value={tarjeta.numero}
                    onChange={(e) => { handleCambioTarjeta('numero', e.target.value); setErroresTarjeta((p) => ({ ...p, numero: '' })); }}
                    className={`w-full rounded-lg border p-2 ${erroresTarjeta.numero ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {erroresTarjeta.numero && <p className="mt-1 text-sm text-red-600">{erroresTarjeta.numero}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Titular"
                    value={tarjeta.titular}
                    onChange={(e) => { handleCambioTarjeta('titular', e.target.value); setErroresTarjeta((p) => ({ ...p, titular: '' })); }}
                    className={`w-full rounded-lg border p-2 ${erroresTarjeta.titular ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {erroresTarjeta.titular && <p className="mt-1 text-sm text-red-600">{erroresTarjeta.titular}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Vencimiento (MM/AA)"
                    value={tarjeta.vencimiento}
                    maxLength={5}
                    onChange={(e) => { handleCambioTarjeta('vencimiento', e.target.value); setErroresTarjeta((p) => ({ ...p, vencimiento: '' })); }}
                    className={`w-full rounded-lg border p-2 ${erroresTarjeta.vencimiento ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {erroresTarjeta.vencimiento && <p className="mt-1 text-sm text-red-600">{erroresTarjeta.vencimiento}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="CVV"
                    value={tarjeta.cvv}
                    maxLength={4}
                    onChange={(e) => { handleCambioTarjeta('cvv', e.target.value); setErroresTarjeta((p) => ({ ...p, cvv: '' })); }}
                    className={`w-full rounded-lg border p-2 ${erroresTarjeta.cvv ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {erroresTarjeta.cvv && <p className="mt-1 text-sm text-red-600">{erroresTarjeta.cvv}</p>}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => { setAgregarTarjeta(false); setErroresTarjeta({}); }}
                  className="rounded-full bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarTarjeta}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ...existing code... */}
      </div>
    </div>
  );
}
