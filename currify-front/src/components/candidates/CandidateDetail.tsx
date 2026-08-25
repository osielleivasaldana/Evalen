import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiService, Candidate, CVData } from '../../services/api';
import { findKeyFinding, hasNegativeMarkers } from '../../utils/findKeyFinding';
import { STAGES, mapStage } from '../../constants/stages';
import Layout from '../layout/Layout';
import Verdict from '../Verdict';

interface CandidateDetailProps {
  candidateId: string;
  onBack: () => void;
}

interface DatosContacto { nombre_completo?: string; email?: string; telefono?: string; ubicacion?: string; }
interface TitularProfesional { titular?: string; }
interface ResumenProfesional { resumen?: string; }
interface HabilidadesTecnicas { skill: string; level: string; years_experience: number | null; metadata: any; }
interface Idiomas { idioma: string; nivel: string; certificacion: string; metadata: any; }
interface Habilidades { habilidades_tecnicas: HabilidadesTecnicas[]; idiomas: Idiomas[]; habilidades_blandas: any[]; metadata?: any; }
interface ExperienciaLaboral { cargo: string; empresa: string; periodo: { fecha_inicio: string; fecha_fin: string; texto_original: string; metadata: any; }; responsabilidades: string[]; ubicacion: string | null; metadata: any; }
interface FormacionAcademica { titulo: string; institucion: string; periodo: { fecha_inicio: string | null; fecha_fin: string | null; texto_original: string; metadata: any; }; gpa: string | null; ubicacion: string | null; metadata: any; }
interface FormacionComplementaria { certificaciones_cursos: string[]; }

const CRITERIA_LABELS: Record<string, { label: string; target: string }> = {
  education: { label: 'Educación', target: 'formacion' },
  logistics: { label: 'Logística', target: 'resumen' },
  experience: { label: 'Experiencia', target: 'experiencia' },
  cultural_fit: { label: 'Cultural Fit', target: 'resumen' },
  skills_match: { label: 'Skills Match', target: 'habilidades' },
  career_trajectory: { label: 'Career Trajectory', target: 'experiencia' },
};

const toneOf = (v: number) => v >= 80 ? 'good' : v >= 60 ? 'mid' : 'low';

const toneColor = (t: string) => {
  if (t === 'good') return 'bg-good t-good';
  if (t === 'mid') return 'bg-mid t-mid';
  return 'bg-low t-low';
};

const toneBgTint = (t: string) => {
  if (t === 'good') return 'bg-goodt t-goodt';
  if (t === 'mid') return 'bg-midt t-midt';
  return 'bg-lowt t-lowt';
};

const toneText = (t: string) => {
  if (t === 'good') return 'text-good t-good';
  if (t === 'mid') return 'text-mid t-mid';
  return 'text-low t-low';
};

const toneDot = (t: string) => {
  if (t === 'good') return 'bg-good t-good';
  if (t === 'mid') return 'bg-mid t-mid';
  return 'bg-low t-low';
};

const levelDot = (lvl: string) => {
  const n = (lvl || '').toLowerCase();
  if (n === 'avanzado' || n === 'advanced' || n === 'experto') return 'bg-good t-good';
  if (n === 'intermedio' || n === 'intermediate') return 'bg-mid t-mid';
  return 'bg-low t-low';
};

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatPeriod = (period: any) => {
  if (!period) return 'Fechas no informadas';
  const fmt = (s: string) => {
    if (!s) return 'N/A';
    if (s.toLowerCase() === 'presente' || s.toLowerCase() === 'actualidad') return 'Presente';
    if (/^\d{4}$/.test(s)) return s;
    const m = /^(\d{4})-(\d{2})$/.exec(s);
    if (m) return m[1];
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : String(d.getFullYear());
  };
  const inicio = fmt(period.fecha_inicio);
  const fin = fmt(period.fecha_fin || 'Presente');
  if (inicio === 'N/A' && fin === 'N/A') return 'Fechas no informadas';
  return `${inicio} – ${fin}`;
};

const getYears = (el: ExperienciaLaboral[]) => {
  if (!el.length) return 0;
  const years = el.map(e => {
    const s = e.periodo?.fecha_inicio ? new Date(e.periodo.fecha_inicio).getFullYear() : NaN;
    const f = e.periodo?.fecha_fin && e.periodo.fecha_fin.toLowerCase() !== 'presente' ? new Date(e.periodo.fecha_fin).getFullYear() : new Date().getFullYear();
    return isNaN(s) ? 0 : f - s;
  });
  return Math.max(0, ...years);
};

const isLatest = (exp: ExperienciaLaboral, all: ExperienciaLaboral[]) => {
  if (!exp.periodo?.fecha_inicio) return false;
  const dates = all.filter(e => e.periodo?.fecha_inicio).map(e => new Date(e.periodo.fecha_inicio).getTime());
  if (!dates.length) return false;
  const latest = Math.max(...dates);
  return new Date(exp.periodo.fecha_inicio).getTime() === latest;
};

const useIntersectionReveal = (loading: boolean) => {
  useEffect(() => {
    if (loading) return;
    const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const els = document.querySelectorAll('.reveal');
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          const bars = (e.target as HTMLElement).querySelectorAll('.bar-fill');
          bars.forEach(b => { const w = b.getAttribute('data-w'); if (w) (b as HTMLElement).style.width = w; });
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    els.forEach(el => io.observe(el));
    const critHost = document.getElementById('criteria');
    if (critHost) {
      const cio = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.querySelectorAll('.bar-fill').forEach(b => { const w = b.getAttribute('data-w'); if (w) (b as HTMLElement).style.width = w; });
            cio.disconnect();
          }
        });
      }, { threshold: 0.15 });
      cio.observe(critHost);
    }
    return () => io.disconnect();
  }, [loading]);
};

