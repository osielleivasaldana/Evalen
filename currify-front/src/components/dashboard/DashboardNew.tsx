import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiService, DashboardCampaign, DashboardDecisionCandidate, DashboardSummary, DashboardTopCandidate } from '../../services/api';
import NavBar from '../layout/NavBar';

/* ============== types ============== */
interface ToastState { msg: string; type?: 'ok' | 'info' | 'warn'; }
interface CandFilter { match60: boolean; nodiscard: boolean; }

/* ============== helpers ============== */
const ICONS: Record<string, string> = {
  ok: '<svg class="h-4 w-4 text-good t-good" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  info: '<svg class="h-4 w-4 text-green t-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  warn: '<svg class="h-4 w-4 text-mid t-mid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>',
};

function greet(): string { const h = new Date().getHours(); return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'; }
function todayStr(): string { try { const d = new Date(); const s = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(d); return s.charAt(0).toUpperCase() + s.slice(1); } catch { return ''; } }

function Sparkline({ data, color }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const W = 100, H = 30, pad = 3;
  const min = Math.min(...data), max = Math.max(...data);
  const span = (max - min) || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y];
  });
  const line = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  const up = data[data.length - 1] >= data[0];
  const c = color || (up ? 'var(--good)' : 'var(--low)');
  const area = pad + ',' + (H - pad) + ' ' + line + ' ' + (W - pad) + ',' + (H - pad);
  return (
    <span className="w-20 shrink-0 opacity-90">
      <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <polygon points={area} fill={c} opacity="0.12" />
        <polyline points={line} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r="2.6" fill={c} />
      </svg>
    </span>
  );
}

function FunnelBar({ data }: { data: number[] }) {
  const total = data.reduce((a, b) => a + (b || 0), 0);
  const colors = ['var(--ink3)', 'var(--mid)', 'var(--good)', 'var(--good)'];
  const opac = ['0.4', '1', '0.55', '1'];
  if (total <= 0) {
    return <div className="h-full w-full" style={{ background: 'repeating-linear-gradient(90deg,transparent,transparent 6px,rgba(130,142,132,.25) 6px,rgba(130,142,132,.25) 12px)' }} />;
  }
  return (
    <>
      {data.map((c, i) => c ? <div key={i} style={{ width: (c / total * 100) + '%', background: colors[i], opacity: opac[i] }} /> : null)}
    </>
  );
}

/* ============== Toast ============== */
function Toast({ toast, onHide }: { toast: ToastState | null; onHide: () => void }) {
  const tr = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!toast) return;
    if (tr.current) clearTimeout(tr.current);
    tr.current = setTimeout(onHide, 3800);
    return () => { if (tr.current) clearTimeout(tr.current); };
  }, [toast, onHide]);
  if (!toast) return null;
  const show = !!toast;
  return (
    <div role="status" aria-live="polite"
      className={`pointer-events-none fixed inset-x-4 bottom-5 z-70 mx-auto flex max-w-sm items-start gap-3 rounded-xl border border-line2 bg-card px-4 py-3 text-[13.5px] text-ink shadow-card t-card t-ink t-line2 transition-all duration-300 sm:inset-x-auto sm:right-6 sm:max-w-sm ${show ? 'translate-y-0 opacity-100' : 'translate-y-[140%] opacity-0'}`}>
      <span className="mt-0.5 shrink-0" dangerouslySetInnerHTML={{ __html: ICONS[toast.type || 'info'] || ICONS.info }} />
      <span className="leading-snug">{toast.msg}</span>
    </div>
  );
}

/* ============== Stats ============== */

