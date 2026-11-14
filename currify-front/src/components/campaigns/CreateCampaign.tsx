import React, { useState, useEffect, useRef } from 'react';
import { apiService, CreateCampaignRequest, Campaign, StageTemplateInput, UserProfile, SmartFillResponse } from '../../services/api';
import SmartFillPreviewModal from './SmartFillPreviewModal';
import PublishShareScreen from './PublishShareScreen';
import Layout from '../layout/Layout';
import SimpleEditor from '../common/RichTextEditor';
import LocationAutocomplete from '../common/LocationAutocomplete';
import { CURRENCIES } from '../../constants/currencies';
import { formatNumber, parseNumber, formatInputNumber } from '../../utils/formatters';
import { STAGE_TEMPLATES } from '../../constants/stageTemplates';
import { WIZARD_CURRENCIES } from '../../constants/currencies';

interface CreateCampaignProps {
  onCampaignCreated: (campaign: Campaign) => void;
  onCancel: () => void;
  onGoToDashboard: () => void;
  onManageCandidates: (campaignId: string) => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface StepConfig {
  number: number;
  title: string;
  name: string;
}

const STEPS_CONFIG: StepConfig[] = [
  { number: 1, title: 'Lo esencial del cargo', name: 'Información básica' },
  { number: 2, title: 'Describe el puesto como a un colega', name: 'Descripción y requisitos' },
  { number: 3, title: 'Qué ofreces a cambio', name: 'Condiciones y salario' },
  { number: 4, title: 'Cómo vas a decidir', name: 'Etapas del proceso' },
  { number: 5, title: 'Revisa antes de publicar', name: 'Revisar' }
];

const STEP_NAMES = STEPS_CONFIG.map(s => s.name);

const STORAGE_KEY = 'createCampaignFormData';

const WORK_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Jornada completa',
  PART_TIME: 'Medio tiempo',
  HOURLY: 'Por horas',
  INTERNSHIP: 'Práctica / pasantía'
};

const MODALITY_LABELS: Record<string, string> = {
  REMOTE: 'Remoto',
  HYBRID: 'Híbrido',
  ON_SITE: 'Presencial'
};

const DURATION_LABELS: Record<string, string> = {
  INDEFINITE: 'Indefinido',
  FIXED_TERM: 'Plazo fijo',
  PROJECT: 'Por proyecto',
  SEASONAL: 'Temporada'
};

