import React, { useState } from 'react';
import { Campaign } from '../../services/api';

interface PublishShareScreenProps {
  campaign: Campaign;
  onGoToDashboard: () => void;
}

const SOCIAL_ICONS = {
  linkedin: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.3A1.7 1.7 0 118.2 6.6a1.7 1.7 0 01-1.7 1.7zM19 19h-3v-4.6c0-1.4-.5-2.4-1.8-2.4a2 2 0 00-1.9 1.3 2.6 2.6 0 00-.1.9V19h-3v-9h3v1.2a3.2 3.2 0 012.9-1.6c2.1 0 3.6 1.3 3.6 4.2z" /></svg>,
  twitter: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 2.2h3.3l-7.2 8.2 8.5 11.2h-6.7l-5.2-6.8-6 6.8H2.2l7.7-8.8L2 2.2h6.8l4.7 6.2zM17 19.5h1.8L7.3 4.7H5.4z" /></svg>,
  whatsapp: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12c0 2.1.6 4.1 1.8 5.8L2.5 21.5l3.9-1.2C7.9 21.3 9.9 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm4.2 14.3c-.4.7-1.2 1.1-2 1.2-.5 0-1.1 0-1.8-.4-1.2-.6-2.3-1.4-3.2-2.5-.4-.5-.8-1.1-1.2-1.7-.3-.7-.5-1.5-.5-2.3 0-1.1.4-2.1 1.1-2.8.3-.3.7-.5 1.1-.5.2 0 .4 0 .6.1.2 0 .5.1.7.5l.8 1.6c.1.2.2.4.1.6-.1.2-.2.4-.4.5l-.5.5c-.1.1-.2.2-.1.4.3.6.8 1.2 1.3 1.6.2.2.5.4.7.5.2.1.4.1.5 0l.5-.6c.2-.2.4-.3.6-.2.2.1.4.2.5.3l1.1.8c.2.1.3.3.3.5 0 .1-.2.5-.4.8z" /></svg>,
  facebook: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7C18.3 21.1 22 17 22 12z" /></svg>,
  email: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2z" /><path d="M4 6l8 6 8-6" /></svg>,
};

export default function PublishShareScreen({ campaign, onGoToDashboard }: PublishShareScreenProps) {
  const [copied, setCopied] = useState(false);
  const publicUrl = `${window.location.origin}/apply/${campaign.publicId}`;

  const shareText = `Estoy buscando un ${campaign.title} para mi equipo en Evalen. ¿Conoces a alguien?`;
  const encodedUrl = encodeURIComponent(publicUrl);
  const encodedText = encodeURIComponent(shareText);

  const shareLinks = [
    { name: 'LinkedIn', href: `https://linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, icon: SOCIAL_ICONS.linkedin },
    { name: 'Twitter / X', href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, icon: SOCIAL_ICONS.twitter },
    { name: 'WhatsApp', href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`, icon: SOCIAL_ICONS.whatsapp },
    { name: 'Facebook', href: `https://facebook.com/sharer/sharer.php?u=${encodedUrl}`, icon: SOCIAL_ICONS.facebook },
    { name: 'Email', href: `mailto:?subject=${encodeURIComponent(`Oferta laboral: ${campaign.title}`)}&body=${encodedText}%0A%0A${encodedUrl}`, icon: SOCIAL_ICONS.email },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="flex flex-col items-center py-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green text-onmark">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </span>
        <h2 className="mt-5 font-serif text-[1.8rem] font-semibold tracking-tight text-ink t-ink">¡Campaña publicada!</h2>
        <p className="mt-2 max-w-[44ch] text-[15px] text-ink2 t-ink2">
          <b className="text-ink t-ink">{campaign.title}</b> ya está visible para candidatos.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-card p-6 t-card t-line">
        <div className="flex items-center gap-3">
          <h3 className="flex-1 truncate font-sans text-[1.2rem] font-semibold tracking-tight text-ink t-ink">{campaign.title}</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-goodt px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-wide text-good t-goodt t-good">
            <span className="h-1.5 w-1.5 rounded-full bg-good"></span> Activa
          </span>
        </div>

        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Enlace público de la campaña</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="min-w-0 flex-1 rounded-xl border border-line2 bg-paper px-4 py-2.5 font-mono text-[13px] text-ink outline-none transition focus:border-green t-ink t-paper t-line2"
            />
            <button
              onClick={handleCopyLink}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cta px-5 py-2.5 text-[13px] font-semibold text-ctatext shadow-cta transition hover:-translate-y-0.5 hover:bg-ctah"
            >
              {copied ? (
                <><svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> Copiado</>
              ) : (
                <><svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2.5" /><path d="M5 15V5a2 2 0 012-2h10" /></svg> Copiar enlace</>
              )}
            </button>
          </div>
        </div>

        <div className="mt-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Comparte esta campaña</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {shareLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-xl border border-line2 bg-card px-4 py-2.5 text-[12.5px] font-semibold text-ink2 shadow-xs transition hover:-translate-y-0.5 hover:border-green hover:text-green t-card t-ink2 t-line2"
              >
                {link.icon}
                {link.name}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={onGoToDashboard}
          className="inline-flex items-center gap-2 rounded-xl bg-cta px-6 py-3 text-[14px] font-semibold text-ctatext shadow-cta transition hover:-translate-y-0.5 hover:bg-ctah"
        >
          Ir al dashboard
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}
