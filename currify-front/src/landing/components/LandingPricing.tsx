import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Check } from '@phosphor-icons/react';

const defaultPlans = [
  {
    name: 'Starter',
    price: '$0',
    period: '/mes',
    description: 'Perfecto para probar la tecnología.',
    features: ['1 campaña activa', '3 CVs procesados al mes', '3 créditos de Smart Fill', 'Análisis básico de candidatos', 'Extracción estándar'],
    cta: 'Comenzar Gratis', ctaLink: '/login?plan=free', featured: false,
  },
  {
    name: 'EvalenPro',
    price: '$19.990',
    period: '/mes',
    description: 'Para equipos de reclutamiento activos.',
    features: ['Campañas ilimitadas', 'Procesamiento ilimitado de CVs', 'Smart Fill ilimitado', 'Smart Match avanzado', 'Exportación de reportes', 'Soporte prioritario'],
    cta: 'Probar EvalenPro', ctaLink: '/login?plan=pro', featured: true, badge: 'Más popular',
  },
  {
    name: 'Enterprise',
    price: 'Personalizado',
    period: '',
    description: 'Para corporaciones y gran volumen.',
    features: ['Todo lo de EvalenPro', 'SSO corporativo', 'API de integración', 'Onboarding dedicado', 'SLA garantizado de servicio'],
    cta: 'Contactar Ventas', ctaLink: '/login?plan=enterprise', featured: false,
  },
];

const PricingCard: React.FC<{ plan: typeof defaultPlans[0] }> = React.memo(({ plan }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`relative rounded-2xl p-[1px] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 ${
        plan.featured
          ? 'ring-2 ring-[#4f46e5] shadow-[0_4px_30px_rgba(79,70,229,0.12)]'
          : isDark
            ? 'bg-white/[0.06]'
            : 'bg-slate-200/60'
      }`}
    >
      <div className={`rounded-[calc(1rem-1px)] p-8 h-full flex flex-col justify-between ${
        plan.featured
          ? 'bg-white dark:bg-slate-900/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
          : isDark
            ? 'bg-slate-900/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
            : 'bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
      }`}>
        <div>
          {plan.badge && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex px-4 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#4f46e5] shadow-sm">
                {plan.badge}
              </span>
            </div>
          )}

          <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-50">
            {plan.name}
          </h3>

          <div className="flex items-baseline mb-4">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
              {plan.price}
            </span>
            <span className="ml-1 text-slate-400 dark:text-slate-500 text-xs">
              {plan.period}
            </span>
          </div>

          <p className="mb-6 text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
            {plan.description}
          </p>

          <ul className="space-y-3.5 mb-8">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start">
                <Check weight="bold" className="w-4 h-4 mr-2.5 flex-shrink-0 text-[#4f46e5] mt-0.5" />
                <span className="text-slate-600 dark:text-slate-400 text-xs leading-normal">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <a
          href={plan.ctaLink}
          className={`block w-full py-2.5 px-6 text-center text-sm font-bold rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
            plan.featured
              ? 'bg-[#4f46e5] text-white hover:bg-[#4338ca] hover:shadow-[0_0_20px_rgba(79,70,229,0.25)]'
              : isDark
                ? 'border border-white/[0.08] text-slate-50 hover:bg-white/[0.04]'
                : 'border border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          {plan.cta}
        </a>
      </div>
    </div>
  );
});

const LandingPricing: React.FC = () => {
  return (
    <section id="pricing" className="py-24 lg:py-32 relative bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-4">
            Planes para cada etapa
          </h2>
          <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            Elige el plan ideal para automatizar tu flujo de reclutamiento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6 items-stretch max-w-5xl mx-auto">
          {defaultPlans.map((plan, index) => (
            <PricingCard key={index} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingPricing;
