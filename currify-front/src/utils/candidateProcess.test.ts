import { hasCandidateProcess, getActiveStageName } from './candidateProcess';

describe('candidateProcess helpers', () => {
  const withProcess = {
    processInstances: [{
      id: 'p1',
      currentStageOrder: 2,
      stageInstances: [
        { id: 's1', status: 'ACCEPTED', stageTemplate: { id: 't1', name: 'Contactar', order: 1 } },
        { id: 's2', status: 'ACTIVE', stageTemplate: { id: 't2', name: 'Entrevista técnica', order: 2 } }
      ]
    }]
  } as any;

  it('detecta candidato con proceso', () => {
    expect(hasCandidateProcess(withProcess)).toBe(true);
    expect(hasCandidateProcess({ processInstances: [] } as any)).toBe(false);
    expect(hasCandidateProcess({} as any)).toBe(false);
  });

  it('devuelve el nombre de la etapa activa', () => {
    expect(getActiveStageName(withProcess)).toBe('Entrevista técnica');
  });

  it('devuelve null sin proceso', () => {
    expect(getActiveStageName({} as any)).toBeNull();
  });
});
