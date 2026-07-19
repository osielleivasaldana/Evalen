import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, List, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { apiService } from '../../services/api';

const navLinks = [
  { id: 'features', label: 'Beneficios' },
  { id: 'gallery', label: 'Cómo funciona' },
  { id: 'pricing', label: 'Precios' },
];

const LandingNavbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const isAuthenticated = apiService.isAuthenticated();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 1.0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div ref={sentinelRef} className="absolute top-0 h-px w-full pointer-events-none" />

      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
        <div
          className={`w-full max-w-4xl rounded-full border transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            scrolled
              ? 'shadow-[0_8px_32px_rgba(79,70,229,0.08)]'
              : 'shadow-none'
          } ${
            isDark
              ? 'bg-[#0f172a] border-white/[0.08]'
              : 'bg-white border-slate-200/60'
          }`}
        >
          <div className="flex items-center justify-between h-14 px-5">
            <div className="flex-shrink-0">
              <a href="/" className="flex items-center gap-2 text-xl font-black tracking-tighter">
                <svg className="w-6 h-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="50" cy="50" r="34" stroke="#4f46e5" strokeWidth="10" fill="none" />
                  <path d="M 30 50 L 70 50" stroke="#4f46e5" strokeWidth="10" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="6" fill="#9333ea" />
                </svg>
                <span className="text-[#4f46e5] dark:text-[#a5b4fc]">Evalen</span>
              </a>
            </div>

            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors duration-300 ${
                    isDark
                      ? 'text-slate-400 hover:text-slate-50 hover:bg-white/[0.06]'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-full transition-all duration-300 ${
                  isDark
                    ? 'bg-slate-800/40 text-slate-400 hover:text-slate-50 hover:bg-slate-700/60'
                    : 'bg-slate-100/80 text-slate-500 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
                aria-label="Toggle theme"
              >
                {isDark ? <Moon weight="bold" className="w-4 h-4" /> : <Sun weight="bold" className="w-4 h-4" />}
              </button>

              {isAuthenticated ? (
                <a
                  href="/dashboard"
                  className="hidden sm:inline-flex px-5 py-2 text-sm font-bold text-white bg-[#4f46e5] rounded-full transition-all duration-300 hover:bg-[#4338ca] hover:shadow-[0_0_25px_rgba(79,70,229,0.35)] active:scale-[0.98]"
                >
                  Dashboard
                </a>
              ) : (
                <>
                  <a
                    href="/login"
                    className={`hidden sm:inline-flex px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
                      isDark
                        ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Iniciar Sesión
                  </a>
                  <a
                    href="/login?plan=free"
                    className="hidden sm:inline-flex px-5 py-2 text-sm font-bold text-white bg-[#4f46e5] rounded-full transition-all duration-300 hover:bg-[#4338ca] hover:shadow-[0_0_25px_rgba(79,70,229,0.35)] active:scale-[0.98]"
                  >
                    Empezar gratis
                  </a>
                </>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 rounded-full transition-colors duration-300 ${
                  isDark ? 'text-slate-400 hover:text-slate-50 hover:bg-white/[0.06]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                <div className="relative w-5 h-5">
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ rotate: mobileMenuOpen ? 45 : 0, opacity: mobileMenuOpen ? 0 : 1 }}
                    transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <List weight="bold" className="w-5 h-5" />
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ rotate: -45, opacity: 0 }}
                    animate={{ rotate: mobileMenuOpen ? 0 : -45, opacity: mobileMenuOpen ? 1 : 0 }}
                    transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <X weight="bold" className="w-5 h-5" />
                  </motion.div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 md:hidden bg-[#0f172a]"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="mx-5 mt-24 rounded-3xl border border-white/[0.08] bg-[#0a0f1d] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            >
              <div className="px-4 py-5 space-y-1">
                {navLinks.map((link, i) => (
                  <motion.button
                    key={link.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                    onClick={() => scrollToSection(link.id)}
                    className="block w-full text-left px-4 py-3 rounded-xl text-base font-medium text-slate-200 hover:text-white hover:bg-white/[0.06] transition-colors duration-200"
                  >
                    {link.label}
                  </motion.button>
                ))}
                <div className="pt-4 space-y-2">
                  {!isAuthenticated && (
                    <a
                      href="/login"
                      className="block w-full text-center px-4 py-3 text-sm font-semibold rounded-full border border-white/[0.08] text-slate-50 hover:bg-white/[0.04] transition-colors duration-200"
                    >
                      Iniciar Sesión
                    </a>
                  )}
                  <a
                    href={isAuthenticated ? '/dashboard' : '/login?plan=free'}
                    className="block w-full text-center px-4 py-3 text-sm font-bold text-white bg-[#4f46e5] rounded-full active:scale-[0.98] transition-transform duration-200"
                  >
                    {isAuthenticated ? 'Dashboard' : 'Comenzar Gratis'}
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LandingNavbar;
