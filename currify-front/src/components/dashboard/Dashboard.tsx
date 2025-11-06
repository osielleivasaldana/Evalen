import React, { useState, useEffect, useCallback } from 'react';
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
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import Layout from '../layout/Layout';
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
}

const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToCampaign,
  onCreateCampaign,
  onEditCampaign,
  onLogout
}) => {
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

      // Cargar candidatos recientes
      const allCandidates: CandidateWithCampaign[] = [];
      for (const campaign of campaignsList.slice(0, 3)) {
        try {
          const campaignCandidates = await apiService.getCandidates(campaign.id, {
            sortBy: 'createdAt',
            sortOrder: 'desc'
          });
          const candidatesWithCampaign = campaignCandidates.slice(0, 2).map(c => ({
            ...c,
            campaignTitle: campaign.title,
          }));
          allCandidates.push(...candidatesWithCampaign);
        } catch (err) {
          console.error(`Error loading candidates for campaign ${campaign.id}:`, err);
        }
      }
      setCandidates(allCandidates.slice(0, 6));

      // Update recent applications count
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
              <h1 className="text-4xl font-extrabold mb-1 tracking-tight">
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
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <BriefcaseIcon className="w-7 h-7" />
              </div>
              <p className="text-3xl font-extrabold mb-1">{stats?.totalCampaigns || 0}</p>
              <p className="text-sm font-medium opacity-90">Total Campañas</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <ArrowTrendingUpIcon className="w-7 h-7" />
              </div>
              <p className="text-3xl font-extrabold mb-1">{stats?.activeCampaigns || 0}</p>
              <p className="text-sm font-medium opacity-90">Campañas Activas</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <UserGroupIcon className="w-7 h-7" />
              </div>
              <p className="text-3xl font-extrabold mb-1">{stats?.totalCandidates || 0}</p>
              <p className="text-sm font-medium opacity-90">Total Candidatos</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-400 to-yellow-400 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <UserPlusIcon className="w-7 h-7" />
              </div>
              <p className="text-3xl font-extrabold mb-1">{stats?.recentApplications || 0}</p>
              <p className="text-sm font-medium opacity-90">Nuevos esta semana</p>
            </div>
          </div>
        </div>

        {/* Campaigns Section */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex justify-between items-center">
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
          </div>

          {campaigns.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <BriefcaseIcon className="w-12 h-12 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                {user?.role === 'TECHNICAL_REVIEWER' ? 'No tienes campañas asignadas' : 'Aún no tienes campañas'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {user?.role === 'TECHNICAL_REVIEWER'
                  ? 'Espera a que te asignen como responsable en alguna campaña para verla aquí.'
                  : 'Comienza creando tu primera campaña de reclutamiento y empieza a recibir candidatos de manera automatizada.'}
              </p>
              {user && (user.role === 'ADMIN' || user.role === 'RECRUITER') && (
                <button
                  onClick={onCreateCampaign}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Crear mi primera campaña
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="p-6 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      campaign.status === 'ACTIVE' ? 'bg-green-100' : 'bg-gray-200'
                    }`}>
                      <BriefcaseIcon className={`w-7 h-7 ${
                        campaign.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-500'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3
                          onClick={() => onNavigateToCampaign(campaign.id)}
                          className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-indigo-600"
                        >
                          {campaign.title}
                        </h3>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          <CheckCircleSolid className="w-3 h-3" />
                          {getStatusLabel(campaign.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{campaign.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <UserGroupIcon className="w-4 h-4" />
                          {campaign._count?.candidates || 0} candidatos
                        </span>
                        <span>•</span>
                        <span>Creada el {formatDate(campaign.createdAt)}</span>
                        <button
                          onClick={() => handleCopyLink(campaign.publicId)}
                          className="ml-auto flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                          Copiar enlace
                        </button>
                        <button
                          onClick={() => window.open(`/apply/${campaign.publicId}`, '_blank')}
                          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                          Abrir
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleCampaignStatus(campaign.id, campaign.status)}
                        className={`p-2 rounded-lg transition-colors ${
                          campaign.status === 'ACTIVE'
                            ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                        title={campaign.status === 'ACTIVE' ? 'Pausar campaña' : 'Activar campaña'}
                      >
                        {campaign.status === 'ACTIVE' ? (
                          <PauseIcon className="w-5 h-5" />
                        ) : (
                          <PlayIcon className="w-5 h-5" />
                        )}
                      </button>

                      <Menu as="div" className="relative">
                        <Menu.Button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                          <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                        </Menu.Button>
                        <Transition
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                            <div className="py-1">
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => onNavigateToCampaign(campaign.id)}
                                    className={`${
                                      active ? 'bg-gray-100' : ''
                                    } flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700`}
                                  >
                                    <EyeIcon className="w-5 h-5" />
                                    Ver candidatos
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => onEditCampaign(campaign.id)}
                                    className={`${
                                      active ? 'bg-gray-100' : ''
                                    } flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700`}
                                  >
                                    <PencilIcon className="w-5 h-5" />
                                    Editar campaña
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => handleCopyLink(campaign.publicId)}
                                    className={`${
                                      active ? 'bg-gray-100' : ''
                                    } flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700`}
                                  >
                                    <ShareIcon className="w-5 h-5" />
                                    Copiar enlace
                                  </button>
                                )}
                              </Menu.Item>
                              <div className="border-t border-gray-100" />
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => handleDeleteCampaign(campaign.id)}
                                    disabled={campaign._count && campaign._count.candidates > 0}
                                    className={`${
                                      active ? 'bg-red-50' : ''
                                    } flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    <TrashIcon className="w-5 h-5" />
                                    Eliminar
                                  </button>
                                )}
                              </Menu.Item>
                            </div>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Candidates */}
        <div className={`grid gap-6 ${selectedCandidate ? 'grid-cols-1 md:grid-cols-[2fr_1fr]' : 'grid-cols-1'}`}>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Candidatos Recientes</h2>
            </div>

            {candidates.length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-gray-600">No hay candidatos recientes</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    onClick={() => setSelectedCandidate(candidate)}
                    className={`p-6 cursor-pointer transition-colors ${
                      selectedCandidate?.id === candidate.id ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {getInitials(candidate.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-gray-900 mb-1">{candidate.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{candidate.email}</p>
                        <p className="text-sm text-gray-600 mb-2">{candidate.phone}</p>
                        <p className="text-xs text-gray-500">Aplicó: {formatDate(candidate.createdAt)}</p>
                      </div>
                      {candidate.documentId && (
                        <button className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                          📄 CV
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Candidate Details */}
          {selectedCandidate && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-4 h-fit">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-400 flex items-center justify-center text-white text-2xl font-semibold mx-auto mb-4">
                  {getInitials(selectedCandidate.name)}
                </div>
                <h3 className="text-lg font-bold mb-1">{selectedCandidate.name}</h3>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{selectedCandidate.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <PhoneIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{selectedCandidate.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CalendarIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">Aplicó: {formatDate(selectedCandidate.createdAt)}</span>
                </div>
              </div>

              {selectedCandidate.documentId && (
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold">
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Ver CV Completo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Snackbar */}
        {snackbarMessage && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up">
            <p className="font-medium">{snackbarMessage}</p>
          </div>
        )}

        {/* Pause Campaign Confirmation Modal */}
        {pauseConfirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setPauseConfirmModal({ isOpen: false, campaignId: '', campaignTitle: '' })}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-modal-in">
              {/* Header */}
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-t-2xl p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <PauseIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Pausar Campaña</h3>
                    <p className="text-sm text-yellow-100">Confirma esta acción</p>
                  </div>
                </div>
              </div>

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

        {/* Mobile FAB */}
        <button
          onClick={onCreateCampaign}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors z-40"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>
    </Layout>
  );
};

export default Dashboard;
