import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { ArrowRight, Sparkles } from 'lucide-react';

const CTABanner: React.FC = React.memo(() => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <section
      className={`py-24 relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#030014]' : 'bg-[#fdfdfd]'
      }`}
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`relative glass-effect rounded-[2rem] p-12 sm:p-16 text-center overflow-hidden transition-all duration-500 ${
            isVisible ? 'animate-fade-in-up' : 'opacity-0'
          } ${
            isDark
              ? 'bg-slate-900/40 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.3)]'
              : 'bg-white/60 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)]'
          }`}
        >
          {/* Corner Aurora Accents */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br from-teal-500/20 to-teal-400/20 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-gradient-to-br from-amber-500/20 to-teal-500/20 rounded-full blur-[80px] pointer-events-none"></div>

          {/* Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md mb-8">
              <Sparkles className="w-4 h-4" />
              Empieza hoy
            </div>

            <h2
              className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-4 ${
                isDark ? 'text-slate-50' : 'text-slate-900'
              }`}
            >
              ¿Listo para transformar tu{' '}
              <span className="text-brand-emphasis">reclutamiento</span>?
            </h2>

            <p
              className={`text-lg max-w-2xl mx-auto mb-10 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Únete a cientos de empresas que ya encuentran al candidato perfecto en segundos con
              la IA de Evalen.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/login?plan=free"
                className="group w-full sm:w-auto bg-[#0d9488] text-white px-8 py-4 rounded-full text-lg font-bold transition-all hover:bg-[#0f766e] hover:shadow-[0_0_40px_rgba(13,148,136,0.4)] hover:scale-105 flex items-center justify-center gap-2"
              >
                Comenzar Gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="/login?plan=pro"
              className={`glass-effect w-full sm:w-auto px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-slate-900/40 border border-white/10 text-slate-50 hover:border-teal-500/50'
                  : 'bg-white/60 border border-slate-200/80 text-slate-900 hover:border-teal-400/50'
              }`}
            >
              Probar EvalenPro
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default CTABanner;