const useScrollspy = (loading: boolean, setActiveSection: (s: string) => void) => {
  useEffect(() => {
    if (loading) return;
    const secs = document.querySelectorAll('[data-section]');
    if (!('IntersectionObserver' in window) || !secs.length) { setActiveSection('resumen'); return; }
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) setActiveSection(en.target.getAttribute('data-section') || 'resumen'); });
    }, { rootMargin: '-132px 0px -55% 0px', threshold: 0 });
    secs.forEach(s => spy.observe(s));
    return () => spy.disconnect();
  }, [loading]);
};

const CandidateDetail: React.FC<CandidateDetailProps> = ({ candidateId, onBack }) => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [cvData, setCvData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCriteria, setOpenCriteria] = useState<Record<number, boolean>>({});
  const [activeSection, setActiveSection] = useState('resumen');
  const [animReady, setAnimReady] = useState(false);
  const [toast, setToast] = useState<{ msg: string; icon: string } | null>(null);
  const toastT = useRef<any>(null);
  const matchRef = useRef<HTMLSpanElement>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [notifyCandidate, setNotifyCandidate] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const [activeStage, setActiveStage] = useState<any>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [undoBar, setUndoBar] = useState<{ msg: string; undo: () => void } | null>(null);

  const loadCandidateData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [candidateData, structuredData] = await Promise.all([
        apiService.getCandidate(candidateId),
        apiService.getCandidateStructuredData(candidateId)
      ]);
      setCandidate(candidateData);
      setCvData(structuredData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos del candidato');
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => { loadCandidateData(); }, [loadCandidateData]);

  useEffect(() => {
    if (!loading && candidate) {
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimReady(true)));
    }
  }, [loading, candidate]);

  useEffect(() => {
    if (animReady && matchRef.current) {
      matchRef.current.style.width = matchRef.current.getAttribute('data-w') || '0%';
    }
  }, [animReady]);

  useIntersectionReveal(loading);
  useScrollspy(loading, setActiveSection);

  const showToast = (msg: string, type: string = 'info') => {
    const icons: Record<string, string> = {
      ok: '<svg class="h-4 w-4 text-good" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
      info: '<svg class="h-4 w-4 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
      warn: '<svg class="h-4 w-4 text-mid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>',
    };
    setToast({ msg, icon: icons[type] || icons.info });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 3200);
  };

  const campaignId = candidate?.campaign?.id;
  const candidateStatus = candidate?.candidateStatus;
  const isNew = candidateStatus === 'NEW';
  const isInProcess = candidateStatus === 'IN_PROCESS';
  const isTerminal = candidateStatus === 'SELECTED' || candidateStatus === 'NOT_SELECTED';

  const handleApproveClick = () => {
    if (!candidate || isTerminal) return;
    if (isNew) setStartOpen(true);
    else setAdvanceOpen(true);
  };

  const loadActiveStage = useCallback(async () => {
    if (!candidate || !campaignId) return;
    try {
      const process = await apiService.getProcess(campaignId, candidate.id);
      setActiveStage((process?.stageInstances || []).find((s: any) => s.status === 'ACTIVE') || null);
    } catch {
      setActiveStage(null);
    }
  }, [candidate, campaignId]);

  useEffect(() => {
    if (advanceOpen) loadActiveStage();
  }, [advanceOpen, loadActiveStage]);

  const handleStartProcess = async () => {
    if (!candidate || !campaignId || actionBusy) return;
    setActionBusy(true);
    try {
      await apiService.startProcess({ campaignId, candidateId: candidate.id, notifyCandidate });
      setCandidate({ ...candidate, candidateStatus: 'IN_PROCESS' as any });
      setStartOpen(false);
      showToast('Proceso iniciado. Candidato en entrevista.', 'ok');
    } catch (err: any) {
      showToast(err.message || 'Error al iniciar el proceso.', 'warn');
    } finally {
      setActionBusy(false);
    }
  };

  const handleAdvance = async () => {
    if (!candidate || !campaignId || actionBusy || !activeStage) return;
    setActionBusy(true);
    try {
      await apiService.updateStageDecision(activeStage.id, { decision: 'ACCEPTED' });
      setAdvanceOpen(false);
      showToast(`Etapa "${activeStage.stageTemplate?.name || ''}" aprobada.`, 'ok');
      setCandidate(await apiService.getCandidate(candidate.id));
    } catch (err: any) {
      showToast(err.message || 'Error al aprobar la etapa.', 'warn');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDiscard = async () => {
    if (!candidate || actionBusy) return;
    const previousStatus = candidate.candidateStatus;
    setActionBusy(true);
    try {
      await apiService.updateCandidateStatus(candidate.id, 'NOT_SELECTED', discardReason.trim() || undefined);
      setCandidate({ ...candidate, candidateStatus: 'NOT_SELECTED' as any });
      setDiscardOpen(false);
      setDiscardReason('');
      setUndoBar({
        msg: 'Candidato descartado.',
        undo: async () => {
          try { await apiService.updateCandidateStatus(candidate.id, previousStatus as any); } catch {}
          setCandidate(c => (c ? { ...c, candidateStatus: previousStatus as any } : c));
          setUndoBar(null);
          showToast('Acción deshecha: candidato restaurado.', 'ok');
        },
      });
      setTimeout(() => setUndoBar(null), 6000);
    } catch (err: any) {
      showToast(err.message || 'Error al descartar candidato.', 'warn');
    } finally {
      setActionBusy(false);
    }
  };

  const jumpTo = (key: string) => {
    const sec = document.querySelector(`[data-section="${key}"]`);
    if (!sec) return;
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const head = sec.querySelector('.sec-head');
    if (head) {
      head.classList.remove('sec-flash');
      void (head as HTMLElement).offsetWidth;
      head.classList.add('sec-flash');
      head.addEventListener('animationend', () => head.classList.remove('sec-flash'), { once: true });
    }
    setActiveSection(key);
  };

  const handleCopy = (key: string, val: string) => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(val).catch(() => {});
    showToast((key === 'email' ? 'Correo' : 'Teléfono') + ' copiado al portapapeles.', 'ok');
  };

  const actualCvData = cvData?.datos_cv || (cvData as any)?.structuredData?.datos_cv || {};
  const getDatosContacto = (): DatosContacto => actualCvData?.datos_contacto || {};
  const getTitularProfesional = (): TitularProfesional => actualCvData?.titular_profesional || {};
  const getResumenProfesional = (): ResumenProfesional => actualCvData?.resumen_profesional || {};
  const getHabilidades = (): Habilidades => (actualCvData?.habilidades as Habilidades) || { habilidades_tecnicas: [], idiomas: [], habilidades_blandas: [] };
  const getExperienciaLaboral = (): ExperienciaLaboral[] => (actualCvData?.experiencia_laboral as ExperienciaLaboral[]) || [];
  const getFormacionAcademica = (): FormacionAcademica[] => (actualCvData?.formacion_academica as FormacionAcademica[]) || [];
  const getFormacionComplementaria = (): FormacionComplementaria => actualCvData?.formacion_complementaria || { certificaciones_cursos: [] };

  const confidence = Math.floor((cvData?.confianza_general || (cvData as any)?.structuredData?.confianza_general || 0) * 100);
  const score = Math.round(candidate?.scoring?.overallScore ?? 0);
  const tone = toneOf(score);
  const breakdown: Record<string, any> = candidate?.scoring?.breakdown || {};
  const strengths: string[] = candidate?.scoring?.strengths || [];
  const gaps: string[] = candidate?.scoring?.gaps || [];
  const summary = candidate?.scoring?.summary || '';

  const criteriaKeys = Object.keys(CRITERIA_LABELS);
  const criteria = criteriaKeys.map((key) => {
    const bd = breakdown[key];
    const def = CRITERIA_LABELS[key];
    return {
      label: def.label,
      target: def.target,
      score: bd?.score ?? 50,
      why: bd?.reasoning || 'Evaluación basada en el análisis del CV y los requisitos del cargo.',
      key,
    };
  });

  const weakest = criteria.length
    ? criteria.reduce((a, b) =>
        b.score < a.score ||
        (b.score === a.score && hasNegativeMarkers(b.why) && !hasNegativeMarkers(a.why))
          ? b
          : a,
      )
    : null;
  const keyFinding = summary && weakest ? findKeyFinding(summary, weakest.why, weakest.score) : null;

  const exp = getExperienciaLaboral();
  const skills = getHabilidades().habilidades_tecnicas || [];
  const langs = getHabilidades().idiomas || [];
  const soft = (getHabilidades() as any).habilidades_blandas || [];
  const hasAnySkill = skills.length > 0 || langs.length > 0 || soft.length > 0;
  const edu = getFormacionAcademica();
  const certs = getFormacionComplementaria().certificaciones_cursos || [];
  const stageChip = STAGES[mapStage(candidate?.candidateStatus)] || STAGES.revision;

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-4 border-green/30 border-t-green"></div>
            <p className="text-[16px] font-medium text-ink2 t-ink2">Cargando análisis del candidato...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-lowt t-lowt">
              <svg className="h-7 w-7 text-low t-low" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
            </div>
            <h2 className="mb-3 font-sans text-[1.4rem] font-bold text-ink t-ink">Error al cargar el CV</h2>
            <p className="mb-6 text-[15px] leading-relaxed text-ink2 t-ink2">{error}</p>
            <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl bg-cta px-5 py-2.5 text-[14px] font-semibold text-ctatext shadow-cta transition hover:bg-ctah">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
              Volver
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!candidate || !cvData) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-paper2 t-paper2">
              <svg className="h-7 w-7 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
            </div>
            <h2 className="mb-3 font-sans text-[1.4rem] font-bold text-ink t-ink">CV no disponible</h2>
            <p className="mb-6 text-[15px] leading-relaxed text-ink2 t-ink2">El CV de este candidato aún no ha sido procesado.</p>
            <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl bg-cta px-5 py-2.5 text-[14px] font-semibold text-ctatext shadow-cta transition hover:bg-ctah">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
              Volver
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-paper text-ink font-sans antialiased [text-rendering:optimizeLegibility]">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] bg-grain opacity-[0.045] mix-blend-overlay"></div>

        <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          {/* breadcrumb + volver */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink2 t-ink2">
              <button onClick={onBack} className="transition hover:text-ink t-ink">Campañas</button>
              <svg className="h-3 w-3 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
              <span className="truncate hover:text-ink t-ink">{candidate.campaign?.title || 'Campaña'}</span>
              <svg className="h-3 w-3 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
              <span className="truncate font-medium text-ink t-ink">Análisis IA</span>
            </div>
            <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-card px-3 py-2 text-[13px] font-semibold text-ink2 transition hover:border-ink hover:text-ink t-card t-ink2 t-line2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
              Volver a candidatos
            </button>
          </div>

          {/* Portada sin caja */}
          <section className="relative">
            <div aria-hidden="true" className="spotlight animate-spotdrift pointer-events-none absolute inset-0 -z-0"></div>
            <svg aria-hidden="true" className="report-watermark pointer-events-none absolute inset-0 -z-0 h-full w-full opacity-[0.04]" viewBox="0 0 760 300" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="1">
              <g>
                <line x1="40" y1="48" x2="150" y2="34"/><line x1="150" y1="34" x2="262" y2="78"/><line x1="262" y1="78" x2="384" y2="42"/><line x1="384" y1="42" x2="506" y2="96"/>
                <line x1="506" y1="96" x2="628" y2="58"/><line x1="628" y1="58" x2="720" y2="120"/><line x1="262" y1="78" x2="322" y2="146"/><line x1="150" y1="34" x2="92" y2="134"/>
                <line x1="92" y1="134" x2="212" y2="166"/><line x1="212" y1="166" x2="322" y2="146"/><line x1="322" y1="146" x2="452" y2="188"/><line x1="506" y1="96" x2="452" y2="188"/>
                <line x1="628" y1="58" x2="566" y2="158"/><line x1="452" y1="188" x2="566" y2="158"/>
              </g>
              <g fill="currentColor" stroke="none">
                <circle cx="40" cy="48" r="2.2"/><circle cx="384" cy="42" r="2.2"/><circle cx="628" cy="58" r="2.2"/><circle cx="720" cy="120" r="2.2"/>
                <circle cx="92" cy="134" r="2.2"/><circle cx="322" cy="146" r="2.2"/><circle cx="452" cy="188" r="2.2"/><circle cx="566" cy="158" r="2.2"/>
                <circle className="animate-nodepulse" cx="150" cy="34" r="3"/><circle className="animate-nodepulse" cx="262" cy="78" r="3" style={{ animationDelay: '.9s' }}/>
                <circle className="animate-nodepulse" cx="212" cy="166" r="3" style={{ animationDelay: '1.7s' }}/><circle className="animate-nodepulse" cx="506" cy="96" r="3" style={{ animationDelay: '2.4s' }}/>
              </g>
            </svg>

            <div className="relative z-10">
              {/* barra de herramientas suelta */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink2 t-ink2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-greendeep px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-onmark">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow animate-pulsering"></span> Análisis IA
                  </span>
                  <span className="hidden sm:inline">Generado {candidate.createdAt ? formatDate(candidate.createdAt) : ''}</span>
                  <span className="hidden items-center gap-2 sm:inline-flex" title="Confianza del parseo IA">
                    <span className="inline-block h-1.5 w-12 overflow-hidden rounded-full bg-paper2 t-paper2"><span className="block h-full rounded-full bg-good t-good" style={{ width: confidence + '%' }}></span></span>
                    <span><b className="font-semibold text-ink t-ink">{confidence}%</b> confianza de extracción</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5 rounded-xl border border-line2 p-1 t-line2">
                    <button type="button" onClick={handleApproveClick} disabled={isTerminal || actionBusy} className="grid h-9 w-9 place-items-center rounded-lg text-ink2 transition hover:bg-goodt hover:text-green disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink2 t-ink2" aria-label="Aprobar candidato" title={isTerminal ? 'Candidato ya no está activo en el proceso' : (isNew ? 'Iniciar proceso' : 'Aprobar etapa actual')}>
                      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </button>
                    <span className="h-5 w-px bg-line2 t-line2"></span>
                    <button type="button" onClick={() => setDiscardOpen(true)} disabled={candidateStatus === 'NOT_SELECTED' || actionBusy} className="grid h-9 w-9 place-items-center rounded-lg text-ink2 transition hover:bg-lowt hover:text-low disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink2 t-ink2" aria-label="Descartar" title={candidateStatus === 'NOT_SELECTED' ? 'Candidato ya descartado' : 'Descartar del proceso'}>
                      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                    </button>
                  </div>
                  {candidate.documentId && (
                    <button type="button" onClick={async () => {
                      try {
                        const blob = await apiService.downloadDocument(candidate.documentId!);
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `CV_${candidate.name}.pdf`;
                        document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
                      } catch { showToast('Error al descargar el CV.', 'warn'); }
                    }} className="inline-flex items-center gap-2 rounded-xl border border-line2 bg-card px-3.5 py-2.5 text-[14px] font-semibold text-ink transition hover:-translate-y-0.5 hover:border-ink t-card t-ink t-line2">
                      <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 3v12M8 11l4 4 4-4M5 21h14"/></svg> Descargar CV
                    </button>
                  )}
                  {isNew ? (
                    <button type="button" onClick={handleStartProcess} disabled={actionBusy} className="inline-flex items-center gap-2 rounded-xl bg-cta px-4 py-2.5 text-[14px] font-semibold text-ctatext shadow-cta transition hover:-translate-y-0.5 hover:bg-ctah disabled:opacity-50">
                      <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.7A8.4 8.4 0 1 1 21 11.5z"/></svg> Contactar candidato
                    </button>
                  ) : isInProcess ? (
                    <button type="button" onClick={() => { if (campaignId && candidate) window.location.href = `/campaigns/${campaignId}/candidates/${candidate.id}/process`; }} className="inline-flex items-center gap-2 rounded-xl border border-line2 bg-card px-4 py-2.5 text-[14px] font-semibold text-ink transition hover:-translate-y-0.5 hover:border-ink t-card t-ink t-line2">
                      <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M14 3h7v7M21 3l-9 9M19 14v7H5V5h7"/></svg> Ver proceso
                    </button>
                  ) : isTerminal ? (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-line2 bg-paper2 px-4 py-2.5 text-[14px] font-semibold text-ink3 t-paper2 t-ink3">Proceso terminado</span>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 border-t border-line t-line"></div>

              {/* cuerpo: IDENTIDAD · VEREDICTO */}
              <div className="grid grid-cols-1 gap-10 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:py-14">
                {/* IDENTIDAD */}
                <div className="rise min-w-0" style={{ animationDelay: '.04s' }}>
                  <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-good animate-pulsering t-good"></span>
                      Candidato evaluado · {candidate.campaign?.title || 'Sin campaña'}
                    </span>
                    <span aria-hidden="true" className="hidden h-3 w-px bg-line2 sm:inline-block t-line2"></span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans text-[12.5px] font-semibold normal-case tracking-normal ${stageChip.chip} t-ink2`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${stageChip.dot}`}></span> {stageChip.label}
                    </span>
                  </p>

                  <h1 className="mt-3.5 font-sans text-[2.1rem] font-bold leading-[1.02] tracking-[-0.02em] text-ink sm:text-[2.7rem] t-ink">{candidate.name}</h1>
                  <p className="mt-1.5 text-[15px] text-ink2 t-ink2">{getTitularProfesional().titular || ''}</p>

                  <div className="mt-5 flex flex-col gap-2.5 text-[15px] sm:flex-row sm:flex-wrap sm:gap-x-6">
                    <a href={`mailto:${candidate.email || getDatosContacto().email || ''}`} onClick={() => handleCopy('email', candidate.email || getDatosContacto().email || '')} className="group inline-flex items-center gap-2 text-ink2 transition hover:text-ink t-ink2">
                      <svg className="h-[18px] w-[18px] text-ink3 transition group-hover:text-green t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>
                      <span className="underline-offset-2 group-hover:underline">{candidate.email || getDatosContacto().email || ''}</span>
                    </a>
                    <a href={`tel:${(candidate.phone || getDatosContacto().telefono || '').replace(/[^\d+]/g, '')}`} onClick={() => handleCopy('phone', candidate.phone || getDatosContacto().telefono || '')} className="group inline-flex items-center gap-2 text-ink2 transition hover:text-ink t-ink2">
                      <svg className="h-[18px] w-[18px] text-ink3 transition group-hover:text-green t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>
                      <span className="underline-offset-2 group-hover:underline">{candidate.phone || getDatosContacto().telefono || ''}</span>
                    </a>
                  </div>

                  {/* match lineal */}
                  <div className="mt-8 max-w-[340px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Compatibilidad con el cargo</span>
                      <span className="flex items-baseline gap-2">
                        <span className={`font-sans text-[17px] font-bold tabular-nums ${toneText(tone)}`} title="Puntaje de match">{score}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full ${toneBgTint(tone).split(' ')[0]} px-2 py-0.5 font-sans text-[12.5px] font-semibold uppercase tracking-wide ${toneBgTint(tone).split(' ')[1]} t-ink2`}><span className={`h-1 w-1 rounded-full ${toneDot(tone)}`}></span> {tone === 'good' ? 'alta' : tone === 'mid' ? 'media' : 'baja'}</span>
                      </span>
                    </div>
                    <span className="mt-2.5 block h-2 overflow-hidden rounded-full bg-paper2 t-paper2">
                      <span ref={matchRef} className={`matchbar-fill block h-full rounded-full ${toneColor(tone)}`} data-w={score + '%'}></span>
                    </span>
                    <p className="mt-3 text-[13px] leading-relaxed text-ink2 t-ink2">Cruce semántico entre el CV extraído y la rúbrica de esta campaña. El detalle, criterio por criterio, está más abajo.</p>
                  </div>
                </div>

                {/* VEREDICTO */}
                <div className="rise relative pl-1 sm:pl-2" style={{ animationDelay: '.16s' }}>
                  <span aria-hidden="true" className="pointer-events-none absolute -left-1 -top-7 select-none font-serif text-[5rem] leading-none text-line2 t-line2">“</span>

                  <div className="relative z-10 flex items-center gap-2 font-mono text-[12.5px] uppercase tracking-[0.1em] text-cta t-cta">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 1.7 4.6L18 8l-4.3 1.4L12 14l-1.7-4.6L6 8l4.3-1.4z"/><path d="M18.5 13.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"/></svg>
                    Veredicto de la IA
                  </div>

                  {summary ? (
                    <blockquote className="verdict-text relative z-10 mt-4">
                      <Verdict text={summary} highlight={keyFinding} />
                    </blockquote>
                  ) : (
                    <p className="relative z-10 mt-4 text-[15px] leading-relaxed text-ink2 t-ink2">No hay veredicto disponible para este candidato.</p>
                  )}

                  <p className="relative z-10 mt-4 flex items-center gap-2 text-[13px] text-ink2 t-ink2">
                    <svg className="h-4 w-4 shrink-0 text-yellow" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 1.7 4.6L18 8l-4.3 1.4L12 14l-1.7-4.6L6 8l4.3-1.4z"/></svg>
                    Subrayado: el hallazgo que más pesó en esta nota.
                  </p>

                  <div className="relative z-10 mt-6 flex flex-col gap-3.5 sm:flex-row sm:gap-8">
                    <div className="flex items-start gap-2.5">
                      <span className="bullet h-2 w-2 shrink-0 rounded-full bg-good t-good"></span>
                      <p className="text-[14px] leading-snug text-ink2 t-ink2"><span className="font-semibold text-ink t-ink">Lo que suma.</span> {strengths[0] || 'Sin fortalezas destacadas.'}</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="bullet h-2 w-2 shrink-0 rounded-full bg-mid t-mid"></span>
                      <p className="text-[14px] leading-snug text-ink2 t-ink2"><span className="font-semibold text-ink t-ink">Lo que falta.</span> {gaps[0] || 'Sin brechas identificadas.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TIRA DE SALUD */}
          <section className="grid grid-cols-2 divide-line border-t border-line pt-6 t-line sm:grid-cols-4 sm:divide-x" aria-label="Métricas del análisis">
            <div className="px-1 py-1 sm:px-5">
              <div className="flex items-center gap-2 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2"><span className="h-1.5 w-1.5 rounded-full bg-green t-green"></span> Criterios</div>
              <p className="mt-1.5 font-sans text-[1.7rem] font-bold leading-none tracking-tight tabular-nums text-ink t-ink">{criteria.length} <span className="text-[13px] font-medium text-ink2 t-ink2">evaluados</span></p>
            </div>
            <div className="px-1 py-1 sm:px-5">
              <div className="flex items-center gap-2 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2"><span className="h-1.5 w-1.5 rounded-full bg-green t-green"></span> Experiencia</div>
              <p className="mt-1.5 font-sans text-[1.7rem] font-bold leading-none tracking-tight tabular-nums text-ink t-ink">{getYears(exp)}+ <span className="text-[13px] font-medium text-ink2 t-ink2">años · {exp.length} roles</span></p>
            </div>
            <div className="px-1 py-1 sm:px-5">
              <div className="flex items-center gap-2 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2"><span className="h-1.5 w-1.5 rounded-full bg-mid t-mid"></span> Habilidades</div>
              <p className="mt-1.5 font-sans text-[1.7rem] font-bold leading-none tracking-tight tabular-nums text-ink t-ink">{skills.length + soft.length} <span className="text-[13px] font-medium text-ink2 t-ink2">{skills.length} téc. · {soft.length} blandas · {langs.length} id.</span></p>
            </div>
            <div className="px-1 py-1 sm:px-5">
              <div className="flex items-center gap-2 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2"><span className="h-1.5 w-1.5 rounded-full bg-good t-good"></span> Formación</div>
              <p className="mt-1.5 font-sans text-[1.7rem] font-bold leading-none tracking-tight tabular-nums text-ink t-ink">{edu.length}+{certs.length} <span className="text-[13px] font-medium text-ink2 t-ink2">título + certs.</span></p>
            </div>
          </section>

          {/* BANDA DEL JUICIO */}
          <section className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="flex items-end justify-between gap-3 border-b border-line pb-3 t-line">
                <h2 className="font-sans text-[1.4rem] font-bold tracking-tight text-ink t-ink">Por qué esta nota</h2>
                <span className="font-mono text-[12.5px] text-ink2 t-ink2">{criteria.length} criterios · toca para el razonamiento</span>
              </div>
              <div id="criteria" className="mt-4 grid gap-1.5">
                {criteria.map((k, i) => {
                  const t = toneOf(k.score);
                  const isOpen = !!openCriteria[i];
                  return (
                    <div key={i} className={`acc crit-row rounded-xl border border-line2 transition t-line2 ${isOpen ? 'open' : ''}`}>
                      <div className="flex items-center gap-3 px-3.5 py-3">
                        <button type="button" onClick={() => setOpenCriteria(prev => ({ ...prev, [i]: !prev[i] }))} className="acc-head flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={isOpen}>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-3">
                              <span className="font-sans text-[15px] font-semibold text-ink t-ink">{k.label}</span>
                              <span className="font-sans text-[14px] font-bold tabular-nums text-ink t-ink">{k.score}<span className="text-ink2 t-ink2">/100</span></span>
                            </span>
                            <span className="mt-2 block h-1.5 rounded-full bg-paper2 t-paper2"><span className={`bar-fill block h-full rounded-full ${toneColor(t)}`} data-w={k.score + '%'}></span></span>
                          </span>
                          <svg className="acc-chev h-4 w-4 shrink-0 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <button type="button" onClick={() => jumpTo(k.target)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line2 px-2.5 py-1.5 font-sans text-[12.5px] font-semibold text-ink2 transition hover:border-green hover:text-green t-ink2 t-line2" title={`Ver esta evidencia en el CV`}>
                          ver en el CV <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                        </button>
                      </div>
                      <div className="acc-body"><div><p className="px-3.5 pb-3.5 text-[14px] leading-relaxed text-ink2 t-ink2">{k.why}</p></div></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:border-l lg:border-line lg:pl-10 t-line">
              <div className="border-b border-line pb-3 t-line">
                <h2 className="font-sans text-[1.4rem] font-bold tracking-tight text-ink t-ink">Fortalezas y brechas</h2>
              </div>
              <div className="mt-4 grid gap-6">
                <div>
                  <div className="flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.1em] text-good t-good">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg> Fortalezas
                  </div>
                  <ul className="mt-3 grid gap-2.5">
                    {(strengths.length ? strengths : ['Sin fortalezas destacadas.']).map((s, i) => (
                      <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-ink2 t-ink2"><span className="bullet h-1.5 w-1.5 shrink-0 rounded-full bg-good t-good"></span> {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-line pt-5 t-line">
                  <div className="flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.1em] text-mid t-mid">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg> Brechas
                  </div>
                  <ul className="mt-3 grid gap-2.5">
                    {(gaps.length ? gaps : ['Sin brechas identificadas.']).map((g, i) => (
                      <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-ink2 t-ink2"><span className="bullet h-1.5 w-1.5 shrink-0 rounded-full bg-mid t-mid"></span> {g}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ÍNDICE DE ANCLAS */}
          <nav aria-label="Secciones del expediente" className="no-scrollbar sticky top-16 z-30 -mx-4 mt-12 overflow-x-auto border-y border-line bg-paper/85 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 t-line t-paper">
            <div className="flex items-center gap-6 py-3">
              <span className="hidden shrink-0 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 sm:block t-ink2">Expediente extraído</span>
              {['resumen', 'experiencia', 'formacion', 'habilidades'].map(sec => (
                <button key={sec} onClick={() => jumpTo(sec)} data-ix={sec} aria-current={activeSection === sec ? 'true' : 'false'} className="ix-link shrink-0 pb-3 text-[15px] font-semibold">
                  {sec === 'resumen' ? 'Resumen' : sec === 'experiencia' ? 'Experiencia' : sec === 'formacion' ? 'Formación' : 'Habilidades'}
                </button>
              ))}
            </div>
          </nav>

          {/* EXPEDIENTE FLUIDO */}
          <div className="mt-8 grid gap-12">
            {/* Resumen */}
            <section data-section="resumen" id="resumen" className="reveal scroll-mt-32">
              <div className="sec-head -mx-3 px-3 py-1">
                <span className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">01 · Resumen profesional</span>
                <h2 className="mt-1 font-sans text-[1.4rem] font-bold leading-normal tracking-tight text-ink t-ink">Cómo se presenta el candidato</h2>
              </div>
              <div className="relative mt-4 pl-8 sm:pl-10">
                <span aria-hidden="true" className="pointer-events-none absolute -left-1 -top-6 select-none font-serif text-[5rem] leading-none text-line2 t-line2">“</span>
                <p className="relative text-[16px] leading-relaxed text-ink2 t-ink2">{getResumenProfesional().resumen || 'No hay resumen profesional disponible.'}</p>
                <p className="mt-3 font-mono text-[12.5px] text-ink2 t-ink2">Extracto literal del CV · sin edición de Evalen</p>
              </div>
            </section>

            {/* Experiencia */}
            <section data-section="experiencia" id="experiencia" className="reveal scroll-mt-32">
              <div className="sec-head -mx-3 px-3 py-1">
                <span className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">02 · Experiencia laboral</span>
                <h2 className="mt-1 font-sans text-[1.4rem] font-bold leading-normal tracking-tight text-ink t-ink">{exp.length} roles detectados</h2>
              </div>
              {exp.length === 0 ? (
                <p className="mt-6 text-[15px] text-ink2 t-ink2">No se encontró experiencia laboral registrada.</p>
              ) : (
                <div className="tl mt-6 grid gap-7">
                  {exp.map((e, i) => {
                    const current = isLatest(e, exp);
                    const isPresent = e.periodo?.fecha_fin?.toLowerCase() === 'presente' || e.periodo?.fecha_fin?.toLowerCase() === 'actualidad';
                    return (
                      <div key={i} className={`tl-item ${current ? 'is-current' : ''}`}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <h3 className="font-sans text-[16px] font-semibold leading-snug text-ink t-ink">{e.cargo}</h3>
                          {isPresent && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-goodt px-2.5 py-0.5 font-sans text-[12.5px] font-semibold text-ink2 t-goodt t-ink2">
                              <span className="h-1.5 w-1.5 rounded-full bg-good t-good"></span> Actual
                            </span>
                          )}
                        </div>
                        <p className="text-[14px] font-medium text-green t-green">{e.empresa}</p>
                        <p className="mt-1 inline-flex items-center gap-1.5 font-sans text-[13px] text-ink2 t-ink2">
                          <svg className="h-3.5 w-3.5 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 3v3M16 3v3"/></svg>
                          {formatPeriod(e.periodo)}
                        </p>
                        {e.responsabilidades && e.responsabilidades.length > 0 && (
                          <ul className="mt-2.5 grid gap-2">
                            {e.responsabilidades.map((r, ri) => (
                              <li key={ri} className="flex gap-2.5 text-[14px] leading-relaxed text-ink2 t-ink2"><span className="bullet h-1 w-1 shrink-0 rounded-full bg-ink3 t-ink3"></span> {r}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Formación */}
            <section data-section="formacion" id="formacion" className="reveal scroll-mt-32">
              <div className="sec-head -mx-3 px-3 py-1">
                <span className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">03 · Formación académica</span>
                <h2 className="mt-1 font-sans text-[1.4rem] font-bold leading-normal tracking-tight text-ink t-ink">Título formal y formación complementaria</h2>
              </div>
              {edu.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2"><span className="h-1.5 w-1.5 rounded-full bg-good t-good"></span> Título formal</div>
                  {edu.map((e, i) => (
                    <div key={i} className="mt-2.5 flex items-start justify-between gap-3 border-b border-line pb-4 t-line">
                      <div className="min-w-0">
                        <p className="font-sans text-[16px] font-semibold leading-snug text-ink t-ink">{e.titulo}</p>
                        <p className="text-[14px] font-medium text-green t-green">{e.institucion}</p>
                      </div>
                      <span className="shrink-0 font-sans text-[13px] text-ink2 t-ink2">{formatPeriod(e.periodo)}</span>
                    </div>
                  ))}
                </div>
              )}
              {certs.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2"><span className="h-1.5 w-1.5 rounded-full bg-mid t-mid"></span> Certificaciones y diplomados</div>
                  <ul className="mt-2.5">
                    {certs.map((c, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 border-b border-line py-3 t-line">
                        <div className="min-w-0"><p className="text-[15px] font-medium text-ink t-ink">{c}</p></div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {edu.length === 0 && certs.length === 0 && (
                <p className="mt-6 text-[15px] text-ink2 t-ink2">No se encontró información de formación académica.</p>
              )}
            </section>

            {/* Habilidades */}
            <section data-section="habilidades" id="habilidades" className="reveal scroll-mt-32">
              <div className="sec-head -mx-3 px-3 py-1">
                <span className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">04 · Habilidades extraídas</span>
                <h2 className="mt-1 font-sans text-[1.4rem] font-bold leading-normal tracking-tight text-ink t-ink">Lo que la IA leyó en el CV</h2>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[12.5px] text-ink2 t-ink2">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-good t-good"></span> Avanzado / Experto</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-mid t-mid"></span> Intermedio</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-low t-low"></span> Básico</span>
                <span className="ml-auto font-sans text-[13px] normal-case tracking-normal text-ink2 t-ink2">Coincidencia con el cargo: <b className={`font-semibold ${toneText(tone)}`}>{tone === 'good' ? 'alta' : tone === 'mid' ? 'media' : 'baja'}</b></span>
              </div>
              {skills.length > 0 && (
                <div className="mt-5">
                  <p className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Técnicas y de dominio</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {skills.map((s, i) => (
                      <span key={`t-${i}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-paper/60 px-2.5 py-1 text-[13px] font-medium text-ink transition hover:border-green t-ink t-line2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${levelDot(s.level)}`}></span> {s.skill}
                        <span className="font-sans text-[12.5px] font-medium text-ink2 t-ink2">{s.level}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {soft.length > 0 && (
                <div className="mt-6">
                  <p className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Blandas · Interpersonales</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {soft.map((h: any, i: number) => (
                      <span key={`b-${i}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-paper/60 px-2.5 py-1 text-[13px] font-medium text-ink t-ink t-line2">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-ink3 t-ink3"></span> {typeof h === 'string' ? h : (h as any)?.skill || String(h)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {langs.length > 0 && (
                <div className="mt-6">
                  <p className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Idiomas</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {langs.map((l, i) => (
                      <span key={`l-${i}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-paper/60 px-2.5 py-1 text-[13px] font-medium text-ink transition hover:border-green t-ink t-line2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${levelDot(l.nivel)}`}></span> {l.idioma}
                        <span className="font-sans text-[12.5px] font-medium text-ink2 t-ink2">{l.nivel}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!hasAnySkill && (
                <>
                  <p className="mt-6 text-[15px] text-ink2 t-ink2">No se encontraron habilidades extraídas.</p>
                  {strengths.length > 0 && (
                    <p className="mt-2 text-[13px] leading-relaxed text-ink2 t-ink2">
                      El CV no trae sección estructurada de habilidades. Revisa <button onClick={() => jumpTo('resumen')} className="font-semibold text-green underline-offset-2 hover:underline">Lo que suma</button> en el Veredicto — fortalezas inferidas por campaña.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
        </main>

        {/* Modal: iniciar proceso */}
        {startOpen && (
          <div className="fixed inset-0 z-[85] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="Iniciar proceso">
            <div className="w-full max-w-md rounded-2xl border border-line2 bg-card p-6 shadow-card t-card t-line2">
              <h3 className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink2 t-ink2">Iniciar proceso</h3>
              <p className="mt-2.5 text-[16px] font-bold leading-snug text-ink t-ink">¿Iniciar el proceso de <span className="text-green t-green">{candidate?.name}</span>?</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink2 t-ink2">Se creará la primera etapa de la campaña y el candidato pasará a la etapa de entrevista.</p>
              <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-line2 bg-paper/60 px-3.5 py-3 t-line2">
                <input type="checkbox" checked={notifyCandidate} onChange={e => setNotifyCandidate(e.target.checked)} className="h-4 w-4 rounded border-line2 accent-cta" />
                <span className="text-[13.5px] font-medium text-ink t-ink">Notificar al candidato por email</span>
              </label>
              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setStartOpen(false)} className="rounded-xl border border-line2 px-4 py-2.5 text-[13.5px] font-semibold text-ink2 transition hover:border-ink hover:text-ink t-ink2 t-line2">Cancelar</button>
                <button type="button" onClick={handleStartProcess} disabled={actionBusy} className="rounded-xl bg-cta px-4 py-2.5 text-[13.5px] font-semibold text-ctatext shadow-cta transition hover:bg-ctah disabled:opacity-60">
                  {actionBusy ? 'Iniciando…' : 'Iniciar proceso'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: aprobar etapa */}
        {advanceOpen && (
          <div className="fixed inset-0 z-[85] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="Aprobar etapa">
            <div className="w-full max-w-md rounded-2xl border border-line2 bg-card p-6 shadow-card t-card t-line2">
              <h3 className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink2 t-ink2">Aprobar etapa</h3>
              <p className="mt-2.5 text-[16px] font-bold leading-snug text-ink t-ink">
                {activeStage
                  ? <>¿Aprobar la etapa <span className="text-green t-green">«{activeStage.stageTemplate?.name || ''}»</span> y avanzar?</>
                  : 'Buscando etapa activa…'}
              </p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink2 t-ink2">La siguiente etapa del proceso se activará y el responsable será notificado.</p>
              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setAdvanceOpen(false)} className="rounded-xl border border-line2 px-4 py-2.5 text-[13.5px] font-semibold text-ink2 transition hover:border-ink hover:text-ink t-ink2 t-line2">Cancelar</button>
                <button type="button" onClick={handleAdvance} disabled={actionBusy || !activeStage} className="rounded-xl bg-cta px-4 py-2.5 text-[13.5px] font-semibold text-ctatext shadow-cta transition hover:bg-ctah disabled:opacity-60">
                  {actionBusy ? 'Aprobando…' : 'Aprobar y avanzar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: descartar */}
        {discardOpen && (
          <div className="fixed inset-0 z-[85] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="Descartar candidato">
            <div className="w-full max-w-md rounded-2xl border border-line2 bg-card p-6 shadow-card t-card t-line2">
              <h3 className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink2 t-ink2">Descartar candidato</h3>
              <p className="mt-2.5 text-[16px] font-bold leading-snug text-ink t-ink">¿Descartar a <span className="text-low t-low">{candidate?.name}</span> del proceso?</p>
              <textarea
                value={discardReason}
                onChange={e => setDiscardReason(e.target.value)}
                placeholder="Motivo (opcional) — quedará registrado en la auditoría"
                rows={3}
                className="mt-4 w-full resize-none rounded-xl border border-line2 bg-paper/60 px-3.5 py-3 text-[13.5px] text-ink placeholder:text-ink3 focus:border-green focus:outline-none t-paper/60 t-ink t-line2"
              />
              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setDiscardOpen(false)} className="rounded-xl border border-line2 px-4 py-2.5 text-[13.5px] font-semibold text-ink2 transition hover:border-ink hover:text-ink t-ink2 t-line2">Cancelar</button>
                <button type="button" onClick={handleDiscard} disabled={actionBusy} className="rounded-xl bg-low px-4 py-2.5 text-[13.5px] font-semibold text-onmark transition opacity-90 hover:opacity-100 disabled:opacity-60">
                  {actionBusy ? 'Descartando…' : 'Descartar candidato'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        <div id="toast" aria-live="polite" role="status"
          className={`pointer-events-none fixed inset-x-4 bottom-5 z-[90] mx-auto flex max-w-sm items-start gap-3 rounded-xl border border-line2 bg-card px-4 py-3 text-[14px] text-ink shadow-card transition-all duration-300 sm:inset-x-auto sm:right-6 sm:max-w-sm t-card t-ink t-line2 ${
            toast ? 'translate-y-0 opacity-100' : 'translate-y-[140%] opacity-0'
          }`}>
          {toast && (
            <>
              <span className="mt-0.5 shrink-0" dangerouslySetInnerHTML={{ __html: toast.icon }} />
              <span className="leading-snug">{toast.msg}</span>
            </>
          )}
        </div>

        {/* Barra deshacer */}
        {undoBar && (
          <div className="fixed bottom-5 left-4 z-[95] flex max-w-sm items-center gap-3 rounded-xl border border-line2 bg-card px-4 py-3 text-[14px] text-ink shadow-card t-card t-ink t-line2">
            <svg className="h-4 w-4 shrink-0 text-good t-good" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            <span className="leading-snug">{undoBar.msg}</span>
            <button type="button" onClick={undoBar.undo} className="shrink-0 font-bold text-green transition hover:text-greendeep t-green">Deshacer</button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CandidateDetail;