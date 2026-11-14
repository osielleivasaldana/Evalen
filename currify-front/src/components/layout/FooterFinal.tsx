import React from 'react';

const FooterFinal: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-between gap-3 border-t border-line py-6 text-[13px] text-ink2 sm:flex-row t-line t-ink2">
        <span>© {currentYear} Evalen · La IA lee, los humanos deciden.</span>
        <span className="flex items-center gap-3">
          <a href="#" className="transition hover:text-ink t-ink">Privacidad</a><span className="text-line2 t-line2">·</span>
          <a href="#" className="transition hover:text-ink t-ink">Términos</a><span className="text-line2 t-line2">·</span>
          <a href="#" className="transition hover:text-ink t-ink">Contacto</a>
        </span>
      </div>
    </footer>
  );
};

export default FooterFinal;
