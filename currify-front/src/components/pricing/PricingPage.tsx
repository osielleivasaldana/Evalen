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
    
    // Contact Modal States
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
            // Redirect to login preserving the intent
            navigate('/login?redirect=/pricing');
            return;
        }

        // Redirect to the Checkout Page for review
        navigate('/checkout');
    };

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSendingContact(true);
        // Simulate API call to send email/register request
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setSendingContact(false);
        setContactSuccess(true);
        // Reset form
        setContactForm({ name: '', email: '', company: '', message: '' });
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Navbar />

            <div className="relative pt-24 pb-12 overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-400/20 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-blue-400/20 rounded-full blur-[100px]"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase">Precios</h2>
                    <p className="mt-1 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
                        Planes para cada etapa
                    </p>
                    <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
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
                                className={`relative bg-white rounded-3xl shadow-xl p-8 flex flex-col ${
                                    isPro ? 'border-2 border-indigo-500 transform scale-105 z-10' : 'border border-gray-100'
                                }`}
                            >
                                {isPro && (
                                    <div className="absolute top-0 right-0 -mt-4 mr-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wide">
                                        Recomendado
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="text-2xl font-semibold text-gray-900">{p.name}</h3>
                                    <p className="mt-4 flex items-baseline text-gray-900">
                                        <span className="text-4xl font-extrabold tracking-tight">
                                            {p.price === 0 ? '$0' : p.price === -1 ? 'Personalizado' : `$${p.price.toLocaleString('es-CL')}`}
                                        </span>
                                        {p.price !== -1 && <span className="ml-1 text-xl font-semibold text-gray-500">/mes</span>}
                                    </p>
                                    <p className="mt-6 text-gray-500">{p.description}</p>

                                    <ul className="mt-6 space-y-4">
                                        {p.features.map((feature: string, idx: number) => (
                                            <li key={idx} className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <svg className={`h-6 w-6 ${isPro ? 'text-indigo-500' : isEnterprise ? 'text-purple-500' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <p className="ml-3 text-base text-gray-700">{feature}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="mt-8">
                                    {p.tier === 'FREE' ? (
                                        <button
                                            onClick={() => navigate('/dashboard')}
                                            className="block w-full py-3 px-6 border border-gray-300 rounded-xl text-center font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                                        >
                                            Ir al Dashboard
                                        </button>
                                    ) : p.tier === 'PRO' ? (
                                        <button
                                            onClick={handleUpgrade}
                                            disabled={loading}
                                            className="w-full flex items-center justify-center py-4 px-8 border border-transparent rounded-xl shadow-lg text-lg font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02]"
                                        >
                                            {loading ? 'Procesando...' : 'Mejorar a Pro'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowContactModal(true)}
                                            className="block w-full py-3.5 px-6 border border-purple-600 rounded-xl text-center font-bold text-purple-600 bg-white hover:bg-purple-50/50 transition-colors shadow-sm"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
                    <div className="bg-white border border-gray-150 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-gray-900">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Contactar a Ventas</h3>
                                <p className="text-xs text-gray-500">Plan Enterprise personalizado</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowContactModal(false);
                                    setContactSuccess(false);
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-950 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {contactSuccess ? (
                            <div className="p-8 text-center space-y-4">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl">
                                    ✓
                                </div>
                                <h4 className="text-lg font-bold text-gray-900">¡Mensaje recibido con éxito!</h4>
                                <p className="text-sm text-gray-600 max-w-sm mx-auto">
                                    Gracias por interesarte en Evalen Enterprise. Nuestro equipo comercial se pondrá en contacto contigo en las próximas horas.
                                </p>
                                <button
                                    onClick={() => {
                                        setShowContactModal(false);
                                        setContactSuccess(false);
                                    }}
                                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Nombre completo
                                    </label>
                                    <input
                                        type="text"
                                        value={contactForm.name}
                                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                                        required
                                        placeholder="Ej: Osiel Leiva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Correo Corporativo
                                    </label>
                                    <input
                                        type="email"
                                        value={contactForm.email}
                                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                                        required
                                        placeholder="ejemplo@empresa.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Nombre de la Empresa
                                    </label>
                                    <input
                                        type="text"
                                        value={contactForm.company}
                                        onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                                        required
                                        placeholder="Empresa S.A."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Mensaje / Requerimientos
                                    </label>
                                    <textarea
                                        value={contactForm.message}
                                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                        rows={4}
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                                        required
                                        placeholder="Cuéntanos más sobre tus necesidades..."
                                    />
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowContactModal(false)}
                                        className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sendingContact}
                                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold shadow-md transition-colors"
                                    >
                                        {sendingContact ? 'Enviando...' : 'Enviar Mensaje'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PricingPage;
