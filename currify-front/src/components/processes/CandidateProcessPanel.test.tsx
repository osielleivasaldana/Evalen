import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CandidateProcessPanel from './CandidateProcessPanel';
import { apiService } from '../../services/api';

// NavBar (montado por Layout) usa useAuth() (lanza sin provider) y
// apiService.isAuthenticated()/getProfile() en useEffect — se mockea Layout
// para aislar el panel del shell de navegación.
jest.mock('../layout/Layout', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }));

jest.mock('../../services/api', () => {
  const actual = jest.requireActual('../../services/api');
  return {
    ...actual,
    apiService: {
      getProcess: jest.fn(),
      getCampaign: jest.fn(),
      getCandidate: jest.fn(),
      generateStageGuide: jest.fn(),
      updateStageNotes: jest.fn(),
      updateStageDecision: jest.fn(),
      reopenProcess: jest.fn(),
    },
  };
});

const stages = [
  { id: 's1', status: 'ACCEPTED', feedback: 'Buen inicio', decision: 'ACCEPTED', decidedAt: '2026-08-02T16:33:00Z', guideJson: undefined, notesJson: undefined, stageTemplate: { id: 't1', name: 'Contactar', order: 1 }, responsible: { id: 'o1', name: 'Osiel Leiva', email: '' }, createdAt: '', updatedAt: '' },
  { id: 's2', status: 'ACTIVE', feedback: undefined, decision: undefined, decidedAt: undefined, guideJson: undefined, notesJson: undefined, stageTemplate: { id: 't2', name: 'Entrevista Técnica', order: 2 }, responsible: { id: 'r1', name: 'Nadia Fuentes', email: '' }, createdAt: '', updatedAt: '' },
  { id: 's3', status: 'PENDING', feedback: undefined, decision: undefined, decidedAt: undefined, guideJson: undefined, notesJson: undefined, stageTemplate: { id: 't3', name: 'Entrevista final', order: 3 }, responsible: { id: 'o1', name: 'Osiel Leiva', email: '' }, createdAt: '', updatedAt: '' },
];

const ownerProcess: any = {
  id: 'proc-1', startDate: '2026-08-02T16:29:00Z', endDate: null, currentStageOrder: 2,
  viewer: 'OWNER', sensitive: { salary: '$1.8M CLP', modality: 'Híbrido' },
  candidate: { id: 'c1', name: 'Marta George Quiroz' },
  campaign: { id: 'camp-1', title: 'Tecnólogo médico' },
  stageInstances: stages, auditLogs: [], createdAt: '', updatedAt: '',
};
const respProcess: any = {
  viewer: 'STAGE_RESPONSIBLE', processId: 'proc-1', startDate: '2026-08-02T16:29:00Z',
  candidate: { id: 'c1', name: 'Marta George Quiroz' },
  campaign: { id: 'camp-1', title: 'Tecnólogo médico' },
  stageInstances: [stages[1]], createdAt: '', updatedAt: '',
};

const renderPanel = (process: any, candidate: any = { id: 'c1', name: 'Marta George Quiroz' }) => {
  (apiService.getProcess as jest.Mock).mockResolvedValue(process);
  (apiService.getCampaign as jest.Mock).mockResolvedValue({ id: 'camp-1', title: 'Tecnólogo médico' });
  (apiService.getCandidate as jest.Mock).mockResolvedValue(candidate);
  return render(
    <MemoryRouter initialEntries={['/campaigns/camp-1/candidates/c1/process']}>
      <Routes>
        <Route path="/campaigns/:campaignId/candidates/:candidateId/process" element={<CandidateProcessPanel />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('CandidateProcessPanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('modo dueño: renderiza acta, progreso y mesa', async () => {
    renderPanel(ownerProcess);
    expect(await screen.findByText('Acta del proceso')).toBeInTheDocument();
    expect(screen.getByText('Progreso del proceso')).toBeInTheDocument();
    expect(screen.getByText('Etapa 2 de 3')).toBeInTheDocument();
    expect(screen.getByText('Marta George Quiroz')).toBeInTheDocument();
    expect(await screen.findByText('Acceso completo · dueño')).toBeInTheDocument();
  });

  it('modo dueño: muestra info sensible derivada', async () => {
    renderPanel(ownerProcess);
    const sens = await screen.findAllByText(/Pretensiones: \$1\.8M CLP/);
    expect(sens.length).toBeGreaterThan(0);
  });

  it('modo sandbox: NO renderiza acta ni progreso, sí su etapa', async () => {
    renderPanel(respProcess);
    expect(await screen.findByText(/Mi etapa asignada/)).toBeInTheDocument();
    expect(screen.queryByText('Acta del proceso')).not.toBeInTheDocument();
    expect(screen.queryByText('Progreso del proceso')).not.toBeInTheDocument();
    expect(screen.queryByText('Etapa 2 de 3')).not.toBeInTheDocument();
    expect(screen.getByText('Entrevista Técnica')).toBeInTheDocument();
  });

  it('genera la guía desde el botón y la pinta con chips de procedencia', async () => {
    (apiService.generateStageGuide as jest.Mock).mockResolvedValue({
      questions: [
        { question: '¿Cuéntame de un proyecto React?', source: 'perfil' },
        { question: '¿Cómo abordarías testing?', source: 'brecha' },
      ],
    });
    renderPanel(respProcess);
    fireEvent.click(await screen.findByText(/Generar preguntas con IA/));
    expect(await screen.findByText('¿Cuéntame de un proyecto React?')).toBeInTheDocument();
    expect(screen.getByText('Perfil del cargo')).toBeInTheDocument();
    expect(screen.getByText('Brecha en CV')).toBeInTheDocument();
    expect(apiService.generateStageGuide).toHaveBeenCalledWith('proc-1', 's2');
  });

  it('rechazar sin feedback muestra error y no llama a la API', async () => {
    renderPanel(respProcess);
    fireEvent.click(await screen.findByText(/Rechazar etapa/));
    expect(await screen.findByText('La retroalimentación es obligatoria al rechazar una etapa.')).toBeInTheDocument();
    expect(apiService.updateStageDecision).not.toHaveBeenCalled();
  });

  it('reabre el proceso desde estado terminal', async () => {
    renderPanel(ownerProcess, { id: 'c1', name: 'Marta George Quiroz', candidateStatus: 'NOT_SELECTED' });
    fireEvent.click(await screen.findByText(/Reabrir proceso/));
    await waitFor(() => expect(apiService.reopenProcess).toHaveBeenCalledWith('proc-1'));
  });
});