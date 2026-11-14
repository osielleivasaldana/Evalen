import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';

const links = [
  { id: 'producto', label: 'Producto' },
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'planes', label: 'Planes' },
];

const LandingNavbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    try {
      setIsAuthenticated(
        typeof apiService.isAuthenticated === 'function' && apiService.isAuthenticated(),
      );
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  const goTo = (id: string) => {
    setMobileOpen(false);
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
  };

  return (
    <header className="lp-nav">
      <div className="lp-nav__inner">
        <a className="lp-nav__logo" href="/" aria-label="Evalen, inicio">
          evalen.
        </a>

        <nav className="lp-nav__links" aria-label="Navegación principal">
          {links.map((link) => (
            <a
              key={link.id}
              className="lp-nav__link"
              href={`#${link.id}`}
              onClick={(event) => {
                event.preventDefault();
                goTo(link.id);
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          className="lp-nav__login"
          href={isAuthenticated ? '/dashboard' : '/login'}
        >
          {isAuthenticated ? 'Ir al panel' : 'Iniciar sesión'}
        </a>

        <a className="lp-nav__cta" href="/login?plan=free">
          Empezar gratis →
        </a>

        <button
          type="button"
          className="lp-nav__burger"
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      <div className={`lp-mobile ${mobileOpen ? 'is-open' : ''}`}>
        {links.map((link) => (
          <a
            key={link.id}
            className="lp-mobile__link"
            href={`#${link.id}`}
            onClick={(event) => {
              event.preventDefault();
              goTo(link.id);
            }}
          >
            {link.label}
          </a>
        ))}
        <a
          className="lp-mobile__link"
          href={isAuthenticated ? '/dashboard' : '/login'}
        >
          {isAuthenticated ? 'Ir al panel' : 'Iniciar sesión'}
        </a>
        <a className="lp-mobile__cta" href="/login?plan=free">
          Empezar gratis →
        </a>
      </div>
    </header>
  );
};

export default LandingNavbar;
