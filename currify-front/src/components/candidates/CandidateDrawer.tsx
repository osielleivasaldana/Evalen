import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    XMarkIcon,
    SparklesIcon,
    BriefcaseIcon,
    ChatBubbleLeftEllipsisIcon,
    EnvelopeIcon,
    PhoneIcon,
    CurrencyDollarIcon,
    BoltIcon,
    AcademicCapIcon,
    CalendarIcon,
    DocumentTextIcon,
    HandThumbUpIcon,
    HandThumbDownIcon,
    ClipboardIcon,
    ChevronDownIcon,
    EyeIcon,
    ArrowDownTrayIcon,
    GlobeAltIcon,
    CheckIcon
} from '@heroicons/react/24/outline';
import { Candidate, Campaign, CVData } from '../../services/api';
import { apiService } from '../../services/api';

export interface CandidateWithCampaign extends Candidate {
    campaignTitle?: string;
    role?: string;
}

type ExperienceItem = CVData['datos_cv']['experiencia_laboral'][number] & { descripcion?: string };

interface CandidateDrawerProps {
    isOpen: boolean;
    candidate: CandidateWithCampaign | null;
    campaign: Campaign | undefined;
    onClose: () => void;
    onDismiss: (candidate: Candidate) => void;
    onStartProcess: (candidate: Candidate) => void;
    onViewAIAnalysis: (candidate: Candidate) => void;
    onViewProcess?: (candidate: Candidate) => void;
    loading?: boolean;
}

function getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function calculateScore(c: Candidate): number {
    return Math.round(c.scoring?.overallScore || 0);
}

function getAIInsight(c: Candidate) {
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
}

function getCandidatePosition(c: Candidate) {
    const cv = c.structuredData?.datos_cv;
    return cv?.titular_profesional?.titular ||
        cv?.experiencia_laboral?.[0]?.cargo ||
        'Candidato';
}

function getOnlineProfiles(c: Candidate): { label: string; url: string }[] {
    const perfiles = c.structuredData?.datos_cv?.perfiles_online;
    if (!perfiles || typeof perfiles !== 'object') return [];
    return Object.entries(perfiles as Record<string, unknown>)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        .map(([key, url]) => ({ label: key, url }));
}

const SCORE_RING_RADIUS = 70;
const SCORE_RING_CIRCUMFERENCE = 2 * Math.PI * SCORE_RING_RADIUS;

