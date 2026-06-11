import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { UserPlus, Upload, Sparkles, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Regístrate y cuéntanos sobre tu empresa',
    description:
      'Crea tu cuenta en segundos y bríndanos información básica sobre tu empresa y necesidades de reclutamiento.',
  },
  {
    number: '02',
    icon: Upload,
    title: 'Arrastra un CV o elige un área de especialidad',
    description:
      'Sube currículums de candidatos o selecciona el área de trabajo. Nosotros hacemos el resto.',
  },
  {
    number: '03',
    icon: Sparkles,
    title: '¡Comienza la magia!',
    description:
      'Evalen crea la campaña y evalúa al candidato, mostrándote el porcentaje de compatibilidad al instante.',
  },
];

const HowItWorks: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <section
      id="how-it-works"
      className={`py-24 relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#030014]' : 'bg-[#fdfdfd]'
      }`}
    >
      {/* Subtle Aurora */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute bottom-0 right-0 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000 transition-colors duration-1000 ${
            isDark ? 'bg-teal-500/15' : 'bg-teal-400/15'
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
            Tan simple como{' '}
            <span className="text-brand-emphasis">1, 2, 3</span>
          </h2>
          <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Empieza a reclutar de manera inteligente en minutos
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-16 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-teal-500 via-teal-400 to-amber-500 opacity-30"></div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <StepCard key={index} step={step} index={index} isDark={isDark} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <a
            href="/login?plan=free"
            className="group inline-flex items-center gap-2 px-8 py-4 bg-[#0d9488] text-white font-bold rounded-full transition-all hover:bg-[#0f766e] hover:shadow-[0_0_40px_rgba(13,148,136,0.4)] hover:scale-105"
          >
            Empieza ahora gratis
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};

const StepCard: React.FC<{
  step: (typeof steps)[0];
  index: number;
  isDark: boolean;
}> = React.memo(({ step, index, isDark }) => {
  const { ref, isVisible } = useScrollAnimation(0.1);
  const Icon = step.icon;

  return (
    <div
      ref={ref}
      className={`relative transition-all duration-500 ${
        isVisible ? 'animate-fade-in-up' : 'opacity-0'
      }`}
      style={{ animationDelay: `${index * 200}ms` }}
    >
      <div
        className={`glass-effect p-8 rounded-3xl transition-all duration-500 group relative overflow-hidden ${
          isDark
            ? 'bg-slate-900/40 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:border-teal-500/50'
            : 'bg-white/60 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-teal-400/50'
        }`}
      >
        {/* Step Number */}
        <div className="absolute -top-3 left-8">
          <div className="flex items-center justify-center w-10 h-10 bg-[#0d9488] text-white font-black text-sm rounded-xl shadow-lg">
            {step.number}
          </div>
        </div>

        {/* Icon */}
        <div className="mt-4 mb-6">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              isDark ? 'bg-slate-800/60' : 'bg-slate-100/80'
            }`}
          >
            <Icon className={`w-8 h-8 ${isDark ? 'text-teal-400' : 'text-teal-600'}`} />
          </div>
        </div>

        {/* Content */}
        <h3
          className={`text-xl font-bold mb-3 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}
        >
          {step.title}
        </h3>
        <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>{step.description}</p>
      </div>
    </div>
  );
});

export default HowItWorks;
