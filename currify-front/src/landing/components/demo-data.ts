// src/landing/components/demo-data.ts

export interface BreakdownItem {
  dim: string;
  label: string;
  score: number;
  weight: string;
  matchTooltip: string;
}

export interface DemoFile {
  name: string;
  sizeLabel: string;
}

export interface DemoContacto {
  nombre_completo: string;
  email: string;
  telefono: string;
  ubicacion: string;
  linkedin: string;
  github: string;
}

export interface DemoExperiencia {
  cargo: string;
  empresa: string;
  ubicacion: string;
  periodo: string;
  responsabilidades: string[];
}

export interface DemoFormacion {
  titulo: string;
  institucion: string;
  periodo: string;
  detalle: string;
}

export interface DemoHabilidades {
  tecnicas: string[];
  blandas: string[];
  idiomas: { idioma: string; nivel: string }[];
}

export interface DemoCampaign {
  titulo: string;
  modalidad: string;
  experiencia_minima: string;
  habilidades_requeridas: string[];
  habilidades_deseables: string[];
  nivel_educacion: string;
  idiomas: string[];
}

export interface DemoScoring {
  overall_score: number;
  recommendation: string;
  recommendation_label: string;
  summary: string;
  breakdown: BreakdownItem[];
  strengths: string[];
  gaps: string[];
}

export interface DemoData {
  file: DemoFile;
  cvText: string;
  extraction: {
    contacto: DemoContacto;
    titular_profesional: { titular: string };
    resumen_profesional: { resumen: string };
    experiencia_laboral: DemoExperiencia[];
    formacion_academica: DemoFormacion[];
    habilidades: DemoHabilidades;
    certificaciones: { nombre: string; año: string }[];
    perfiles_online: string[];
    confianza_general: number;
    advertencias: string[];
  };
  campaign: DemoCampaign;
  scoring: DemoScoring;
}