const CreateCampaign: React.FC<CreateCampaignProps> = ({
  onCampaignCreated,
  onCancel,
  onGoToDashboard,
  onManageCandidates
}) => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    title: '',
    description: '',
    requirements: '',
    conditions: '',
    location: '',
    workType: undefined,
    modality: undefined,
    duration: undefined,
    inclusionPosition: false,
    salary: undefined,
    currency: 'CLP',
    showSalary: false,
    stageTemplates: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [createdCampaign, setCreatedCampaign] = useState<Campaign | null>(null);
  const [showShareScreen, setShowShareScreen] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [smartFillContext, setSmartFillContext] = useState('');

  const [smartFillResponse, setSmartFillResponse] = useState<SmartFillResponse | null>(null);
  const [smartFillModalOpen, setSmartFillModalOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const [aiHydratedSteps, setAiHydratedSteps] = useState<number[]>([]);
  const [showAiBanner, setShowAiBanner] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const prevStepRef = useRef<number>(currentStep);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await apiService.getProfile();
        setCurrentUser(profile);

        if (profile.role !== 'ADMIN' && profile.role !== 'RECRUITER') {
          setPermissionError('No tienes permisos suficientes para crear campañas. Solo usuarios ADMIN y RECRUITER pueden crear campañas.');
          setLoading(false);
          return;
        }

        if (profile.company) {
          const users = await apiService.getUsersByCompany(profile.company);
          setAvailableUsers(users);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setPermissionError('Error al cargar el perfil del usuario');
      }
      setLoading(false);
    };
    loadUserProfile();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.stageTemplates) {
          parsed.stageTemplates = [];
        }
        setFormData(parsed);
      } catch (err) {
        console.error('Failed to parse saved form data:', err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    const newValue = type === 'checkbox' ? checked :
      type === 'number' ? (value ? Number(value) : undefined) :
        value === '' ? undefined : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.title?.trim()) {
        newErrors.title = 'El título es requerido';
      }
      if (!formData.location?.trim()) {
        newErrors.location = 'La ubicación es requerida';
      }
      if (!formData.workType) {
        newErrors.workType = 'El tipo de trabajo es requerido';
      }
      if (!formData.modality) {
        newErrors.modality = 'La modalidad es requerida';
      }
      if (!formData.duration) {
        newErrors.duration = 'La duración es requerida';
      }
    } else if (step === 2) {
      if (!formData.description?.trim()) {
        newErrors.description = 'La descripción es requerida';
      }
      if (!formData.requirements?.trim()) {
        newErrors.requirements = 'Los requisitos son requeridos';
      }
    } else if (step === 3) {
      if (!formData.conditions?.trim()) {
        newErrors.conditions = 'Las condiciones son requeridas';
      }
    } else if (step === 4) {
      const templates = formData.stageTemplates || [];
      if (templates.length === 0) {
        newErrors.stages = 'Debes definir al menos una etapa del proceso';
      } else {
        templates.forEach((stage, index) => {
          if (!stage.name?.trim()) {
            newErrors[`stage_${index}_name`] = `El nombre de la etapa ${index + 1} es requerido`;
          }
          if (!stage.responsibleId?.trim()) {
            newErrors[`stage_${index}_responsible`] = `El responsable de la etapa ${index + 1} es requerido`;
          }
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5) as Step);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as Step);
  };

  const handleStepClick = (stepNumber: Step) => {
    if (stepNumber === currentStep) return;

    if (stepNumber > currentStep) {
      if (!validateStep(currentStep)) return;
    }

    setCurrentStep(stepNumber);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const campaign = await apiService.createCampaign(formData);
      setCreatedCampaign(campaign);
      onCampaignCreated(campaign);
      localStorage.removeItem(STORAGE_KEY);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Error al crear la campaña' });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!createdCampaign) return;
    setLoading(true);
    try {
      const updated = await apiService.updateCampaign(createdCampaign.id, { status: 'ACTIVE' } as any);
      setCreatedCampaign(prev => prev ? { ...prev, status: 'ACTIVE' } : prev);
      setShowShareScreen(true);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Error al publicar la campaña' });
    } finally {
      setLoading(false);
    }
  };

  const handleSmartFill = async () => {
    if (!formData.title?.trim()) {
      setErrors({ title: 'Ingresa un título para usar Smart Fill' });
      return;
    }

    setIsGenerating(true);
    setErrors({});
    try {
      const response = await apiService.generateCampaignDraft({
        jobTitle: formData.title,
        additionalContext: smartFillContext,
        language: 'es'
      });

      setSmartFillResponse(response);
      setSmartFillModalOpen(true);

      const profile = await apiService.getProfile();
      setCurrentUser(profile);
    } catch (err: any) {
      // Fallback: demo data para que el flujo funcione aunque el backend no esté listo
      console.warn('Smart Fill API call failed, using demo data:', err.message);
      const fallbackResponse: SmartFillResponse = {
        fields: {
          title: formData.title || 'Desarrollador Full Stack Senior',
          description: 'Buscamos a alguien que se sume al equipo para construir y mantener productos en producción, trabajando de la mano con diseño y producto en ciclos cortos.\n\nParticiparás en decisiones de arquitectura, revisarás código de pares y dejarás las cosas mejores de como las encontraste.',
          requirements: [
            'Experiencia comprobable en el stack principal del cargo.',
            'Autonomía para tomar un ticket de punta a punta.',
            'Español fluido e inglés técnico de lectura.',
            'Experiencia en entornos ágiles con métricas de entrega (deseable).',
            'Prácticas de testing y CI/CD (deseable).'
          ],
          modality: 'Híbrido',
          duration: 'Indefinido',
          salary_range: {
            min: 2500000,
            max: 3500000,
            currency: 'CLP'
          }
        },
        suggested_rubric_weights: {
          technical_skills: 40,
          experience: 35,
          education: 25
        }
      };
      setSmartFillResponse(fallbackResponse);
      setSmartFillModalOpen(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySmartFill = async () => {
    if (!smartFillResponse) return;
    setIsApplying(true);

    const mapModalityText = (mod: string) => {
      const upper = mod?.toUpperCase() || '';
      if (upper.includes('REMOTE') || upper.includes('REMOTA')) return 'Remoto';
      if (upper.includes('HYBRID') || upper.includes('HIBRID')) return 'Híbrido';
      return 'Presencial';
    };

    const mapDurationText = (dur: string) => {
      const upper = dur?.toUpperCase() || '';
      if (upper.includes('FIXED')) return 'Plazo Fijo';
      if (upper.includes('PROJECT')) return 'Por Proyecto';
      return 'Indefinido';
    };

    const mapModality = (mod: string) => {
      if (!mod) return undefined;
      const upper = mod.toUpperCase();
      if (upper.includes('REMOTE') || upper.includes('REMOTA')) return 'REMOTE';
      if (upper.includes('HYBRID') || upper.includes('HIBRID')) return 'HYBRID';
      return 'ON_SITE';
    };

    const mapDuration = (dur: string) => {
      if (!dur) return undefined;
      const upper = dur.toUpperCase();
      if (upper.includes('FIXED')) return 'FIXED_TERM';
      if (upper.includes('PROJECT')) return 'PROJECT';
      return 'INDEFINITE';
    };

    const titleText = smartFillResponse.fields.title || '';
    const modalityText = mapModalityText(smartFillResponse.fields.modality);
    const durationText = mapDurationText(smartFillResponse.fields.duration);

    let conditionsDraft = `<p><strong>Detalles de contratación para el puesto de ${titleText}:</strong></p><ul>`;
    conditionsDraft += `<li><strong>Tipo de contrato:</strong> ${durationText}</li>`;
    conditionsDraft += `<li><strong>Modalidad de trabajo:</strong> ${modalityText}</li>`;
    
    if (smartFillResponse.fields.salary_range?.min) {
      const formattedSalary = new Intl.NumberFormat('es-CL').format(smartFillResponse.fields.salary_range.min);
      const currencyCode = smartFillResponse.fields.salary_range.currency || 'CLP';
      conditionsDraft += `<li><strong>Renta ofrecida:</strong> ${currencyCode} $${formattedSalary} líquidos</li>`;
    }

    conditionsDraft += `</ul><p><strong>Beneficios sugeridos:</strong></p><ul>`;
    conditionsDraft += `<li>Oportunidades de crecimiento y desarrollo profesional.</li>`;
    conditionsDraft += `<li>Excelente clima laboral y cultura de trabajo colaborativa.</li>`;
    conditionsDraft += `<li>Equipamiento de trabajo proporcionado por la empresa.</li>`;
    conditionsDraft += `</ul>`;

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

    const category = detectStageCategory(titleText);
    const selectedTemplate = STAGE_TEMPLATES.find(t => t.id === category) || STAGE_TEMPLATES[0];
    const autoStages = selectedTemplate.stages.map((stage, idx) => ({
      name: stage.name,
      description: stage.description,
      responsibleId: currentUser?.id || '',
      order: idx + 1
    }));

    setFormData(prev => ({
      ...prev,
      description: smartFillResponse.fields.description || prev.description,
      requirements: smartFillResponse.fields.requirements
        ? `<ul>${smartFillResponse.fields.requirements.map(r => `<li>${r}</li>`).join('')}</ul>`
        : prev.requirements,
      modality: mapModality(smartFillResponse.fields.modality) || prev.modality,
      duration: mapDuration(smartFillResponse.fields.duration) || prev.duration,
      salary: smartFillResponse.fields.salary_range?.min || prev.salary,
      currency: (smartFillResponse.fields.salary_range?.currency as any) || prev.currency,
      conditions: conditionsDraft,
      stageTemplates: autoStages,
    }));

    setSmartFillModalOpen(false);
    setSmartFillResponse(null);
    setAiHydratedSteps([1, 2, 3, 4]);
    setShowAiBanner(true);
    setCurrentStep(2);
    setIsApplying(false);
  };

  const handleDiscardSmartFill = () => {
    setSmartFillModalOpen(false);
    setSmartFillResponse(null);
  };

  useEffect(() => {
    const prevStep = prevStepRef.current;
    if (prevStep !== currentStep) {
      if (aiHydratedSteps.includes(prevStep)) {
        setAiHydratedSteps(prev => prev.filter(s => s !== prevStep));
      }
      prevStepRef.current = currentStep;
    }
  }, [currentStep, aiHydratedSteps]);

  const gotoStep = (step: number) => {
    setCurrentStep(step as Step);
    window.scrollTo(0, 0);
  };

  const formatSalaryDisplay = (salary: number | undefined, currency: string | undefined): string => {
    if (!salary) return '—';
    const cur = WIZARD_CURRENCIES.find(c => c.code === currency);
    return `${cur?.symbol || '$'} ${formatNumber(salary)}`;
  };

  const renderStepperItem = (step: StepConfig, idx: number) => {
    const stepNum = step.number as Step;
    const isDone = currentStep > stepNum;
    const isCur = currentStep === stepNum;
    const isTodo = currentStep < stepNum;

    return (
      <li key={stepNum} className="flex flex-col">
        <button
          type="button"
          onClick={() => isDone ? handleStepClick(stepNum) : undefined}
          className={`flex items-center gap-3 text-left transition ${isDone ? 'cursor-pointer' : 'cursor-default'} group`}
        >
          {isDone ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-good text-onmark t-good">
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </span>
          ) : isCur ? (
            <span className="step-current grid h-9 w-9 shrink-0 place-items-center rounded-full bg-greendeep font-mono text-[13px] font-semibold text-onmark">
              {stepNum}
            </span>
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line2 bg-paper2 font-mono text-[13px] font-semibold text-ink3 t-line2 t-paper2 t-ink3">
              {stepNum}
            </span>
          )}
          <span className="leading-tight">
            <span className={`block text-[13.5px] font-semibold ${isDone ? 'text-good t-good' : isCur ? 'text-ink t-ink' : 'text-ink3 t-ink3'}`}>
              {step.name}
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-ink3 t-ink3">
              Paso {stepNum}
            </span>
          </span>
        </button>
        {idx < STEPS_CONFIG.length - 1 && (
          <span className={`ml-[18px] h-6 w-px ${isDone ? 'bg-good t-good' : 'bg-line2 t-line2'}`} />
        )}
      </li>
    );
  };

  const renderMobileStepperItem = (step: StepConfig, idx: number) => {
    const stepNum = step.number as Step;
    const isDone = currentStep > stepNum;
    const isCur = currentStep === stepNum;

    return (
      <li key={stepNum} className="flex items-center">
        {isDone ? (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green text-onmark">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </span>
        ) : isCur ? (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-greendeep text-onmark">
            <span className="text-[10px] font-bold">{stepNum}</span>
          </span>
        ) : (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line2 text-ink3">
            <span className="text-[10px] font-bold">{stepNum}</span>
          </span>
        )}
        {idx < STEPS_CONFIG.length - 1 && (
          <span className={`mx-2 h-px w-6 ${isDone ? 'bg-green' : 'bg-line2'}`} />
        )}
      </li>
    );
  };

  const LiveSummary: React.FC<{ formData: CreateCampaignRequest }> = ({ formData }) => (
    <div className="mt-7 hidden rounded-2xl border border-line2 bg-card p-4 lg:block t-card t-line2">
      <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink3 t-ink3">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
        Resumen en vivo
      </div>
      <dl className="mt-3 grid gap-2.5 text-[13px]">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Cargo</dt>
          <dd className="font-semibold text-ink t-ink">{formData.title || '—'}</dd>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Ubicación</dt><dd className="text-ink2 t-ink2">{formData.location || '—'}</dd></div>
          <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Modalidad</dt><dd className="text-ink2 t-ink2">{formData.modality ? MODALITY_LABELS[formData.modality] || formData.modality : '—'}</dd></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Salario</dt><dd className="text-ink2 t-ink2">{formatSalaryDisplay(formData.salary, formData.currency)}</dd></div>
          <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Etapas</dt><dd className="text-ink2 t-ink2">{(formData.stageTemplates || []).length}</dd></div>
        </div>
      </dl>
      <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink3 t-ink3 t-line">Al crear, Evalen genera la <span className="text-ink2 t-ink2">rúbrica</span> desde esta oferta.</p>
    </div>
  );

  if (createdCampaign) {
    if (showShareScreen) {
      return (
        <Layout>
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-60 bg-grain opacity-[0.045] mix-blend-overlay" />
          <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-7 sm:px-6 lg:px-8">
            <div className="mb-5 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">
              <span className="transition hover:text-ink2">Campañas</span>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              <span className="text-ink2 t-ink2">Nueva campaña</span>
            </div>
            <PublishShareScreen campaign={createdCampaign} onGoToDashboard={onGoToDashboard} />
          </main>
        </Layout>
      );
    }

    return (
      <Layout>
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-60 bg-grain opacity-[0.045] mix-blend-overlay" />
        <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-7 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">
            <span className="transition hover:text-ink2">Campañas</span>
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            <span className="text-ink2 t-ink2">Nueva campaña</span>
          </div>

          <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green text-onmark animate-popin">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </span>
            <h2 className="mt-5 font-serif text-[1.8rem] font-semibold tracking-tight text-ink t-ink">Campaña creada</h2>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-midt px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-wide text-mid t-midt t-mid">
              <span className="h-1.5 w-1.5 rounded-full bg-mid"></span> Borrador
            </div>
            <p className="mt-4 max-w-[44ch] text-[15px] text-ink2 t-ink2">
              <b className="text-ink t-ink">{createdCampaign.title}</b> · {(createdCampaign.stageTemplates || []).length} etapas. Evalen ya generó la rúbrica.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button onClick={handlePublish} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-cta px-5 py-3 text-[14px] font-semibold text-ctatext shadow-cta transition hover:-translate-y-0.5 hover:bg-ctah disabled:opacity-50">
                {loading ? 'Publicando...' : 'Publicar ahora'}
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <button onClick={onGoToDashboard} className="inline-flex items-center gap-2 rounded-xl border border-line2 bg-card px-5 py-3 text-[14px] font-semibold text-ink transition hover:-translate-y-0.5 hover:border-ink t-card t-ink t-line2">
                Ir al dashboard
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </button>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  if (permissionError) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
              <p className="text-gray-600 mb-6">{permissionError}</p>
              <button
                onClick={onCancel}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-60 bg-grain opacity-[0.045] mix-blend-overlay" />
      <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-7 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">
          <span className="transition hover:text-ink2">Campañas</span>
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          <span className="text-ink2 t-ink2">Nueva campaña</span>
        </div>

        <div className="flex flex-col rounded-3xl border border-line bg-card shadow-card t-card t-line" style={{ minHeight: '640px' }}>
          <div className="flex flex-col lg:flex-row flex-1 min-h-0">
            {/* SIDEBAR */}
            <aside className="w-full lg:w-[300px] shrink-0 border-b lg:border-b-0 lg:border-r border-line bg-paper/60 p-6 lg:bg-paper/40 t-line t-paper">
              <ol className="hidden lg:block" aria-label="Progreso del formulario">
                {STEPS_CONFIG.map((step, idx) => renderStepperItem(step, idx))}
              </ol>

              <div className="lg:hidden">
                <ol className="flex items-center">
                  {STEPS_CONFIG.map((step, idx) => renderMobileStepperItem(step, idx))}
                </ol>
                <p className="mt-3 text-[13px] text-ink2 t-ink2">
                  <span className="font-semibold text-ink t-ink">Paso {currentStep} de 5</span> · <span>{STEP_NAMES[currentStep - 1]}</span>
                </p>
              </div>

              <LiveSummary formData={formData} />
            </aside>

            {/* CONTENT */}
            <div className="flex flex-1 flex-col min-w-0 min-h-0 p-6 sm:p-8 lg:p-10">
              <div className="flex items-start justify-between gap-4 shrink-0">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-green t-green">Nueva campaña</p>
                  <h1 className="mt-1.5 font-serif text-[1.7rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2rem] t-ink">Crea tu oferta en 5 pasos</h1>
                </div>
                <button onClick={onCancel} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line2 px-3 py-2 text-[13px] font-medium text-ink2 transition hover:border-low hover:text-low t-ink2 t-line2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                  Cancelar
                </button>
              </div>

              {/* AI Hydration Banner */}
              {showAiBanner && (
                <div className="mt-5 rounded-xl border border-yellow2/60 bg-yellow2/20 px-4 py-3 text-[13px] leading-relaxed text-ink2 flex items-center justify-between gap-3 shrink-0">
                  <span>✨ La IA completó los borradores en los Pasos 1, 2, 3 y 4. Navega para confirmar y personalizar.</span>
                  <button type="button" onClick={() => setShowAiBanner(false)} className="shrink-0 text-ink3 hover:text-ink transition">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                  </button>
                </div>
              )}

              <form className="mt-7 flex-1 overflow-y-auto min-h-0 [scrollbar-gutter:stable]" noValidate>
                {/* STEP 1 */}
                {currentStep === 1 && (
                  <section className="animate-fade-in">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-greentint text-green t-goodt t-green">
                        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </span>
                      <h2 className="font-serif text-[1.4rem] font-semibold tracking-tight text-ink t-ink">Lo esencial del cargo</h2>
                    </div>
                    <p className="mt-2 max-w-[58ch] text-[14px] text-ink2 t-ink2">Lo mínimo para publicar y para que la IA entienda qué buscar. El título y la modalidad son lo primero que filtra un candidato — y lo primero que lee Evalen.</p>

                    <div className="mt-6 grid gap-5">
                      <div>
                        <label htmlFor="f-title" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink2 t-ink2">Título del puesto <span className="text-cta t-cta">*</span></label>
                        <input
                          id="f-title"
                          name="title"
                          type="text"
                          value={formData.title || ''}
                          onChange={handleInputChange}
                          placeholder="Ej. Desarrollador Full Stack Senior"
                          className={`w-full rounded-xl border bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink3/80 transition focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink ${errors.title ? 'border-low animate-shake' : 'border-line2'}`}
                        />
                        {errors.title && <p className="mt-1 text-[13px] text-low">{errors.title}</p>}
                      </div>

                      {/* Smart Fill · Bloque Premium */}
                      <div id="smartBlock" className={`smart-block relative overflow-hidden rounded-2xl border border-onmark/10 bg-greendeep p-5 text-onmark shadow-card sm:p-6 ${(currentUser?.smartFillCredits ?? 0) <= 0 ? 'is-depleted' : ''}`}>
                        {/* Radial glow - yellow */}
                        <div aria-hidden="true" className="smart-glow pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full" style={{background: 'radial-gradient(circle, rgba(243,233,78,.26), rgba(243,233,78,0) 70%)'}} />
                        {/* Radial glow - green */}
                        <div aria-hidden="true" className="smart-glow pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full" style={{background: 'radial-gradient(circle, rgba(91,174,136,.22), rgba(91,174,136,0) 70%)'}} />
                        {/* Diagonal gradient */}
                        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{background: 'linear-gradient(135deg, rgba(28,91,68,0) 30%, rgba(28,91,68,.5) 100%)'}} />
                        {/* SVG nodes network */}
                        <svg aria-hidden="true" className="smart-nodes pointer-events-none absolute inset-0 h-full w-full text-onmark opacity-[0.08]" viewBox="0 0 420 240" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="1">
                          <g>
                            <line x1="36" y1="46" x2="120" y2="34"/><line x1="120" y1="34" x2="205" y2="72"/><line x1="205" y1="72" x2="300" y2="40"/><line x1="300" y1="40" x2="384" y2="96"/>
                            <line x1="205" y1="72" x2="256" y2="128"/><line x1="120" y1="34" x2="64" y2="128"/><line x1="64" y1="128" x2="168" y2="150"/><line x1="168" y1="150" x2="256" y2="128"/>
                            <line x1="256" y1="128" x2="350" y2="176"/><line x1="168" y1="150" x2="110" y2="200"/><line x1="110" y1="200" x2="300" y2="206"/><line x1="300" y1="206" x2="350" y2="176"/>
                            <line x1="384" y1="96" x2="350" y2="176"/><line x1="36" y1="46" x2="64" y2="128"/><line x1="205" y1="72" x2="168" y2="150"/>
                          </g>
                          <g fill="currentColor" stroke="none">
                            <circle cx="36" cy="46" r="2.6"/><circle cx="300" cy="40" r="2.6"/><circle cx="384" cy="96" r="2.6"/><circle cx="64" cy="128" r="2.6"/>
                            <circle cx="256" cy="128" r="2.6"/><circle cx="110" cy="200" r="2.6"/><circle cx="300" cy="206" r="2.6"/><circle cx="350" cy="176" r="2.6"/>
                            <circle className="smart-node-pulse" cx="120" cy="34" r="3.4"/><circle className="smart-node-pulse" cx="205" cy="72" r="3.4" style={{animationDelay: '.8s'}}/>
                            <circle className="smart-node-pulse" cx="168" cy="150" r="3.4" style={{animationDelay: '1.6s'}}/>
                          </g>
                        </svg>

                        <div className="relative z-10">
                          {/* Row: medal + text + chip */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              <span className="smart-medal grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-yellow text-greendeep shadow-gold">
                                <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 1.7 4.6L18 8l-4.3 1.4L12 14l-1.7-4.6L6 8l4.3-1.4z"/><path d="M18.5 13.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"/><path d="M5 14l.7 1.9 1.9.7-1.9.7L5 19l-.7-1.7-1.9-.7 1.9-.7z"/></svg>
                              </span>
                              <div className="min-w-0">
                                <h3 className="font-sans text-[16px] font-semibold leading-tight tracking-tight text-onmark">Smart Fill · <span className="rounded-sm bg-yellow px-1.5 text-greendeep">borrador con IA</span></h3>
                                <p id="smartCopy" className="mt-1 max-w-[46ch] text-[13px] leading-relaxed text-onmark/75">
                                  {(currentUser?.smartFillCredits ?? 0) <= 0 ? 'Agotaste tus usos de Smart Fill este mes.' : 'Escribe el título y un poco de contexto: la IA redacta descripción, requisitos y beneficios por ti.'}
                                </p>
                              </div>
                            </div>
                            <span id="smartChip" className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur-sm ${(currentUser?.smartFillCredits ?? 0) <= 0 ? 'border-onmark/25 bg-onmark/10 text-onmark/60' : 'border-yellow/40 bg-yellow/10 text-yellow'}`}>
                              {(currentUser?.smartFillCredits ?? 0) <= 0 ? 'Sin usos' : <><span className="smart-dot h-1.5 w-1.5 rounded-full bg-yellow animate-pulsering"></span> Asistente IA</>}
                            </span>
                          </div>

                          {/* Credit meter */}
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-onmark/60">Usos disponibles</span>
                            <span id="creditPills" className="flex items-center gap-1.5" aria-hidden="true">
                              {Array.from({length: 2}).map((_, i) => (
                                <span key={i} className={`h-2.5 w-7 rounded-full transition-colors duration-300 ${i < (currentUser?.smartFillCredits ?? 0) ? 'bg-yellow shadow-gold' : 'bg-onmark/20'}`} />
                              ))}
                            </span>
                            <span id="creditText" className="font-mono text-[11px] text-onmark/70">{(currentUser?.smartFillCredits ?? 0)} de 2</span>
                          </div>

                          {/* Input + Button */}
                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                            <input
                              id="f-smartctx"
                              type="text"
                              value={smartFillContext}
                              onChange={(e) => setSmartFillContext(e.target.value)}
                              placeholder="Contexto opcional · Ej. 100% remoto, stack Next.js + Node, equipo de 6"
                              disabled={(currentUser?.smartFillCredits ?? 0) <= 0}
                              className="smart-input flex-1 rounded-xl border px-4 py-3 text-[14px] transition focus:outline-none focus:ring-2 focus:ring-yellow/40"
                            />
                            <button
                              type="button"
                              onClick={handleSmartFill}
                              disabled={isGenerating || (currentUser?.smartFillCredits ?? 0) <= 0}
                              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cta px-5 py-3 text-[14px] font-semibold text-ctatext shadow-cta transition hover:-translate-y-0.5 hover:bg-ctah disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                            >
                              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 1.7 4.6L18 8l-4.3 1.4L12 14l-1.7-4.6L6 8l4.3-1.4z"/><path d="M18.5 13.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"/></svg>
                              <span>{isGenerating ? 'Redactando…' : 'Smart Fill'}</span>
                            </button>
                          </div>

                          {/* Upgrade (hidden when credits > 0) */}
                          {(currentUser?.smartFillCredits ?? 0) <= 0 && (
                            <p id="smartUpgrade" className="mt-3.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-onmark/70">
                              <svg className="h-4 w-4 text-yellow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z"/></svg>
                              ¿Necesitas más borradores? <span className="font-semibold text-yellow underline-offset-2 hover:underline cursor-pointer">Desbloquéalos con EvalenPro →</span>
                            </p>
                          )}
                        </div>
                        {errors.submit && <p className="mt-2 text-[12px] text-low/80">{errors.submit}</p>}
                      </div>

                      <div>
                        <label htmlFor="f-loc" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink2 t-ink2">Ubicación geográfica <span className="text-cta t-cta">*</span></label>
                        <LocationAutocomplete
                          value={formData.location || ''}
                          onChange={(value) => setFormData({ ...formData, location: value })}
                          placeholder="Ej. Santiago, Región Metropolitana, Chile"
                          error={errors.location}
                          required
                        />
                      </div>

                      <div className="grid gap-5 sm:grid-cols-3">
                        <div>
                          <label htmlFor="f-type" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink2 t-ink2">Tipo de trabajo <span className="text-cta t-cta">*</span></label>
                          <select
                            id="f-type"
                            name="workType"
                            value={formData.workType || ''}
                            onChange={handleInputChange}
                            className={`w-full rounded-xl border bg-card px-3 py-3 text-[15px] text-ink transition focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink ${errors.workType ? 'border-low animate-shake' : 'border-line2'}`}
                          >
                            <option value="">Seleccionar…</option>
                            <option value="FULL_TIME">Jornada completa</option>
                            <option value="PART_TIME">Medio tiempo</option>
                            <option value="HOURLY">Por horas</option>
                            <option value="INTERNSHIP">Práctica / pasantía</option>
                          </select>
                          {errors.workType && <p className="mt-1 text-[13px] text-low">{errors.workType}</p>}
                        </div>
                        <div>
                          <label htmlFor="f-mod" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink2 t-ink2">Modalidad <span className="text-cta t-cta">*</span></label>
                          <select
                            id="f-mod"
                            name="modality"
                            value={formData.modality || ''}
                            onChange={handleInputChange}
                            className={`w-full rounded-xl border bg-card px-3 py-3 text-[15px] text-ink transition focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink ${errors.modality ? 'border-low animate-shake' : 'border-line2'}`}
                          >
                            <option value="">Seleccionar…</option>
                            <option value="REMOTE">Remoto</option>
                            <option value="HYBRID">Híbrido</option>
                            <option value="ON_SITE">Presencial</option>
                          </select>
                          {errors.modality && <p className="mt-1 text-[13px] text-low">{errors.modality}</p>}
                        </div>
                        <div>
                          <label htmlFor="f-dur" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink2 t-ink2">Duración <span className="text-cta t-cta">*</span></label>
                          <select
                            id="f-dur"
                            name="duration"
                            value={formData.duration || ''}
                            onChange={handleInputChange}
                            className={`w-full rounded-xl border bg-card px-3 py-3 text-[15px] text-ink transition focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink ${errors.duration ? 'border-low animate-shake' : 'border-line2'}`}
                          >
                            <option value="">Seleccionar…</option>
                            <option value="INDEFINITE">Indefinido</option>
                            <option value="FIXED_TERM">Plazo fijo</option>
                            <option value="PROJECT">Por proyecto</option>
                            <option value="SEASONAL">Temporada</option>
                          </select>
                          {errors.duration && <p className="mt-1 text-[13px] text-low">{errors.duration}</p>}
                        </div>
                      </div>

                      <label className="flex cursor-pointer select-none items-center gap-3 rounded-xl border border-line2 bg-paper/60 px-4 py-3 text-[14px] text-ink t-ink t-line2">
                        <input
                          id="f-incl"
                          name="inclusionPosition"
                          type="checkbox"
                          checked={formData.inclusionPosition || false}
                          onChange={handleInputChange}
                          className="h-4 w-4 rounded border-line2 accent-cta"
                        />
                        Puesto acogido a Ley de Inclusión (21.015)
                      </label>
                    </div>

                    <div className="mt-6 rounded-r-xl border-l-2 border-cta bg-card py-3 pl-4 pr-4 t-card t-cta">
                      <p className="text-[13px] leading-relaxed text-ink2 t-ink2"><span className="font-semibold text-ink t-ink">Consejo.</span> Un título específico ("Backend Node · 4+ años") atrae mejor postulación que uno genérico ("Desarrollador"). La IA usa esas palabras para afinar el match.</p>
                    </div>
                  </section>
                )}

                {/* STEP 2 */}
                {currentStep === 2 && (
                  <section className="animate-fade-in">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-greentint text-green t-goodt t-green">
                        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h6M10 16h6"/></svg>
                      </span>
                      <h2 className="font-serif text-[1.4rem] font-semibold tracking-tight text-ink t-ink">Describe el puesto como a un colega</h2>
                    </div>
                    <p className="mt-2 max-w-[60ch] text-[14px] text-ink2 t-ink2">Menciona los <span className="font-medium text-ink t-ink">excluyentes</span> (años, stack, idiomas). Evalen los usa para descartar antes de que tú pierdas tiempo leyendo.</p>

                    <div className="mt-6 grid gap-6">
                      <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink2 t-ink2">Descripción del puesto <span className="text-cta t-cta">*</span></label>
                        <SimpleEditor
                          field="description"
                          value={formData.description || ''}
                          onChange={(html) => {
                            setFormData(prev => ({ ...prev, description: html }));
                            if (errors.description) {
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.description;
                                return newErrors;
                              });
                            }
                          }}
                          placeholder="Describe las responsabilidades principales, el ambiente de trabajo, y qué hace especial esta oportunidad..."
                          error={!!errors.description}
                        />
                        {errors.description && <p className="mt-1 text-[13px] text-low">{errors.description}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink2 t-ink2">Requisitos y habilidades <span className="text-cta t-cta">*</span></label>
                        <SimpleEditor
                          field="requirements"
                          value={formData.requirements || ''}
                          onChange={(html) => {
                            setFormData(prev => ({ ...prev, requirements: html }));
                            if (errors.requirements) {
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.requirements;
                                return newErrors;
                              });
                            }
                          }}
                          placeholder="Detalla la experiencia requerida, tecnologías, habilidades blandas, formación académica, etc..."
                          error={!!errors.requirements}
                        />
                        {errors.requirements && <p className="mt-1 text-[13px] text-low">{errors.requirements}</p>}
                      </div>
                    </div>

                    <div className="mt-6 rounded-r-xl border-l-2 border-cta bg-card py-3 pl-4 pr-4 t-card t-cta">
                      <p className="text-[13px] leading-relaxed text-ink2 t-ink2"><span className="font-semibold text-ink t-ink">Consejo.</span> Separa "excluyentes" de "deseables". La rúbrica pondera los excluyentes más alto y marca rojo al que no los cumple.</p>
                    </div>
                  </section>
                )}

                {/* STEP 3 */}
                {currentStep === 3 && (
                  <section className="animate-fade-in">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-greentint text-green t-goodt t-green">
                        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.2c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.7-1.1 1.5-2.5 1.8-2.5.8-2.5 1.8 1.1 1.7 2.5 1.7 2.5-.7 2.5-1.7"/></svg>
                      </span>
                      <h2 className="font-serif text-[1.4rem] font-semibold tracking-tight text-ink t-ink">Qué ofreces a cambio</h2>
                    </div>
                    <p className="mt-2 max-w-[60ch] text-[14px] text-ink2 t-ink2">El rango salarial, aunque no lo publiques, mejora el match: la IA detecta desajustes de seniority y te lo avisa.</p>

                    <div className="mt-6 grid gap-6">
                      <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink2 t-ink2">Condiciones y beneficios <span className="text-cta t-cta">*</span></label>
                        <SimpleEditor
                          field="conditions"
                          value={formData.conditions || ''}
                          onChange={(html) => {
                            setFormData(prev => ({ ...prev, conditions: html }));
                            if (errors.conditions) {
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.conditions;
                                return newErrors;
                              });
                            }
                          }}
                          placeholder="Incluye información sobre beneficios, modalidad de trabajo, horarios, vacaciones, etc..."
                          error={!!errors.conditions}
                        />
                        {errors.conditions && <p className="mt-1 text-[13px] text-low">{errors.conditions}</p>}
                      </div>

                      <div className="rounded-2xl border border-line2 bg-greentint p-4 sm:p-5 t-line2 t-greentint">
                        <div className="flex items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-greendeep text-onmark">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.2c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.7-1.1 1.5-2.5 1.8-2.5.8-2.5 1.8 1.1 1.7 2.5 1.7 2.5-.7 2.5-1.7"/></svg>
                          </span>
                          <h3 className="font-sans text-[15px] font-semibold tracking-tight text-ink t-ink">Información salarial</h3>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr]">
                          <select
                            name="currency"
                            value={formData.currency || 'CLP'}
                            onChange={handleInputChange}
                            className="w-full rounded-xl border border-line2 bg-card px-3 py-3 text-[15px] text-ink transition focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink t-line2"
                          >
                            {WIZARD_CURRENCIES.map(c => (
                              <option key={c.code} value={c.code}>{c.label}</option>
                            ))}
                          </select>
                          <input
                            name="salary"
                            type="text"
                            inputMode="numeric"
                            value={formatInputNumber(formData.salary?.toString() || '')}
                            onChange={(e) => {
                              const rawValue = parseNumber(e.target.value);
                              handleInputChange({
                                target: {
                                  name: 'salary',
                                  value: rawValue.toString(),
                                  type: 'text'
                                }
                              } as any);
                            }}
                            placeholder="Ej. 2.000.000"
                            className="w-full rounded-xl border border-line2 bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink3/80 transition focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink t-line2"
                          />
                        </div>
                        <label className="mt-3 flex cursor-pointer select-none items-center gap-2.5 text-[13.5px] text-ink2 t-ink2">
                          <input
                            name="showSalary"
                            type="checkbox"
                            checked={formData.showSalary || false}
                            onChange={handleInputChange}
                            className="h-4 w-4 rounded border-line2 accent-cta"
                          />
                          Mostrar el salario en la publicación pública
                        </label>
                      </div>
                    </div>

                    <div className="mt-6 rounded-r-xl border-l-2 border-cta bg-card py-3 pl-4 pr-4 t-card t-cta">
                      <p className="text-[13px] leading-relaxed text-ink2 t-ink2"><span className="font-semibold text-ink t-ink">Consejo.</span> Los beneficios concretos ("día libre de cumpleaños", "presupuesto de aprendizaje") pesan más que "buen ambiente". Escríbelos como lista.</p>
                    </div>
                  </section>
                )}

                {/* STEP 4 */}
                {currentStep === 4 && (
                  <section className="animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-greentint text-green t-goodt t-green">
                          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.5a3 3 0 0 1 0 5.5M17.5 19a5 5 0 0 0-3-4.6"/></svg>
                        </span>
                        <h2 className="font-serif text-[1.4rem] font-semibold tracking-tight text-ink t-ink">Cómo vas a decidir</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplate(null);
                          const currentStages = formData.stageTemplates || [];
                          const newStage: StageTemplateInput = {
                            name: '',
                            description: '',
                            responsibleId: currentUser?.id || '',
                            order: currentStages.length + 1
                          };
                          setFormData({
                            ...formData,
                            stageTemplates: [...currentStages, newStage]
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-greendeep px-3.5 py-2 text-[13px] font-semibold text-onmark transition hover:-translate-y-0.5"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                        Agregar etapa
                      </button>
                    </div>
                    <p className="mt-2 max-w-[62ch] text-[14px] text-ink2 t-ink2">Estas etapas se vuelven el tablero de cada candidato. Empieza con una plantilla probada o arma la tuya.</p>

                    <div className="mt-4 rounded-xl border border-line2 bg-greentint px-4 py-3 text-[13px] leading-relaxed text-ink2 t-line2 t-greentint">
                      <span className="font-semibold text-green t-green">Nota.</span> Si no incluyes una etapa llamada "Contactar", Evalen la agrega como primera por defecto.
                    </div>

                    {(formData.stageTemplates || []).length === 0 ? (
                      <div className="mt-6">
                        <p className="text-center font-serif text-[1.1rem] font-semibold text-ink t-ink">Empieza con una plantilla probada</p>
                        <p className="mt-1 text-center text-[13px] text-ink2 t-ink2">Elige un flujo predefinido o parte desde cero.</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {STAGE_TEMPLATES.map((template) => {
                            const Icon = template.icon;
                            return (
                              <button
                                key={template.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTemplate(template.id);
                                  const newStages = template.stages.map((stage, index) => ({
                                    ...stage,
                                    responsibleId: currentUser?.id || '',
                                    order: index + 1
                                  }));
                                  setFormData({
                                    ...formData,
                                    stageTemplates: newStages
                                  });
                                }}
                                className={`group rounded-2xl border p-4 text-left transition t-card t-line2 ${selectedTemplate === template.id ? 'border-green bg-greentint' : 'border-line2 bg-card hover:border-green'}`}
                              >
                                <span className="grid h-10 w-10 place-items-center rounded-xl bg-greentint text-green t-goodt t-green">
                                  <Icon className="h-5 w-5" />
                                </span>
                                <h3 className="mt-3 font-sans text-[15px] font-semibold text-ink t-ink">{template.name}</h3>
                                <p className="mt-1 text-[12.5px] leading-snug text-ink2 t-ink2">{template.description}</p>
                                <span className="mt-3 inline-block rounded-full bg-paper2 px-2.5 py-1 font-mono text-[10.5px] text-ink2 t-paper2 t-ink2">{template.stages.length} etapas</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="my-5 flex items-center gap-3 text-[12px] text-ink3 t-ink3">
                          <span className="h-px flex-1 bg-line2 t-line2" />
                          o personalízalo
                          <span className="h-px flex-1 bg-line2 t-line2" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplate(null);
                            const newStage: StageTemplateInput = {
                              name: '',
                              description: '',
                              responsibleId: currentUser?.id || '',
                              order: 1
                            };
                            setFormData({
                              ...formData,
                              stageTemplates: [newStage]
                            });
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line2 py-3.5 text-[14px] font-medium text-ink2 transition hover:border-green hover:text-green t-ink2 t-line2"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                          Crear desde cero (vacío)
                        </button>
                      </div>
                    ) : (
                      <div className="mt-6 grid gap-3.5">
                        {(formData.stageTemplates || []).map((stage, index) => (
                          <div key={index} className="stage-card rounded-2xl border border-line2 bg-card p-4 sm:p-5 t-card t-line2" data-i={index}>
                            {/* Header */}
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-2.5">
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-greentint font-mono text-[12px] font-semibold text-green t-goodt t-green">{index + 1}</span>
                                <span className="font-sans text-[14px] font-semibold text-ink t-ink">Etapa {index + 1}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newStages = [...(formData.stageTemplates || [])];
                                    [newStages[index - 1], newStages[index]] = [newStages[index], newStages[index - 1]];
                                    newStages.forEach((s, i) => s.order = i + 1);
                                    setFormData({ ...formData, stageTemplates: newStages });
                                  }}
                                  disabled={index === 0}
                                  aria-label="Subir etapa"
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-line2 text-ink2 transition hover:border-green hover:text-green disabled:opacity-35 t-ink2 t-line2"
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6"/></svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newStages = [...(formData.stageTemplates || [])];
                                    [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
                                    newStages.forEach((s, i) => s.order = i + 1);
                                    setFormData({ ...formData, stageTemplates: newStages });
                                  }}
                                  disabled={index >= (formData.stageTemplates || []).length - 1}
                                  aria-label="Bajar etapa"
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-line2 text-ink2 transition hover:border-green hover:text-green disabled:opacity-35 t-ink2 t-line2"
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newStages = formData.stageTemplates?.filter((_, i) => i !== index) || [];
                                    newStages.forEach((s, i) => s.order = i + 1);
                                    setFormData({ ...formData, stageTemplates: newStages });
                                  }}
                                  aria-label="Eliminar etapa"
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-line2 text-ink3 transition hover:border-low hover:text-low t-ink3 t-line2"
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>
                                </button>
                              </span>
                            </div>
                            {/* Fields */}
                            <div className="mt-3 grid gap-3">
                              <div>
                                <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink2 t-ink2">Nombre de la etapa <span className="text-cta t-cta">*</span></label>
                                <input
                                  type="text"
                                  value={stage.name}
                                  onChange={(e) => {
                                    const newStages = [...(formData.stageTemplates || [])];
                                    newStages[index] = { ...newStages[index], name: e.target.value };
                                    setFormData({ ...formData, stageTemplates: newStages });
                                  }}
                                  placeholder="Ej. Entrevista técnica"
                                  className={`w-full rounded-xl border border-line2 bg-card px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink3/80 transition focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink t-line2 ${errors[`stage_${index}_name`] ? 'border-low' : ''}`}
                                />
                                {errors[`stage_${index}_name`] && <p className="mt-0.5 text-[12px] text-low">{errors[`stage_${index}_name`]}</p>}
                              </div>
                              <div>
                                <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink2 t-ink2">Descripción</label>
                                <textarea
                                  value={stage.description || ''}
                                  onChange={(e) => {
                                    const newStages = [...(formData.stageTemplates || [])];
                                    newStages[index] = { ...newStages[index], description: e.target.value };
                                    setFormData({ ...formData, stageTemplates: newStages });
                                  }}
                                  placeholder="Qué se evalúa en esta etapa"
                                  rows={2}
                                  className="w-full resize-y rounded-xl border border-line2 bg-card px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink3/80 transition focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink t-line2"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink2 t-ink2">Responsable <span className="text-cta t-cta">*</span></label>
                                <select
                                  value={stage.responsibleId}
                                  onChange={(e) => {
                                    const newStages = [...(formData.stageTemplates || [])];
                                    newStages[index] = { ...newStages[index], responsibleId: e.target.value };
                                    setFormData({ ...formData, stageTemplates: newStages });
                                  }}
                                  className={`w-full rounded-xl border border-line2 bg-card px-3 py-2.5 text-[14px] text-ink transition focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink t-line2 ${errors[`stage_${index}_responsible`] ? 'border-low' : ''}`}
                                >
                                  <option value="">Selecciona un responsable…</option>
                                  {availableUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                      {user.name} — {user.role === 'ADMIN' ? 'Admin' : user.role === 'RECRUITER' ? 'Reclutador' : 'Técnico'}
                                    </option>
                                  ))}
                                </select>
                                {errors[`stage_${index}_responsible`] && <p className="mt-0.5 text-[12px] text-low">{errors[`stage_${index}_responsible`]}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {errors.stages && (
                      <div className="mt-4 rounded-xl border border-low/30 bg-low/10 px-4 py-3 text-[13px] text-low">{errors.stages}</div>
                    )}

                    {(formData.stageTemplates || []).length === 0 && (
                      <p className="mt-4 rounded-2xl border border-dashed border-line2 py-8 text-center text-[13px] text-ink3 t-line2 t-ink3">Aún no hay etapas. Elige una plantilla o agrega una.</p>
                    )}
                  </section>
                )}

                {/* STEP 5 */}
                {currentStep === 5 && (
                  <section className="animate-fade-in">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-greentint text-green t-goodt t-green">
                        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>
                      </span>
                      <h2 className="font-serif text-[1.4rem] font-semibold tracking-tight text-ink t-ink">Revisa antes de publicar</h2>
                    </div>
                    <p className="mt-2 max-w-[62ch] text-[14px] text-ink2 t-ink2">Al crear, Evalen genera la <span className="font-medium text-ink t-ink">rúbrica de evaluación</span> desde esta oferta. Después solo subes CVs y la IA los puntúa contra ella.</p>

                    <div className="mt-6 grid gap-3.5">
                      {/* Basic Info Review */}
                      <div className="rounded-2xl border border-line2 bg-card p-4 sm:p-5 t-card t-line2">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">Información básica</h3>
                          <button type="button" onClick={() => gotoStep(1)} className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-cta underline-offset-2 hover:underline t-cta">Editar<svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
                        </div>
                        <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2">
                          <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Título</dt><dd className="text-ink t-ink">{formData.title || '—'}</dd></div>
                          <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Ubicación</dt><dd className="text-ink t-ink">{formData.location || '—'}</dd></div>
                          <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Tipo</dt><dd className="text-ink t-ink">{formData.workType ? WORK_TYPE_LABELS[formData.workType] || formData.workType : '—'}</dd></div>
                          <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Modalidad</dt><dd className="text-ink t-ink">{formData.modality ? MODALITY_LABELS[formData.modality] || formData.modality : '—'}</dd></div>
                          <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Duración</dt><dd className="text-ink t-ink">{formData.duration ? DURATION_LABELS[formData.duration] || formData.duration : '—'}</dd></div>
                          {formData.inclusionPosition && (
                            <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Inclusión</dt><dd className="text-green t-green">Sí</dd></div>
                          )}
                        </dl>
                      </div>

                      {/* Description Review */}
                      {formData.description && (
                        <div className="rounded-2xl border border-line2 bg-card p-4 sm:p-5 t-card t-line2">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">Descripción del puesto</h3>
                            <button type="button" onClick={() => gotoStep(2)} className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-cta underline-offset-2 hover:underline t-cta">Editar<svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
                          </div>
                          <div className="mt-2 text-[13.5px] leading-relaxed text-ink2 t-ink2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formData.description }} />
                        </div>
                      )}

                      {/* Requirements Review */}
                      {formData.requirements && (
                        <div className="rounded-2xl border border-line2 bg-card p-4 sm:p-5 t-card t-line2">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">Requisitos y habilidades</h3>
                            <button type="button" onClick={() => gotoStep(2)} className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-cta underline-offset-2 hover:underline t-cta">Editar<svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
                          </div>
                          <div className="mt-2 text-[13.5px] leading-relaxed text-ink2 t-ink2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formData.requirements }} />
                        </div>
                      )}

                      {/* Conditions Review */}
                      {formData.conditions && (
                        <div className="rounded-2xl border border-line2 bg-card p-4 sm:p-5 t-card t-line2">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">Condiciones y beneficios</h3>
                            <button type="button" onClick={() => gotoStep(3)} className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-cta underline-offset-2 hover:underline t-cta">Editar<svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
                          </div>
                          <div className="mt-2 text-[13.5px] leading-relaxed text-ink2 t-ink2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formData.conditions }} />
                        </div>
                      )}

                      {/* Salary Review */}
                      {formData.salary && (
                        <div className="rounded-2xl border border-line2 bg-card p-4 sm:p-5 t-card t-line2">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">Salario</h3>
                            <button type="button" onClick={() => gotoStep(3)} className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-cta underline-offset-2 hover:underline t-cta">Editar<svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
                          </div>
                          <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2">
                            <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Monto</dt><dd className="text-ink t-ink">{formatSalaryDisplay(formData.salary, formData.currency)}</dd></div>
                            <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3 t-ink3">Público</dt><dd className="text-ink t-ink">{formData.showSalary ? 'Sí' : 'No'}</dd></div>
                          </dl>
                        </div>
                      )}

                      {/* Stages Review */}
                      {(formData.stageTemplates || []).length > 0 && (
                        <div className="rounded-2xl border border-line2 bg-card p-4 sm:p-5 t-card t-line2">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">Etapas del proceso ({formData.stageTemplates?.length || 0})</h3>
                            <button type="button" onClick={() => gotoStep(4)} className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-cta underline-offset-2 hover:underline t-cta">Editar<svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(formData.stageTemplates || []).map((stage, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-greentint px-3 py-1.5 text-[12px] font-medium text-green t-goodt t-green">
                                <span className="grid h-4 w-4 place-items-center rounded-full bg-green text-[9px] font-bold text-onmark">{i + 1}</span>
                                {stage.name || `Etapa ${i + 1}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {errors.submit && (
                        <div className="rounded-xl border border-low/30 bg-low/10 px-4 py-3 text-[13px] text-low">{errors.submit}</div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-line2 bg-greentint px-4 py-3.5 t-line2 t-greentint">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-greendeep text-yellow">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
                      </span>
                      <p className="text-[13px] leading-relaxed text-ink2 t-ink2">Tu oferta se guarda y queda <span className="font-medium text-ink t-ink">activa</span>. Puedes pausarla o editarla cuando quieras desde el panel.</p>
                    </div>
                  </section>
                )}
              </form>

              {/* Footer */}
              <div className="mt-8 flex shrink-0 items-center justify-between gap-3 border-t border-line pt-6 t-line">
                <button onClick={handlePrevious} disabled={currentStep === 1}
                  className="inline-flex items-center gap-2 rounded-xl border border-line2 bg-card px-4 py-3 text-[14px] font-semibold text-ink transition hover:-translate-y-0.5 hover:border-ink disabled:cursor-not-allowed disabled:opacity-45 t-card t-ink t-line2">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
                  Anterior
                </button>
                <span className="font-mono text-[12px] text-ink3 t-ink3">Paso {currentStep} de 5</span>
                <button onClick={currentStep === 5 ? handleSubmit : handleNext}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-cta px-5 py-3 text-[14px] font-semibold text-ctatext shadow-cta transition hover:-translate-y-0.5 hover:bg-ctah disabled:opacity-60">
                  <span>{currentStep === 5 ? (loading ? 'Creando...' : 'Crear campaña') : 'Siguiente'}</span>
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SmartFillPreviewModal
        isOpen={smartFillModalOpen}
        response={smartFillResponse}
        onApply={handleApplySmartFill}
        onDiscard={handleDiscardSmartFill}
        isApplying={isApplying}
      />
    </Layout>
  );
};

export default CreateCampaign;
