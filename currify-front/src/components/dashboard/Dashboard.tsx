import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CandidateDrawer from '../candidates/CandidateDrawer';
import { Menu, Transition } from '@headlessui/react';
import {
  BriefcaseIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  UserPlusIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  EyeIcon,
  ShareIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  StarIcon,
  SparklesIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import Layout from '../layout/Layout';
import DashboardActivation from './DashboardActivation';
import DashboardUploadModal from './DashboardUploadModal';
import CampaignCard from '../campaigns/shared/CampaignCard';
import { StatCard } from '../ui/stat-card';
import { GlassCard } from '../ui/glass-card';
import { AuroraBackground } from '../ui/aurora-background';
import { GradientHeader } from '../ui/gradient-header';
import { ScoreCircle } from '../ui/score-circle';
import { cn } from '../../lib/utils';
import { apiService, Campaign, CampaignStats, UserProfile, Candidate as ApiCandidate } from '../../services/api';

interface DashboardProps {
  onNavigateToCampaign: (campaignId: string) => void;
  onCreateCampaign: () => void;
  onEditCampaign: (campaignId: string) => void;
  onLogout: () => void;
}

interface CandidateWithCampaign extends ApiCandidate {
  campaignTitle?: string;
  campaignPosition?: string;
  skills?: string[];
  location?: string;
  role?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToCampaign,
  onCreateCampaign,
  onEditCampaign,
  onLogout
}) => {
  useEffect(() => {
    // Check for success payment flag
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout_success') === 'true') {
      alert('¡Felicidades! Tu cuenta ha sido mejorada a PRO 🚀\nDisfruta de campañas y créditos ilimitados.');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Force reload to update UserContext/NavBar
      window.location.reload();
    }
  }, []);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithCampaign | null>(null);
  const [candidates, setCandidates] = useState<CandidateWithCampaign[]>([]);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [pauseConfirmModal, setPauseConfirmModal] = useState<{ isOpen: boolean; campaignId: string; campaignTitle: string }>({
    isOpen: false,
    campaignId: '',
    campaignTitle: ''
  });
  const [showStartProcessModal, setShowStartProcessModal] = useState(false);
  const [startingProcess, setStartingProcess] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Card width + gap
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleStartProcess = (candidate: CandidateWithCampaign) => {
    setSelectedCandidate(candidate);
    setShowStartProcessModal(true);
  };

  const executeStartProcess = async () => {
    if (!selectedCandidate || !selectedCandidate.campaignId) return;

    try {
      setStartingProcess(true);
      await apiService.startProcess({
        campaignId: selectedCandidate.campaignId,
        candidateId: selectedCandidate.id,
        notifyCandidate: false
      });
      await apiService.updateCandidateStatus(selectedCandidate.id, 'IN_PROCESS');

      setSnackbarMessage(`Proceso iniciado para ${selectedCandidate.name}`);
      setShowStartProcessModal(false);

      // Navigate to process view immediately
      navigate(`/campaigns/${selectedCandidate.campaignId}/candidates/${selectedCandidate.id}/process`);

      // Clear selection so when user comes back, the drawer is closed
      setSelectedCandidate(null);

      // Refresh data in background to update list (remove candidate from Top Talent)
      loadDashboardData();

    } catch (err: any) {
      setError(err.message || 'Error al iniciar proceso');
    } finally {
      setStartingProcess(false);
    }
  };

  const handleDismissCandidate = async (candidate: ApiCandidate) => {
    try {
      await apiService.updateCandidateStatus(candidate.id, 'NOT_SELECTED');
      setSnackbarMessage('Candidato descartado');
      await loadDashboardData();
      setSelectedCandidate(null);
    } catch (err: any) {
      setError(err.message || 'Error al descartar candidato');
    }
  };

  const handleViewAIAnalysis = (candidate: CandidateWithCampaign) => {
    if (candidate.campaignId) {
      navigate(`/campaigns/${candidate.campaignId}/candidate/${candidate.id}`);
    }
  };

  const handleCandidateClick = async (candidate: CandidateWithCampaign) => {
    // 1. Set optimistic candidate (basic info)
    setSelectedCandidate(candidate);

    // 2. Fetch Full Details (Phone, AI Insight, etc.) in background
    if (candidate.campaignId) {
      try {
        console.log("Fetching full candidate details for:", candidate.id);
        // Use generic getCandidate which maps to /candidates/:id (confirmed to exist)
        const fullCandidate = await apiService.getCandidate(candidate.id);
        console.log("Full candidate received:", fullCandidate);

        // Merge full details, keeping campaign info that might be missing in full object
        setSelectedCandidate(prev => {
          if (prev?.id !== candidate.id) return prev;

          const merged = {
            ...fullCandidate,
            campaignTitle: candidate.campaignTitle,
            campaignId: candidate.campaignId,
            // Explicitly map nested data if root is missing (Robustness)
            phone: fullCandidate.phone || fullCandidate.structuredData?.datos_cv?.datos_contacto?.telefono || '',
            email: fullCandidate.email || fullCandidate.structuredData?.datos_cv?.datos_contacto?.email || '',
            // Ensure scoring is passed
            scoring: fullCandidate.scoring || candidate.scoring
          };
          console.log("Merged candidate for drawer:", merged);
          return merged;
        });
      } catch (err) {
        console.error("Error loading full candidate details", err);
      }
    }
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [userProfile, campaignsList] = await Promise.all([
        apiService.getProfile(),
        apiService.getCampaigns()
      ]);

      setUser(userProfile);
      setCampaigns(campaignsList);

      // Calculate stats from campaigns
      const activeCampaigns = campaignsList.filter(c => c.status === 'ACTIVE').length;
      const totalCandidates = campaignsList.reduce((sum, c) => sum + (c._count?.candidates || 0), 0);

      setStats({
        totalCampaigns: campaignsList.length,
        activeCampaigns,
        totalCandidates,
        recentApplications: 0 // Will be calculated from recent candidates
      });

      // Cargar Top Talent (Joyas)
      const allCandidates: CandidateWithCampaign[] = [];
      const topCandidatesList: CandidateWithCampaign[] = [];

      for (const campaign of campaignsList) { // Scan ALL campaigns for talent
        try {
          const campaignCandidates = await apiService.getCandidates(campaign.id, {
            sortBy: 'createdAt',
            sortOrder: 'desc'
          });

          const candidatesWithCampaign = campaignCandidates.map(c => ({
            ...c,
            campaignTitle: campaign.title,
            campaignId: campaign.id,
            role: c.structuredData?.datos_cv?.titular_profesional?.titular ||
              c.structuredData?.datos_cv?.experiencia_laboral?.[0]?.cargo ||
              'Candidato'
          }));

          // Filter for Top Matches (>60%) and STRICTLY NEW status (Gold Rule: Action = Disappearance)
          const topMatches = candidatesWithCampaign.filter(c =>
            (c.scoring?.overallScore || 0) >= 60 &&
            c.candidateStatus === 'NEW'
          );

          topCandidatesList.push(...topMatches);
          allCandidates.push(...candidatesWithCampaign); // Still keep for stats

        } catch (err) {
          console.error(`Error loading candidates for campaign ${campaign.id}:`, err);
        }
      }

      // Sort global top talent by score
      const sortedTopTalent = topCandidatesList
        .sort((a, b) => (b.scoring?.overallScore || 0) - (a.scoring?.overallScore || 0))
        .sort((a, b) => (b.scoring?.overallScore || 0) - (a.scoring?.overallScore || 0))
        .slice(0, 15); // Keep top 15

      setCandidates(sortedTopTalent);

      // Update recent applications count (for stats)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentCount = allCandidates.filter(c => new Date(c.createdAt) > oneWeekAgo).length;

      setStats(prev => prev ? { ...prev, recentApplications: recentCount } : null);

    } catch (err: any) {
      setError(err.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleToggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    // Si la campaña está activa y se va a pausar, mostrar modal de confirmación
    if (currentStatus === 'ACTIVE') {
      const campaign = campaigns.find(c => c.id === campaignId);
      setPauseConfirmModal({
        isOpen: true,
        campaignId,
        campaignTitle: campaign?.title || ''
      });
      return;
    }

    // Si se está reactivando (de PAUSED a ACTIVE), hacerlo directamente
    try {
      const newStatus = 'ACTIVE';
      await apiService.updateCampaign(campaignId, { status: newStatus });
      await loadDashboardData();
      setSnackbarMessage('Campaña activada correctamente');
      setTimeout(() => setSnackbarMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el estado de la campaña');
    }
  };

  const confirmPauseCampaign = async () => {
    try {
      await apiService.updateCampaign(pauseConfirmModal.campaignId, { status: 'PAUSED' });
      await loadDashboardData();
      setPauseConfirmModal({ isOpen: false, campaignId: '', campaignTitle: '' });
      setSnackbarMessage('Campaña pausada correctamente');
      setTimeout(() => setSnackbarMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al pausar la campaña');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    if (campaign._count && campaign._count.candidates > 0) {
      setError('No se puede eliminar una campaña con candidatos activos');
      return;
    }

    if (window.confirm(`¿Eliminar "${campaign.title}"? Esta acción no se puede deshacer.`)) {
      try {
        await apiService.deleteCampaign(campaignId);
        await loadDashboardData();
        setSnackbarMessage('Campaña eliminada correctamente');
        setTimeout(() => setSnackbarMessage(''), 3000);
      } catch (err: any) {
        setError(err.message || 'Error al eliminar la campaña');
      }
    }
  };

  const handleCopyLink = (publicId: string) => {
    const link = `${window.location.origin}/apply/${publicId}`;
    navigator.clipboard.writeText(link);
    setSnackbarMessage('¡Enlace copiado al portapapeles!');
    setTimeout(() => setSnackbarMessage(''), 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'PAUSED': return 'bg-red-100 text-red-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Activa';
      case 'DRAFT': return 'Borrador';
      case 'PAUSED': return 'Pausada';
      case 'CLOSED': return 'Cerrada';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAIInsight = (candidate: CandidateWithCampaign) => {
    if (candidate.scoring?.summary) return candidate.scoring.summary;

    const rec = candidate.scoring?.recommendation;
    if (!rec) return "Pendiente de análisis detallado.";

    // Map slugs to text
    const map: Record<string, string> = {
      'weak_fit': 'Presenta una compatibilidad baja con los requisitos del puesto.',
      'moderate_fit': 'Candidato con coincidencia parcial, se recomienda revisión.',
      'strong_fit': 'Perfil altamente compatible con las expectativas.',
      'reject': 'No cumple con los requisitos mínimos.'
    };

    return map[rec] || rec;
  };

  if (loading) {
    return (
      <Layout showNavBar={true} showFooter={true}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <p className="text-lg text-gray-600">Cargando dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNavBar={true} showFooter={true}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-4xl font-extrabold mb-1 tracking-tight text-gray-900">
                ¡Hola, {user?.name}! 👋
              </h1>
              <p className="text-lg text-gray-600">
                Aquí está el resumen de tu actividad de reclutamiento
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <XCircleIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            gradient="stat-1"
            icon={<BriefcaseIcon className="w-7 h-7" />}
            value={stats?.totalCampaigns || 0}
            label="Total Campañas"
          />
          <StatCard
            gradient="stat-2"
            icon={<ArrowTrendingUpIcon className="w-7 h-7" />}
            value={stats?.activeCampaigns || 0}
            label="Campañas Activas"
          />
          <StatCard
            gradient="stat-3"
            icon={<UserGroupIcon className="w-7 h-7" />}
            value={stats?.totalCandidates || 0}
            label="Total Candidatos"
          />
          <StatCard
            gradient="stat-4"
            icon={<UserPlusIcon className="w-7 h-7" />}
            value={stats?.recentApplications || 0}
            label="Nuevos esta semana"
          />
        </div>

        {/* Campaigns Section */}
        <div id="campaigns-section" className="bg-white rounded-2xl border border-gray-200 mb-8">
          <GradientHeader>
            <div>
              <h2 className="text-2xl font-bold mb-1">Mis Campañas</h2>
              <p className="text-sm opacity-90">
                {campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''} · Gestiona tu reclutamiento
              </p>
            </div>
            {/* Only ADMIN and RECRUITER can create campaigns */}
            {user && (user.role === 'ADMIN' || user.role === 'RECRUITER') && (
              <button
                onClick={onCreateCampaign}
                className="hidden sm:flex items-center gap-2 bg-white text-indigo-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-100 transition-all hover:-translate-y-0.5 shadow-lg"
              >
                <PlusIcon className="w-5 h-5" />
                Nueva Campaña
              </button>
            )}
          </GradientHeader>

          {campaigns.length === 0 ? (
            <div className="rounded-b-2xl overflow-hidden">
              <DashboardActivation
                user={user!}
                onCreateManual={onCreateCampaign}
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  id={campaign.id}
                  publicId={campaign.publicId}
                  title={campaign.title}
                  description={campaign.description}
                  status={campaign.status}
                  candidatesCount={campaign._count?.candidates || 0}
                  createdAt={campaign.createdAt}
                  onEdit={onEditCampaign}
                  onDelete={handleDeleteCampaign}
                  onCopyLink={handleCopyLink}
                  onToggleStatus={handleToggleCampaignStatus}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top Talent Discovery Section - Only visible if there are campaigns */}
        <div className="grid gap-6 grid-cols-1">
          {campaigns.length > 0 && (
            <AuroraBackground variant="talent">
              <div className="p-8 border-b border-indigo-50 relative z-10 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                    <SparklesIcon className="w-8 h-8 text-indigo-600 animate-pulse-slow" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                      TALENTOS DESTACADOS
                    </span>
                  </h2>
                  <p className="text-slate-500 mt-1 font-medium">
                    El escenario donde brillan tus mejores candidatos.
                  </p>
                </div>
                <div className="hidden sm:flex gap-2">
                  <span className="px-3 py-1 bg-white/60 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100 shadow-sm backdrop-blur-sm">
                    Match &gt; 60%
                  </span>
                  <span className="px-3 py-1 bg-white/60 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100 shadow-sm backdrop-blur-sm">
                    No descartados
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <button
                    onClick={() => scroll('left')}
                    className="p-2 rounded-full border border-indigo-100 bg-white/50 hover:bg-white text-indigo-600 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => scroll('right')}
                    className="p-2 rounded-full border border-indigo-100 bg-white/50 hover:bg-white text-indigo-600 hover:shadow-md transition-all"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {candidates.length === 0 ? (
                <div className="py-20 px-8 text-center relative z-10 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 animate-float">
                    <StarIconSolid className="w-12 h-12 text-white drop-shadow-md" />
                  </div>

                  <h3 className="text-slate-900 text-2xl font-bold mb-3">
                    Aquí brillarán tus próximas estrellas ✨
                  </h3>

                  <p className="text-slate-600 max-w-lg mx-auto mb-8 text-lg leading-relaxed">
                    La IA está rastreando tus campañas en busca de talento excepcional.
                    <br />
                    Sube más CVs y, cuando encontremos un <strong>Match &gt; 60%</strong>, lo destacaremos inmediatamente en este podio.
                  </p>

                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="group flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 font-bold transition-all shadow-sm hover:shadow-md"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5 group-hover:animate-bounce" />
                    Subir CV a Campaña Activa
                  </button>
                </div>
              ) : (
                <div
                  ref={scrollContainerRef}
                  className="p-8 relative z-10 overflow-x-auto pb-8 flex gap-6 snap-x snap-mandatory scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {candidates.map((candidate) => (
                    <GlassCard
                      key={candidate.id}
                      variant="candidate"
                      className={cn(
                        "group relative w-[280px] flex-shrink-0 p-5 cursor-pointer snap-center",
                        "hover:bg-white hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1",
                        "transition-all duration-300",
                        selectedCandidate?.id === candidate.id && 'ring-2 ring-indigo-500 bg-white scale-105 shadow-xl'
                      )}
                      onClick={() => handleCandidateClick(candidate)}
                    >
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                      {/* Context Badge (Top) */}
                      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-indigo-100/90 backdrop-blur-sm border border-indigo-200 rounded-full px-3 py-0.5 z-20 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <p className="text-[10px] font-bold text-indigo-800 truncate max-w-[180px]">
                          Postula a: {candidate.campaignTitle}
                        </p>
                      </div>

                      {/* Score Circle */}
                      <div className="absolute top-4 right-4 animate-float">
                        <ScoreCircle score={candidate.scoring?.overallScore || 0} size="md" />
                      </div>

                      {/* Avatar & Info */}
                      <div className="flex flex-col items-center text-center mt-6 mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 p-1 mb-3 shadow-md group-hover:shadow-indigo-200 transition-shadow">
                          <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xl font-bold text-indigo-600">
                            {getInitials(candidate.name)}
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 truncate w-full px-2" title={candidate.name}>
                          {candidate.name}
                        </h3>
                        {/* Clean Role Display */}
                        <div className="flex items-center justify-center gap-1.5 mt-1 text-slate-500 text-xs font-medium w-full px-4">
                          {candidate.role ? (
                            <span className="truncate" title={candidate.role}>{candidate.role}</span>
                          ) : (
                            <span className="italic">Candidato</span>
                          )}
                        </div>
                      </div>

                      {/* Quick Insight (AI) instead of Quote Box */}
                      <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-slate-600 text-center border border-slate-100 min-h-[64px] flex items-center justify-center group-hover:bg-white group-hover:border-indigo-100 transition-colors">
                        <p className="line-clamp-3 leading-relaxed">
                          {getAIInsight(candidate)}
                        </p>
                      </div>

                      {/* Action */}
                      <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                        <EyeIcon className="w-4 h-4" />
                        Ver Perfil Completo
                      </button>
                    </GlassCard>
                  ))}
                </div>
              )}
            </AuroraBackground>
          )}   {/* Candidate Details (Sticky Preview) - HIDDEN/REMOVED */}
          {selectedCandidate && false && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-4 h-fit shadow-xl animate-fade-in-right">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vista Rápida</h3>
                <button onClick={() => setSelectedCandidate(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 mx-auto mb-4">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-3xl font-bold text-indigo-700">
                    {getInitials(selectedCandidate!.name)}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{selectedCandidate!.name}</h3>
                {/* Campaign Context in Header */}
                <p className="text-sm text-indigo-600 font-medium mt-1">
                  Campaña: {selectedCandidate!.campaignTitle}
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <StarIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Match Score</p>
                    <p className="text-2xl font-black text-indigo-600">{Math.round(selectedCandidate!.scoring?.overallScore || 0)}%</p>
                  </div>
                </div>

                {/* AI Insight in Side Panel */}
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <SparklesIcon className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-800 uppercase">Análisis IA</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    "{getAIInsight(selectedCandidate!)}"
                  </p>
                </div>

                <div className="flex items-center gap-3 text-sm border-t border-gray-100 pt-4">
                  <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                  <a href={`mailto:${selectedCandidate!.email}`} className="text-gray-700 hover:text-indigo-600 truncate">
                    {selectedCandidate!.email}
                  </a>
                </div>
              </div>

              {selectedCandidate!.documentId && (
                <button
                  onClick={() => onNavigateToCampaign(selectedCandidate!.campaignId)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold shadow-lg shadow-slate-200 transition-all hover:scale-[1.02]"
                >
                  <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                  Gestionar Candidato
                </button>
              )}
            </div>
          )}
        </div>

        {/* Snackbar */}
        {snackbarMessage && (
          <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-up flex items-center gap-2">
            <CheckCircleSolid className="w-5 h-5 text-green-400" />
            {snackbarMessage}
          </div>
        )}

        {/* Upload Modal */}
        <DashboardUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          campaigns={campaigns.filter(c => c.status === 'ACTIVE')}
          onUploadSuccess={() => {
            loadDashboardData();
            setSnackbarMessage('✅ Candidatos subidos exitosamente. Analizando...');
            setTimeout(() => setSnackbarMessage(''), 5000);
          }}
        />

        {/* Pause Campaign Confirmation Modal */}
        {pauseConfirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setPauseConfirmModal({ isOpen: false, campaignId: '', campaignTitle: '' })}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-modal max-w-md w-full mx-4 animate-fade-in-up">
              {/* Header */}
              <GradientHeader variant="warning" className="rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <PauseIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Pausar Campaña</h3>
                    <p className="text-sm text-yellow-100">Confirma esta acción</p>
                  </div>
                </div>
              </GradientHeader>

              {/* Body */}
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-gray-700 font-semibold mb-2">
                    ¿Estás seguro de que deseas pausar la campaña:
                  </p>
                  <p className="text-indigo-600 font-bold text-lg">
                    "{pauseConfirmModal.campaignTitle}"?
                  </p>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-yellow-900 mb-1">⚠️ Advertencia Importante</p>
                      <p className="text-sm text-yellow-800">
                        Si pausas esta campaña, <strong>ningún candidato podrá postular</strong> hasta que la reactives nuevamente.
                        El enlace público dejará de aceptar aplicaciones.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setPauseConfirmModal({ isOpen: false, campaignId: '', campaignTitle: '' })}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmPauseCampaign}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
                  >
                    Pausar Campaña
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start Process Confirmation Modal */}
        {showStartProcessModal && selectedCandidate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-fade-in-up">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                <PlayIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Iniciar Reclutamiento</h3>
              <p className="text-center text-slate-500 text-sm mb-6">
                Esto moverá a <strong>{selectedCandidate.name}</strong> a la etapa de "Screening" y notificará al equipo.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStartProcessModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeStartProcess}
                  disabled={startingProcess}
                  className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex justify-center items-center"
                >
                  {startingProcess ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile FAB */}
        <button
          onClick={onCreateCampaign}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors z-40"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>

      <CandidateDrawer
        isOpen={!!selectedCandidate}
        candidate={selectedCandidate}
        campaign={campaigns.find(c => c.id === selectedCandidate?.campaignId)}
        onClose={() => setSelectedCandidate(null)}
        onDismiss={handleDismissCandidate}
        onStartProcess={handleStartProcess}
        onViewAIAnalysis={handleViewAIAnalysis}
      />
    </Layout >
  );
};

export default Dashboard;