/* ============== Stats ============== */
function StatsRow({ stats }: { stats: DashboardSummary['stats'] }) {
  return (
    <section className="mt-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de actividad">
      <article className="group relative overflow-hidden rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-soft t-card t-line">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">Campañas activas</span>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-greentint text-green t-goodt t-green">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <span className="whitespace-nowrap font-sans text-[2.4rem] font-bold leading-none tracking-tight tabular-nums text-ink t-ink">{stats.activeCampaigns}</span>
          <Sparkline data={[1, 1, 1, 2, 2, stats.activeCampaigns]} />
        </div>
        <p className="mt-2 text-[12.5px] text-ink2 t-ink2"><span className="font-medium text-ink t-ink">{stats.draftCampaigns} en borrador</span> · {stats.closedCampaigns} cerradas</p>
      </article>

      <article className="group relative overflow-hidden rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-soft t-card t-line">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">CVs evaluados</span>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-greentint text-green t-goodt t-green">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12.5l1.8 1.8 3.2-3.6" /></svg>
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <span className="whitespace-nowrap font-sans text-[2.4rem] font-bold leading-none tracking-tight tabular-nums text-ink t-ink">{stats.evaluatedCVs}</span>
          <Sparkline data={[80, 92, 98, 110, 120, stats.evaluatedCVs]} />
        </div>
        <p className="mt-2 text-[12.5px] text-ink2 t-ink2"><span className="font-medium text-good t-good">+{stats.weeklyIncrease}</span> esta semana</p>
      </article>

      <article className="group relative overflow-hidden rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-soft t-card t-line">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">En entrevista</span>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-midt text-mid t-midt t-mid">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 6.5a3 3 0 0 1 0 5.5M17.5 19a5 5 0 0 0-3-4.6" /></svg>
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <span className="whitespace-nowrap font-sans text-[2.4rem] font-bold leading-none tracking-tight tabular-nums text-ink t-ink">{stats.inInterview}</span>
          <Sparkline data={[2, 3, 3, 4, 5, stats.inInterview]} />
        </div>
        <p className="mt-2 text-[12.5px] text-ink2 t-ink2">tasa de pase <span className="font-medium text-ink t-ink">{stats.evaluatedCVs ? ((stats.inInterview / stats.evaluatedCVs) * 100).toFixed(1) : '0'}%</span></p>
      </article>

      <article className="group relative overflow-hidden rounded-2xl border border-line bg-greendeep p-5 text-onmark">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-onmark/70">Tiempo ahorrado</span>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-onmark/15 text-yellow">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <span className="whitespace-nowrap font-sans text-[2.4rem] font-bold leading-none tracking-tight tabular-nums">{stats.timeSavedHours}<span className="text-[1.2rem] font-semibold text-onmark/70"> h</span></span>
          <Sparkline data={[2, 3, 4, 5, 7, stats.timeSavedHours]} color="#F3E94E" />
        </div>
        <p className="mt-2 text-[12.5px] text-onmark/75">esta semana · vs. lectura manual</p>
      </article>
    </section>
  );
}

