import React from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const HeroSection: React.FC = () => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-[120px] dark:bg-indigo-600/10"></div>
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-purple-400/20 rounded-full blur-[120px] dark:bg-purple-600/10"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-8">
            <span className="mr-2">🚀</span>
            La nueva era del reclutamiento con IA
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
            Reclutamiento inteligente{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              en segundos
            </span>
            , no en semanas.
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
            Automatiza la extracción de datos de CVs, crea campañas al instante y encuentra al candidato ideal con la magia de la Inteligencia Artificial. Sin fricción, listo para usar.
          </p>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/register"
              className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                Crear mi primera campaña gratis
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            <a
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Ya tengo cuenta
            </a>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 to-transparent z-10 pointer-events-none h-20 bottom-0 top-auto"></div>
          <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Browser Header */}
            <div className="flex items-center px-4 py-3 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-700 dark:bg-gray-600 rounded px-3 py-1 text-xs text-gray-400 text-center">
                  evalen.com/dashboard
                </div>
              </div>
            </div>
            {/* Dashboard Content Preview */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800">
              <div className="grid grid-cols-3 gap-4">
                {/* Sidebar */}
                <div className="bg-white dark:bg-gray-700 rounded-xl p-4 h-48">
                  <div className="space-y-3">
                    <div className="h-3 bg-indigo-200 dark:bg-indigo-800 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <div className="h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded"></div>
                    <div className="h-8 bg-gray-100 dark:bg-gray-600 rounded"></div>
                  </div>
                </div>
                {/* Main Content */}
                <div className="col-span-2 bg-white dark:bg-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                    <div className="h-8 bg-indigo-600 rounded w-24"></div>
                  </div>
                  <div className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl p-8 text-center">
                    <div className="text-indigo-500 dark:text-indigo-400 font-medium mb-2">
                      📄 Arrastra un CV aquí
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      o haz clic para seleccionar archivo
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex-1 h-4 bg-green-100 dark:bg-green-900/30 rounded">
                      <div className="h-full bg-green-500 rounded" style={{ width: '85%' }}></div>
                    </div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">85% Match</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
