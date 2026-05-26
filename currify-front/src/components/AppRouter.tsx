import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

// Auth Components
import ActivateAccount from './auth/ActivateAccount';
import AuthCallback from './auth/AuthCallback';
import EvalenAuth from './auth/EvalenAuth';
import OnboardingWizard from './onboarding/OnboardingWizard';
import PricingPage from './pricing/PricingPage';

// Dashboard Components
import Dashboard from './dashboard/Dashboard';
import CreateCampaign from './campaigns/CreateCampaign';
import EditCampaign from './campaigns/EditCampaign';
import CandidatesManagerNew from './candidates/CandidatesManagerNew';
import CandidateDetail from './candidates/CandidateDetail';
import CandidateProcessPanel from './processes/CandidateProcessPanel';

// Admin Components
import UserManagement from './admin/UserManagement';
import OwnerDashboard from './admin/OwnerDashboard';

// Billing Components
import BillingPage from './billing/BillingPage';

// Checkout Components
import CheckoutPage from './checkout/CheckoutPage';

// Layout Components
import Navbar from './layout/NavBar';

// Landing Components
import LandingPage from '../landing/LandingPage';
import ErrorBoundary from './common/ErrorBoundary';

// UI Demo (Playground/Showcase)
import UIDemo from './uidemo/UIDemo';

// Public Components
import PublicCampaign from './public/PublicCampaign';

// Legacy Components (for backward compatibility)
import FileUpload from './FileUpload';
import CVResults from './CVResults';

const PublicCampaignWrapper: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  if (!publicId) {
    return <div>ID de campaña no válido</div>;
  }
  return <PublicCampaign publicId={publicId} />;
};

