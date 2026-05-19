'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '@/constants/api';

interface UsuarioAdmin {
  usuario_id: number;
  nombre: string;
  apellido: string;
  email: string;
}

interface AdminDashboardProps {
  usuario: UsuarioAdmin;
  onLogout: () => void;
}

interface Aeropuerto {
  aeropuerto_id: number;
  nombre: string;
  ciudad: string;
  provincia: string;
  codigo_IATA: string;
}

interface Vuelo {
  vuelo_id: number;
  codigo_vuelo: string;
  aeropuerto_origen: number;
  aeropuerto_destino: number;
  origen_nombre: string;
  destino_nombre: string;
  fecha_salida: string;
  fecha_llegada: string;
  capacidad_total: number;
  asientos_disponibles: number;
  precio_base: number;
}

interface UsuarioRegistrado {
  usuario_id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  direccion?: string;
  fecha_nacimiento?: string;
  fecha_registro?: string;
}

interface ReservaAdmin {
  reserva_id: number;
  pasajero: string;
  email: string;
  codigo_vuelo: string;
  origen: string;
  destino: string;
  fecha_reserva: string;
  estado: string;
  pago_monto?: number;
  pago_metodo?: string;
}

interface RecaudacionMes {
  mes: string;
  total: number;
}

interface DestinoPedido {
  destino: string;
  provincia: string;
  cantidad: number;
}

interface VueloForm {
  codigo_vuelo: string;
  aeropuerto_origen: string;
  aeropuerto_destino: string;
  fecha_salida: string;
  fecha_llegada: string;
  capacidad_total: string;
  asientos_disponibles: string;
  precio_base: string;
}

interface UsuarioForm {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  fecha_nacimiento: string;
  password: string;
}

const initialVueloForm: VueloForm = {
  codigo_vuelo: '',
  aeropuerto_origen: '',
  aeropuerto_destino: '',
  fecha_salida: '',
  fecha_llegada: '',
  capacidad_total: '',
  asientos_disponibles: '',
  precio_base: '',
};

const initialUsuarioForm: UsuarioForm = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  direccion: '',
  fecha_nacimiento: '',
  password: '',
};

