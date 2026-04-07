import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    SparklesIcon,
    BriefcaseIcon,
    ChatBubbleLeftEllipsisIcon,
    EnvelopeIcon,
    PhoneIcon,
    CheckIcon,
    BoltIcon,
    AcademicCapIcon,
    CalendarIcon,
    DocumentTextIcon,
    HandThumbUpIcon,
    HandThumbDownIcon,
    ClipboardIcon,
    ChevronDownIcon,
    EyeIcon,
    ArrowUturnLeftIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Candidate, Campaign, StageInstance } from '../../services/api';
import { apiService } from '../../services/api';

// Extend Candidate to match Dashboard usage (which might have campaignTitle etc)
export interface CandidateWithCampaign extends Candidate {
    campaignTitle?: string;
    role?: string;
}

interface CandidateDrawerProps {
    isOpen: boolean;
    candidate: CandidateWithCampaign | null;
    campaign: Campaign | undefined;
    onClose: () => void;
    onDismiss: (candidate: Candidate) => void;
    onStartProcess: (candidate: Candidate) => void; // Trigger "Validar Interés"
    onViewAIAnalysis: (candidate: Candidate) => void;
    onViewProcess?: (candidate: Candidate) => void; // Optional: View active process
    undoAction?: () => void; // Optional undo
    showUndo?: boolean;
}

