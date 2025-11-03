import React from 'react';
import { BriefcaseIcon } from '@heroicons/react/24/outline';

const FooterFinal: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Logo and Copyright */}
          <div className="flex items-center gap-2">
            <BriefcaseIcon className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Currify
            </span>
          </div>

          <p className="text-sm text-gray-600">
            © {currentYear} Currify. Todos los derechos reservados.
          </p>

          {/* Links */}
          <div className="flex gap-6">
            <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Privacidad
            </a>
            <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Términos
            </a>
            <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Contacto
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterFinal;
