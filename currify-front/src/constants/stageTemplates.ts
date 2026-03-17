
import { StageTemplateInput } from '../services/api';
import {
    BuildingOfficeIcon,
    CodeBracketIcon,
    PresentationChartLineIcon
} from '@heroicons/react/24/outline';

export interface StageTemplateConfig {
    id: string;
    name: string;
    description: string;
    icon: any;
    stages: Omit<StageTemplateInput, 'responsibleId' | 'order'>[];
}

export const STAGE_TEMPLATES: StageTemplateConfig[] = [
    {
        id: 'general',
        name: 'General / Administrativo',
        description: 'Flujo estándar para roles administrativos, operativos o de soporte.',
        icon: BuildingOfficeIcon,
        stages: [
            { name: 'Filtro Curricular', description: 'Revisión inicial de antecedentes y cumplimiento de requisitos excluyentes.' },
            { name: 'Entrevista RRHH', description: 'Evaluar ajuste cultural, motivaciones y competencias blandas.' },
            { name: 'Entrevista Jefe Directo', description: 'Evaluación técnica y fit con el equipo.' },
            { name: 'Oferta', description: 'Negociación y cierre.' }
        ]
    },
    {
        id: 'it',
        name: 'Tecnología (IT)',
        description: 'Optimizado para desarrolladores, QA y roles técnicos.',
        icon: CodeBracketIcon,
        stages: [
            { name: 'Filtro Curricular', description: 'Validación de stack tecnológico y experiencia.' },
            { name: 'Entrevista RRHH', description: 'Screening inicial y fit cultural.' },
            { name: 'Prueba Técnica', description: 'Challenge técnico o revisión de código.' },
            { name: 'Entrevista Técnica', description: 'Profundización técnica y arquitectura con el equipo.' },
            { name: 'Oferta', description: 'Propuesta económica y beneficios.' }
        ]
    },
    {
        id: 'sales',
        name: 'Ventas / Comercial',
        description: 'Enfocado en habilidades de comunicación y negociación.',
        icon: PresentationChartLineIcon,
        stages: [
            { name: 'Filtro Curricular', description: 'Revisión de experiencia comercial.' },
            { name: 'Entrevista RRHH', description: 'Evaluar perfil hunter/farmer y habilidades comunicacionales.' },
            { name: 'Roleplay / Caso', description: 'Simulación de venta o resolución de caso práctico.' },
            { name: 'Entrevista Gerente', description: 'Validación final de potencial comercial.' },
            { name: 'Oferta', description: 'Esquema de comisiones y cierre.' }
        ]
    }
];
