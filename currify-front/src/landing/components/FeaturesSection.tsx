import React from 'react';
import { DocumentMagnifyingGlassIcon, SparklesIcon, ScaleIcon } from '@heroicons/react/24/outline';

const features = [
  {
    icon: DocumentMagnifyingGlassIcon,
    title: 'Lectura de CVs con IA',
    description: 'Olvídate de leer currículums uno por uno. Nuestra IA extrae las habilidades, experiencia y datos clave en tiempo real.',
    color: 'indigo',
  },
  {
    icon: SparklesIcon,
    title: 'Campañas en Automático',
    description: 'Selecciona el área (Ventas, Tecnología, etc.) y deja que Evalen estructure la campaña por ti.',
    color: 'purple',
  },
  {
    icon: ScaleIcon,
    title: 'Smart Match',
    description: 'Algoritmos avanzados que comparan los requerimientos de tu oferta con el perfil del candidato, mostrándote el porcentaje de compatibilidad exacto.',
    color: 'emerald',
  },
];

const colorClasses = {
  indigo: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: 'text-indigo-600 dark:text-indigo-400',
    accent: 'from-indigo-500 to-indigo-600',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    icon: 'text-purple-600 dark:text-purple-400',
    accent: 'from-purple-500 to-purple-600',
  },
  emerald: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: 'text-emerald-600 dark:text-emerald-400',
    accent: 'from-emerald-500 to-emerald-600',
  },
};

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            ¿Por qué <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Evalen</span>?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Descubre cómo la inteligencia artificial transforma tu proceso de reclutamiento
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const colors = colorClasses[feature.color as keyof typeof colorClasses];
            return (
              <div
                key={index}
                className="group relative bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10"
              >
                {/* Icon */}
                <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-7 h-7 ${colors.icon}`} />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Accent */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl`}></div>
              </div>
            );
          })}
        </div>

        {/* Social Proof */}
        <div className="mt-20 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Empresas innovadoras ya optimizan su talento con Evalen
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale">
            {['TechCorp', 'Innovatech', 'FutureLabs', 'DataPro', 'CloudSoft'].map((company, index) => (
              <div key={index} className="text-xl font-bold text-gray-400 dark:text-gray-500">
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
