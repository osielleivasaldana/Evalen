import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CandidateDetail from './CandidateDetail';

// Mock Layout to avoid NavBar/auth complexity
jest.mock('../layout/Layout', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }));

jest.mock('../../utils/findKeyFinding', () => ({
  findKeyFinding: () => null,
  hasNegativeMarkers: () => false,
}));

jest.mock('../../constants/stages', () => ({
  STAGES: { revision: { label: 'En revisión', chip: '', dot: '' } },
  mapStage: () => 'revision',
}));

// Need to mock Verdict if it has complex deps, but keep simple
jest.mock('../Verdict', () => ({ __esModule: true, default: ({ text }: any) => <div>{text}</div> }));

const mockGetCandidate = jest.fn();
const mockGetStructured = jest.fn();
const mockGetProcess = jest.fn();

jest.mock('../../services/api', () => ({
  apiService: {
    getCandidate: (...args: any[]) => mockGetCandidate(...args),
    getCandidateStructuredData: (...args: any[]) => mockGetStructured(...args),
    getProcess: (...args: any[]) => mockGetProcess(...args),
    downloadDocument: jest.fn(),
    startProcess: jest.fn(),
    updateStageDecision: jest.fn(),
    updateCandidateStatus: jest.fn(),
  },
}));

// jsdom polyfills for scroll behavior
beforeAll(() => {
  // matchMedia mock — direct assign to window for jsdom
  (window as any).matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
  // IntersectionObserver mock on both global and window
  const MockIO: any = class MockIO {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  (global as any).IntersectionObserver = MockIO;
  (window as any).IntersectionObserver = MockIO;
  Element.prototype.scrollIntoView = jest.fn();
});

describe('CandidateDetail — 04 Habilidades extraídas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProcess.mockResolvedValue({ stageInstances: [] });
  });

  test('04 muestra técnicas, blandas e idiomas (RRHH) — no vacía y contador correcto', async () => {
    mockGetCandidate.mockResolvedValue({
      id: 'c1',
      name: 'Ana RRHH',
      candidateStatus: 'NEW',
      campaign: { title: 'RRHH', id: 'camp1' },
      scoring: { overallScore: 62, breakdown: {}, strengths: ['Fuerte RRHH'], gaps: [], summary: 'Resumen IA' },
      createdAt: new Date().toISOString(),
      email: 'ana@test.com',
      phone: '+56 9 1234',
    });
    mockGetStructured.mockResolvedValue({
      datos_cv: {
        datos_contacto: {},
        titular_profesional: { titular: 'HR Specialist' },
        resumen_profesional: { resumen: '' },
        habilidades: {
          habilidades_tecnicas: [{ skill: 'Gestión RRHH', level: 'Avanzado', years_experience: null, metadata: null }],
          idiomas: [{ idioma: 'Inglés', nivel: 'Intermedio-Avanzado', certificacion: '', metadata: null }],
          habilidades_blandas: ['Liderazgo', 'Gestión de stakeholders'],
        },
        experiencia_laboral: [],
        formacion_academica: [],
        formacion_complementaria: { certificaciones_cursos: [] },
      },
      confianza_general: 0.8,
    });

    render(<CandidateDetail candidateId="c1" onBack={() => {}} />);

    expect(await screen.findByText('04 · Habilidades extraídas')).toBeInTheDocument();
    expect(await screen.findByText('Gestión RRHH')).toBeInTheDocument();
    expect(await screen.findByText('Liderazgo')).toBeInTheDocument();
    expect(await screen.findByText('Gestión de stakeholders')).toBeInTheDocument();
    expect(await screen.findByText('Inglés')).toBeInTheDocument();

    // Verifica contador de tira: 1 téc. · 2 blandas · 1 id. y total 3 (1+2)
    // La tira es {skills+soft} + detalle. Buscamos texto combinado
    expect(screen.getByText(/1 téc\./)).toBeInTheDocument();
    expect(screen.getByText(/2 blandas/)).toBeInTheDocument();
    expect(screen.getByText(/1 id\./)).toBeInTheDocument();

    // No debe mostrar empty
    expect(screen.queryByText('No se encontraron habilidades extraídas.')).not.toBeInTheDocument();

    // Verifica secciones separadas
    expect(screen.getByText('Técnicas y de dominio')).toBeInTheDocument();
    expect(screen.getByText('Blandas · Interpersonales')).toBeInTheDocument();
    expect(screen.getByText('Idiomas')).toBeInTheDocument();
  });

  test('empty con hint cuando solo strengths (sin habilidades extraídas)', async () => {
    mockGetCandidate.mockResolvedValue({
      id: 'c2',
      name: 'Carlos Empty',
      candidateStatus: 'NEW',
      campaign: { title: 'Ventas', id: 'camp2' },
      scoring: {
        overallScore: 45,
        breakdown: {},
        strengths: ['Fuerte comunicación', 'Experiencia en ventas consultivas'],
        gaps: ['Falta inglés'],
        summary: 'Candidato con strengths pero sin sección habilidades',
      },
      createdAt: new Date().toISOString(),
      email: 'carlos@test.com',
      phone: '',
    });
    mockGetStructured.mockResolvedValue({
      datos_cv: {
        datos_contacto: {},
        titular_profesional: { titular: '' },
        resumen_profesional: { resumen: '' },
        habilidades: {
          habilidades_tecnicas: [],
          idiomas: [],
          habilidades_blandas: [],
        },
        experiencia_laboral: [],
        formacion_academica: [],
        formacion_complementaria: { certificaciones_cursos: [] },
      },
      confianza_general: 0.5,
    });

    render(<CandidateDetail candidateId="c2" onBack={() => {}} />);

    expect(await screen.findByText('04 · Habilidades extraídas')).toBeInTheDocument();
    expect(await screen.findByText('No se encontraron habilidades extraídas.')).toBeInTheDocument();

    // Hint debe aparecer porque strengths.length >0
    expect(screen.getByText(/El CV no trae sección estructurada de habilidades/)).toBeInTheDocument();
    const btn = screen.getByText('Lo que suma');
    expect(btn).toBeInTheDocument();
    expect(btn.tagName.toLowerCase()).toBe('button');

    // Contador en tira debe ser 0 téc. · 0 blandas · 0 id.
    expect(screen.getByText(/0 téc\./)).toBeInTheDocument();
    expect(screen.getByText(/0 blandas/)).toBeInTheDocument();
    expect(screen.getByText(/0 id\./)).toBeInTheDocument();

    // No debe mostrar secciones técnicas/blandas/idiomas
    expect(screen.queryByText('Técnicas y de dominio')).not.toBeInTheDocument();
    expect(screen.queryByText('Blandas · Interpersonales')).not.toBeInTheDocument();
    // Idiomas solo si hay; aquí langs vacío => no render
    expect(screen.queryByText(/^Idiomas$/)).not.toBeInTheDocument();
  });

  test('empty sin hint cuando tampoco hay strengths', async () => {
    mockGetCandidate.mockResolvedValue({
      id: 'c3',
      name: 'Sin Datos',
      candidateStatus: 'NEW',
      campaign: { title: 'Admin', id: 'camp3' },
      scoring: { overallScore: 30, breakdown: {}, strengths: [], gaps: [], summary: '' },
      createdAt: new Date().toISOString(),
      email: '',
      phone: '',
    });
    mockGetStructured.mockResolvedValue({
      datos_cv: {
        datos_contacto: {},
        titular_profesional: { titular: '' },
        resumen_profesional: { resumen: '' },
        habilidades: {
          habilidades_tecnicas: [],
          idiomas: [],
          habilidades_blandas: [],
        },
        experiencia_laboral: [],
        formacion_academica: [],
        formacion_complementaria: { certificaciones_cursos: [] },
      },
      confianza_general: 0.2,
    });

    render(<CandidateDetail candidateId="c3" onBack={() => {}} />);
    expect(await screen.findByText('No se encontraron habilidades extraídas.')).toBeInTheDocument();
    expect(screen.queryByText(/El CV no trae sección estructurada/)).not.toBeInTheDocument();
  });
});
