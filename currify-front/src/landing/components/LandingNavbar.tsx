import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { apiService } from '../../services/api';

const LandingNavbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const isAuthenticated = apiService.isAuthenticated();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 glass-effect transition-colors duration-300"
      style={{
        backgroundColor: isDark ? 'rgba(3, 0, 20, 0.6)' : 'rgba(253, 253, 253, 0.6)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="text-2xl font-black tracking-tighter">
              <span className="text-gradient-vibrant">Evalen</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('features')}
              className={`text-sm font-medium transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-slate-50'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Beneficios
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className={`text-sm font-medium transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-slate-50'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Cómo funciona
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className={`text-sm font-medium transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-slate-50'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Precios
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all ${
                isDark
                  ? 'bg-slate-800/60 text-slate-400 hover:text-slate-50 hover:bg-slate-700/60'
                  : 'bg-slate-100/60 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <a
                href="/dashboard"
                className="hidden sm:inline-flex px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-600 rounded-full transition-transform hover:scale-105"
              >
                Ir al Dashboard
              </a>
            ) : (
              <>
                <a
                  href="/login?plan=free"
                  className={`hidden sm:inline-flex glass-effect px-5 py-2 text-sm font-semibold rounded-full transition-all hover:scale-105 ${
                    isDark
                      ? 'bg-slate-900/40 border border-white/10 text-slate-50'
                      : 'bg-white/60 border border-slate-200/80 text-slate-900'
                  }`}
                >
                  Iniciar Sesión
                </a>
                <a
                  href="/login?plan=free"
                  className="hidden sm:inline-flex px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-600 rounded-full transition-transform hover:scale-105"
                >
                  Comenzar Gratis
                </a>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden glass-effect border-t"
          style={{
            backgroundColor: isDark ? 'rgba(3, 0, 20, 0.95)' : 'rgba(253, 253, 253, 0.95)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          }}
        >
          <div className="px-4 py-4 space-y-3">
            <button
              onClick={() => scrollToSection('features')}
              className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark ? 'text-slate-400 hover:text-slate-50 hover:bg-slate-800/40' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              Beneficios
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark ? 'text-slate-400 hover:text-slate-50 hover:bg-slate-800/40' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              Cómo funciona
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark ? 'text-slate-400 hover:text-slate-50 hover:bg-slate-800/40' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              Precios
            </button>
            <div className="pt-2 space-y-2">
              {!isAuthenticated && (
                <a
                  href="/login?plan=free"
                  className={`block w-full text-center glass-effect px-4 py-3 text-sm font-semibold rounded-full transition-all ${
                    isDark
                      ? 'bg-slate-900/40 border border-white/10 text-slate-50'
                      : 'bg-white/60 border border-slate-200/80 text-slate-900'
                  }`}
                >
                  Iniciar Sesión
                </a>
              )}
              <a
                href={isAuthenticated ? '/dashboard' : '/login?plan=free'}
                className="block w-full text-center px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-600 rounded-full transition-transform hover:scale-105"
              >
                {isAuthenticated ? 'Ir al Dashboard' : 'Comenzar Gratis'}
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;
