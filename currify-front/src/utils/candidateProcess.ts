import { Candidate, CandidateProcessInfo } from '../services/api';

export function getCandidateProcess(c: Pick<Candidate, 'processInstances'>): CandidateProcessInfo | undefined {
  return c.processInstances?.[0];
}

export function hasCandidateProcess(c: Pick<Candidate, 'processInstances'>): boolean {
  return !!getCandidateProcess(c);
}

export function getActiveStageName(c: Pick<Candidate, 'processInstances'>): string | null {
  const p = getCandidateProcess(c);
  if (!p) return null;
  const active = p.stageInstances.find(s => s.status === 'ACTIVE');
  return (active || p.stageInstances[0])?.stageTemplate?.name || null;
}
