import React, { useState, useEffect } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const phrases = [
  {
    first: "Reclutamiento inteligente",
    highlight: "en segundos",
    last: ", no en semanas.",
  },
  {
    first: "Encuentra al candidato perfecto",
    highlight: "con la magia de la IA",
    last: ".",
  },
  {
    first: "Automatiza tu selección",
    highlight: "y enfócate",
    last: " en lo humano.",
  },
];

const HeroSection: React.FC = () => {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentPhrase((prev) => (prev + 1) % phrases.length);
        setIsVisible(true);
      }, 500);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const phrase = phrases[currentPhrase];

  return (
    <section className="relative pt-32 pb-20 overflow-hidden min-h-[80vh] flex items-center">
      {/* Animated Background - Tenuo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-fuchsia-500/10 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-purple-500/10 via-fuchsia-500/10 to-indigo-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-5xl mx-auto">
          {/* Carousel Heading */}
          <div className="min-h-[180px] sm:min-h-[160px] flex items-center justify-center mb-8">
            <h1 
              className={`text-5xl sm:text-6xl lg:text-[72px] font-extrabold tracking-tight leading-tight transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <span className="text-gray-900 dark:text-white">
                {phrase.first}{' '}
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-500">
                {phrase.highlight}
              </span>
              <span className="text-gray-900 dark:text-white">
                {' '}{phrase.last}
              </span>
            </h1>
          </div>

          {/* Carousel Indicators */}
          <div className="flex justify-center gap-2 mb-10">
            {phrases.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(() => {
                    setCurrentPhrase(index);
                    setIsVisible(true);
                  }, 300);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentPhrase 
                    ? 'w-8 bg-gradient-to-r from-indigo-600 to-purple-600' 
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                aria-label={`Ver frase ${index + 1}`}
              />
            ))}
          </div>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            Automatiza la extracción de datos de CVs, crea campañas al instante y encuentra al candidato ideal con la magia de la Inteligencia Artificial. Sin fricción, listo para usar.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/register"
              className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                Crear mi primera campaña gratis
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            <a
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Ya tengo cuenta
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
