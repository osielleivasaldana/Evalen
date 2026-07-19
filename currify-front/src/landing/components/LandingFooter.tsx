import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const LandingFooter: React.FC = React.memo(() => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <footer className={`relative overflow-hidden ${isDark ? 'bg-[#0f172a]' : 'bg-[#ffffff]'}`}>
      <div className={`h-px w-full ${isDark ? 'bg-white/5' : 'bg-slate-200/60'}`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-2xl font-black tracking-tighter mb-4">
              <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 65 24 A 30 30 0 1 0 65 76" stroke="#4f46e5" strokeWidth="10" strokeLinecap="round" fill="none" />
                <path d="M 32 50 L 70 50" stroke="#4f46e5" strokeWidth="10" strokeLinecap="round" />
                <path d="M 70 34 Q 76 34 76 28 Q 76 34 82 34 Q 76 34 76 40 Q 76 34 70 34 Z" fill="#9333ea" />
              </svg>
              <span className="text-[#4f46e5] dark:text-[#a5b4fc]">Evalen</span>
            </div>
            <p className={`mb-6 max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Automatiza tu reclutamiento con inteligencia artificial. Encuentra al candidato ideal en segundos.
            </p>
          </div>

          <div>
            <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Producto
            </h4>
            <ul className="space-y-3">
              <li><a href="/#features" className={`text-sm transition-colors ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`}>Beneficios</a></li>
              <li><a href="/#pricing" className={`text-sm transition-colors ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`}>Precios</a></li>
              <li><a href="/login?plan=free" className={`text-sm transition-colors ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`}>Registrarse</a></li>
            </ul>
          </div>

          <div>
            <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Legal
            </h4>
            <ul className="space-y-3">
              <li><a href="mailto:hola@evalen.app" className={`text-sm transition-colors ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`}>Contacto</a></li>
              <li><a href="/login?plan=enterprise" className={`text-sm transition-colors ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`}>Hablar con ventas</a></li>
              <li><a href="#gallery" className={`text-sm transition-colors ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`}>Cómo funciona</a></li>
            </ul>
          </div>
        </div>

        <div className={`py-6 border-t ${isDark ? 'border-white/5' : 'border-slate-200/60'}`}>
          <p className={`text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            &copy; {new Date().getFullYear()} Evalen. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
});

export default LandingFooter;
