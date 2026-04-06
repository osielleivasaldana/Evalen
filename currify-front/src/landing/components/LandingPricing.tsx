import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { Check } from 'lucide-react';

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
    ctaLink: '/login?plan=free',
    featured: false,
  },
  {
    name: 'EvalenPro',
    price: '$49',
    period: '/mes',
    description: 'Para equipos de RR.HH. que buscan escalar.',
    features: [
      'Campañas ilimitadas',
      'Procesamiento ilimitado de CVs',
      'Smart Match avanzado',
      'Exportación de reportes',
      'Soporte prioritario',
    ],
    cta: 'Probar EvalenPro',
    ctaLink: '/login?plan=pro',
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
    ctaLink: '/login?plan=enterprise',
    featured: false,
  },
];

const PricingCard: React.FC<{
  plan: (typeof plans)[0];
  index: number;
}> = React.memo(({ plan, index }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <div
      ref={ref}
      className={`relative rounded-3xl p-8 transition-all duration-500 ${
        isVisible ? 'animate-fade-in-up' : 'opacity-0'
      } ${
        plan.featured
          ? 'bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-600 text-white shadow-2xl shadow-rose-500/20 scale-[1.02] z-10'
          : `glass-effect ${
              isDark
                ? 'bg-slate-900/40 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:border-fuchsia-500/50'
                : 'bg-white/60 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-rose-400/50'
            }`
      }`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest backdrop-blur-md border-rose-500/30 bg-rose-500/10 text-rose-300">
            {plan.badge}
          </span>
        </div>
      )}

      {/* Plan Name */}
      <h3
        className={`text-xl font-bold mb-2 ${
          plan.featured ? 'text-white' : isDark ? 'text-slate-50' : 'text-slate-900'
        }`}
      >
        {plan.name}
      </h3>

      {/* Price */}
      <div className="flex items-baseline mb-4">
        <span
          className={`text-4xl font-extrabold ${
            plan.featured ? 'text-white' : isDark ? 'text-slate-50' : 'text-slate-900'
          }`}
        >
          {plan.price}
        </span>
        <span
          className={`ml-1 ${
            plan.featured
              ? 'text-rose-200'
              : isDark
              ? 'text-slate-400'
              : 'text-slate-500'
          }`}
        >
          {plan.period}
        </span>
      </div>

      {/* Description */}
      <p
        className={`mb-6 ${
          plan.featured
            ? 'text-rose-100'
            : isDark
            ? 'text-slate-400'
            : 'text-slate-500'
        }`}
      >
        {plan.description}
      </p>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start">
            <Check
              className={`w-5 h-5 mr-2 flex-shrink-0 ${
                plan.featured
                  ? 'text-rose-200'
                  : isDark
                  ? 'text-fuchsia-400'
                  : 'text-rose-500'
              }`}
            />
            <span
              className={
                plan.featured
                  ? 'text-white'
                  : isDark
                  ? 'text-slate-400'
                  : 'text-slate-500'
              }
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <a
        href={plan.ctaLink}
        className={`block w-full py-3 px-6 text-center font-bold rounded-full transition-all ${
          plan.featured
            ? 'bg-white text-rose-600 hover:bg-rose-50 shadow-lg hover:shadow-xl'
            : `glass-effect ${
                isDark
                  ? 'bg-slate-900/40 border border-white/10 text-slate-50 hover:scale-105'
                  : 'bg-white/60 border border-slate-200/80 text-slate-900 hover:scale-105'
              }`
        }`}
      >
        {plan.cta}
      </a>
    </div>
  );
});

const LandingPricing: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <section
      id="pricing"
      className={`py-24 relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#030014]' : 'bg-[#fdfdfd]'
      }`}
    >
      {/* Subtle Aurora */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/3 left-0 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000 transition-colors duration-1000 ${
            isDark ? 'bg-fuchsia-600/15' : 'bg-rose-400/15'
          }`}
        ></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          ref={ref}
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-500 ${
            isVisible ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-4 ${
              isDark ? 'text-slate-50' : 'text-slate-900'
            }`}
          >
            Planes para cada{' '}
            <span className="text-gradient-vibrant">etapa</span>
          </h2>
          <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Elige el plan que mejor se adapte a tus necesidades de reclutamiento
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6 items-start">
          {plans.map((plan, index) => (
            <PricingCard key={index} plan={plan} index={index} />
          ))}
        </div>

        {/* Additional Note */}
        <p
          className={`mt-12 text-center text-sm ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          Todos los planes incluyen una prueba gratuita de 14 días. Sin tarjeta de crédito
          requerida.
        </p>
      </div>
    </section>
  );
};

export default LandingPricing;