const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 160 }) => {
    const center = size / 2;
    const hasScore = score > 0;
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e';
    const dashOffset = hasScore ? SCORE_RING_CIRCUMFERENCE * (1 - score / 100) : SCORE_RING_CIRCUMFERENCE;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 drop-shadow-md">
            <circle cx={center} cy={center} r={SCORE_RING_RADIUS} stroke="#eff6ff" strokeWidth="8" fill="none" />
            <circle
                cx={center} cy={center} r={SCORE_RING_RADIUS}
                stroke={color}
                strokeWidth="8" fill="none"
                strokeDasharray={`${SCORE_RING_CIRCUMFERENCE}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
            />
        </svg>
    );
};

const CandidateDrawer: React.FC<CandidateDrawerProps> = ({
    isOpen,
    candidate,
    campaign,
    onClose,
    onDismiss,
    onStartProcess,
    onViewAIAnalysis,
    onViewProcess,
    loading = false
}) => {
    const [activeTab, setActiveTab] = useState<'resumen' | 'experiencia'>('resumen');
    const [showResultPopover, setShowResultPopover] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [copied, setCopied] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const prevFocusRef = useRef<HTMLElement | null>(null);

    const score = useMemo(() => candidate ? calculateScore(candidate) : 0, [candidate]);
    const hasScore = candidate?.scoring?.overallScore != null;

    const cvData = candidate?.structuredData?.datos_cv;
    const experience = cvData?.experiencia_laboral || [];
    const education = cvData?.formacion_academica || [];
    const skills = cvData?.habilidades?.habilidades_tecnicas || [];
    const onlineProfiles = useMemo(() => candidate ? getOnlineProfiles(candidate) : [], [candidate]);

    const insightText = useMemo(() => candidate ? getAIInsight(candidate) : '', [candidate]);
    const position = useMemo(() => candidate ? getCandidatePosition(candidate).split('.')[0] : '', [candidate]);
    const matchLabel = !hasScore ? 'Sin evaluar' : score >= 80 ? 'Match Alto' : score >= 60 ? 'Match Medio' : 'Match Bajo';

    const handleCopyPhone = useCallback(async () => {
        if (!candidate?.phone) return;
        try {
            await navigator.clipboard.writeText(candidate.phone);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { }
    }, [candidate]);

    const handleDownloadCV = useCallback(async () => {
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
        } catch {
            alert('No se pudo descargar el CV. El archivo puede no estar disponible.');
        } finally {
            setDownloading(false);
        }
    }, [candidate]);

    useEffect(() => {
        if (isOpen) {
            prevFocusRef.current = document.activeElement as HTMLElement;
            setTimeout(() => drawerRef.current?.focus(), 100);
        } else {
            setShowResultPopover(false);
            setCopied(false);
            prevFocusRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!showResultPopover) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowResultPopover(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [showResultPopover]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
                role="presentation"
                aria-hidden="true"
            />

            <div
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-label={`Detalle de ${candidate?.name || 'candidato'}`}
                tabIndex={-1}
                className="fixed inset-y-0 right-0 w-full max-w-[460px] bg-white shadow-2xl transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] z-50 border-l border-slate-100 flex flex-col"
            >
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 animate-pulse" />
                        <div className="h-5 w-48 bg-slate-100 rounded animate-pulse" />
                        <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                        <div className="h-3 w-40 bg-slate-100 rounded animate-pulse mt-4" />
                        <div className="space-y-3 w-full mt-6">
                            <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                            <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
                            <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                        </div>
                    </div>
                ) : candidate && (
                    <>
                        <div className="p-6 sm:p-8 pb-0 relative overflow-y-auto flex-1">
                            <button
                                onClick={onClose}
                                aria-label="Cerrar panel"
                                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors z-10"
                            >
                                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>

                            <div className="flex flex-col items-center mb-6">
                                <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center mb-3">
                                    <ScoreRing score={hasScore ? score : 0} size={160} />
                                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-inner">
                                        {getInitials(candidate.name)}
                                    </div>
                                    {hasScore && (
                                        <div className="absolute -bottom-1 -right-1 bg-amber-50 border-4 border-white rounded-2xl px-2.5 py-1.5 shadow-lg flex items-center justify-center gap-0.5 z-10">
                                            <span className={`text-base sm:text-lg font-black ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {score}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 mt-0.5">%</span>
                                        </div>
                                    )}
                                </div>

                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-1 text-center px-2">{candidate.name}</h2>

                                <div className="flex flex-col items-center gap-1.5 mb-4 w-full max-w-sm">
                                    <p className="text-slate-400 font-medium text-xs sm:text-sm truncate max-w-full">{candidate.email}</p>

                                    {candidate.phone ? (
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`tel:${candidate.phone.replace(/\D/g, '')}`}
                                                className="text-slate-600 font-bold text-xs sm:text-sm flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors"
                                                aria-label={`Llamar al ${candidate.phone}`}
                                            >
                                                <PhoneIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
                                                {candidate.phone}
                                            </a>
                                            <button
                                                onClick={handleCopyPhone}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative"
                                                aria-label="Copiar número de teléfono"
                                            >
                                                {copied ? (
                                                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                                                ) : (
                                                    <ClipboardIcon className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-xs">Sin teléfono registrado</p>
                                    )}

                                    {candidate.expectedSalary && (
                                        <div className="flex items-center gap-2">
                                            <div className="text-slate-600 font-bold text-xs sm:text-sm flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                                                <CurrencyDollarIcon className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-indigo-500" />
                                                <span>Renta líquida: {candidate.expectedSalary}</span>
                                            </div>
                                        </div>
                                    )}

                                    {onlineProfiles.length > 0 && (
                                        <div className="flex flex-wrap justify-center gap-2 mt-1">
                                            {onlineProfiles.map((p, i) => (
                                                <a
                                                    key={i}
                                                    href={p.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
                                                >
                                                    <GlobeAltIcon className="w-3.5 h-3.5" />
                                                    {p.label === 'linkedin' ? 'LinkedIn' : p.label === 'portfolio' ? 'Portafolio' : p.label}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 mb-4 w-full max-w-sm text-center animate-fade-in-up">
                                    <div className="flex items-center justify-center gap-1.5 text-indigo-600 mb-1">
                                        <SparklesIcon className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Insight IA</span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed italic">
                                        &ldquo;{insightText}&rdquo;
                                    </p>
                                </div>

                                <div className="flex flex-wrap justify-center gap-2 px-2 items-center">
                                    <div className="flex items-center gap-1.5 px-3 py-1 text-slate-500 text-xs font-bold uppercase tracking-wide">
                                        <BriefcaseIcon className="w-3.5 h-3.5 text-slate-400" />
                                        {position}
                                    </div>
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${!hasScore ? 'bg-slate-50 text-slate-500 border-slate-200' : score >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : score >= 60 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                        {matchLabel}
                                    </span>
                                </div>
                            </div>

                            <div className="flex mt-2 border-b border-slate-100">
                                <button
                                    onClick={() => setActiveTab('resumen')}
                                    className={`pb-3 px-1 text-sm font-bold mr-6 transition-colors border-b-2 ${activeTab === 'resumen' ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                                    aria-pressed={activeTab === 'resumen'}
                                >
                                    Resumen
                                </button>
                                <button
                                    onClick={() => setActiveTab('experiencia')}
                                    className={`pb-3 px-1 text-sm font-bold mr-6 transition-colors border-b-2 ${activeTab === 'experiencia' ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                                    aria-pressed={activeTab === 'experiencia'}
                                >
                                    Experiencia
                                </button>
                            </div>

                            <div className="pt-6 pb-4">
                                {activeTab === 'resumen' && (
                                    <div className="space-y-6 animate-fade-in">
                                        {candidate.candidateStatus === 'NEW' && (
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-fade-in">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        Por Contactar
                                                    </span>
                                                    <span className="text-xs text-slate-400">¿Cómo quieres contactarlo?</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => {
                                                            const firstName = candidate.name?.split(' ')[0] || '';
                                                            const message = encodeURIComponent(`Hola ${firstName}, te escribo de Evalen sobre tu postulación a ${campaign?.title}. ¿Tienes un momento?`);
                                                            window.open(`https://wa.me/${candidate.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
                                                        }}
                                                        className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all group"
                                                        aria-label="Abrir WhatsApp Web"
                                                    >
                                                        <ChatBubbleLeftEllipsisIcon className="w-6 h-6 mb-2 text-slate-400 group-hover:text-emerald-500" />
                                                        <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-600">WhatsApp Web</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const firstName = candidate.name?.split(' ')[0] || '';
                                                            window.location.href = `mailto:${candidate.email}?subject=Postulación a ${campaign?.title}&body=Hola ${firstName},...`;
                                                        }}
                                                        className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all group"
                                                        aria-label="Enviar correo electrónico"
                                                    >
                                                        <EnvelopeIcon className="w-6 h-6 mb-2 text-slate-400 group-hover:text-blue-500" />
                                                        <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600">Enviar Email</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {skills.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <BoltIcon className="w-4 h-4 text-amber-500" />
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Habilidades Clave</h4>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {skills.slice(0, 8).map((skill, idx) => (
                                                        <span key={idx} className="px-2.5 py-1 bg-slate-50 text-slate-600 text-xs font-semibold rounded-md border border-slate-100">
                                                            {typeof skill === 'string' ? skill : skill.skill || 'Habilidad'}
                                                        </span>
                                                    ))}
                                                    {skills.length > 8 && (
                                                        <span className="px-2 py-1 text-slate-400 text-[10px] font-medium">+{skills.length - 8} más</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

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
                                        {experience.length === 0 && (
                                            <p className="text-sm text-slate-400 italic text-center py-8">No hay experiencia laboral registrada.</p>
                                        )}
                                        {experience.map((exp: ExperienceItem, i) => (
                                            <div key={i} className="pl-6 border-l-2 border-slate-100 relative pb-2">
                                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-300" />
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
                        </div>

                        <div className="p-4 sm:p-6 border-t border-slate-100 bg-white/80 backdrop-blur-sm sticky bottom-0 z-20">
                            <div className="flex flex-col gap-2.5 sm:gap-3 relative">
                                {(candidate?.documentId || candidate?.documents?.[0]?.id) && (
                                    <button
                                        onClick={handleDownloadCV}
                                        disabled={downloading}
                                        className="w-full py-2.5 sm:py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Descargar currículum vitae"
                                    >
                                        {downloading ? (
                                            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                        ) : (
                                            <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                                        )}
                                        {downloading ? 'Descargando...' : 'Descargar CV'}
                                    </button>
                                )}

                                <button
                                    onClick={() => onViewAIAnalysis(candidate)}
                                    className="w-full py-2.5 sm:py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group"
                                >
                                    <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                                    Análisis IA Completo
                                </button>

                                {candidate.candidateStatus === 'NEW' ? (
                                    <>
                                        {showResultPopover && (
                                            <div className="absolute bottom-full left-0 right-0 mb-3 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 animate-fade-in-up z-30">
                                                <h4 className="text-sm font-bold text-slate-800 mb-3 text-center">¿Cuál fue el resultado?</h4>
                                                <div className="space-y-2">
                                                    <button
                                                        onClick={() => { onStartProcess(candidate); setShowResultPopover(false); }}
                                                        className="w-full p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-3 hover:bg-emerald-100 transition-colors"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0"><HandThumbUpIcon className="w-4 h-4 text-emerald-600" /></div>
                                                        <div className="text-left"><div className="font-bold">Interesado</div><div className="text-[10px] opacity-80">Iniciar proceso de entrevista</div></div>
                                                    </button>
                                                    <button
                                                        onClick={() => { onDismiss(candidate); setShowResultPopover(false); }}
                                                        className="w-full p-3 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-3 hover:bg-rose-100 transition-colors"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0"><HandThumbDownIcon className="w-4 h-4 text-rose-600" /></div>
                                                        <div className="text-left"><div className="font-bold">No Interesado</div><div className="text-[10px] opacity-80">Descartar candidato</div></div>
                                                    </button>
                                                    <button onClick={() => setShowResultPopover(false)} className="w-full p-2 text-slate-400 text-xs font-medium hover:text-slate-600">Cancelar</button>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setShowResultPopover(!showResultPopover)}
                                            className={`w-full py-2.5 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 group ${showResultPopover ? 'bg-indigo-700 text-white shadow-inner' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200/50'}`}
                                        >
                                            <ClipboardIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                            Validar Interés
                                            <ChevronDownIcon className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${showResultPopover ? 'rotate-180' : ''}`} />
                                        </button>
                                    </>
                                ) : (
                                    onViewProcess && (
                                        <button
                                            onClick={() => onViewProcess(candidate)}
                                            className="w-full py-2.5 sm:py-3.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                            Ver Proceso Activo
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default CandidateDrawer;
