import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import Layout from '../layout/Layout';
import { apiService, ProcessInstance, StageInstance, Campaign, Candidate } from '../../services/api';

const CandidateProcessPanel: React.FC = () => {
  const { campaignId, candidateId } = useParams<{ campaignId: string; candidateId: string }>();
  const navigate = useNavigate();

  const [process, setProcess] = useState<ProcessInstance | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<StageInstance | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decision, setDecision] = useState<'ACCEPTED' | 'REJECTED' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, [campaignId, candidateId]);

  const loadCurrentUser = async () => {
    try {
      const user = await apiService.getProfile();
      setCurrentUserId(user.id);
    } catch (err) {
      console.error('Error loading current user:', err);
    }
  };

  const loadData = async () => {
    if (!campaignId || !candidateId) return;

    try {
      setLoading(true);
      setError(null);

      const [processData, campaignData, candidateData] = await Promise.all([
        apiService.getProcess(campaignId, candidateId),
        apiService.getCampaign(campaignId),
        apiService.getCandidate(candidateId)
      ]);

      setProcess(processData);
      setCampaign(campaignData);
      setCandidate(candidateData);

      // Seleccionar la etapa activa por defecto
      const activeStage = processData.stageInstances.find(s => s.status === 'ACTIVE');
      if (activeStage) {
        setSelectedStage(activeStage);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el proceso');
      console.error('Error loading process:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageDecision = async () => {
    if (!selectedStage || !decision || !feedback.trim()) {
      setError('Por favor completa todos los campos');
      return;
    }

    try {
      setSubmitting(true);
      await apiService.updateStageDecision(selectedStage.id, {
        decision,
        feedback
      });

      setShowDecisionModal(false);
      setDecision(null);
      setFeedback('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la decisión');
    } finally {
      setSubmitting(false);
    }
  };

  const canDecideStage = (stage: StageInstance): boolean => {
    if (!currentUserId) return false;
    if (stage.status !== 'ACTIVE') return false;
    // El responsable de la etapa o un admin puede decidir
    return stage.responsible.id === currentUserId;
  };

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'PENDING':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircleIconSolid className="w-8 h-8 text-green-600" />;
      case 'REJECTED':
        return <XCircleIcon className="w-8 h-8 text-red-600" />;
      case 'ACTIVE':
        return <ClockIcon className="w-8 h-8 text-blue-600" />;
      case 'PENDING':
        return <div className="w-8 h-8 rounded-full border-4 border-gray-300" />;
      default:
        return <div className="w-8 h-8 rounded-full border-4 border-gray-300" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Layout showNavBar={true} showFooter={true}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <p className="text-lg text-gray-600">Cargando proceso...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !process) {
    return (
      <Layout showNavBar={true} showFooter={true}>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg">
            <p className="font-medium">{error}</p>
          </div>
          <button
            onClick={() => navigate(`/campaigns/${campaignId}/candidates`)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Volver a candidatos
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNavBar={true} showFooter={true}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(`/campaigns/${campaignId}/candidates`)}
              className="p-2.5 rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-gray-50 transition-all"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Proceso de Selección
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {candidate?.name} • {campaign?.title}
              </p>
            </div>
          </div>

          {/* Candidate Status Banner */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">Estado del Candidato</p>
                <p className="text-2xl font-bold">
                  {candidate?.candidateStatus === 'IN_PROCESS' && '🔄 En Proceso'}
                  {candidate?.candidateStatus === 'SELECTED' && '✅ Seleccionado'}
                  {candidate?.candidateStatus === 'NOT_SELECTED' && '❌ No Seleccionado'}
                  {candidate?.candidateStatus === 'NEW' && '🆕 Nuevo'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90 mb-1">Fecha de Inicio</p>
                <p className="text-lg font-semibold">{formatDate(process?.startDate)}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline de Etapas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Etapas del Proceso</h2>

              <div className="space-y-4">
                {process?.stageInstances.map((stage, index) => (
                  <div
                    key={stage.id}
                    onClick={() => setSelectedStage(stage)}
                    className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
                      selectedStage?.id === stage.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">{getStageIcon(stage.status)}</div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">
                            Etapa {index + 1}: {stage.stageTemplate.name}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full border ${getStageStatusColor(
                              stage.status
                            )}`}
                          >
                            {stage.status === 'ACCEPTED' && 'Aprobada'}
                            {stage.status === 'REJECTED' && 'Rechazada'}
                            {stage.status === 'ACTIVE' && 'Activa'}
                            {stage.status === 'PENDING' && 'Pendiente'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {stage.stageTemplate.description || 'Sin descripción'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <UserIcon className="w-4 h-4" />
                          <span>Responsable: {stage.responsible?.name || 'No asignado'}</span>
                        </div>
                      </div>

                      {/* Decision Info */}
                      {stage.decision && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-500">Decidido el</p>
                          <p className="text-sm font-medium text-gray-700">
                            {formatDate(stage.decidedAt)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Feedback */}
                    {stage.feedback && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-start gap-2">
                          <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-700 mb-1">
                              Retroalimentación:
                            </p>
                            <p className="text-sm text-gray-600">{stage.feedback}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel de Acciones */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Detalles de la Etapa</h3>

              {selectedStage ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Etapa</p>
                    <p className="text-base font-bold text-gray-900">
                      {selectedStage.stageTemplate.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Descripción</p>
                    <p className="text-sm text-gray-600">
                      {selectedStage.stageTemplate.description || 'Sin descripción'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Responsable</p>
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <p className="text-sm text-gray-900">
                        {selectedStage.responsible?.name || 'No asignado'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Estado</p>
                    <span
                      className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${getStageStatusColor(
                        selectedStage.status
                      )}`}
                    >
                      {selectedStage.status === 'ACCEPTED' && 'Aprobada'}
                      {selectedStage.status === 'REJECTED' && 'Rechazada'}
                      {selectedStage.status === 'ACTIVE' && 'Activa'}
                      {selectedStage.status === 'PENDING' && 'Pendiente'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  {canDecideStage(selectedStage) && (
                    <div className="pt-4 border-t border-gray-200 space-y-2">
                      <button
                        onClick={() => {
                          setDecision('ACCEPTED');
                          setShowDecisionModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold shadow-md hover:shadow-lg transition-all"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                        Aprobar Etapa
                      </button>
                      <button
                        onClick={() => {
                          setDecision('REJECTED');
                          setShowDecisionModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-md hover:shadow-lg transition-all"
                      >
                        <XCircleIcon className="w-5 h-5" />
                        Rechazar Etapa
                      </button>
                    </div>
                  )}

                  {selectedStage.status === 'PENDING' && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500 text-center">
                        Esta etapa está pendiente. Completa las etapas anteriores primero.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  Selecciona una etapa para ver los detalles
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Decision Modal */}
        {showDecisionModal && selectedStage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                {decision === 'ACCEPTED' ? (
                  <>
                    <CheckCircleIcon className="w-7 h-7 text-green-600" />
                    Aprobar Etapa
                  </>
                ) : (
                  <>
                    <XCircleIcon className="w-7 h-7 text-red-600" />
                    Rechazar Etapa
                  </>
                )}
              </h3>

              <div
                className={`border-2 rounded-lg p-4 mb-6 ${
                  decision === 'ACCEPTED'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Etapa: {selectedStage.stageTemplate.name}
                </p>
                <p className="text-sm text-gray-700">
                  {decision === 'ACCEPTED'
                    ? 'El candidato avanzará a la siguiente etapa del proceso.'
                    : 'El candidato será marcado como NO SELECCIONADO y el proceso terminará.'}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retroalimentación {decision === 'REJECTED' && '*'}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Escribe tu retroalimentación aquí..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                {decision === 'REJECTED' && (
                  <p className="text-xs text-gray-500 mt-1">
                    * La retroalimentación es obligatoria al rechazar una etapa
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDecisionModal(false);
                    setDecision(null);
                    setFeedback('');
                  }}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStageDecision}
                  disabled={submitting || !feedback.trim()}
                  className={`flex-1 px-4 py-3 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    decision === 'ACCEPTED'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CandidateProcessPanel;
