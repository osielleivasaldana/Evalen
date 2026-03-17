import React, { useState, useEffect, useCallback } from 'react';
import { apiService, Candidate, CVData } from '../../services/api';
import Layout from '../layout/Layout';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  SparklesIcon,
  UserIcon,
  DocumentTextIcon,
  LightBulbIcon,
  GlobeAltIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon,
} from '@heroicons/react/24/solid';

interface CandidateDetailProps {
  candidateId: string;
  onBack: () => void;
}

// Type definitions for safe access
interface DatosContacto {
  nombre_completo?: string;
  email?: string;
  telefono?: string;
  ubicacion?: string;
}

interface TitularProfesional {
  titular?: string;
}

interface ResumenProfesional {
  resumen?: string;
}

interface HabilidadesTecnicas {
  skill: string;
  level: string;
  years_experience: number | null;
  metadata: any;
}

interface Idiomas {
  idioma: string;
  nivel: string;
  certificacion: string;
  metadata: any;
}

interface Habilidades {
  habilidades_tecnicas: HabilidadesTecnicas[];
  idiomas: Idiomas[];
  habilidades_blandas: any[];
  metadata?: any;
}

interface ExperienciaLaboral {
  cargo: string;
  empresa: string;
  periodo: {
    fecha_inicio: string;
    fecha_fin: string;
    texto_original: string;
    metadata: any;
  };
  responsabilidades: string[];
  ubicacion: string | null;
  metadata: any;
}

interface FormacionAcademica {
  titulo: string;
  institucion: string;
  periodo: {
    fecha_inicio: string | null;
    fecha_fin: string | null;
    texto_original: string;
    metadata: any;
  };
  gpa: string | null;
  ubicacion: string | null;
  metadata: any;
}

interface FormacionComplementaria {
  certificaciones_cursos: string[];
}

