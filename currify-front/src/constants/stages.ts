export const STAGES: Record<string, { label: string; chip: string; dot: string }> = {
  revision:   { label: 'En revisión',  chip: 'bg-midt text-mid t-midt t-mid', dot: 'bg-mid' },
  contactar:  { label: 'Por contactar', chip: 'bg-midt text-mid t-midt t-mid', dot: 'bg-mid' },
  entrevista: { label: 'En entrevista', chip: 'bg-goodt text-good t-goodt t-good', dot: 'bg-good' },
  oferta:     { label: 'En oferta',     chip: 'bg-goodt text-good t-goodt t-good', dot: 'bg-good' },
  contratado: { label: 'Contratado',    chip: 'bg-greendeep text-onmark', dot: 'bg-yellow' },
  descartado: { label: 'Descartado',    chip: 'bg-lowt text-low t-lowt t-low', dot: 'bg-low' },
};

export function mapStage(status?: string): string {
  const m: Record<string, string> = {
    NEW: 'revision', IN_PROCESS: 'entrevista', SELECTED: 'oferta', NOT_SELECTED: 'descartado'
  };
  return m[status || ''] || 'revision';
}
