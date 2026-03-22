import React from 'react';
import { UserPlusIcon, DocumentArrowUpIcon, SparklesIcon } from '@heroicons/react/24/outline';

const steps = [
  {
    number: '01',
    icon: UserPlusIcon,
    title: 'Regístrate y cuéntanos sobre tu empresa',
    description: 'Crea tu cuenta en segundos y bríndanos información básica sobre tu empresa y necesidades de reclutamiento.',
  },
  {
    number: '02',
    icon: DocumentArrowUpIcon,
    title: 'Arrastra un CV o elige un área de especialidad',
    description: 'Sube currículums de candidatos o selecciona el área de trabajo. Nosotros hacemos el resto.',
  },
  {
    number: '03',
    icon: SparklesIcon,
    title: '¡Comienza la magia!',
    description: 'Evalen crea la campaña y evalúa al candidato, mostrándote el porcentaje de compatibilidad al instante.',
  },
];

const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-24 bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tan simple como <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">1, 2, 3</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Empieza a reclutar de manera inteligente en minutos
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-emerald-200 dark:from-indigo-800 dark:via-purple-800 dark:to-emerald-800 -translate-y-1/2"></div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Card */}
                <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  {/* Step Number Badge */}
                  <div className="absolute -top-4 left-8">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg">
                      {step.number}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="mt-4 mb-6">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
                      <step.icon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {step.description}
                  </p>
                </div>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-6 -translate-y-1/2">
                    <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700 shadow-md">
                      <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
          >
            Empieza ahora gratis
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
