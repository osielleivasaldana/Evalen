const NEG_WORDS = new Set([
  'carece', 'carecen', 'carente', 'carencia', 'falta', 'faltan', 'faltante',
  'insuficiente', 'insuficientes', 'limitada', 'limitado', 'limitadas', 'limitados',
  'escasa', 'escaso', 'escasas', 'escasos', 'ausencia', 'ausente', 'inexistente',
  'nula', 'nulo', 'deficiente', 'debilidad', 'debilidades', 'brecha', 'brechas',
  'incipiente', 'carentes',
]);

const NEG_PHRASES = [
  'no demuestra', 'no cuenta', 'no posee', 'no detalla', 'no detallan',
  'no presenta', 'no evidencia', 'no se observa', 'no hay evidencia',
  'no menciona', 'no muestra', 'sin experiencia', 'sin formación',
  'aún no', 'todavía no', 'falta total', 'falta de', 'no se alinea',
];

const normalize = (s: string): string =>
  s.toLowerCase().replace(/[.,;:!?()"“”«»'–—]/g, ' ');

const tokenize = (s: string): string[] =>
  normalize(s).split(/\s+/).filter(w => w.length > 3);

export const hasNegativeMarkers = (text: string): boolean => {
  const norm = normalize(text);
  if (NEG_PHRASES.some(p => norm.includes(p))) return true;
  return tokenize(norm).some(w => NEG_WORDS.has(w));
};

// Hallazgo clave: oración del summary con mayor solapamiento léxico contra el
// razonamiento del criterio con peor puntaje ("el hallazgo que más pesó en esta nota").
// Con puntaje bajo (<60) solo se subrayan oraciones con marcadores negativos:
// evita resaltar en amarillo algo que la nota contradice (p.ej. razonamiento
// elogioso con score 0 por contradicción del LLM).
export const findKeyFinding = (summary: string, weakestReasoning: string, weakestScore: number): string | null => {
  if (!summary || !weakestReasoning) return null;

  const reasonWords = new Set(tokenize(weakestReasoning));
  const sentences = summary.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [summary];

  const scored = sentences
    .map(raw => raw.trim())
    .filter(Boolean)
    .map(sentence => {
      const words = tokenize(sentence);
      if (!words.length) return null;
      const hits = words.filter(w => reasonWords.has(w)).length;
      return { sentence, score: hits / words.length, hasNeg: hasNegativeMarkers(sentence) };
    })
    .filter((s): s is { sentence: string; score: number; hasNeg: boolean } => s !== null && s.score >= 0.35)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;

  if (weakestScore < 60) {
    const withNeg = scored.find(s => s.hasNeg);
    return withNeg ? withNeg.sentence : null;
  }

  return scored[0].sentence;
};