const CandidateDrawer: React.FC<CandidateDrawerProps> = ({
    isOpen,
    candidate,
    campaign,
    onClose,
    onDismiss,
    onStartProcess,
    onViewAIAnalysis,
    onViewProcess,
    undoAction,
    showUndo
}) => {
    const [activeTab, setActiveTab] = useState<'resumen' | 'experiencia'>('resumen');
    const [showResultPopover, setShowResultPopover] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // DEBUG LOG
    useEffect(() => {
        if (candidate) {
            console.log("CandidateDrawer Props:", candidate);
            console.log("Phone check:", candidate.phone);
        }
    }, [candidate]);

    if (!isOpen || !candidate) return null;

    // Helper Functions (Internal)
    const getInitials = (name: string): string => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const calculateScore = (c: Candidate): number => {
        return Math.round(c.scoring?.overallScore || 0);
    };

    const getAIInsight = (c: Candidate) => {
        if (c.scoring?.summary) return c.scoring.summary;
        const rec = c.scoring?.recommendation;
        if (!rec) return "Pendiente de análisis detallado.";
        const map: Record<string, string> = {
            'weak_fit': 'Presenta una compatibilidad baja con los requisitos del puesto.',
            'moderate_fit': 'Candidato con coincidencia parcial, se recomienda revisión.',
            'strong_fit': 'Perfil altamente compatible con las expectativas.',
            'reject': 'No cumple con los requisitos mínimos.'
        };
        return map[rec] || rec;
    };

    const getCandidatePosition = (c: Candidate) => {
        const cv = c.structuredData?.datos_cv;
        return cv?.titular_profesional?.titular ||
            cv?.experiencia_laboral?.[0]?.cargo ||
            'Candidato';
    };

    const handleDownloadCV = async () => {
        // Support both direct documentId and documents array fallback
        const docId = candidate?.documentId || candidate?.documents?.[0]?.id;
        if (!docId) return;
        try {
            setDownloading(true);
            const blob = await apiService.downloadDocument(docId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `CV_${candidate.name || 'candidato'}.pdf`;
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
        } catch (err: any) {
            console.error('Error downloading CV:', err);
            alert('No se pudo descargar el CV. El archivo puede no estar disponible.');
        } finally {
            setDownloading(false);
        }
    };

    const score = calculateScore(candidate);

    // Safe Accessors
    const cvData = candidate.structuredData?.datos_cv as any;
    const experience = cvData?.experiencia_laboral || [];
    const education = cvData?.formacion_academica || [];
    const skills = cvData?.habilidades?.habilidades_tecnicas || [];

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
            ></div>

            {/* Drawer Panel */}
            <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl transform transition-transform duration-500 ease-spring z-50 border-l border-slate-100 flex flex-col">

                {/* Header */}
                <div className="p-8 pb-0 relative">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors z-10">
                        <XMarkIcon className="w-6 h-6" />
                    </button>

                    <div className="flex flex-col items-center mb-6">
                        {/* Avatar with Ring */}
                        <div className="relative w-40 h-40 flex items-center justify-center mb-2">
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-md">
                                <circle cx="80" cy="80" r="74" stroke="#eff6ff" strokeWidth="8" fill="none" />
                                <circle
                                    cx="80" cy="80" r="74"
                                    stroke={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e'}
                                    strokeWidth="8" fill="none"
                                    strokeDasharray={`${(score / 100) * (2 * Math.PI * 74)} ${(2 * Math.PI * 74)}`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-inner z-0">
                                {getInitials(candidate.name)}
                            </div>
                            <div className="absolute bottom-2 right-2 bg-amber-50 border-4 border-white rounded-2xl px-3 py-1.5 shadow-lg flex items-center justify-center gap-0.5 z-10 transform translate-x-1/2">
                                <span className={`text-lg font-black ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {score}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 mt-1">%</span>
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 leading-tight mb-0.5 text-center px-4">{candidate.name}</h2>
                        <div className="flex flex-col items-center gap-1 mb-4">
                            <p className="text-slate-400 font-medium italic text-sm">{candidate.email}</p>
                            {candidate.phone ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <a
                                        href={`tel:${candidate.phone.replace(/\D/g, '')}`}
                                        className="text-slate-600 font-bold text-sm flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors"
                                    >
                                        <PhoneIcon className="w-4 h-4 text-indigo-500" />
                                        {candidate.phone}
                                    </a>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(candidate.phone || '');
                                            // Optional: visual feedback could be handled with a toast or icon change, 
                                            // but for now keeping it simple as requested.
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                        title="Copiar número"
                                    >
                                        <ClipboardIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <p className="text-red-400 text-xs">Sin teléfono</p>
                            )}
                        </div>

                        {/* AI Insight */}
                        <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 mb-4 max-w-sm text-center animate-fade-in-up">
                            <div className="flex items-center justify-center gap-1.5 text-indigo-600 mb-1">
                                <SparklesIcon className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Insight IA</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed italic">
                                "{getAIInsight(candidate)}"
                            </p>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap justify-center gap-2 px-2 items-center">
                            <div className="flex items-center gap-1.5 px-3 py-1 text-slate-500 text-xs font-bold uppercase tracking-wide">
                                <BriefcaseIcon className="w-3.5 h-3.5 text-slate-400" />
                                {getCandidatePosition(candidate).split('.')[0]}
                            </div>
                            <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${score >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : score >= 60 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                {score >= 80 ? 'Match Alto' : score >= 60 ? 'Match Medio' : 'Match Bajo'}
                            </span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex mt-2 border-b border-slate-100">
                        <button onClick={() => setActiveTab('resumen')} className={`pb-3 px-1 text-sm font-bold mr-6 transition-colors border-b-2 ${activeTab === 'resumen' ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>Resumen</button>
                        <button onClick={() => setActiveTab('experiencia')} className={`pb-3 px-1 text-sm font-bold mr-6 transition-colors border-b-2 ${activeTab === 'experiencia' ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>Experiencia</button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 pt-6">
                    {activeTab === 'resumen' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Contact Hub (Only for NEW candidates usually) */}
                            {candidate.candidateStatus === 'NEW' && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 animate-fade-in">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                            Por Contactar
                                        </span>
                                        <span className="text-xs text-slate-400">¿Cómo quieres contactarlo?</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <button onClick={() => {
                                            const firstName = candidate.name?.split(' ')[0] || '';
                                            const message = encodeURIComponent(`Hola ${firstName}, te escribo de Evalen sobre tu postulación a ${campaign?.title}. ¿Tienes un momento?`);
                                            window.open(`https://wa.me/${candidate.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
                                        }} className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all group">
                                            <ChatBubbleLeftEllipsisIcon className="w-6 h-6 mb-2 text-slate-400 group-hover:text-emerald-500" />
                                            <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-600">WhatsApp Web</span>
                                        </button>
                                        <button onClick={() => {
                                            const firstName = candidate.name?.split(' ')[0] || '';
                                            window.location.href = `mailto:${candidate.email}?subject=Postulación a ${campaign?.title}&body=Hola ${firstName},...`;
                                        }} className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all group">
                                            <EnvelopeIcon className="w-6 h-6 mb-2 text-slate-400 group-hover:text-blue-500" />
                                            <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600">Enviar Email</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Skills */}
                            {skills.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <BoltIcon className="w-4 h-4 text-amber-500" />
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Habilidades Clave</h4>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {skills.slice(0, 8).map((skill: any, idx: number) => (
                                            <span key={idx} className="px-2.5 py-1 bg-slate-50 text-slate-600 text-xs font-semibold rounded-md border border-slate-100">
                                                {typeof skill === 'string' ? skill : skill.skill || skill.habilidad || 'Habilidad'}
                                            </span>
                                        ))}
                                        {skills.length > 8 && <span className="px-2 py-1 text-slate-400 text-[10px] font-medium">+{skills.length - 8} más</span>}
                                    </div>
                                </div>
                            )}

                            {/* Quick Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 relative group hover:shadow-md transition-all">
                                    <AcademicCapIcon className="absolute top-4 right-4 w-8 h-8 text-orange-600 opacity-10" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-orange-600 block mb-1">Educación</span>
                                    <p className="text-sm font-bold text-slate-800 leading-tight w-[90%]">{education[0]?.titulo || 'N/A'}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{education[0]?.institucion}</p>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 relative group hover:shadow-md transition-all">
                                    <BriefcaseIcon className="absolute top-4 right-4 w-8 h-8 text-blue-600 opacity-10" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-blue-600 block mb-1">Actual</span>
                                    <p className="text-sm font-bold text-slate-800 leading-tight w-[90%]">{experience[0]?.cargo || 'N/A'}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{experience[0]?.empresa}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'experiencia' && (
                        <div className="space-y-6 animate-fade-in pl-2">
                            {experience.map((exp: any, i: number) => (
                                <div key={i} className="pl-6 border-l-2 border-slate-100 relative pb-2">
                                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-300"></div>
                                    <h4 className="font-bold text-slate-800">{exp.cargo}</h4>
                                    <p className="text-sm text-indigo-600 font-medium mb-1">{exp.empresa}</p>
                                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                                        <CalendarIcon className="w-3 h-3" />
                                        {exp.periodo?.fecha_inicio} - {exp.periodo?.fecha_fin || 'Presente'}
                                    </p>
                                    <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{exp.descripcion}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 bg-white/80 backdrop-blur-sm sticky bottom-0 z-20">
                    <div className="flex flex-col gap-3 relative">
                        {/* Download CV Button */}
                        {(candidate?.documentId || candidate?.documents?.[0]?.id) && (
                            <button
                                onClick={handleDownloadCV}
                                disabled={downloading}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {downloading ? (
                                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                ) : (
                                    <ArrowDownTrayIcon className="w-5 h-5 text-slate-400" />
                                )}
                                {downloading ? 'Descargando...' : 'Descargar CV'}
                            </button>
                        )}

                        <button
                            onClick={() => onViewAIAnalysis(candidate)}
                            className="w-full py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group"
                        >
                            <DocumentTextIcon className="w-5 h-5 text-slate-400" />
                            Análisis IA Completo
                        </button>

                        {/* CONDITIONAL ACTION BUTTONS */}
                        {candidate.candidateStatus === 'NEW' ? (
                            <>
                                {/* Popover logic */}
                                {showResultPopover && (
                                    <div className="absolute bottom-full left-0 right-0 mb-4 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 animate-fade-in-up z-30">
                                        <h4 className="text-sm font-bold text-slate-800 mb-3 text-center">¿Cuál fue el resultado?</h4>
                                        <div className="space-y-2">
                                            <button onClick={() => { onStartProcess(candidate); setShowResultPopover(false); }} className="w-full p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-3 hover:bg-emerald-100 transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0"><HandThumbUpIcon className="w-4 h-4 text-emerald-600" /></div>
                                                <div className="text-left"><div className="font-bold">Interesado</div><div className="text-[10px] opacity-80">Iniciar proceso de entrevista</div></div>
                                            </button>
                                            <button onClick={() => { onDismiss(candidate); setShowResultPopover(false); }} className="w-full p-3 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-3 hover:bg-rose-100 transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0"><HandThumbDownIcon className="w-4 h-4 text-rose-600" /></div>
                                                <div className="text-left"><div className="font-bold">No Interesado</div><div className="text-[10px] opacity-80">Descartar candidato</div></div>
                                            </button>
                                            <button onClick={() => setShowResultPopover(false)} className="w-full p-2 text-slate-400 text-xs font-medium hover:text-slate-600">Cancelar</button>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowResultPopover(!showResultPopover)}
                                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group ${showResultPopover ? 'bg-indigo-700 text-white shadow-inner' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200/50'}`}
                                >
                                    <ClipboardIcon className="w-5 h-5" />
                                    Validar Interés
                                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${showResultPopover ? 'rotate-180' : ''}`} />
                                </button>
                            </>
                        ) : (
                            // ALREADY IN PROCESS OR REJECTED
                            onViewProcess && (
                                <button
                                    onClick={() => onViewProcess(candidate)}
                                    className="w-full py-3.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                    Ver Proceso Activo
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default CandidateDrawer;
