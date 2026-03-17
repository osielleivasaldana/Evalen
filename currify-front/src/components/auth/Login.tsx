import React, { useState } from 'react';
import { apiService, LoginRequest } from '../../services/api';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface LoginProps {
  onLoginSuccess: () => void;
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [credentials, setCredentials] = useState<LoginRequest>({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiService.login(credentials);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (

    <div className="min-h-screen w-full flex overflow-hidden bg-white font-jakarta">
      {/* LEFT PANEL - ARTISTIC (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center">

        {/* Abstract Background Shapes & Grid */}
        <div className="absolute inset-0 z-0">
          {/* Tech Grid Pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>

          {/* Soft Gradients */}
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 max-w-xl px-12 text-white flex flex-col justify-center h-full">

          {/* Logo Section with Glow */}
          <div className="relative mb-12 group">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative">
              <svg width="280" height="75" viewBox="0 0 180 48" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                <defs>
                  <linearGradient id="evalen-gradient-login" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#4F6BF6' }} />
                    <stop offset="100%" style={{ stopColor: '#8B5CF6' }} />
                  </linearGradient>
                </defs>
                {/* E con gradiente */}
                <path d="M0 8 L0 40 L24 40 L24 35 L6 35 L6 26 L20 26 L20 21 L6 21 L6 13 L24 13 L24 8 Z" fill="url(#evalen-gradient-login)" />
                {/* Corte diagonal (oscuro para fondo dark - coincide con bg-slate-900 que es #0f172a, ajustaré a transparente o al color exacto si es necesario, pero el usuario pidió #09090b. bg-slate-900 es #0f172a. #09090b es zinc-950. Dejaré el pedido del usuario pero ojo con el contraste si no es exacto, aunque en "artistic" mode suele verse bien) */}
                <path d="M18 8 L24 8 L6 40 L0 40 Z" fill="#0f172a" />
                {/* Wordmark blanco */}
                <text x="30" y="34" fontFamily="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontSize="28" fontWeight="700" fill="#fafafa" letterSpacing="-1">valen</text>
              </svg>
            </div>
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-400">
              Revolucionando la
            </span>
            <br />
            Selección de Talento
          </h1>

          <p className="text-lg text-slate-400 mb-10 leading-relaxed font-normal max-w-lg">
            Evalen utiliza Inteligencia Artificial avanzada para analizar, clasificar y rankear candidatos automáticamente, ahorrando miles de horas a tu equipo de RRHH.
          </p>

          {/* Feature Pills */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4 bg-slate-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 hover:bg-slate-800/60 transition-colors cursor-default group">
              <div className="p-2.5 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
                <CheckCircleIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-200 text-sm mb-0.5">Análisis de CVs con IA</h3>
                <p className="text-xs text-slate-400 font-medium">Extracción automática de habilidades y experiencia</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 bg-slate-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 hover:bg-slate-800/60 transition-colors cursor-default group">
              <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                <CheckCircleIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-200 text-sm mb-0.5">Ranking Inteligente</h3>
                <p className="text-xs text-slate-400 font-medium">Puntuación objetiva basada en requisitos del cargo</p>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-white/5">
            <p className="text-xs text-slate-500 font-semibold tracking-widest uppercase">
              TRUSTED BY LEADING COMPANIES
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - LOGIN FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative bg-white">
        <div className="w-full max-w-md space-y-10">
          <div className="text-center lg:text-left">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Login</h2>
            <p className="text-slate-500 text-lg">
              Bienvenido de nuevo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Social Login Placeholder (Optional, requested in image) */}
            <button
              type="button"
              onClick={() => apiService.initiateGoogleLogin()}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              Login con Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-400">O ingresa con email</span>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={credentials.email}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    placeholder="ejemplo@empresa.com"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">Contraseña</label>
                  <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">¿Olvidaste tu contraseña?</a>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 border border-red-100">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`
                        w-full flex items-center justify-center py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/30
                        text-sm font-bold text-white transition-all duration-300 transform
                        ${loading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.01] active:scale-[0.99]'
                }
                    `}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Ingresar <ArrowRightIcon className="w-4 h-4 text-white/80" />
                </span>
              )}
            </button>

            <p className="text-center text-sm text-slate-500">
              ¿No tienes cuenta?{' '}
              <button
                onClick={onSwitchToRegister}
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                Regístrate gratis
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;