import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type AuthStep = 'initial' | 'login' | 'signup' | 'onboarding';

const EvalenAuth: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, user } = useAuth();
  const [step, setStep] = useState<AuthStep>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => {
    try {
      const t = localStorage.getItem('evalen-theme');
      if (t === 'dark') return true;
      if (t === 'light') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch { return false; }
  });

  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem('evalen-theme', isDark ? 'dark' : 'light'); } catch {}
  }, [isDark]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const plan = selectedPlan || sessionStorage.getItem('selectedPlan');
      if (plan === 'pro') { navigate('/checkout'); }
      else if (user.role === 'OWNER') { navigate('/owner/dashboard'); }
      else if (user.onboardingCompleted) { navigate('/dashboard'); }
      else { navigate('/onboarding'); }
    }
  }, [isAuthenticated, navigate, selectedPlan, user]);

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
    setError(null);
    try {
      const result = await apiService.checkEmail(email);
      result.exists ? setStep('login') : setStep('signup');
      try { localStorage.setItem('evalen-lastEmail', email); } catch {}
    } catch {
      setError('No pudimos verificar tu email. Intenta de nuevo.');
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

  const handleBackToInitial = () => { setStep('initial'); setError(null); };
  const initials = (em: string) => {
    if (!em) return '@';
    const namePart = em.split('@')[0].replace(/[._-]+/g, ' ').trim();
    const parts = namePart.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (namePart.slice(0, 2) || '@').toUpperCase();
  };
  const firstName = name.split(' ')[0];

  const plan = selectedPlan && ['pro', 'enterprise'].includes(selectedPlan) ? selectedPlan : 'free';
  const isPro = plan === 'pro' || plan === 'enterprise';

  const InputIcon = ({ children }: { children: React.ReactNode }) => (
    <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ev-ink3 dark:text-[#7E8C7E]">{children}</span>
  );

  const TrailButton = ({ onClick, children, label }: { onClick: () => void; children: React.ReactNode; label: string }) => (
    <button type="button" aria-label={label} onClick={onClick}
      className="absolute inset-y-0 right-2 flex items-center rounded-lg px-2 text-ev-ink3 transition hover:text-ev-ink dark:text-[#7E8C7E] dark:hover:text-[#F1EBDC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ev-green/40">
      {children}
    </button>
  );

  const SubmitBtn = ({ label, loadingLabel, disabled }: { label: string; loadingLabel?: string; disabled?: boolean }) => (
    <button type="submit" disabled={disabled || isLoading}
      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-ev-cta px-4 py-3.5 text-[15px] font-semibold text-ev-ctatext shadow-cta-evalen transition hover:-translate-y-0.5 hover:bg-ev-ctah dark:bg-[#FF6A38] dark:text-[#10231A] dark:hover:bg-[#FF8455] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ev-cta focus-visible:ring-offset-2 focus-visible:ring-offset-ev-paper dark:focus-visible:ring-offset-[#0E1813] disabled:translate-y-0 disabled:opacity-80">
      <span>{isLoading ? (loadingLabel || label) : label}</span>
      {isLoading ? (
        <svg className="h-[18px] w-[18px] animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity=".3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
      ) : (
        <svg className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      )}
    </button>
  );

  const EmailPill = ({ onBack }: { onBack: () => void }) => (
    <div className="flex items-center justify-between rounded-xl border border-ev-line bg-ev-card px-3.5 py-3 dark:border-[rgba(241,235,220,.13)] dark:bg-[#16241C]">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ev-greendeep font-mono text-[11px] text-ev-onmark dark:bg-[#163528] dark:text-[#F1EBDC]">{initials(email)}</span>
        <span className="truncate text-[14px] font-medium text-ev-ink dark:text-[#F1EBDC]">{email}</span>
      </div>
      <button type="button" onClick={onBack}
        className="shrink-0 rounded-lg px-2 py-1 font-mono text-[11px] text-ev-ink2 transition hover:text-ev-ink dark:text-[#AAB6A8] dark:hover:text-[#F1EBDC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ev-green/40">
        Cambiar
      </button>
    </div>
  );

  const FormError = () => {
    if (!error) return null;
    return (
      <p role="alert" aria-live="polite"
        className="flex items-center gap-2 rounded-lg border border-ev-low/30 bg-ev-low/10 px-3 py-2 text-[13px] text-ev-low dark:border-[#E0695A]/30 dark:bg-[#E0695A]/10 dark:text-[#E0695A]">
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
        <span>{error}</span>
      </p>
    );
  };

  const renderLeftPanel = () => (
    <aside className="relative hidden w-[46%] max-w-[640px] shrink-0 overflow-hidden bg-ev-greendeep lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
      <img
        src="https://image.qwenlm.ai/public_source/88b2e882-98ee-4857-a83c-263c15dcf5c8/1f904026b-d7bd-4825-835a-df2b9015dd91.png"
        alt="Dos reclutadores de pelo oscuro, en una oficina de Santiago de Chile junto a una ventana, marcan con un resaltador el currículum de un candidato antes de decidir a quién entrevistar."
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high" decoding="async" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ev-greendeep via-ev-greendeep/80 to-ev-greendeep/35" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ev-greendeep/70 to-transparent" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <a href="/" className="group inline-flex items-center gap-2.5" aria-label="Evalen, volver al inicio">
          <svg className="h-9 w-9 drop-shadow" viewBox="0 0 48 48" aria-hidden="true">
            <rect width="48" height="48" rx="12" fill="#0F3A2C" /><rect x="13" y="12" width="5" height="24" rx="2.5" fill="#F6F1E6" /><rect x="13" y="12" width="18" height="5" rx="2.5" fill="#F6F1E6" /><rect x="13" y="21.5" width="13" height="5" rx="2.5" fill="#F6F1E6" /><rect x="13" y="31" width="21" height="5" rx="2.5" fill="#F6F1E6" /><circle cx="37" cy="14.5" r="4.5" fill="#F3E94E" />
          </svg>
          <span className="font-serif text-2xl font-semibold tracking-tight text-ev-onmark">evalen</span>
        </a>
        <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-ev-onmark/20 bg-ev-greendeep/40 px-3 py-1 font-mono text-[11px] tracking-wide text-ev-onmark/90 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-ev-good animate-pulsering" />
          12 reclutadores evaluando ahora
        </span>
      </div>

      <div className="relative z-10 mt-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ev-yellow">Sesión de reclutador</p>
        <h1 className="mt-4 max-w-[15ch] font-serif text-[2.6rem] font-semibold leading-[1.04] tracking-tight text-ev-onmark xl:text-5xl">
          Tus
          <span className="mx-1 inline-block -rotate-1 rounded-sm bg-ev-yellow px-2 text-ev-greendeep">finalistas</span>
          te están esperando.
        </h1>
        <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-ev-onmark/80">
          Entra y retoma la evaluación justo donde la dejaste — con notas, puntajes y el
          <span className="font-medium text-ev-onmark"> porqué</span> escrito de cada candidato.
        </p>

        <figure className="relative mt-9 max-w-sm animate-floaty rounded-2xl bg-ev-paper p-4 pr-5 shadow-card-lg-evalen dark:bg-[#0E1813] dark:shadow-[0_22px_48px_-28px_rgba(0,0,0,.7)]">
          <span aria-hidden="true" className="absolute -top-2.5 left-7 h-5 w-12 rotate-2 rounded-[3px] bg-ev-yellow/85 shadow-soft-evalen" />
          <blockquote className="font-serif text-[1.02rem] italic leading-snug text-ev-ink dark:text-[#F1EBDC]">
            &ldquo;Cerré una vacante en 12 días. Evalen me devolvió las mañanas que antes perdía leyendo CVs.&rdquo;
          </blockquote>
          <figcaption className="mt-3 flex items-center gap-3 border-t border-ev-line pt-3 dark:border-[rgba(241,235,220,.13)]">
            <img
              src="https://image.qwenlm.ai/public_source/88b2e882-98ee-4857-a83c-263c15dcf5c8/135114acb-fca5-492d-942f-5d60b557b4bb.png"
              alt="Matías Herrera" className="h-10 w-10 rounded-full object-cover ring-2 ring-ev-paper2 dark:ring-[#13201A]" loading="lazy" decoding="async" />
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-ev-ink dark:text-[#F1EBDC]">Matías Herrera</span>
              <span className="block font-mono text-[11px] text-ev-ink3 dark:text-[#7E8C7E]">Talent Lead &middot; fintech &middot; Santiago de Chile</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </aside>
  );

  const renderFormContent = () => {
    switch (step) {
      case 'initial':
        return (
          <div key="initial" className="animate-fade-in-up">
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ev-ink2 dark:text-[#AAB6A8]">Correo electrónico</label>
                <div className="relative">
                  <InputIcon>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></svg>
                  </InputIcon>
                  <input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="tu@empresa.com" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-ev-line2 bg-ev-card py-3 pl-11 pr-4 text-[15px] text-ev-ink placeholder:text-ev-ink3/80 transition focus:border-ev-green focus:outline-none focus:ring-2 focus:ring-ev-green/25 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC] dark:placeholder:text-[#7E8C7E]/80 dark:focus:border-[#5BAE88]" />
                </div>
              </div>

              <FormError />

              <SubmitBtn label="Continuar" loadingLabel="Revisando…" disabled={!email.trim()} />
            </form>
          </div>
        );

      case 'login':
        return (
          <div key="login" className="animate-fade-in-up">
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <EmailPill onBack={handleBackToInitial} />

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block font-mono text-[11px] uppercase tracking-[0.14em] text-ev-ink2 dark:text-[#AAB6A8]">Contraseña</label>
                  <a href="/forgot-password" className="font-mono text-[11px] text-ev-cta underline-offset-2 hover:underline dark:text-[#FF6A38]">¿La olvidaste?</a>
                </div>
                <div className="relative">
                  <InputIcon>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
                  </InputIcon>
                  <input ref={pwRef} id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-ev-line2 bg-ev-card py-3 pl-11 pr-12 text-[15px] text-ev-ink placeholder:text-ev-ink3/80 transition focus:border-ev-green focus:outline-none focus:ring-2 focus:ring-ev-green/25 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC] dark:placeholder:text-[#7E8C7E]/80 dark:focus:border-[#5BAE88]" />
                  <TrailButton onClick={() => setShowPassword(p => !p)} label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    <svg className={`h-[19px] w-[19px] ${showPassword ? 'hidden' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                    <svg className={`h-[19px] w-[19px] ${showPassword ? '' : 'hidden'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.1 6.2A17 17 0 0 0 2 12s3.6 6 10 6a9.6 9.6 0 0 0 3.4-.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
                  </TrailButton>
                </div>
              </div>

              <label className="flex cursor-pointer select-none items-center gap-2.5 text-[13.5px] text-ev-ink2 dark:text-[#AAB6A8]">
                <input id="remember" type="checkbox" defaultChecked className="h-4 w-4 rounded border-ev-line2 accent-ev-cta dark:border-[rgba(241,235,220,.26)]" />
                Recordarme en este equipo
              </label>

              <FormError />

              <SubmitBtn label="Entrar a Evalen" loadingLabel="Entrando…" disabled={!password} />
            </form>
          </div>
        );

      case 'signup':
        return (
          <div key="signup" className="animate-fade-in-up">
            <form onSubmit={handleSignupSubmit} className="space-y-5">
              <EmailPill onBack={handleBackToInitial} />

              <div>
                <label htmlFor="name" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ev-ink2 dark:text-[#AAB6A8]">Nombre completo</label>
                <div className="relative">
                  <InputIcon>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </InputIcon>
                  <input id="name" name="name" type="text" autoComplete="name" placeholder="Juan Pérez" value={name} onChange={e => setName(e.target.value)}
                    className="w-full rounded-xl border border-ev-line2 bg-ev-card py-3 pl-11 pr-4 text-[15px] text-ev-ink placeholder:text-ev-ink3/80 transition focus:border-ev-green focus:outline-none focus:ring-2 focus:ring-ev-green/25 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC] dark:placeholder:text-[#7E8C7E]/80 dark:focus:border-[#5BAE88]" />
                </div>
              </div>

              <div>
                <label htmlFor="signup-password" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ev-ink2 dark:text-[#AAB6A8]">Contraseña</label>
                <div className="relative">
                  <InputIcon>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
                  </InputIcon>
                  <input id="signup-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} minLength={6}
                    className="w-full rounded-xl border border-ev-line2 bg-ev-card py-3 pl-11 pr-12 text-[15px] text-ev-ink placeholder:text-ev-ink3/80 transition focus:border-ev-green focus:outline-none focus:ring-2 focus:ring-ev-green/25 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC] dark:placeholder:text-[#7E8C7E]/80 dark:focus:border-[#5BAE88]" />
                  <TrailButton onClick={() => setShowPassword(p => !p)} label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    <svg className={`h-[19px] w-[19px] ${showPassword ? 'hidden' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                    <svg className={`h-[19px] w-[19px] ${showPassword ? '' : 'hidden'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.1 6.2A17 17 0 0 0 2 12s3.6 6 10 6a9.6 9.6 0 0 0 3.4-.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
                  </TrailButton>
                </div>
              </div>

              <FormError />

              <SubmitBtn label="Crear cuenta gratis" loadingLabel="Creando…" disabled={!name.trim() || password.length < 6} />

              <p className="text-center font-mono text-[11px] leading-relaxed text-ev-ink3 dark:text-[#7E8C7E]">
                Al crear tu cuenta aceptas nuestros{' '}
                <a href="/terminos" className="text-ev-cta underline-offset-2 hover:underline dark:text-[#FF6A38]">Términos</a>
              </p>
            </form>
          </div>
        );

      case 'onboarding':
        return (
          <div key="onboarding" className="flex flex-col items-center animate-popin">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ev-green text-ev-onmark dark:bg-[#5BAE88] dark:text-[#10231A]">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </span>
            <h3 className="mt-4 font-serif text-xl font-semibold text-ev-ink dark:text-[#F1EBDC]">Cuenta creada</h3>
            <p className="mt-1.5 text-[14px] text-ev-ink2 dark:text-[#AAB6A8]">Hola {firstName}, último paso para configurar tu espacio</p>

            <form onSubmit={handleOnboardingSubmit} className="mt-7 w-full space-y-5">
              <div>
                <label htmlFor="company" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ev-ink2 dark:text-[#AAB6A8]">Nombre de tu empresa</label>
                <div className="relative">
                  <InputIcon>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="19" rx="2.5" /><path d="M9 3v6h6V3M7 12h2M12 12h2M17 12h2M7 16h2M12 16h2M17 16h2" /></svg>
                  </InputIcon>
                  <input id="company" name="company" type="text" placeholder="Acme Corp" value={company} onChange={e => setCompany(e.target.value)} required
                    className="w-full rounded-xl border border-ev-line2 bg-ev-card py-3 pl-11 pr-4 text-[15px] text-ev-ink placeholder:text-ev-ink3/80 transition focus:border-ev-green focus:outline-none focus:ring-2 focus:ring-ev-green/25 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC] dark:placeholder:text-[#7E8C7E]/80 dark:focus:border-[#5BAE88]" />
                </div>
              </div>

              <FormError />

              <SubmitBtn label="Completar configuración" loadingLabel="Guardando…" disabled={!company.trim()} />
            </form>
          </div>
        );
    }
  };

  return (
    <div className="relative flex min-h-screen bg-ev-paper text-ev-ink font-sans antialiased [text-rendering:optimizeLegibility] dark:bg-[#0E1813] dark:text-[#F1EBDC]">
      {/* film grain overlay */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 bg-grain opacity-[0.05] mix-blend-multiply dark:mix-blend-overlay dark:opacity-[0.06]" />

      {renderLeftPanel()}

      {/* RIGHT PANEL */}
      <main className="relative flex w-full flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-[420px]">

          {/* mobile brand */}
          <a href="/" className="mb-6 inline-flex items-center gap-2.5 lg:hidden" aria-label="Evalen, volver al inicio">
            <svg className="h-9 w-9" viewBox="0 0 48 48" aria-hidden="true">
              <rect width="48" height="48" rx="12" fill="#0F3A2C" /><rect x="13" y="12" width="5" height="24" rx="2.5" fill="#F6F1E6" /><rect x="13" y="12" width="18" height="5" rx="2.5" fill="#F6F1E6" /><rect x="13" y="21.5" width="13" height="5" rx="2.5" fill="#F6F1E6" /><rect x="13" y="31" width="21" height="5" rx="2.5" fill="#F6F1E6" /><circle cx="37" cy="14.5" r="4.5" fill="#F3E94E" />
            </svg>
            <span className="font-serif text-2xl font-semibold tracking-tight text-ev-ink dark:text-[#F1EBDC]">evalen</span>
          </a>

          {/* mobile photo banner */}
          <div className="relative mb-7 h-40 overflow-hidden rounded-2xl shadow-soft-evalen lg:hidden">
            <img
              src="https://image.qwenlm.ai/public_source/88b2e882-98ee-4857-a83c-263c15dcf5c8/1f904026b-d7bd-4825-835a-df2b9015dd91.png"
              alt="Dos reclutadores en Santiago de Chile decidiendo juntos a quién entrevistar." className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ev-greendeep via-ev-greendeep/55 to-ev-greendeep/10" />
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4">
              <img src="https://image.qwenlm.ai/public_source/88b2e882-98ee-4857-a83c-263c15dcf5c8/135114acb-fca5-492d-942f-5d60b557b4bb.png" alt="Matías Herrera" className="h-9 w-9 rounded-full object-cover ring-2 ring-ev-onmark/40" loading="lazy" />
              <p className="font-serif text-[13px] italic leading-snug text-ev-onmark">&ldquo;Cerré una vacante en 12 días. Evalen me devolvió las mañanas.&rdquo; <span className="not-italic font-mono text-[10px] text-ev-onmark/70">&mdash; Matías H., Santiago</span></p>
            </div>
          </div>

          {/* plan banner */}
          {selectedPlan && (
            <div className={`mb-6 flex items-start gap-3 rounded-xl border px-3.5 py-3 text-[13px] leading-snug ${isPro ? 'border-ev-green/35 bg-ev-greentint/70 text-ev-ink dark:border-[#5BAE88]/35 dark:bg-[#5BAE88]/14' : 'border-ev-line2 bg-ev-paper2/70 text-ev-ink2 dark:border-[rgba(241,235,220,.13)] dark:bg-[#13201A]/70'}`} role="status">
              {isPro ? (
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-ev-green dark:text-[#5BAE88]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.8 6.1 20.2l1.2-6.6L2.5 9l6.6-.9z" /></svg>
              ) : (
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-ev-green dark:text-[#5BAE88]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              )}
              <span className="font-medium">
                {isPro
                  ? <>Vienes por <b>EvalenPro</b>. Al entrar te llevamos directo al checkout &mdash; $49/mes, sin permanencia.</>
                  : <>Estás a un paso de tu primera campaña gratis. <b>3 CVs</b> de cortesía, sin tarjeta.</>
                }
              </span>
            </div>
          )}

          {/* heading */}
          <header className="mb-7">
            <h2 className="font-serif text-[2rem] font-semibold leading-[1.08] tracking-tight text-ev-ink dark:text-[#F1EBDC] sm:text-[2.2rem]">
              {step === 'signup' ? 'Crea tu cuenta gratis' : step === 'login' ? 'Qué bueno verte de vuelta' : 'Qué bueno verte de vuelta.'}
            </h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-ev-ink2 dark:text-[#AAB6A8]">
              {step === 'signup'
                ? 'Estás a un paso de empezar a evaluar CVs con IA.'
                : step === 'onboarding'
                ? 'Configura tu espacio de trabajo.'
                : 'Entra con Google o con tu correo y sigue evaluando CVs donde los dejaste.'}
            </p>
          </header>

          {/* Google (only on initial step) */}
          {step === 'initial' && (
            <>
              <button type="button" onClick={handleGoogleLogin}
                className="group flex w-full items-center justify-center gap-3 rounded-xl border border-ev-line2 bg-ev-card px-4 py-3 text-[15px] font-medium text-ev-ink shadow-soft-evalen transition hover:-translate-y-0.5 hover:border-ev-ink hover:bg-ev-paper2 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC] dark:hover:border-[#F1EBDC] dark:hover:bg-[#13201A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ev-green focus-visible:ring-offset-2 focus-visible:ring-offset-ev-paper dark:focus-visible:ring-offset-[#0E1813]">
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                </svg>
                <span>Continuar con Google</span>
                <svg className="hidden h-5 w-5 animate-spin text-ev-ink3" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity=".25" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </button>

              <div className="my-6 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-ev-line2 dark:bg-[rgba(241,235,220,.26)]" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ev-ink3 dark:text-[#7E8C7E]">o con tu correo</span>
                <span className="h-px flex-1 bg-ev-line2 dark:bg-[rgba(241,235,220,.26)]" />
              </div>
            </>
          )}

          {/* dynamic form content */}
          {renderFormContent()}

          {/* register link (initial & login steps) */}
          {(step === 'initial' || step === 'login') && (
            <p className="mt-7 text-center text-[14px] text-ev-ink2 dark:text-[#AAB6A8]">
              {step === 'initial' ? '¿Primera vez aquí?' : '¿Primera vez por aquí?'}
              {' '}<a href={step === 'initial' ? `/register?plan=${plan}` : '/register'} className="font-semibold text-ev-cta underline-offset-2 hover:underline dark:text-[#FF6A38]">Crea tu cuenta gratis</a>
              <span className="text-ev-ink3 dark:text-[#7E8C7E]"> &mdash; incluye 3 CVs.</span>
            </p>
          )}

          {/* mini footer */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-ev-line pt-5 font-mono text-[11px] text-ev-ink3 dark:border-[rgba(241,235,220,.13)] dark:text-[#7E8C7E]">
            <a href="/" className="hover:text-ev-ink2 dark:hover:text-[#AAB6A8]">&larr; Volver al inicio</a>
            <span className="text-ev-line2 dark:text-[rgba(241,235,220,.26)]">&middot;</span>
            <a href="/terminos" className="hover:text-ev-ink2 dark:hover:text-[#AAB6A8]">Términos</a>
            <span className="text-ev-line2 dark:text-[rgba(241,235,220,.26)]">&middot;</span>
            <a href="/privacidad" className="hover:text-ev-ink2 dark:hover:text-[#AAB6A8]">Privacidad</a>
            <span className="text-ev-line2 dark:text-[rgba(241,235,220,.26)]">&middot;</span>
            <span className="text-ev-ink2 dark:text-[#AAB6A8]">Hecho con criterio</span>
          </div>
        </div>
      </main>

      {/* theme fab */}
      <button type="button" onClick={() => setIsDark(p => !p)} aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'} title="Cambiar tema"
        className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-ev-line2 bg-ev-card text-ev-ink shadow-soft-evalen transition hover:-translate-y-0.5 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC]">
        <svg className={`h-[19px] w-[19px] ${isDark ? 'hidden' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
        <svg className={`h-[19px] w-[19px] ${isDark ? '' : 'hidden'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      </button>
    </div>
  );
};

export default EvalenAuth;
