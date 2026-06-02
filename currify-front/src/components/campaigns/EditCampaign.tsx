import React, { useState, useEffect, useCallback } from 'react';
import { apiService, Campaign, CreateCampaignRequest, StageTemplateInput, UserProfile } from '../../services/api';
import Layout from '../layout/Layout';
import RichTextEditor from '../common/RichTextEditor';
import FullScreenEditorModal from '../common/FullScreenEditorModal';
import LocationAutocomplete from '../common/LocationAutocomplete';
import { STAGE_TEMPLATES } from '../../constants/stageTemplates';
import { CURRENCIES } from '../../constants/currencies';
import { formatNumber, parseNumber, formatInputNumber } from '../../utils/formatters';
import {
  BriefcaseIcon,
  MapPinIcon,
  ClockIcon,
  HomeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface EditCampaignProps {
  campaignId: string;
  onCampaignUpdated: (campaign: Campaign) => void;
  onCancel: () => void;
  onGoToDashboard: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface StepConfig {
  number: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepConfig[] = [
  { number: 1, title: 'Información Básica', icon: BriefcaseIcon },
  { number: 2, title: 'Descripción y Requisitos', icon: DocumentTextIcon },
  { number: 3, title: 'Condiciones y Salario', icon: CurrencyDollarIcon },
  { number: 4, title: 'Etapas del Proceso', icon: UserGroupIcon },
  { number: 5, title: 'Revisar', icon: CheckCircleIcon }
];

const EditCampaign: React.FC<EditCampaignProps> = ({
  campaignId,
  onCampaignUpdated,
  onCancel,
  onGoToDashboard
}) => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New state for stage management
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [candidateCount, setCandidateCount] = useState<number>(0);
  const [showRescoreWarning, setShowRescoreWarning] = useState(false);

  const [formData, setFormData] = useState<Partial<CreateCampaignRequest>>({
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
    currency: undefined,
    showSalary: false,
    status: 'DRAFT',
    stageTemplates: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modal states for fullscreen editing
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [requirementsModalOpen, setRequirementsModalOpen] = useState(false);
  const [conditionsModalOpen, setConditionsModalOpen] = useState(false);

  // Load user profile and available users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [profile, allUsers] = await Promise.all([
          apiService.getProfile(),
          apiService.getUsers()
        ]);
        setCurrentUser(profile);

        // Filter users by company if applicable
        if (profile.role !== 'ADMIN' && profile.company) {
          // Cast to any to avoid strict type mismatch
          const companyUsers = allUsers.filter(u => u.company === profile.company) as any as UserProfile[];
          setAvailableUsers(companyUsers);
        } else {
          setAvailableUsers(allUsers as any as UserProfile[]);
        }
      } catch (err) {
        console.error('Error loading users:', err);
      }
    };
    fetchUsers();
  }, []);

  // Load campaign data
  const loadCampaign = useCallback(async () => {
    try {
      setLoading(true);
      const campaign = await apiService.getCampaign(campaignId);

      // Check candidate count for blocking edits
      if (campaign._count?.candidates) {
        setCandidateCount(campaign._count.candidates);
      }

      setFormData({
        title: campaign.title || '',
        description: campaign.description || '',
        requirements: campaign.requirements || '',
        conditions: campaign.conditions || '',
        location: campaign.location || '',
        workType: campaign.workType,
        modality: campaign.modality,
        duration: campaign.duration,
        inclusionPosition: campaign.inclusionPosition || false,
        salary: campaign.salary,
        currency: campaign.currency || 'CLP',
        showSalary: campaign.showSalary || false,
        status: campaign.status,
        stageTemplates: campaign.stageTemplates?.map(st => ({
          name: st.name,
          description: st.description,
          responsibleId: st.responsibleId,
          order: st.order
        })) || []
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar la campaña');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    // Clear error for this field when user edits it
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

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (step === 1) {
      if (!formData.title?.trim()) {
        newErrors.title = 'El título es requerido';
        isValid = false;
      }
      if (!formData.location?.trim() && formData.modality !== 'REMOTE') {
        newErrors.location = 'La ubicación es requerida para trabajos no remotos';
        isValid = false;
      }
      if (!formData.workType) {
        newErrors.workType = 'El tipo de trabajo es requerido';
        isValid = false;
      }
      if (!formData.modality) {
        newErrors.modality = 'La modalidad es requerida';
        isValid = false;
      }
      if (!formData.duration) {
        newErrors.duration = 'La duración es requerida';
        isValid = false;
      }
    }

    if (step === 2) {
      if (!formData.description || formData.description.replace(/<[^>]*>/g, '').trim().length < 50) {
        newErrors.description = 'La descripción debe tener al menos 50 caracteres';
        isValid = false;
      }
      if (!formData.requirements || formData.requirements.replace(/<[^>]*>/g, '').trim().length < 20) {
        newErrors.requirements = 'Debe detallar los requisitos';
        isValid = false;
      }
    }

    if (step === 3) {
      if (!formData.conditions || formData.conditions.replace(/<[^>]*>/g, '').trim().length < 20) {
        newErrors.conditions = 'Debe detallar las condiciones';
        isValid = false;
      }
    }

    if (step === 4) { // Stage validation
      if (!formData.stageTemplates || formData.stageTemplates.length === 0) {
        newErrors.stages = 'Debe haber al menos una etapa en el proceso';
        isValid = false;
      } else {
        formData.stageTemplates.forEach((stage, index) => {
          if (!stage.name.trim()) {
            newErrors[`stage_${index}_name`] = 'El nombre de la etapa es obligatorio';
            isValid = false;
          }
          if (!stage.responsibleId) {
            newErrors[`stage_${index}_responsible`] = 'Debe asignar un responsable';
            isValid = false;
          }
        });
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleStageChange = (index: number, field: keyof StageTemplateInput, value: any) => {
    const newStages = [...(formData.stageTemplates || [])];
    newStages[index] = {
      ...newStages[index],
      [field]: value
    };
    setFormData({ ...formData, stageTemplates: newStages });

    // Clear error
    if (errors[`stage_${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`stage_${index}_${field}`];
      setErrors(newErrors);
    }
  };

  const addStage = () => {
    const newStage: StageTemplateInput = {
      name: '',
      description: '',
      responsibleId: currentUser?.id || '',
      order: (formData.stageTemplates?.length || 0) + 1
    };
    setFormData({
      ...formData,
      stageTemplates: [...(formData.stageTemplates || []), newStage]
    });
  };

  const removeStage = (index: number) => {
    const newStages = (formData.stageTemplates || []).filter((_, i) => i !== index);
    // Reorder
    const reorderedStages = newStages.map((stage, i) => ({
      ...stage,
      order: i + 1
    }));
    setFormData({ ...formData, stageTemplates: reorderedStages });
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => (prev < 5 ? (prev + 1) as Step : prev));
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => (prev > 1 ? (prev - 1) as Step : prev));
    window.scrollTo(0, 0);
  };

  const handleStepClick = (stepNumber: Step) => {
    if (stepNumber === currentStep) return;

    if (stepNumber > currentStep) {
      if (!validateStep(currentStep)) return;
    }

    setCurrentStep(stepNumber);
    window.scrollTo(0, 0);
  };

  const handleSubmitClick = () => {
    if (candidateCount > 0) {
      setShowRescoreWarning(true);
      return;
    }
    handleSubmit();
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Cast to any to bypass strict type check on stageTemplates
      const updatedCampaign = await apiService.updateCampaign(campaignId, formData as any);
      if (updatedCampaign.scoringInvalidated) {
        alert('Campaña actualizada. Los candidatos existentes necesitarán reevaluación.');
      }
      onCampaignUpdated(updatedCampaign);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Error al actualizar la campaña' });
      // If error involves candidates in process, show clear message
      if (err.message && err.message.includes('already in a selection process')) {
        setErrors({ submit: 'No se pueden editar las etapas porque hay candidatos en proceso de selección activo.' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Cargando campaña...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-t-2xl shadow-xl p-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">Editar Campaña</h1>
                <p className="text-indigo-100">
                  Actualiza la información de tu oferta laboral
                </p>
              </div>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-200 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="bg-white shadow-xl px-8 py-6 border-b text-gray-900">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;

                return (
                    <React.Fragment key={step.number}>
                    <div className="flex flex-col items-center flex-1">
                      <div
                        onClick={() => handleStepClick(step.number as Step)}
                        title={step.title}
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-110'
                            : 'bg-gray-200 text-gray-400'
                          } ${!isActive ? 'cursor-pointer hover:scale-110' : ''}`}
                      >
                        {isCompleted ? (
                          <CheckIcon className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium text-center ${isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                          }`}
                      >
                        {step.title}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className="flex-1 h-1 mx-2 mb-8">
                        <div
                          className={`h-full rounded transition-all duration-300 ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white shadow-xl rounded-b-2xl p-8 text-gray-900">
            {/* Step 1: Información Básica */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <BriefcaseIcon className="w-7 h-7 text-indigo-600" />
                  Información Básica
                </h2>

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Título del Puesto *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title || ''}
                    onChange={handleInputChange}
                    placeholder="Ej: Desarrollador Full Stack Senior"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${errors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4" />
                    Ubicación Geográfica *
                  </label>
                  <LocationAutocomplete
                    value={formData.location || ''}
                    onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                    placeholder="Ej: Santiago, Región Metropolitana, Chile"
                    error={errors.location}
                    required
                  />
                </div>

                {/* Row of selects */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Work Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <BriefcaseIcon className="w-4 h-4" />
                      Tipo de Trabajo *
                    </label>
                    <select
                      name="workType"
                      value={formData.workType || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white ${errors.workType ? 'border-red-500' : 'border-gray-300'
                        }`}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="INTERNSHIP">Práctica</option>
                    </select>
                    {errors.workType && (
                      <p className="mt-1 text-sm text-red-600">{errors.workType}</p>
                    )}
                  </div>

                  {/* Modality */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <HomeIcon className="w-4 h-4" />
                      Modalidad *
                    </label>
                    <select
                      name="modality"
                      value={formData.modality || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white ${errors.modality ? 'border-red-500' : 'border-gray-300'
                        }`}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="REMOTE">Remoto</option>
                      <option value="HYBRID">Híbrido</option>
                      <option value="ON_SITE">Presencial</option>
                    </select>
                    {errors.modality && (
                      <p className="mt-1 text-sm text-red-600">{errors.modality}</p>
                    )}
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      Duración *
                    </label>
                    <select
                      name="duration"
                      value={formData.duration || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white ${errors.duration ? 'border-red-500' : 'border-gray-300'
                        }`}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="INDEFINITE">Indefinido</option>
                      <option value="FIXED_TERM">Plazo Fijo</option>
                      <option value="PROJECT">Proyecto</option>
                    </select>
                    {errors.duration && (
                      <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
                    )}
                  </div>
                </div>

                {/* Inclusion Position Checkbox */}
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="inclusionPosition"
                      checked={formData.inclusionPosition || false}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Puesto de Ley de Inclusión
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 2: Descripción y Requisitos */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <DocumentTextIcon className="w-7 h-7 text-purple-600" />
                  Descripción y Requisitos
                </h2>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descripción del Puesto *
                  </label>
                  <RichTextEditor
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
                    onMaximize={() => setDescriptionModalOpen(true)}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                {/* Requirements */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Requisitos y Habilidades *
                  </label>
                  <RichTextEditor
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
                    onMaximize={() => setRequirementsModalOpen(true)}
                  />
                  {errors.requirements && (
                    <p className="mt-1 text-sm text-red-600">{errors.requirements}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Condiciones y Salario */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <CurrencyDollarIcon className="w-7 h-7 text-green-600" />
                  Condiciones y Salario
                </h2>

                {/* Conditions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Condiciones y Beneficios *
                  </label>
                  <RichTextEditor
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
                    onMaximize={() => setConditionsModalOpen(true)}
                  />
                  {errors.conditions && (
                    <p className="mt-1 text-sm text-red-600">{errors.conditions}</p>
                  )}
                </div>

                {/* Salary Information */}
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                    Información Salarial
                  </h3>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Monto del Salario
                    </label>
                    <div className="flex gap-3">
                      {/* Currency Selector */}
                      <select
                        name="currency"
                        value={formData.currency || 'CLP'}
                        onChange={handleInputChange}
                        className="w-64 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white text-gray-900"
                      >
                        {CURRENCIES.map(currency => (
                          <option key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.code} - {currency.name}
                          </option>
                        ))}
                      </select>

                      {/* Salary Input with thousands separator */}
                      <input
                        type="text"
                        name="salary"
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
                        placeholder="Ej: 2.000.000"
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white text-gray-900"
                      />
                    </div>
                  </div>

                  {/* Show Salary Checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="showSalary"
                      checked={formData.showSalary || false}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Mostrar salario en la publicación pública
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 4: Etapas del Proceso */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <UserGroupIcon className="w-7 h-7 text-indigo-600" />
                  Etapas del Proceso
                </h2>

                <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-orange-700">
                        {candidateCount > 0
                          ? `Esta campaña tiene ${candidateCount} candidatos activos. No se pueden modificar las etapas.`
                          : 'Define las etapas por las que pasarán los candidatos. El orden es importante.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {(formData.stageTemplates || []).length === 0 && candidateCount === 0 ? (
                    <div className="py-8">
                      <div className="text-center mb-8">
                        <h3 className="text-lg font-medium text-gray-900">Comienza con una plantilla probada</h3>
                        <p className="text-gray-500 mt-1">Selecciona un flujo de trabajo predefinido o crea uno desde cero</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {STAGE_TEMPLATES.map((template) => {
                          const Icon = template.icon;
                          return (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => {
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
                              className="flex flex-col items-center p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left group"
                            >
                              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Icon className="w-6 h-6" />
                              </div>
                              <h4 className="font-bold text-gray-900 mb-2">{template.name}</h4>
                              <p className="text-sm text-gray-500 text-center mb-4">{template.description}</p>
                              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full group-hover:bg-indigo-100">
                                {template.stages.length} Etapas
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-white px-4 text-sm text-gray-500">O personaliza tu proceso</span>
                        </div>
                      </div>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={addStage}
                          className="inline-flex items-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all font-medium"
                        >
                          <PlusIcon className="w-5 h-5" />
                          Crear desde cero (Vacío)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {formData.stageTemplates?.map((stage, index) => (
                        <div key={index} className="bg-white border-2 border-gray-200 rounded-lg p-4 relative hover:border-indigo-300 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                                {index + 1}
                              </span>
                              <h3 className="font-semibold text-gray-800">
                                Etapa {index + 1}
                              </h3>
                            </div>
                            {candidateCount === 0 && (
                              <button
                                onClick={() => removeStage(index)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                title="Eliminar etapa"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre de la Etapa *
                              </label>
                              <input
                                type="text"
                                value={stage.name}
                                onChange={(e) => handleStageChange(index, 'name', e.target.value)}
                                disabled={candidateCount > 0}
                                className={`w-full px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-indigo-500 ${errors[`stage_${index}_name`] ? 'border-red-500' : 'border-gray-300'
                                  } ${candidateCount > 0 ? 'bg-gray-100' : ''}`}
                                placeholder="Ej: Entrevista Técnica"
                              />
                              {errors[`stage_${index}_name`] && (
                                <p className="mt-1 text-xs text-red-600">{errors[`stage_${index}_name`]}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Responsable *
                              </label>
                              <select
                                value={stage.responsibleId}
                                onChange={(e) => handleStageChange(index, 'responsibleId', e.target.value)}
                                disabled={candidateCount > 0}
                                className={`w-full px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${errors[`stage_${index}_responsible`] ? 'border-red-500' : 'border-gray-300'
                                  } ${candidateCount > 0 ? 'bg-gray-100' : ''}`}
                              >
                                <option value="">Seleccionar...</option>
                                {availableUsers.map(user => (
                                  <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                  </option>
                                ))}
                              </select>
                              {errors[`stage_${index}_responsible`] && (
                                <p className="mt-1 text-xs text-red-600">{errors[`stage_${index}_responsible`]}</p>
                              )}
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción (Opcional)
                              </label>
                              <input
                                type="text"
                                value={stage.description || ''}
                                onChange={(e) => handleStageChange(index, 'description', e.target.value)}
                                disabled={candidateCount > 0}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 ${candidateCount > 0 ? 'bg-gray-100' : ''}`}
                                placeholder="Breve descripción de qué consiste esta etapa..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {candidateCount === 0 && (
                        <button
                          type="button"
                          onClick={addStage}
                          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 font-medium"
                        >
                          <PlusIcon className="w-5 h-5" />
                          Agregar Nueva Etapa
                        </button>
                      )}
                    </>
                  )}
                </div>
                {errors.stages && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-center gap-2">
                    <span>⚠️</span> {errors.stages}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <CheckCircleIcon className="w-7 h-7 text-indigo-600" />
                  Revisar Información
                </h2>

                {/* Review Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 border-2 border-indigo-200">
                  {/* Basic Info */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-indigo-900 mb-3 pb-2 border-b-2 border-indigo-300">
                      Información Básica
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-semibold text-gray-700">Título:</span>
                        <p className="text-gray-900 mt-1">{formData.title}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-semibold text-gray-700 flex items-center gap-1">
                            <MapPinIcon className="w-4 h-4" />
                            Ubicación:
                          </span>
                          <p className="text-gray-900 mt-1">{formData.location}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700 flex items-center gap-1">
                            <BriefcaseIcon className="w-4 h-4" />
                            Tipo:
                          </span>
                          <p className="text-gray-900 mt-1">
                            {formData.workType === 'FULL_TIME' && 'Full Time'}
                            {formData.workType === 'PART_TIME' && 'Part Time'}
                            {formData.workType === 'INTERNSHIP' && 'Práctica'}
                            {!['FULL_TIME', 'PART_TIME', 'INTERNSHIP'].includes(formData.workType || '') && (formData.workType || 'No especificado')}
                          </p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700 flex items-center gap-1">
                            <HomeIcon className="w-4 h-4" />
                            Modalidad:
                          </span>
                          <p className="text-gray-900 mt-1">
                            {formData.modality === 'REMOTE' && 'Remoto'}
                            {formData.modality === 'HYBRID' && 'Híbrido'}
                            {formData.modality === 'ON_SITE' && 'Presencial'}
                            {!['REMOTE', 'HYBRID', 'ON_SITE'].includes(formData.modality || '') && (formData.modality || 'No especificado')}
                          </p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700 flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            Duración:
                          </span>
                          <p className="text-gray-900 mt-1">
                            {formData.duration === 'INDEFINITE' && 'Indefinido'}
                            {formData.duration === 'FIXED_TERM' && 'Plazo Fijo'}
                            {formData.duration === 'PROJECT' && 'Proyecto'}
                            {!['INDEFINITE', 'FIXED_TERM', 'PROJECT'].includes(formData.duration || '') && (formData.duration || 'No especificado')}
                          </p>
                        </div>
                      </div>
                      {formData.inclusionPosition && (
                        <div className="bg-indigo-100 border border-indigo-300 rounded-lg px-3 py-2 inline-block">
                          <span className="text-sm font-medium text-indigo-900">
                            Puesto de Ley de Inclusión
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-purple-900 mb-3 pb-2 border-b-2 border-purple-300">
                      Descripción del Puesto
                    </h3>
                    <div className="text-gray-800 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formData.description || '' }} />
                  </div>

                  {/* Requirements */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-purple-900 mb-3 pb-2 border-b-2 border-purple-300">
                      Requisitos y Habilidades
                    </h3>
                    <div className="text-gray-800 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formData.requirements || '' }} />
                  </div>

                  {/* Conditions */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-green-900 mb-3 pb-2 border-b-2 border-green-300">
                      Condiciones y Beneficios
                    </h3>
                    <div className="text-gray-800 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formData.conditions || '' }} />
                  </div>

                  {/* Stages Review */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-indigo-900 mb-3 pb-2 border-b-2 border-indigo-300">
                      Etapas del Proceso ({formData.stageTemplates?.length || 0})
                    </h3>
                    <div className="space-y-2">
                      {formData.stageTemplates?.map((stage, i) => (
                        <div key={i} className="flex items-center gap-2 text-gray-800">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </div>
                          <span className="font-medium">{stage.name}</span>
                          <span className="text-gray-500 text-sm">
                            ({availableUsers.find(u => u.id === stage.responsibleId)?.name || 'Responsable desconocido'})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Salary Info */}
                  {formData.salary && (
                    <div>
                      <h3 className="text-xl font-bold text-green-900 mb-3 pb-2 border-b-2 border-green-300 flex items-center gap-2">
                        <CurrencyDollarIcon className="w-5 h-5" />
                        Información Salarial
                      </h3>
                      <div className="space-y-2">
                        <p className="text-gray-800">
                          <span className="font-semibold">Salario:</span> {formData.currency} {formData.salary?.toLocaleString()}
                        </p>
                        <p className="text-gray-800">
                          <span className="font-semibold">Visible al público:</span>{' '}
                          {formData.showSalary ? 'Sí' : 'No'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {errors.submit && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-red-700 font-medium">{errors.submit}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gray-200">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${currentStep === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700 hover:shadow-lg'
                  }`}
              >
                <ArrowLeftIcon className="w-5 h-5" />
                Anterior
              </button>

              <div className="text-sm font-medium text-gray-600">
                Paso {currentStep} de {STEPS.length}
              </div>

              {currentStep < 5 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg transition-all duration-200"
                >
                  Siguiente
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitClick}
                  disabled={saving}
                  className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${saving
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:shadow-lg'
                    }`}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-5 h-5" />
                      Actualizar Campaña
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>

      {/* Fullscreen Editor Modals */}
      <FullScreenEditorModal
        isOpen={descriptionModalOpen}
        onClose={() => setDescriptionModalOpen(false)}
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
        title="Descripción del Puesto"
        placeholder="Describe las responsabilidades principales, el ambiente de trabajo, y qué hace especial esta oportunidad..."
      />

      <FullScreenEditorModal
        isOpen={requirementsModalOpen}
        onClose={() => setRequirementsModalOpen(false)}
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
        title="Requisitos y Habilidades"
        placeholder="Detalla la experiencia requerida, tecnologías, habilidades blandas, formación académica, etc..."
      />

      <FullScreenEditorModal
        isOpen={conditionsModalOpen}
        onClose={() => setConditionsModalOpen(false)}
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
        title="Condiciones y Beneficios"
        placeholder="Incluye información sobre beneficios, modalidad de trabajo, horarios, vacaciones, etc..."
      />
      {/* Modal de advertencia por edición con candidatos */}
      {showRescoreWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">¿Editar campaña con candidatos?</h3>
            </div>
            <p className="text-gray-600">
              Esta campaña tiene <strong>{candidateCount} candidatos</strong>. Al editar, los scores actuales se eliminarán
              y los candidatos quedarán marcados para reevaluación automática.
            </p>
            <p className="text-sm text-gray-500">
              Podrás reevaluarlos desde la vista de la campaña cuando quieras.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowRescoreWarning(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowRescoreWarning(false); handleSubmit(); }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Entendido, editar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default EditCampaign;
