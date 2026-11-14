import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface NavBarProps {
  onLogout?: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPlan, setUserPlan] = useState('EvalenPro');
  const [cvCredits, setCvCredits] = useState(128);
  const [userRole, setUserRole] = useState<string | null>(null);
  const aRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!apiService.isAuthenticated()) return;
    apiService.getProfile().then(u => {
      setUserName(u.name);
      setUserRole(u.role);
      setUserPlan(u.plan || 'Free');
      setCvCredits(u.cvCredits ?? 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const f = () => { const y = window.scrollY || window.pageYOffset; setScrolled(y > 8); };
    window.addEventListener('scroll', f, { passive: true });
    f();
    return () => window.removeEventListener('scroll', f);
  }, []);

  useEffect(() => {
    if (!avatarOpen) return;
    const f = (e: MouseEvent) => { if (aRef.current && !aRef.current.contains(e.target as Node)) setAvatarOpen(false); };
    document.addEventListener('click', f);
    return () => document.removeEventListener('click', f);
  }, [avatarOpen]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === '/' && searchRef.current && document.activeElement !== searchRef.current && !/input|textarea/i.test((document.activeElement || {}).tagName || '')) {
        e.preventDefault(); searchRef.current?.focus();
      }
      if (e.key === 'Escape') { setAvatarOpen(false); setMobileOpen(false); }
    };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, []);

  const handleLogout = () => {
    setAvatarOpen(false);
    setMobileOpen(false);
    logout();
    onLogout?.();
  };

  const initials = (name: string) => name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

  const isActive = (path: string) => window.location.pathname === path;

  const campaignLimitReached = false; // simplified — old code had logic for this

  return (
    <header id="nav"
      className={`sticky top-0 z-50 border-b bg-paper/80 backdrop-blur-md backdrop-saturate-150 transition-colors t-paper ${scrolled ? 'border-line shadow-soft' : 'border-transparent'}`}>
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate('/')} className="flex shrink-0 items-center gap-2.5" aria-label="Evalen, inicio">
          <svg className="h-8 w-8" viewBox="0 0 48 48" aria-hidden="true">
            <rect width="48" height="48" rx="12" fill="var(--greendeep)" />
            <rect x="13" y="12" width="5" height="24" rx="2.5" fill="var(--onmark)" />
            <rect x="13" y="12" width="18" height="5" rx="2.5" fill="var(--onmark)" />
            <rect x="13" y="21.5" width="13" height="5" rx="2.5" fill="var(--onmark)" />
            <rect x="13" y="31" width="21" height="5" rx="2.5" fill="var(--onmark)" />
            <circle cx="37" cy="14.5" r="4.5" fill="var(--yellow)" />
          </svg>
          <span className="font-serif text-[1.35rem] font-semibold leading-none tracking-tight text-ink t-ink">evalen</span>
        </button>

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Principal">
          {[
            { label: 'Panel', href: '/dashboard' },
            { label: 'Campañas', href: '/campaigns' },
            ...(userRole === 'ADMIN' || userRole === 'RECRUITER' ? [{ label: 'Nueva Campaña', href: campaignLimitReached ? '#' : '/create-campaign' }] : []),
            ...(userRole === 'ADMIN' || userRole === 'RECRUITER' ? [{ label: 'Usuarios', href: '/admin/users' }] : []),
            ...(userRole === 'OWNER' ? [{ label: 'Panel', href: '/owner/dashboard' }] : []),
          ].filter(Boolean).map(item => (
            <button key={item.label} onClick={() => navigate(item.href)}
              className={`rounded-lg px-3 py-2 text-[15px] transition ${
                isActive(item.href)
                  ? 'bg-greentint font-semibold text-green t-goodt t-green'
                  : 'font-medium text-ink2 hover:bg-paper2 hover:text-ink t-ink2'
              }`}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="relative ml-auto hidden md:block">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink3 t-ink3">
            <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
          </span>
          <input ref={searchRef} type="search" placeholder="Buscar campañas o candidatos…" aria-label="Buscar"
            className="w-56 rounded-xl border border-line2 bg-card py-2 pl-9 pr-3 text-[16px] text-ink placeholder:text-ink3/80 transition focus:w-72 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink t-line2" />
          <kbd className="pointer-events-none absolute inset-y-0 right-2.5 my-auto hidden h-5 items-center rounded border border-line2 px-1.5 font-mono text-[12px] text-ink2 lg:flex t-ink2 t-line2">/</kbd>
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-3">
          <button type="button" onClick={() => navigate('/pricing')}
            className="group hidden items-center gap-2 rounded-full border border-line2 bg-card py-1.5 pl-2.5 pr-3 text-left transition hover:border-ink3 sm:flex t-card t-line2" title="Gestionar plan">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-greendeep text-onmark">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" /></svg>
            </span>
            <span className="leading-tight">
              <span className="block font-mono text-[12px] uppercase tracking-[0.1em] text-ink2 t-ink2">{userPlan}</span>
              <span className="block text-[13px] font-semibold text-ink t-ink">{cvCredits} CVs este mes</span>
            </span>
          </button>

          <button type="button" aria-label="Cambiar tema" onClick={() => {
            const root = document.documentElement;
            const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            try { localStorage.setItem('evalen-theme', next); } catch {}
          }}
            className="grid h-9 w-9 place-items-center rounded-xl border border-line2 bg-card text-ink transition hover:bg-paper2 t-card t-ink t-line2">
            <svg className="ic-moon h-[18px] w-[18px]" id="themeMoon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
            <svg className="ic-sun hidden h-[18px] w-[18px]" id="themeSun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          </button>

          <div className="relative" ref={aRef}>
            <button type="button" aria-haspopup="true" aria-expanded={avatarOpen} aria-label="Menú de cuenta"
              onClick={() => setAvatarOpen(o => !o)}
              className="grid h-9 w-9 place-items-center rounded-full bg-green font-mono text-[13px] font-semibold text-onmark ring-2 ring-paper transition hover:ring-paper2 t-good">
              {initials(userName)}
            </button>
            <div data-menu className={`absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line2 bg-card shadow-pop t-card t-line2 ${avatarOpen ? 'menu-show' : 'menu-hidden'}`}>
              <div className="border-b border-line px-4 py-3 t-line">
                <p className="text-[15px] font-semibold text-ink t-ink">{userName}</p>
                <p className="font-mono text-[12px] text-ink2 t-ink2">{apiService.user?.email || ''}</p>
              </div>
              <div className="p-1.5">
                <button type="button" onClick={() => { setAvatarOpen(false); navigate('/profile'); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] text-ink2 transition hover:bg-paper2 hover:text-ink t-ink2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></svg> Mi perfil
                </button>
                <button type="button" onClick={() => { setAvatarOpen(false); navigate('/pricing'); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] text-ink2 transition hover:bg-paper2 hover:text-ink t-ink2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 10h18M7 15h4" /></svg> Facturación y plan
                </button>
                <button type="button" onClick={() => { setAvatarOpen(false); navigate('/settings'); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] text-ink2 transition hover:bg-paper2 hover:text-ink t-ink2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.6 14H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg> Ajustes
                </button>
              </div>
              <div className="border-t border-line p-1.5 t-line">
                <button type="button" onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] font-medium text-low transition hover:bg-lowt t-low">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg> Cerrar sesión
                </button>
              </div>
            </div>
          </div>

          <button id="burger" type="button" aria-label="Abrir menú" aria-expanded={mobileOpen} onClick={() => setMobileOpen(o => !o)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-line2 bg-card text-ink lg:hidden t-card t-ink t-line2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>

      <div className={`border-t border-line bg-paper px-4 pb-5 pt-2 lg:hidden t-line t-paper ${mobileOpen ? '' : 'hidden'}`}>
        <div className="relative mb-3 mt-3 md:hidden">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink3"><svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg></span>
          <input type="search" placeholder="Buscar…" className="w-full rounded-xl border border-line2 bg-card py-2.5 pl-9 pr-3 text-[16px] text-ink placeholder:text-ink3/80 t-card t-ink t-line2" />
        </div>
        <nav className="grid" aria-label="Principal móvil">
          {[
            { label: 'Panel', href: '/dashboard' },
            { label: 'Campañas', href: '/campaigns' },
            ...(userRole === 'ADMIN' || userRole === 'RECRUITER' ? [{ label: 'Nueva Campaña', href: '/create-campaign' }, { label: 'Usuarios', href: '/admin/users' }] : []),
            ...(userRole === 'OWNER' ? [{ label: 'Panel', href: '/owner/dashboard' }] : []),
          ].filter(Boolean).map(item => (
            <button key={item.label} onClick={() => { setMobileOpen(false); navigate(item.href); }}
              className={`rounded-lg px-3 py-2.5 text-[15px] text-left ${
                isActive(item.href)
                  ? 'bg-greentint font-semibold text-green t-goodt t-green'
                  : 'font-medium text-ink2 t-ink2'
              }`}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-line2 bg-card px-3 py-2.5 t-card t-line2">
          <span className="text-[15px] font-semibold text-ink t-ink">{userPlan}</span>
          <span className="font-mono text-[12px] text-ink2 t-ink2">{cvCredits} CVs este mes</span>
        </div>
        <button type="button" onClick={handleLogout}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-line2 px-3 py-2.5 text-sm font-medium text-low transition hover:bg-lowt t-low t-line2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg> Cerrar sesión
        </button>
      </div>
    </header>
  );
};

export default NavBar;
