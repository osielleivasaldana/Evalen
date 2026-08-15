import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../layout/Layout';
import { apiService, ProcessInstance, StageStatus, GuideQuestion } from '../../services/api';

const GUIDE_SRC: Record<GuideQuestion['source'], { label: string; cls: string; dot: string }> = {
  rubrica: { label: 'Rúbrica del cargo', cls: 'bg-goodt text-ink2 t-goodt t-ink2', dot: 'bg-good' },
  brecha: { label: 'Brecha en CV', cls: 'bg-midt text-ink2 t-midt t-ink2', dot: 'bg-mid' },
  estandar: { label: 'Estándar de la etapa', cls: 'bg-paper2 text-ink2 t-paper2 t-ink2', dot: 'bg-ink3' },
  perfil: { label: 'Perfil del cargo', cls: 'bg-greentint text-ink2 t-greentint t-ink2', dot: 'bg-green' },
};

const segColor = (status: StageStatus) => {
  if (status === 'ACCEPTED') return 'bg-good t-good';
  if (status === 'REJECTED') return 'bg-low t-low';
  if (status === 'ACTIVE') return 'bg-cta t-cta';
  if (status === 'OMITTED') return 'bg-line2 t-line2';
  return 'bg-paper2 t-paper2';
};

const chipFor = (status: StageStatus) => {
  if (status === 'ACCEPTED') {
    return <span className="inline-flex items-center rounded-full bg-goodt px-2 py-0.5 font-sans text-[12.5px] font-semibold text-ink2 t-goodt t-ink2">Aprobada</span>;
  }
  if (status === 'REJECTED') {
    return <span className="inline-flex items-center rounded-full bg-lowt px-2 py-0.5 font-sans text-[12.5px] font-semibold text-ink2 t-lowt t-ink2">Rechazada</span>;
  }
  if (status === 'ACTIVE') {
    return <span className="inline-flex items-center rounded-full bg-midt px-2 py-0.5 font-sans text-[12.5px] font-semibold text-ink2 t-midt t-ink2">Activa</span>;
  }
  if (status === 'OMITTED') {
    return <span className="inline-flex items-center rounded-full bg-paper2 px-2 py-0.5 font-sans text-[12.5px] font-semibold text-ink3 t-paper2 t-ink3">Omitida</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-paper2 px-2 py-0.5 font-sans text-[12.5px] font-semibold text-ink3 t-paper2 t-ink3">Pendiente</span>;
};

const dotFor = (status: StageStatus) => {
  if (status === 'ACCEPTED') {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-good text-onmark t-good">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-low text-onmark t-low">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </span>
    );
  }
  if (status === 'ACTIVE') {
    return (
      <span className="animate-pulsering grid h-7 w-7 place-items-center rounded-full border-2 border-cta bg-card t-cta t-card">
        <span className="h-2 w-2 rounded-full bg-cta t-cta"></span>
      </span>
    );
  }
  if (status === 'OMITTED') {
    return <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-line bg-paper2 opacity-60 t-line t-paper2"></span>;
  }
  return <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-line2 bg-card t-line2 t-card"></span>;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const initialsOf = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const CandidateProcessPanel: React.FC = () => {
  const { campaignId, candidateId } = useParams<{ campaignId: string; candidateId: string }>();
  const navigate = useNavigate();

  const [process, setProcess] = useState<ProcessInstance | null>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [guide, setGuide] = useState<'loading' | GuideQuestion[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [openNote, setOpenNote] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState('');
  const [feedbackErr, setFeedbackErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; icon: string } | null>(null);
  const toastT = useRef<any>(null);
  const notesT = useRef<{ timer: ReturnType<typeof setTimeout>; stageId: string; fn: () => void } | null>(null);
  const mesaStageIdRef = useRef<string | null>(null);

  const showToast = (msg: string, type: string = 'info') => {
    const icons: Record<string, string> = {
      ok: '<svg class="h-4 w-4 text-good" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
      info: '<svg class="h-4 w-4 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
      warn: '<svg class="h-4 w-4 text-low" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>',
    };
    setToast({ msg, icon: icons[type] || icons.info });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 3200);
  };

  const loadData = useCallback(async () => {
    if (!campaignId || !candidateId) return;
    try {
      setLoading(true); setError(null);
      const [pc, camp, cand] = await Promise.all([
        apiService.getProcess(campaignId, candidateId),
        apiService.getCampaign(campaignId),
        apiService.getCandidate(candidateId),
      ]);
      setProcess(pc); setCampaign(camp); setCandidate(cand);
      const active = pc.stageInstances.find(s => s.status === 'ACTIVE');
      if (active?.guideJson?.questions) {
        setGuide(active.guideJson.questions);
        setNotes(active.notesJson || {});
      } else {
        setGuide(null);
        setNotes({});
      }
      setSelectedStageId(active?.id ?? pc.stageInstances[0]?.id ?? null);
    } catch (e: any) { setError(e.message || 'Error al cargar el proceso'); }
    finally { setLoading(false); }
  }, [campaignId, candidateId]);

  useEffect(() => { loadData(); }, [loadData]);

  const allStages = process?.stageInstances ?? [];
  const activeStage = allStages.find(s => s.status === 'ACTIVE') ?? null;
  const isOwner = process?.viewer === 'OWNER' || process?.viewer === undefined;
  const isResponsible = process?.viewer === 'STAGE_RESPONSIBLE';
  const stageById = (id: string | null) => allStages.find(s => s.id === id) ?? null;
  const mesaStage = isOwner && selectedStageId ? stageById(selectedStageId) : (isOwner ? activeStage : allStages[0] ?? null);
  mesaStageIdRef.current = mesaStage?.id ?? null;
  const processPk = process?.id ?? process?.processId ?? '';
  const canDecide = !!mesaStage && mesaStage.status === 'ACTIVE';
  const responsibleName = mesaStage?.responsible?.name ?? '';

  // Al cambiar de etapa en el acta (mesa en lectura), cargar guía y notas persistidas de esa etapa.
  useEffect(() => {
    if (!mesaStage) return;
    if (mesaStage.status === 'ACTIVE') {
      if (mesaStage.guideJson?.questions) {
        setGuide(mesaStage.guideJson.questions);
        setNotes(mesaStage.notesJson || {});
      } else {
        setGuide(null);
        setNotes({});
      }
      return;
    }
    setGuide(mesaStage.guideJson?.questions ?? null);
    setNotes(mesaStage.notesJson ?? {});
  }, [mesaStage?.id, mesaStage?.status]);

  const handleGenerateGuide = async () => {
    if (!process || !mesaStage || generating) return;
    const stageId = mesaStage.id;
    setGuide('loading');
    setGenerating(true);
    try {
      const res = await apiService.generateStageGuide(processPk, stageId);
      // Guard anti-race: si el usuario cambió de etapa mientras la IA generaba, descartar la respuesta.
      if (mesaStageIdRef.current !== stageId) return;
      setGuide(res.questions);
      setNotes({});
      setProcess(p => p ? {
        ...p,
        stageInstances: p.stageInstances.map(s => s.id === stageId ? { ...s, guideJson: { questions: res.questions }, notesJson: {} } : s),
      } : p);
      showToast(`Guía generada: ${res.questions.length} preguntas con procedencia.`, 'ok');
    } catch (e: any) {
      if (mesaStageIdRef.current === stageId) {
        setGuide(null);
        showToast(e.message || 'Error al generar la guía.', 'warn');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleNoteChange = (idx: number, value: string) => {
    setNotes(prev => { const n = { ...prev, [String(idx)]: value }; scheduleSave(n); return n; });
  };
  const scheduleSave = (n: Record<string, string>) => {
    if (!process || !mesaStage) return;
    const stageId = mesaStage.id;
    const fn = () => {
      apiService.updateStageNotes(processPk, stageId, n)
        .catch(() => showToast('No se pudo guardar la nota.', 'warn'));
    };
    const pending = notesT.current;
    if (pending) {
      clearTimeout(pending.timer);
      // Si el guardado pendiente era de otra etapa, flush inmediato: si no, se perdería al cambiar de etapa.
      if (pending.stageId !== stageId) pending.fn();
    }
    notesT.current = { timer: setTimeout(fn, 700), stageId, fn };
  };

  const handleDecide = async (approve: boolean) => {
    if (!process || !activeStage) return;
    const fb = feedback.trim();
    if (!approve && !fb) { setFeedbackErr(true); showToast('La retroalimentación es obligatoria al rechazar.', 'warn'); return; }
    setBusy(true);
    try {
      await apiService.updateStageDecision(activeStage.id, { decision: approve ? 'ACCEPTED' : 'REJECTED', feedback: fb });
      const idx = allStages.findIndex(s => s.id === activeStage.id);
      const next = allStages[idx + 1];
      showToast(
        approve
          ? (next ? `Etapa ${idx + 1} aprobada. Pasa a ${next.stageTemplate.name}.` : '¡Candidata seleccionada! Proceso completado.')
          : `Etapa ${idx + 1} rechazada. Proceso terminado.`,
        approve ? 'ok' : 'warn'
      );
      setFeedback('');
      await loadData();
    } catch (e: any) { showToast(e.message || 'Error al decidir.', 'warn'); }
    finally { setBusy(false); }
  };

  const handleReopen = async () => {
    if (!process) return;
    setBusy(true);
    try {
      const rejected = allStages.find(s => s.status === 'REJECTED');
      await apiService.reopenProcess(processPk);
      showToast(`Proceso reabierto. La etapa ${rejected?.stageTemplate.name ?? 'rechazada'} vuelve a estar activa.`, 'info');
      await loadData();
    }
    catch (e: any) { showToast(e.message || 'Error al reabrir.', 'warn'); }
    finally { setBusy(false); }
  };

  const activeIdx = allStages.findIndex(s => s.status === 'ACTIVE');
  const candidateStatus = candidate?.candidateStatus;
  const terminal = candidateStatus === 'SELECTED' || candidateStatus === 'NOT_SELECTED' || (!candidateStatus && !!process?.endDate);
  const terminalSelected = candidateStatus === 'SELECTED';
  const statusChip = terminal
    ? (terminalSelected
        ? { cls: 'bg-goodt t-goodt', dot: 'bg-good', label: 'Seleccionado' }
        : { cls: 'bg-lowt t-lowt', dot: 'bg-low', label: 'No seleccionado' })
    : { cls: 'bg-midt t-midt', dot: 'bg-cta animate-pulsering', label: 'En proceso' };
  const progLabel = terminal
    ? (terminalSelected ? 'Completado · seleccionado' : 'Terminado · no seleccionado')
    : `Etapa ${activeIdx + 1} de ${allStages.length}`;
  const matchScore = Math.round(candidate?.scoring?.overallScore ?? 0);
  const sensitiveText = () => {
    const parts: string[] = [];
    if (process?.sensitive?.salary) parts.push(`Pretensiones: ${process.sensitive.salary}`);
    if (process?.sensitive?.modality) parts.push(`Modalidad: ${process.sensitive.modality}`);
    return parts.join(' · ');
  };
  const mesaIdx = mesaStage ? allStages.findIndex(s => s.id === mesaStage.id) : -1;
  const contextStages = () => {
    if (!process || !mesaStage) return [];
    const idx = process.stageInstances.findIndex(s => s.id === mesaStage.id);
    return process.stageInstances.slice(0, idx).filter(s => s.status === 'ACCEPTED' || s.status === 'REJECTED');
  };
  const askedBefore = () => {
    if (!process || !mesaStage) return [];
    const out: string[] = [];
    for (const s of process.stageInstances) {
      if (s.id === mesaStage.id) continue;
      if ((s.status === 'ACCEPTED' || s.status === 'REJECTED') && s.guideJson?.questions?.length) {
        for (const q of s.guideJson.questions) out.push(`${q.question} · cubierta en ${s.stageTemplate.name}`);
      }
    }
    return out;
  };

  const renderGuide = () => {
    if (guide === 'loading') {
      return (
        <div className="mt-5 grid gap-4" aria-label="Generando preguntas">
          {[0, 1, 2].map(i => (
            <div key={i} className="grid gap-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-paper2 t-paper2"></div>
              <div className="h-3 w-1/2 animate-pulse rounded bg-paper2 t-paper2"></div>
            </div>
          ))}
        </div>
      );
    }
    if (!guide) {
      return (
        <>
          <p className="mt-3 text-[14px] leading-relaxed text-ink2 t-ink2">La IA prepara preguntas apoyándose en el CV, la rúbrica del cargo y el feedback de las etapas anteriores.</p>
          <button type="button" onClick={handleGenerateGuide} disabled={generating} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cta px-4 py-3.5 text-[15px] font-semibold text-ctatext shadow-cta transition hover:-translate-y-0.5 hover:bg-ctah disabled:translate-y-0 disabled:opacity-60 disabled:hover:bg-cta">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 1.7 4.6L18 8l-4.3 1.4L12 14l-1.7-4.6L6 8l4.3-1.4z"/><path d="M18.5 13.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"/></svg>
            {generating ? 'Generando…' : 'Generar preguntas con IA'}
          </button>
        </>
      );
    }
    const asked = askedBefore();
    return (
      <>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <p className="inline-flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">
            <svg className="h-3.5 w-3.5" style={{ color: 'var(--yellow)' }} viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 1.7 4.6L18 8l-4.3 1.4L12 14l-1.7-4.6L6 8l4.3-1.4z"/></svg>
            Guía de entrevista · {guide.length} preguntas
          </p>
          <button type="button" onClick={handleGenerateGuide} disabled={generating} className="ml-auto font-mono text-[12.5px] font-medium text-cta underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline t-cta">{generating ? 'Generando…' : 'Regenerar'}</button>
        </div>
        {asked.length > 0 && (
          <div className="mt-3 rounded-xl border border-line2 bg-paper/60 p-3 t-line2">
            <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink2 t-ink2">Ya preguntado antes · no repetir</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {asked.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-goodt px-2.5 py-1 font-sans text-[12.5px] font-medium text-ink2 t-goodt t-ink2">
                  <svg className="h-3.5 w-3.5 text-good t-good" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
        <ol className="mt-4 grid gap-3.5">
          {guide.map((p, idx) => {
            const src = GUIDE_SRC[p.source] || GUIDE_SRC.estandar;
            const noteOpen = !!openNote[idx] || !!notes[String(idx)];
            return (
              <li key={idx} className="rounded-2xl border border-line2 bg-card p-4 shadow-soft t-card t-line2">
                <div className="flex items-start gap-3.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-greendeep font-mono text-[13px] font-semibold text-onmark">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15.5px] font-medium leading-relaxed text-ink t-ink">{p.question}</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11.5px] font-medium ${src.cls}`} title="Por qué se pregunta">
                        <span className={`h-1.5 w-1.5 rounded-full ${src.dot}`}></span>{src.label}
                      </span>
                    </div>
                    {noteOpen ? (
                      <textarea
                        rows={3}
                        value={notes[String(idx)] || ''}
                        onChange={e => handleNoteChange(idx, e.target.value)}
                        placeholder="Nota de la respuesta… alimentará la próxima etapa"
                        className="mt-3 w-full rounded-xl border border-line2 bg-paper/60 px-3.5 py-3 text-[14px] leading-relaxed text-ink placeholder:text-ink3/80 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink t-line2"
                      />
                    ) : (
                      <button type="button" onClick={() => setOpenNote(prev => ({ ...prev, [idx]: true }))} className="mt-3 inline-flex items-center gap-1 font-mono text-[12.5px] font-medium text-cta t-cta">＋ añadir nota de la respuesta</button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 flex items-center gap-1.5 font-mono text-[12.5px] text-ink2 t-ink2">
          <svg className="h-3.5 w-3.5 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          Tus notas alimentan las preguntas de la siguiente etapa.
        </p>
      </>
    );
  };

  const renderReadOnlyGuide = () => {
    if (guide === 'loading') {
      return (
        <div className="mt-5 grid gap-4" aria-label="Generando preguntas">
          {[0, 1, 2].map(i => (
            <div key={i} className="grid gap-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-paper2 t-paper2"></div>
              <div className="h-3 w-1/2 animate-pulse rounded bg-paper2 t-paper2"></div>
            </div>
          ))}
        </div>
      );
    }
    if (!guide || !guide.length) {
      return <p className="mt-3 text-[14px] leading-relaxed text-ink2 t-ink2">Esta etapa no tiene guía de entrevista generada.</p>;
    }
    return (
      <ol className="mt-4 grid gap-3.5">
        {guide.map((p, idx) => {
          const src = GUIDE_SRC[p.source] || GUIDE_SRC.estandar;
          const note = notes[String(idx)];
          return (
            <li key={idx} className="rounded-2xl border border-line2 bg-card p-4 shadow-soft t-card t-line2">
              <div className="flex items-start gap-3.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-greendeep font-mono text-[13px] font-semibold text-onmark">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15.5px] font-medium leading-relaxed text-ink t-ink">{p.question}</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11.5px] font-medium ${src.cls}`} title="Por qué se pregunta">
                      <span className={`h-1.5 w-1.5 rounded-full ${src.dot}`}></span>{src.label}
                    </span>
                  </div>
                  {note && (
                    <p className="mt-2.5 rounded-lg bg-paper/60 px-3 py-2 text-[13px] leading-relaxed text-ink2 t-ink2">
                      <span className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink3 t-ink3">Nota · </span>{note}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    );
  };

  const renderFeedback = () => {
    if (!canDecide) return null;
    return (
      <div className="mt-6 border-t border-line pt-5 t-line">
        <label htmlFor="fb" className="block font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Retroalimentación de tu decisión</label>
        <textarea
          id="fb"
          rows={3}
          value={feedback}
          onChange={e => { setFeedback(e.target.value); if (feedbackErr) setFeedbackErr(false); }}
          placeholder="Escribe el porqué de tu decisión… (obligatoria al rechazar)"
          className={`mt-2 w-full rounded-xl border bg-paper/60 px-3.5 py-3 text-[14px] leading-relaxed text-ink placeholder:text-ink3/80 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink t-line2 ${feedbackErr ? 'animate-shake' : ''}`}
          style={feedbackErr ? { borderColor: 'var(--low)' } : undefined}
        />
        <p className={`mt-1.5 text-[12.5px] font-medium text-low t-low ${feedbackErr ? '' : 'hidden'}`}>La retroalimentación es obligatoria al rechazar una etapa.</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <button type="button" onClick={() => handleDecide(true)} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-good px-4 py-3 text-[14px] font-semibold text-onmark transition hover:brightness-110 disabled:opacity-60 t-good">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            Aprobar etapa
          </button>
          <button type="button" onClick={() => handleDecide(false)} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-low px-4 py-3 text-[14px] font-semibold text-onmark transition hover:brightness-110 disabled:opacity-60 t-low">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
            Rechazar etapa
          </button>
        </div>
      </div>
    );
  };

  const renderMesa = () => {
    if (!process) return null;
    if (terminal) {
      return (
        <div key="terminal" className="rise rounded-2xl border border-line2 bg-card p-6 shadow-card t-card t-line2">
          <div className="flex items-start gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-onmark ${terminalSelected ? 'bg-good t-good' : 'bg-low t-low'}`}>
              {terminalSelected ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
              )}
            </span>
            <div>
              <h3 className="font-sans text-[1.3rem] font-bold text-ink t-ink">{terminalSelected ? 'Candidata seleccionada' : 'Proceso terminado'}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-ink2 t-ink2">
                {terminalSelected
                  ? `${candidate?.name || 'La candidata'} completó todas las etapas. El acta quedó firmada.`
                  : 'El proceso terminó en una etapa rechazada. El acta conserva cada decisión.'}
              </p>
            </div>
          </div>
          {!terminalSelected && (
            <button type="button" onClick={handleReopen} disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line2 bg-card px-4 py-3 text-[14px] font-semibold text-ink2 transition hover:border-ink hover:text-ink disabled:opacity-60 t-card t-ink2 t-line2">
              {busy ? 'Reabriendo…' : 'Reabrir proceso'}
            </button>
          )}
        </div>
      );
    }
    if (!mesaStage) {
      return (
        <div className="rounded-2xl border border-line2 bg-card p-6 shadow-card t-card t-line2">
          <p className="text-[14px] leading-relaxed text-ink2 t-ink2">No hay una etapa activa en este momento.</p>
        </div>
      );
    }
    const readOnly = mesaStage.status !== 'ACTIVE';
    const ctx = contextStages();
    const sens = sensitiveText();
    return (
      <div key={mesaStage.id} className="rise rounded-2xl border border-line2 bg-card p-6 shadow-card t-card t-line2">
        <p className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">
          {readOnly ? 'Mesa de la etapa · lectura' : (isResponsible ? 'Mesa de tu etapa' : 'Mesa de la etapa activa')}
        </p>
        <h3 className="mt-1 font-sans text-[1.5rem] font-bold tracking-tight text-ink t-ink">Etapa {mesaIdx + 1}: {mesaStage.stageTemplate.name}</h3>
        <p className="mt-1.5 inline-flex items-center gap-1.5 font-sans text-[13px] text-ink2 t-ink2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-greendeep font-mono text-[11px] font-semibold text-onmark">{initialsOf(responsibleName)}</span>
          {responsibleName}
        </p>
        {readOnly && (
          <div className="rise mt-4 grid gap-1.5 border-l-2 pl-4" style={{ borderColor: mesaStage.status === 'ACCEPTED' ? 'var(--good)' : 'var(--low)' }}>
            <p className="font-mono text-[12.5px] text-ink2 t-ink2">Decidido el {formatDate(mesaStage.decidedAt)} · {responsibleName}</p>
            {mesaStage.feedback && <p className="text-[14px] font-medium leading-relaxed text-ink t-ink">“{mesaStage.feedback}”</p>}
            {isOwner && sens && (
              <p className="flex items-start gap-1.5 text-[12.5px] text-ink2 t-ink2">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
                {sens}
              </p>
            )}
          </div>
        )}
        {ctx.length > 0 && (
          <div className="mt-4">
            <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink2 t-ink2">Contexto de etapas anteriores</p>
            <div className="mt-2 grid gap-2">
              {ctx.map(cs => {
                const ci = allStages.findIndex(s => s.id === cs.id);
                return (
                  <div key={cs.id} className="rounded-xl border border-line2 bg-paper/60 p-3 t-line2">
                    <p className="font-mono text-[12px] text-ink2 t-ink2">Etapa {ci + 1} · {cs.stageTemplate.name} · {cs.status === 'ACCEPTED' ? 'Aprobada' : 'Rechazada'}</p>
                    {cs.feedback && <p className="mt-1 text-[14px] font-medium leading-relaxed text-ink t-ink">“{cs.feedback}”</p>}
                    {isOwner && sens && (
                      <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-ink2 t-ink2">
                        <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
                        {sens}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-5 border-t border-line pt-4 t-line">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">
              <svg className="h-3.5 w-3.5" style={{ color: 'var(--yellow)' }} viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 1.7 4.6L18 8l-4.3 1.4L12 14l-1.7-4.6L6 8l4.3-1.4z"/></svg>
              Guía de entrevista
            </p>
          </div>
          {readOnly ? renderReadOnlyGuide() : renderGuide()}
        </div>
        {renderFeedback()}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-paper text-ink font-sans antialiased [text-rendering:optimizeLegibility]">
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] bg-grain opacity-[0.045] mix-blend-overlay"></div>
          <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-10 w-10 shrink-0 animate-pulse rounded-xl bg-paper2 t-paper2"></div>
              <div className="min-w-0 flex-1">
                <div className="h-3 w-56 animate-pulse rounded bg-paper2 t-paper2"></div>
                <div className="mt-3 h-9 w-72 animate-pulse rounded bg-paper2 t-paper2"></div>
                <div className="mt-3 h-3 w-64 animate-pulse rounded bg-paper2 t-paper2"></div>
              </div>
            </div>
            <div className="mt-7">
              <div className="h-3 w-40 animate-pulse rounded bg-paper2 t-paper2"></div>
              <div className="mt-2.5 flex gap-1.5">
                {[0, 1, 2, 3].map(i => <div key={i} className="h-2 flex-1 animate-pulse rounded-full bg-paper2 t-paper2"></div>)}
              </div>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.5fr] lg:gap-10">
              <div className="order-2 lg:order-1">
                <div className="h-6 w-40 animate-pulse rounded bg-paper2 t-paper2"></div>
                <div className="mt-6 grid gap-6">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="flex gap-4">
                      <div className="h-7 w-7 animate-pulse rounded-full bg-paper2 t-paper2"></div>
                      <div className="grid flex-1 gap-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-paper2 t-paper2"></div>
                        <div className="h-3 w-1/2 animate-pulse rounded bg-paper2 t-paper2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="rounded-2xl border border-line2 bg-card p-6 shadow-card t-card t-line2">
                  <div className="h-3 w-40 animate-pulse rounded bg-paper2 t-paper2"></div>
                  <div className="mt-3 h-7 w-64 animate-pulse rounded bg-paper2 t-paper2"></div>
                  <div className="mt-4 h-3 w-48 animate-pulse rounded bg-paper2 t-paper2"></div>
                  <div className="mt-6 h-24 animate-pulse rounded-xl bg-paper2 t-paper2"></div>
                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    <div className="h-11 animate-pulse rounded-xl bg-paper2 t-paper2"></div>
                    <div className="h-11 animate-pulse rounded-xl bg-paper2 t-paper2"></div>
                  </div>
                </div>
              </div>
            </div>
          </main>
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
            <h2 className="mb-3 font-sans text-[1.4rem] font-bold text-ink t-ink">Error al cargar el proceso</h2>
            <p className="mb-6 text-[15px] leading-relaxed text-ink2 t-ink2">{error}</p>
            <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl bg-cta px-5 py-2.5 text-[14px] font-semibold text-ctatext shadow-cta transition hover:bg-ctah">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/></svg>
              Reintentar
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!process) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-paper2 t-paper2">
              <svg className="h-7 w-7 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
            </div>
            <h2 className="mb-3 font-sans text-[1.4rem] font-bold text-ink t-ink">Proceso no disponible</h2>
            <p className="mb-6 text-[15px] leading-relaxed text-ink2 t-ink2">No se encontró un proceso de selección para este candidato en la campaña.</p>
            <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl bg-cta px-5 py-2.5 text-[14px] font-semibold text-ctatext shadow-cta transition hover:bg-ctah">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/></svg>
              Reintentar
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isResponsible) {
    // SANDBOX: sin acta, sin progreso, sin "Etapa N de M", sin match, sin sensitive.
    // El responsable solo ve su propia etapa: guía + notas + feedback + decidir.
    return (
      <Layout>
        <div className="min-h-screen bg-paper text-ink font-sans antialiased [text-rendering:optimizeLegibility]">
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] bg-grain opacity-[0.045] mix-blend-overlay"></div>
          <main className="mx-auto max-w-[760px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <button type="button" onClick={() => navigate(`/campaigns/${campaignId}/candidates`)} aria-label="Volver" className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line2 bg-card text-ink2 transition hover:border-ink hover:text-ink t-card t-ink2 t-line2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
              </button>
              <div className="min-w-0">
                <p className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Mi etapa asignada · {campaign?.title}</p>
                <h1 className="mt-1 font-sans text-[1.9rem] font-bold leading-[1.05] tracking-[-0.02em] text-ink t-ink">{mesaStage?.stageTemplate?.name ?? 'Etapa'}</h1>
                <p className="mt-2 inline-flex items-center gap-1.5 font-sans text-[13px] text-ink2 t-ink2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-greendeep font-mono text-[11px] font-semibold text-onmark">{initialsOf(responsibleName)}</span>
                  {responsibleName} · Candidato: {candidate?.name}
                </p>
              </div>
            </div>
            <div className="rise mt-7 rounded-2xl border border-line2 bg-card p-6 shadow-card t-card t-line2">
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">
                  <svg className="h-3.5 w-3.5" style={{ color: 'var(--yellow)' }} viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 1.7 4.6L18 8l-4.3 1.4L12 14l-1.7-4.6L6 8l4.3-1.4z"/></svg>
                  Guía de entrevista
                </p>
              </div>
              {mesaStage?.status === 'ACTIVE' ? renderGuide() : renderReadOnlyGuide()}
              {renderFeedback()}
            </div>
          </main>
        </div>

        {/* Toast */}
        <div id="toastItem" aria-live="polite" role="status"
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-paper text-ink font-sans antialiased [text-rendering:optimizeLegibility]">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] bg-grain opacity-[0.045] mix-blend-overlay"></div>
        <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          {/* identidad */}
          <div className="flex items-start gap-4">
            <button type="button" onClick={() => navigate(`/campaigns/${campaignId}/candidates`)} className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line2 bg-card text-ink2 transition hover:border-ink hover:text-ink t-card t-ink2 t-line2" aria-label="Volver">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Campaña {campaign?.title || process?.campaign?.title || ''} · Proceso de selección</p>
              <h1 className="mt-1 font-sans text-[2rem] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[2.4rem] t-ink">{candidate?.name || process?.candidate?.name || ''}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink2 t-ink2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans text-[12.5px] font-semibold text-ink2 ${statusChip.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusChip.dot}`}></span> {statusChip.label}
                </span>
                <span className="hidden h-3 w-px bg-line2 sm:block t-line2"></span>
                {process?.startDate && <span className="font-mono text-[12.5px]">Inicio {formatDate(process.startDate)}</span>}
                <span className="hidden h-3 w-px bg-line2 sm:block t-line2"></span>
                <Link to={`/campaigns/${campaignId}/candidate/${candidateId}`} className="font-semibold text-cta underline-offset-2 hover:underline t-cta">
                  {candidate?.scoring?.overallScore != null ? `Match ${matchScore} · ver análisis →` : 'ver análisis →'}
                </Link>
              </div>
            </div>
          </div>

          {/* progreso */}
          <div className="mt-7">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Progreso del proceso</span>
              <span className="font-mono text-[12.5px] text-ink2 t-ink2">{progLabel}</span>
            </div>
            <div className="mt-2.5 flex gap-1.5" aria-hidden="true">
              {allStages.map(s => (
                <span key={s.id} className={`h-2 flex-1 rounded-full transition-colors duration-500 ${segColor(s.status)}`}></span>
              ))}
            </div>
          </div>

          {/* grid: acta + mesa */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.5fr] lg:gap-10">
            {/* ===== ACTA ===== */}
            <section aria-label="Acta del proceso" className="order-2 lg:order-1">
              <div className="flex items-end justify-between gap-3 border-b border-line pb-3 t-line">
                <h2 className="font-sans text-[1.35rem] font-bold tracking-tight text-ink t-ink">Acta del proceso</h2>
                <span className="font-mono text-[12px] text-ink2 t-ink2">{isOwner ? 'Acceso completo · dueño' : 'Acceso limitado · tu etapa'}</span>
              </div>
              <div className="mt-6">
                {allStages.map((s, i) => {
                  const decided = s.status === 'ACCEPTED' || s.status === 'REJECTED';
                  const sens = sensitiveText();
                  const selected = selectedStageId === s.id;
                  return (
                    <div key={s.id} className="relative grid grid-cols-[28px_1fr] gap-4">
                      <div className="flex flex-col items-center">
                        {dotFor(s.status)}
                        {i < allStages.length - 1 && <span className="w-px flex-1 bg-line2 t-line2"></span>}
                      </div>
                      <div className={i === allStages.length - 1 ? 'pb-1' : 'pb-8'}>
                        <button type="button" onClick={() => setSelectedStageId(s.id)} className="flex flex-wrap items-center gap-2.5 text-left" aria-current={selected ? 'true' : 'false'}>
                          <h3 className={`font-sans text-[16px] font-semibold leading-snug transition-colors ${selected ? 'text-green t-green' : 'text-ink hover:text-green t-ink'}`}>Etapa {i + 1}: {s.stageTemplate.name}</h3>
                          {chipFor(s.status)}
                        </button>
                        <p className="mt-1 inline-flex items-center gap-1.5 font-sans text-[13px] text-ink2 t-ink2">
                          <svg className="h-3.5 w-3.5 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>
                          {s.responsible?.name || 'Sin responsable'}
                        </p>
                        {decided && (
                          <div className="rise mt-3 grid gap-1.5 border-l-2 pl-4" style={{ borderColor: s.status === 'ACCEPTED' ? 'var(--good)' : 'var(--low)' }}>
                            <p className="font-mono text-[12.5px] text-ink2 t-ink2">Decidido el {formatDate(s.decidedAt)} · {s.responsible?.name || ''}</p>
                            {s.feedback && <p className="text-[14px] font-medium leading-relaxed text-ink t-ink">“{s.feedback}”</p>}
                            {isOwner && sens && (
                              <p className="flex items-start gap-1.5 text-[12.5px] text-ink2 t-ink2">
                                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
                                {sens}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ===== MESA ===== */}
            <section aria-label="Mesa de la etapa" className="order-1 lg:order-2">
              {renderMesa()}
            </section>
          </div>
        </main>
      </div>

      {/* Toast */}
      <div id="toastItem" aria-live="polite" role="status"
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
    </Layout>
  );
};

export default CandidateProcessPanel;