const formatDateTime = (dateTimeString?: string): string => {
  if (!dateTimeString) return 'N/A';
  const normalized = dateTimeString.replace('T', ' ').replace('Z', '').split('.')[0];
  const [datePart, timePart = '00:00:00'] = normalized.split(' ');
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return dateTimeString;
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} ${timePart}`;
};

const toInputDateTime = (dateTimeString?: string): string => {
  if (!dateTimeString) return '';
  const normalized = dateTimeString.replace(' ', 'T').replace('Z', '').split('.')[0];
  return normalized.slice(0, 16);
};

const toApiDateTime = (input: string): string => {
  if (!input) return '';
  const value = input.trim().replace('T', ' ');
  return value.length === 16 ? `${value}:00` : value;
};

export default function AdminDashboard({ usuario, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'vuelos' | 'usuarios' | 'reservas' | 'stats'>('vuelos');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [aeropuertos, setAeropuertos] = useState<Aeropuerto[]>([]);
  const [vuelos, setVuelos] = useState<Vuelo[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioRegistrado[]>([]);
  const [reservas, setReservas] = useState<ReservaAdmin[]>([]);

  const [recaudacionMensual, setRecaudacionMensual] = useState<RecaudacionMes[]>([]);
  const [vuelosReservados, setVuelosReservados] = useState(0);
  const [vuelosCancelados, setVuelosCancelados] = useState(0);
  const [destinosMasPedidos, setDestinosMasPedidos] = useState<DestinoPedido[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardandoVuelo, setGuardandoVuelo] = useState(false);
  const [eliminandoVueloId, setEliminandoVueloId] = useState<number | null>(null);
  const [editandoVueloId, setEditandoVueloId] = useState<number | null>(null);
  const [vueloForm, setVueloForm] = useState<VueloForm>(initialVueloForm);
  const [busquedaVuelos, setBusquedaVuelos] = useState('');
  const vueloFormContainerRef = useRef<HTMLDivElement | null>(null);
  const codigoVueloInputRef = useRef<HTMLInputElement | null>(null);

  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [eliminandoUsuarioId, setEliminandoUsuarioId] = useState<number | null>(null);
  const [editandoUsuarioId, setEditandoUsuarioId] = useState<number | null>(null);
  const [usuarioForm, setUsuarioForm] = useState<UsuarioForm>(initialUsuarioForm);
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('');

  const aeropuertoNombre = useMemo(() => {
    const map = new Map<number, string>();
    aeropuertos.forEach((a) => map.set(a.aeropuerto_id, `${a.nombre} (${a.codigo_IATA || 'S/C'})`));
    return map;
  }, [aeropuertos]);

  const limpiarMensajes = () => {
    setMensaje('');
    setError('');
  };

  const resetVueloForm = () => {
    setVueloForm(initialVueloForm);
    setEditandoVueloId(null);
  };

  const resetUsuarioForm = () => {
    setUsuarioForm(initialUsuarioForm);
    setEditandoUsuarioId(null);
  };

  const vuelosFiltrados = useMemo(() => {
    const q = busquedaVuelos.trim().toLowerCase();
    if (!q) return vuelos;
    return vuelos.filter((v) => {
      const texto = `${v.codigo_vuelo} ${v.origen_nombre} ${v.destino_nombre} ${formatDateTime(v.fecha_salida)} ${formatDateTime(v.fecha_llegada)}`.toLowerCase();
      return texto.includes(q);
    });
  }, [vuelos, busquedaVuelos]);

  const usuariosFiltrados = useMemo(() => {
    const q = busquedaUsuarios.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => {
      const texto = `${u.nombre || ''} ${u.apellido || ''} ${u.email || ''} ${u.telefono || ''}`.toLowerCase();
      return texto.includes(q);
    });
  }, [usuarios, busquedaUsuarios]);

  const cargarTodo = async () => {
    setLoading(true);
    limpiarMensajes();
    try {
      const [resAeropuertos, resVuelos, resUsuarios, resReservas, resStats] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/aeropuertos`),
        fetch(`${API_BASE_URL}/admin/vuelos`),
        fetch(`${API_BASE_URL}/admin/usuarios`),
        fetch(`${API_BASE_URL}/admin/reservas`),
        fetch(`${API_BASE_URL}/admin/estadisticas`),
      ]);

      const [dataAeropuertos, dataVuelos, dataUsuarios, dataReservas, dataStats] = await Promise.all([
        resAeropuertos.json(),
        resVuelos.json(),
        resUsuarios.json(),
        resReservas.json(),
        resStats.json(),
      ]);

      if (!resAeropuertos.ok) throw new Error(dataAeropuertos.error || 'No se pudieron cargar aeropuertos.');
      if (!resVuelos.ok) throw new Error(dataVuelos.error || 'No se pudieron cargar vuelos.');
      if (!resUsuarios.ok) throw new Error(dataUsuarios.error || 'No se pudieron cargar usuarios.');
      if (!resReservas.ok) throw new Error(dataReservas.error || 'No se pudieron cargar reservas.');
      if (!resStats.ok) throw new Error(dataStats.error || 'No se pudieron cargar estadísticas.');

      setAeropuertos(Array.isArray(dataAeropuertos.aeropuertos) ? dataAeropuertos.aeropuertos : []);
      setVuelos(Array.isArray(dataVuelos.vuelos) ? dataVuelos.vuelos : []);
      setUsuarios(Array.isArray(dataUsuarios.usuarios) ? dataUsuarios.usuarios : []);
      setReservas(Array.isArray(dataReservas.reservas) ? dataReservas.reservas : []);
      setRecaudacionMensual(Array.isArray(dataStats.recaudacion_mensual) ? dataStats.recaudacion_mensual : []);
      setVuelosReservados(Number(dataStats.vuelos_reservados || 0));
      setVuelosCancelados(Number(dataStats.vuelos_cancelados || 0));
      setDestinosMasPedidos(Array.isArray(dataStats.destinos_mas_pedidos) ? dataStats.destinos_mas_pedidos : []);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar el panel de administración.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    if (activeTab !== 'vuelos' || editandoVueloId === null) return;

    const timer = window.setTimeout(() => {
      vueloFormContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      codigoVueloInputRef.current?.focus();
      codigoVueloInputRef.current?.select();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [activeTab, editandoVueloId]);

  const handleEditVuelo = (vuelo: Vuelo) => {
    limpiarMensajes();
    setEditandoVueloId(vuelo.vuelo_id);
    setVueloForm({
      codigo_vuelo: vuelo.codigo_vuelo,
      aeropuerto_origen: String(vuelo.aeropuerto_origen),
      aeropuerto_destino: String(vuelo.aeropuerto_destino),
      fecha_salida: toInputDateTime(vuelo.fecha_salida),
      fecha_llegada: toInputDateTime(vuelo.fecha_llegada),
      capacidad_total: String(vuelo.capacidad_total),
      asientos_disponibles: String(vuelo.asientos_disponibles),
      precio_base: String(vuelo.precio_base),
    });
    setActiveTab('vuelos');
  };

  const handleSubmitVuelo = async (e: React.FormEvent) => {
    e.preventDefault();
    limpiarMensajes();

    const payload = {
      codigo_vuelo: vueloForm.codigo_vuelo.trim().toUpperCase(),
      aeropuerto_origen: Number(vueloForm.aeropuerto_origen),
      aeropuerto_destino: Number(vueloForm.aeropuerto_destino),
      fecha_salida: toApiDateTime(vueloForm.fecha_salida),
      fecha_llegada: toApiDateTime(vueloForm.fecha_llegada),
      capacidad_total: Number(vueloForm.capacidad_total),
      asientos_disponibles: vueloForm.asientos_disponibles ? Number(vueloForm.asientos_disponibles) : Number(vueloForm.capacidad_total),
      precio_base: Number(vueloForm.precio_base),
    };

    if (!payload.codigo_vuelo || !payload.aeropuerto_origen || !payload.aeropuerto_destino || !payload.fecha_salida || !payload.fecha_llegada) {
      setError('Completa todos los campos obligatorios del vuelo.');
      return;
    }

    setGuardandoVuelo(true);
    try {
      const isEdit = editandoVueloId !== null;
      const url = isEdit
        ? `${API_BASE_URL}/admin/vuelos/${editandoVueloId}`
        : `${API_BASE_URL}/admin/vuelos`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No se pudo guardar el vuelo.');
        return;
      }

      setMensaje(isEdit ? 'Vuelo actualizado correctamente.' : 'Vuelo creado correctamente.');
      resetVueloForm();
      await cargarTodo();
    } catch {
      setError('No se pudo conectar con el servidor para guardar el vuelo.');
    } finally {
      setGuardandoVuelo(false);
    }
  };

  const handleEliminarVuelo = async (vueloId: number) => {
    limpiarMensajes();
    const confirmar = window.confirm('¿Seguro que deseas eliminar este vuelo?');
    if (!confirmar) return;

    setEliminandoVueloId(vueloId);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/vuelos/${vueloId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'No se pudo eliminar el vuelo.');
        return;
      }
      setMensaje('Vuelo eliminado correctamente.');
      if (editandoVueloId === vueloId) {
        resetVueloForm();
      }
      await cargarTodo();
    } catch {
      setError('No se pudo conectar con el servidor para eliminar el vuelo.');
    } finally {
      setEliminandoVueloId(null);
    }
  };

  const handleEditUsuario = (u: UsuarioRegistrado) => {
    limpiarMensajes();
    setEditandoUsuarioId(u.usuario_id);
    setUsuarioForm({
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      email: u.email || '',
      telefono: u.telefono || '',
      direccion: u.direccion || '',
      fecha_nacimiento: (u.fecha_nacimiento || '').slice(0, 10),
      password: '',
    });
    setActiveTab('usuarios');
  };

  const handleSubmitUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    limpiarMensajes();

    const payload = {
      nombre: usuarioForm.nombre.trim(),
      apellido: usuarioForm.apellido.trim(),
      email: usuarioForm.email.trim().toLowerCase(),
      telefono: usuarioForm.telefono.trim(),
      direccion: usuarioForm.direccion.trim(),
      fecha_nacimiento: usuarioForm.fecha_nacimiento,
      password: usuarioForm.password,
    };

    if (!payload.nombre || !payload.apellido || !payload.email || !payload.telefono || !payload.direccion || !payload.fecha_nacimiento) {
      setError('Completa los campos obligatorios del usuario.');
      return;
    }

    if (editandoUsuarioId === null && !payload.password) {
      setError('La contraseña es obligatoria para crear usuario.');
      return;
    }

    setGuardandoUsuario(true);
    try {
      const isEdit = editandoUsuarioId !== null;
      const url = isEdit
        ? `${API_BASE_URL}/admin/usuarios/${editandoUsuarioId}`
        : `${API_BASE_URL}/admin/usuarios`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No se pudo guardar el usuario.');
        return;
      }

      setMensaje(isEdit ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
      resetUsuarioForm();
      await cargarTodo();
    } catch {
      setError('No se pudo conectar con el servidor para guardar el usuario.');
    } finally {
      setGuardandoUsuario(false);
    }
  };

  const handleEliminarUsuario = async (usuarioId: number) => {
    limpiarMensajes();
    const confirmar = window.confirm('¿Seguro que deseas eliminar este usuario?');
    if (!confirmar) return;

    setEliminandoUsuarioId(usuarioId);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/usuarios/${usuarioId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'No se pudo eliminar el usuario.');
        return;
      }

      setMensaje('Usuario eliminado correctamente.');
      if (editandoUsuarioId === usuarioId) {
        resetUsuarioForm();
      }
      await cargarTodo();
    } catch {
      setError('No se pudo conectar con el servidor para eliminar el usuario.');
    } finally {
      setEliminandoUsuarioId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Aero G - Admin</h1>
            <p className="text-sm text-slate-600">Panel de gestión: {usuario.nombre}</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('vuelos')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === 'vuelos' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
          >
            Vuelos
          </button>
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === 'usuarios' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('reservas')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === 'reservas' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
          >
            Pasajes Reservados
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
          >
            Estadísticas
          </button>
          <button
            onClick={cargarTodo}
            className="ml-auto rounded-full bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Actualizar datos
          </button>
        </div>

        {mensaje && <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">{mensaje}</div>}
        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

        {loading && <div className="rounded-2xl bg-white p-6 shadow">Cargando datos de administración...</div>}

        {!loading && activeTab === 'vuelos' && (
          <section className="space-y-6">
            <div ref={vueloFormContainerRef} className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-2xl font-bold text-slate-900">{editandoVueloId ? 'Editar vuelo' : 'Crear vuelo'}</h2>
              <form onSubmit={handleSubmitVuelo} className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Código de vuelo</label>
                  <input
                    ref={codigoVueloInputRef}
                    type="text"
                    value={vueloForm.codigo_vuelo}
                    onChange={(e) => setVueloForm((prev) => ({ ...prev, codigo_vuelo: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Precio base</label>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={vueloForm.precio_base}
                    onChange={(e) => setVueloForm((prev) => ({ ...prev, precio_base: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Origen</label>
                  <select
                    value={vueloForm.aeropuerto_origen}
                    onChange={(e) => setVueloForm((prev) => ({ ...prev, aeropuerto_origen: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  >
                    <option value="">Selecciona origen</option>
                    {aeropuertos.map((a) => (
                      <option key={a.aeropuerto_id} value={a.aeropuerto_id}>
                        {a.nombre} ({a.codigo_IATA || 'S/C'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Destino</label>
                  <select
                    value={vueloForm.aeropuerto_destino}
                    onChange={(e) => setVueloForm((prev) => ({ ...prev, aeropuerto_destino: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  >
                    <option value="">Selecciona destino</option>
                    {aeropuertos.map((a) => (
                      <option key={a.aeropuerto_id} value={a.aeropuerto_id}>
                        {a.nombre} ({a.codigo_IATA || 'S/C'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Fecha de salida</label>
                  <input
                    type="datetime-local"
                    value={vueloForm.fecha_salida}
                    onChange={(e) => setVueloForm((prev) => ({ ...prev, fecha_salida: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Fecha de llegada</label>
                  <input
                    type="datetime-local"
                    value={vueloForm.fecha_llegada}
                    onChange={(e) => setVueloForm((prev) => ({ ...prev, fecha_llegada: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Capacidad total</label>
                  <input
                    type="number"
                    min={1}
                    value={vueloForm.capacidad_total}
                    onChange={(e) => setVueloForm((prev) => ({ ...prev, capacidad_total: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Asientos disponibles</label>
                  <input
                    type="number"
                    min={0}
                    value={vueloForm.asientos_disponibles}
                    onChange={(e) => setVueloForm((prev) => ({ ...prev, asientos_disponibles: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    placeholder="Si está vacío, usa capacidad total"
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={guardandoVuelo}
                    className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {guardandoVuelo ? 'Guardando...' : editandoVueloId ? 'Actualizar vuelo' : 'Crear vuelo'}
                  </button>
                  {editandoVueloId && (
                    <button
                      type="button"
                      onClick={resetVueloForm}
                      className="rounded-full bg-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="overflow-x-auto rounded-3xl bg-white p-4 shadow">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-xl font-semibold text-slate-900">Listado de vuelos ({vuelosFiltrados.length})</h3>
                <input
                  type="text"
                  value={busquedaVuelos}
                  onChange={(e) => setBusquedaVuelos(e.target.value)}
                  placeholder="Buscar por código, origen, destino o fecha"
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm md:w-96"
                />
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="px-3 py-2">Código</th>
                    <th className="px-3 py-2">Origen</th>
                    <th className="px-3 py-2">Destino</th>
                    <th className="px-3 py-2">Salida</th>
                    <th className="px-3 py-2">Llegada</th>
                    <th className="px-3 py-2">Cap.</th>
                    <th className="px-3 py-2">Disp.</th>
                    <th className="px-3 py-2">Precio</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vuelosFiltrados.map((v) => (
                    <tr key={v.vuelo_id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold">{v.codigo_vuelo}</td>
                      <td className="px-3 py-2">{v.origen_nombre}</td>
                      <td className="px-3 py-2">{v.destino_nombre}</td>
                      <td className="px-3 py-2">{formatDateTime(v.fecha_salida)}</td>
                      <td className="px-3 py-2">{formatDateTime(v.fecha_llegada)}</td>
                      <td className="px-3 py-2">{v.capacidad_total}</td>
                      <td className="px-3 py-2">{v.asientos_disponibles}</td>
                      <td className="px-3 py-2">${Number(v.precio_base).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditVuelo(v)}
                            className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminarVuelo(v.vuelo_id)}
                            disabled={eliminandoVueloId === v.vuelo_id}
                            className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {eliminandoVueloId === v.vuelo_id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && activeTab === 'usuarios' && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-2xl font-bold text-slate-900">{editandoUsuarioId ? 'Editar usuario' : 'Crear usuario'}</h2>
              <form onSubmit={handleSubmitUsuario} className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Nombre</label>
                  <input
                    type="text"
                    value={usuarioForm.nombre}
                    onChange={(e) => setUsuarioForm((prev) => ({ ...prev, nombre: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '') }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Apellido</label>
                  <input
                    type="text"
                    value={usuarioForm.apellido}
                    onChange={(e) => setUsuarioForm((prev) => ({ ...prev, apellido: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '') }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email (usuario)</label>
                  <input
                    type="email"
                    value={usuarioForm.email}
                    onChange={(e) => setUsuarioForm((prev) => ({ ...prev, email: e.target.value.replace(/[\"'<>\`=]/g, '') }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Teléfono</label>
                  <input
                    type="text"
                    value={usuarioForm.telefono}
                    onChange={(e) => setUsuarioForm((prev) => ({ ...prev, telefono: e.target.value.replace(/[^0-9]/g, '') }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={usuarioForm.fecha_nacimiento}
                    onChange={(e) => setUsuarioForm((prev) => ({ ...prev, fecha_nacimiento: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Contraseña {editandoUsuarioId ? '(opcional)' : ''}</label>
                  <input
                    type="password"
                    value={usuarioForm.password}
                    onChange={(e) => setUsuarioForm((prev) => ({ ...prev, password: e.target.value.replace(/[\"'<>\`=]/g, '') }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    placeholder={editandoUsuarioId ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                    required={editandoUsuarioId === null}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Dirección</label>
                  <input
                    type="text"
                    value={usuarioForm.direccion}
                    onChange={(e) => setUsuarioForm((prev) => ({ ...prev, direccion: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,#\-]/g, '') }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    required
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={guardandoUsuario}
                    className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {guardandoUsuario ? 'Guardando...' : editandoUsuarioId ? 'Actualizar usuario' : 'Crear usuario'}
                  </button>
                  {editandoUsuarioId && (
                    <button
                      type="button"
                      onClick={resetUsuarioForm}
                      className="rounded-full bg-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="overflow-x-auto rounded-3xl bg-white p-4 shadow">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-xl font-semibold text-slate-900">Usuarios registrados ({usuariosFiltrados.length})</h3>
                <input
                  type="text"
                  value={busquedaUsuarios}
                  onChange={(e) => setBusquedaUsuarios(e.target.value)}
                  placeholder="Buscar por nombre, apellido, usuario(email) o teléfono"
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm md:w-96"
                />
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Usuario</th>
                    <th className="px-3 py-2">Teléfono</th>
                    <th className="px-3 py-2">Registro</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.usuario_id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{u.usuario_id}</td>
                      <td className="px-3 py-2">{u.nombre} {u.apellido}</td>
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{u.telefono || '-'}</td>
                      <td className="px-3 py-2">{formatDateTime(u.fecha_registro)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditUsuario(u)}
                            className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminarUsuario(u.usuario_id)}
                            disabled={eliminandoUsuarioId === u.usuario_id}
                            className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {eliminandoUsuarioId === u.usuario_id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && activeTab === 'reservas' && (
          <section className="overflow-x-auto rounded-3xl bg-white p-4 shadow">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">Pasajes reservados ({reservas.length})</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2">Reserva</th>
                  <th className="px-3 py-2">Pasajero</th>
                  <th className="px-3 py-2">Vuelo</th>
                  <th className="px-3 py-2">Ruta</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Pago</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((r) => (
                  <tr key={r.reserva_id} className="border-t border-slate-100">
                    <td className="px-3 py-2">#{r.reserva_id}</td>
                    <td className="px-3 py-2">{r.pasajero}</td>
                    <td className="px-3 py-2">{r.codigo_vuelo}</td>
                    <td className="px-3 py-2">{r.origen} → {r.destino}</td>
                    <td className="px-3 py-2">{r.estado}</td>
                    <td className="px-3 py-2">{r.pago_monto ? `$${Number(r.pago_monto).toFixed(2)} (${r.pago_metodo || '-'})` : 'Sin pago'}</td>
                    <td className="px-3 py-2">{formatDateTime(r.fecha_reserva)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {!loading && activeTab === 'stats' && (
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-white p-6 shadow">
                <p className="text-sm text-slate-500">Vuelos reservados</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{vuelosReservados}</p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow">
                <p className="text-sm text-slate-500">Vuelos cancelados</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{vuelosCancelados}</p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow">
                <p className="text-sm text-slate-500">Recaudación total (12 meses)</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">
                  ${recaudacionMensual.reduce((acc, item) => acc + Number(item.total || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow">
                <h3 className="mb-4 text-xl font-semibold text-slate-900">Recaudación por mes</h3>
                {recaudacionMensual.length === 0 ? (
                  <p className="text-sm text-slate-600">No hay pagos confirmados para mostrar.</p>
                ) : (
                  <ul className="space-y-2">
                    {recaudacionMensual.map((item) => (
                      <li key={item.mes} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm">
                        <span>{item.mes}</span>
                        <span className="font-semibold text-slate-900">${Number(item.total).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-3xl bg-white p-6 shadow">
                <h3 className="mb-4 text-xl font-semibold text-slate-900">Destinos más pedidos</h3>
                {destinosMasPedidos.length === 0 ? (
                  <p className="text-sm text-slate-600">No hay reservas suficientes para calcular destinos.</p>
                ) : (
                  <ul className="space-y-2">
                    {destinosMasPedidos.map((d, index) => (
                      <li key={`${d.destino}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm">
                        <span>{d.destino}, {d.provincia}</span>
                        <span className="font-semibold text-slate-900">{d.cantidad}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

