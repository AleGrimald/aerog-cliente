// Detectar URL del API según el ambiente
export const getApiUrl = () => {
  if (typeof window === 'undefined') {
    // SSR - Next.js server side rendering
    return 'http://localhost:5000';
  }

  const hostname = window.location.hostname;
  
  // Si estamos en producción (Vercel)
  if (hostname === 'aerog-cliente.vercel.app' || hostname === 'aerog.vercel.app') {
    return 'https://aerog-server.vercel.app';
  }
  
  // Si estamos en localhost (desarrollo)
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168')) {
    return 'http://localhost:5000';
  }
  
  // Default a servidor Vercel
  return 'https://aerog-server.vercel.app';
};

export const API_BASE_URL = getApiUrl();
