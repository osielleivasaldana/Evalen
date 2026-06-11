import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { ArrowDown } from 'lucide-react';

const DemoSection: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <section
      className={`py-20 relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#030014]' : 'bg-[#fdfdfd]'
      }`}
    >
      {/* Subtle Aurora */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[150px] animate-blob transition-colors duration-1000 ${
            isDark ? 'bg-teal-500/15' : 'bg-teal-400/15'
          }`}
        ></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          ref={ref}
          className={`text-center mb-12 transition-all duration-500 ${
            isVisible ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-4 ${
              isDark ? 'text-slate-50' : 'text-slate-900'
            }`}
          >
            Mira cómo <span className="text-brand-emphasis">funciona</span>
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Arrastra un CV y deja que la IA haga el trabajo pesado por ti
          </p>
        </div>

        {/* Dashboard Mockup */}
        <div className="relative group cursor-pointer max-w-5xl mx-auto">
          {/* Aurora Glow Exterior */}
          <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-teal-400 to-amber-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-lg transition-all duration-500"></div>

          {/* Main Glass Card */}
          <div
            className={`relative glass-effect rounded-3xl overflow-hidden transition-all duration-300 group-hover:scale-[1.01] ${
              isDark
                ? 'bg-slate-900/60 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.3)]'
                : 'bg-white/70 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)]'
            }`}
          >
            {/* Browser Header */}
            <div
              className={`flex items-center px-4 py-3 ${
                isDark ? 'bg-slate-800/60' : 'bg-slate-100/80'
              }`}
            >
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="flex-1 mx-4">
                <div
                  className={`glass-effect rounded-lg px-3 py-1 text-xs text-center ${
                    isDark
                      ? 'bg-slate-700/40 text-slate-400 border border-white/5'
                      : 'bg-white/60 text-slate-500 border border-slate-200/50'
                  }`}
                >
                  evalen.com/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard Content */}
            <div className={`p-6 ${isDark ? 'bg-slate-900/30' : 'bg-slate-50/50'}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Sidebar */}
                <div
                  className={`glass-effect rounded-2xl p-4 ${
                    isDark
                      ? 'bg-slate-800/40 border border-white/5'
                      : 'bg-white/60 border border-slate-200/50'
                  }`}
                >
                  <div className="space-y-3">
                    <div
                      className={`h-3 rounded w-3/4 ${
                        isDark ? 'bg-indigo-500/30' : 'bg-indigo-200/60'
                      }`}
                    ></div>
                    <div
                      className={`h-3 rounded w-1/2 ${
                        isDark ? 'bg-slate-600/40' : 'bg-slate-200/60'
                      }`}
                    ></div>
                    <div
                      className={`h-3 rounded w-2/3 ${
                        isDark ? 'bg-slate-600/40' : 'bg-slate-200/60'
                      }`}
                    ></div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <div
                      className={`h-10 rounded-xl flex items-center px-3 ${
                        isDark ? 'bg-indigo-500/20' : 'bg-indigo-100/60'
                      }`}
                    >
                      <div className="h-2 w-2 bg-indigo-500 rounded-full mr-2"></div>
                      <div
                        className={`h-2 w-16 rounded ${
                          isDark ? 'bg-indigo-400/40' : 'bg-indigo-300/60'
                        }`}
                      ></div>
                    </div>
                    <div
                      className={`h-10 rounded-xl flex items-center px-3 ${
                        isDark ? 'bg-slate-700/40' : 'bg-slate-100/60'
                      }`}
                    >
                      <div
                        className={`h-2 w-16 rounded ${
                          isDark ? 'bg-slate-500/40' : 'bg-slate-300/60'
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div
                  className={`md:col-span-2 glass-effect rounded-2xl p-6 ${
                    isDark
                      ? 'bg-slate-800/40 border border-white/5'
                      : 'bg-white/60 border border-slate-200/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`h-4 rounded w-1/3 ${
                        isDark ? 'bg-slate-600/40' : 'bg-slate-200/60'
                      }`}
                    ></div>
                    <div className="h-8 bg-[#0d9488] rounded-lg w-24 flex items-center justify-center">
                      <div className="h-2 w-12 bg-white/40 rounded"></div>
                    </div>
                  </div>

                  {/* Drop Zone */}
                  <div
                    className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors group-hover:border-teal-500/50 ${
                      isDark
                        ? 'border-slate-600/40 hover:bg-teal-500/5'
                        : 'border-slate-300/60 hover:bg-teal-50/50'
                    }`}
                  >
                    <div
                      className={`font-medium mb-2 text-lg ${
                        isDark ? 'text-teal-400' : 'text-teal-600'
                      }`}
                    >
                      📄 Arrastra un CV aquí
                    </div>
                    <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      o haz clic para seleccionar archivo
                    </div>
                  </div>

                  {/* Match Results */}
                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                          María García — Desarrolladora Full Stack
                        </span>
                        <span className="font-bold text-green-500">92% Match</span>
                      </div>
                      <div
                        className={`h-3 rounded-full overflow-hidden ${
                          isDark ? 'bg-slate-700/60' : 'bg-slate-200/60'
                        }`}
                      >
                        <div className="h-full w-[92%] bg-gradient-to-r from-green-400 to-green-500 rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                          Juan Pérez — Tech Lead
                        </span>
                        <span className="font-bold text-amber-500">78% Match</span>
                      </div>
                      <div
                        className={`h-3 rounded-full overflow-hidden ${
                          isDark ? 'bg-slate-700/60' : 'bg-slate-200/60'
                        }`}
                      >
                        <div className="h-full w-[78%] bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Annotation */}
          <div
            className={`absolute -bottom-4 -right-4 glass-effect px-4 py-3 rounded-2xl animate-float ${
              isDark
                ? 'bg-slate-900/60 border border-white/10 text-slate-50'
                : 'bg-white/70 border border-slate-200/80 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold">IA Analizando...</span>
            </div>
          </div>
        </div>

        {/* CTA below mockup */}
        <div className="mt-12 text-center">
          <a
            href="/login?plan=free"
            className={`inline-flex items-center gap-2 font-medium transition-colors ${
              isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'
            }`}
          >
            Prueba Evalen gratis
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
