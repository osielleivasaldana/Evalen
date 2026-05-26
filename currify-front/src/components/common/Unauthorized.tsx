import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <ShieldExclamationIcon className="mx-auto h-24 w-24 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Acceso Denegado
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          No tienes permisos para acceder a este recurso. Solo los administradores pueden acceder a esta página.
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Volver al Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
