import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    CloudArrowUpIcon,
    SparklesIcon,
    DocumentArrowUpIcon,
    BriefcaseIcon,
    CommandLineIcon,
    MegaphoneIcon,
    PlusIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import { apiService, UserProfile } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface DashboardActivationProps {
    user: UserProfile;
    onCreateManual: () => void;
}

interface Template {
    id: string;
    label: string;
    icon: React.ElementType;
    title: string;
    description: string;
    requirements: string;
    color: string;
    tags: string[];
}

const CAMPAIGN_TEMPLATES: Template[] = [
    {
        id: 'sales',
        label: 'Ventas',
        icon: BriefcaseIcon,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        title: 'Ejecutivo Comercial Senior',
        description: 'Estamos buscando un Ejecutivo Comercial Senior altamente motivado para unirse a nuestro equipo de ventas en Santiago (Híbrido). El candidato ideal será responsable de identificar nuevas oportunidades de negocio, gestionar relaciones con clientes clave y cerrar acuerdos estratégicos. Buscamos a alguien con pasión por las ventas consultivas y un historial comprobado de superación de metas.',
        requirements: 'Formación Académica: Título profesional en Ingeniería Comercial, Administración de Empresas o carrera afín.\n\nExperiencia:\n- Mínimo 4 años de experiencia en ventas B2B, preferiblemente en sector tecnológico o servicios.\n- Historial demostrable de cumplimiento de cuotas de venta.\n\nHabilidades Técnicas:\n- Manejo avanzado de CRM (Salesforce, HubSpot o similar).\n- Dominio de herramientas de prospección (LinkedIn Sales Navigator).\n- Excel intermedio/avanzado.\n\nHabilidades Blandas:\n- Excelente comunicación verbal y escrita.\n- Capacidad de negociación y cierre.\n- Orientación a resultados y proactividad.',
        tags: ['Venta Consultiva', 'CRM', 'Prospección B2B', 'Cierre de Negocios']
    },
    {
        id: 'tech',
        label: 'Tecnología',
        icon: CommandLineIcon,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        title: 'Desarrollador Full Stack (React/Node)',
        description: 'Únete a nuestro equipo de ingeniería como Desarrollador Full Stack. Trabajarás en el desarrollo de productos escalables utilizando tecnologías modernas en un entorno ágil. La posición es 100% Remota. Buscamos a alguien apasionado por el código limpio, las mejores prácticas y la arquitectura de software.',
        requirements: 'Formación Académica: Título universitario en Ingeniería Civil Informática, Ingeniería en Computación o equivalente (Excluyente).\n\nExperiencia:\n- +3 años de experiencia en desarrollo web full stack.\n\nStack Tecnológico Requerido:\n- Frontend: React.js (Hooks, Context), TypeScript, TailwindCSS.\n- Backend: Node.js (NestJS/Express), PostgreSQL/MongoDB.\n- DevOps: Docker, AWS/GCP (básico), CI/CD.\n\nOtros Conocimientos:\n- Arquitectura de microservicios.\n- Testing (Jest, Cypress).\n- Git flow.',
        tags: ['React.js', 'Node.js', 'TypeScript', 'Clean Code']
    },
    {
        id: 'marketing',
        label: 'Marketing',
        icon: MegaphoneIcon,
        color: 'text-purple-600 bg-purple-50 border-purple-200',
        title: 'Marketing Manager Digital',
        description: 'Buscamos un Marketing Manager creativo y analítico para liderar nuestras estrategias digitales. Ubicación: Ciudad de México (Presencial). Serás responsable de la presencia online de la marca, campañas de paid media y estrategias de contenido para aumentar el engagement y los leads.',
        requirements: 'Formación Académica: Licenciatura en Marketing, Publicidad, Comunicación o afín.\n\nExperiencia:\n- 5+ años liderando equipos de marketing digital.\n- Experiencia gestionando presupuestos de publicidad >$10k USD/mes.\n\nConocimientos Técnicos:\n- Google Analytics 4, Google Ads, Meta Ads Manager.\n- Herramientas de SEO (Semrush/Ahrefs).\n- Email Marketing y Automatización.\n\nCompetencias:\n- Pensamiento estratégico y analítico.\n- Liderazgo de equipos multidisciplinarios.\n- Creatividad y visión de marca.',
        tags: ['Google Ads', 'SEO/SEM', 'Analytics', 'Estrategia Digital']
    },
    {
        id: 'admin',
        label: 'Administración',
        icon: UserGroupIcon,
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        title: 'Analista de Operaciones',
        description: 'Analista de Operaciones para asegurar la eficiencia de nuestros procesos internos. Ubicación: Bogotá (Híbrido). El rol implica la supervisión de procesos administrativos, gestión de proveedores y apoyo a la gerencia en reportes operativos.',
        requirements: 'Formación Académica: Título en Ingeniería Industrial, Administración de Empresas o Contabilidad.\n\nExperiencia:\n- 2-3 años en roles operativos o administrativos.\n\nHabilidades:\n- Dominio avanzado de Microsoft Excel (Tablas dinámicas, Macros).\n- Experiencia con ERPs (SAP, Oracle, Netsuite).\n- Capacidad de análisis de datos y generación de reportes.\n- Organización impecable y atención al detalle.',
        tags: ['Excel Avanzado', 'ERP', 'Gestión de Procesos', 'Análisis de Datos']
    }
];