const CandidateDetail: React.FC<CandidateDetailProps> = ({ candidateId, onBack }) => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCandidateData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading candidate data for ID:', candidateId);

      const [candidateData, structuredData] = await Promise.all([
        apiService.getCandidate(candidateId),
        apiService.getCandidateStructuredData(candidateId)
      ]);

      console.log('Candidate data loaded:', candidateData);
      console.log('Structured CV data loaded:', structuredData);

      setCandidate(candidateData);
      setCvData(structuredData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos del candidato');
      console.error('Error loading candidate data:', err);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    loadCandidateData();
  }, [loadCandidateData]);

  const handleDownloadCV = async () => {
    if (!candidate?.documentId) return;

    try {
      const blob = await apiService.downloadDocument(candidate.documentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CV_${candidate.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message || 'Error al descargar el CV');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPeriod = (period: any) => {
    if (!period) return 'No especificado';

    const formatDateString = (dateStr: string) => {
      if (!dateStr) return 'N/A';
      if (dateStr.toLowerCase() === 'presente' || dateStr.toLowerCase() === 'actualidad') return 'Presente';

      // Handle YYYY-MM format manually to avoid Timezone issues (e.g. 2024-01 becomes Dec 31 in UTC-3)
      const yearMonthRegex = /^(\d{4})-(\d{2})$/;
      if (yearMonthRegex.test(dateStr)) {
        const [_, year, month] = dateStr.match(yearMonthRegex) || [];
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
      }

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr; // Return raw if invalid date (e.g. already formatted text)

      return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
    };

    const start = formatDateString(period.fecha_inicio);
    const end = formatDateString(period.fecha_fin || 'Presente');

    return `${start} - ${end}`;
  };

  // Helper functions for safe data access
  // Los datos pueden venir en cvData.datos_cv o cvData.structuredData.datos_cv
  const actualCvData = cvData?.datos_cv || (cvData as any)?.structuredData?.datos_cv || {};

  const getDatosContacto = (): DatosContacto => actualCvData?.datos_contacto || {};
  const getTitularProfesional = (): TitularProfesional => actualCvData?.titular_profesional || {};
  const getResumenProfesional = (): ResumenProfesional => actualCvData?.resumen_profesional || {};
  const getHabilidades = (): Habilidades => (actualCvData?.habilidades as Habilidades) || { habilidades_tecnicas: [], idiomas: [], habilidades_blandas: [] };
  const getExperienciaLaboral = (): ExperienciaLaboral[] => (actualCvData?.experiencia_laboral as ExperienciaLaboral[]) || [];
  const getFormacionAcademica = (): FormacionAcademica[] => (actualCvData?.formacion_academica as FormacionAcademica[]) || [];
  const getFormacionComplementaria = (): FormacionComplementaria => actualCvData?.formacion_complementaria || { certificaciones_cursos: [] };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
            <p className="text-xl text-gray-700 font-medium">Cargando CV del candidato...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Error al cargar el CV
              </h1>
              <p className="text-gray-600 mb-6">
                {error}
              </p>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                Volver
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Verificar si tenemos datos válidos del CV
  const hasValidCvData = actualCvData && Object.keys(actualCvData).length > 0;

  if (!candidate || !cvData || !hasValidCvData) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                CV no disponible
              </h1>
              <p className="text-gray-600 mb-6">
                El CV de este candidato aún no ha sido procesado o no está disponible.
              </p>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                Volver
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const confidencePercentage = ((cvData?.confianza_general || (cvData as any)?.structuredData?.confianza_general || 0) * 100).toFixed(1);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Left side - Back button and name */}
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 backdrop-blur-sm"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Volver
                </button>
                <div>
                  <h1 className="text-3xl font-bold mb-1">
                    {candidate.name}
                  </h1>
                  <p className="text-white/90 text-sm">
                    Aplicado el {formatDate(candidate.createdAt)}
                  </p>
                </div>
              </div>

              {/* Right side - Actions and confidence */}
              <div className="flex items-center gap-3">
                {candidate.documentId && (
                  <button
                    onClick={handleDownloadCV}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 backdrop-blur-sm"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Descargar PDF
                  </button>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column - 1/3 width */}
            <div className="lg:col-span-1 space-y-6">

              {/* Candidate Scoring - PRIORITY */}
              {candidate.scoring && (
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <SparklesIcon className="h-6 w-6" />
                      Análisis de Compatibilidad
                    </h2>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Overall Score - Large Display */}
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-32 h-32 rounded-full mb-4" style={{
                        background: `conic-gradient(${candidate.scoring.overallScore >= 90 ? '#10b981' :
                          candidate.scoring.overallScore >= 70 ? '#f59e0b' :
                            '#ef4444'
                          } ${candidate.scoring.overallScore * 3.6}deg, #e5e7eb 0deg)`
                      }}>
                        <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center">
                          <div className="text-center">
                            <div className={`text-4xl font-bold ${candidate.scoring.overallScore >= 90 ? 'text-green-700' :
                              candidate.scoring.overallScore >= 70 ? 'text-orange-700' :
                                'text-red-700'
                              }`}>
                              {Math.round(candidate.scoring.overallScore)}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">de 100</div>
                          </div>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-gray-900 mb-2">
                        {(() => {
                          const rec = candidate.scoring.recommendation?.toLowerCase() || '';
                          const translations: Record<string, string> = {
                            'high_fit': 'Alta Compatibilidad',
                            'moderate_fit': 'Compatibilidad Moderada',
                            'low_fit': 'Baja Compatibilidad',
                            'no_fit': 'Sin Compatibilidad',
                            'perfect_fit': 'Compatibilidad Perfecta'
                          };
                          return translations[rec] || rec.replace(/_/g, ' ');
                        })()}
                      </p>
                      {candidate.scoring.summary && (
                        <p className="text-sm text-gray-600 leading-relaxed text-left mt-4">
                          {candidate.scoring.summary}
                        </p>
                      )}
                    </div>

                    {/* Breakdown Scores */}
                    {candidate.scoring.breakdown && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">Desglose de Evaluación</h3>
                        {Object.entries(candidate.scoring.breakdown as Record<string, any>).map(([key, value]) => {
                          const translations: Record<string, string> = {
                            'education': 'Educación',
                            'experience': 'Experiencia',
                            'skills': 'Habilidades Técnicas',
                            'soft_skills': 'Habilidades Blandas',
                            'languages': 'Idiomas',
                            'projects': 'Proyectos',
                            'certifications': 'Certificaciones'
                          };
                          const translatedKey = translations[key.toLowerCase()] || key.replace(/_/g, ' ');

                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-gray-700 capitalize">
                                  {translatedKey}
                                </span>
                                <span className="text-xs font-bold text-gray-900">{value.score}/100</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${value.score >= 90 ? 'bg-green-500' :
                                    value.score >= 70 ? 'bg-orange-500' :
                                      'bg-red-500'
                                    }`}
                                  style={{ width: `${value.score}%` }}
                                />
                              </div>
                              {value.reasoning && (
                                <p className="text-xs text-gray-600 mt-1">{value.reasoning}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Strengths */}
                    {candidate.scoring.strengths && Array.isArray(candidate.scoring.strengths) && candidate.scoring.strengths.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <CheckBadgeIcon className="w-5 h-5 text-green-600" />
                          Fortalezas
                        </h3>
                        <ul className="space-y-2">
                          {candidate.scoring.strengths.map((strength: string, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Gaps */}
                    {candidate.scoring.gaps && Array.isArray(candidate.scoring.gaps) && candidate.scoring.gaps.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <ExclamationCircleIcon className="w-5 h-5 text-orange-600" />
                          Áreas de Mejora
                        </h3>
                        <ul className="space-y-2">
                          {candidate.scoring.gaps.map((gap: string, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                              <span>{gap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <EnvelopeIcon className="h-6 w-6" />
                    Contacto
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <UserIcon className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Nombre</p>
                      <p className="text-gray-900 font-medium">{getDatosContacto().nombre_completo || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <EnvelopeIcon className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-900 font-medium break-all">{getDatosContacto().email || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <PhoneIcon className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Teléfono</p>
                      <p className="text-gray-900 font-medium">{getDatosContacto().telefono || 'No especificado'}</p>
                    </div>
                  </div>
                  {getDatosContacto().ubicacion && (
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Ubicación</p>
                        <p className="text-gray-900 font-medium">{getDatosContacto().ubicacion}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Title */}
              {getTitularProfesional().titular && (
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <SparklesIcon className="h-6 w-6" />
                      Título Profesional
                    </h2>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-900 font-semibold text-lg">
                      {getTitularProfesional().titular}
                    </p>
                  </div>
                </div>
              )}

              {/* Professional Summary */}
              {getResumenProfesional().resumen && (
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <DocumentTextIcon className="h-6 w-6" />
                      Resumen Profesional
                    </h2>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {getResumenProfesional().resumen}
                    </p>
                  </div>
                </div>
              )}

              {/* Skills */}
              <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <LightBulbIcon className="h-6 w-6" />
                    Habilidades
                  </h2>
                </div>
                <div className="p-6 space-y-6">
                  {/* Technical Skills */}
                  {getHabilidades().habilidades_tecnicas.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <CheckBadgeIcon className="h-5 w-5 text-green-600" />
                        Habilidades Técnicas
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {getHabilidades().habilidades_tecnicas.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-200"
                          >
                            {skill.skill} {skill.level && `(${skill.level})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {getHabilidades().idiomas.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <GlobeAltIcon className="h-5 w-5 text-green-600" />
                        Idiomas
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {getHabilidades().idiomas.map((lang, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 rounded-full text-sm font-medium border border-purple-200"
                          >
                            {lang.idioma} ({lang.nivel})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">

              {/* Work Experience */}
              <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <BriefcaseIcon className="h-6 w-6" />
                    Experiencia Laboral
                  </h2>
                </div>
                <div className="p-6">
                  {getExperienciaLaboral().length === 0 ? (
                    <p className="text-gray-500 italic">
                      No se encontró experiencia laboral registrada
                    </p>
                  ) : (
                    <div className="relative border-l-2 border-blue-200 ml-3 space-y-8">
                      {getExperienciaLaboral().map((exp, idx) => (
                        <div key={idx} className="relative pl-8 pb-8 last:pb-0">
                          {/* Timeline dot */}
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white"></div>

                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                              {exp.cargo}
                            </h3>
                            <h4 className="text-lg font-semibold text-blue-600 mb-2">
                              {exp.empresa}
                            </h4>
                            <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                              <span className="font-medium">{formatPeriod(exp.periodo)}</span>
                              {exp.ubicacion && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="flex items-center gap-1">
                                    <MapPinIcon className="h-4 w-4" />
                                    {exp.ubicacion}
                                  </span>
                                </>
                              )}
                            </p>
                            {exp.responsabilidades && exp.responsabilidades.length > 0 && (
                              <ul className="space-y-2">
                                {exp.responsabilidades.map((resp, respIdx) => (
                                  <li key={respIdx} className="flex items-start gap-2 text-gray-700">
                                    <span className="text-blue-500 mt-1.5 flex-shrink-0">•</span>
                                    <span>{resp}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Education */}
              <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <AcademicCapIcon className="h-6 w-6" />
                    Formación Académica
                  </h2>
                </div>
                <div className="p-6">
                  {getFormacionAcademica().length === 0 ? (
                    <p className="text-gray-500 italic">
                      No se encontró formación académica registrada
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {getFormacionAcademica().map((edu, idx) => (
                        <div
                          key={idx}
                          className="pb-6 border-b border-gray-200 last:border-b-0 last:pb-0"
                        >
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {edu.titulo}
                          </h3>
                          <h4 className="text-md font-semibold text-orange-600 mb-2">
                            {edu.institucion}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <span className="font-medium">{formatPeriod(edu.periodo)}</span>
                            {edu.ubicacion && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="flex items-center gap-1">
                                  <MapPinIcon className="h-4 w-4" />
                                  {edu.ubicacion}
                                </span>
                              </>
                            )}
                            {edu.gpa && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span>GPA: {edu.gpa}</span>
                              </>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Certifications */}
              {getFormacionComplementaria().certificaciones_cursos.length > 0 && (
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <CheckBadgeIcon className="h-6 w-6" />
                      Certificaciones y Cursos
                    </h2>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      {getFormacionComplementaria().certificaciones_cursos.map((cert, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-gray-700">
                          <CheckCircleIcon className="h-5 w-5 text-teal-500 mt-0.5 flex-shrink-0" />
                          <span>{cert}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CandidateDetail;
