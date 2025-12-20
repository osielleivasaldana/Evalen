import React, { useState, useEffect, useCallback } from 'react';
import {
  BriefcaseIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { apiService, Campaign, UploadDocumentRequest } from '../../services/api';
import { unescapeHtml } from '../../utils/htmlUtils';

interface PublicCampaignProps {
  publicId: string;
}

type FormStep = 1 | 2 | 3;

const PublicCampaign: React.FC<PublicCampaignProps> = ({ publicId }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [candidateInfo, setCandidateInfo] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadCampaign = useCallback(async () => {
    try {
      setLoading(true);
      const campaignData = await apiService.getPublicCampaign(publicId);
      setCampaign(campaignData);
    } catch (err: any) {
      setError(err.message || 'Campaña no encontrada');
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    if (campaign) {
      console.log('Raw campaign description:', campaign.description);
      console.log('Unescaped description:', unescapeHtml(campaign.description));
    }
  }, [campaign]);

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!candidateInfo.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!candidateInfo.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateInfo.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!candidateInfo.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedFile) {
      newErrors.file = 'Debes subir tu CV';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      setErrors({});
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      setErrors({});
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as FormStep);
      setErrors({});
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrors({ file: 'Por favor seleccione un archivo PDF o Word (.doc, .docx)' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors({ file: 'El archivo no puede ser mayor a 10MB' });
      return;
    }

    setSelectedFile(file);
    setErrors({});
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !candidateInfo.name || !candidateInfo.email || !candidateInfo.phone) {
      setError('Por favor complete todos los campos');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadData: UploadDocumentRequest = {
        file: selectedFile,
        campaignPublicId: publicId,
        candidateName: candidateInfo.name,
        candidateEmail: candidateInfo.email,
        candidatePhone: candidateInfo.phone
      };

      await apiService.uploadDocument(uploadData);
      setUploadSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar la aplicación');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCandidateInfo(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getWorkTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'FULL_TIME': 'Full Time',
      'PART_TIME': 'Part Time',
      'INTERNSHIP': 'Práctica'
    };
    return types[type] || type;
  };

  const getModalityLabel = (modality: string) => {
    const modalities: Record<string, string> = {
      'REMOTE': 'Remoto',
      'HYBRID': 'Híbrido',
      'ON_SITE': 'Presencial'
    };
    return modalities[modality] || modality;
  };

  const getDurationLabel = (duration: string) => {
    const durations: Record<string, string> = {
      'INDEFINITE': 'Indefinido',
      'FIXED_TERM': 'Plazo Fijo',
      'PROJECT': 'Proyecto'
    };
    return durations[duration] || duration;
  };



  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando campaña...</p>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-6">😞</div>
          <h1 className="text-3xl font-bold text-red-600 mb-4">
            Campaña no encontrada
          </h1>
          <p className="text-gray-600 text-lg">
            La campaña que buscas no existe o ha sido cerrada.
          </p>
        </div>
      </div>
    );
  }

  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center relative overflow-hidden">
            {/* Confetti effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
              <div className="absolute top-10 right-1/4 w-2 h-2 bg-pink-400 rounded-full animate-ping delay-100"></div>
              <div className="absolute top-20 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-200"></div>
            </div>

            {/* Success Icon */}
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <CheckCircleIconSolid className="w-14 h-14 text-white" />
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              ¡Postulación Exitosa! 🎉
            </h1>

            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Gracias por tu interés en <span className="font-semibold text-indigo-600">{campaign?.title}</span>.
              <br />Tu currículum ha sido recibido y está siendo procesado.
            </p>

            {/* Timeline */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-8 border border-indigo-100">
              <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center justify-center gap-2">
                <CalendarIcon className="w-6 h-6" />
                ¿Qué sigue ahora?
              </h3>
              <div className="space-y-3 text-left max-w-md mx-auto">
                <div className="flex items-start gap-3">
                  <CheckCircleIconSolid className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">Tu CV ha sido procesado automáticamente</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-300 flex-shrink-0 mt-0.5"></div>
                  <p className="text-sm text-gray-700">Nuestro equipo revisará tu perfil (1-2 días)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-300 flex-shrink-0 mt-0.5"></div>
                  <p className="text-sm text-gray-700">Si encajas, te contactaremos (3-5 días)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-300 flex-shrink-0 mt-0.5"></div>
                  <p className="text-sm text-gray-700">Proceso de entrevistas</p>
                </div>
              </div>
            </div>

            {/* Email confirmation */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600">
                Recibirás una confirmación por email en
              </p>
              <p className="text-base font-semibold text-gray-900">{candidateInfo.email}</p>
            </div>

            {/* Social sharing */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">¿Conoces a alguien que pueda estar interesado?</p>
              <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                Compartir esta oferta →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -ml-32 -mb-32"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          {/* Logo/Brand */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 backdrop-blur-md px-4 py-2 rounded-full">
              <BriefcaseIcon className="w-5 h-5" />
              <span className="font-semibold">Evalen</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
            {campaign?.title}
          </h1>

          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl">
            Únete a nuestro equipo - El proceso es rápido y sencillo
          </p>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-4 mb-8">
            {campaign?.location && (
              <div className="flex items-center gap-2 bg-white bg-opacity-20 backdrop-blur-md px-4 py-2 rounded-full">
                <MapPinIcon className="w-5 h-5" />
                <span className="font-medium">{campaign.location}</span>
              </div>
            )}
            {campaign?.workType && (
              <div className="flex items-center gap-2 bg-white bg-opacity-20 backdrop-blur-md px-4 py-2 rounded-full">
                <ClockIcon className="w-5 h-5" />
                <span className="font-medium">{getWorkTypeLabel(campaign.workType)}</span>
              </div>
            )}
            {campaign?.modality && (
              <div className="flex items-center gap-2 bg-white bg-opacity-20 backdrop-blur-md px-4 py-2 rounded-full">
                <UserGroupIcon className="w-5 h-5" />
                <span className="font-medium">{getModalityLabel(campaign.modality)}</span>
              </div>
            )}
            {campaign?.showSalary && campaign?.salary && (
              <div className="flex items-center gap-2 bg-green-500 bg-opacity-90 px-4 py-2 rounded-full">
                <CurrencyDollarIcon className="w-5 h-5" />
                <span className="font-bold">
                  {campaign.currency === 'CLP' ? `$${campaign.salary.toLocaleString('es-CL')}` :
                    campaign.currency === 'USD' ? `$${campaign.salary.toLocaleString('en-US')}` :
                      `${campaign.salary} ${campaign.currency}`}
                </span>
              </div>
            )}
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5" />
              <span>Proceso 100% seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5" />
              <span>Respuesta en 5 días</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              <span>2 minutos para aplicar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Description */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <BriefcaseIcon className="w-6 h-6 text-indigo-600" />
                </div>
                Descripción del Puesto
              </h2>
              <div
                className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: unescapeHtml(campaign?.description || '') }}
              />
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                Requisitos
              </h2>
              <div
                className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: unescapeHtml(campaign?.requirements || '') }}
              />
            </div>

            {/* Benefits */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <CurrencyDollarIcon className="w-6 h-6 text-yellow-600" />
                </div>
                Beneficios y Condiciones
              </h2>
              <div
                className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: unescapeHtml(campaign?.conditions || '') }}
              />
            </div>
          </div>

          {/* Right Column - Application Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Form Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                  <h2 className="text-2xl font-bold mb-2">Aplica Ahora</h2>
                  <p className="text-sm opacity-90">Solo toma 2 minutos</p>
                </div>

                {/* Progress Steps */}
                <div className="px-6 pt-6">
                  <div className="flex items-center justify-between mb-6">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= step
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                          }`}>
                          {step}
                        </div>
                        {step < 3 && (
                          <div className={`w-12 h-1 mx-2 ${currentStep > step ? 'bg-indigo-600' : 'bg-gray-200'
                            }`}></div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-sm text-gray-600 mb-6">
                    {currentStep === 1 && 'Paso 1: Información Personal'}
                    {currentStep === 2 && 'Paso 2: Sube tu CV'}
                    {currentStep === 3 && 'Paso 3: Confirmar y Enviar'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="px-6 pb-6">
                  {/* Step 1: Personal Info */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={candidateInfo.name}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          placeholder="Juan Pérez"
                        />
                        {errors.name && (
                          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email *
                        </label>
                        <div className="relative">
                          <EnvelopeIcon className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            name="email"
                            value={candidateInfo.email}
                            onChange={handleInputChange}
                            className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                            placeholder="juan@email.com"
                          />
                        </div>
                        {errors.email && (
                          <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Teléfono *
                        </label>
                        <div className="relative">
                          <PhoneIcon className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                          <input
                            type="tel"
                            name="phone"
                            value={candidateInfo.phone}
                            onChange={handleInputChange}
                            className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                            placeholder="+56 9 1234 5678"
                          />
                        </div>
                        {errors.phone && (
                          <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          LinkedIn (Opcional)
                        </label>
                        <input
                          type="url"
                          name="linkedin"
                          value={candidateInfo.linkedin}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                          placeholder="linkedin.com/in/tu-perfil"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        Continuar
                        <ArrowRightIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* Step 2: Upload CV */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Sube tu Currículum *
                        </label>

                        <div
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => document.getElementById('fileInput')?.click()}
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragActive
                            ? 'border-indigo-500 bg-indigo-50'
                            : errors.file
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                            }`}
                        >
                          <input
                            id="fileInput"
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                          />

                          {!selectedFile ? (
                            <div>
                              <DocumentArrowUpIcon className="w-16 h-16 mx-auto mb-4 text-indigo-500" />
                              <p className="text-base font-semibold text-gray-700 mb-2">
                                Arrastra tu CV aquí
                              </p>
                              <p className="text-sm text-gray-500">
                                o haz clic para seleccionar
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                PDF, DOC, DOCX (máx. 10MB)
                              </p>
                            </div>
                          ) : (
                            <div>
                              <CheckCircleIconSolid className="w-16 h-16 mx-auto mb-4 text-green-500" />
                              <p className="text-base font-semibold text-gray-700 mb-1">
                                {selectedFile.name}
                              </p>
                              <p className="text-sm text-gray-500 mb-3">
                                {formatFileSize(selectedFile.size)}
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFile(null);
                                }}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                              >
                                Remover archivo
                              </button>
                            </div>
                          )}
                        </div>
                        {errors.file && (
                          <p className="text-red-500 text-xs mt-1">{errors.file}</p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-bold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                        >
                          <ArrowLeftIcon className="w-5 h-5" />
                          Atrás
                        </button>
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                        >
                          Continuar
                          <ArrowRightIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Review & Submit */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-bold text-gray-900 mb-4">Revisa tu información:</h3>

                        <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-6">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Nombre:</span>
                            <span className="font-semibold text-gray-900">{candidateInfo.name}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-semibold text-gray-900">{candidateInfo.email}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Teléfono:</span>
                            <span className="font-semibold text-gray-900">{candidateInfo.phone}</span>
                          </div>
                          {candidateInfo.linkedin && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">LinkedIn:</span>
                              <span className="font-semibold text-gray-900 truncate ml-2">{candidateInfo.linkedin}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm pt-3 border-t border-gray-200">
                            <span className="text-gray-600">CV:</span>
                            <span className="font-semibold text-gray-900">{selectedFile?.name}</span>
                          </div>
                        </div>

                        {/* Privacy Notice */}
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                          <p className="text-xs text-indigo-900 leading-relaxed">
                            <ShieldCheckIcon className="w-4 h-4 inline mr-1" />
                            Al enviar esta aplicación, aceptas que procesemos tus datos personales de acuerdo con nuestra política de privacidad.
                            Tus datos están seguros y encriptados.
                          </p>
                        </div>
                      </div>

                      {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                          <XMarkIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          disabled={uploading}
                          className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-bold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <ArrowLeftIcon className="w-5 h-5" />
                          Atrás
                        </button>
                        <button
                          type="submit"
                          disabled={uploading}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              Enviando...
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="w-5 h-5" />
                              Enviar Aplicación
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Trust Indicators Below Form */}
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                    <span>Datos seguros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-indigo-600" />
                    <span>Proceso rápido</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicCampaign;
