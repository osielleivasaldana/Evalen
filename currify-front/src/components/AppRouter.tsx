import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { apiService } from '../services/api';

// Auth Components
import AuthContainer from './auth/AuthContainer';
import ActivateAccount from './auth/ActivateAccount';

// Dashboard Components
import Dashboard from './dashboard/Dashboard';
import CreateCampaign from './campaigns/CreateCampaign';
import EditCampaign from './campaigns/EditCampaign';
import CandidatesManagerNew from './candidates/CandidatesManagerNew';
import CandidateDetail from './candidates/CandidateDetail';
import CandidateProcessPanel from './processes/CandidateProcessPanel';

// Admin Components
import UserManagement from './admin/UserManagement';

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (apiService.isAuthenticated()) {
        // Verify token is still valid
        await apiService.getProfile();
        setIsAuthenticated(true);
      }
    } catch (error) {
      // Token is invalid, clear it
      apiService.clearToken();
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    apiService.clearToken();
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Cargando Evalen...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/apply/:publicId"
          element={<PublicCampaignWrapper />}
        />
        <Route
          path="/activate-account/:token"
          element={<ActivateAccount />}
        />

        {/* Legacy Routes (for backward compatibility) */}
        <Route
          path="/legacy"
          element={<LegacyApp />}
        />

        {/* Protected Routes */}
        {isAuthenticated ? (
          <>
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  onNavigateToCampaign={(campaignId) => window.location.href = `/campaigns/${campaignId}`}
                  onCreateCampaign={() => window.location.href = '/create-campaign'}
                  onEditCampaign={(campaignId) => window.location.href = `/edit-campaign/${campaignId}`}
                  onLogout={handleLogout}
                />
              }
            />
            <Route
              path="/create-campaign"
              element={
                <CreateCampaign
                  onCampaignCreated={(campaign) => {
                    // Campaign created successfully, the component handles the success state
                  }}
                  onCancel={() => window.location.href = '/dashboard'}
                  onGoToDashboard={() => window.location.href = '/dashboard'}
                  onManageCandidates={(campaignId) => window.location.href = `/campaigns/${campaignId}`}
                />
              }
            />
            <Route
              path="/edit-campaign/:campaignId"
              element={<EditCampaignWrapper />}
            />
            <Route
              path="/campaigns/:campaignId"
              element={<CampaignDetailsWrapper />}
            />
            <Route
              path="/campaigns/:campaignId/candidate/:candidateId"
              element={<CandidateDetailWrapper />}
            />
            <Route
              path="/campaigns/:campaignId/candidates/:candidateId/process"
              element={<CandidateProcessPanel />}
            />
            <Route
              path="/admin/users"
              element={<UserManagement />}
            />
            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />
          </>
        ) : (
          <>
            <Route
              path="/login"
              element={<AuthContainer onAuthSuccess={handleAuthSuccess} />}
            />
            <Route
              path="/"
              element={<Navigate to="/login" replace />}
            />
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
                onClick={() => window.location.href = isAuthenticated ? '/dashboard' : '/login'}
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
    </Router>
  );
};

const CampaignDetailsWrapper: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <CandidatesManagerNew
      campaignId={campaignId}
      onBack={() => window.location.href = '/dashboard'}
      onViewCandidate={(candidateId) => window.location.href = `/campaigns/${campaignId}/candidate/${candidateId}`}
    />
  );
};

const EditCampaignWrapper: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <EditCampaign
      campaignId={campaignId}
      onCampaignUpdated={() => window.location.href = '/dashboard'}
      onCancel={() => window.location.href = '/dashboard'}
      onGoToDashboard={() => window.location.href = '/dashboard'}
    />
  );
};

const CandidateDetailWrapper: React.FC = () => {
  const { campaignId, candidateId } = useParams<{ campaignId: string; candidateId: string }>();

  if (!campaignId || !candidateId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <CandidateDetail
      candidateId={candidateId}
      onBack={() => window.location.href = `/campaigns/${campaignId}`}
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