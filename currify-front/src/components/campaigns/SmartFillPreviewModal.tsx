import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
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

  if (techKeywords.some(kw => upper.includes(kw))) {
    return 'it';
  }
  
  if (salesKeywords.some(kw => upper.includes(kw))) {
    return 'sales';
  }

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
  const DESCRIPTION_TRUNCATE_LENGTH = 200;

  if (!response) return null;

  const { fields, suggested_rubric_weights } = response;
  const detectedCategory = detectStageCategory(fields.title);
  const selectedTemplate = STAGE_TEMPLATES.find(t => t.id === detectedCategory) || STAGE_TEMPLATES[0];

  const formatCurrency = (amount: number | undefined, currency: string | undefined) => {
    if (amount === undefined || amount === null) return null;
    return `$${Number(amount).toLocaleString('es-CL')} ${currency || ''}`;
  };

  const getTruncatedDescription = (text: string) => {
    if (!text) return '';
    if (text.length <= DESCRIPTION_TRUNCATE_LENGTH) return text;
    return text.slice(0, DESCRIPTION_TRUNCATE_LENGTH) + '...';
  };

  const showDescriptionToggle = fields.description && fields.description.length > DESCRIPTION_TRUNCATE_LENGTH;

  // Modality text formatter
  const getModalityLabel = (mod: string) => {
    if (!mod) return 'No especificado';
    const upper = mod.toUpperCase();
    if (upper.includes('REMOTE') || upper.includes('REMOTA')) return 'Remoto';
    if (upper.includes('HYBRID') || upper.includes('HIBRID')) return 'Híbrido';
    return 'Presencial';
  };

  // Duration text formatter
  const getDurationLabel = (dur: string) => {
    if (!dur) return 'No especificado';
    const upper = dur.toUpperCase();
    if (upper.includes('FIXED')) return 'Plazo Fijo';
    if (upper.includes('PROJECT')) return 'Proyecto';
    return 'Indefinido';
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => { /* Do not close on click outside as per design guidelines */ }}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full mx-4 md:mx-auto md:max-w-2xl max-h-[90vh] flex flex-col border border-gray-100">
                
                {/* Header — sticky, gradient */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <SparklesIcon className="w-6 h-6 text-yellow-300 flex-shrink-0 animate-pulse" />
                      <div className="min-w-0">
                        <Dialog.Title as="h2" className="text-lg md:text-xl font-bold leading-tight truncate">
                          Vista Previa: Smart Fill Asistente
                        </Dialog.Title>
                        <p className="text-sm text-white/80 mt-0.5 truncate">
                          Revisa el borrador generado por IA antes de aplicarlo
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onDiscard}
                      disabled={isApplying}
                      className="flex-shrink-0 text-white/80 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
                      aria-label="Cerrar modal"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content Container */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5 max-h-[calc(90vh-140px)] scrollbar-thin">
                  
                  {/* General Info */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                      Información General
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
                      <h4 className="text-gray-900 font-bold text-lg md:text-xl mb-3">
                        {fields.title || 'Sin título'}
                      </h4>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-700 text-sm md:text-base">
                        <span className="flex items-center gap-2">
                          <span className="flex-shrink-0">🏠</span>
                          <span>{getModalityLabel(fields.modality)}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="flex-shrink-0">⏱</span>
                          <span>{getDurationLabel(fields.duration)}</span>
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* Description */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                      Descripción del Puesto
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
                      <p className="text-gray-800 text-sm md:text-base leading-relaxed whitespace-pre-line">
                        {isDescriptionExpanded 
                          ? fields.description 
                          : getTruncatedDescription(fields.description)}
                      </p>
                      {showDescriptionToggle && (
                        <button
                          type="button"
                          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                          className="mt-3 text-indigo-600 hover:text-indigo-700 font-semibold text-sm focus:outline-none focus:underline flex items-center gap-1 transition-all"
                        >
                          {isDescriptionExpanded ? 'Ver menos ▴' : 'Ver texto completo ▾'}
                        </button>
                      )}
                    </div>
                  </section>

                  {/* Requirements */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                      Requisitos
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
                      {fields.requirements && fields.requirements.length > 0 ? (
                        <ul className="space-y-2 text-gray-800 text-sm md:text-base">
                          {fields.requirements.map((req, idx) => (
                            <li key={idx} className="flex items-start gap-2.5">
                              <span className="text-indigo-500 flex-shrink-0 mt-1.5 text-[8px]">●</span>
                              <span className="break-words">{req}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-400 italic text-sm">No se generaron requisitos</p>
                      )}
                    </div>
                  </section>

                  {/* Salary Card */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                      Salario
                    </h3>
                    {fields.salary_range && fields.salary_range.min !== undefined ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 md:p-5">
                        <div className="flex items-center gap-3">
                          <span className="text-xl flex-shrink-0">💰</span>
                          <span className="text-gray-900 font-bold text-base md:text-lg">
                            {formatCurrency(fields.salary_range.min, fields.salary_range.currency)}
                            {fields.salary_range.max ? ` – ${formatCurrency(fields.salary_range.max, fields.salary_range.currency)}` : ''}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
                        <div className="flex items-center gap-3">
                          <span className="text-xl flex-shrink-0">💰</span>
                          <span className="text-gray-400 italic font-normal text-base md:text-lg">
                            No especificado
                          </span>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Conditions & Benefits Preview */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                      Condiciones y Beneficios Sugeridos
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
                      <div className="text-gray-800 text-sm md:text-base space-y-3">
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">Detalles de contratación:</p>
                          <ul className="list-disc pl-5 space-y-0.5 text-gray-700">
                            <li><strong>Contrato:</strong> {getDurationLabel(fields.duration)}</li>
                            <li><strong>Modalidad:</strong> {getModalityLabel(fields.modality)}</li>
                            {fields.salary_range && fields.salary_range.min !== undefined && (
                              <li>
                                <strong>Renta:</strong> {formatCurrency(fields.salary_range.min, fields.salary_range.currency)}
                                {fields.salary_range.max ? ` – ${formatCurrency(fields.salary_range.max, fields.salary_range.currency)}` : ''}
                              </li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">Beneficios corporativos:</p>
                          <ul className="list-disc pl-5 space-y-0.5 text-gray-700">
                            <li>Oportunidades de crecimiento y desarrollo profesional.</li>
                            <li>Excelente clima laboral y cultura de trabajo colaborativa.</li>
                            <li>Equipamiento de trabajo proporcionado por la empresa.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Selection Stages Preview */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                      Etapas de Selección Sugeridas
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
                      <div className="flex items-center gap-3 mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                        <span className="text-xl">📋</span>
                        <div>
                          <h4 className="text-sm font-bold text-indigo-900">
                            Plantilla auto-seleccionada: {selectedTemplate.name}
                          </h4>
                          <p className="text-xs text-indigo-700 mt-0.5">
                            Se configuran automáticamente según la naturaleza del cargo.
                          </p>
                        </div>
                      </div>
                      <div className="relative border-l-2 border-indigo-100 ml-4 space-y-4 my-2">
                        {selectedTemplate.stages.map((stage, idx) => (
                          <div key={idx} className="relative pl-6">
                            {/* Dot */}
                            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-indigo-600 bg-white flex items-center justify-center">
                              <span className="text-[9px] font-bold text-indigo-600">{idx + 1}</span>
                            </div>
                            <div>
                              <h5 className="font-semibold text-gray-900 text-sm md:text-base">
                                {stage.name}
                              </h5>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {stage.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Suggested Rubric Weights */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                      Pesos de Rúbrica Sugeridos
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 space-y-4">
                      {/* Technical Skills */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-700">Habilidades Técnicas</span>
                          <span className="text-sm font-bold text-gray-900">
                            {suggested_rubric_weights?.technical_skills ?? 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${suggested_rubric_weights?.technical_skills ?? 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Experience */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-700">Experiencia</span>
                          <span className="text-sm font-bold text-gray-900">
                            {suggested_rubric_weights?.experience ?? 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${suggested_rubric_weights?.experience ?? 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Education */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-700">Educación</span>
                          <span className="text-sm font-bold text-gray-900">
                            {suggested_rubric_weights?.education ?? 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-indigo-300 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${suggested_rubric_weights?.education ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Footer — sticky */}
                <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={onDiscard}
                    disabled={isApplying}
                    className="px-5 py-2.5 bg-gray-200 text-gray-700 hover:bg-gray-300 font-semibold rounded-lg transition-colors text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={onApply}
                    disabled={isApplying}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg transition-all duration-200 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {isApplying ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Aplicando...
                      </span>
                    ) : (
                      'Aplicar a la campaña'
                    )}
                  </button>
                </div>
                
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SmartFillPreviewModal;
