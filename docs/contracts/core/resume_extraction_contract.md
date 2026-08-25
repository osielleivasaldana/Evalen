# Resume Extraction Contract

`POST /resume/extract` -> `ResumeExtractionResponse { datos_cv: ResumeData, confianza_general, advertencias, campos_faltantes, request_id, tiempo_procesamiento }` + headers `X-LLM-Prompt-Tokens`, `X-LLM-Completion-Tokens`, `X-LLM-Model`

## Invariantes

- **habilidades_blandas**: `List[str]` consistente prompt+schema, validator `pre=True` dict->str (extrae `skill`/`nombre`/`name`/`habilidad` o primer valor str del dict, trim; ignora vacíos)
- **proyectos.proyectos**: filtrado `LAYOUT` (`"LAYOUT" in nombre.upper()`) y longitud `nombre < 120`; `tecnologias` truncadas a 60 chars y filtradas por LAYOUT; `Items` str < 2 chars descartados
- **titular_profesional**: headline primeras 5 líneas, no grado académico salvo junior sin `experiencia_laboral`; si `titular_from_titles` contiene `magíster|master|doctorado|phd|mba` y existe headline heurística, preferir headline
- **Recovery**: field-level sanitización + `partial` status (`metadata_procesamiento.partial=true`), nunca `minimal` por 1 campo fallido; detector compara `structured_data` vs `resume_data` (`is_empty_post` vs `is_empty_pre`)
- **Anti-contaminación**: regex `---\s*LAYOUT CONTEXT\s*\(PAGE\s*\d+\)\s*---` + `LAYOUT CONTEXT.*` + dedup líneas exactas antes de segmentación; `DocumentAnalyzer` ignora líneas con `LAYOUT CONTEXT`

## Headers

- `X-LLM-Prompt-Tokens`: tokens prompt LLM por request
- `X-LLM-Completion-Tokens`: tokens completion
- `X-LLM-Model`: modelo usado (ej. `gemini-2.5-flash`)

## Recovery jerarquía

1. Sanitización campo-a-campo (dict->str, filtrar LAYOUT)
2. Retry con `ValidationError` (0-1 LLM extra condicional)
3. Fallback heurístico
4. Parcial `confidence*0.7` + `PARTIAL` status

## Ejemplo

```json
{
  "datos_cv": { "datos_contacto": {"nombre_completo": "Candidato QA 15y"}, "titular_profesional": {"titular": "QA Test Lead Automation Engineer"} },
  "confianza_general": 0.85,
  "advertencias": [],
  "campos_faltantes": [],
  "request_id": "req-001",
  "tiempo_procesamiento": 2.3
}
```
