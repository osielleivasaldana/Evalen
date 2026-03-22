import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

const plans = [
  {
    name: 'Starter',
    price: '$0',
    period: '/mes',
    description: 'Ideal para probar la magia.',
    features: [
      '1 Campaña activa',
      '15 CVs por mes',
      'Extracción básica de datos',
      'Análisis de candidatos',
    ],
    cta: 'Comenzar Gratis',
    ctaLink: '/register',
    featured: false,
  },
  {
    name: 'EvalenPro',
    price: '$49',
    period: '/mes',
    description: 'Para equipos de RRHH que buscan escalar.',
    features: [
      'Campañas ilimitadas',
      'Procesamiento ilimitado de CVs',
      'Smart Match avanzado',
      'Exportación de reportes',
      'Soporte prioritario',
    ],
    cta: 'Probar EvalenPro',
    ctaLink: '/register',
    featured: true,
    badge: 'Recomendado',
  },
  {
    name: 'Enterprise',
    price: 'Personalizado',
    period: '',
    description: 'Para grandes corporativos.',
    features: [
      'Todo lo de EvalenPro',
      'SSO corporativo',
      'API de integración',
      'Onboarding personalizado',
      'SLA garantizado',
    ],
    cta: 'Contactar Ventas',
    ctaLink: '/register',
    featured: false,
  },
];

const LandingPricing: React.FC = () => {
  return (
    <section id="pricing" className="py-24 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Planes para cada <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">etapa</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Elige el plan que mejor se adapte a tus necesidades de reclutamiento
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-8 ${
                plan.featured
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/30 scale-105 z-10'
                  : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan Name */}
              <h3 className={`text-xl font-bold mb-2 ${plan.featured ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {plan.name}
              </h3>

              {/* Price */}
              <div className="flex items-baseline mb-4">
                <span className={`text-4xl font-extrabold ${plan.featured ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {plan.price}
                </span>
                <span className={`ml-1 ${plan.featured ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                  {plan.period}
                </span>
              </div>

              {/* Description */}
              <p className={`mb-6 ${plan.featured ? 'text-indigo-100' : 'text-gray-600 dark:text-gray-300'}`}>
                {plan.description}
              </p>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <CheckIcon className={`w-5 h-5 mr-2 flex-shrink-0 ${plan.featured ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'}`} />
                    <span className={plan.featured ? 'text-white' : 'text-gray-600 dark:text-gray-300'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <a
                href={plan.ctaLink}
                className={`block w-full py-3 px-6 text-center font-bold rounded-xl transition-all ${
                  plan.featured
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Additional Note */}
        <p className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
          Todos los planes incluyen una prueba gratuita de 14 días. Sin tarjeta de crédito requerida.
        </p>
      </div>
    </section>
  );
};

export default LandingPricing;
