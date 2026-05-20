import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { CheckCircleIcon, SparklesIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const CheckoutPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<'review' | 'processing' | 'success'>('review');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        document.body.classList.add('checkout-mode');
        return () => {
            document.body.classList.remove('checkout-mode');
        };
    }, []);

    const handleConfirmPurchase = async () => {
        setStep('processing');
        setError(null);

        try {
            const { url } = await apiService.createCheckoutSession('PRO');
            
            setTimeout(() => {
                window.location.href = url;
            }, 2000);
        } catch (err: any) {
            console.error('Checkout error:', err);
            setError(err.message || 'Error al procesar el pago. Intenta de nuevo.');
            setStep('review');
        }
    };

    const handleGoBack = () => {
        sessionStorage.removeItem('selectedPlan');
        navigate('/pricing');
    };

    const handleLogoClick = () => {
        if (step === 'processing') return;
        if (window.confirm('¿Estás seguro de salir? Perderás el progreso del checkout.')) {
            sessionStorage.removeItem('selectedPlan');
            navigate('/');
        }
    };

    if (step === 'processing') {
        return (
            <div className="min-h-screen bg-gray-50">
                <MinimalHeader />
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <div className="text-center max-w-md">
                        <div className="relative mb-8">
                            <div className="w-24 h-24 mx-auto">
                                <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-30"></div>
                                <div className="relative w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                                    <CheckCircleIcon className="w-12 h-12 text-white" />
                                </div>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Procesando tu pago...
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Estamos activando tu plan Pro. Esto solo tomará unos segundos.
                        </p>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <MinimalHeader />

            <div className="max-w-2xl mx-auto px-4 py-12">
                {/* Header */}
                <button
                    onClick={handleGoBack}
                    className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6 transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-1" />
                    Volver
                </button>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Confirmar compra
                </h1>
                <p className="text-gray-600 mb-8">
                    Revisa los detalles de tu suscripción antes de confirmar.
                </p>

                {/* Plan Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <SparklesIcon className="w-5 h-5" />
                                    <span className="text-sm font-medium opacity-90">Plan seleccionado</span>
                                </div>
                                <h2 className="text-2xl font-bold">Evalen Pro</h2>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold">$19.990</div>
                                <div className="text-sm opacity-80">CLP/mes</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Incluye:</h3>
                        <ul className="space-y-3">
                            {[
                                'Campañas ilimitadas',
                                'CVs ilimitados',
                                'Smart Match avanzado',
                                'Exportación de reportes',
                                'Soporte prioritario'
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center text-gray-600">
                                    <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Price Summary */}
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Evalen Pro (mensual)</span>
                        <span className="font-medium">$19.990 CLP</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Impuestos</span>
                        <span className="font-medium text-green-600">Incluidos</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                        <span className="font-semibold text-gray-900">Total</span>
                        <span className="font-bold text-xl text-indigo-600">$19.990 CLP/mes</span>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 border border-red-100 mb-6">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Confirm Button */}
                <button
                    onClick={handleConfirmPurchase}
                    className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
                >
                    Confirmar y pagar $19.990 CLP/mes
                </button>

                <p className="text-center text-sm text-gray-500 mt-4">
                    Al confirmar, aceptas nuestros términos y condiciones.
                    <br />
                    Puedes cancelar en cualquier momento.
                </p>
            </div>
        </div>
    );
};

const MinimalHeader: React.FC = () => (
    <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <button 
                onClick={() => {
                    if (window.confirm('¿Estás seguro de salir? Perderás el progreso del checkout.')) {
                        sessionStorage.removeItem('selectedPlan');
                        window.location.href = '/';
                    }
                }}
                className="flex items-center gap-2"
            >
                <svg width="140" height="40" viewBox="0 0 180 48" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="evalen-gradient-checkout" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#4F6BF6' }} />
                            <stop offset="100%" style={{ stopColor: '#8B5CF6' }} />
                        </linearGradient>
                    </defs>
                    <path d="M0 8 L0 40 L24 40 L24 35 L6 35 L6 26 L20 26 L20 21 L6 21 L6 13 L24 13 L24 8 Z" fill="url(#evalen-gradient-checkout)" />
                    <path d="M18 8 L24 8 L6 40 L0 40 Z" fill="#0f172a" />
                    <text x="30" y="34" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="28" fontWeight="700" fill="#0f172a" letterSpacing="-1">valen</text>
                </svg>
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="hidden sm:inline">Checkout seguro</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            </div>
        </div>
    </header>
);

export default CheckoutPage;
