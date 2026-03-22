import React from 'react';
import { ArrowDownIcon } from '@heroicons/react/24/outline';

const DemoSection: React.FC = () => {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Mira cómo funciona
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Arrastra un CV y deja que la IA haga el trabajo pesado por ti
          </p>
        </div>

        {/* Dashboard Mockup */}
        <div className="relative group cursor-pointer">
          {/* Glow Effect on Hover */}
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-500 rounded-2xl opacity-0 group-hover:opacity-30 blur-sm transition-all duration-500"></div>
          
          {/* Main Card */}
          <div className="relative bg-gray-900 dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-3xl">
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
                <div className="bg-white dark:bg-gray-700 rounded-xl p-4 h-56">
                  <div className="space-y-3">
                    <div className="h-3 bg-indigo-200 dark:bg-indigo-800 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <div className="h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded flex items-center px-3">
                      <div className="h-2 w-2 bg-indigo-500 rounded-full mr-2"></div>
                      <div className="h-2 w-16 bg-indigo-300 dark:bg-indigo-700 rounded"></div>
                    </div>
                    <div className="h-10 bg-gray-100 dark:bg-gray-600 rounded flex items-center px-3">
                      <div className="h-2 w-16 bg-gray-300 dark:bg-gray-500 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="col-span-2 bg-white dark:bg-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                    <div className="h-8 bg-indigo-600 rounded w-24 flex items-center justify-center">
                      <div className="h-2 w-12 bg-indigo-400 rounded"></div>
                    </div>
                  </div>
                  
                  {/* Drop Zone */}
                  <div className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl p-10 text-center transition-colors group-hover:border-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20">
                    <div className="text-indigo-500 dark:text-indigo-400 font-medium mb-2 text-lg">
                      📄 Arrastra un CV aquí
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      o haz clic para seleccionar archivo
                    </div>
                  </div>

                  {/* Match Result */}
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">María García - Desarrolladora Full Stack</span>
                        <span className="font-medium text-green-600 dark:text-green-400">92% Match</span>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div className="h-full w-[92%] bg-gradient-to-r from-green-400 to-green-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Juan Pérez - Tech Lead</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">78% Match</span>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div className="h-full w-[78%] bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA below mockup */}
        <div className="mt-12 text-center">
          <a
            href="/register"
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            Prueba Evalen gratis
            <ArrowDownIcon className="w-4 h-4 animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
