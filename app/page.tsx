'use client';

import { useEffect, useState } from 'react';
import AuthForm from '@/components/AuthForm';
import Dashboard from '@/components/Dashboard';
import AdminDashboard from '../components/AdminDashboard';

interface Usuario {
  usuario_id: number;
  nombre: string;
  apellido: string;
  email: string;
  es_admin?: boolean;
  telefono?: string;
  direccion?: string;
  fecha_nacimiento?: string;
  fecha_registro?: string;
}

const esUsuarioAdmin = (user: Usuario) => {
  const email = (user.email || '').trim().toLowerCase();
  return Boolean(user.es_admin) || email === 'admin@gmail.com';
};

export default function Home() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('usuario') : null;
    if (stored) {
      try {
        setUsuario(JSON.parse(stored));
      } catch {
        localStorage.removeItem('usuario');
      }
    }
  }, []);

  const handleLoginSuccess = (user: Usuario) => {
    setUsuario(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    setUsuario(null);
    setMode('login');
  };

  if (usuario) {
    if (esUsuarioAdmin(usuario)) {
      return <AdminDashboard usuario={usuario} onLogout={handleLogout} />;
    }
    return <Dashboard usuario={usuario} onLogout={handleLogout} />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Aero G</h1>
            <p className="text-gray-600 mt-2">Gestión de Pasajes Aéreos</p>
          </div>

          <AuthForm mode={mode} onLoginSuccess={handleLoginSuccess} />

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </p>
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="mt-2 text-blue-600 font-semibold hover:text-blue-800 transition"
            >
              {mode === 'login' ? 'Regístrate aquí' : 'Inicia sesión aquí'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
