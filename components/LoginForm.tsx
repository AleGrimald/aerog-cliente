'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/constants/api';

interface Usuario {
  usuario_id: number;
  nombre: string;
  apellido: string;
  email: string;
  dni?: string;
  telefono?: string;
  direccion?: string;
  fecha_nacimiento?: string;
  fecha_registro?: string;
}

interface LoginFormProps {
  onLoginSuccess: (usuario: Usuario) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errores, setErrores] = useState({ email: '', password: '' });

  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nuevosErrores = { email: '', password: '' };
    const sqlPattern = /['";\\`<>=]/;
    if (!email) nuevosErrores.email = 'El email es obligatorio.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nuevosErrores.email = 'Ingresa un email válido.';
    else if (sqlPattern.test(email)) nuevosErrores.email = 'El email contiene caracteres no permitidos.';
    if (!password) nuevosErrores.password = 'La contraseña es obligatoria.';
    else if (password.length < 6) nuevosErrores.password = 'La contraseña debe tener al menos 6 caracteres.';
    else if (sqlPattern.test(password)) nuevosErrores.password = 'La contraseña contiene caracteres no permitidos.';
    setErrores(nuevosErrores);
    if (nuevosErrores.email || nuevosErrores.password) return;

    setLoading(true);

    try {
      console.log('Intentando login a:', `${API_BASE_URL}/login`);
      
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      let result;
      try {
        result = await response.json();
        console.log('Response body:', result);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        setError('Error en la respuesta del servidor (JSON inválido)');
        setLoading(false);
        return;
      }

      if (response.ok) {
        console.log('Login exitoso', result.usuario);
        setEmail('');
        setPassword('');
        onLoginSuccess(result.usuario);
      } else {
        const errorMsg = result.error || `Error ${response.status}: al iniciar sesión`;
        console.error('Login failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Fetch error:', errorMsg, err);
      setError(`Error al conectar con el servidor: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" autoComplete="off">
      <h2 className="mb-5 text-xl font-bold text-gray-800 sm:mb-6 sm:text-2xl">Inicia Sesión</h2>

      {error && (
        <div className="rounded-lg border border-red-400 bg-red-100 px-4 py-3 text-sm text-red-700 sm:text-base">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="text"
          autoComplete="off"
          value={email}
          onChange={(e) => { setEmail(e.target.value.replace(/['";<>\\`=]/g, '')); setErrores((prev) => ({ ...prev, email: '' })); }}
          required
          className={`w-full rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${errores.email ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="tu@email.com"
        />
        {errores.email && <p className="mt-1 text-sm text-red-600">{errores.email}</p>}
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value.replace(/['";<>\\`=]/g, '')); setErrores((prev) => ({ ...prev, password: '' })); }}
          required
          className={`w-full rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${errores.password ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="••••••••"
        />
        {errores.password && <p className="mt-1 text-sm text-red-600">{errores.password}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white transition duration-200 hover:bg-blue-700 disabled:bg-blue-400"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
}

