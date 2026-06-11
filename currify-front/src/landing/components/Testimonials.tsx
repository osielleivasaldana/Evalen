import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote:
      'Evalen redujo nuestro tiempo de contratación de 3 semanas a 2 días. La IA entiende exactamente lo que buscamos.',
    name: 'Ana Martínez',
    role: 'Head of Talent, TechCorp',
    initials: 'AM',
    gradient: 'from-teal-500 to-teal-600',
  },
  {
    quote:
      'El Smart Match es increíblemente preciso. Encontramos candidatos que nunca habríamos considerado manualmente.',
    name: 'Carlos Ruiz',
    role: 'CTO, Innovatech',
    initials: 'CR',
    gradient: 'from-teal-600 to-teal-500',
  },
  {
    quote:
      'Pasamos de revisar 200 CVs manualmente a recibir los 5 mejores candidatos automáticamente. Game changer.',
    name: 'Laura Gómez',
    role: 'RRHH Director, FutureLabs',
    initials: 'LG',
    gradient: 'from-amber-500 to-orange-500',
  },
];

const TestimonialCard: React.FC<{
  testimonial: (typeof testimonials)[0];
  index: number;
}> = React.memo(({ testimonial, index }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <div
      ref={ref}
      className={`glass-effect p-8 rounded-3xl transition-all duration-500 group relative overflow-hidden ${
        isVisible ? 'animate-fade-in-up' : 'opacity-0'
      } ${
        isDark
          ? 'bg-slate-900/40 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:border-teal-500/50'
          : 'bg-white/60 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-teal-400/50'
      }`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className="w-5 h-5 fill-amber-400 text-amber-400"
          />
        ))}
      </div>

      {/* Quote */}
      <blockquote
        className={`text-lg font-medium mb-6 leading-relaxed ${
          isDark ? 'text-slate-50' : 'text-slate-900'
        }`}
      >
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold text-sm`}
        >
          {testimonial.initials}
        </div>
        <div>
          <div className={`font-bold ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
            {testimonial.name}
          </div>
          <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {testimonial.role}
          </div>
        </div>
      </div>
    </div>
  );
});

const Testimonials: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <section
      className={`py-24 relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#030014]' : 'bg-[#fdfdfd]'
      }`}
    >
      {/* Subtle Aurora */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-0 right-1/4 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000 transition-colors duration-1000 ${
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
            Lo que dicen nuestros{' '}
            <span className="text-brand-emphasis">clientes</span>
          </h2>
          <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Historias reales de equipos que transformaron su reclutamiento
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
