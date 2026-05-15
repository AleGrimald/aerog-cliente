'use client';

import { useState } from 'react';
import { API_BASE_URL } from '@/constants/api';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: '',
    fecha_nacimiento: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let filtered = value;

    if (name === 'nombre' || name === 'apellido') {
      filtered = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    } else if (name === 'telefono') {
      filtered = value.replace(/[^0-9]/g, '');
    } else if (name === 'direccion') {
      filtered = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,#\-]/g, '');
    } else if (name === 'password' || name === 'confirmPassword') {
      filtered = value.replace(/['";\\`<>=]/g, '');
    }

    setFormData({
      ...formData,
      [name]: filtered,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const sqlPattern = /['";\\`<>=]/;
    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    const soloNumeros = /^\d+$/;
    const direccionValida = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,#\-]+$/;

    if (!formData.nombre.trim() || !soloLetras.test(formData.nombre.trim()) || formData.nombre.trim().length < 2) {
      setError('El nombre solo puede contener letras (mín. 2 caracteres).'); return;
    }
    if (!formData.apellido.trim() || !soloLetras.test(formData.apellido.trim()) || formData.apellido.trim().length < 2) {
      setError('El apellido solo puede contener letras (mín. 2 caracteres).'); return;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) || sqlPattern.test(formData.email)) {
      setError('Ingresa un email válido.'); return;
    }
    if (!formData.telefono || !soloNumeros.test(formData.telefono) || formData.telefono.length < 7 || formData.telefono.length > 15) {
      setError('El teléfono debe contener solo dígitos (7-15).'); return;
    }
    if (!formData.direccion.trim() || !direccionValida.test(formData.direccion) || formData.direccion.trim().length < 5) {
      setError('La dirección contiene caracteres no permitidos o es muy corta (mín. 5).'); return;
    }
    if (!formData.fecha_nacimiento) {
      setError('La fecha de nacimiento es obligatoria.'); return;
    }
    if (!formData.password || formData.password.length < 6 || sqlPattern.test(formData.password)) {
      setError('La contraseña debe tener al menos 6 caracteres y no contener caracteres no permitidos.'); return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden'); return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          telefono: formData.telefono,
          direccion: formData.direccion,
          fecha_nacimiento: formData.fecha_nacimiento || null,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Registro exitoso. Ahora inicia sesión.');
        setFormData({
          nombre: '',
          apellido: '',
          email: '',
          telefono: '',
          direccion: '',
          fecha_nacimiento: '',
          password: '',
          confirmPassword: '',
        });
      } else {
        setError(result.error || 'Error al registrarse');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Crear Cuenta</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre
          </label>
          <input
            id="nombre"
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Juan"
          />
        </div>
        <div>
          <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-2">
            Apellido
          </label>
          <input
            id="apellido"
            type="text"
            name="apellido"
            value={formData.apellido}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Pérez"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="tu@email.com"
        />
      </div>

      <div>
        <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
          Teléfono
        </label>
        <input
          id="telefono"
          type="tel"
          name="telefono"
          value={formData.telefono}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="123456789"
        />
      </div>

      <div>
        <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-2">
          Dirección
        </label>
        <input
          id="direccion"
          type="text"
          name="direccion"
          value={formData.direccion}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Av. Siempre Viva 123"
        />
      </div>

      <div>
        <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-gray-700 mb-2">
          Fecha de Nacimiento
        </label>
        <input
          id="fecha_nacimiento"
          type="date"
          name="fecha_nacimiento"
          value={formData.fecha_nacimiento}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Confirmar Contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
      >
        {loading ? 'Registrando...' : 'Crear Cuenta'}
      </button>
    </form>
  );
}