const getStageTemplatesForVertical = (templateId: string, userId: string) => {
    const commonStages = [
        { name: 'Revisión de CV', description: 'Ranking IA y filtrado inicial.', order: 1, responsibleId: userId },
    ];

    switch (templateId) {
        case 'tech':
            return [
                ...commonStages,
                { name: 'Prueba Técnica', description: 'Evaluación de código y arquitectura.', order: 2, responsibleId: userId },
                { name: 'Entrevista Cultural', description: 'Ajuste con el equipo y valores.', order: 3, responsibleId: userId },
                { name: 'Oferta', description: 'Propuesta económica y cierre.', order: 4, responsibleId: userId }
            ];
        case 'sales':
            return [
                ...commonStages,
                { name: 'Roleplay de Ventas', description: 'Simulación de escenario comercial.', order: 2, responsibleId: userId },
                { name: 'Entrevista Gerencial', description: 'Validación de soft skills y drive.', order: 3, responsibleId: userId },
                { name: 'Oferta', description: 'Negociación y contrato.', order: 4, responsibleId: userId }
            ];
        case 'marketing':
            return [
                ...commonStages,
                { name: 'Revisión de Portafolio', description: 'Análisis de campañas previas.', order: 2, responsibleId: userId },
                { name: 'Caso Práctico', description: 'Ejercicio de estrategia de marca.', order: 3, responsibleId: userId },
                { name: 'Oferta', description: 'Cierre y contratación.', order: 4, responsibleId: userId }
            ];
        case 'admin':
            return [
                ...commonStages,
                { name: 'Prueba Psicométrica', description: 'Evaluación de competencias.', order: 2, responsibleId: userId },
                { name: 'Entrevista Final', description: 'Revisión con jefatura directa.', order: 3, responsibleId: userId },
                { name: 'Oferta', description: 'Firma de contrato.', order: 4, responsibleId: userId }
            ];
        default:
            return [
                ...commonStages,
                { name: 'Entrevista', description: 'Conocimiento del candidato.', order: 2, responsibleId: userId },
                { name: 'Oferta', description: 'Propuesta final.', order: 3, responsibleId: userId }
            ];
    }
};

