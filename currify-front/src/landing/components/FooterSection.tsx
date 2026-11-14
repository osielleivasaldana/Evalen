import React, { useEffect, useState } from 'react';

const productLinks = [
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Análisis de perfiles', href: '#analisis' },
  { label: 'Planes', href: '#planes' },
];

const accountLinks = [
  { label: 'Empezar gratis', href: '/login?plan=free' },
  { label: 'Iniciar sesión', href: '/login' },
];

const legalLinks = [
  { label: 'Privacidad', href: '/privacidad' },
  { label: 'Términos de uso', href: '/terminos' },
];

const FooterSection: React.FC = () => {
  const [showSticky, setShowSticky] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const hero = document.querySelector('.lp-hero');
      const footer = document.querySelector('.lp-footer');

      const heroBottom = hero
        ? hero.getBoundingClientRect().top + scrollY + hero.getBoundingClientRect().height
        : 800;
      const footerTop = footer
        ? footer.getBoundingClientRect().top + scrollY
        : Number.POSITIVE_INFINITY;

      const pastHero = scrollY > heroBottom - 120;
      const nearFooter = scrollY + window.innerHeight > footerTop - 40;

      setShowSticky(pastHero && !nearFooter);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollTo = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    event.preventDefault();
    document
      .getElementById(href.slice(1))
      ?.scrollIntoView({ behavior: 'auto', block: 'start' });
  };

  return (
    <footer className="lp-footer">
      <div className="lp-footer__inner">
        <div className="lp-footer__top">
          <div className="lp-footer__brand">
            <p className="lp-footer__logo">evalen.</p>
            <p className="lp-footer__tagline">
              Tecnología para evaluar.
              <br />
              Personas para decidir.
            </p>
          </div>

          <nav className="lp-footer__nav" aria-label="Enlaces del pie de página">
            <div className="lp-footer__col">
              <p className="lp-footer__col-title">Producto</p>
              {productLinks.map((link) => (
                <a
                  key={link.label}
                  className="lp-footer__link"
                  href={link.href}
                  onClick={(event) => scrollTo(event, link.href)}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="lp-footer__col">
              <p className="lp-footer__col-title">Cuenta</p>
              {accountLinks.map((link) => (
                <a key={link.label} className="lp-footer__link" href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>

            <div className="lp-footer__col">
              <p className="lp-footer__col-title">Legal</p>
              {legalLinks.map((link) => (
                <a key={link.label} className="lp-footer__link" href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
        </div>

        <div className="lp-footer__rule" />

        <div className="lp-footer__bottom">
          <span>© {year} Evalen</span>
          <span>Selección asistida por IA. Decisión humana.</span>
        </div>
      </div>

      <div className={`lp-sticky ${showSticky ? 'is-visible' : ''}`}>
        <a className="lp-btn lp-btn--ghost" href="/login">
          Iniciar sesión
        </a>
        <a className="lp-btn lp-btn--primary" href="/login?plan=free">
          Empezar gratis
        </a>
      </div>
    </footer>
  );
};

export default FooterSection;
