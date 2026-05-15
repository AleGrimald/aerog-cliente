'use client';

import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

interface Usuario {
  usuario_id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  direccion?: string;
  fecha_nacimiento?: string;
  fecha_registro?: string;
}

interface AuthFormProps {
  mode: 'login' | 'register';
  onLoginSuccess: (usuario: Usuario) => void;
}

export default function AuthForm({ mode, onLoginSuccess }: AuthFormProps) {
  return (
    <div>
      {mode === 'login' ? <LoginForm onLoginSuccess={onLoginSuccess} /> : <RegisterForm />}
    </div>
  );
}
