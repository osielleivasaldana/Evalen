import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  ClipboardIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  CheckCircleIcon,
  SparklesIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import Layout from '../layout/Layout';
import { apiService, Campaign, Candidate, CandidateFilters, CandidateStats, CVData, ProcessInstance, StageInstance, RescoreStatus, CandidateProcessInfo } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DOMPurify from 'dompurify';
import { unescapeHtml } from '../../utils/htmlUtils';
import { hasCandidateProcess, getActiveStageName } from '../../utils/candidateProcess';
import CandidateDrawer from './CandidateDrawer';

interface CandidatesManagerProps {
  campaignId: string;
  onBack: () => void;
  onViewCandidate?: (candidateId: string) => void;
  onDeleteCandidate?: (candidateId: string) => void;
}

type FilterTab = 'all' | 'top10' | 'process' | 'new' | 'rejected';

const STAGES: Record<string, { label: string; chip: string; dot: string }> = {
  revision:   { label: 'En revisión',  chip: 'bg-midt text-mid t-midt t-mid', dot: 'bg-mid' },
  contactar:  { label: 'Por contactar', chip: 'bg-midt text-mid t-midt t-mid', dot: 'bg-mid' },
  entrevista: { label: 'En entrevista', chip: 'bg-goodt text-good t-goodt t-good', dot: 'bg-good' },
  oferta:     { label: 'En oferta',     chip: 'bg-goodt text-good t-goodt t-good', dot: 'bg-good' },
  contratado: { label: 'Contratado',    chip: 'bg-greendeep text-onmark', dot: 'bg-yellow' },
  descartado: { label: 'Descartado',    chip: 'bg-lowt text-low t-lowt t-low', dot: 'bg-low' }
};

function mapStage(status?: string): string {
  const m: Record<string, string> = {
    NEW: 'revision', IN_PROCESS: 'entrevista', SELECTED: 'oferta', NOT_SELECTED: 'descartado'
  };
  return m[status || ''] || 'revision';
}

function toCandidateProcessInfo(p: ProcessInstance): CandidateProcessInfo {
  return {
    id: p.id,
    currentStageOrder: p.currentStageOrder,
    endDate: p.endDate,
    stageInstances: p.stageInstances.map(s => ({
      id: s.id,
      status: s.status,
      stageTemplate: { id: s.stageTemplate.id, name: s.stageTemplate.name, order: s.stageTemplate.order }
    }))
  };
}

