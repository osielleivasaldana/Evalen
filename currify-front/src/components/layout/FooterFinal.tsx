import React from 'react';


const FooterFinal: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Logo and Copyright */}
          <div className="flex items-center gap-2">
            <svg width="120" height="32" viewBox="0 0 180 48" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="evalen-gradient-footer" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#4F6BF6' }} />
                  <stop offset="100%" style={{ stopColor: '#8B5CF6' }} />
                </linearGradient>
              </defs>
              {/* E con gradiente */}
              <path d="M0 8 L0 40 L24 40 L24 35 L6 35 L6 26 L20 26 L20 21 L6 21 L6 13 L24 13 L24 8 Z" fill="url(#evalen-gradient-footer)" />
              {/* Corte diagonal (transparente para fondo claro) */}
              <path d="M18 8 L24 8 L6 40 L0 40 Z" fill="#ffffff" />
              {/* Wordmark */}
              <text x="30" y="34" fontFamily="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontSize="28" fontWeight="700" fill="#18181b" letterSpacing="-1">valen</text>
            </svg>
          </div>

          <p className="text-sm text-gray-600">
            © {currentYear} Evalen. Todos los derechos reservados.
          </p>

          {/* Links */}
          <div className="flex gap-6">
            <button className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Privacidad
            </button>
            <button className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Términos
            </button>
            <button className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Contacto
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterFinal;
