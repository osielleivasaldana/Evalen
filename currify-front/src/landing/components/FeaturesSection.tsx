import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FileText, Lightning, ChartBar, ArrowRight } from '@phosphor-icons/react';

const features = [
  {
    icon: FileText,
    title: 'Extracción Inteligente',
    description: 'Sube múltiples currículums en un solo lote. Nuestro procesador extrae de forma estructurada toda la información laboral, educativa y de habilidades.',
    large: true,
  },
  {
    icon: Lightning,
    title: 'Campañas en un Clic',
    description: 'Establece los criterios de contratación y deja que Evalen auto-configure la campaña de reclutamiento.',
  },
  {
    icon: ChartBar,
    title: 'Smart Match Score',
    description: 'Visualiza la compatibilidad exacta de cada candidato contra los requisitos específicos de tu puesto.',
  },
];

const FeatureCard: React.FC<{ feature: typeof features[0]; index: number; isDark: boolean }> = ({ feature, index, isDark }) => (
  <div
    className={`group relative transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 ${
      feature.large ? 'lg:col-span-2 lg:row-span-1' : 'lg:col-span-1'
    }`}
  >
    <div className={`h-full rounded-2xl p-[1px] ${
      isDark ? 'bg-white/[0.06]' : 'bg-slate-200/60'
    }`}>
      <div className={`h-full rounded-[calc(1rem-1px)] p-8 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isDark
          ? 'bg-slate-900/40 group-hover:bg-slate-900/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
          : 'bg-white group-hover:shadow-[0_8px_30px_rgba(79,70,229,0.06)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
      }`}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-6 bg-[#4f46e5]/10">
          <feature.icon weight="bold" className="w-5 h-5 text-[#4f46e5]" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-3">
          {feature.title}
        </h3>
        <p className={`leading-relaxed ${feature.large ? 'text-base' : 'text-sm'} ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {feature.description}
        </p>
      </div>
    </div>
  </div>
);

const FeaturesSection: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section id="features" className="py-24 lg:py-32 relative bg-[#ffffff] dark:bg-[#0f172a] transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-4">
            Tu flujo de trabajo optimizado
          </h2>
          <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            Elimina la revisión manual de currículums. Diseñado para simplificar cada etapa del proceso de contratación.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} isDark={isDark} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href="/login?plan=free"
            className="group inline-flex items-center bg-[#4f46e5] text-white pl-5 pr-2 py-2 rounded-full text-sm font-bold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#4338ca] hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] active:scale-[0.98]"
          >
            <span className="mr-3">Crear campaña de prueba</span>
            <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-px transition-all duration-300">
              <ArrowRight weight="bold" className="w-4 h-4" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