const AppRouter: React.FC = () => {
  const { isAuthenticated, user, loading, logout, checkAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const LandingPageWrapper: React.FC = () => {
    if (isAuthenticated) {
      if (user?.role === 'OWNER') {
        return <Navigate to="/owner/dashboard" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
    return <LandingPage />;
  };

  const ProtectedRoute: React.FC<{ children: React.ReactNode; requiresOnboarding?: boolean }> = ({ children, requiresOnboarding = true }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (requiresOnboarding && user?.onboardingCompleted === false && user?.role !== 'OWNER') {
      return <Navigate to="/onboarding" replace />;
    }

    return <>{children}</>;
  };

  const PricingPageWrapper: React.FC = () => {
    const [redirectTo, setRedirectTo] = useState<string | null>(null);
    const [checkingPlan, setCheckingPlan] = useState(true);

    useEffect(() => {
      const checkPlanAndRedirect = async () => {
        try {
          const billing = await apiService.getBillingStatus();
          if (billing.status !== 'free' && billing.planId !== 'free') {
            setRedirectTo('/billing');
            return;
          }
        } catch (error) {
          console.log('Error checking plan, staying on pricing page');
        } finally {
          setCheckingPlan(false);
        }
      };

      if (isAuthenticated) {
        checkPlanAndRedirect();
      } else {
        setCheckingPlan(false);
      }
    }, [isAuthenticated]);

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

    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    return <PricingPage />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 font-sans relative overflow-hidden select-none">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        
        <div className="z-10 flex flex-col items-center gap-6">
          {/* Logo or beautiful spinner */}
          <div className="relative flex items-center justify-center">
            {/* Spinning gradient ring */}
            <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-indigo-500 border-solid animate-spin"></div>
            {/* Pulsing center dot */}
            <div className="absolute w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping"></div>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Cargando Evalen
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide animate-pulse">
              Preparando tu espacio de trabajo...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
        {/* Landing Page - Public (moved from /home) */}
        <Route path="/" element={
          <ErrorBoundary>
            <LandingPageWrapper />
          </ErrorBoundary>
        } />
        
        {/* Public Routes */}
        <Route
          path="/apply/:publicId"
          element={<PublicCampaignWrapper />}
        />
        <Route
          path="/activate-account/:token"
          element={<ActivateAccount />}
        />

        {/* UI Demo / Playground (Public) */}
        <Route path="/ui-demo" element={<UIDemo />} />

        {/* Auth Routes - Public */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/login" element={
          <EvalenAuth />
        } />
        {/* /register deprecated → redirect to login with enterprise plan */}
        <Route path="/register" element={<Navigate to="/login?plan=enterprise" replace />} />
        <Route path="/pricing" element={<PricingPageWrapper />} />

        {/* Protected Routes */}
        {isAuthenticated ? (
          <>
            <Route
              path="/onboarding"
              element={<OnboardingWizard />}
            />
            <Route
              path="/dashboard"
              element={
                user?.role === 'OWNER' ? (
                  <Navigate to="/owner/dashboard" replace />
                ) : (
                  <ProtectedRoute>
                    <Dashboard
                      onNavigateToCampaign={(campaignId) => navigate(`/campaigns/${campaignId}`)}
                      onCreateCampaign={() => navigate('/create-campaign')}
                      onEditCampaign={(campaignId) => navigate(`/edit-campaign/${campaignId}`)}
                      onLogout={handleLogout}
                    />
                  </ProtectedRoute>
                )
              }
            />
            <Route
              path="/create-campaign"
              element={
                <ProtectedRoute>
                  <CreateCampaign
                    onCampaignCreated={(campaign) => {
                      // Campaign created successfully, the component handles the success state
                    }}
                    onCancel={() => navigate('/dashboard')}
                    onGoToDashboard={() => navigate('/dashboard')}
                    onManageCandidates={(campaignId) => navigate(`/campaigns/${campaignId}`)}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-campaign/:campaignId"
              element={
                <ProtectedRoute>
                  <EditCampaignWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:campaignId"
              element={
                <ProtectedRoute>
                  <CampaignDetailsWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:campaignId/candidate/:candidateId"
              element={
                <ProtectedRoute>
                  <CandidateDetailWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:campaignId/candidates/:candidateId/process"
              element={
                <ProtectedRoute>
                  <CandidateProcessPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/dashboard"
              element={
                <ProtectedRoute requiresOnboarding={false}>
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <ProtectedRoute requiresOnboarding={false}>
                  <BillingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute requiresOnboarding={false}>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
          </>
        ) : (
          <>
            {/* Redirect to landing for all other routes when not authenticated */}
          </>
        )}

        {/* Catch all route */}
        <Route
          path="*"
          element={
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
              <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>
                Página no encontrada
              </h1>
              <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
                La página que buscas no existe.
              </p>
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                {isAuthenticated ? 'Ir al Dashboard' : 'Ir al Login'}
              </button>
            </div>
          }
        />
      </Routes>
  );
};

const CampaignDetailsWrapper: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  if (!campaignId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <CandidatesManagerNew
      campaignId={campaignId}
      onBack={() => navigate('/dashboard')}
      onViewCandidate={(candidateId) => navigate(`/campaigns/${campaignId}/candidate/${candidateId}`)}
    />
  );
};

const EditCampaignWrapper: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  if (!campaignId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <EditCampaign
      campaignId={campaignId}
      onCampaignUpdated={() => navigate('/dashboard')}
      onCancel={() => navigate('/dashboard')}
      onGoToDashboard={() => navigate('/dashboard')}
    />
  );
};

const CandidateDetailWrapper: React.FC = () => {
  const { campaignId, candidateId } = useParams<{ campaignId: string; candidateId: string }>();
  const navigate = useNavigate();

  if (!campaignId || !candidateId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <CandidateDetail
      candidateId={candidateId}
      onBack={() => navigate(`/campaigns/${campaignId}`)}
    />
  );
};

// Legacy App Component for backward compatibility
const LegacyApp: React.FC = () => {
  const [appState, setAppState] = useState<'login' | 'upload' | 'results'>('login');
  const [token, setToken] = useState<string | null>(null);
  const [cvData, setCvData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);


  const handleProcessingComplete = (data: any) => {
    setCvData(data);
    setAppState('results');
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleReset = () => {
    setCvData(null);
    setError(null);
    setAppState('upload');
  };

  const handleLogout = () => {
    setToken(null);
    setCvData(null);
    setError(null);
    setAppState('login');
  };

  return (
    <div className="App">
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '20px 0'
      }}>
        <header style={{
          textAlign: 'center',
          marginBottom: '20px',
          padding: '20px 0',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            color: '#333',
            fontSize: '2.5rem',
            margin: '0',
            fontWeight: 'bold'
          }}>
            🔍 Evalen Legacy
          </h1>
          <p style={{
            color: '#666',
            fontSize: '1.1rem',
            margin: '10px 0 0 0'
          }}>
            Extractor y Analizador de Currículums Vitae (Modo Legacy)
          </p>

          {token && (
            <button
              onClick={handleLogout}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cerrar Sesión
            </button>
          )}

          <div style={{ marginTop: '15px' }}>
            <button
              onClick={() => window.location.href = '/dashboard'}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🚀 Ir a la Nueva Plataforma
            </button>
          </div>
        </header>

        {error && (
          <div style={{
            maxWidth: '600px',
            margin: '0 auto 20px auto',
            padding: '15px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px'
          }}>
            ❌ {error}
          </div>
        )}

        {appState === 'upload' && (
          <FileUpload
            onProcessingComplete={handleProcessingComplete}
            onError={handleError}
          />
        )}

        {appState === 'results' && cvData && (
          <CVResults
            data={cvData}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

export default AppRouter;