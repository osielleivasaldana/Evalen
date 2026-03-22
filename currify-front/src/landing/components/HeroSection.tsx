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
    <section className="relative pt-32 pb-20 overflow-hidden min-h-[90vh] flex items-center">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-fuchsia-500/30 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute top-[10%] right-[-15%] w-[50%] h-[50%] bg-gradient-to-br from-purple-500/25 via-fuchsia-500/20 to-indigo-500/25 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-gradient-to-br from-fuchsia-500/25 via-indigo-500/20 to-purple-500/25 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]" style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                           linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
        
        {/* Floating Particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-indigo-400/50 rounded-full animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-purple-400/40 rounded-full animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-fuchsia-400/50 rounded-full animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/3 right-1/4 w-4 h-4 bg-indigo-400/30 rounded-full animate-bounce" style={{ animationDuration: '5s', animationDelay: '1.5s' }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-10 animate-bounce">
            <span className="mr-2">🚀</span>
            La nueva era del reclutamiento con IA
          </div>

          {/* Carousel Heading */}
          <div className="min-h-[180px] sm:min-h-[140px] flex items-center justify-center mb-8">
            <h1 
              className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight transition-all duration-500 ${
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

        {/* Dashboard Mockup */}
        <div className="mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 via-transparent to-transparent z-10 pointer-events-none h-20 bottom-0 top-auto"></div>
          <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Browser Header */}
            <div className="flex items-center px-4 py-3 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-700 dark:bg-gray-600 rounded px-3 py-1 text-xs text-gray-400 text-center">
                  evalen.com/dashboard
                </div>
              </div>
            </div>
            {/* Dashboard Content Preview */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800">
              <div className="grid grid-cols-3 gap-4">
                {/* Sidebar */}
                <div className="bg-white dark:bg-gray-700 rounded-xl p-4 h-48">
                  <div className="space-y-3">
                    <div className="h-3 bg-indigo-200 dark:bg-indigo-800 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <div className="h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded"></div>
                    <div className="h-8 bg-gray-100 dark:bg-gray-600 rounded"></div>
                  </div>
                </div>
                {/* Main Content */}
                <div className="col-span-2 bg-white dark:bg-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                    <div className="h-8 bg-indigo-600 rounded w-24"></div>
                  </div>
                  <div className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl p-8 text-center">
                    <div className="text-indigo-500 dark:text-indigo-400 font-medium mb-2">
                      📄 Arrastra un CV aquí
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      o haz clic para seleccionar archivo
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex-1 h-4 bg-green-100 dark:bg-green-900/30 rounded">
                      <div className="h-full bg-green-500 rounded" style={{ width: '85%' }}></div>
                    </div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">85% Match</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
