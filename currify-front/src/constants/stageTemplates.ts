
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
        name: 'General / Admin',
        description: 'Roles administrativos, operativos o de soporte.',
        icon: BuildingOfficeIcon,
        stages: [
            { name: 'Contactar', description: 'Primer contacto y confirmación de interés.' },
            { name: 'Filtro curricular', description: 'Revisión de antecedentes y requisitos excluyentes.' },
            { name: 'Entrevista RRHH', description: 'Ajuste cultural, motivaciones y expectativas.' },
            { name: 'Entrevista final', description: 'Conversación con el hiring manager y cierre.' }
        ]
    },
    {
        id: 'tech',
        name: 'Tecnología (IT)',
        description: 'Desarrollo, QA y roles técnicos con prueba.',
        icon: CodeBracketIcon,
        stages: [
            { name: 'Contactar', description: 'Primer contacto y confirmación de interés.' },
            { name: 'Filtro curricular', description: 'Revisión de stack y experiencia contra la rúbrica.' },
            { name: 'Prueba técnica', description: 'Ejercicio o take-home acotado en el tiempo.' },
            { name: 'Entrevista técnica', description: 'Profundización técnica y diseño de solución.' },
            { name: 'Entrevista final', description: 'Fit de equipo, condiciones y cierre.' }
        ]
    },
    {
        id: 'sales',
        name: 'Ventas / Comercial',
        description: 'Enfocado en comunicación y negociación.',
        icon: PresentationChartLineIcon,
        stages: [
            { name: 'Contactar', description: 'Primer contacto y confirmación de interés.' },
            { name: 'Screening', description: 'Revisión de trayectoria comercial y metas.' },
            { name: 'Role play', description: 'Simulación de venta y manejo de objeciones.' },
            { name: 'Entrevista comercial', description: 'Conversación con liderazgo de ventas.' },
            { name: 'Referencias', description: 'Chequeo de referencias y cierre.' }
        ]
    }
];
