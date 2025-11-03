import React, { useState, useEffect } from 'react';
import { Campaign } from '../../services/api';
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
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid
} from '@heroicons/react/24/solid';

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

  const publicUrl = `${window.location.origin}/apply/${campaign.publicId}`;

  useEffect(() => {
    // Trigger animation on mount
    setTimeout(() => setShowAnimation(true), 100);
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
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
    const body = encodeURIComponent(`
Hola,

Te compartimos una oportunidad laboral que puede interesarte:

📋 Puesto: ${campaign.title}

📝 Descripción:
${campaign.description}

✅ Requisitos:
${campaign.requirements}

💼 Condiciones:
${campaign.conditions}

Para aplicar, sube tu currículum vitae en el siguiente enlace:
${publicUrl}

¡Esperamos tu aplicación!

Saludos,
El equipo de reclutamiento
    `);

    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaLinkedIn = () => {
    const text = encodeURIComponent(`¡Nueva oportunidad laboral! ${campaign.title} - Aplica aquí:`);
    const url = encodeURIComponent(publicUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&text=${text}`);
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(`
🚀 *Nueva Oportunidad Laboral*

📋 *Puesto:* ${campaign.title}

Para más detalles y aplicar, visita:
${publicUrl}
    `);

    window.open(`https://wa.me/?text=${message}`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Success Header with Animation */}
          <div className={`bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-8 text-white mb-6 transition-all duration-700 ${
            showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}>
            <div className="text-center">
              <div className="inline-block mb-4">
                <CheckCircleIconSolid className={`w-24 h-24 text-white transition-all duration-500 ${
                  showAnimation ? 'scale-100 rotate-0' : 'scale-0 -rotate-180'
                }`} />
              </div>
              <h1 className="text-4xl font-bold mb-3 flex items-center justify-center gap-2">
                <SparklesIcon className="w-8 h-8" />
                ¡Campaña Creada Exitosamente!
                <SparklesIcon className="w-8 h-8" />
              </h1>
              <h2 className="text-2xl font-semibold mb-3 text-green-50">
                {campaign.title}
              </h2>
              <p className="text-green-100 text-lg max-w-2xl mx-auto">
                Tu campaña está lista y activa. Los candidatos ya pueden aplicar usando el enlace público.
              </p>
            </div>
          </div>

          {/* Public Link Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-4 border-green-200 animate-fade-in">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <LinkIcon className="w-7 h-7 text-indigo-600" />
              Enlace Público de la Campaña
            </h3>

            <div className="flex gap-3 items-center mb-6">
              <input
                type="text"
                value={publicUrl}
                readOnly
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={copyToClipboard}
                className={`px-6 py-3 rounded-lg font-semibold text-white min-w-[120px] flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg ${
                  copied
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-5 h-5" />
                    Copiado
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="w-5 h-5" />
                    Copiar
                  </>
                )}
              </button>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800 leading-relaxed flex items-start gap-2">
                <SparklesIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> Comparte este enlace con candidatos potenciales.
                  Ellos podrán ver la descripción del puesto y subir su CV directamente.
                </span>
              </p>
            </div>

            {/* Quick Share Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={shareViaEmail}
                className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
              >
                <EnvelopeIcon className="w-5 h-5" />
                Email
              </button>

              <button
                onClick={shareViaLinkedIn}
                className="px-4 py-3 bg-[#0077b5] hover:bg-[#005885] text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
              >
                <ShareIcon className="w-5 h-5" />
                LinkedIn
              </button>

              <button
                onClick={shareViaWhatsApp}
                className="px-4 py-3 bg-[#25d366] hover:bg-[#1da851] text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
              >
                <ShareIcon className="w-5 h-5" />
                WhatsApp
              </button>

              <button
                onClick={() => window.open(publicUrl, '_blank')}
                className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
              >
                <EyeIcon className="w-5 h-5" />
                Previa
              </button>
            </div>
          </div>

          {/* Campaign Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Status Card */}
            <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-green-500 hover:shadow-xl transition-shadow animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <CheckBadgeIcon className="w-8 h-8 text-green-600" />
                <h4 className="text-sm font-semibold text-gray-600">Estado</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                  ACTIVA
                </span>
              </div>
            </div>

            {/* Public ID Card */}
            <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-purple-500 hover:shadow-xl transition-shadow animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <HashtagIcon className="w-8 h-8 text-purple-600" />
                <h4 className="text-sm font-semibold text-gray-600">ID Público</h4>
              </div>
              <code className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-mono">
                {campaign.publicId}
              </code>
            </div>

            {/* Date Card */}
            <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <CalendarDaysIcon className="w-8 h-8 text-indigo-600" />
                <h4 className="text-sm font-semibold text-gray-600">Fecha de Creación</h4>
              </div>
              <span className="text-sm text-gray-700 font-medium">
                {new Date(campaign.createdAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            {/* Candidates Card */}
            <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-pink-500 hover:shadow-xl transition-shadow animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <UsersIcon className="w-8 h-8 text-pink-600" />
                <h4 className="text-sm font-semibold text-gray-600">Candidatos</h4>
              </div>
              <span className="text-sm text-gray-700 font-medium">
                0 aplicaciones
              </span>
            </div>
          </div>

          {/* Next Steps Timeline */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 animate-fade-in">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <ArrowRightIcon className="w-7 h-7 text-indigo-600" />
              Próximos Pasos
            </h3>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <button
                onClick={onManageCandidates}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <UsersIcon className="w-6 h-6" />
                Gestionar Candidatos
              </button>

              <button
                onClick={onGoToDashboard}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:from-gray-700 hover:to-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <ArrowRightIcon className="w-6 h-6" />
                Ir al Dashboard
              </button>
            </div>

            {/* Info Alert */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <SparklesIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-900 leading-relaxed">
                    <strong className="font-bold">Recuerda:</strong> Los candidatos que apliquen a través del enlace público
                    serán procesados automáticamente por nuestro sistema de IA. Recibirás notificaciones cuando haya nuevas aplicaciones.
                  </p>
                </div>
              </div>
            </div>

            {/* Steps Timeline */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border-2 border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h4 className="font-bold text-indigo-900">Compartir</h4>
                </div>
                <p className="text-sm text-indigo-700 pl-10">
                  Difunde el enlace entre candidatos potenciales
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <h4 className="font-bold text-purple-900">Monitorear</h4>
                </div>
                <p className="text-sm text-purple-700 pl-10">
                  Revisa las aplicaciones que lleguen en tiempo real
                </p>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-4 border-2 border-pink-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <h4 className="font-bold text-pink-900">Seleccionar</h4>
                </div>
                <p className="text-sm text-pink-700 pl-10">
                  Aprueba o rechaza candidatos según tus criterios
                </p>
              </div>
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
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </Layout>
  );
};

export default CampaignCreated;