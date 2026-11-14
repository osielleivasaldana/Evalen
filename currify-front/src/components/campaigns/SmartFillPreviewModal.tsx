import React, { useState } from 'react';
import { SmartFillResponse } from '../../services/api';
import { STAGE_TEMPLATES } from '../../constants/stageTemplates';

interface SmartFillPreviewModalProps {
  isOpen: boolean;
  response: SmartFillResponse | null;
  onApply: () => void;
  onDiscard: () => void;
  isApplying?: boolean;
}

const detectStageCategory = (title: string): 'it' | 'sales' | 'general' => {
  const upper = (title || '').toUpperCase();

  const techKeywords = [
    'DESARROLLADOR', 'DEVELOPER', 'INGENIERO', 'SOFTWARE', 'PROGRAMADOR',
    'IT', 'TECH', 'QA', 'FRONTEND', 'BACKEND', 'FULL STACK', 'FULLSTACK',
    'SISTEMAS', 'COMPUTACION', 'INFORMÁTICA', 'INFORMATICA', 'DEVOPS',
    'TECNOLOGIA', 'TECNOLOGÍA', 'SCRUM', 'PRODUCT OWNER', 'DATA', 'PYTHON',
    'NODE', 'REACT', 'ANGULAR', 'VUE', 'JAVA', 'NET', 'C#', 'CLOUD'
  ];

  const salesKeywords = [
    'VENDEDOR', 'VENTAS', 'COMERCIAL', 'SALES', 'EJECUTIVO', 'KEY ACCOUNT',
    'KAM', 'ACCOUNT EXECUTIVE', 'NEGOCIACION', 'NEGOCIACIÓN', 'MARKETING',
    'PROMOTOR', 'RETAIL', 'STORE', 'BUSINESS DEVELOPMENT', 'BDE'
  ];

  if (techKeywords.some(kw => upper.includes(kw))) return 'it';
  if (salesKeywords.some(kw => upper.includes(kw))) return 'sales';
  return 'general';
};

