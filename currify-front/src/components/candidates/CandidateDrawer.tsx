import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Candidate, Campaign } from '../../services/api';
import { apiService } from '../../services/api';
import { STAGES, mapStage } from '../../constants/stages';
import { hasCandidateProcess, getActiveStageName } from '../../utils/candidateProcess';

export interface CandidateWithCampaign extends Candidate {
  campaignTitle?: string;
  role?: string;
}

interface CandidateDrawerProps {
  isOpen: boolean;
  candidate: CandidateWithCampaign | null;
  campaign: Campaign | undefined;
  onClose: () => void;
  onDismiss: (candidate: Candidate) => void;
  onStartProcess: (candidate: Candidate) => void;
  onViewAIAnalysis: (candidate: Candidate) => void;
  onViewProcess?: (candidate: Candidate) => void;
  loading?: boolean;
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function calculateScore(c: Candidate): number {
  return Math.round(c.scoring?.overallScore || 0);
}

function getAIInsight(c: Candidate) {
  if (c.scoring?.summary) return c.scoring.summary;
  const rec = c.scoring?.recommendation;
  if (!rec) return 'Pendiente de análisis detallado.';
  const map: Record<string, string> = {
    weak_fit: 'Presenta una compatibilidad baja con los requisitos del puesto.',
    moderate_fit: 'Candidato con coincidencia parcial, se recomienda revisión.',
    strong_fit: 'Perfil altamente compatible con las expectativas.',
    reject: 'No cumple con los requisitos mínimos.'
  };
  return map[rec] || rec;
}

function getCandidatePosition(c: Candidate) {
  const cv = c.structuredData?.datos_cv;
  return cv?.titular_profesional?.titular || cv?.experiencia_laboral?.[0]?.cargo || '';
}

const CandidateDrawer: React.FC<CandidateDrawerProps> = ({
  isOpen, candidate, campaign, onClose, onDismiss, onStartProcess, onViewAIAnalysis, onViewProcess, loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'resumen' | 'exp'>('resumen');
  const [rubricOpen, setRubricOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const score = useMemo(() => candidate ? calculateScore(candidate) : 0, [candidate]);
  const tone = score >= 80 ? 'good' : score >= 60 ? 'mid' : 'low';
  const lvl = score >= 80 ? 'alto' : score >= 60 ? 'medio' : 'bajo';

  const cvData = candidate?.structuredData?.datos_cv;
  const experience = useMemo(() => cvData?.experiencia_laboral || [], [cvData]);
  const education = useMemo(() => cvData?.formacion_academica || [], [cvData]);
  const rawSkills = useMemo(() => cvData?.habilidades?.habilidades_tecnicas || [], [cvData]);
  const skills = useMemo(() => rawSkills.map((s: any) => typeof s === 'string' ? s : s.skill || '').filter(Boolean), [rawSkills]);
  const extraSkills = skills.length > 3 ? skills.length - 3 : 0;
  const showSkills = skills.slice(0, 3);

  const insightText = useMemo(() => candidate ? getAIInsight(candidate) : '', [candidate]);

  const stageKey = useMemo(() => mapStage(candidate?.candidateStatus), [candidate]);
  const stage = STAGES[stageKey] || STAGES.revision;
  const hasProcess = !!candidate && hasCandidateProcess(candidate);
  const stageChip = hasProcess ? STAGES.entrevista.chip : stage.chip;
  const stageDot = hasProcess ? STAGES.entrevista.dot : stage.dot;
  const stageLabel = hasProcess ? (getActiveStageName(candidate) || 'En proceso') : stage.label;
  const levelLabel = lvl === 'alto' ? 'Match alto' : lvl === 'medio' ? 'Match medio' : 'Match bajo';
  const levelChip = lvl === 'alto' ? 'bg-goodt text-good t-goodt t-good' : lvl === 'medio' ? 'bg-midt text-mid t-midt t-mid' : 'bg-lowt text-low t-lowt t-low';
  const badgeStyle = tone === 'good' ? 'bg-goodt text-good t-goodt t-good' : tone === 'mid' ? 'bg-yellow text-greendeep' : 'bg-lowt text-low t-lowt t-low';

  const criteriaScores = useMemo(() => (candidate?.scoring as any)?.criteriaScores || [], [candidate]);

  const curExp = experience[0] || null;
  const curEdu = education[0] || null;

  const ringSize = 92;
  const ringStroke = 7;
  const r = (ringSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);
  const ringColor = tone === 'good' ? 'var(--good)' : tone === 'mid' ? 'var(--mid)' : 'var(--low)';

  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }, []);

  const handleDownloadCV = useCallback(async () => {
    const docId = candidate?.documentId || candidate?.documents?.[0]?.id;
    if (!docId) return;
    try {
      setDownloading(true);
      const blob = await apiService.downloadDocument(docId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CV_${candidate.name || 'candidato'}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch {
      alert('No se pudo descargar el CV.');
    } finally {
      setDownloading(false);
    }
  }, [candidate]);

  const handleAdvance = (st: string) => {
    setAdvanceOpen(false);
    onStartProcess(candidate!);
  };

  useEffect(() => {
    if (isOpen) {
      prevFocusRef.current = document.activeElement as HTMLElement;
      document.body.classList.add('drawer-open');
      setTimeout(() => drawerRef.current?.focus(), 100);
    } else {
      document.body.classList.remove('drawer-open');
      setRubricOpen(false);
      setAdvanceOpen(false);
      prevFocusRef.current?.focus();
    }
    return () => { document.body.classList.remove('drawer-open'); };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [isOpen, onClose]);

  return createPortal(
    <>
      <div id="overlay" className={`${isOpen ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside
        id="drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${candidate?.name || 'candidato'}`}
        tabIndex={-1}
        className={`${isOpen ? 'open' : ''} flex flex-col t-card t-line`}
      >
        <div className="flex-1 overflow-y-auto" id="drawerScroll">
          <div className="sticky top-0 z-10 flex justify-end bg-card/85 px-5 pt-4 backdrop-blur-sm t-card">
            <button onClick={onClose} aria-label="Cerrar panel"
              className="grid h-9 w-9 place-items-center rounded-xl border border-line2 text-ink2 transition hover:border-ink hover:text-ink t-ink2 t-line2">
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 gap-4">
              <div className="h-16 w-16 rounded-full bg-paper2 animate-pulse t-paper2" />
              <div className="h-5 w-48 rounded bg-paper2 animate-pulse t-paper2" />
              <div className="h-3 w-32 rounded bg-paper2 animate-pulse t-paper2" />
            </div>
          ) : candidate && (
            <>
              {/* === IDENTITY === */}
              <div className="px-6 pb-5 text-center">
                <div className="relative mx-auto w-fit">
                  <span className="relative block h-[92px] w-[92px] mx-auto">
                    <span className="absolute inset-0">
                      <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} className="block h-full w-full -rotate-90" aria-hidden="true">
                        <circle className="ring-track" cx={ringSize/2} cy={ringSize/2} r={r} fill="none" strokeWidth={ringStroke} />
                        <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke={ringColor} strokeWidth={ringStroke} strokeLinecap="round" strokeDasharray={circumference.toFixed(1)} strokeDashoffset={dashOffset.toFixed(1)} />
                      </svg>
                    </span>
                    <span className="absolute inset-[10px] overflow-hidden rounded-full ring-2 ring-card">
                      <span className="grid h-full w-full place-items-center rounded-full font-mono text-[22px] font-semibold text-onmark t-good" style={{ background: 'var(--green)' }}>
                        {getInitials(candidate.name)}
                      </span>
                    </span>
                  </span>
                  <span className={`absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold shadow-gold ${badgeStyle}`}>
                    {score}%
                  </span>
                </div>
                <h2 className="mt-4 font-sans text-[1.4rem] font-bold leading-tight tracking-tight text-ink t-ink">{candidate.name}</h2>
                <p className="mt-0.5 font-mono text-[12px] text-ink3 t-ink3">{getCandidatePosition(candidate)}</p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[12.5px]">
                  <button type="button" onClick={() => handleCopy(candidate.email || '', 'Email')}
                    className="inline-flex items-center gap-1.5 text-ink2 transition hover:text-ink t-ink2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>
                    <span>{candidate.email || '—'}</span>
                  </button>
                  {candidate.phone && (
                    <>
                      <span className="text-line2">·</span>
                      <button type="button" onClick={() => handleCopy(candidate.phone!, 'Teléfono')}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line2 px-2.5 py-1 text-ink2 transition hover:border-ink3 t-ink2 t-line2">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>
                        <span>{candidate.phone}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* === INSIGHT IA === */}
              <div className="mx-6 rounded-2xl border border-green/30 bg-greentint p-4 t-greentint" style={{ borderColor: 'color-mix(in srgb, var(--green) 35%, transparent)' }}>
                <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-green t-green">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 1.7 4.6L18 8l-4.3 1.4L12 14l-1.7-4.6L6 8l4.3-1.4z"/><path d="M18.5 13.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"/></svg>
                  Insight de la IA
                </div>
                <p className="mt-2 font-serif text-[13.5px] italic leading-relaxed text-ink t-ink">&ldquo;{insightText}&rdquo;</p>
              </div>

              {/* === STAGE + LEVEL === */}
              <div className="mx-6 mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-wide ${stageChip}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${stageDot}`}></span>{stageLabel}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-wide ${levelChip}`}>
                  {levelLabel}
                </span>
              </div>

              {/* === TABS === */}
              <div className="mx-6 mt-5 flex items-center gap-6 border-b border-line t-line" role="tablist" aria-label="Detalle del candidato">
                <button role="tab" aria-selected={activeTab === 'resumen'} onClick={() => setActiveTab('resumen')}
                  className={`tab-underline pb-2.5 text-[14px] ${activeTab === 'resumen' ? 'font-semibold text-ink t-ink' : 'font-medium text-ink3 t-ink3'}`}>Resumen</button>
                <button role="tab" aria-selected={activeTab === 'exp'} onClick={() => setActiveTab('exp')}
                  className={`tab-underline pb-2.5 text-[14px] ${activeTab === 'exp' ? 'font-semibold text-ink t-ink' : 'font-medium text-ink3 t-ink3'}`}>Experiencia</button>
              </div>

              {/* === PANEL RESUMEN === */}
              {activeTab === 'resumen' && (
                <div className="px-6 py-5">
                  <h3 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink3 t-ink3">Puntaje por criterio</h3>
                  <div className="mt-3 grid gap-2.5">
                    {criteriaScores.length > 0 ? criteriaScores.map((k: any, i: number) => {
                      const val = typeof k.score === 'number' ? k.score : 0;
                      const t = val >= 8 ? 'good' : val >= 6 ? 'mid' : 'low';
                      const col = t === 'good' ? 'bg-good' : t === 'mid' ? 'bg-mid' : 'bg-low';
                      return (
                        <div key={i} className="grid grid-cols-[88px_1fr_30px] items-center gap-2.5 font-mono text-[11px] text-ink2 t-ink2">
                          <span>{k.name || k.label || '—'}</span>
                          <span className="h-2 rounded-full bg-paper2 t-paper2">
                            <span className={`block h-full rounded-full ${col}`} style={{ width: `${Math.min(val * 10, 100)}%` }} />
                          </span>
                          <span className="text-right font-semibold text-ink t-ink">{val.toFixed(1)}</span>
                        </div>
                      );
                    }) : (
                      <p className="text-[12.5px] italic text-ink3 t-ink3">Sin puntajes disponibles.</p>
                    )}
                  </div>

                  {/* === RUBRIC ACCORDION === */}
                  {criteriaScores.length > 0 && criteriaScores.some((k: any) => k.why || k.reasoning || k.explanation) && (
                    <div className={`acc mt-3 rounded-xl border border-line2 t-line2 ${rubricOpen ? 'open' : ''}`}>
                      <button type="button" onClick={() => setRubricOpen(!rubricOpen)}
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left">
                        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ink t-ink">
                          <svg className="h-4 w-4 text-green t-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>
                          Ver el porqué (desglose IA)
                        </span>
                        <svg className="acc-chev h-4 w-4 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </button>
                      <div className="acc-body">
                        <div>
                          <div className="grid gap-3 px-3.5 pb-3.5">
                            {criteriaScores.map((k: any, i: number) => {
                              const why = k.why || k.reasoning || k.explanation || '';
                              if (!why) return null;
                              const val = typeof k.score === 'number' ? k.score : 0;
                              const t = val >= 8 ? 'good' : val >= 6 ? 'mid' : 'low';
                              const dotc = t === 'good' ? 'bg-good' : t === 'mid' ? 'bg-mid' : 'bg-low';
                              return (
                                <div key={i} className="flex gap-2.5">
                                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotc}`} />
                                  <p className="text-[12.5px] leading-relaxed text-ink2 t-ink2">
                                    <b className="font-semibold text-ink t-ink">{k.name || k.label || '—'} · {val.toFixed(1)}/10.</b> {why}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === SKILLS === */}
                  <h3 className="mt-6 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink3 t-ink3">
                    <svg className="h-3.5 w-3.5 text-cta t-cta" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z"/></svg>
                    Habilidades clave
                  </h3>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {showSkills.length > 0 ? (
                      <>
                        {showSkills.map((s: string, i: number) => (
                          <span key={i} className="rounded-md bg-greentint px-2 py-1 font-mono text-[11.5px] text-green t-goodt t-green">{s}</span>
                        ))}
                        {extraSkills > 0 && (
                          <span className="rounded-md bg-paper2 px-2 py-1 font-mono text-[11.5px] text-ink2 t-paper2 t-ink2">+{extraSkills} más</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[12.5px] italic text-ink3 t-ink3">Sin habilidades técnicas detectadas en el CV.</span>
                    )}
                  </div>

                  {/* === EDUCATION + CURRENT === */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-line2 bg-midt/50 p-3.5 t-line2">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-mid t-mid">Educación</span>
                      <p className="mt-1 text-[13px] font-semibold leading-snug text-ink t-ink">{curEdu?.titulo || '—'}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink2 t-ink2">{curEdu?.institucion || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-line2 bg-greentint/60 p-3.5 t-line2">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-green t-green">Actual</span>
                      <p className="mt-1 text-[13px] font-semibold leading-snug text-ink t-ink">{curExp?.cargo || '—'}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink2 t-ink2">{curExp?.empresa || '—'}</p>
                    </div>
                  </div>

                  {/* === CONTACT ACTIONS === */}
                  <div className="mt-5 rounded-xl border border-line2 p-3.5 t-line2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide ${stage.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${stage.dot}`}></span>{stage.label}
                      </span>
                      <span className="font-mono text-[10.5px] text-ink3 t-ink3">¿Cómo lo contactas?</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      <button type="button" onClick={() => {
                        const name = candidate.name?.split(' ')[0] || '';
                        const msg = encodeURIComponent(`Hola ${name}, te escribo de Evalen sobre tu postulación a ${campaign?.title || 'la campaña'}. ¿Tienes un momento?`);
                        window.open(`https://wa.me/${candidate.phone?.replace(/\D/g, '')}?text=${msg}`, '_blank');
                      }}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-line2 bg-card py-3 text-[12.5px] font-semibold text-ink transition hover:border-green hover:text-green t-card t-ink t-line2">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.7A8.4 8.4 0 1 1 21 11.5z"/></svg>
                        WhatsApp
                      </button>
                      <button type="button" onClick={() => {
                        window.location.href = `mailto:${candidate.email}?subject=Postulación a ${campaign?.title || 'campaña'}`;
                      }}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-line2 bg-card py-3 text-[12.5px] font-semibold text-ink transition hover:border-green hover:text-green t-card t-ink t-line2">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>
                        Email
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* === PANEL EXPERIENCIA === */}
              {activeTab === 'exp' && (
                <div className="px-6 py-5">
                  <h3 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink3 t-ink3">Trayectoria</h3>
                  <div className="tl mt-4 grid gap-5">
                    {experience.length > 0 ? experience.map((exp: any, i: number) => {
                      const from = exp.periodo?.fecha_inicio || exp.from || '';
                      const to = exp.periodo?.fecha_fin || exp.to || 'Presente';
                      const points = exp.logros || exp.achievements || exp.puntos || exp.points || [];
                      const desc = exp.descripcion || '';
                      return (
                        <div key={i} className="tl-item">
                          <p className="font-sans text-[14px] font-semibold leading-snug text-ink t-ink">{exp.cargo || exp.role || '—'}</p>
                          <p className="text-[12.5px] font-medium text-green t-green">{exp.empresa || exp.company || '—'}</p>
                          {(from || to) && (
                            <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-ink3 t-ink3">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M8 3v3M16 3v3"/></svg>
                              {from} – {to}
                            </p>
                          )}
                          {desc && <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2 t-ink2">{desc}</p>}
                          {points.length > 0 && (
                            <ul className="mt-1.5 grid gap-1">
                              {points.map((p: string, j: number) => (
                                <li key={j} className="flex gap-1.5 text-[12.5px] leading-snug text-ink2 t-ink2">
                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink3 t-ink3" />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    }) : (
                      <p className="text-[12.5px] italic text-ink3 t-ink3">No hay experiencia laboral registrada.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* === FOOTER === */}
        {candidate && (
          <div className="border-t border-line bg-card p-4 t-card t-line">
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={handleDownloadCV} disabled={downloading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line2 bg-paper/60 py-2.5 text-[12.5px] font-semibold text-ink transition hover:border-ink3 t-ink t-line2 disabled:opacity-50">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M8 11l4 4 4-4M5 21h14"/></svg>
                {downloading ? 'Descargando...' : 'Descargar CV'}
              </button>
              <button type="button" onClick={() => onViewAIAnalysis(candidate)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line2 bg-paper/60 py-2.5 text-[12.5px] font-semibold text-ink transition hover:border-ink3 t-ink t-line2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h6M10 16h4"/></svg>
                Análisis IA
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-2.5">
              <button type="button" onClick={() => onDismiss(candidate)} aria-label="Descartar candidato" title="Descartar"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line2 text-ink3 transition hover:border-low hover:bg-lowt hover:text-low t-ink3 t-line2">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
              </button>
              <div className="relative flex-1">
                <button type="button" onClick={() => {
                  if (hasProcess) { if (onViewProcess) { onViewProcess(candidate); } else { alert('Abre la campaña desde el listado para ver el proceso.'); } return; }
                  if (candidate.candidateStatus === 'NOT_SELECTED') {
                    onStartProcess(candidate);
                  } else if (candidate.candidateStatus === 'NEW') {
                    onStartProcess(candidate);
                  } else if (onViewProcess) {
                    onViewProcess(candidate);
                  } else {
                    setAdvanceOpen(!advanceOpen);
                  }
                }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cta py-3 text-[13.5px] font-semibold text-ctatext shadow-cta transition hover:-translate-y-0.5 hover:bg-ctah">
                  {hasProcess ? (
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3h7v7M21 3l-9 9M19 14v7H5V5h7"/></svg>
                  ) : (
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  )}
                  <span>{hasProcess ? 'Ver proceso' : candidate.candidateStatus === 'NOT_SELECTED' ? 'Reactivar candidato' : 'Avanzar en el proceso'}</span>
                  {!hasProcess && (
                    <svg className={`h-4 w-4 opacity-80 transition-transform ${advanceOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  )}
                </button>
                {advanceOpen && (
                  <div data-menu className="menu-show absolute bottom-full right-0 z-50 mb-2 w-60 overflow-hidden rounded-xl border border-line2 bg-card py-1.5 shadow-pop t-card t-line2">
                    <button type="button" onClick={() => { setAdvanceOpen(false); onStartProcess(candidate); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink2 transition hover:bg-paper2 t-ink2">
                      <svg className="h-4 w-4 text-green t-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.7A8.4 8.4 0 1 1 21 11.5z"/></svg>
                      Marcar como contactado
                    </button>
                    <button type="button" onClick={() => { setAdvanceOpen(false); onStartProcess(candidate); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink2 transition hover:bg-paper2 t-ink2">
                      <svg className="h-4 w-4 text-green t-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.5a3 3 0 0 1 0 5.5"/></svg>
                      Mover a Entrevista
                    </button>
                    <button type="button" onClick={() => { setAdvanceOpen(false); onStartProcess(candidate); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink2 transition hover:bg-paper2 t-ink2">
                      <svg className="h-4 w-4 text-green t-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/></svg>
                      Mover a Oferta
                    </button>
                    <div className="my-1 h-px bg-line t-line" />
                    <button type="button" onClick={() => { setAdvanceOpen(false); onStartProcess(candidate); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink2 transition hover:bg-paper2 t-ink2">
                      <svg className="h-4 w-4 text-green t-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>
                      Marcar como contratado
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    </>,
    document.body
  );
};

export default CandidateDrawer;