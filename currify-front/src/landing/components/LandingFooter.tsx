import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ArrowRight } from 'lucide-react';

// Inline SVG components for social icons not available in lucide-react v1.7.0
const TwitterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const LandingFooter: React.FC = React.memo(() => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <footer
      className={`relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#030014]' : 'bg-[#fdfdfd]'
      }`}
    >
      {/* Top Glass Border */}
      <div
        className={`h-px w-full ${
          isDark
            ? 'bg-gradient-to-r from-transparent via-white/10 to-transparent'
            : 'bg-gradient-to-r from-transparent via-slate-200 to-transparent'
        }`}
      ></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="text-2xl font-black tracking-tighter mb-4">
              <span className="text-gradient-vibrant">Evalen</span>
            </div>
            <p className={`mb-6 max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Automatiza tu reclutamiento con inteligencia artificial. Encuentra al candidato ideal
              en segundos.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className={`p-2 rounded-full transition-all ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-50 hover:bg-slate-800/60'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
                aria-label="Twitter"
              >
                <TwitterIcon className="w-5 h-5" />
              </a>
              <a
                href="#"
                className={`p-2 rounded-full transition-all ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-50 hover:bg-slate-800/60'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
                aria-label="LinkedIn"
              >
                <LinkedinIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Producto */}
          <div>
            <h4
              className={`text-sm font-bold uppercase tracking-wider mb-4 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Producto
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/#features"
                  className={`text-sm transition-colors ${
                    isDark
                      ? 'text-slate-400 hover:text-slate-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Beneficios
                </a>
              </li>
              <li>
                <a
                  href="/#pricing"
                  className={`text-sm transition-colors ${
                    isDark
                      ? 'text-slate-400 hover:text-slate-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Precios
                </a>
              </li>
              <li>
                <a
                  href="/login?plan=free"
                  className={`text-sm transition-colors ${
                    isDark
                      ? 'text-slate-400 hover:text-slate-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Registrarse
                </a>
              </li>
            </ul>
          </div>

          {/* Legal + CTA */}
          <div>
            <h4
              className={`text-sm font-bold uppercase tracking-wider mb-4 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Legal
            </h4>
            <ul className="space-y-3 mb-6">
              <li>
                <a
                  href="#"
                  className={`text-sm transition-colors ${
                    isDark
                      ? 'text-slate-400 hover:text-slate-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Términos y Condiciones
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={`text-sm transition-colors ${
                    isDark
                      ? 'text-slate-400 hover:text-slate-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Política de Privacidad
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={`text-sm transition-colors ${
                    isDark
                      ? 'text-slate-400 hover:text-slate-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Contacto
                </a>
              </li>
            </ul>

            {/* CTA in Footer */}
            <a
              href="/login?plan=free"
              className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-600 text-white text-sm font-bold rounded-full transition-transform hover:scale-105"
            >
              Comenzar Gratis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className={`py-6 border-t ${
            isDark ? 'border-white/5' : 'border-slate-200/60'
          }`}
        >
          <p className={`text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            © {new Date().getFullYear()} Evalen. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
});

export default LandingFooter;
