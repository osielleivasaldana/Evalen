import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { FileText, Zap, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Lectura de CVs con IA',
    description:
      'Olvídate de leer currículums uno por uno. Nuestra IA extrae las habilidades, experiencia y datos clave en tiempo real.',
    gradient: 'from-rose-500 to-fuchsia-500',
  },
  {
    icon: Zap,
    title: 'Campañas en Automático',
    description:
      'Selecciona el área (Ventas, Tecnología, etc.) y deja que Evalen estructure la campaña por ti.',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: BarChart3,
    title: 'Smart Match',
    description:
      'Algoritmos avanzados que comparan los requerimientos de tu oferta con el perfil del candidato, mostrándote el porcentaje de compatibilidad exacto.',
    gradient: 'from-cyan-500 to-blue-500',
  },
];

const FeatureCard: React.FC<{
  feature: (typeof features)[0];
  index: number;
}> = React.memo(({ feature, index }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { ref, isVisible } = useScrollAnimation(0.1);
  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className={`glass-effect p-8 rounded-3xl transition-all duration-500 group relative overflow-hidden ${
        isVisible ? 'animate-fade-in-up' : 'opacity-0'
      } ${
        isDark
          ? 'bg-slate-900/40 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:border-fuchsia-500/50'
          : 'bg-white/60 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-rose-400/50'
      }`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* Icon */}
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${feature.gradient} group-hover:scale-110 transition-transform duration-300`}
      >
        <Icon className="w-7 h-7 text-white" />
      </div>

      {/* Title */}
      <h3
        className={`text-xl font-bold mb-3 ${
          isDark ? 'text-slate-50' : 'text-slate-900'
        }`}
      >
        {feature.title}
      </h3>

      {/* Description */}
      <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {feature.description}
      </p>

      {/* Hover Glow */}
      <div
        className={`absolute -bottom-1 -right-1 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-full blur-3xl transition-opacity duration-500`}
      ></div>
    </div>
  );
});

const FeaturesSection: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <section
      id="features"
      className={`py-24 relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#030014]' : 'bg-[#fdfdfd]'
      }`}
    >
      {/* Subtle Aurora */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 -right-40 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob transition-colors duration-1000 ${
            isDark ? 'bg-violet-600/20' : 'bg-rose-400/20'
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
            ¿Por qué{' '}
            <span className="text-gradient-vibrant">Evalen</span>?
          </h2>
          <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Descubre cómo la inteligencia artificial transforma tu proceso de reclutamiento
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