const SmartFillPreviewModal: React.FC<SmartFillPreviewModalProps> = ({
  isOpen,
  response,
  onApply,
  onDiscard,
  isApplying = false,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const DESCRIPTION_TRUNCATE_LENGTH = 280;

  if (!isOpen || !response) return null;

  const { fields, suggested_rubric_weights } = response;
  const detectedCategory = detectStageCategory(fields.title);
  const selectedTemplate = STAGE_TEMPLATES.find(t => t.id === detectedCategory) || STAGE_TEMPLATES[0];

  const formatCurrency = (amount: number | undefined, currency: string | undefined) => {
    if (amount === undefined || amount === null) return null;
    return `$${Number(amount).toLocaleString('es-CL')} ${currency || ''}`;
  };

  const getModalityLabel = (mod: string) => {
    if (!mod) return 'No especificado';
    const upper = mod.toUpperCase();
    if (upper.includes('REMOTE') || upper.includes('REMOTA')) return 'Remoto';
    if (upper.includes('HYBRID') || upper.includes('HIBRID')) return 'Híbrido';
    return 'Presencial';
  };

  const getDurationLabel = (dur: string) => {
    if (!dur) return 'No especificado';
    const upper = dur.toUpperCase();
    if (upper.includes('FIXED')) return 'Plazo Fijo';
    if (upper.includes('PROJECT')) return 'Proyecto';
    return 'Indefinido';
  };

  const showDescriptionToggle = fields.description && fields.description.length > DESCRIPTION_TRUNCATE_LENGTH;
  const descriptionText = isDescriptionExpanded
    ? fields.description
    : fields.description?.slice(0, DESCRIPTION_TRUNCATE_LENGTH) + (showDescriptionToggle ? '...' : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onDiscard} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-line bg-card shadow-card t-card t-line animate-fadein">
        {/* ===== Header ===== */}
        <div className="sticky top-0 z-10 rounded-t-2xl bg-greendeep px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-yellow text-greendeep shadow-gold">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="m12 2 1.7 4.6L18 8l-4.3 1.4L12 14l-1.7-4.6L6 8l4.3-1.4z"/>
                  <path d="M18.5 13.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"/>
                  <path d="M5 14l.7 1.9 1.9.7-1.9.7L5 19l-.7-1.7-1.9-.7 1.9-.7z"/>
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="font-serif text-[1.3rem] font-bold leading-tight text-onmark truncate">
                  Borrador generado por IA
                </h2>
                <p className="mt-0.5 text-[13px] text-onmark/70 truncate">
                  Revisa y ajusta antes de aplicar
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDiscard}
              disabled={isApplying}
              className="shrink-0 grid h-8 w-8 place-items-center rounded-lg text-onmark/70 transition hover:bg-onmark/15 hover:text-onmark disabled:opacity-50"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </div>
        </div>

        {/* ===== Scrollable Content ===== */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Titulo + badge */}
          <div>
            <h3 className="font-serif text-[1.5rem] font-semibold tracking-tight text-ink t-ink">
              {fields.title || 'Sin título'}
            </h3>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-ink2 t-ink2">
              {fields.modality && (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                  {getModalityLabel(fields.modality)}
                </span>
              )}
              {fields.duration && (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-ink3 t-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                  {getDurationLabel(fields.duration)}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-line2 bg-card p-4 t-card t-line2">
            <h4 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink3 t-ink3">Descripcion del puesto</h4>
            {fields.description ? (
              <div className="mt-2">
                <p className="text-[14px] leading-relaxed text-ink2 t-ink2 whitespace-pre-line">{descriptionText}</p>
                {showDescriptionToggle && (
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="mt-2 font-mono text-[11px] font-medium text-cta underline-offset-2 hover:underline transition t-cta"
                  >
                    {isDescriptionExpanded ? 'Ver menos' : 'Ver texto completo'}
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[13px] italic text-ink3 t-ink3">Sin contenido.</p>
            )}
          </div>

          {/* Requirements */}
          <div className="rounded-xl border border-line2 bg-card p-4 t-card t-line2">
            <h4 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink3 t-ink3">Requisitos</h4>
            {fields.requirements && fields.requirements.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {fields.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink2 t-ink2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green t-good" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] italic text-ink3 t-ink3">No se generaron requisitos.</p>
            )}
          </div>

          {/* Salary */}
          <div className="rounded-xl border border-line2 bg-card p-4 t-card t-line2">
            <h4 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink3 t-ink3">Salario</h4>
            {fields.salary_range && fields.salary_range.min !== undefined ? (
              <p className="mt-2 font-sans text-[15px] font-semibold text-ink t-ink">
                {formatCurrency(fields.salary_range.min, fields.salary_range.currency)}
                {fields.salary_range.max ? ` – ${formatCurrency(fields.salary_range.max, fields.salary_range.currency)}` : ''}
              </p>
            ) : (
              <p className="mt-2 text-[13px] italic text-ink3 t-ink3">No especificado.</p>
            )}
          </div>

          {/* Conditions & Benefits */}
          <div className="rounded-xl border border-line2 bg-card p-4 t-card t-line2">
            <h4 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink3 t-ink3">Condiciones y beneficios sugeridos</h4>
            <div className="mt-2 space-y-2 text-[14px] text-ink2 t-ink2">
              <p><span className="font-semibold text-ink t-ink">Contrato:</span> {getDurationLabel(fields.duration)}</p>
              <p><span className="font-semibold text-ink t-ink">Modalidad:</span> {getModalityLabel(fields.modality)}</p>
              {fields.salary_range && fields.salary_range.min !== undefined && (
                <p><span className="font-semibold text-ink t-ink">Renta:</span> {formatCurrency(fields.salary_range.min, fields.salary_range.currency)}{fields.salary_range.max ? ` – ${formatCurrency(fields.salary_range.max, fields.salary_range.currency)}` : ''}</p>
              )}
            </div>
          </div>

          {/* Stages */}
          <div className="rounded-xl border border-line2 bg-card p-4 t-card t-line2">
            <h4 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink3 t-ink3">Etapas de seleccion sugeridas</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTemplate.stages.map((stage, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 rounded-full bg-greentint px-3 py-1.5 text-[12px] font-medium text-green t-goodt t-green">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-green text-[9px] font-bold text-onmark">{idx + 1}</span>
                  {stage.name}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-ink3 t-ink3">
              Plantilla auto-seleccionada: <span className="font-medium text-ink2 t-ink2">{selectedTemplate.name}</span>
            </p>
          </div>

          {/* Rubric Weights */}
          {suggested_rubric_weights && (
            <div className="rounded-xl border border-line2 bg-card p-4 t-card t-line2">
              <h4 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink3 t-ink3">Pesos de rubrica sugeridos</h4>
              <div className="mt-3 space-y-3">
                {[
                  { label: 'Habilidades Técnicas', key: 'technical_skills' as const },
                  { label: 'Experiencia', key: 'experience' as const },
                  { label: 'Educación', key: 'education' as const },
                ].map(item => {
                  const val = suggested_rubric_weights[item.key] ?? 0;
                  return (
                    <div key={item.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] text-ink2 t-ink2">{item.label}</span>
                        <span className="font-mono text-[12px] font-semibold text-ink t-ink">{val}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-line2 t-line2 overflow-hidden">
                        <div className="h-full rounded-full bg-good transition-all duration-500" style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ===== Footer ===== */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-b-2xl border-t border-line bg-card px-6 py-4 t-card t-line">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isApplying}
            className="inline-flex items-center gap-2 rounded-xl border border-line2 bg-card px-4 py-2.5 text-[14px] font-semibold text-ink transition hover:border-ink disabled:opacity-50 t-card t-ink t-line2"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={isApplying}
            className="inline-flex items-center gap-2 rounded-xl bg-cta px-5 py-2.5 text-[14px] font-semibold text-ctatext shadow-cta transition hover:-translate-y-0.5 hover:bg-ctah disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {isApplying ? (
              <>
                <svg className="h-[18px] w-[18px] animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Aplicando...
              </>
            ) : (
              <>
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                Aplicar a la campana
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartFillPreviewModal;