export const SAMPLE: DemoData = {
  file: {
    name: 'cv-ana-maria-alarcon.pdf',
    sizeLabel: '312 KB',
  },
  cvText: `ANA MARÍA ALARCÓN VERGARA
Santiago, Chile | +56 9 8765 4321 | ana.alarcon@email.com
linkedin.com/in/anaalarcon | github.com/anaalarcon

BACKEND DEVELOPER
Backend Developer con 5 años de experiencia en Python, FastAPI y arquitecturas distribuidas.
Experiencia en empresas de alto volumen como PayPal LatAm y MercadoLibre Chile.
Enfocada en sistemas escalables, event-driven architecture y mentoring técnico.

EXPERIENCIA LABORAL

Senior Backend Developer
PayPal LatAm | Remoto
Marzo 2022 — Presente
• Diseñé la arquitectura event-driven del nuevo checkout usando Kafka y FastAPI, procesando 2M+ transacciones/día.
• Lideré la migración de un monolito Flask a microservicios, reduciendo latencia p95 de 800ms a 120ms.
• Mentoré a 3 desarrolladores junior en buenas prácticas Python.

Backend Developer
MercadoLibre Chile | Santiago
Enero 2020 — Febrero 2022
• Implementé 15+ endpoints REST con FastAPI y PostgreSQL sirviendo a la app móvil (4M MAU).
• Optimicé queries SQL reduciendo tiempo de respuesta en 60%.
• Diseñé el sistema de caché con Redis para catálogo de productos.

FORMACIÓN ACADÉMICA

Ingeniería Civil en Informática
Universidad de Chile | 2015 — 2019
Tesis: "Optimización de consultas en bases de datos distribuidas"

HABILIDADES TÉCNICAS
Python, FastAPI, PostgreSQL, Redis, Docker, Kafka, SQL, TypeScript, Node.js, AWS

IDIOMAS
Español (Nativo), Inglés (Avanzado C1), Portugués (Intermedio B1)

CERTIFICACIONES
AWS Certified Solutions Architect — Associate (2023)
Google Cloud Professional Cloud Developer (2022)`,
  extraction: {
    contacto: {
      nombre_completo: 'Ana María Alarcón Vergara',
      email: 'ana.alarcon@email.com',
      telefono: '+56 9 8765 4321',
      ubicacion: 'Santiago, Chile',
      linkedin: 'linkedin.com/in/anaalarcon',
      github: 'github.com/anaalarcon',
    },
    titular_profesional: { titular: 'Backend Developer' },
    resumen_profesional: {
      resumen: 'Backend Developer con 5 años de experiencia en Python, FastAPI y arquitecturas distribuidas. Experiencia en empresas de alto volumen como PayPal LatAm y MercadoLibre Chile. Enfocada en sistemas escalables, event-driven architecture y mentoring técnico.',
    },
    experiencia_laboral: [
      {
        cargo: 'Senior Backend Developer',
        empresa: 'PayPal LatAm',
        ubicacion: 'Remoto',
        periodo: 'Marzo 2022 — Presente',
        responsabilidades: [
          'Diseñé la arquitectura event-driven del nuevo checkout usando Kafka y FastAPI, procesando 2M+ transacciones/día.',
          'Lideré la migración de un monolito Flask a microservicios, reduciendo latencia p95 de 800ms a 120ms.',
          'Mentoré a 3 desarrolladores junior en buenas prácticas Python.',
        ],
      },
      {
        cargo: 'Backend Developer',
        empresa: 'MercadoLibre Chile',
        ubicacion: 'Santiago',
        periodo: 'Enero 2020 — Febrero 2022',
        responsabilidades: [
          'Implementé 15+ endpoints REST con FastAPI y PostgreSQL sirviendo a la app móvil (4M MAU).',
          'Optimicé queries SQL reduciendo tiempo de respuesta en 60%.',
          'Diseñé el sistema de caché con Redis para catálogo de productos.',
        ],
      },
    ],
    formacion_academica: [
      {
        titulo: 'Ingeniería Civil en Informática',
        institucion: 'Universidad de Chile',
        periodo: '2015 — 2019',
        detalle: 'Tesis: "Optimización de consultas en bases de datos distribuidas"',
      },
    ],
    habilidades: {
      tecnicas: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker', 'Kafka', 'SQL', 'TypeScript', 'Node.js', 'AWS'],
      blandas: ['Liderazgo técnico', 'Mentoring', 'Comunicación efectiva', 'Trabajo en equipo', 'Resolución de problemas'],
      idiomas: [
        { idioma: 'Español', nivel: 'nativo' },
        { idioma: 'Inglés', nivel: 'avanzado C1' },
        { idioma: 'Portugués', nivel: 'intermedio B1' },
      ],
    },
    certificaciones: [
      { nombre: 'AWS Certified Solutions Architect — Associate', año: '2023' },
      { nombre: 'Google Cloud Professional Cloud Developer', año: '2022' },
    ],
    perfiles_online: ['linkedin.com/in/anaalarcon', 'github.com/anaalarcon'],
    confianza_general: 0.94,
    advertencias: [],
  },
  campaign: {
    titulo: 'Senior Python Developer',
    modalidad: 'Remoto Global',
    experiencia_minima: '3 años',
    habilidades_requeridas: ['Python', 'FastAPI', 'PostgreSQL', 'Docker'],
    habilidades_deseables: ['Kafka', 'AWS', 'TypeScript'],
    nivel_educacion: 'Ingeniería o título técnico afín',
    idiomas: ['Español', 'Inglés'],
  },
  scoring: {
    overall_score: 96,
    recommendation: 'strong_fit',
    recommendation_label: 'Compatibilidad alta',
    summary: 'Candidata sólida con experiencia probada en el stack exacto del puesto. Supera los requisitos mínimos de experiencia y presenta certificaciones cloud relevantes.',
    breakdown: [
      { dim: 'skills', label: 'Skills técnicos', score: 98, weight: '30%', matchTooltip: 'Requerido: Python, FastAPI, PostgreSQL, Docker — Tiene: Python, FastAPI, PostgreSQL, Docker + TypeScript, Node.js, AWS' },
      { dim: 'experience', label: 'Experiencia', score: 95, weight: '25%', matchTooltip: 'Requerido: 3 años — Tiene: 5 años' },
      { dim: 'education', label: 'Educación', score: 88, weight: '15%', matchTooltip: 'Requerido: Ingeniería o título técnico — Tiene: Ingeniería Civil Informática (U. de Chile)' },
      { dim: 'cultural_fit', label: 'Fit cultural', score: 92, weight: '15%', matchTooltip: 'Requerido: Remoto Global — Tiene: experiencia remota en PayPal LatAm' },
      { dim: 'logistics', label: 'Logística', score: 100, weight: '10%', matchTooltip: 'Requerido: sin restricciones horarias — Tiene: huso horario GMT-3 compatible' },
      { dim: 'trajectory', label: 'Trayectoria', score: 90, weight: '5%', matchTooltip: 'Tiene: experiencia en startup (MercadoLibre Chile) + big tech (PayPal LatAm)' },
    ],
    strengths: [
      '5 años de experiencia con Python y FastAPI, supera el mínimo de 3 años.',
      'Experiencia directa con Kafka y arquitectura event-driven, alineada con el stack del puesto.',
      'Certificaciones AWS y GCP validan conocimiento en cloud.',
      'Inglés C1 cumple requisito de comunicación para modalidad remoto global.',
    ],
    gaps: [
      'No menciona experiencia explícita con CI/CD pipelines (se asume por AWS cert pero no está declarado).',
    ],
  },
};

export const REQUIRED_MATCH = new Set(SAMPLE.campaign.habilidades_requeridas);

export function isSkillMatch(skill: string): boolean {
  return REQUIRED_MATCH.has(skill);
}
