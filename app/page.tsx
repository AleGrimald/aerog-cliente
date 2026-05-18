'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

const emailVerificationMsg: Record<string, { text: string; ok: boolean }> = {
  ok: { text: '✅ Email verificado correctamente. Ya podés iniciar sesión.', ok: true },
  ya_verificado: { text: 'ℹ️ Tu email ya fue verificado anteriormente.', ok: true },
  token_expirado: { text: '⚠️ El link de verificación expiró. Registrate de nuevo.', ok: false },
  token_invalido: { text: '❌ Link de verificación inválido.', ok: false },
  usuario_no_encontrado: { text: '❌ No se encontró el usuario.', ok: false },
  error: { text: '❌ Error al verificar el email. Intentá de nuevo.', ok: false },
};

function EmailVerificationBanner() {
  const searchParams = useSearchParams();
  const evStatus = searchParams.get('email_verification');
  const evMsg = evStatus ? emailVerificationMsg[evStatus] : null;
  if (!evMsg) return null;
  return (
    <div className={`mb-4 rounded-lg px-4 py-3 text-sm text-center font-medium ${evMsg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
      {evMsg.text}
    </div>
  );
}

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
    <main className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 px-3 py-6 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">Aero G</h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">Gestión de Pasajes Aéreos</p>
          </div>

          <Suspense fallback={null}>
            <EmailVerificationBanner />
          </Suspense>

          <AuthForm mode={mode} onLoginSuccess={handleLoginSuccess} />

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 sm:text-base">
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </p>
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="mt-2 text-sm font-semibold text-blue-600 transition hover:text-blue-800 sm:text-base"
            >
              {mode === 'login' ? 'Regístrate aquí' : 'Inicia sesión aquí'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
