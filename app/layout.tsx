import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aero G - Login',
  description: 'Sistema de gestión de pasajes aéreos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