const CandidatesManagerNew: React.FC<CandidatesManagerProps> = ({ campaignId, onBack, onViewCandidate, onDeleteCandidate }) => {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTabFilter, setActiveTabFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<ProcessInstance | null>(null);
  const [candidateCVData, setCandidateCVData] = useState<CVData | null>(null);
  const [loadingCVData, setLoadingCVData] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [showSnackbarUndo, setShowSnackbarUndo] = useState<boolean>(false);
  const [undoAction, setUndoAction] = useState<(() => void) | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [reprocessingCandidates, setReprocessingCandidates] = useState<Set<string>>(new Set());
  const [showStartProcessModal, setShowStartProcessModal] = useState(false);
  const [startingProcess, setStartingProcess] = useState(false);
  const [startProcessError, setStartProcessError] = useState<string | null>(null);
  const [notifyCandidate, setNotifyCandidate] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [dismissingCandidates, setDismissingCandidates] = useState<Set<string>>(new Set());
  const [rescoringAll, setRescoringAll] = useState(false);
  const [rescoresInProgress, setRescoresInProgress] = useState<Set<string>>(new Set());
  const [showRescoreConfirm, setShowRescoreConfirm] = useState(false);
  const [rescoreProgress, setRescoreProgress] = useState<RescoreStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<'match' | 'match-asc' | 'name'>('match');
  const itemsPerPage = 5;
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0);
  const PROCESSING_MESSAGES = [
    "Estandarizando información...", "Identificando trayectoria laboral...",
    "Extrayendo habilidades clave...", "Analizando formación académica...",
    "Calculando score de compatibilidad...", "Generando resumen ejecutivo..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProcessingMessageIndex(prev => (prev + 1) % PROCESSING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const { user } = useAuth();
  const outdatedCount = useMemo(() => candidates.filter(c => c.scoringStatus === 'OUTDATED').length, [candidates]);
  const availableCredits = user?.cvCredits ?? 0;
  const cost = outdatedCount;
  const creditsAfter = availableCredits - cost;
  const isRescoreActive = isPolling || (rescoreProgress !== null && rescoreProgress.current < rescoreProgress.total) || pollingTimedOut;
  const rescoreCompleted = rescoreProgress !== null && rescoreProgress.current >= rescoreProgress.total;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      try {
        const campaignData = await apiService.getCampaign(campaignId);
        setCampaign(campaignData);
      } catch (err: any) {
        throw new Error(`Error al cargar la campaña: ${err.message}`);
      }
      try {
        const [candidatesData, statsData] = await Promise.all([
          apiService.getCandidates(campaignId, { search: '', sortBy: 'createdAt', sortOrder: 'desc' }),
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

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const hasProcessing = candidates.some(c =>
      c.processingStatus === 'PENDING' || c.processingStatus === 'PROCESSING'
    );
    if (hasProcessing) {
      const interval = setInterval(() => { loadData(); }, 5000);
      return () => clearInterval(interval);
    }
  }, [candidates, loadData]);

  const calculateScore = useCallback((candidate: Candidate): number => {
    if (candidate.scoring?.overallScore) return Math.round(candidate.scoring.overallScore);
    return 0;
  }, []);

  const getInitials = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getCandidatePosition = (candidate: Candidate): string => {
    return candidate.structuredData?.datos_cv?.titular_profesional?.titular || 'N/A';
  };

  const getSkills = (candidate: Candidate): string[] => {
    const raw = candidate.structuredData?.datos_cv?.habilidades?.habilidades_tecnicas || [];
    return raw.map((s: any) => typeof s === 'string' ? s : s.skill || '').filter(Boolean);
  };

  const getExtraSkillsCount = (candidate: Candidate): number => {
    const skills = getSkills(candidate);
    return skills.length > 3 ? skills.length - 3 : 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  };

  const filteredCandidates = useMemo(() => {
    let result = [...candidates];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
      );
    }
    if (activeTabFilter === 'all') {
      result = result.filter(c => !hasCandidateProcess(c) && c.candidateStatus !== 'NOT_SELECTED');
    } else if (activeTabFilter === 'process') {
      result = result.filter(c => hasCandidateProcess(c) || c.candidateStatus === 'IN_PROCESS' || c.candidateStatus === 'SELECTED');
    } else if (activeTabFilter === 'top10') {
      result = result.filter(c => c.candidateStatus !== 'NOT_SELECTED' && !hasCandidateProcess(c))
        .sort((a, b) => calculateScore(b) - calculateScore(a))
        .slice(0, 10);
    } else if (activeTabFilter === 'new') {
      result = result.filter(c => c.candidateStatus === 'NEW' && !hasCandidateProcess(c));
    } else if (activeTabFilter === 'rejected') {
      result = result.filter(c => c.candidateStatus === 'NOT_SELECTED' && !hasCandidateProcess(c));
    }
    if (sortKey === 'match') result.sort((a, b) => calculateScore(b) - calculateScore(a));
    else if (sortKey === 'match-asc') result.sort((a, b) => calculateScore(a) - calculateScore(b));
    else if (sortKey === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return result;
  }, [candidates, activeTabFilter, searchQuery, sortKey, calculateScore]);

  useEffect(() => { setCurrentPage(1); }, [activeTabFilter, searchQuery]);

  const paginatedCandidates = filteredCandidates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);

  const handleCandidateSelect = async (candidate: Candidate) => {
    if (selectedCandidate?.id === candidate.id) { setSelectedCandidate(null); return; }
    setSelectedCandidate(candidate);
    setSelectedProcess(null);
    setCandidateCVData(null);
    let hasProcess = hasCandidateProcess(candidate);
    try {
      const fullCandidate = await apiService.getCandidate(candidate.id);
      const merged = hasCandidateProcess(fullCandidate)
        ? fullCandidate
        : hasProcess
          ? { ...fullCandidate, processInstances: candidate.processInstances }
          : fullCandidate;
      hasProcess = hasCandidateProcess(merged);
      setSelectedCandidate(prev => prev?.id === fullCandidate.id ? merged : prev);
    } catch (err) {}
    if (!hasProcess) {
      try {
        const processData = await apiService.getProcess(campaignId, candidate.id);
        setSelectedProcess(processData);
        setSelectedCandidate(prev => prev?.id === candidate.id
          ? { ...prev!, processInstances: [toCandidateProcessInfo(processData)] }
          : prev);
      } catch (err) {}
    }
    if (candidate.processingStatus === 'COMPLETED') {
      setLoadingCVData(true);
      try {
        const cvData = await apiService.getCandidateStructuredData(candidate.id);
        setCandidateCVData(cvData);
      } catch (err) {}
      setLoadingCVData(false);
    }
  };

  const handleCloseDrawer = () => setSelectedCandidate(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCandidate(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleStartProcess = async () => {
    if (!selectedCandidate || !campaignId) return;
    try {
      setStartingProcess(true);
      setStartProcessError(null);

      // Si el candidato ya tiene un proceso (ej. status desactualizado o iniciado
      // desde otro flujo), navegar directo al panel de proceso en vez de fallar.
      try {
        const existing = await apiService.getProcess(campaignId, selectedCandidate.id);
        setShowStartProcessModal(false);
        navigate(`/campaigns/${campaignId}/candidates/${selectedCandidate.id}/process`);
        return;
      } catch {}

      await apiService.startProcess({ campaignId, candidateId: selectedCandidate.id, notifyCandidate });
      setSnackbarMessage('¡Proceso iniciado exitosamente!');
      setShowStartProcessModal(false);
      const updatedCandidates = candidates.map(c =>
        c.id === selectedCandidate.id ? { ...c, candidateStatus: 'IN_PROCESS' as any } : c
      );
      setCandidates(updatedCandidates);
      if (selectedCandidate) setSelectedCandidate({ ...selectedCandidate, candidateStatus: 'IN_PROCESS' as any });
      navigate(`/campaigns/${campaignId}/candidates/${selectedCandidate.id}/process`);
    } catch (err: any) {
      setStartProcessError(err.message || 'Error al iniciar el proceso');
    } finally {
      setStartingProcess(false);
    }
  };

  const handleDismissCandidate = async (candidate: Candidate) => {
    setDismissingCandidates(prev => new Set(prev).add(candidate.id));
    await new Promise(resolve => setTimeout(resolve, 300));
    const previousStatus = candidate.candidateStatus;
    const updatedCandidates = candidates.map(c =>
      c.id === candidate.id ? { ...c, candidateStatus: 'NOT_SELECTED' as any } : c
    );
    setCandidates(updatedCandidates);
    setDismissingCandidates(prev => { const next = new Set(prev); next.delete(candidate.id); return next; });
    setSnackbarMessage('Candidato descartado');
    setShowSnackbarUndo(true);
    setUndoAction(() => async () => {
      const restoredCandidates = candidates.map(c =>
        c.id === candidate.id ? { ...c, candidateStatus: previousStatus } : c
      );
      setCandidates(restoredCandidates);
      setSnackbarMessage('Acción deshecha: Candidato restaurado');
      setShowSnackbarUndo(false);
      setUndoAction(null);
      try { await apiService.updateCandidateStatus(candidate.id, previousStatus); } catch (err) {}
    });
    try { await apiService.updateCandidateStatus(candidate.id, 'NOT_SELECTED'); } catch (err) {
      setCandidates(candidates);
      setError("Error al descartar candidato");
    }
    setTimeout(() => { setSnackbarMessage(''); setShowSnackbarUndo(false); setUndoAction(null); }, 5000);
  };

  const handleRestoreCandidate = async (candidate: Candidate) => {
    try {
      const updatedCandidates = candidates.map(c =>
        c.id === candidate.id ? { ...c, candidateStatus: 'NEW' as any } : c
      );
      setCandidates(updatedCandidates);
      await apiService.updateCandidateStatus(candidate.id, 'NEW');
      setSnackbarMessage('Candidato restaurado a la lista principal');
      setTimeout(() => setSnackbarMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al restaurar candidato');
      loadData();
    }
  };

  const handleViewProcess = () => {
    if (selectedCandidate) navigate(`/campaigns/${campaignId}/candidates/${selectedCandidate.id}/process`);
  };

  const handleRescoreAll = () => setShowRescoreConfirm(true);

  const confirmRescoreAll = async () => {
    setShowRescoreConfirm(false);
    setRescoringAll(true);
    setRescoreProgress(null);
    setPollingTimedOut(false);
    try {
      await apiService.rescoreCampaign(campaignId);
      setSnackbarMessage('Reevaluación iniciada para todos los candidatos');
      setIsPolling(true);
      await loadData();
    } catch (err) {
      setSnackbarMessage('Error al iniciar reevaluación');
    } finally {
      setRescoringAll(false);
    }
  };

  const handleDismissRescoreResult = () => {
    setRescoreProgress(null); setIsPolling(false); setPollingTimedOut(false);
  };

  useEffect(() => {
    if (!isPolling) return;
    const startTime = Date.now();
    const TIMEOUT_MS = 60000;
    const interval = setInterval(async () => {
      try {
        const status = await apiService.getRescoreStatus(campaignId);
        setRescoreProgress(status);
        if (status.current >= status.total) {
          setIsPolling(false); setPollingTimedOut(false);
          setSnackbarMessage(`¡${status.total} candidatos reevaluados!`);
          setTimeout(() => setSnackbarMessage(''), 4000);
          await loadData();
          clearInterval(interval);
        } else if (Date.now() - startTime > TIMEOUT_MS) {
          setPollingTimedOut(true); setIsPolling(false); clearInterval(interval);
        }
      } catch (err) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [isPolling, campaignId, loadData]);

  const rescoreSingle = async (candidateId: string) => {
    setRescoresInProgress(prev => new Set(prev).add(candidateId));
    try {
      await apiService.rescoreCandidate(candidateId);
      setSnackbarMessage('Candidato reevaluado correctamente');
      loadData();
    } catch (err: any) {
      setSnackbarMessage(err?.message?.includes('402') ? 'Créditos insuficientes.' : 'Error al reevaluar');
    } finally {
      setRescoresInProgress(prev => { const next = new Set(prev); next.delete(candidateId); return next; });
    }
  };

  const handleLikeCandidate = async (candidate: Candidate) => {
    try {
      await apiService.updateCandidateStatus(candidate.id, 'IN_PROCESS');
      const updated = candidates.map(c => c.id === candidate.id ? { ...c, candidateStatus: 'IN_PROCESS' as any } : c);
      setCandidates(updated);
      setSnackbarMessage(`Candidato movido a entrevista.`);
      setTimeout(() => setSnackbarMessage(''), 3000);
    } catch (err) {}
  };

  // Score ring component for table
  const TableScoreRing: React.FC<{ score: number }> = ({ score }) => {
    const size = 42, stroke = 3.5;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const off = c * (1 - Math.min(100, Math.max(0, score)) / 100);
    const tone = score >= 80 ? 'good' : score >= 60 ? 'mid' : 'low';
    const color = tone === 'good' ? 'var(--good)' : tone === 'mid' ? 'var(--mid)' : 'var(--low)';
    return (
      <span className="relative grid h-[42px] w-[42px] place-items-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block h-full w-full -rotate-90" aria-hidden="true">
          <circle className="ring-track" cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c.toFixed(1)} strokeDashoffset={off.toFixed(1)} />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-sans text-[12px] font-bold text-ink t-ink">{score}</span>
      </span>
    );
  };

  if (loading && candidates.length === 0) {
    return (
      <Layout showNavBar={true} showFooter={true}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-line2 border-t-green t-line2" />
            <p className="text-sm font-medium text-ink2 t-ink2">Cargando candidatos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalCandidates = candidates.filter(c => c.candidateStatus !== 'NOT_SELECTED').length;
  const inProcess = candidates.filter(c => hasCandidateProcess(c) || c.candidateStatus === 'IN_PROCESS' || c.candidateStatus === 'SELECTED').length;
  const toReview = candidates.filter(c => c.candidateStatus === 'NEW' && !hasCandidateProcess(c)).length;
  const rejected = candidates.filter(c => c.candidateStatus === 'NOT_SELECTED' && !hasCandidateProcess(c)).length;

  const sortLabels: Record<string, string> = { match: 'Match', 'match-asc': 'Match', name: 'Nombre' };

  return (
    <>
      <Layout showNavBar={true} showFooter={true}>
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-60 bg-grain opacity-[0.045] mix-blend-overlay" />

        <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        {/* BREADCRUMB */}
        <div className="mb-4 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">
          <button onClick={onBack} className="transition hover:text-ink2">Campañas</button>
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          <span className="truncate text-ink2 t-ink2">{campaign?.title || 'Campaña'}</span>
        </div>

        {/* HEADER */}
        <div className="flex items-start gap-3">
          <button onClick={onBack} aria-label="Volver a campañas"
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line2 bg-card text-ink2 transition hover:border-ink hover:text-ink t-card t-ink2 t-line2">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
          </button>
          <div className="min-w-0">
            <h1 className="font-serif text-[1.7rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.1rem] t-ink">
              {campaign?.title || 'Cargando...'}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11.5px] text-ink3 t-ink3">
              <span>Creada {campaign ? formatDate(campaign.createdAt) : '—'}</span>
              <span className="text-line2">·</span>
              <span><b className="text-ink t-ink">{candidates.length}</b> candidatos</span>
              <span className="text-line2">·</span>
              <span>100% remoto</span>
            </p>
          </div>
        </div>

        {/* CAMPAIGN BANNER */}
        <section className="camp-banner relative mt-5 overflow-hidden rounded-3xl border border-onmark/10 bg-greendeep p-6 text-onmark shadow-card sm:p-7">
          <div aria-hidden="true" className="camp-glow pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full" style={{ background: 'radial-gradient(circle, rgba(243,233,78,.22), rgba(243,233,78,0) 70%)' }} />
          <div aria-hidden="true" className="camp-glow pointer-events-none absolute -bottom-28 -left-20 h-60 w-60 rounded-full" style={{ background: 'radial-gradient(circle, rgba(91,174,136,.20), rgba(91,174,136,0) 70%)' }} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(28,91,68,0) 35%, rgba(28,91,68,.5) 100%)' }} />
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full text-onmark opacity-[0.07]" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="1">
            <g><line x1="40" y1="40" x2="150" y2="30"/><line x1="150" y1="30" x2="260" y2="70"/><line x1="260" y1="70" x2="380" y2="38"/><line x1="380" y1="38" x2="500" y2="90"/><line x1="260" y1="70" x2="320" y2="130"/><line x1="150" y1="30" x2="90" y2="120"/><line x1="90" y1="120" x2="210" y2="150"/><line x1="210" y1="150" x2="320" y2="130"/><line x1="320" y1="130" x2="450" y2="170"/><line x1="500" y1="90" x2="450" y2="170"/></g>
            <g fill="currentColor" stroke="none"><circle cx="40" cy="40" r="2.4"/><circle cx="380" cy="38" r="2.4"/><circle cx="500" cy="90" r="2.4"/><circle cx="90" cy="120" r="2.4"/><circle cx="320" cy="130" r="2.4"/><circle cx="450" cy="170" r="2.4"/><circle className="animate-nodepulse" cx="150" cy="30" r="3.2"/><circle className="animate-nodepulse" cx="260" cy="70" r="3.2" style={{ animationDelay: '.9s' }}/><circle className="animate-nodepulse" cx="210" cy="150" r="3.2" style={{ animationDelay: '1.7s' }}/></g>
          </svg>
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 lg:max-w-[60%]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-good/55 px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-wide text-onmark">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow animate-pulsering" /> {campaign?.status === 'ACTIVE' ? 'Activa' : 'Pausada'}
                </span>
                <span className="font-mono text-[11px] text-onmark/70">Rúbrica generada · {candidates.filter(c => c.scoring?.overallScore).length} evaluados</span>
              </div>
              <div className="relative">
                <div className={`camp-desc mt-3 text-[14px] leading-relaxed text-onmark/85 ${isDescriptionExpanded ? 'expanded' : ''}`}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(unescapeHtml(campaign?.description || '')) }} />
                {campaign?.description && campaign.description.length > 200 && (
                  <button type="button" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] font-medium text-yellow transition hover:gap-1.5">
                    <span>{isDescriptionExpanded ? 'Leer menos' : 'Leer más'}</span>
                    <svg className={`h-3.5 w-3.5 transition-transform ${isDescriptionExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              <button type="button" onClick={handleExportCandidates}
                className="inline-flex items-center gap-2 rounded-xl border border-onmark/25 bg-onmark/10 px-3.5 py-2.5 text-[13px] font-semibold text-onmark backdrop-blur-sm transition hover:bg-onmark/20">
                <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M8 11l4 4 4-4M5 21h14"/></svg> Exportar
              </button>
              <button type="button" onClick={handleCopyLink}
                className="inline-flex items-center gap-2 rounded-xl border border-onmark/25 bg-onmark/10 px-3.5 py-2.5 text-[13px] font-semibold text-onmark backdrop-blur-sm transition hover:bg-onmark/20">
                <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-6-6l-1 1"/><path d="M14 11a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 6 6l1-1"/></svg> Copiar enlace
              </button>
              <button type="button" onClick={() => window.open(`/apply/${campaign?.publicId}`, '_blank')}
                className="inline-flex items-center gap-2 rounded-xl bg-yellow px-3.5 py-2.5 text-[13px] font-semibold text-greendeep transition hover:-translate-y-0.5">
                <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg> Ver formulario
              </button>
            </div>
          </div>
        </section>

        {/* STATS CARDS */}
        <section className="mt-5 grid grid-cols-2 gap-3.5 xl:grid-cols-4" aria-label="Resumen de la campaña">
          <article onClick={() => setActiveTabFilter('all')}
            className={`rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-soft cursor-pointer t-card t-line ${activeTabFilter === 'all' ? 'ring-2 ring-green/30' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-ink3 t-ink3">Total</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-greentint text-green t-goodt t-green">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.5a3 3 0 0 1 0 5.5M17.5 19a5 5 0 0 0-3-4.6"/></svg>
              </span>
            </div>
            <div className="mt-3"><span className="font-sans text-[2.2rem] font-bold leading-none tracking-tight tabular-nums text-ink t-ink">{totalCandidates}</span></div>
            <p className="mt-1.5 text-[12px] text-ink2 t-ink2">candidatos evaluados</p>
          </article>
          <article onClick={() => setActiveTabFilter('process')}
            className={`rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-soft cursor-pointer t-card t-line ${activeTabFilter === 'process' ? 'ring-2 ring-green/30' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-ink3 t-ink3">En proceso</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-goodt text-good t-goodt t-good">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>
              </span>
            </div>
            <div className="mt-3"><span className="font-sans text-[2.2rem] font-bold leading-none tracking-tight tabular-nums text-ink t-ink">{inProcess}</span></div>
            <p className="mt-1.5 text-[12px] text-ink2 t-ink2">en entrevista</p>
          </article>
          <article onClick={() => setActiveTabFilter('new')}
            className="relative overflow-hidden rounded-2xl border border-line bg-greendeep p-5 text-onmark cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-onmark/70">Por revisar</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-onmark/15 text-yellow">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              </span>
            </div>
            <div className="mt-3"><span className="font-sans text-[2.2rem] font-bold leading-none tracking-tight tabular-nums">{toReview}</span></div>
            <p className="mt-1.5 text-[12px] text-onmark/75">esperan tu decisión</p>
          </article>
          <article onClick={() => setActiveTabFilter('rejected')}
            className={`rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-soft cursor-pointer t-card t-line ${activeTabFilter === 'rejected' ? 'ring-2 ring-low/30' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-ink3 t-ink3">Descartados</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-lowt text-low t-lowt t-low">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>
              </span>
            </div>
            <div className="mt-3"><span className="font-sans text-[2.2rem] font-bold leading-none tracking-tight tabular-nums text-ink t-ink">{rejected}</span></div>
            <p className="mt-1.5 text-[12px] text-ink2 t-ink2">no aplican al cargo</p>
          </article>
        </section>

        {/* RESCORE BANNERS */}
        {(isRescoreActive || rescoreCompleted) && rescoreProgress && (
          <div className="mt-5 rounded-2xl border border-mid/30 bg-midt/50 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {rescoreCompleted ? (
                  <CheckCircleIcon className="h-5 w-5 text-good" />
                ) : pollingTimedOut ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-mid" />
                ) : (
                  <ArrowPathIcon className="h-5 w-5 text-mid animate-spin" />
                )}
                <div>
                  <p className="text-sm font-semibold text-mid t-mid">
                    {rescoreCompleted ? `¡${rescoreProgress.current}/${rescoreProgress.total} reevaluados!` :
                     pollingTimedOut ? 'El proceso continúa en segundo plano' :
                     `Reevaluando... ${rescoreProgress.current}/${rescoreProgress.total}`}
                  </p>
                  {!rescoreCompleted && !pollingTimedOut && (
                    <p className="text-xs text-mid/70 mt-0.5">Consumiendo créditos CV...</p>
                  )}
                </div>
              </div>
              {rescoreCompleted && (
                <button onClick={handleDismissRescoreResult}
                  className="inline-flex items-center gap-2 rounded-xl bg-good px-3.5 py-2 text-[13px] font-semibold text-onmark transition hover:bg-green">
                  <CheckIcon className="h-4 w-4" /> Aceptar
                </button>
              )}
            </div>
            {!rescoreCompleted && !pollingTimedOut && (
              <div className="mt-3 w-full rounded-full bg-mid/20 h-2.5 overflow-hidden">
                <div className="bg-mid h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.round((rescoreProgress.current / rescoreProgress.total) * 100)}%` }} />
              </div>
            )}
          </div>
        )}

        {!isRescoreActive && !rescoreCompleted && outdatedCount > 0 && (
          <div className="mt-5 rounded-2xl border border-mid/30 bg-midt/50 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-mid" />
                <div>
                  <p className="text-sm text-mid t-mid">
                    <span className="font-semibold">{outdatedCount} candidatos</span> necesitan reevaluación tras los cambios en la campaña
                  </p>
                  {availableCredits <= 0 && (
                    <p className="text-xs text-mid/70 mt-1 font-medium">No tienes créditos CV disponibles para reevaluarlos.</p>
                  )}
                </div>
              </div>
              <button onClick={handleRescoreAll} disabled={rescoringAll}
                className="inline-flex items-center gap-2 rounded-xl bg-cta px-3.5 py-2 text-[13px] font-semibold text-ctatext shadow-cta transition hover:bg-ctah disabled:opacity-50">
                <ArrowPathIcon className={`h-4 w-4 ${rescoringAll ? 'animate-spin' : ''}`} />
                {rescoringAll ? 'Reevaluando...' : 'Reevaluar Todos'}
              </button>
            </div>
          </div>
        )}

        {/* CANDIDATES TABLE SECTION */}
        <section className="mt-5 overflow-hidden rounded-3xl border border-line bg-card shadow-soft t-card t-line">
          {/* TOOLBAR */}
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 t-line">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1" role="tablist" aria-label="Filtrar candidatos">
                {[
                  { key: 'all' as FilterTab, label: 'Todos', icon: null },
                  { key: 'top10' as FilterTab, label: 'Top 10', icon: (
                    <svg className="h-3.5 w-3.5 text-mid t-mid" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.8 6.1 20.2l1.2-6.6L2.5 9l6.6-.9z"/></svg>
                  )},
                  { key: 'process' as FilterTab, label: 'En proceso', icon: (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>
                  )},
                  { key: 'new' as FilterTab, label: 'Por revisar', icon: (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                  )},
                  { key: 'rejected' as FilterTab, label: 'Descartados', icon: (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>
                  )}
                ].map(tab => (
                  <button key={tab.key} role="tab" aria-selected={activeTabFilter === tab.key} onClick={() => setActiveTabFilter(tab.key)}
                    className={`tab-btn inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                      activeTabFilter === tab.key
                        ? `bg-greentint text-green t-goodt t-green ${tab.key === 'new' ? 'ring-2 ring-yellow/40' : ''}`
                        : 'text-ink2 hover:bg-paper2 t-ink2'
                    }`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink3">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>
                  </span>
                  <input type="search" placeholder="Buscar candidato…" aria-label="Buscar candidato" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-44 rounded-xl border border-line2 bg-paper/60 py-2 pl-9 pr-3 text-[13px] text-ink placeholder:text-ink3/80 transition focus:w-56 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-ink t-line2 sm:w-52" />
                </div>
                <button type="button" onClick={() => {
                  const order: Array<'match' | 'match-asc' | 'name'> = ['match', 'match-asc', 'name'];
                  const idx = order.indexOf(sortKey);
                  setSortKey(order[(idx + 1) % order.length]);
                }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line2 bg-paper/60 px-3 py-2 text-[12.5px] font-medium text-ink2 transition hover:border-ink3 t-ink2 t-line2" title="Cambiar orden">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v16M7 4 4 7M7 4l3 3M17 20V4M17 20l3-3M17 20l-3-3"/></svg>
                  <span>{sortLabels[sortKey]}</span>
                </button>
              </div>
            </div>
          </div>

          {/* GRID HEADER */}
          <div className="hidden grid-cols-[1.6fr_1.4fr_96px_120px_120px] items-center gap-4 border-b border-line px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.13em] text-ink3 md:grid t-line t-ink3">
            <span>Candidato</span><span>Habilidades clave</span><span className="text-right">Match</span><span>Etapa</span><span className="text-right">Acciones</span>
          </div>

          {/* CANDIDATES LIST */}
          <ul id="candList" className="divide-y divide-line t-line">
            {paginatedCandidates.map(candidate => {
              const score = calculateScore(candidate);
              const isProcessing = candidate.processingStatus === 'PENDING' || candidate.processingStatus === 'PROCESSING';
              const isDismissed = candidate.candidateStatus === 'NOT_SELECTED';
              const hasProcess = hasCandidateProcess(candidate);
              const stage = hasProcess
                ? STAGES.entrevista
                : (STAGES[mapStage(candidate.candidateStatus)] || STAGES.revision);
              const stageLabel = hasProcess ? (getActiveStageName(candidate) || 'En proceso') : stage.label;
              const skills = getSkills(candidate);
              const extra = getExtraSkillsCount(candidate);
              const showSkills = skills.slice(0, 3);
              const isDismissing = dismissingCandidates.has(candidate.id);
              const animationClass = isDismissing ? 'opacity-0 scale-95 translate-x-4 pointer-events-none' : 'opacity-100 scale-100 translate-x-0';

              return (
                <li key={candidate.id}
                  className={`group grid grid-cols-1 gap-3 px-4 py-3.5 transition hover:bg-paper2/60 md:grid-cols-[1.6fr_1.4fr_96px_120px_120px] md:items-center md:gap-4 md:px-5 ${animationClass} ${isDismissed ? 'opacity-70' : ''}`}>
                  
                  {/* Candidate column */}
                  <button type="button" onClick={() => !isProcessing && handleCandidateSelect(candidate)}
                    className="flex min-w-0 items-center gap-3 text-left">
                    <span className="relative shrink-0">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-green font-mono text-[14px] font-semibold text-onmark ring-2 ring-paper2 t-good">
                        {getInitials(candidate.name)}
                      </span>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card ${stage.dot}`} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-sans text-[14.5px] font-semibold text-ink t-ink">{candidate.name}</span>
                      <span className="block truncate font-mono text-[11px] text-ink3 t-ink3">{getCandidatePosition(candidate)}</span>
                    </span>
                  </button>

                  {/* Skills column */}
                  <div className="flex flex-wrap items-center gap-1.5 pl-14 md:pl-0">
                    {showSkills.length > 0 ? (
                      <>
                        {showSkills.map((s: string, i: number) => (
                          <span key={i} className="rounded-md bg-greentint px-2 py-0.5 font-mono text-[11px] text-green t-goodt t-green">{s}</span>
                        ))}
                        {extra > 0 && <span className="rounded-md bg-paper2 px-2 py-0.5 font-mono text-[11px] text-ink2 t-paper2 t-ink2">+{extra}</span>}
                      </>
                    ) : (
                      <span className="text-[12.5px] italic text-ink3 t-ink3">Sin habilidades detectadas</span>
                    )}
                  </div>

                  {/* Score column */}
                  <div className="flex items-center justify-start gap-2.5 pl-14 md:justify-end md:pl-0">
                    {isProcessing ? (
                      <ArrowPathIcon className="h-5 w-5 text-green animate-spin" />
                    ) : (
                      <TableScoreRing score={score} />
                    )}
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink3 md:hidden t-ink3">match</span>
                  </div>

                  {/* Stage column */}
                  <div className="pl-14 md:pl-0">
                    <span className={`inline-flex items-center gap-1.5 rounded-full ${stage.chip} px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-wide`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${stage.dot}`} />{stageLabel}
                    </span>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center justify-start gap-1.5 pl-14 md:justify-end md:pl-0">
                    <button type="button" onClick={() => handleCandidateSelect(candidate)} aria-label="Ver perfil" title="Ver perfil"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-ink2 transition hover:border-green hover:text-green t-ink2 t-line2">
                      <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    {candidate.candidateStatus === 'NEW' && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleLikeCandidate(candidate); }} aria-label="Mover a entrevista" title="Mover a entrevista"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-ink3 transition hover:border-green hover:bg-goodt hover:text-green t-ink3 t-line2">
                        <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 2 2v3h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/></svg>
                      </button>
                    )}
                    {candidate.candidateStatus === 'NOT_SELECTED' ? (
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleRestoreCandidate(candidate); }} aria-label="Restaurar" title="Restaurar"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-ink3 transition hover:border-green hover:bg-goodt hover:text-green t-ink3 t-line2">
                        <ArrowUturnLeftIcon className="h-[17px] w-[17px]" />
                      </button>
                    ) : candidate.candidateStatus !== 'NEW' && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleDismissCandidate(candidate); }} aria-label="Descartar" title="Descartar"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-ink3 transition hover:border-low hover:bg-lowt hover:text-low t-ink3 t-line2">
                        <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 13V4h3v9zM17 13l-4 7a2 2 0 0 1-2-2v-3H6a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 7.2 4H17"/></svg>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* EMPTY STATE */}
          {filteredCandidates.length === 0 && (
            <div className="px-6 py-14 text-center">
              <p className="font-sans text-lg font-semibold tracking-tight text-ink t-ink">Sin candidatos en esta vista.</p>
              <p className="mt-1 text-sm text-ink2 t-ink2">Prueba otro filtro o limpia la búsqueda.</p>
            </div>
          )}

          {/* PAGINATION */}
          {filteredCandidates.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5 t-line">
              <span className="font-mono text-[11.5px] text-ink3 t-ink3">
                Mostrando {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredCandidates.length)} de {filteredCandidates.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line2 px-3 py-1.5 text-[12.5px] font-medium text-ink2 transition hover:border-ink3 disabled:cursor-not-allowed disabled:opacity-40 t-ink2 t-line2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> Anterior
                </button>
                <span className="px-2 font-mono text-[11.5px] text-ink3 t-ink3">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line2 px-3 py-1.5 text-[12.5px] font-medium text-ink2 transition hover:border-ink3 disabled:cursor-not-allowed disabled:opacity-40 t-ink2 t-line2">
                  Siguiente <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </Layout>

    {/* DRAWER */}
    <CandidateDrawer
      isOpen={!!selectedCandidate}
      candidate={selectedCandidate as any}
      campaign={campaign || undefined}
      onClose={() => setSelectedCandidate(null)}
      onDismiss={handleDismissCandidate}
      onStartProcess={() => { setStartProcessError(null); setShowStartProcessModal(true); }}
      onViewAIAnalysis={(c) => onViewCandidate?.(c.id)}
      onViewProcess={handleViewProcess}
      loading={loadingCVData}
    />

    {/* MODAL START PROCESS */}
    {showStartProcessModal && (
      <div className="fixed inset-0 z-90 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-fadein">
        <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-card t-card t-line animate-fadein">
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-greentint text-green t-goodt">
              <PlayIcon className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-[1.3rem] font-semibold text-ink t-ink">Iniciar proceso</h3>
            <p className="mt-1 text-sm text-ink2 t-ink2">
              Esto moverá a <strong className="text-ink t-ink">{selectedCandidate?.name}</strong> a la etapa de entrevista.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3 rounded-xl border border-line2 bg-paper/60 p-3 t-line2">
              <input id="notifyCand" type="checkbox" checked={notifyCandidate} onChange={e => setNotifyCandidate(e.target.checked)}
                className="h-4 w-4 rounded border-line2 text-green focus:ring-green" />
              <label htmlFor="notifyCand" className="text-[12.5px] text-ink2 t-ink2">Notificar al candidato</label>
            </div>
            {startProcessError && (
              <p role="alert" className="mt-3 rounded-xl border border-low/30 bg-lowt px-3 py-2 text-[12.5px] font-medium text-low t-lowt t-low">
                {startProcessError}
              </p>
            )}
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={() => setShowStartProcessModal(false)}
              className="flex-1 rounded-xl border border-line2 bg-card py-2.5 text-[13px] font-semibold text-ink2 transition hover:bg-paper2 t-card t-ink2 t-line2">Cancelar</button>
            <button onClick={handleStartProcess} disabled={startingProcess}
              className="flex-1 rounded-xl bg-cta py-2.5 text-[13px] font-semibold text-ctatext shadow-cta transition hover:bg-ctah disabled:opacity-50 flex items-center justify-center gap-2">
              {startingProcess ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL RESCORE CONFIRM */}
    {showRescoreConfirm && (
      <div className="fixed inset-0 z-90 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-fadein">
        <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-card t-card t-line animate-fadein">
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-midt text-mid t-midt">
              <ExclamationTriangleIcon className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-[1.3rem] font-semibold text-ink t-ink">¿Reevaluar todos?</h3>
            <div className="mt-4 space-y-2 text-left text-[13px]">
              <div className="flex justify-between"><span className="text-ink2 t-ink2">Candidatos a reevaluar</span><span className="font-semibold text-ink t-ink">{outdatedCount}</span></div>
              <div className="flex justify-between"><span className="text-ink2 t-ink2">Créditos necesarios</span><span className="font-semibold text-ink t-ink">{cost}</span></div>
              <div className="flex justify-between"><span className="text-ink2 t-ink2">Créditos disponibles</span><span className={`font-semibold ${availableCredits > 0 ? 'text-good' : 'text-low'} t-${availableCredits > 0 ? 'good' : 'low'}`}>{availableCredits}</span></div>
              <hr className="border-line t-line" />
              <div className="flex justify-between"><span className="text-ink2 t-ink2">Créditos después</span><span className={`font-semibold ${creditsAfter >= 0 ? 'text-ink' : 'text-low'} t-${creditsAfter >= 0 ? 'ink' : 'low'}`}>{creditsAfter >= 0 ? creditsAfter : `Faltan ${Math.abs(creditsAfter)}`}</span></div>
            </div>
            {cost > availableCredits && (
              <div className="mt-3 rounded-xl border border-low/30 bg-lowt p-3 t-lowt">
                <p className="text-[12px] font-medium text-low t-low">No tienes suficientes créditos. Te faltan {cost - availableCredits}.</p>
              </div>
            )}
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={() => setShowRescoreConfirm(false)}
              className="flex-1 rounded-xl border border-line2 bg-card py-2.5 text-[13px] font-semibold text-ink2 transition hover:bg-paper2 t-card t-ink2 t-line2">Cancelar</button>
            <button onClick={confirmRescoreAll} disabled={cost > availableCredits || rescoringAll}
              className="flex-1 rounded-xl bg-cta py-2.5 text-[13px] font-semibold text-ctatext shadow-cta transition hover:bg-ctah disabled:opacity-50 flex items-center justify-center gap-2">
              {rescoringAll ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : 'Reevaluar'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* SNACKBAR */}
    {snackbarMessage && (
      <div aria-live="polite" role="status"
        className="pointer-events-auto fixed inset-x-4 bottom-5 z-100 mx-auto flex max-w-sm items-start gap-3 rounded-xl border border-line2 bg-card px-4 py-3 text-[13.5px] text-ink shadow-card transition-all duration-300 sm:inset-x-auto sm:right-6 sm:max-w-sm t-card t-ink t-line2 animate-fadein">
        <span className="mt-0.5 shrink-0">
          <svg className="h-4 w-4 text-good" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
        <span className="leading-snug">{snackbarMessage}</span>
        {showSnackbarUndo && undoAction && (
          <button onClick={() => undoAction()}
            className="ml-auto shrink-0 rounded-lg border border-line2 bg-paper/60 px-2.5 py-1 text-[11px] font-bold text-ink2 transition hover:bg-paper2 t-ink2 t-line2">
            DESHACER
          </button>
        )}
      </div>
    )}
  </>
);
};

export default CandidatesManagerNew;