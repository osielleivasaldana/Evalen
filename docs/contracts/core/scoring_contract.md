# Scoring Contract

`POST /scoring/evaluate` -> `ScoringResponse { overall_score: 0-100, recommendation: strong_fit|moderate_fit|weak_fit, breakdown: Dict[str, DimensionScore], strengths: List[str], gaps: List[str], summary: str }`

## Invariantes

- **Breakdown por-dimensión graceful**: cada dimensión (`skills_match`, `experience`, `education`, `cultural_fit`, `logistics`, `career_trajectory`) calcula score determinista independiente; si falta dato, dimensión = `0` sin contaminar otras (ej. `education=0` si `formacion_academica` vacía, `logistics=0` si `ubicacion` vacía)
- **Overall determinista**: `overall = Σ(score*weight/100)` desde `deterministic_scores`; pesos fijos `skills 30, experience 25, education 15, cultural 15, logistics 10, trajectory 5` (suman 100); thresholds `≥80 strong_fit, ≥60 moderate_fit, <60 weak_fit`
- **overall ≠ 0 si parcial**: nunca `0` si existe al menos `experiencia_laboral` o `habilidades` (tecnicas/blandas/idiomas) o `formacion_academica` o `contacto email válido`; solo `0.0` si `exp+skills+edu+contact` vacíos (guardrail)
- **LLM solo reasoning**: `SCORING_EVALUATION` (temp 0.0) redacta `reasoning` por dimensión y `strengths/gaps/summary`; NUNCA decide `scores` ni `overall`
- **Status por dimensión**: `status = calculated|insufficient_data` (opcional en `api/scoring.py`) según disponibilidad de datos
- **Recovery**: scoring parcial con dimensiones disponibles; embedding/normalización cacheados (`_embedding_cache`, `parsedJobData`); fallback `0` por dimensión no excepción global
- **Indent fix**: `_calculate_matrix_scores` a nivel clase correctamente indentado; `deterministic_scores.get(dim, 0.0)` evita `None`

## Pesos y dimensiones

| Dimensión | Peso | Fuente |
|-----------|------|--------|
| skills_match | 30 | `habilidades_tecnicas` + `SemanticService.expand_skills` + `extract_skills_from_description` |
| experience | 25 | `experiencia_laboral[].responsabilidades` + `normalize_job_titles` + `calculate_similarity` |
| education | 15 | `formacion_academica` + `normalize_degrees` + `infer_degree_from_title` |
| cultural_fit | 15 | `habilidades_blandas` + `DynamicRubric` |
| logistics | 10 | `datos_contacto.ubicacion` + `job.parsedJobData.location/modality` |
| career_trajectory | 5 | `experiencia_laboral` crecimiento |

## Ejemplo

```json
{
  "overall_score": 72.5,
  "recommendation": "moderate_fit",
  "breakdown": {
    "skills_match": {"score": 85, "reasoning": "Selenium + Java match exacto", "status": "calculated"},
    "experience": {"score": 80, "reasoning": "3y QA Lead", "status": "calculated"},
    "education": {"score": 0, "reasoning": "sin formación registrada", "status": "insufficient_data"},
    "cultural_fit": {"score": 70, "reasoning": "Liderazgo evidenciado", "status": "calculated"},
    "logistics": {"score": 60, "reasoning": "Santiago match", "status": "calculated"},
    "career_trajectory": {"score": 65, "reasoning": "trayectoria ascendente", "status": "calculated"}
  },
  "strengths": ["Automatización Selenium"],
  "gaps": ["Falta Inglés Avanzado"],
  "summary": "Candidato QA sólido, fit moderado."
}
```