/* ============== Campaign Card ============== */
function CampaignCard({ camp, onNavigate, onEdit, onPublish, publishingId }: { camp: DashboardCampaign; onNavigate?: (id: string) => void; onEdit?: (id: string) => void; onPublish?: (id: string) => void; publishingId?: string | null }) {
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        menuRef.current.style.display = 'none';
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const statusColor = camp.status === 'DRAFT' ? 'mid' : paused ? 'ink2' : 'good';
  const statusLabel = camp.status === 'DRAFT' ? 'Borrador' : paused ? 'Pausada' : 'Activa';
  const draftClass = camp.status === 'DRAFT' ? 'border-dashed border-line2 bg-card/60 t-card t-line2' : 'border-line bg-card t-card t-line';

  const funnelVals = camp.funnel ? [camp.funnel.review, camp.funnel.interview, camp.funnel.offer, camp.funnel.hired] : [0, 0, 0, 0];

  return (
    <article data-camp className={`rounded-2xl border p-5 transition hover:border-line2 hover:shadow-soft ${draftClass} ${paused ? 'opacity-90' : ''}`}>
      <div className="flex items-start gap-4">
        <span className={`mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl ${camp.status === 'DRAFT' ? 'border border-dashed border-line2 text-ink3 t-ink3 t-line2' : camp.status === 'ACTIVE' ? 'bg-greentint text-green t-goodt t-green' : 'bg-midt text-mid t-midt t-mid'}`}>
          {camp.status === 'DRAFT' ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m8 9-3 3 3 3M16 9l3 3-3 3M13.5 6l-3 12" /></svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="cursor-pointer font-sans text-[1.18rem] font-semibold leading-tight tracking-tight text-ink transition hover:text-green t-ink" onClick={() => onNavigate?.(camp.id)}>{camp.title}</h3>
            <span data-status-chip className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-wide ${statusColor === 'good' ? 'bg-goodt text-good t-goodt t-good' : statusColor === 'mid' ? 'bg-midt text-mid t-midt t-mid' : 'bg-paper2 text-ink2 t-paper2 t-ink2'}`}>
              <span className={`h-1.5 w-1.5 rounded-full bg-${statusColor}`}></span> {statusLabel}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-[13.5px] text-ink2 t-ink2">{camp.description || 'Aún sin descripción. Completa la oferta y Evalen arma la rúbrica por ti en segundos.'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink3 t-ink3">
            {camp.modality && <span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-4.4-7-10a7 7 0 0 1 14 0c0 5.6-7 10-7 10z" /><circle cx="12" cy="11" r="2.4" /></svg> {camp.modality === 'REMOTE' ? '100% remoto' : camp.modality === 'HYBRID' ? `Híbrido · ${camp.location || ''}` : camp.location || ''}</span>}
            <span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 3v3M16 3v3" /></svg> Creada {new Date(camp.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
            <span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /></svg> {camp.candidateCount} candidatos</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {camp.status === 'DRAFT' ? (
            <>
              <button type="button" onClick={() => onEdit?.(camp.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-card px-3.5 py-2 text-[12.5px] font-semibold text-ink transition hover:-translate-y-0.5 hover:border-ink t-card t-ink2 t-line2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                Editar
              </button>
              <button type="button" disabled={publishingId === camp.id} onClick={() => onPublish?.(camp.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-greendeep px-3.5 py-2 text-[12.5px] font-semibold text-onmark transition hover:-translate-y-0.5 disabled:opacity-50">
                {publishingId === camp.id ? 'Publicando...' : 'Publicar'}
                {publishingId === camp.id ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="9" strokeDasharray="50" strokeLinecap="round" /></svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                )}
              </button>
            </>
          ) : (
            <><button type="button" aria-label="Subir CVs a esta campaña" onClick={() => setToast({ msg: `Subiendo CVs a "${camp.title}"… (demo)`, type: 'info' })}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-ink2 transition hover:border-green hover:text-green t-ink2 t-line2">
              <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /></svg>
            </button>
            <button type="button" data-action="pause" aria-label="Pausar campaña" onClick={() => setPaused(p => !p)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-ink2 transition hover:border-mid hover:text-mid t-ink2 t-line2">
              <svg className={`pause-ic h-[17px] w-[17px] ${paused ? 'hidden' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="5" width="3.5" height="14" rx="1.2" /><rect x="13.5" y="5" width="3.5" height="14" rx="1.2" /></svg>
              <svg className={`play-ic h-[17px] w-[17px] ${paused ? '' : 'hidden'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
            </button>
            <div className="relative">
              <button type="button" data-kebab aria-haspopup="true" aria-label="Más opciones" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); console.log('kebab click', camp.id); if (menuRef.current) { const shown = menuRef.current.style.display !== 'none'; menuRef.current.style.display = shown ? 'none' : 'block'; } }}
                className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-ink2 transition hover:border-ink hover:text-ink t-ink2 t-line2">
                <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></svg>
              </button>
              <div ref={menuRef} style={{ display: 'none', position: 'absolute', right: 0, zIndex: 50, marginTop: '0.5rem', width: '12rem', overflow: 'hidden', borderRadius: '0.75rem', border: '1px solid rgba(21,38,30,.24)', background: 'var(--card, #fff)' }} className="t-card t-line2">
                <button type="button" onClick={() => { if (menuRef.current) menuRef.current.style.display = 'none'; setPaused(p => { const n = !p; setToast({ msg: `"${camp.title}" ${n ? 'pausada' : 'reanudada'} (demo)`, type: 'info' }); return n; }); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink2 transition hover:bg-paper2 t-ink2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="7" y="5" width="3.5" height="14" rx="1.2" /><rect x="13.5" y="5" width="3.5" height="14" rx="1.2" /></svg> {paused ? 'Reanudar' : 'Pausar'} campaña
                </button>
                <button type="button" onClick={() => { if (menuRef.current) menuRef.current.style.display = 'none'; setToast({ msg: `"${camp.title}" duplicada (demo)`, type: 'ok' }); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink2 transition hover:bg-paper2 t-ink2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></svg> Duplicar
                </button>
                <button type="button" onClick={() => { if (menuRef.current) menuRef.current.style.display = 'none'; setToast({ msg: `"${camp.title}" archivada (demo)`, type: 'info' }); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink2 transition hover:bg-paper2 t-ink2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="4" rx="1.5" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" /></svg> Archivar
                </button>
                <div className="my-1 h-px bg-line t-line"></div>
                <button type="button" onClick={() => { if (menuRef.current) menuRef.current.style.display = 'none'; setToast({ msg: `Eliminar "${camp.title}" requiere confirmación (demo)`, type: 'warn' }); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-low transition hover:bg-lowt t-low">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg> Eliminar
                </button>
              </div>

            </div>
            </>
          )}
        </div>
      </div>

      {camp.status !== 'DRAFT' && (
        <div className="mt-4 border-t border-line pt-4 t-line">
          <div className="flex h-2 overflow-hidden rounded-full bg-paper2 t-paper2" aria-hidden="true">
            <FunnelBar data={funnelVals} />
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink3/40"></span><span className="font-mono text-[10.5px] text-ink3 t-ink3">Revisión <b className="text-ink t-ink">{camp.funnel?.review || 0}</b></span></div>
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-mid"></span><span className="font-mono text-[10.5px] text-ink3 t-ink3">Entrevista <b className="text-ink t-ink">{camp.funnel?.interview || 0}</b></span></div>
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-good/55"></span><span className="font-mono text-[10.5px] text-ink3 t-ink3">Oferta <b className="text-ink t-ink">{camp.funnel?.offer || 0}</b></span></div>
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-good"></span><span className="font-mono text-[10.5px] text-ink3 t-ink3">Contratado <b className="text-ink t-ink">{camp.funnel?.hired || 0}</b></span></div>
          </div>
          <div className="mt-3.5 flex justify-end">
            <button type="button" onClick={() => onNavigate?.(camp.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 px-3 py-1.5 text-[12.5px] font-semibold text-ink transition hover:border-green hover:text-green t-ink t-line2">
              Gestionar {camp.candidateCount} candidatos
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      )}
      <Toast toast={toast} onHide={() => setToast(null)} />
    </article>
  );
}

/* ============== Campaign Section ============== */
function CampaignSection({ campaigns, onNavigate, onEdit, onPublish, publishingId }: { campaigns: DashboardCampaign[]; onNavigate?: (id: string) => void; onEdit?: (id: string) => void; onPublish?: (id: string) => void; publishingId?: string | null }) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === '/' && searchRef.current && document.activeElement !== searchRef.current && !/input|textarea/i.test((document.activeElement || {}).tagName || '')) {
        e.preventDefault(); searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, []);

  const filtered = campaigns.filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()));
  const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length;

  return (
    <div className="xl:col-span-2">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink3 t-ink3">
            <span className="text-cta t-cta">01</span> Mis campañas <span className="h-px w-10 bg-line2 t-line2"></span>
          </div>
          <h2 className="mt-1.5 font-serif text-[1.5rem] font-semibold tracking-tight text-ink t-ink">{campaigns.length} campañas · {activeCount} activas</h2>
        </div>
        <a href="#" className="hidden shrink-0 font-mono text-[12px] text-ink2 underline-offset-2 hover:text-ink hover:underline sm:block t-ink2">Ver todas →</a>
      </div>

      <div id="campList" className="grid gap-3.5">
        {filtered.map(c => <CampaignCard key={c.id} camp={c} onNavigate={onNavigate} onEdit={onEdit} onPublish={onPublish} publishingId={publishingId} />)}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line2 bg-card/60 p-8 text-center t-card t-line2">
            <p className="font-sans text-lg font-semibold tracking-tight text-ink t-ink">Sin coincidencias.</p>
            <p className="mt-1 text-sm text-ink2 t-ink2">Prueba con otro término o <button type="button" onClick={() => setSearch('')} className="font-medium text-cta underline-offset-2 hover:underline t-cta">limpia la búsqueda</button>.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== Decision Queue ============== */
function DecisionQueue({ queue }: { queue: DashboardDecisionCandidate[] }) {
  const [items, setItems] = useState(queue);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => { setItems(queue); }, [queue]);

  const removeItem = (id: string, name: string, action: string) => {
    setToast({ msg: action === 'interview' ? `${name} → Entrevista. Sale de tu cola de decisiones.` : `${name} descartado. Sale de tu cola de decisiones.`, type: action === 'interview' ? 'ok' : 'warn' });
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 320);
  };

  const n = items.length;
  return (
    <>
      <div id="decisiones" className="rounded-2xl border border-line bg-card p-5 t-card t-line">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink3 t-ink3">Esperando tu decisión</span>
            {n > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-cta px-1.5 font-mono text-[11px] font-semibold text-ctatext">{n}</span>}
          </div>
          <a href="#" className="font-mono text-[11px] text-ink2 underline-offset-2 hover:text-ink hover:underline t-ink2">Ver todas</a>
        </div>
        <p className="mt-1 text-[13px] text-ink2 t-ink2">La IA ya puntuó estos CVs. Siguen en <span className="font-medium text-ink t-ink">revisión</span> porque nadie los movió de etapa. El sí o el no es tuyo.</p>

        <ul className="mt-4 grid gap-2.5">
          {items.map(item => (
            <li key={item.id} data-decision className="flex items-center gap-2.5 rounded-xl border border-line bg-paper/60 p-2.5 transition t-line">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-mono text-[12px] font-semibold text-onmark ${item.matchScore >= 80 ? 'bg-green' : item.matchScore >= 65 ? 'bg-mid' : 'bg-greendeep'}`}>{item.initials}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink t-ink">{item.name}</p>
                <p className="truncate font-mono text-[11px] text-ink3 t-ink3">{item.campaignTitle} · <span className={`font-medium ${item.matchScore >= 80 ? 'text-good t-good' : item.matchScore >= 65 ? 'text-mid t-mid' : 'text-low t-low'}`}>{item.matchScore} match</span></p>
              </div>
              <button type="button" onClick={() => removeItem(item.id, item.name, 'interview')} aria-label="Mover a entrevista" title="Mover a entrevista" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line2 text-green transition hover:bg-goodt t-green t-line2">
                <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </button>
              <button type="button" onClick={() => removeItem(item.id, item.name, 'discard')} aria-label="Descartar" title="Descartar" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line2 text-ink3 transition hover:border-low hover:text-low t-ink3 t-line2">
                <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </li>
          ))}
        </ul>
        {n === 0 && <p className="py-6 text-center text-[13px] text-ink3 t-ink3">✓ Sin decisiones pendientes. Tu pipeline está al día.</p>}
      </div>
      <Toast toast={toast} onHide={() => setToast(null)} />
    </>
  );
}

