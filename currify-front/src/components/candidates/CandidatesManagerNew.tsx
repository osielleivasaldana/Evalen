import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ClipboardIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  StarIcon,
  InformationCircleIcon,
  CheckCircleIcon as CheckCircleIconOutline,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { Card, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import Layout from '../layout/Layout';
import { apiService, Campaign, Candidate, CandidateFilters, CandidateStats, CVData } from '../../services/api';
import DOMPurify from 'dompurify';
import { unescapeHtml } from '../../utils/htmlUtils';

interface CandidatesManagerProps {
  campaignId: string;
  onBack: () => void;
  onViewCandidate?: (candidateId: string) => void;
}

const CandidatesManagerNew: React.FC<CandidatesManagerProps> = ({ campaignId, onBack, onViewCandidate }) => {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidateCVData, setCandidateCVData] = useState<CVData | null>(null);
  const [loadingCVData, setLoadingCVData] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [filters, setFilters] = useState<CandidateFilters>({
    search: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'resumen' | 'experiencia' | 'educacion' | 'habilidades'>('resumen');
  const [reprocessingCandidates, setReprocessingCandidates] = useState<Set<string>>(new Set());
  const [showStartProcessModal, setShowStartProcessModal] = useState(false);
  const [startingProcess, setStartingProcess] = useState(false);
  const [notifyCandidate, setNotifyCandidate] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let campaignData;
      try {
        campaignData = await apiService.getCampaign(campaignId);
        setCampaign(campaignData);
      } catch (err: any) {
        throw new Error(`Error al cargar la campaña: ${err.message}`);
      }

      try {
        const [candidatesData, statsData] = await Promise.all([
          apiService.getCandidates(campaignId, filters),
          apiService.getCandidateStats(campaignId)
        ]);

        setCandidates(candidatesData);
        setStats(statsData);
      } catch (err: any) {
        console.error('Error loading candidates or stats:', err);
        setError(`Error al cargar candidatos: ${err.message}`);
        setCandidates([]);
        setStats({ totalCandidates: 0, pendingCandidates: 0, processedCandidates: 0, errorCandidates: 0 });
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
      console.error('Error in loadData:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData, campaignId, filters]);

  const handleCandidateSelect = async (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    if (candidate.processingStatus === 'COMPLETED') {
      setLoadingCVData(true);
      try {
        const cvData = await apiService.getCandidateStructuredData(candidate.id);
        setCandidateCVData(cvData);
      } catch (err) {
        console.error('Error loading CV data:', err);
      } finally {
        setLoadingCVData(false);
      }
    }
  };

  const handleDownloadCV = async (candidate: Candidate) => {
    if (!candidate.documentId) return;

    try {
      const blob = await apiService.downloadDocument(candidate.documentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CV_${candidate.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message || 'Error al descargar el CV');
    }
  };

  const handleExportCandidates = async () => {
    try {
      const blob = await apiService.exportCandidates(campaignId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `candidatos_${campaign?.title || 'campaña'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      setSnackbarMessage('Candidatos exportados correctamente');
      setTimeout(() => setSnackbarMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al exportar candidatos');
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/apply/${campaign?.publicId}`;
    navigator.clipboard.writeText(url);
    setSnackbarMessage('¡Enlace copiado al portapapeles!');
    setTimeout(() => setSnackbarMessage(''), 3000);
  };

  const handleReprocessCandidate = async (candidateId: string) => {
    try {
      setReprocessingCandidates(prev => new Set(prev).add(candidateId));
      await apiService.reprocessCandidate(candidateId);
      setSnackbarMessage('Candidato reenviado a procesamiento');
      setTimeout(() => setSnackbarMessage(''), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al reprocesar candidato');
    } finally {
      setReprocessingCandidates(prev => {
        const newSet = new Set(prev);
        newSet.delete(candidateId);
        return newSet;
      });
    }
  };

  const handleStartProcess = async () => {
    if (!selectedCandidate || !campaignId) return;

    try {
      setStartingProcess(true);
      console.log('Iniciando proceso con:', {
        campaignId,
        candidateId: selectedCandidate.id,
        notifyCandidate
      });
      await apiService.startProcess({
        campaignId,
        candidateId: selectedCandidate.id,
        notifyCandidate
      });
      setSnackbarMessage('¡Proceso iniciado exitosamente! Redirigiendo...');
      setShowStartProcessModal(false);
      setNotifyCandidate(false);

      // Redirigir a la vista de proceso
      setTimeout(() => {
        navigate(`/campaigns/${campaignId}/candidates/${selectedCandidate.id}/process`);
      }, 1000);
    } catch (err: any) {
      console.error('Error al iniciar proceso:', err);
      setError(err.message || 'Error al iniciar el proceso');
      setShowStartProcessModal(false);
    } finally {
      setStartingProcess(false);
    }
  };

  const handleViewProcess = () => {
    if (!selectedCandidate || !campaignId) return;
    navigate(`/campaigns/${campaignId}/candidates/${selectedCandidate.id}/process`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getInitials = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const calculateScore = (candidate: Candidate): number => {
    // Priorizar el score del servicio de scoring si existe
    if (candidate.scoring?.overallScore) {
      return Math.round(candidate.scoring.overallScore);
    }
    // Fallback al score de confianza del CV
    if (candidate.structuredData?.confianza_general) {
      return Math.round(candidate.structuredData.confianza_general * 100);
    }
    return 0;
  };


  const getCandidatePosition = (candidate: Candidate): string => {
    return candidate.structuredData?.datos_cv?.titular_profesional?.titular || 'N/A';
  };

  const isErrorCandidate = (candidate: Candidate): boolean => {
    // Es error si falló explícitamente, si se llama "Processing Error",
    // o si dice que terminó (COMPLETED) pero no tiene datos estructurados válidos
    return (
      candidate.processingStatus === 'FAILED' ||
      candidate.name === 'Processing Error' ||
      (candidate.processingStatus === 'COMPLETED' && (!candidate.structuredData || !candidate.structuredData.datos_cv))
    );
  };

  if (loading) {
    return (
      <Layout showNavBar={true} showFooter={true}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <p className="text-lg text-gray-600">Cargando candidatos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const selectedCandidateScore = selectedCandidate ? calculateScore(selectedCandidate) : 0;
  const selectedCandidateSkills = selectedCandidate?.structuredData?.datos_cv?.habilidades?.habilidades_tecnicas || [];
  const selectedCandidateLocation = selectedCandidate?.structuredData?.datos_cv?.datos_contacto?.ubicacion || 'N/A';

  return (
    <Layout showNavBar={true} showFooter={true}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Modern Header with Gradient */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-gray-50 transition-all"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{campaign?.title}</h1>
              <p className="text-sm text-gray-500 mt-0.5">Gestiona y revisa los candidatos de tu campaña</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Badge
                    variant={campaign?.status === 'ACTIVE' ? 'success' : 'default'}
                    className="bg-white bg-opacity-20 backdrop-blur-md text-white border-0 px-3 py-1"
                  >
                    {campaign?.status === 'ACTIVE' ? '🟢 Activa' : '⏸️ Pausada'}
                  </Badge>
                  <span className="text-sm opacity-90">
                    Creada el {campaign && formatDate(campaign.createdAt)}
                  </span>
                </div>
                <div className="relative max-w-2xl">
                  <div
                    className={`text-sm opacity-90 prose prose-invert prose-sm transition-[max-height] duration-300 ease-in-out overflow-hidden ${isDescriptionExpanded ? 'max-h-[1000px]' : 'max-h-20'}`}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(unescapeHtml(campaign?.description || ''))
                    }}
                  />
                  {!isDescriptionExpanded && (
                    <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-indigo-500/90 to-transparent z-10"></div>
                  )}
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="mt-1 flex items-center gap-1 text-xs font-bold text-white hover:text-indigo-100 transition-colors uppercase tracking-wide relative z-20"
                  >
                    {isDescriptionExpanded ? (
                      <>
                        <ChevronUpIcon className="w-3 h-3" />
                        Menos
                      </>
                    ) : (
                      <>
                        <ChevronDownIcon className="w-3 h-3" />
                        Más
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportCandidates}
                  className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 backdrop-blur-md rounded-lg hover:bg-opacity-30 transition-all font-medium text-sm"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Exportar
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 backdrop-blur-md rounded-lg hover:bg-opacity-30 transition-all font-medium text-sm"
                >
                  <ClipboardIcon className="w-4 h-4" />
                  Copiar Enlace
                </button>
                <button
                  onClick={() => window.open(`/apply/${campaign?.publicId}`, '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 transition-all font-semibold text-sm shadow-lg"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  Ver Formulario
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Stats Cards with Gradients */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <InformationCircleIcon className="w-7 h-7" />
              </div>
              <p className="text-3xl font-extrabold mb-1">{stats?.totalCandidates || 0}</p>
              <p className="text-sm font-medium opacity-90">Total Candidatos</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <CheckCircleIconOutline className="w-7 h-7" />
              </div>
              <p className="text-3xl font-extrabold mb-1">{stats?.processedCandidates || 0}</p>
              <p className="text-sm font-medium opacity-90">Procesados</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <ExclamationTriangleIcon className="w-7 h-7" />
              </div>
              <p className="text-3xl font-extrabold mb-1">{stats?.pendingCandidates || 0}</p>
              <p className="text-sm font-medium opacity-90">Pendientes</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <XCircleIcon className="w-7 h-7" />
              </div>
              <p className="text-3xl font-extrabold mb-1">{stats?.errorCandidates || 0}</p>
              <p className="text-sm font-medium opacity-90">Rechazados</p>
            </div>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedCandidates.length > 0 && (
          <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckIconSolid className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-indigo-900">
                {selectedCandidates.length} candidato{selectedCandidates.length !== 1 ? 's' : ''} seleccionado{selectedCandidates.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {/* TODO: Implement bulk approve */ }}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-sm"
              >
                <CheckIconSolid className="w-4 h-4" />
                Aprobar todos
              </button>
              <button
                onClick={() => {/* TODO: Implement bulk reject */ }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm"
              >
                <XMarkIcon className="w-4 h-4" />
                Rechazar todos
              </button>
              <button
                onClick={() => setSelectedCandidates([])}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={`grid gap-6 ${selectedCandidate ? 'grid-cols-1 md:grid-cols-[65%_35%]' : 'grid-cols-1'}`}>
          {/* Candidates Table */}
          <Card>
            <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Candidatos
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({candidates.length} {candidates.length === 1 ? 'resultado' : 'resultados'})
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    value={filters.sortBy || 'createdAt'}
                    onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="createdAt">Más recientes</option>
                    <option value="name">Nombre A-Z</option>
                  </select>
                </div>
              </div>

              {/* Advanced Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="🔍 Buscar por nombre, email..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[140px]"
                  >
                    <option value="">Todos</option>
                    <option value="PENDING">🆕 Nuevos</option>
                    <option value="PROCESSING">⏳ En Revisión</option>
                    <option value="COMPLETED">✅ Procesados</option>
                    <option value="ERROR">❌ Error</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            {candidates.length === 0 ? (
              <div className="p-16 text-center">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay candidatos aún</h3>
                <p className="text-sm text-gray-500">Comparte el enlace público de tu campaña para recibir aplicaciones</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left w-12">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.length === candidates.length && candidates.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidates(candidates.map(c => c.id));
                            } else {
                              setSelectedCandidates([]);
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidato</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {candidates.map((candidate) => {
                      const score = calculateScore(candidate);
                      const location = candidate.structuredData?.datos_cv?.datos_contacto?.ubicacion || 'N/A';
                      const isSelected = selectedCandidates.includes(candidate.id);

                      return (
                        <tr
                          key={candidate.id}
                          className={`transition-colors ${selectedCandidate?.id === candidate.id ? 'bg-indigo-50' :
                            isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'
                            }`}
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedCandidates([...selectedCandidates, candidate.id]);
                                } else {
                                  setSelectedCandidates(selectedCandidates.filter(id => id !== candidate.id));
                                }
                              }}
                              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap cursor-pointer"
                            onClick={() => handleCandidateSelect(candidate)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {getInitials(candidate.name)}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{candidate.name}</div>
                                <div className="text-xs text-gray-500">{candidate.email}</div>
                              </div>
                            </div>
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap cursor-pointer"
                            onClick={() => handleCandidateSelect(candidate)}
                          >
                            <div className="flex items-center gap-2">
                              <MapPinIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700">{location}</span>
                            </div>
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap cursor-pointer"
                            onClick={() => handleCandidateSelect(candidate)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${score >= 90 ? 'bg-green-100 text-green-700' :
                                score >= 70 ? 'bg-orange-100 text-orange-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                {score}
                              </div>
                            </div>
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap cursor-pointer"
                            onClick={() => handleCandidateSelect(candidate)}
                          >
                            <Badge
                              variant={
                                candidate.processingStatus === 'COMPLETED' ? 'success' :
                                  candidate.processingStatus === 'PROCESSING' ? 'default' :
                                    candidate.processingStatus === 'FAILED' ? 'destructive' :
                                      'info'
                              }
                            >
                              {candidate.processingStatus === 'COMPLETED' ? 'Procesado' :
                                candidate.processingStatus === 'PROCESSING' ? 'En Revisión' :
                                  candidate.processingStatus === 'FAILED' ? 'Error' :
                                    'Nuevo'}
                            </Badge>
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap cursor-pointer"
                            onClick={() => handleCandidateSelect(candidate)}
                          >
                            <div className="text-sm text-gray-700">{formatDate(candidate.createdAt)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCandidateSelect(candidate);
                                }}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Ver detalles"
                              >
                                <EyeIcon className="w-5 h-5" />
                              </button>
                              {isErrorCandidate(candidate) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReprocessCandidate(candidate.id);
                                  }}
                                  disabled={reprocessingCandidates.has(candidate.id)}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Reprocesar candidato"
                                >
                                  <ArrowPathIcon className={`w-5 h-5 ${reprocessingCandidates.has(candidate.id) ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Improved Candidate Details Panel */}
          {selectedCandidate && (
            <Card className="sticky top-4 h-fit max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 text-center border-b border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold shadow-lg">
                  {getInitials(selectedCandidate.name)}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedCandidate.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{getCandidatePosition(selectedCandidate)}</p>

                {/* Score Circle */}
                <div className="flex justify-center mb-3">
                  <div className="relative w-20 h-20">
                    <svg className="transform -rotate-90 w-20 h-20">
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke="#e5e7eb"
                        strokeWidth="6"
                        fill="none"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke={selectedCandidateScore >= 90 ? '#10b981' : selectedCandidateScore >= 70 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${(selectedCandidateScore / 100) * 201} 201`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">{selectedCandidateScore}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 font-medium mb-3">Score de Compatibilidad</p>

                {/* Ver Resultados Button */}
                {selectedCandidate.scoring && (
                  <button
                    onClick={() => onViewCandidate?.(selectedCandidate.id)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <EyeIcon className="w-4 h-4" />
                    Ver Resultados
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 bg-white">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('resumen')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'resumen'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Resumen
                  </button>
                  <button
                    onClick={() => setActiveTab('habilidades')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'habilidades'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Skills
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'resumen' && (
                  <div className="space-y-6">
                    {/* Contact Info */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <EnvelopeIcon className="w-4 h-4 text-indigo-600" />
                        Contacto
                      </h4>
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-2 text-sm">
                          <EnvelopeIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 break-all">{selectedCandidate.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <PhoneIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">{selectedCandidate.phone}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{selectedCandidateLocation}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">{formatDate(selectedCandidate.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Top Skills Preview */}
                    {selectedCandidateSkills.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <StarIcon className="w-4 h-4 text-indigo-600" />
                          Skills Principales
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedCandidateSkills.slice(0, 4).map((skill, index) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200"
                            >
                              {skill.skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'habilidades' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 mb-3">Todas las Habilidades</h4>
                    {selectedCandidateSkills.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCandidateSkills.map((skill, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-900">{skill.skill}</span>
                            {skill.level && (
                              <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                {skill.level}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">No hay habilidades registradas</p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons - Fixed at bottom */}
              <div className="p-6 border-t border-gray-200 bg-white space-y-3">
                <button
                  onClick={() => onViewCandidate?.(selectedCandidate.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors shadow-md hover:shadow-lg"
                >
                  <EyeIcon className="w-5 h-5" />
                  Ver CV
                </button>

                {isErrorCandidate(selectedCandidate) ? (
                  <button
                    onClick={() => handleReprocessCandidate(selectedCandidate.id)}
                    disabled={reprocessingCandidates.has(selectedCandidate.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowPathIcon className={`w-5 h-5 ${reprocessingCandidates.has(selectedCandidate.id) ? 'animate-spin' : ''}`} />
                    {reprocessingCandidates.has(selectedCandidate.id) ? 'Reprocesando...' : 'Reprocesar Candidato'}
                  </button>
                ) : selectedCandidate.candidateStatus === 'NEW' ? (
                  <button
                    onClick={() => setShowStartProcessModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    <PlayIcon className="w-5 h-5" />
                    Iniciar Proceso
                  </button>
                ) : (
                  <button
                    onClick={handleViewProcess}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    <EyeIcon className="w-5 h-5" />
                    Ver Proceso
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Modal Iniciar Proceso */}
        {showStartProcessModal && selectedCandidate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PlayIcon className="w-7 h-7 text-indigo-600" />
                Iniciar Proceso de Selección
              </h3>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Candidato:</strong> {selectedCandidate.name}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  Se iniciarán las etapas de selección definidas en esta campaña.
                </p>
              </div>

              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyCandidate}
                    onChange={(e) => setNotifyCandidate(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enviar notificación al candidato por email
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowStartProcessModal(false);
                    setNotifyCandidate(false);
                  }}
                  disabled={startingProcess}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStartProcess}
                  disabled={startingProcess}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {startingProcess ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <CheckCircleIconOutline className="w-5 h-5" />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Snackbar */}
        {snackbarMessage && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up">
            <p className="font-medium">{snackbarMessage}</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CandidatesManagerNew;
