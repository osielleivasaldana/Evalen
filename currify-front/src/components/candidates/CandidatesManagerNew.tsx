import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ClipboardIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  InformationCircleIcon,
  CheckCircleIcon as CheckCircleIconOutline,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  StarIcon,
  SparklesIcon,
  LockClosedIcon,
  HandThumbUpIcon,
  CheckIcon,
  HandThumbDownIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { Card, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import Layout from '../layout/Layout';
import { apiService, Campaign, Candidate, CandidateFilters, CandidateStats, CVData, ProcessInstance, StageInstance } from '../../services/api';
import DOMPurify from 'dompurify';
import { unescapeHtml } from '../../utils/htmlUtils';
import CandidateDrawer from './CandidateDrawer';

interface CandidatesManagerProps {
  campaignId: string;
  onBack: () => void;
  onViewCandidate?: (candidateId: string) => void;
  onDeleteCandidate?: (candidateId: string) => void;
}

// ---- HELPER TYPES & FUNCTIONS ----
type FilterTab = 'all' | 'top10' | 'process';

const CandidatesManagerNew: React.FC<CandidatesManagerProps> = ({ campaignId, onBack, onViewCandidate, onDeleteCandidate }) => {
  const navigate = useNavigate();
  // Data State
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  type FilterTab = 'all' | 'top10' | 'process' | 'new' | 'rejected';
  const [activeTabFilter, setActiveTabFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection & Drawer State
  // Selection & Drawer State
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<ProcessInstance | null>(null);
  const [candidateCVData, setCandidateCVData] = useState<CVData | null>(null);
  const [loadingCVData, setLoadingCVData] = useState(false);

  // Actions State
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [showSnackbarUndo, setShowSnackbarUndo] = useState<boolean>(false);
  const [undoAction, setUndoAction] = useState<(() => void) | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [reprocessingCandidates, setReprocessingCandidates] = useState<Set<string>>(new Set());
  const [showStartProcessModal, setShowStartProcessModal] = useState(false);
  const [startingProcess, setStartingProcess] = useState(false);
  const [notifyCandidate, setNotifyCandidate] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [dismissingCandidates, setDismissingCandidates] = useState<Set<string>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Processing UX State
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0);
  const PROCESSING_MESSAGES = [
    "Estandarizando información...",
    "Identificando trayectoria laboral...",
    "Extrayendo habilidades clave...",
    "Analizando formación académica...",
    "Calculando score de compatibilidad...",
    "Generando resumen ejecutivo..."
  ];

  // Rotate messages
  useEffect(() => {
    const interval = setInterval(() => {
      setProcessingMessageIndex(prev => (prev + 1) % PROCESSING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);



  // ---- DATA LOADING ----
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load Campaign
      try {
        const campaignData = await apiService.getCampaign(campaignId);
        setCampaign(campaignData);
      } catch (err: any) {
        throw new Error(`Error al cargar la campaña: ${err.message}`);
      }

      // Load Candidates & Stats
      try {
        // En esta vista queremos TODOS los candidatos y filtrar en cliente para la UI "Top 10"
        const [candidatesData, statsData] = await Promise.all([
          apiService.getCandidates(campaignId, { search: '', sortBy: 'createdAt', sortOrder: 'desc' }), // Traemos todo, filtramos en cliente para velocidad
          apiService.getCandidateStats(campaignId)
        ]);
        setCandidates(candidatesData);
        setStats(statsData);
      } catch (err: any) {
        console.error('Error loading candidates:', err);
        setCandidates([]);
        setStats({ totalCandidates: 0, pendingCandidates: 0, processedCandidates: 0, errorCandidates: 0 });
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll for updates if there are processing candidates
  useEffect(() => {
    const hasProcessing = candidates.some(c =>
      c.processingStatus === 'PENDING' || c.processingStatus === 'PROCESSING'
    );

    if (hasProcessing) {
      const interval = setInterval(() => {
        loadData(); // Re-fetch to check if they are done
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [candidates, loadData]);


  // ---- FILTERING LOGIC (THE BRAIN) ----
  const filteredCandidates = useMemo(() => {
    let result = [...candidates];

    // 1. Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }

    // 2. Tab Filter Rules
    if (activeTabFilter === 'process') {
      // Candidates that have started the process
      // SMART DISMISSAL: Exclude rejected candidates automatically from this view
      result = result.filter(c =>
        c.candidateStatus === 'IN_PROCESS' || c.candidateStatus === 'SELECTED'
      );
    } else if (activeTabFilter === 'top10') {
      // SMART DISMISSAL: Exclude rejected explicitly from Top 10 to reduce noise
      result = result
        .filter(c => c.candidateStatus !== 'NOT_SELECTED')
        .sort((a, b) => calculateScore(b) - calculateScore(a))
        .slice(0, 10);
    } else if (activeTabFilter === 'new') {
      // New candidates (Por Revisar) - Exclude rejected
      result = result.filter(c => c.candidateStatus === 'NEW');
    } else if (activeTabFilter === 'rejected') {
      // Rejected candidates
      result = result.filter(c => c.candidateStatus === 'NOT_SELECTED');
    } else if (activeTabFilter === 'all') {
      // "all" tab now EXCLUDES rejected to keep list clean (Ghost rows are gone)
      result = result.filter(c => c.candidateStatus !== 'NOT_SELECTED');
    }

    return result;
  }, [candidates, activeTabFilter, searchQuery]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTabFilter, searchQuery]);


  // ---- INTERACTION HANDLERS ----
  const handleCandidateSelect = async (candidate: Candidate) => {
    if (selectedCandidate?.id === candidate.id) {
      setSelectedCandidate(null);
      return;
    }

    // Optimistic set (showing what we have immediately)
    setSelectedCandidate(candidate);
    setSelectedProcess(null);
    setCandidateCVData(null);

    // Fetch FULL Details (including AI Summary if missing in list)
    try {
      const fullCandidate = await apiService.getCandidateWithCampaign(campaignId, candidate.id);
      setSelectedCandidate(prev => prev?.id === fullCandidate.id ? fullCandidate : prev);
    } catch (err) {
      console.error("Error loading full candidate details", err);
      // Fallback: try getting just by candidate ID if the campaign route fails
      try {
        const fallbackCandidate = await apiService.getCandidate(candidate.id);
        setSelectedCandidate(prev => prev?.id === fallbackCandidate.id ? fallbackCandidate : prev);
      } catch (e) {
        console.error("Fallback load failed", e);
      }
    }

    // Load extra data if processed
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

    // Fetch Process Instance if candidate started process
    if (candidate.candidateStatus === 'IN_PROCESS' || candidate.candidateStatus === 'SELECTED' || candidate.candidateStatus === 'NOT_SELECTED') {
      try {
        const processData = await apiService.getProcess(campaignId, candidate.id);
        setSelectedProcess(processData);
      } catch (err) {
        console.error('Error loading process data:', err);
      }
    }
  };

  const handleCloseDrawer = () => setSelectedCandidate(null);

  // Close with Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCandidate(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCandidate]);


  // ---- UTILS ----
  function calculateScore(candidate: Candidate): number {
    if (candidate.scoring?.overallScore) return Math.round(candidate.scoring.overallScore);
    // Don't fallback to confidence - it confuses users (confusing 95% with match score)
    return 0;
  }

  function getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  const getCandidatePosition = (candidate: Candidate): string => {
    return candidate.structuredData?.datos_cv?.titular_profesional?.titular || 'N/A';
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

  const getAIInsight = (candidate: Candidate) => {
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

  const getSmartTags = (rawString: string) => {
    if (!rawString || rawString === 'N/A') return [];
    // Split by period or comma, but prefer period if present
    const cleanString = rawString.replace(/\.$/, ''); // Remove trailing dot
    if (cleanString.includes('.')) {
      return cleanString.split('.').map(s => s.trim()).filter(Boolean);
    }
    return cleanString.split(',').map(s => s.trim()).filter(Boolean);
  };

  // Deterministic gradient based on name/email to keep UI consistent but colorful
  function getAvatarGradient(name: string) {
    const gradients = [
      'from-indigo-500 to-purple-500',
      'from-emerald-400 to-cyan-500',
      'from-orange-400 to-pink-500',
      'from-blue-500 to-indigo-600',
      'from-violet-500 to-fuchsia-500',
      'from-rose-400 to-red-500',
      'from-amber-400 to-orange-500',
      'from-teal-400 to-emerald-500'
    ];
    const index = name.length % gradients.length;
    return gradients[index];
  }

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
      await apiService.startProcess({
        campaignId,
        candidateId: selectedCandidate.id,
        notifyCandidate
      });
      setSnackbarMessage('¡Proceso iniciado exitosamente!');
      setShowStartProcessModal(false);

      // Update local state without full reload
      const updatedCandidates = candidates.map(c =>
        c.id === selectedCandidate.id ? { ...c, candidateStatus: 'IN_PROCESS' as any } : c
      );
      setCandidates(updatedCandidates);
      if (selectedCandidate) setSelectedCandidate({ ...selectedCandidate, candidateStatus: 'IN_PROCESS' as any });

      navigate(`/campaigns/${campaignId}/candidates/${selectedCandidate.id}/process`);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar el proceso');
    } finally {
      setStartingProcess(false);
    }
  };

  const handleDismissCandidate = async (candidate: Candidate) => {
    // 1. Start Animation (Mark as dismissing)
    setDismissingCandidates(prev => new Set(prev).add(candidate.id));

    // Wait for animation (300ms)
    await new Promise(resolve => setTimeout(resolve, 300));

    // 2. Optimistic Update (Changes status -> Filter removes it -> List collapses)
    const previousStatus = candidate.candidateStatus;
    const updatedCandidates = candidates.map(c =>
      c.id === candidate.id ? { ...c, candidateStatus: 'NOT_SELECTED' as any } : c
    );
    setCandidates(updatedCandidates);
    setDismissingCandidates(prev => {
      const next = new Set(prev);
      next.delete(candidate.id);
      return next;
    });

    // 3. Show Toast with Undo
    setSnackbarMessage('Candidato descartado');
    setShowSnackbarUndo(true);
    setUndoAction(() => async () => {
      // Restore logic (Undo)
      const restoredCandidates = candidates.map(c =>
        c.id === candidate.id ? { ...c, candidateStatus: previousStatus } : c
      );
      setCandidates(restoredCandidates); // Revert local state
      setSnackbarMessage('Acción deshecha: Candidato restaurado');
      setShowSnackbarUndo(false);
      setUndoAction(null);

      try {
        await apiService.updateCandidateStatus(candidate.id, previousStatus);
      } catch (err) {
        console.error("Error undoing dismiss", err);
      }
    });

    // 4. Call Backend to persist dismiss
    try {
      await apiService.updateCandidateStatus(candidate.id, 'NOT_SELECTED');
    } catch (err) {
      console.error("Error dismissing candidate", err);
      // Revert on error
      setCandidates(candidates);
      setError("Error al descartar candidato");
    }

    // Auto-hide toast after 5s
    setTimeout(() => {
      setSnackbarMessage('');
      setShowSnackbarUndo(false);
      setUndoAction(null);
    }, 5000);
  };

  const handleViewAIAnalysis = (candidate: Candidate) => {
    if (onViewCandidate) {
      onViewCandidate(candidate.id);
    }
  };

  const handleRestoreCandidate = async (candidate: Candidate) => {
    // Explicit restore from Rejected tab
    try {
      // Optimistic
      const updatedCandidates = candidates.map(c =>
        c.id === candidate.id ? { ...c, candidateStatus: 'NEW' as any } : c
      );
      setCandidates(updatedCandidates);

      await apiService.updateCandidateStatus(candidate.id, 'NEW');

      setSnackbarMessage('Candidato restaurado a la lista principal');
      setTimeout(() => setSnackbarMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al restaurar candidato');
      loadData(); // Reload to fix state
    }
  };



  const handleViewProcess = () => {
    if (selectedCandidate) {
      navigate(`/campaigns/${campaignId}/candidates/${selectedCandidate.id}/process`);
    }
  };

  // ---- RENDER ----
  if (loading && candidates.length === 0) {
    return (
      <Layout showNavBar={true} showFooter={true}>
        <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium">Cargando ecosystema...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Derived state for pagination
  const paginatedCandidates = filteredCandidates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);

  const selectedCandidateScore = selectedCandidate ? calculateScore(selectedCandidate) : 0;
  const selectedCandidateExperience = (selectedCandidate?.structuredData?.datos_cv as any)?.experiencia_laboral || [];
  const selectedCandidateEducation = (selectedCandidate?.structuredData?.datos_cv as any)?.formacion_academica || [];
  const selectedCandidateLanguages = (selectedCandidate?.structuredData?.datos_cv as any)?.habilidades?.idiomas || [];
  const selectedCandidateSkills = (selectedCandidate?.structuredData?.datos_cv as any)?.habilidades?.habilidades_tecnicas || [];

  return (
    <Layout showNavBar={true} showFooter={true}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* HEADER AREA - GRADIENT STYLE */}
        <div className="mb-8 animate-fade-in">
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

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 shadow-xl">
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
                  onClick={() => alert("🔒 Disponible en Plan PRO: Exporta perfiles en PDF profesional y reportes detallados.")}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors cursor-help tooltip-trigger"
                  title="Disponible en Plan PRO"
                >
                  <LockClosedIcon className="w-4 h-4" />
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
        </div>

        {/* STATS CARDS - GRADIENT STYLE */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 animate-fade-in-up">
          <div
            onClick={() => setActiveTabFilter('all')}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:translate-y-[-2px] transition-all cursor-pointer ${activeTabFilter === 'all' ? 'ring-4 ring-indigo-200 ring-offset-2' : ''}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <InformationCircleIcon className="w-7 h-7" />
              </div>
              <p className="text-3xl font-extrabold mb-1">{candidates.length || 0}</p>
              <p className="text-sm font-medium opacity-90">Total Candidatos</p>
            </div>
          </div>

          <div
            onClick={() => setActiveTabFilter('process')}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:translate-y-[-2px] transition-all cursor-pointer ${activeTabFilter === 'process' ? 'ring-4 ring-emerald-200 ring-offset-2' : ''}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <CheckCircleIconOutline className="w-7 h-7" />
              </div>
              <p className="text-3xl font-extrabold mb-1">{candidates.filter(c => c.candidateStatus === 'IN_PROCESS').length || 0}</p>
              <p className="text-sm font-medium opacity-90">En Proceso</p>
            </div>
          </div>

          <div
            onClick={() => setActiveTabFilter('new')}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg hover:translate-y-[-2px] transition-all cursor-pointer ${activeTabFilter === 'new' ? 'ring-4 ring-orange-200 ring-offset-2' : ''}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <ExclamationTriangleIcon className="w-7 h-7" />
              </div>
              <p className="text-3xl font-extrabold mb-1">{candidates.filter(c => c.candidateStatus === 'NEW').length || 0}</p>
              <p className="text-sm font-medium opacity-90">Por Revisar</p>
            </div>
          </div>

          <div
            onClick={() => setActiveTabFilter('rejected')}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg hover:translate-y-[-2px] transition-all cursor-pointer ${activeTabFilter === 'rejected' ? 'ring-4 ring-pink-200 ring-offset-2' : ''}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <XCircleIcon className="w-7 h-7" />
              </div>
              <p className="text-3xl font-extrabold mb-1">{candidates.filter(c => c.candidateStatus === 'NOT_SELECTED').length || 0}</p>
              <p className="text-sm font-medium opacity-90">Rechazados</p>
            </div>
          </div>
        </div>

        {/* CONTROLS ROW */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
          {/* CONTEXT TABS (The "Pill" Navigation) */}
          <nav className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTabFilter('all')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all duration-300 ${activeTabFilter === 'all'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-indigo-500'
                }`}
            >
              TODOS
            </button>
            <button
              onClick={() => setActiveTabFilter('top10')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${activeTabFilter === 'top10'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-indigo-500'
                }`}
            >
              <span>⭐</span> TOP 10
            </button>
            <button
              onClick={() => setActiveTabFilter('process')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${activeTabFilter === 'process'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-indigo-500'
                }`}
            >
              <span>🔄</span> EN PROCESO
            </button>
            <button
              onClick={() => setActiveTabFilter('rejected')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${activeTabFilter === 'rejected'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-slate-500 hover:text-rose-500'
                }`}
            >
              <span>🚫</span> DESCARTADOS
            </button>
          </nav>

          {/* SEARCH BAR */}
          <div className="relative group w-full md:w-auto mt-2 md:mt-0">
            <input
              type="text"
              placeholder="Buscar candidato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all w-full md:w-64"
            />
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* MAIN LAYOUT WITH DRAWER */}
        <div className="flex gap-6 items-start relative min-h-[600px]">

          {/* TABLE CONTAINER */}
          <div className={`flex-1 transition-all duration-500 ease-spring ${selectedCandidate ? 'mr-[460px]' : ''}`}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 backend-blur supports-[backdrop-filter]:bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[30%]">Candidato</th>
                    {!selectedCandidate && <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[30%]">Habilidades Clave</th>}
                    {!selectedCandidate && <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center w-[15%]">Match</th>}
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right w-[20%]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCandidates.map((candidate) => {
                    const score = calculateScore(candidate);
                    const scoreColor = score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-rose-500';
                    const isActive = selectedCandidate?.id === candidate.id;
                    const isProcessing = candidate.processingStatus === 'PENDING' || candidate.processingStatus === 'PROCESSING';

                    const isDismissed = candidate.candidateStatus === 'NOT_SELECTED';
                    const isDismissing = dismissingCandidates.has(candidate.id);

                    // Animation classes
                    const animationClass = isDismissing
                      ? 'opacity-0 transform scale-95 translate-x-4 pointer-events-none'
                      : 'opacity-100 transform scale-100 translate-x-0';

                    return (
                      <tr
                        key={candidate.id}
                        onClick={() => !isProcessing && handleCandidateSelect(candidate)}
                        className={`group cursor-pointer transition-all duration-300 ease-out border-b border-slate-100
                            ${animationClass}
                            ${isActive ? 'bg-indigo-50/50' : isDismissed ? 'bg-slate-100 opacity-60 grayscale-[80%] hover:grayscale-0 hover:opacity-100 hover:bg-slate-50' : 'hover:bg-slate-50'} 
                            ${isProcessing ? 'cursor-wait' : ''}
                        `}
                      >
                        {/* Note: Animating table rows is hard. Better trick: Animate content inside TDs or use a div wrapper. 
                          For "Poof", we can try `transform: scale(0.9) opacity(0)` and then unmount.
                       */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(candidate.name)} flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform duration-300 relative`}>
                              {getInitials(candidate.name)}
                              {/* Online Status Dot (Simulation) */}
                              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                            </div>
                            <div>
                              <div className={`text-sm font-bold transition-colors ${isActive ? 'text-indigo-700' : 'text-slate-900'}`}>
                                {candidate.name}
                              </div>
                              {/* Role / Experience Line */}
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                                <BriefcaseIcon className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[180px]" title={getCandidatePosition(candidate)}>
                                  {getCandidatePosition(candidate)}
                                </span>
                              </div>
                              {/* LinkedIn / Online Profiles */}
                              {candidate.structuredData?.datos_cv?.perfiles_online && Object.keys(candidate.structuredData.datos_cv.perfiles_online).length > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  <a href="#" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                                    <GlobeAltIcon className="w-3 h-3" />
                                    <span>Perfil Online</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {!selectedCandidate && (
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {candidate.structuredData?.datos_cv?.habilidades?.habilidades_tecnicas?.slice(0, 3).map((skill: any, idx: number) => ( // Explicit any for skill to avoid TS error if strict
                                <span key={idx} className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100 whitespace-nowrap">
                                  {skill.skill || skill}
                                </span>
                              ))}
                              {!candidate.structuredData?.datos_cv?.habilidades?.habilidades_tecnicas?.length && (
                                <span className="text-xs text-slate-400 italic">Sin habilidades detectadas</span>
                              )}
                            </div>
                          </td>
                        )}

                        {!selectedCandidate && (
                          <td className="px-6 py-4 text-center">
                            {isProcessing ? (
                              <div className="flex justify-center">
                                <ArrowPathIcon className="w-5 h-5 text-indigo-600 animate-spin" />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2 group/score relative">
                                {/* Visual Ring Score */}
                                <div className="relative w-10 h-10">
                                  <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="20" cy="20" r="16" stroke="#f1f5f9" strokeWidth="3" fill="none" />
                                    <circle cx="20" cy="20" r="16" stroke={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e'} strokeWidth="3" fill="none" strokeDasharray={`${(score / 100) * 100} 100`} />
                                  </svg>
                                  <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black ${scoreColor}`}>
                                    {score}
                                  </span>
                                </div>

                                {/* Optional: Add a small status indicator next to score if needed, or keep clean */}
                              </div>
                            )}
                          </td>
                        )}

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            {/* Quick Actions */}
                            {isProcessing ? (
                              <span className="text-[10px] text-indigo-500 animate-pulse font-medium">Procesando...</span>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCandidateSelect(candidate); }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Ver Análisis Completo"
                                >
                                  <EyeIcon className="w-5 h-5" />
                                </button>

                                {candidate.candidateStatus === 'NEW' && (
                                  <>
                                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                    <button
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                                      title="Aprobar (Iniciar Proceso)"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCandidate(candidate);
                                        setShowStartProcessModal(true);
                                      }}
                                    >
                                      <HandThumbUpIcon className="w-5 h-5" />
                                    </button>
                                  </>
                                )}

                                {/* Show Status Badge if not NEW/DISMISSED */}
                                {candidate.candidateStatus !== 'NEW' && candidate.candidateStatus !== 'NOT_SELECTED' && (
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${candidate.candidateStatus === 'IN_PROCESS' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                    candidate.candidateStatus === 'SELECTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                      'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}>
                                    {candidate.candidateStatus === 'IN_PROCESS' ? 'En Proceso' :
                                      candidate.candidateStatus === 'SELECTED' ? 'Seleccionado' : 'Rechazado'}
                                  </span>
                                )}

                                {/* Restore Action for Dismissed Candidates */}
                                {candidate.candidateStatus === 'NOT_SELECTED' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRestoreCandidate(candidate); }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title="Restaurar Candidato"
                                  >
                                    <ArrowUturnLeftIcon className="w-5 h-5" />
                                  </button>
                                )}

                                {/* Dismiss Button (Only if NEW) */}
                                {candidate.candidateStatus === 'NEW' && (
                                  <button
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="Descartar"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDismissCandidate(candidate);
                                    }}
                                  >
                                    <HandThumbDownIcon className="w-5 h-5" />
                                  </button>
                                )}                         </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedCandidates.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 italic">
                        No se encontraron candidatos con estos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {filteredCandidates.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">
                    Mostrando {paginatedCandidates.length} de {filteredCandidates.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SHARED DRAWER COMPONENT */}
          <CandidateDrawer
            isOpen={!!selectedCandidate}
            candidate={selectedCandidate}
            campaign={campaign || undefined}
            onClose={() => setSelectedCandidate(null)}
            onDismiss={handleDismissCandidate}
            onStartProcess={handleStartProcess}
            onViewAIAnalysis={handleViewAIAnalysis}
            onViewProcess={handleViewProcess}
            undoAction={undoAction || undefined}
            showUndo={showSnackbarUndo}
          />
        </div>

        {/* MODAL INICIO PROCESO */}
        {showStartProcessModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-fade-in-up">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                <PlayIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Iniciar Reclutamiento</h3>
              <p className="text-center text-slate-500 text-sm mb-6">
                Esto moverá a <strong>{selectedCandidate?.name}</strong> a la etapa de "Screening" y notificará al equipo.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStartProcessModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStartProcess}
                  disabled={startingProcess}
                  className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex justify-center items-center"
                >
                  {startingProcess ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SNACKBAR WITH UNDO */}
        {snackbarMessage && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white pl-6 pr-4 py-3 rounded-full shadow-2xl z-[70] flex items-center gap-4 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <CheckCircleIconOutline className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium">{snackbarMessage}</span>
            </div>
            {showSnackbarUndo && undoAction && (
              <button
                onClick={() => undoAction()}
                className="text-xs font-bold bg-white text-slate-900 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
              >
                DESHACER
              </button>
            )}
          </div>
        )}

      </div>
    </Layout >
  );
};

export default CandidatesManagerNew;