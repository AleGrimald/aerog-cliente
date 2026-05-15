// URL base del API según el ambiente
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Si está en Vercel o dominio de producción
    if (hostname.includes('vercel.app') || hostname.includes('aerog')) {
      return 'https://aerog-server.vercel.app';
    }
    
    // Si está en localhost o desarrollo local
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('192.168')) {
      return 'http://localhost:5000';
    }
  }
  
  // Default para SSR (Next.js server-side rendering)
  return 'http://localhost:5000';
};

export const API_URL = getApiUrl();

// Función helper para hacer fetch al API
export const fetchApi = async (endpoint: string, options: any = {}) => {
  const url = `${API_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en la solicitud');
  }
  
  return response.json();
};
