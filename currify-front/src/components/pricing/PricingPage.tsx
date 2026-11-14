import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import Navbar from '../layout/NavBar';

const defaultPlans = [
    {
        tier: 'FREE',
        name: 'Gratis',
        price: 0,
        description: 'Ideal para probar la plataforma.',
        features: [
            '1 campaña activa',
            '3 CVs por mes',
            '3 créditos de Smart Fill por mes',
            'Análisis básico de candidatos',
            'Extracción básica de datos'
        ],
        ctaText: 'Comenzar Gratis',
        featured: false
    },
    {
        tier: 'PRO',
        name: 'Pro',
        price: 19990,
        description: 'Para reclutadores activos.',
        features: [
            'Campañas ilimitadas',
            'Procesamiento ilimitado de CVs',
            'Smart Fill ilimitado',
            'Smart Match avanzado',
            'Exportación de reportes',
            'Soporte prioritario'
        ],
        ctaText: 'Mejorar a Pro',
        featured: true
    },
    {
        tier: 'ENTERPRISE',
        name: 'Enterprise',
        price: -1,
        description: 'Para grandes corporativos.',
        features: [
            'Todo lo de Evalen Pro',
            'SSO corporativo',
            'API de integración',
            'Onboarding personalizado',
            'SLA garantizado'
        ],
        ctaText: 'Contactar Ventas',
        featured: false
    }
];

const PricingPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<any[]>(defaultPlans);
    const [isDark, setIsDark] = useState(() => {
        try {
            const t = localStorage.getItem('evalen-theme');
            if (t === 'dark') return true;
            if (t === 'light') return false;
            return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
        } catch { return false; }
    });

    const [showContactModal, setShowContactModal] = useState(false);
    const [contactForm, setContactForm] = useState({
        name: '',
        email: '',
        company: '',
        message: ''
    });
    const [sendingContact, setSendingContact] = useState(false);
    const [contactSuccess, setContactSuccess] = useState(false);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
    }, [isDark]);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const data = await apiService.getPlans();
                if (data && data.length > 0) {
                    const tierOrder: Record<string, number> = { 'FREE': 1, 'PRO': 2, 'ENTERPRISE': 3 };
                    const sorted = [...data].sort((a, b) => (tierOrder[a.tier] || 99) - (tierOrder[b.tier] || 99));
                    const formatted = sorted.map((p) => {
                        const customFeatures = (p.features || []).filter((f: string) => {
                            const lower = f.toLowerCase();
                            return !lower.includes('campaña') && !lower.includes('cv') && !lower.includes('smart fill') && !lower.includes('procesamiento');
                        });
                        const dynamicFeatures = [
                            p.campaignLimit >= 999 ? 'Campañas ilimitadas' : `${p.campaignLimit} campaña${p.campaignLimit > 1 ? 's' : ''} mensual${p.campaignLimit > 1 ? 'es' : ''}`,
                            p.cvCredits >= 999 ? 'Procesamiento ilimitado de CVs' : `${p.cvCredits} CV${p.cvCredits > 1 ? 's' : ''} por mes`,
                            p.smartFillCredits >= 999 ? 'Smart Fill ilimitado' : `${p.smartFillCredits} crédito${p.smartFillCredits > 1 ? 's' : ''} de Smart Fill por mes`,
                            ...customFeatures
                        ];
                        return {
                            ...p,
                            features: dynamicFeatures
                        };
                    });
                    setPlans(formatted);
                }
            } catch (error) {
                console.error('Error loading plans in pricing page:', error);
            }
        };
        fetchPlans();
    }, []);

    const handleUpgrade = async () => {
        if (!apiService.isAuthenticated()) {
            navigate('/login?redirect=/pricing');
            return;
        }
        navigate('/checkout');
    };

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSendingContact(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setSendingContact(false);
        setContactSuccess(true);
        setContactForm({ name: '', email: '', company: '', message: '' });
    };

    return (
        <div className="min-h-screen bg-ev-paper font-sans antialiased [text-rendering:optimizeLegibility] dark:bg-[#0E1813]">
            {/* film grain overlay */}
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 bg-grain opacity-[0.04] mix-blend-multiply dark:mix-blend-overlay dark:opacity-[0.05]" />

            <Navbar />

            <div className="relative pt-24 pb-12 overflow-hidden">
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] uppercase text-ev-green dark:text-[#5BAE88]">
                        <span className="h-2 w-2 rounded-full bg-ev-cta dark:bg-[#FF6A38]" />
                        Precios
                    </span>
                    <h1 className="mt-3 font-serif text-[2.6rem] font-semibold leading-[1.08] tracking-tight text-ev-ink dark:text-[#F1EBDC] sm:text-5xl">
                        Planes para cada etapa
                    </h1>
                    <p className="mt-4 text-[15px] leading-relaxed text-ev-ink2 max-w-xl mx-auto dark:text-[#AAB6A8]">
                        Elige el plan que mejor se adapte a tus necesidades de reclutamiento.
                    </p>
                </div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-8 max-w-7xl mx-auto">
                    {plans.map((p) => {
                        const isPro = p.tier === 'PRO';
                        const isEnterprise = p.tier === 'ENTERPRISE';
                        return (
                            <div
                                key={p.tier}
                                className={`relative bg-ev-card rounded-3xl shadow-card-lg-evalen p-8 flex flex-col dark:bg-[#16241C] dark:shadow-[0_22px_48px_-28px_rgba(0,0,0,.7)] ${isPro ? 'border-2 border-ev-green dark:border-[#5BAE88] z-10' : 'border border-ev-line dark:border-[rgba(241,235,220,.13)]'
                                    }`}
                            >
                                {isPro && (
                                    <div className="absolute top-0 right-0 -mt-4 mr-4 bg-ev-cta text-ev-ctatext text-[11px] font-mono font-semibold px-3 py-1 rounded-full shadow-md uppercase tracking-wide dark:bg-[#FF6A38] dark:text-[#10231A]">
                                        Recomendado
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="text-2xl font-semibold text-ev-ink dark:text-[#F1EBDC]">{p.name}</h3>
                                    <p className="mt-4 flex items-baseline text-ev-ink dark:text-[#F1EBDC]">
                                        <span className="text-4xl font-extrabold tracking-tight">
                                            {p.price === 0 ? '$0' : p.price === -1 ? 'Personalizado' : `$${p.price.toLocaleString('es-CL')}`}
                                        </span>
                                        {p.price !== -1 && <span className="ml-1 text-xl font-semibold text-ev-ink2 dark:text-[#AAB6A8]">/mes</span>}
                                    </p>
                                    <p className="mt-6 text-ev-ink2 dark:text-[#AAB6A8]">{p.description}</p>

                                    <ul className="mt-6 space-y-4">
                                        {p.features.map((feature: string, idx: number) => (
                                            <li key={idx} className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-6 w-6 text-ev-green dark:text-[#5BAE88]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <p className="ml-3 text-base text-ev-ink2 dark:text-[#AAB6A8]">{feature}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="mt-8">
                                    {p.tier === 'FREE' ? (
                                        <button
                                            onClick={() => navigate('/dashboard')}
                                            className="block w-full py-3 px-6 border border-ev-line2 rounded-xl text-center font-medium text-ev-ink2 bg-ev-card hover:bg-ev-paper2 transition-colors shadow-sm dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#AAB6A8] dark:hover:bg-[#13201A]"
                                        >
                                            Ir al Dashboard
                                        </button>
                                    ) : p.tier === 'PRO' ? (
                                        <button
                                            onClick={handleUpgrade}
                                            disabled={loading}
                                            className="w-full flex items-center justify-center gap-2 py-4 px-8 rounded-xl shadow-cta-evalen font-semibold text-[15px] text-ev-ctatext bg-ev-cta hover:bg-ev-ctah transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ev-cta focus-visible:ring-offset-2 focus-visible:ring-offset-ev-paper dark:bg-[#FF6A38] dark:text-[#10231A] dark:hover:bg-[#FF8455]"
                                        >
                                            {loading ? 'Procesando...' : 'Mejorar a Pro'}
                                            {!loading && (
                                                <svg className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowContactModal(true)}
                                            className="block w-full py-3.5 px-6 border-2 border-ev-green rounded-xl text-center font-semibold text-ev-green bg-ev-greentint hover:bg-ev-green hover:text-ev-ctatext transition-colors shadow-sm dark:border-[#5BAE88] dark:bg-[#1C3329] dark:text-[#5BAE88] dark:hover:bg-[#5BAE88] dark:hover:text-[#10231A]"
                                        >
                                            Contactar Ventas
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sales Contact Modal */}
            {showContactModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(11,28,21,.55)] backdrop-blur-sm animate-fade-in font-sans dark:bg-[rgba(0,0,0,.7)]">
                    <div className="bg-ev-card border border-ev-line rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-ev-ink dark:bg-[#16241C] dark:border-[rgba(241,235,220,.13)] dark:text-[#F1EBDC]">
                        <div className="px-6 py-5 border-b border-ev-line flex justify-between items-center dark:border-[rgba(241,235,220,.13)]">
                            <div>
                                <h3 className="text-xl font-bold text-ev-ink dark:text-[#F1EBDC]">Contactar a Ventas</h3>
                                <p className="text-xs text-ev-ink3 dark:text-[#7E8C7E]">Plan Enterprise personalizado</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowContactModal(false);
                                    setContactSuccess(false);
                                }}
                                className="p-1.5 rounded-lg hover:bg-ev-paper2 text-ev-ink3 hover:text-ev-ink transition-colors dark:hover:bg-[#13201A] dark:hover:text-[#F1EBDC]"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                            </button>
                        </div>

                        {contactSuccess ? (
                            <div className="p-8 text-center space-y-4">
                                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ev-green text-ev-onmark mx-auto dark:bg-[#5BAE88] dark:text-[#10231A]">
                                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                </span>
                                <h4 className="text-lg font-bold text-ev-ink dark:text-[#F1EBDC]">¡Mensaje recibido!</h4>
                                <p className="text-sm text-ev-ink2 max-w-sm mx-auto dark:text-[#AAB6A8]">
                                    Gracias por interesarte en Evalen Enterprise. Nuestro equipo comercial se pondrá en contacto contigo en las próximas horas.
                                </p>
                                <button
                                    onClick={() => {
                                        setShowContactModal(false);
                                        setContactSuccess(false);
                                    }}
                                    className="px-6 py-2.5 bg-ev-cta text-ev-ctatext rounded-xl font-bold text-sm hover:bg-ev-ctah transition-colors dark:bg-[#FF6A38] dark:text-[#10231A] dark:hover:bg-[#FF8455]"
                                >
                                    Cerrar
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="mb-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-ev-ink2 dark:text-[#AAB6A8]">Nombre completo</label>
                                    <input
                                        type="text"
                                        value={contactForm.name}
                                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                        className="w-full rounded-xl border border-ev-line2 bg-ev-card py-2.5 px-4 text-[14px] text-ev-ink placeholder:text-ev-ink3/80 transition focus:border-ev-green focus:outline-none focus:ring-2 focus:ring-ev-green/25 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC] dark:placeholder:text-[#7E8C7E]/80"
                                        required
                                        placeholder="Ej: Osiel Leiva"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-ev-ink2 dark:text-[#AAB6A8]">Correo Corporativo</label>
                                    <input
                                        type="email"
                                        value={contactForm.email}
                                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        className="w-full rounded-xl border border-ev-line2 bg-ev-card py-2.5 px-4 text-[14px] text-ev-ink placeholder:text-ev-ink3/80 transition focus:border-ev-green focus:outline-none focus:ring-2 focus:ring-ev-green/25 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC] dark:placeholder:text-[#7E8C7E]/80"
                                        required
                                        placeholder="ejemplo@empresa.com"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-ev-ink2 dark:text-[#AAB6A8]">Nombre de la Empresa</label>
                                    <input
                                        type="text"
                                        value={contactForm.company}
                                        onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                                        className="w-full rounded-xl border border-ev-line2 bg-ev-card py-2.5 px-4 text-[14px] text-ev-ink placeholder:text-ev-ink3/80 transition focus:border-ev-green focus:outline-none focus:ring-2 focus:ring-ev-green/25 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC] dark:placeholder:text-[#7E8C7E]/80"
                                        required
                                        placeholder="Empresa S.A."
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-ev-ink2 dark:text-[#AAB6A8]">Mensaje / Requerimientos</label>
                                    <textarea
                                        value={contactForm.message}
                                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                        rows={4}
                                        className="w-full rounded-xl border border-ev-line2 bg-ev-card py-2.5 px-4 text-[14px] text-ev-ink placeholder:text-ev-ink3/80 transition focus:border-ev-green focus:outline-none focus:ring-2 focus:ring-ev-green/25 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC] dark:placeholder:text-[#7E8C7E]/80"
                                        required
                                        placeholder="Cuéntanos más sobre tus necesidades..."
                                    />
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowContactModal(false)}
                                        className="flex-1 py-2.5 rounded-xl border border-ev-line2 text-sm font-semibold text-ev-ink2 bg-ev-card hover:bg-ev-paper2 transition-colors dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#AAB6A8] dark:hover:bg-[#13201A]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sendingContact}
                                        className="flex-1 py-2.5 rounded-xl bg-ev-cta hover:bg-ev-ctah disabled:bg-ev-line2 text-ev-ctatext disabled:text-ev-ink3 text-sm font-semibold shadow-md transition-colors dark:bg-[#FF6A38] dark:text-[#10231A] dark:hover:bg-[#FF8455] dark:disabled:bg-[rgba(241,235,220,.13)] dark:disabled:text-[#7E8C7E]"
                                    >
                                        {sendingContact ? 'Enviando...' : 'Enviar Mensaje'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* theme fab */}
            <button type="button" onClick={() => setIsDark(p => !p)} aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'} title="Cambiar tema"
                className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-ev-line2 bg-ev-card text-ev-ink shadow-soft-evalen transition hover:-translate-y-0.5 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC]">
                <svg className={`h-[19px] w-[19px] ${isDark ? 'hidden' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
                <svg className={`h-[19px] w-[19px] ${isDark ? '' : 'hidden'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            </button>
        </div>
    );
};

export default PricingPage;
