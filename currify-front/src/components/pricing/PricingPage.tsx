import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import Navbar from '../layout/NavBar';

const PricingPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [checkingPlan, setCheckingPlan] = useState(true);

    useEffect(() => {
        const checkPlanAndRedirect = async () => {
            try {
                const profile = await apiService.getProfile();
                const billing = await apiService.getBillingStatus();
                
                // If user has Pro plan (active or trialing), redirect to billing page
                if (billing.status !== 'free' && billing.planId !== 'free') {
                    window.location.href = '/dashboard/billing';
                    return;
                }
            } catch (error) {
                // User not authenticated or error, stay on pricing page
                console.log('User not authenticated or error checking plan');
            } finally {
                setCheckingPlan(false);
            }
        };
        
        if (apiService.isAuthenticated()) {
            checkPlanAndRedirect();
        } else {
            setCheckingPlan(false);
        }
    }, []);

    const handleUpgrade = async () => {
        if (!apiService.isAuthenticated()) {
            // Redirect to login preserving the intent
            window.location.href = '/login?redirect=/pricing';
            return;
        }

        setLoading(true);
        try {
            const { url } = await apiService.createCheckoutSession('PRO');
            if (url) {
                window.location.href = url;
            } else {
                alert('Error initiating checkout.');
            }
        } catch (error) {
            console.error('Upgrade failed', error);
            alert('Could not start checkout session.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingPlan) {
        return (
            <div className="min-h-screen bg-gray-50 font-sans">
                <Navbar />
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </div>
        );
    }

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
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">

                    {/* Free Plan */}
                    <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 p-8 flex flex-col">
                        <div className="flex-1">
                            <h3 className="text-2xl font-semibold text-gray-900">Gratis</h3>
                            <p className="mt-4 flex items-baseline text-gray-900">
                                <span className="text-5xl font-extrabold tracking-tight">$0</span>
                                <span className="ml-1 text-xl font-semibold text-gray-500">/mes</span>
                            </p>
                            <p className="mt-6 text-gray-500">Ideal para probar la plataforma.</p>

                            <ul className="mt-6 space-y-4">
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700">3 Análisis de CV por mes</p>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700">1 Campaña activa</p>
                                </li>
                            </ul>
                        </div>
                        <div className="mt-8">
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="block w-full py-3 px-6 border border-gray-300 rounded-xl text-center font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Comenzar Gratis
                            </button>
                        </div>
                    </div>

                    {/* Pro Plan */}
                    <div className="relative bg-white rounded-3xl shadow-2xl border-2 border-indigo-500 p-8 flex flex-col transform scale-105 z-10">
                        <div className="absolute top-0 right-0 -mt-4 mr-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wide">
                            Recomendado
                        </div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-semibold text-gray-900">Pro</h3>
                            <p className="mt-4 flex items-baseline text-gray-900">
                                <span className="text-5xl font-extrabold tracking-tight">$29</span>
                                <span className="ml-1 text-xl font-semibold text-gray-500">/mes</span>
                            </p>
                            <p className="mt-6 text-gray-500">Para reclutadores activos.</p>

                            <ul className="mt-6 space-y-4">
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700">CVs Ilimitados</p>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700">Campañas Ilimitadas</p>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700">Análisis con IA Avanzada</p>
                                </li>
                            </ul>
                        </div>
                        <div className="mt-8">
                            <button
                                onClick={handleUpgrade}
                                disabled={loading}
                                className="w-full flex items-center justify-center py-4 px-8 border border-transparent rounded-xl shadow-lg text-lg font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02]"
                            >
                                {loading ? 'Procesando...' : 'Mejorar a Pro'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PricingPage;