const DashboardActivation: React.FC<DashboardActivationProps> = ({ user, onCreateManual }) => {
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        if (!selectedTemplateId) {
            setError('Por favor selecciona un tipo de perfil antes de subir el CV.');
            return;
        }

        const template = CAMPAIGN_TEMPLATES.find(t => t.id === selectedTemplateId);
        if (!template) return;

        const file = acceptedFiles[0];

        setIsProcessing(true);
        // Simulate progress for UX
        const interval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        try {
            // 1. Create Auto-Campaign with Template Context
            const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
            const campaignTitle = `${template.title} - ${today}`;

            const campaignPayload = {
                title: campaignTitle,
                description: template.description,
                requirements: template.requirements,
                conditions: 'Condiciones estándar de contratación (definidas por su empresa).',
                status: 'ACTIVE' as const,
                stageTemplates: getStageTemplatesForVertical(template.id, user.id)
            };

            console.log('Activating campaign with payload:', campaignPayload);

            const newCampaign = await apiService.createCampaign(campaignPayload);
            console.log('Campaign Created:', newCampaign);

            if (!newCampaign || !newCampaign.publicId) {
                throw new Error('La campaña se creó pero no se recibió el ID público.');
            }

            // 2. Upload Document
            await apiService.uploadDocument({
                file,
                campaignPublicId: newCampaign.publicId,
                candidateName: file.name.replace(/\.[^/.]+$/, ""), // Fallback name
                candidateEmail: 'candidate@example.com', // Placeholder
                candidatePhone: ''
            });

            clearInterval(interval);
            setUploadProgress(100);

            // 3. Redirect to Campaign
            setTimeout(() => {
                navigate(`/campaigns/${newCampaign.id}`);
            }, 800);

        } catch (error: any) { // Type as any for now to access message safely
            console.error('Activation failed', error);

            let errorMessage = 'Hubo un error al procesar. Por favor intenta de nuevo.';

            // Handle SaaS Limits (Backend returns 403 with specific messages)
            const errorMsg = error.message || '';
            const isLimitError = errorMsg.includes('Forbidden') || errorMsg.includes('límite') || errorMsg.includes('créditos');

            if (isLimitError) {
                if (errorMsg.includes('campañas')) {
                    errorMessage = '🔒 Límite de campañas alcanzado. Mejora a PRO para crear más.';
                } else if (errorMsg.includes('créditos')) {
                    errorMessage = '⚡ Sin créditos de evaluación. Mejora tu plan para continuar.';
                } else {
                    errorMessage = errorMsg; // Fallback to backend message
                }
            } else {
                errorMessage = 'Hubo un error al procesar el archivo. Por favor intenta crear la campaña manualmente.';
            }

            alert(errorMessage);
            clearInterval(interval);
            setIsProcessing(false);
            setUploadProgress(0);
        }
    }, [navigate, selectedTemplateId, user.id]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        maxFiles: 1,
        disabled: isProcessing
    });

    const isRecruiter = user.role === 'RECRUITER';
    const rootProps = getRootProps();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in-up py-10">

            <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 mb-6 relative">
                    <SparklesIcon className="w-10 h-10 text-indigo-600 animate-pulse" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                    ¡Comencemos la magia, {user.name.split(' ')[0]}! ✨
                </h2>
                <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
                    Selecciona un perfil y arrastra un CV. Nuestra IA creará la campaña y analizará al candidato en segundos.
                </p>
            </div>

            {/* Template Selection Grid */}
            <div className="w-full max-w-4xl mx-auto mb-10">
                <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
                    1. ¿Qué perfil estás buscando hoy?
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {CAMPAIGN_TEMPLATES.map((template) => {
                        const Icon = template.icon;
                        const isSelected = selectedTemplateId === template.id;
                        return (
                            <button
                                key={template.id}
                                onClick={() => {
                                    setSelectedTemplateId(template.id);
                                    setError(null);
                                }}
                                className={`
                                    relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 group
                                    ${isSelected
                                        ? `${template.color} shadow-md scale-105 ring-2 ring-offset-2 ring-indigo-500`
                                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <Icon className={`w-8 h-8 mb-3 ${isSelected ? 'text-current' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                <span className={`text-sm font-bold ${isSelected ? 'text-current' : 'text-gray-700'}`}>
                                    {template.label}
                                </span>
                                {isSelected && (
                                    <div className="absolute -top-2 -right-2 bg-indigo-600 text-white p-1 rounded-full">
                                        <SparklesIcon className="w-3 h-3" />
                                    </div>
                                )}
                            </button>
                        );
                    })}

                    {/* Manual Option */}
                    <button
                        onClick={onCreateManual}
                        className="flex flex-col items-center p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 transition-all duration-200 group"
                    >
                        <PlusIcon className="w-8 h-8 mb-3 text-gray-400 group-hover:text-indigo-500" />
                        <span className="text-sm font-bold text-gray-600 group-hover:text-indigo-600">
                            Crear Manual
                        </span>
                    </button>
                </div>
                {error && <p className="text-red-500 text-sm mt-3 font-medium animate-bounce">{error}</p>}
            </div>

            {/* Target Profile Card (Progressive Disclosure) */}
            {selectedTemplateId && (() => {
                const template = CAMPAIGN_TEMPLATES.find(t => t.id === selectedTemplateId);
                if (!template) return null;
                const Icon = template.icon;

                return (
                    <div className="w-full max-w-2xl mx-auto mb-8 bg-white border border-indigo-100 rounded-2xl p-6 shadow-lg shadow-indigo-100/50 animate-fade-in-up text-left relative overflow-hidden">
                        <div className={`absolute top-0 right-0 p-2 opacity-10 ${template.color.split(' ')[0]}`}>
                            <Icon className="w-32 h-32 transform rotate-12 -translate-y-8 translate-x-8" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-lg bg-gray-50`}>
                                    <Icon className={`w-6 h-6 ${template.color.split(' ')[0]}`} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 border-l-4 border-indigo-500 pl-3">
                                        OBJETIVO: {template.title.toUpperCase()}
                                    </h3>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 mb-3 ml-1">
                                La IA buscará estas palabras clave en tu documento:
                            </p>

                            <div className="flex flex-wrap gap-2 mb-4 ml-1">
                                {template.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-white text-gray-700 rounded-lg text-xs font-bold border border-gray-200 shadow-sm">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 text-sm text-indigo-700 font-medium bg-indigo-50/80 p-3 rounded-lg border border-indigo-100">
                                <SparklesIcon className="w-5 h-5 text-indigo-500" />
                                <span>Usaremos este perfil estándar para probar la IA. <strong>¿Tu candidato está a la altura?</strong></span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Dropzone */}
            <div
                {...rootProps}
                onClick={(e) => {
                    if (!selectedTemplateId) {
                        e.stopPropagation();
                        setError('👈 Por favor selecciona un perfil primero');
                        return;
                    }
                    if (rootProps.onClick) {
                        rootProps.onClick(e);
                    }
                }}
                className={`
                    w-full max-w-2xl p-10 rounded-3xl border-3 border-dashed transition-all duration-300 cursor-pointer relative overflow-hidden group
                    ${isDragActive ? 'border-indigo-500 bg-indigo-50/50 scale-102' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}
                    ${isProcessing ? 'pointer-events-none opacity-90' : ''}
                    ${!selectedTemplateId ? 'opacity-60 grayscale' : 'opacity-100'}
                `}
            >
                <input {...getInputProps()} />

                {isProcessing ? (
                    <div className="flex flex-col items-center py-8">
                        <div className="w-full max-w-xs bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                            <div
                                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-indigo-600 font-semibold animate-pulse">
                            {uploadProgress < 100 ? 'Analizando documento con IA...' : '¡Listo! Redirigiendo...'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className={`w-20 h-20 mx-auto bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${!selectedTemplateId ? 'opacity-50' : ''}`}>
                            <CloudArrowUpIcon className={`w-10 h-10 ${isDragActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-500'}`} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900 mb-1">
                                {isDragActive
                                    ? '¡Suéltalo aquí!'
                                    : selectedTemplateId
                                        ? 'Desafía a la IA: ¿Este CV cumple con los requisitos?'
                                        : '2. Arrastra el CV aquí'
                                }
                            </p>
                            <p className="text-sm text-gray-500">
                                Soporta PDF, DOCX (Max 10MB) - Requiere selección previa
                            </p>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default DashboardActivation;