/* ============== Advice Block ============== */
function AdviceBlock() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-card t-card t-line">
      <div className="relative h-32">
        <img src="https://image.qwenlm.ai/public_source/88b2e882-98ee-4857-a83c-263c15dcf5c8/1f904026b-d7bd-4825-835a-df2b9015dd91.png" alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent"></div>
        <span className="absolute left-4 top-3 inline-flex items-center gap-1.5 rounded-full bg-greendeep/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-onmark backdrop-blur-sm">Consejo de la semana</span>
      </div>
      <div className="p-5 pt-3">
        <h3 className="font-serif text-[1.15rem] font-semibold leading-snug text-ink t-ink">No descartes por el formato.</h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink2 t-ink2">Evalen lee el <span className="font-medium text-ink t-ink">contenido</span>, no el diseño del PDF. Si un CV "feo" te da duda, abre su justificación antes de descartarlo.</p>
        <a href="#" className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12px] font-medium text-cta underline-offset-2 hover:underline t-cta">
          Ver cómo evalúa
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
      </div>
    </div>
  );
}

/* ============== Candidate Card ============== */
function CandidateCard({ cand, onAction, onProfile }: { cand: DashboardTopCandidate; onAction?: (action: string, cand: DashboardTopCandidate) => void; onProfile?: (id: string) => void }) {
  const [status, setStatus] = useState(cand.status);

  const matchColor = cand.matchScore >= 80 ? 'good' : cand.matchScore >= 65 ? 'mid' : 'low';
  const stageClass = status === 'discarded' ? 'bg-lowt text-low t-lowt t-low' : status === 'interview' || cand.stageLabel?.toLowerCase().includes('entrevista') ? 'bg-goodt text-good t-goodt t-good' : 'bg-midt text-mid t-midt t-mid';
  const stageDot = status === 'discarded' ? 'bg-low' : status === 'interview' || cand.stageLabel?.toLowerCase().includes('entrevista') ? 'bg-good' : 'bg-mid';
  const stageLabel = status === 'discarded' ? 'Descartado' : status === 'interview' ? 'En entrevista' : cand.stageLabel || 'En revisión';

  return (
    <article data-cand className={`flex w-[300px] shrink-0 snap-start flex-col rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-1 hover:shadow-card t-card t-line sm:w-[320px] ${status === 'discarded' ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3.5">
        {cand.photoUrl ? (
          <img src={cand.photoUrl} alt={cand.name} className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-paper2" loading="lazy" decoding="async" />
        ) : (
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full font-mono text-[13px] font-semibold ring-2 ring-paper2 ${matchColor === 'good' ? 'bg-green text-onmark' : matchColor === 'mid' ? 'bg-mid text-onmark' : status === 'discarded' ? 'bg-paper2 text-ink3 t-paper2 t-ink3' : 'bg-lowt text-low t-lowt t-low'}`}>{cand.initials}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className={`truncate font-sans text-[1.12rem] font-semibold leading-tight tracking-tight ${status === 'discarded' ? 'text-ink3 line-through t-ink3' : 'text-ink t-ink'}`}>{cand.name}</p>
          <p className="truncate font-mono text-[11px] text-ink3 t-ink3">{cand.role} · {cand.experience}</p>
        </div>
        <div className="text-right">
          <span className={`font-sans text-[1.7rem] font-bold leading-none tracking-tight tabular-nums ${status === 'discarded' ? 'text-ink3 t-ink3' : matchColor === 'good' ? 'text-good t-good' : matchColor === 'mid' ? 'text-mid t-mid' : 'text-low t-low'}`}>{cand.matchScore}</span>
          <span className="block font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink3 t-ink3">match</span>
        </div>
      </div>
      <span data-cand-chip className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium ${stageClass}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${stageDot}`}></span> {stageLabel}
      </span>
      <div className="mt-3.5 grid gap-2">
        {(cand.dimensions || []).slice(0, 3).map((d, i) => {
          const pct = d.maxScore ? Math.round((d.score / d.maxScore) * 100) : 0;
          return (
            <div key={i} className="grid grid-cols-[78px_1fr_26px] items-center gap-2 font-mono text-[11px] text-ink2 t-ink2">
              <span>{d.label}</span>
              <span className="h-1.5 rounded-full bg-paper2 t-paper2"><span className="block h-full rounded-full" style={{ width: pct + '%', background: matchColor === 'good' ? 'var(--good)' : matchColor === 'mid' ? 'var(--mid)' : 'var(--low)' }}></span></span>
              <span className="text-right text-ink t-ink">{(d.score / (d.maxScore || 1) * 10).toFixed(1)}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3.5 border-t border-line pt-3 text-[12.5px] leading-relaxed text-ink2 t-ink2 t-line">"{cand.summary}"</p>
      <div className="mt-4 flex items-center gap-2 pt-1">
        {status !== 'discarded' ? (
          <>
            <button type="button" onClick={() => onProfile?.(cand.id)} className="flex-1 rounded-lg bg-greendeep px-3 py-2 text-[12.5px] font-semibold text-onmark transition hover:-translate-y-0.5">Ver perfil</button>
            <button type="button" onClick={() => { onAction?.('interview', cand); setStatus('interview'); }} aria-label="Mover a entrevista" title="Mover a entrevista" className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-green transition hover:bg-goodt t-green t-line2">
              <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </button>
            <button type="button" onClick={() => { onAction?.('discard', cand); setStatus('discarded'); }} aria-label="Descartar" title="Descartar" className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-ink3 transition hover:border-low hover:text-low t-ink3 t-line2">
              <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => { onAction?.('restore', cand); setStatus('active'); }} className="flex-1 rounded-lg border border-line2 px-3 py-2 text-[12.5px] font-semibold text-ink transition hover:border-green hover:text-green t-ink t-line2">Recuperar</button>
            <button type="button" onClick={() => onProfile?.(cand.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-ink2 transition hover:border-ink t-ink2 t-line2" title="Ver perfil">
              <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
            </button>
          </>
        )}
      </div>
    </article>
  );
}

/* ============== Candidate Carousel ============== */
function CandidateCarousel({ candidates, onProfile }: { candidates: DashboardTopCandidate[]; onProfile?: (id: string) => void }) {
  const [filters, setFilters] = useState<CandFilter>({ match60: true, nodiscard: true });
  const [talentCount, setTalentCount] = useState(candidates.length);
  const carRef = useRef<HTMLDivElement>(null);

  const filtered = candidates.filter(c => {
    const okMatch = !filters.match60 || c.matchScore > 60;
    const okDisc = !filters.nodiscard || c.status !== 'discarded';
    return okMatch && okDisc;
  });

  useEffect(() => { setTalentCount(filtered.length); }, [filtered.length]);

  const scroll = (dir: number) => {
    if (!carRef.current) return;
    const card = carRef.current.querySelector<HTMLElement>('[data-cand]');
    const step = card ? card.getBoundingClientRect().width + 16 : 320;
    carRef.current.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className="mt-9">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink3 t-ink3">
            <span className="text-cta t-cta">02</span> Candidatos <span className="h-px w-10 bg-line2 t-line2"></span>
          </div>
          <h2 className="mt-1.5 font-serif text-[1.5rem] font-semibold tracking-tight text-ink t-ink">Los que están en el radar</h2>
          <p className="mt-1 text-[14px] text-ink2 t-ink2">Ordenados por match, con el porqué escrito. <span className="font-semibold text-ink t-ink">{talentCount}</span> en foco ahora.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtros de candidatos">
            {(['match60', 'nodiscard'] as const).map(key => (
              <button key={key} type="button" data-filter={key} aria-pressed={filters[key]}
                onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition ${filters[key] ? 'border-green bg-greentint text-green t-goodt t-green' : 'border-line2 text-ink2 t-ink2 t-line2'}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current"></span> {key === 'match60' ? 'Match > 60%' : 'Sin descartar'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Anteriores" onClick={() => scroll(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-line2 bg-card text-ink transition hover:border-ink t-card t-ink t-line2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button type="button" aria-label="Siguientes" onClick={() => scroll(1)} className="grid h-9 w-9 place-items-center rounded-full border border-line2 bg-card text-ink transition hover:border-ink t-card t-ink t-line2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div ref={carRef} id="carousel" className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {filtered.map(c => <CandidateCard key={c.id} cand={c} onProfile={onProfile} />)}
        {filtered.length === 0 && (
          <div className="w-full rounded-2xl border border-dashed border-line2 bg-card/60 p-10 text-center t-card t-line2">
            <p className="font-sans text-lg font-semibold tracking-tight text-ink t-ink">Nadie en el foco con estos filtros.</p>
            <p className="mt-1 text-sm text-ink2 t-ink2">Desactiva "Match &gt; 60%" o "Sin descartar" para ver el pool completo.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ============== Footer ============== */
function DashboardFooter() {
  return (
    <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 font-mono text-[11px] text-ink3 sm:flex-row t-line t-ink3">
      <span>© 2026 Evalen · La IA lee, los humanos deciden.</span>
      <span className="flex items-center gap-3">
        <a href="#" className="hover:text-ink2">Ayuda</a><span className="text-line2">·</span>
        <a href="#" className="hover:text-ink2">Atajos de teclado</a><span className="text-line2">·</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-good animate-pulsering"></span> Todos los sistemas operativos</span>
      </span>
    </footer>
  );
}

/* ============== Main Component ============== */
interface DashboardNewProps {
  onNavigateToCampaign?: (id: string) => void;
  onCreateCampaign?: () => void;
  onEditCampaign?: (id: string) => void;
  onLogout?: () => void;
}

export default function DashboardNew({ onNavigateToCampaign, onCreateCampaign, onEditCampaign, onLogout }: DashboardNewProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    const name = apiService.user?.name || '';
    setUserName(name);
    if (!name) {
      apiService.getProfile().then(u => setUserName(u.name)).catch(() => setUserName('Usuario'));
    }
    apiService.getDashboardSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  const showToast = useCallback((msg: string, type?: 'ok' | 'info' | 'warn') => {
    setToast({ msg, type: type || 'info' });
  }, []);

  const handlePublishCampaign = useCallback(async (campaignId: string) => {
    setPublishing(campaignId);
    try {
      await apiService.updateCampaign(campaignId, { status: 'ACTIVE' } as any);
      const updated = summary ? {
        ...summary,
        campaigns: summary.campaigns.map(c =>
          c.id === campaignId ? { ...c, status: 'ACTIVE' as const } : c
        ),
      } : null;
      setSummary(updated);
      showToast('Campaña publicada exitosamente', 'ok');
    } catch (err: any) {
      showToast(err.message || 'Error al publicar la campaña', 'warn');
    } finally {
      setPublishing(null);
    }
  }, [summary, showToast]);

  if (loading) {
    return (
      <div className="dashboard-only flex min-h-screen items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green border-t-transparent"></div>
          <p className="font-mono text-sm text-ink2">Cargando panel…</p>
        </div>
      </div>
    );
  }

  const s = summary || {
    stats: { activeCampaigns: 0, evaluatedCVs: 0, inInterview: 0, timeSavedHours: 0, draftCampaigns: 0, closedCampaigns: 0, weeklyNewCVs: 0, weeklyIncrease: 0 },
    campaigns: [],
    decisionQueue: [],
    topCandidates: [],
  };

  return (
    <div className="dashboard-only min-h-screen bg-paper text-ink">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-60 bg-grain opacity-[0.045] mix-blend-overlay"></div>

      <NavBar onLogout={onLogout} />

      <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-7 sm:px-6 lg:px-8">

        {/* Page Header */}
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-green t-green">Panel de reclutamiento</p>
            <h1 className="mt-2 font-serif text-[2rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-[2.5rem] t-ink">
              <span id="greet">{greet()}</span>, {userName.split(' ')[0] || 'Usuario'}.
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-ink2 t-ink2">
              <span id="today">{todayStr()}</span>
              <span className="text-line2">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cta animate-pulsering"></span>
                <b className="font-semibold text-ink t-ink">{s.decisionQueue.length}</b> candidatos esperan tu decisión
                <a href="#decisiones" className="font-medium text-cta underline-offset-2 hover:underline t-cta">decidir →</a>
              </span>
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button type="button" onClick={() => showToast('Abre el selector de campaña para subir CVs (demo).', 'info')}
              className="inline-flex items-center gap-2 rounded-xl border border-line2 bg-card px-4 py-2.5 text-sm font-semibold text-ink shadow-soft transition hover:-translate-y-0.5 hover:border-ink t-card t-ink t-line2">
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /></svg>
              Subir CVs
            </button>
            <button type="button" onClick={() => { onCreateCampaign?.(); showToast('Creando nueva campaña… (demo)', 'info'); }}
              className="inline-flex items-center gap-2 rounded-xl bg-cta px-4 py-2.5 text-sm font-semibold text-ctatext shadow-cta transition hover:-translate-y-0.5 hover:bg-ctah">
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Nueva campaña
            </button>
          </div>
        </section>

        {/* Stats */}
        <StatsRow stats={s.stats} />

        {/* Main Grid */}
        <section className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <CampaignSection campaigns={s.campaigns} onNavigate={onNavigateToCampaign} onEdit={onEditCampaign} onPublish={handlePublishCampaign} publishingId={publishing} />
          <aside className="grid gap-5 xl:col-span-1">
            <DecisionQueue queue={s.decisionQueue} />
            <AdviceBlock />
          </aside>
        </section>

        {/* Candidates */}
        <CandidateCarousel candidates={s.topCandidates} onProfile={onNavigateToCampaign} />

        {/* Footer */}
        <DashboardFooter />
      </main>

      <Toast toast={toast} onHide={() => setToast(null)} />
    </div>
  );
}
