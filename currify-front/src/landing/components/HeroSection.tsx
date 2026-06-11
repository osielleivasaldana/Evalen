import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCarousel } from '../hooks/useCarousel';
import { ArrowRight, Play } from 'lucide-react';

const phrases = [
  {
    first: 'Reclutamiento inteligente',
    highlight: 'en segundos',
    last: ', no en semanas.',
  },
  {
    first: 'Encuentra al candidato perfecto',
    highlight: 'con la magia de la IA',
    last: '.',
  },
  {
    first: 'Automatiza tu selección',
    highlight: 'y enfócate',
    last: ' en lo humano.',
  },
];

const HeroSection: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentSlide, goToSlide, totalSlides } = useCarousel(phrases.length, 4000);
  const phrase = phrases[currentSlide];

  return (
    <section className="relative pt-32 pb-20 overflow-hidden min-h-[85vh] flex items-center">
      {/* Aurora Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-10 left-10 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob transition-colors duration-1000 ${
            isDark ? 'bg-teal-500/25' : 'bg-teal-400/20'
          }`}
        ></div>
        <div
          className={`absolute top-20 right-10 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000 transition-colors duration-1000 ${
            isDark ? 'bg-amber-500/25' : 'bg-amber-400/20'
          }`}
        ></div>
        <div
          className={`absolute bottom-10 left-1/3 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000 transition-colors duration-1000 ${
            isDark ? 'bg-emerald-500/25' : 'bg-teal-300/20'
          }`}
        ></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-5xl mx-auto">
          {/* Neon Badge */}
          <div className="flex justify-center mb-8">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest backdrop-blur-md ${
              isDark
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-amber-500/20 bg-white shadow-sm text-amber-600'
            }`}
          >
            <ZapIcon className="w-4 h-4" />
            Nuevo — Smart Match con IA
          </div>
          </div>

          {/* Carousel Heading */}
          <div className="min-h-[180px] sm:min-h-[160px] flex items-center justify-center mb-8">
            <h1
              key={currentSlide}
              className="text-5xl sm:text-6xl lg:text-[72px] font-black tracking-tighter leading-tight animate-fade-in-up"
            >
              <span className={isDark ? 'text-slate-50' : 'text-slate-900'}>
                {phrase.first}{' '}
              </span>
              <span className="text-brand-emphasis">{phrase.highlight}</span>
              <span className={isDark ? 'text-slate-50' : 'text-slate-900'}>
                {' '}
                {phrase.last}
              </span>
            </h1>
          </div>

          {/* Carousel Indicators */}
          <div className="flex justify-center gap-2 mb-10">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-8 h-2 bg-[#0d9488]'
                    : `w-2 h-2 ${isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-300 hover:bg-slate-400'}`
                }`}
                aria-label={`Ver frase ${index + 1}`}
              />
            ))}
          </div>

          {/* Subtitle */}
          <p
            className={`text-xl mb-12 max-w-2xl mx-auto ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Automatiza la extracción de datos de CVs, crea campañas al instante y encuentra al
            candidato ideal con la magia de la Inteligencia Artificial. Sin fricción, listo para
            usar.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/login?plan=free"
              className="group w-full sm:w-auto bg-[#0d9488] text-white px-8 py-4 rounded-full text-lg font-bold transition-all hover:bg-[#0f766e] hover:shadow-[0_0_40px_rgba(13,148,136,0.4)] hover:scale-105 flex items-center justify-center gap-2"
            >
              Empezar gratis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="/login?plan=free"
              className={`glass-effect w-full sm:w-auto px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-slate-900/40 border border-white/10 text-slate-50'
                  : 'bg-white/60 border border-slate-200/80 text-slate-900'
              }`}
            >
              <Play className="w-5 h-5" />
              Ver Demo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

// Simple Zap icon component since we need it in the badge
const ZapIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export default HeroSection;
