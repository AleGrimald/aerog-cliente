'use client';

import { useState, ChangeEvent, Dispatch, SetStateAction } from 'react';
import { API_BASE_URL } from '@/constants/api';
import ReservationForm from './ReservationForm';
import MyReservations from './MyReservations';
import UserProfile from './UserProfile';

interface DashboardProps {
  usuario: {
    usuario_id: number;
    nombre: string;
    apellido: string;
    email: string;
    telefono?: string;
    direccion?: string;
    fecha_nacimiento?: string;
    fecha_registro?: string;
  };
  onLogout: () => void;
}

interface AirportSuggestion {
  id: number;
  label: string;
}

export default function Dashboard({ usuario, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'reservations' | 'profile'>('search');
  const [searchSection, setSearchSection] = useState<'form' | 'results'>('form');
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [origen, setOrigen] = useState('');
  const [origenId, setOrigenId] = useState<number | null>(null);
  const [origenSuggestions, setOrigenSuggestions] = useState<AirportSuggestion[]>([]);
  const [destino, setDestino] = useState('');
  const [destinoId, setDestinoId] = useState<number | null>(null);
  const [destinoSuggestions, setDestinoSuggestions] = useState<AirportSuggestion[]>([]);
  const [fechaSalida, setFechaSalida] = useState('');
  const [fechaRegreso, setFechaRegreso] = useState('');
  const [pasajeros, setPasajeros] = useState(1);
  const [mensaje, setMensaje] = useState('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingModal, setSearchingModal] = useState(false);
  const [vueloSeleccionado, setVueloSeleccionado] = useState<any>(null);

  const formatDateTime = (dateTimeString: string): string => {
    try {
      if (!dateTimeString) return 'N/A';

      // Evita conversiones de zona horaria: mostramos el datetime tal como viene de la BD.
      const normalized = dateTimeString.trim().replace('T', ' ');
      const [datePart, rawTimePart = '00:00:00'] = normalized.split(' ');
      const [year, month, day] = datePart.split('-');

      if (!year || !month || !day) {
        return 'Fecha invalida';
      }

      const cleanTime = rawTimePart.replace('Z', '').split('.')[0];
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}, ${cleanTime}`;
    } catch {
      return 'Fecha invalida';
    }
  };

  const fetchAirportSuggestions = async (query: string, setter: Dispatch<SetStateAction<AirportSuggestion[]>>) => {
    if (query.length < 2) {
      setter([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/airport-suggestions?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setter(data);
      } else {
        setter([]);
      }
    } catch {
      setter([]);
    }
  };

  const findSuggestionId = (value: string, suggestions: AirportSuggestion[]): number | null => {
    const match = suggestions.find((suggestion) => suggestion.label === value);
    return match ? match.id : null;
  };

  const handleOrigenChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setOrigen(value);
    setOrigenId(findSuggestionId(value, origenSuggestions));
    fetchAirportSuggestions(value, setOrigenSuggestions);
  };

  const handleDestinoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDestino(value);
    setDestinoId(findSuggestionId(value, destinoSuggestions));
    fetchAirportSuggestions(value, setDestinoSuggestions);
  };

  const handleSeleccionarVuelo = (vuelo: any) => {
    setVueloSeleccionado(vuelo);
    // Limpiar campos de búsqueda
    setOrigen('');
    setOrigenId(null);
    setOrigenSuggestions([]);
    setDestino('');
    setDestinoId(null);
    setDestinoSuggestions([]);
    setFechaSalida('');
    setFechaRegreso('');
    setPasajeros(1);
    setResultados([]);
    setMensaje('');
  };

  const handleVolver = () => {
    setVueloSeleccionado(null);
    setSearchSection('results');
  };

  const handleReservaConfirmada = () => {
    // Después de confirmar la reserva, regresar a la búsqueda y luego a mis reservas
    setVueloSeleccionado(null);
    setActiveTab('reservations');
  };

  // Si hay un vuelo seleccionado, mostrar el formulario de reserva
  if (vueloSeleccionado) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <header className="bg-white shadow-sm">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Aero G</h1>
              <p className="text-sm text-slate-600">Confirmación de Reserva</p>
            </div>
            <button
              onClick={onLogout}
              className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
          <button
            onClick={handleVolver}
            className="mb-6 w-full rounded-full bg-slate-600 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto"
          >
            ← Volver a resultados
          </button>

          <ReservationForm
            vuelo={vueloSeleccionado}
            usuario={usuario}
            cantidadPasajeros={pasajeros}
            onReservaConfirmada={handleReservaConfirmada}
          />
        </main>
      </div>
    );
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setResultados([]);

    if (!origenId || !destinoId) {
      setMensaje('Selecciona origen y destino válidos de la lista de sugerencias.');
      return;
    }
    if (!fechaSalida) {
      setMensaje('Selecciona una fecha de salida válida.');
      return;
    }
    if (tripType === 'round-trip' && !fechaRegreso) {
      setMensaje('Selecciona una fecha de regreso válida para ida y vuelta.');
      return;
    }

    setSearchingModal(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSearchingModal(false);

    setLoading(true);

    let searchFechaRegreso: string;
    if (tripType === 'round-trip') {
      searchFechaRegreso = fechaRegreso;
    } else {
      const salida = new Date(fechaSalida);
      salida.setDate(salida.getDate() + 7);
      searchFechaRegreso = salida.toISOString().split('T')[0];
    }

    const payload = {
      origenId,
      destinoId,
      fechaSalida,
      fechaRegreso: searchFechaRegreso,
      tripType,
      pasajeros,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/buscar-vuelos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setMensaje(data.error || 'Error al buscar vuelos.');
        return;
      }

      setResultados(data.results || []);
      setMensaje(`Se encontraron ${data.results?.length ?? 0} vuelos para tu búsqueda.`);
      setSearchSection('results');
    } catch {
      setMensaje('No se pudo conectar con el servidor de vuelos.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-CA');
  const minFechaRegreso = fechaSalida
    ? (() => {
        const [y, m, d] = fechaSalida.split('-').map(Number);
        return new Date(y, m - 1, d + 1).toLocaleDateString('en-CA');
      })()
    : new Date(Date.now() + 86400000).toLocaleDateString('en-CA');

  return (
    <>
    {/* Modal buscando vuelos */}
    {searchingModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="mx-4 flex max-w-sm flex-col items-center gap-5 rounded-3xl bg-white px-6 py-8 text-center shadow-2xl sm:px-12 sm:py-10">
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
          <p className="text-xl font-semibold text-slate-800">Buscando vuelos...</p>
          <p className="text-sm text-slate-500">Estamos encontrando las mejores opciones para vos</p>
        </div>
      </div>
    )}
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Aero G</h1>
            <p className="text-sm text-slate-600">Bienvenido, {usuario.nombre}</p>
          </div>

          <nav className="hidden gap-6 text-sm font-medium text-slate-700 md:flex">
            <button
              onClick={() => {
                setActiveTab('search');
                setSearchSection('form');
              }}
              className="hover:text-slate-900 cursor-pointer bg-none border-none p-0"
            >
              Inicio
            </button>
            <button onClick={() => setActiveTab('reservations')} className="hover:text-slate-900 cursor-pointer bg-none border-none p-0">Mis Reservas</button>
            <button onClick={() => setActiveTab('profile')} className="hover:text-slate-900 cursor-pointer bg-none border-none p-0">Perfil de Usuario</button>
          </nav>

          <button
            onClick={onLogout}
            className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-200 pb-1 sm:mb-8 sm:gap-4">
          <button
            onClick={() => {
              setActiveTab('search');
              setSearchSection('form');
            }}
            className={`shrink-0 whitespace-nowrap px-4 py-3 text-sm font-semibold transition sm:px-6 ${
              activeTab === 'search'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Buscar Vuelos
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`shrink-0 whitespace-nowrap px-4 py-3 text-sm font-semibold transition sm:px-6 ${
              activeTab === 'reservations'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mis Reservas
          </button>
        </div>

        {/* Tab: Buscar Vuelos */}
        {activeTab === 'search' && (
          <>
            {searchSection === 'form' && (
              <section className="mb-8 rounded-3xl bg-white p-4 shadow-md sm:mb-10 sm:p-8">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Buscar pasajes</h2>
                    <p className="mt-2 text-slate-600">Encuentra tu próximo vuelo de ida o ida y vuelta.</p>
                  </div>
                  <div className="rounded-3xl bg-slate-100 px-5 py-3 text-sm text-slate-700">
                    Usuario: {usuario.nombre} {usuario.apellido}
                  </div>
                </div>

                <form onSubmit={handleSearch} className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Búsqueda de vuelo</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">Selecciona origen, destino y fechas</h3>
                      </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setTripType('one-way')}
                        className={`rounded-full px-5 py-3 text-sm font-semibold transition ${tripType === 'one-way' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 shadow-sm'}`}
                      >
                        Solo ida
                      </button>
                      <button
                        type="button"
                        onClick={() => setTripType('round-trip')}
                        className={`rounded-full px-5 py-3 text-sm font-semibold transition ${tripType === 'round-trip' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 shadow-sm'}`}
                      >
                        Ida y vuelta
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <label htmlFor="origen" className="block text-sm font-medium text-slate-700">Origen</label>
                      <input
                        id="origen"
                        list="origen-options"
                        type="text"
                        value={origen}
                        onChange={handleOrigenChange}
                        required
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                        placeholder="Provincia o aeropuerto"
                      />
                      <datalist id="origen-options">
                        {origenSuggestions.map((suggestion) => (
                          <option key={suggestion.id} value={suggestion.label} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <label htmlFor="destino" className="block text-sm font-medium text-slate-700">Destino</label>
                      <input
                        id="destino"
                        list="destino-options"
                        type="text"
                        value={destino}
                        onChange={handleDestinoChange}
                        required
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                        placeholder="Provincia o aeropuerto"
                      />
                      <datalist id="destino-options">
                        {destinoSuggestions.map((suggestion) => (
                          <option key={suggestion.id} value={suggestion.label} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className={`grid gap-4 ${tripType === 'round-trip' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <label htmlFor="fechaSalida" className="block text-sm font-medium text-slate-700">Salida</label>
                      <input
                        id="fechaSalida"
                        type="date"
                        value={fechaSalida}
                        min={today}
                        onChange={(event) => {
                          setFechaSalida(event.target.value);
                          if (fechaRegreso && event.target.value >= fechaRegreso) {
                            setFechaRegreso('');
                          }
                        }}
                        required
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {tripType === 'round-trip' && (
                    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <label htmlFor="fechaRegreso" className="block text-sm font-medium text-slate-700">Hasta</label>
                      <input
                        id="fechaRegreso"
                        type="date"
                        value={fechaRegreso}
                        min={minFechaRegreso}
                        onChange={(event) => setFechaRegreso(event.target.value)}
                        required
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    )}

                    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <label htmlFor="pasajeros" className="block text-sm font-medium text-slate-700">Pasajeros</label>
                      <input
                        id="pasajeros"
                        type="number"
                        min={1}
                        max={10}
                        value={pasajeros}
                        onChange={(event) => {
                          const val = Math.max(1, Math.min(10, Number(event.target.value)));
                          setPasajeros(val);
                        }}
                        required
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tu búsqueda está lista</p>
                      <p className="text-lg font-semibold text-slate-900">Selecciona los detalles y presiona buscar.</p>
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-3xl bg-blue-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-blue-700 md:w-auto"
                    >
                      Buscar pasajes
                    </button>
                  </div>
                </form>

                {mensaje && (
                  <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5 text-slate-700">
                    {mensaje}
                  </div>
                )}

                {loading && (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 text-slate-700">Buscando vuelos...</div>
                )}
              </section>
            )}

            {searchSection === 'results' && (
              <section className="mb-10 rounded-3xl bg-white p-4 shadow-md sm:p-8">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Resultados de Vuelo Disponible</h2>
                    <p className="mt-2 text-slate-600">Estos son los vuelos encontrados para tu búsqueda.</p>
                  </div>
                  <button
                    onClick={() => setSearchSection('form')}
                    className="w-full rounded-full bg-slate-600 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto"
                  >
                    Nueva búsqueda
                  </button>
                </div>

                {mensaje && (
                  <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-slate-700">
                    {mensaje}
                  </div>
                )}

                {loading && (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 text-slate-700">Buscando vuelos...</div>
                )}

                {!loading && resultados.length === 0 && (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
                    No se encontraron vuelos disponibles para los criterios seleccionados.
                  </div>
                )}

                {resultados.length > 0 && (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">Vuelos de ida</h3>
                    <div className="mt-4 space-y-4">
                      {resultados.map((vuelo) => (
                        <div key={vuelo.vuelo_id} className="rounded-3xl border border-slate-200 p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900">{vuelo.codigo_vuelo}</p>
                              <p className="text-sm text-slate-600">{vuelo.origen_nombre}, {vuelo.provincia_origen} → {vuelo.destino_nombre}, {vuelo.provincia_destino}</p>
                              <p className="text-sm text-slate-600">Salida: {formatDateTime(vuelo.fecha_salida)}</p>
                              <p className="text-sm text-slate-600">Llegada: {formatDateTime(vuelo.fecha_llegada)}</p>
                              <p className="text-sm text-slate-600">Precio: ${vuelo.precio_base}</p>
                            </div>
                            <button
                              onClick={() => handleSeleccionarVuelo(vuelo)}
                              className="w-full whitespace-nowrap rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
                            >
                              Seleccionar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Tab: Mis Reservas */}
        {activeTab === 'reservations' && (
          <section className="rounded-3xl bg-white p-4 shadow-md sm:p-8">
            <MyReservations usuarioId={usuario.usuario_id} />
          </section>
        )}

        {/* Tab: Perfil de Usuario */}
        {activeTab === 'profile' && (
          <section className="rounded-3xl bg-white p-4 shadow-md sm:p-8">
            <UserProfile usuario={usuario} />
          </section>
        )}
      </main>
    </div>
    </>
  );
}

