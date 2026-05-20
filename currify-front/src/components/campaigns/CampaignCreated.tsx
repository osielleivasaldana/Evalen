import React, { useState, useEffect } from 'react';
import { apiService, Campaign } from '../../services/api';
import Layout from '../layout/Layout';
import {
  LinkIcon,
  CheckIcon,
  EnvelopeIcon,
  EyeIcon,
  ShareIcon,
  CalendarDaysIcon,
  HashtagIcon,
  UsersIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';

interface CampaignCreatedProps {
  campaign: Campaign;
  onGoToDashboard: () => void;
  onManageCandidates: () => void;
}

const CampaignCreated: React.FC<CampaignCreatedProps> = ({
  campaign,
  onGoToDashboard,
  onManageCandidates
}) => {
  const [copied, setCopied] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [status, setStatus] = useState(campaign.status);
  const [isActivating, setIsActivating] = useState(false);

  const publicUrl = `${window.location.origin}/apply/${campaign.publicId}`;

  useEffect(() => {
    setTimeout(() => setShowAnimation(true), 50);
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = publicUrl;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy text: ', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Oportunidad Laboral: ${campaign.title}`);
    const body = encodeURIComponent(`Hola,\n\nTe compartimos una oportunidad laboral que puede interesarte:\n\n📋 Puesto: ${campaign.title}\n\nPara aplicar, sube tu currículum vitae en el siguiente enlace:\n${publicUrl}\n\n¡Esperamos tu aplicación!\n\nSaludos,\nEl equipo de reclutamiento`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaLinkedIn = () => {
    const text = encodeURIComponent(`¡Nueva oportunidad laboral! ${campaign.title} - Aplica aquí:`);
    const url = encodeURIComponent(publicUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&text=${text}`);
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(`🚀 *Nueva Oportunidad Laboral*\n\n📋 *Puesto:* ${campaign.title}\n\nPara más detalles y aplicar, visita:\n${publicUrl}`);
    window.open(`https://wa.me/?text=${message}`);
  };

  const handleActivateCampaign = async () => {
    setIsActivating(true);
    try {
      const updatedCampaign = await apiService.updateCampaign(campaign.id, { status: 'ACTIVE' });
      setStatus(updatedCampaign.status);
    } catch (err) {
      console.error('Failed to activate campaign:', err);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
        <div className={`max-w-4xl mx-auto space-y-8 transition-all duration-700 transform ${showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          
          {/* Celebratory Header Card */}
          <div className="text-center py-6">
            <div className="relative inline-flex mb-4">
              {/* Soft pulsing glow behind */}
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative w-20 h-20 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100">
                <CheckIcon className="w-10 h-10 text-white stroke-[3] animate-scale-up" />
              </div>
              <div className="absolute -top-1 -right-1 animate-bounce">
                <SparklesIcon className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
              ¡Campaña Creada Exitosamente!
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              La campaña para <span className="font-semibold text-indigo-600">{campaign.title}</span> ya está en línea y lista para recibir postulaciones.
            </p>
          </div>

          {/* Core URL & Sharing Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-slate-100/50 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <LinkIcon className="w-6 h-6 text-indigo-600" />
              Enlace de Postulación
            </h2>

            {/* Custom URL copy block */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="flex-1 relative flex items-center bg-slate-50 hover:bg-slate-100/70 border border-gray-200 rounded-xl p-1.5 transition-all">
                <span className="pl-3 text-slate-400 flex items-center gap-1.5 select-none font-semibold text-xs tracking-wider uppercase">
                  URL:
                </span>
                <input
                  type="text"
                  value={publicUrl}
                  readOnly
                  className="flex-1 min-w-0 bg-transparent border-0 px-3 py-2 text-gray-800 text-sm font-mono focus:ring-0 focus:outline-none"
                />
              </div>
              
              <button
                onClick={copyToClipboard}
                className={`px-6 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:scale-[1.02] ${
                  copied
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                }`}
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-4 h-4 stroke-[3]" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>
            </div>

            {/* Campaign Pause Warning / Play button */}
            {status !== 'ACTIVE' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-scale-up">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-700">
                    <PauseIcon className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">Campaña Pausada</h4>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                      El enlace público está desactivado temporalmente. Activa la campaña para permitir postulaciones.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleActivateCampaign}
                  disabled={isActivating}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-100 hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                >
                  {isActivating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <PlayIcon className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>Iniciar Campaña</span>
                </button>
              </div>
            ) : (
              /* Micro guide message */
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100/40 mb-6">
                <p className="text-sm text-indigo-950 flex items-start gap-2.5">
                  <SparklesIcon className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Tip de selección:</strong> Publica este enlace en tus portales de empleo habituales, redes sociales o envíalo directamente a los postulantes. Los currículums cargados aquí serán analizados automáticamente por nuestra IA.
                  </span>
                </p>
              </div>
            )}

            {/* Sharing Platform Grid */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Compartir en Redes</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={shareViaEmail}
                  className="px-4 py-3 bg-rose-50 hover:bg-rose-100/70 text-rose-700 border border-rose-100 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02]"
                >
                  <EnvelopeIcon className="w-5 h-5" />
                  Email
                </button>

                <button
                  onClick={shareViaLinkedIn}
                  className="px-4 py-3 bg-[#e8f3f9] hover:bg-[#d8ecf6] text-[#0077b5] border border-[#d8ecf6] rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02]"
                >
                  <ShareIcon className="w-5 h-5" />
                  LinkedIn
                </button>

                <button
                  onClick={shareViaWhatsApp}
                  className="px-4 py-3 bg-emerald-50 hover:bg-emerald-100/75 text-emerald-700 border border-emerald-100 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02]"
                >
                  <ShareIcon className="w-5 h-5" />
                  WhatsApp
                </button>

                <button
                  onClick={() => window.open(publicUrl, '_blank')}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02]"
                >
                  <EyeIcon className="w-5 h-5" />
                  Ver Previa
                </button>
              </div>
            </div>
          </div>

          {/* Details & Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2.5 text-slate-400 mb-2">
                <CheckBadgeIcon className="w-5 h-5 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Estado</span>
              </div>
              <div className="flex items-center gap-2">
                {status === 'ACTIVE' ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-sm font-bold text-emerald-600">Activa</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    <span className="text-sm font-bold text-amber-600">Pausada</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2.5 text-slate-400 mb-2">
                <HashtagIcon className="w-5 h-5 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider">ID Público</span>
              </div>
              <span className="text-sm font-mono font-semibold text-gray-800 block truncate" title={campaign.publicId}>
                {campaign.publicId}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2.5 text-slate-400 mb-2">
                <CalendarDaysIcon className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Creada</span>
              </div>
              <span className="text-sm font-semibold text-gray-800">
                {new Date(campaign.createdAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2.5 text-slate-400 mb-2">
                <UsersIcon className="w-5 h-5 text-pink-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Postulantes</span>
              </div>
              <span className="text-sm font-semibold text-gray-800">
                0 aplicaciones
              </span>
            </div>
          </div>

          {/* Stepper Timeline & Call to Actions */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-slate-100/50 p-8">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 justify-between border-b border-gray-100 pb-6 mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900">¿Qué deseas hacer ahora?</h2>
                <p className="text-sm text-gray-500 mt-1">Elige tu siguiente paso para comenzar la selección.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onGoToDashboard}
                  className="px-5 py-3 border border-gray-200 hover:bg-slate-50 text-gray-700 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                >
                  Ir al Dashboard
                </button>
                <button
                  onClick={onManageCandidates}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2 hover:scale-[1.02]"
                >
                  <UsersIcon className="w-4 h-4" />
                  Gestionar Candidatos
                </button>
              </div>
            </div>

            {/* Next Steps Visual Path */}
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">El Proceso de Selección</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative group">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center border border-indigo-100">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Difundir enlace</h4>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      Comparte el enlace de aplicación para recibir candidatos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative group">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-50 text-purple-600 font-bold flex items-center justify-center border border-purple-100">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">Recibir postulantes</h4>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      Los currículums serán procesados en segundos por nuestro motor de IA.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative group">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-pink-50 text-pink-600 font-bold flex items-center justify-center border border-pink-100">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-pink-600 transition-colors">Evaluar y avanzar</h4>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      Revisa rankings de idoneidad, asigna notas y gestiona la preselección.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        @keyframes scale-up {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-up {
          animation: scale-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </Layout>
  );
};

export default CampaignCreated;