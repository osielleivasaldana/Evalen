import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import Navbar from '../layout/NavBar';
import { CheckCircleIcon, CreditCardIcon, CalendarIcon, SparklesIcon, UserGroupIcon, DocumentMagnifyingGlassIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface BillingData {
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'free';
  planId: string;
  planName: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: { brand: string; last4: string };
  trial: { isActive: boolean; daysLeft: number };
  benefits: { cvLimit: number; campaignLimit: number; cvUsed: number; activeCampaigns: number };
}

const BillingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profile, billing] = await Promise.all([
          apiService.getProfile(),
          apiService.getBillingStatus()
        ]);
        setUserName(profile.name.split(' ')[0]);
        setBillingData(billing);
      } catch (error) {
        console.error('Error loading billing data', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getStatusBadge = () => {
    if (!billingData) return null;
    
    if (billingData.trial.isActive) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
          <SparklesIcon className="w-4 h-4 mr-1" />
          Prueba Activa
        </span>
      );
    }
    
    if (billingData.status === 'active') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="w-4 h-4 mr-1" />
          Plan Activo
        </span>
      );
    }

    return null;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleChangePlan = async () => {
    if (!billingData) return;

    if (billingData.planId === 'free') {
      window.location.href = '/pricing';
      return;
    }

    const confirmReset = window.confirm(
      '¿Deseas restablecer tu cuenta al Plan Gratis de forma instantánea para realizar pruebas?'
    );

    if (confirmReset) {
      setLoading(true);
      try {
        await apiService.resetToFree();
        const profile = await apiService.getProfile(); // refreshes local session
        const billing = await apiService.getBillingStatus();
        setBillingData(billing);
        alert('Tu plan ha sido restablecido a Gratis exitosamente.');
      } catch (error) {
        console.error('Error resetting to free plan', error);
        alert('Error al restablecer el plan. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!billingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <p className="text-gray-500">Error cargando información de facturación</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {billingData.trial.isActive 
              ? `¡Te damos la bienvenida a tu prueba de Evalen Pro, ${userName}!`
              : `¡Disfrutando tu Plan Pro, ${userName}!`
            }
          </h1>
          <p className="mt-2 text-gray-600">
            {billingData.trial.isActive
              ? `Tienes ${billingData.trial.daysLeft} días restantes para decidir.`
              : 'Gestiona tu suscripción y conoce todos los beneficios de tu plan.'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Benefits Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trial Banner */}
            {billingData.trial.isActive && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">¡Tu prueba está activa!</h3>
                    <p className="mt-1 opacity-90">
                      Te quedan <span className="font-bold text-2xl">{billingData.trial.daysLeft}</span> días para disfrutar de Evalen Pro sin costo.
                    </p>
                  </div>
                  <button
                    onClick={() => window.location.href = '/pricing'}
                    className="bg-white text-amber-600 px-6 py-3 rounded-xl font-bold hover:bg-amber-50 transition-colors"
                  >
                    Activar Plan Pro
                  </button>
                </div>
              </div>
            )}

            {/* Benefits Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Beneficios de tu Plan Pro</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <DocumentMagnifyingGlassIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">Búsqueda Avanzada de CVs</h3>
                    <p className="mt-1 text-sm text-gray-500">Encuentra candidatos con IA avanzada</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <SparklesIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">Matching Automatizado AI</h3>
                    <p className="mt-1 text-sm text-gray-500">Análisis semántico de candidatos</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <UserGroupIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">Campañas Ilimitadas</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {billingData.benefits.activeCampaigns}/{billingData.benefits.campaignLimit === 999 ? '∞' : billingData.benefits.campaignLimit} activas
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <ChartBarIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">Informes de Rendimiento</h3>
                    <p className="mt-1 text-sm text-gray-500">Métricas detalladas de reclutamiento</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Uso Actual</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Campañas Activas</span>
                    <span className="font-medium text-gray-900">
                      {billingData.benefits.activeCampaigns} / {billingData.benefits.campaignLimit === 999 ? '∞' : billingData.benefits.campaignLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{ width: `${Math.min((billingData.benefits.activeCampaigns / Math.max(billingData.benefits.campaignLimit, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">CVs Analizados</span>
                    <span className="font-medium text-gray-900">
                      {billingData.benefits.cvUsed} / {billingData.benefits.cvLimit === 999 ? '∞' : billingData.benefits.cvLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{ width: `${Math.min((billingData.benefits.cvUsed / Math.max(billingData.benefits.cvLimit, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Management */}
          <div className="space-y-6">
            {/* Plan Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Tu Plan</h2>
                {getStatusBadge()}
              </div>
              
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {billingData.planName}
              </div>
              
              {billingData.currentPeriodEnd && (
                <div className="flex items-center text-gray-500 text-sm mt-2">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {billingData.trial.isActive ? 'Prueba termina' : 'Próxima renovación'}: {formatDate(billingData.currentPeriodEnd)}
                </div>
              )}
            </div>

            {/* Payment Method (Placeholder) */}
            {billingData.paymentMethod && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Método de Pago</h2>
                
                <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                  <CreditCardIcon className="w-8 h-8 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{billingData.paymentMethod.brand}</p>
                    <p className="text-sm text-gray-500">•••• {billingData.paymentMethod.last4}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones</h2>
              
              <div className="space-y-3">
                <button
                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  Ir al Dashboard
                </button>
                
                <button
                  className="w-full px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  onClick={handleChangePlan}
                >
                  Cambiar Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
