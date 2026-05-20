import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, SparklesIcon, BoltIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';

type AuthStep = 'initial' | 'login' | 'signup' | 'onboarding';

const EvalenAuth: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useAuth();
  const [step, setStep] = useState<AuthStep>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // React to auth state changes (e.g., after OAuth callback returns)
  useEffect(() => {
    if (isAuthenticated) {
      const plan = selectedPlan || sessionStorage.getItem('selectedPlan');
      if (plan === 'pro') {
        navigate('/checkout');
      } else {
        navigate('/onboarding');
      }
    }
  }, [isAuthenticated, navigate, selectedPlan]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    if (plan) {
      sessionStorage.setItem('selectedPlan', plan);
      setSelectedPlan(plan);
    }
  }, []);

  const handleGoogleLogin = () => {
    apiService.initiateGoogleLogin(selectedPlan || undefined);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setEmailError(null);
    setError(null);

    try {
      const result = await apiService.checkEmail(email);
      if (result.exists) {
        setStep('login');
      } else {
        setStep('signup');
      }
    } catch (err) {
      setEmailError('No pudimos verificar tu email. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      // AuthContext handles redirect via useEffect on isAuthenticated
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await register(email, password, name);
      // AuthContext handles redirect via useEffect on isAuthenticated
    } catch (err: any) {
      setError(err.message || 'Error al crear cuenta. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await apiService.updateCompany(company);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al guardar empresa. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToInitial = () => {
    setStep('initial');
    setEmailError(null);
    setError(null);
  };

  const renderLeftPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#7E3AF2] via-[#6D28D9] to-[#5C60F5] overflow-hidden items-center justify-center">
      
      {/* Premium Background Effects */}
      <div className="absolute inset-0 z-0">
        {/* Subtle diagonal lines pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="diagonal-pattern" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="28" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diagonal-pattern)" />
        </svg>

        {/* Multiple gradient orbs for depth */}
        <div className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] bg-white/20 rounded-full blur-[180px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-25%] right-[-15%] w-[60%] h-[60%] bg-purple-300/20 rounded-full blur-[160px] animate-pulse delay-1000" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] bg-indigo-300/15 rounded-full blur-[100px] animate-pulse delay-500" style={{ animationDuration: '12s' }} />
        
        {/* Floating geometric accents */}
        <div className="absolute top-[15%] right-[20%] w-2 h-2 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
        <div className="absolute top-[25%] left-[15%] w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[30%] left-[25%] w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-xl px-12 text-white flex flex-col justify-center h-full">
        
        {/* Logo with glow effect */}
        <div className="relative mb-14 group">
          <div className="absolute -inset-6 bg-white/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition duration-700"></div>
          <div className="relative">
            <svg width="280" height="75" viewBox="0 0 180 48" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
              <defs>
                <linearGradient id="evalen-gradient-auth-new" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#ffffff' }} />
                  <stop offset="100%" style={{ stopColor: '#e0e7ff' }} />
                </linearGradient>
                <filter id="glow-auth">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <path d="M0 8 L0 40 L24 40 L24 35 L6 35 L6 26 L20 26 L20 21 L6 21 L6 13 L24 13 L24 8 Z" fill="url(#evalen-gradient-auth-new)" filter="url(#glow-auth)" />
              <path d="M18 8 L24 8 L6 40 L0 40 Z" fill="rgba(126, 58, 242, 0.3)" />
              <text x="30" y="34" fontFamily="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontSize="28" fontWeight="700" fill="#ffffff" letterSpacing="-1">valen</text>
            </svg>
          </div>
        </div>

        {/* Headline - More impactful */}
        <h1 className="text-5xl font-bold leading-tight mb-6 tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-purple-200">
            Tu talento ideal,
          </span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-white">
            encontrado en segundos
          </span>
        </h1>

        <p className="text-lg text-white/70 mb-12 leading-relaxed font-normal max-w-lg">
          La plataforma de reclutamiento con IA que analiza, clasifica y rankea candidatos automáticamente.
        </p>

        {/* Floating Feature Icons - No boxes, elegant icons */}
        <div className="space-y-6">
          <div className="flex items-center gap-5 group cursor-default">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 blur-lg rounded-2xl group-hover:bg-white/30 transition-all duration-500"></div>
              <div className="relative w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <DocumentMagnifyingGlassIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white text-base mb-0.5">Análisis Inteligente</h3>
              <p className="text-sm text-white/55 font-medium">Extracción automática de habilidades y experiencia</p>
            </div>
          </div>
          
          <div className="flex items-center gap-5 group cursor-default">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 blur-lg rounded-2xl group-hover:bg-white/30 transition-all duration-500"></div>
              <div className="relative w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white text-base mb-0.5">Matching con IA</h3>
              <p className="text-sm text-white/55 font-medium">Puntuación precisa basada en requisitos del cargo</p>
            </div>
          </div>
          
          <div className="flex items-center gap-5 group cursor-default">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 blur-lg rounded-2xl group-hover:bg-white/30 transition-all duration-500"></div>
              <div className="relative w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <BoltIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white text-base mb-0.5">Procesos 10x Más Rápidos</h3>
              <p className="text-sm text-white/55 font-medium">Automatiza tu pipeline de selección</p>
            </div>
          </div>
        </div>

        {/* Trust badge - More subtle */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <p className="text-xs text-white/40 font-semibold tracking-widest uppercase">
            Used by forward-thinking teams
          </p>
        </div>
      </div>
    </div>
  );

  const renderInitialStep = () => (
    <div className="w-full max-w-md space-y-8 animate-[fadeInUp_0.4s_ease-out]">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Te damos la bienvenida
        </h2>
        <p className="text-slate-500 text-base">
          Ingresa tu correo para continuar
        </p>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all duration-200 group"
      >
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
        Continuar con Google
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-slate-400">o usa tu correo</span>
        </div>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
            Correo electrónico
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-200 font-medium"
              placeholder="tu@empresa.com"
            />
          </div>
        </div>

        {emailError && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 border border-red-100">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {emailError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-violet-500/25 text-sm font-bold text-white transition-all duration-300 transform bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Continuar <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderLoginStep = () => (
    <div className="w-full max-w-md space-y-8 animate-[fadeInRight_0.4s_ease-out]">
      <div className="text-center">
        <button
          onClick={handleBackToInitial}
          className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Cambiar correo
        </button>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Te damos la bienvenida de nuevo
        </h2>
        <p className="text-slate-500 text-base">
          Ingresa tu contraseña
        </p>
      </div>

      <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 flex items-center gap-3">
        <EnvelopeIcon className="h-5 w-5 text-violet-600" />
        <span className="text-violet-900 font-medium">{email}</span>
      </div>

      <form onSubmit={handleLoginSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
            Contraseña
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all duration-200 font-medium"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <a href="/forgot-password" className="text-sm font-medium text-violet-600 hover:text-violet-700">
            ¿Olvidaste tu contraseña?
          </a>
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
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-violet-500/25 text-sm font-bold text-white transition-all duration-300 transform bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Ingresar <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderSignupStep = () => (
    <div className="w-full max-w-md space-y-8 animate-[fadeInRight_0.4s_ease-out]">
      <div className="text-center">
        <button
          onClick={handleBackToInitial}
          className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Cambiar correo
        </button>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Crea tu cuenta
        </h2>
        <p className="text-slate-500 text-base">
          Estás a un paso de comenzar
        </p>
      </div>

      <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 flex items-center gap-3">
        <EnvelopeIcon className="h-5 w-5 text-violet-600" />
        <span className="text-violet-900 font-medium">{email}</span>
      </div>

      <form onSubmit={handleSignupSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
            Nombre completo
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all duration-200 font-medium"
              placeholder="Juan Pérez"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
            Contraseña
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="block w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all duration-200 font-medium"
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
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
          disabled={isLoading || !name.trim() || password.length < 6}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-violet-500/25 text-sm font-bold text-white transition-all duration-300 transform bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Crear cuenta <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center text-sm text-slate-500">
          Al crear una cuenta, aceptas nuestros{' '}
          <a href="#" className="text-violet-600 hover:underline">Términos</a>
        </p>
      </form>
    </div>
  );

  const renderOnboardingStep = () => {
    const firstName = name.split(' ')[0];

    return (
      <div className="w-full max-w-md space-y-8 animate-[fadeInUp_0.4s_ease-out]">
        <div className="text-center">
          <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-violet-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            ¡Cuenta creada! 🎉
          </h2>
          <p className="text-slate-500 text-base">
            Hola {firstName}, último paso para configurar tu espacio
          </p>
        </div>

        <form onSubmit={handleOnboardingSubmit} className="space-y-5">
          <div>
            <label htmlFor="company" className="block text-sm font-semibold text-slate-700 mb-2">
              Nombre de tu empresa
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <BuildingOfficeIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all duration-200 font-medium"
                placeholder="Acme Corp"
              />
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
            disabled={isLoading || !company.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-violet-500/25 text-sm font-bold text-white transition-all duration-300 transform bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Completar configuración <ArrowRightIcon className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    );
  };

  const renderRightPanel = () => {
    const stepContent = {
      initial: renderInitialStep,
      login: renderLoginStep,
      signup: renderSignupStep,
      onboarding: renderOnboardingStep
    };

    return (
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative bg-white">
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7E3AF2] via-[#6D28D9] to-[#5C60F5] opacity-90" />
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto">
          {stepContent[step]()}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden bg-white font-sans">
      {renderLeftPanel()}
      {renderRightPanel()}

      <style>{`
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default EvalenAuth;
