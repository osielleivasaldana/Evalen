# **SDD: Auditoría y Corrección del Motor de Scoring y Prompt Engineering**

**Estado:** Propuesta Técnica — Pendiente Implementación

**Versión:** 1.1

**Fecha:** 2026-06-07

**Responsable:** Prompt Engineering & AI Core Expert

---

## **Tabla de Contenidos**

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Problemas Detectados](#2-problemas-detectados)
3. [Arquitectura Propuesta](#3-arquitectura-propuesta)
4. [Diseño Detallado de Correcciones](#4-diseño-detallado-de-correcciones)
5. [Prompts Rediseñados](#5-prompts-rediseñados)
6. [Modelos de Datos](#6-modelos-de-datos)
7. [Estrategia de Evaluación (LLM-as-a-Judge)](#7-estrategia-de-evaluación-llm-as-a-judge)
8. [Plan de Implementación por Fases](#8-plan-de-implementación-por-fases)
9. [Métricas de Éxito](#9-métricas-de-éxito)

---

## **1. Resumen Ejecutivo**

Este SDD documenta la auditoría completa del motor de scoring de candidatos en `currify-core` y propone un plan de corrección estructurado. Se detectaron **6 bugs activos** (2 críticos, 3 de alta severidad, 1 medio) que provocan falsos positivos en el matching —por ejemplo, un Ingeniero de Sistemas obtiene puntuación alta en educación para un puesto de Médico Veterinario— y distorsionan la puntuación de experiencia y trayectoria profesional.

### **¿Por qué es necesario este cambio?**

| Problema | Impacto en Usuario |
|----------|-------------------|
| Educación ignora el campo de estudio | Candidatos de disciplinas completamente distintas obtienen 100/100 en educación |
| Career trajectory tiene código muerto | La puntuación de trayectoria se sobrescribe incorrectamente, penalizando o beneficiando al azar |
| Fallback de roles da crédito artificial | Experiencia en área completamente distinta obtiene 50/100 de base en vez de 0 |
| Expansión semántica con ejemplos contradictorios | Skills genéricos polucionan el matching y producen falsos positivos |
| No hay detección de cambio de dominio | El sistema no puede identificar que un candidato viene de una industria completamente distinta |
| LLM usado como adorno en scoring | Se gastan tokens del LLM para generar scores que luego se sobreescriben con lógica determinista |

### **¿Qué ganamos?**

| Beneficio | Detalle |
|-----------|---------|
| **Precisión de matching** | Detección de cambios de dominio con guardrail que resetea scores a 0 cuando corresponda |
| **Consistencia determinista** | Educación compara campo de estudio + nivel, no solo nivel académico |
| **Eficiencia de tokens** | El prompt de scoring se rediseña para que el LLM solo genere reasoning, no scores que se descartan |
| **Testabilidad** | LLM-as-a-Judge específico para scoring valida cada fix cuantitativamente |
| **Robustez semántica** | Thresholds de similitud ajustados con ventanas dinámicas según el dominio |

---

## **2. Problemas Detectados**

### **2.1 🔴 CRITICAL: Career Trajectory Sobrescrito (scoring_service.py:546-548)**

```python
# Código actual con bug:
if role_match_score >= 60:
    scores['career_trajectory'] = 70  # ← Código muerto
scores['career_trajectory'] = 30 if roles_mismatch else 70  # ← Sobrescribe lo anterior
```

**Síntoma:** La primera asignación `= 70` jamás tiene efecto. Si `role_match_score >= 60` y `roles_mismatch = True` (ej. Ingeniero postulando a Médico, pero con skills transferibles), el score final es **30** en vez de los 70 que la lógica pretendía.

### **2.2 🔴 CRITICAL: Educación Solo Revisa Nivel, No Campo (scoring_service.py:237-258)**

```python
# Fallback cuando no hay required_degrees en la rúbrica:
job_title_level, _ = self.education_normalizer.normalize_degree(job_title)
# "Médico Veterinario" → level 6
# "Ingeniero Informático" → level 6 también

if max_cand_level >= job_title_level:
    scores['education'] = 100  # ← FALSO POSITIVO
```

**Síntoma:** Cualquier título universitario matchea cualquier trabajo que requiera título universitario. No hay verificación de campo de estudio.

### **2.3 🟡 HIGH: Fallback de Roles Oculta Mismatches (scoring_service.py:337-423)**

```python
if not req_roles:
    req_roles = [job_title.lower().strip()]
    used_fallback_role = True

# ...más adelante...
if used_fallback_role:
    if role_match_score < 50:
        role_match_score = 50  # ← Boost artificial
    roles_mismatch = False  # ← Limpia la bandera de mismatch
```

**Síntoma:** Cuando la rúbrica no define roles clave, el sistema usa el título del puesto comorol. Si no hay match (esperable cuando el candidato es de otro campo), fuerza el score a 50 y borra el flag de `roles_mismatch`, impidiendo que la penalización se propague a `years_score`, `industry_score` y `career_trajectory`.

### **2.4 🟡 HIGH: Rúbrica Forzada se Autocircula (dynamic_rubric_service.py:88-101)**

```python
if not rubric.education.required_degrees and job_title != GENERIC_FALLBACK:
    rubric.education.required_degrees = [job_title]
    rubric.education.kill_clause = True  # ← Exige match exacto
```

**Síntoma:** El sistema usa el nombre del puesto ("Médico Veterinario") como si fuera un título académico requerido y activa `kill_clause`. Si los embeddings no discriminan bien entre campos distintos, un Ingeniero puede obtener 0 o 100 dependiendo de la suerte con el threshold de similitud.

### **2.5 🟡 HIGH: Expansión Semántica Contradice su Propia Regla Strict Mode (semantic_service.py:73-97)**

El prompt dice:
```
RULES (STRICT MODE):
3. REJECT probabilistic associations. (e.g., Accounting -> Excel is REJECTED)
```

Pero el ejemplo inmediato viola la regla:
```
Input: ["Django", "React"]
Output: ["django", "python", "backend", "react", "javascript", "frontend"]
```

**Síntoma:** "frontend" no es una dependencia técnica de React; es una categoría. Esto entrena al LLM a incluir términos genéricos que luego generan falsos positivos en el matching de skills. Un candidato con "React" expande a "frontend", y si la rúbrica pide "frontend" (para otro puesto), se cuenta como match.

### **2.6 🟡 MEDIUM: El LLM en Scoring se Usa Solo para Reasoning Decorativo (scoring_service.py:552-617 y 639-653)**

El prompt instruye:
> "Tu trabajo es aceptar ese score base... No debes contradecir matemáticamente los puntajes base"

Pero luego en `_parse_llm_response`:
```python
LOCKED_DIMENSIONS = ['education', 'experience', 'skills_match']
final_score = det_score  # ← El score del LLM se descarta
```

**Síntoma:** Por cada evaluación de scoring, el LLM genera scores numéricos que son **inmediatamente sobreescritos** por la lógica determinista. Se desperdician tokens (y costo) en generar datos que nunca se usan. El LLM debería solo generar `reasoning`, `strengths`, `gaps` y `summary`.

---

## **3. Arquitectura Propuesta**

### **3.1 Diagrama de Flujo del Pipeline de Scoring Corregido**

```
┌─────────────────────────────────────────────────────────────────┐
│                    JOB DESCRIPTION                              │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  dynamic_rubric_service     (Genera StructuredRubric)          │
│  • Inferencia de grados requeridos con SINÓNIMOS por campo     │
│  • Si es vago, usa LLM con FEW-SHOT para inferir dominio       │
│  • NO inyecta job_title como degree (usa inferencia semántica) │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  DOMAIN CLASSIFIER (NUEVO)                                      │
│  • Detecta si el dominio del CV es compatible con el del puesto │
│  • Usa embeddings + clasificación por clusters de industria     │
│  • Output: "SAME_DOMAIN" | "ADJACENT_DOMAIN" | "DIFFERENT"     │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  scoring_service._calculate_matrix_scores  (CORREGIDO)         │
│                                                                  │
│  EDUCATION:                                                     │
│   1. Si hay required_degrees →                                     │
│      a. Nivel académico (normalize_degree)                     │
│      b. Campo de estudio (embedding + threshold DINÁMICO)      │
│   2. Si NO hay → inferir campo desde job_title + sinónimos      │
│   3. DomainClassifier.DIFFERENT → education = 0               │
│                                                                  │
│  EXPERIENCE:                                                    │
│   1. DomainClassifier.DIFFERENT → experience = 0               │
│   2. Role matching con threshold DINÁMICO según dominio         │
│   3. Fallback roles: NO da boost artificial, deja score bajo    │
│                                                                  │
│  CAREER_TRAJECTORY (BUG FIXED):                                 │
│   if role_match_score >= 60:                                    │
│       traj = 70                                                 │
│   elif roles_mismatch:                                          │
│       traj = 30                                                 │
│   else:                                                         │
│       traj = 70                                                 │
│                                                                  │
│  SKILLS:                                                        │
│   • Expansión semántica con ejemplos STRICT MODE reales        │
│   • Threshold de similitud ajustado por categoría de skill     │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  scoring_service._build_evaluation_prompt (REDISEÑADO)         │
│  • LLM solo genera: reasoning, strengths, gaps, summary        │
│  • Scores vienen 100% de la matriz determinista                 │
│  • Ahorro de ~40% tokens por evaluación                         │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ScoringResponse                                               │
│  • overall_score calculado con pesos corregidos                │
│  • breakdown con scores 100% deterministas                     │
│  • reasoning generado por LLM (cualitativo)                    │
└─────────────────────────────────────────────────────────────────┘
```

### **3.2 Nuevo Componente: DomainClassifier**

Se introduce un nuevo servicio con la responsabilidad exclusiva de detectar si el dominio del CV del candidato es compatible con el dominio del puesto.

```
DomainClassifier
├── extract_domain(text: str) -> str          # Extrae dominio del CV/puesto
├── classify(doc1_domain: str, doc2_domain: str, similarity: float) -> DomainMatch
└── DOMAIN_MAP: Dict[str, DomainInfo]         # Mapa de dominios conocidos
```

**Output:** Enum `DomainMatch { SAME_DOMAIN, ADJACENT_DOMAIN, DIFFERENT_DOMAIN }`

---

## **4. Diseño Detallado de Correcciones**

### **4.1 Fix 1: Career Trajectory (scoring_service.py - Líneas 546-548)**

**Archivo:** `app/services/scoring_service.py`

**Estrategia:** Reemplazar el bloque de asignación secuencial con una estructura if/elif/else que refleje la intención original.

```python
# ANTES (con bug):
if role_match_score >= 60:
    scores['career_trajectory'] = 70
scores['career_trajectory'] = 30 if roles_mismatch else 70

# DESPUÉS (corregido):
if role_match_score >= 60:
    scores['career_trajectory'] = 70
elif roles_mismatch:
    scores['career_trajectory'] = 30
else:
    scores['career_trajectory'] = 50  # Neutral cuando no hay suficiente información
```

**Regla de negocio:**
- `role_match_score >= 60` → trayectoria = 70 (el candidato tiene roles relevantes)
- `roles_mismatch = True` y `role_match_score < 60` → trayectoria = 30 (cambio de rubro sin skills transferibles)
- Caso neutral (no hay suficiente data) → trayectoria = 50

### **4.2 Fix 2: Educación con Verificación de Campo (scoring_service.py - Líneas 237-311)**

**Estrategia:** Separar la verificación de educación en dos ejes ortogonales: **Nivel Académico** y **Campo de Estudio**.

```python
async def _score_education(
    self,
    req_titles: List[str],
    cand_degrees: List[str],
    job_title: str,
    domain_match: DomainMatch
) -> float:
    """
    Evalúa educación en 2 ejes: nivel académico + campo de estudio.
    - Si domain_match == DIFFERENT_DOMAIN → 0 automático
    - Si hay required_degrees → matching semántico con threshold dinámico
    - Si NO hay required_degrees → inferencia de campo desde job_title
    """
    # GUARDRAIL: Diferente dominio → educación irrelevante
    if domain_match == DomainMatch.DIFFERENT_DOMAIN:
        logger.info("🎓 Domain mismatch detected. Education score = 0")
        return 0.0

    # EJE 1: Nivel Académico
    req_level = self.education_normalizer.extract_required_level(req_titles) if req_titles else 0
    max_cand_level = max(
        (self.education_normalizer.normalize_degree(d)[0] for d in cand_degrees),
        default=0
    )

    # EJE 2: Campo de Estudio
    field_match_score = await self._score_field_match(req_titles, cand_degrees, job_title)

    # Si no hay nivel requerido, solo cuenta el campo
    if req_level == 0:
        return field_match_score * 100

    # Nivel insuficiente → 0 (incluso con campo correcto)
    if not self.education_normalizer.check_level_match(max_cand_level, req_level):
        return 0.0

    # Combinar: nivel * peso_campo
    level_ok = 1.0
    return level_ok * field_match_score * 100
```

**Nuevo método auxiliar:**

```python
async def _score_field_match(
    self,
    req_titles: List[str],
    cand_degrees: List[str],
    job_title: str
) -> float:
    """
    Calcula qué tan relacionado está el campo de estudio del candidato
    con el campo requerido. Retorna 0.0 a 1.0.
    """
    # Inferir campo del job_title si no hay required_degrees
    effective_req = req_titles if req_titles else [job_title]

    best_sim = 0.0
    for req in effective_req:
        for cand in cand_degrees:
            # Threshold DINÁMICO: más estricto para campos distintos
            # Usa 0.75 como base (permite sinónimos) pero requiere 0.90+ para match total
            sim = await self.semantic_service.calculate_similarity(req, cand)

            # Penalización explícita por cambio de dominio léxico
            domain_penalty = self._compute_domain_penalty(req, cand)
            adjusted_sim = sim * domain_penalty

            if adjusted_sim > best_sim:
                best_sim = adjusted_sim

    # Mapear similitud a score
    if best_sim >= 0.90:
        return 1.0      # Mismo campo
    elif best_sim >= 0.75:
        return 0.7      # Campo relacionado
    elif best_sim >= 0.50:
        return 0.3      # Campo tangencial
    else:
        return 0.0      # Campo diferente

def _compute_domain_penalty(self, req: str, cand: str) -> float:
    """
    Penaliza pares que pertenecen a familias léxicas distintas
    (ej. "medicina" vs "ingeniería") usando palabras clave de dominio.
    """
    domain_keywords = {
        "salud": ["medicin", "enfermer", "veterinari", "odontolog", "quirofano",
                  "clinica", "hospital", "paciente", "biolog", "farmac"],
        "ingenieria": ["ingenier", "software", "sistema", "computacion",
                       "informatic", "electron", "mecanic", "civil"],
        "negocios": ["administracion", "contabil", "finanz", "marketing",
                     "economia", "comercial", "venta"],
        "educacion": ["pedagog", "docenc", "profesor", "educacion",
                      "enseñanza", "didactic"],
        "derecho": ["derecho", "abogad", "legal", "juridic", "leyes"],
        "arte": ["disen", "artistic", "visual", "grafic", "creative"],
    }

    req_lower = req.lower()
    cand_lower = cand.lower()

    req_domains = set()
    cand_domains = set()

    for domain, keywords in domain_keywords.items():
        if any(kw in req_lower for kw in keywords):
            req_domains.add(domain)
        if any(kw in cand_lower for kw in keywords):
            cand_domains.add(domain)

    # Si están en dominios diferentes → penalizar
    if req_domains and cand_domains and not req_domains.intersection(cand_domains):
        return 0.3  # Penalización severa por cambio de dominio

    return 1.0  # Sin penalización

```

### **4.3 Fix 3: Fallback de Roles Sin Boost Artificial (scoring_service.py - Líneas 337-423)**

**Estrategia:** Eliminar el boost artificial a 50 y en su lugar implementar una detección de roles por transferencia real.

```python
# ANTES:
if used_fallback_role:
    if role_match_score < 50:
        role_match_score = 50  # ← Boost artificial
    roles_mismatch = False     # ← Limpia bandera

# DESPUÉS:
if used_fallback_role:
    # En lugar de boost artificial, hacer transferability check REAL
    if role_match_score < 50:
        transferable = await self._check_role_transferability(
            candidate_roles=cand_roles_to_check,
            target_role=job_title,
            expanded_skills=expanded_skills
        )
        if transferable:
            role_match_score = 50  # Solo si hay habilidades transferibles reales
            roles_mismatch = True  # Mantener bandera para propagar parcialmente
        else:
            role_match_score = 10  # Sin transferibilidad → score muy bajo
            roles_mismatch = True
    else:
        roles_mismatch = False  # Si matchó realmente, no hay mismatch
```

**Nuevo método auxiliar:**

```python
async def _check_role_transferability(
    self,
    candidate_roles: List[str],
    target_role: str,
    expanded_skills: List[str]
) -> bool:
    """
    Verifica si las habilidades del candidato son transferibles al rol objetivo.
    Usa un LLM pequeño (o lógica de embeddings) para determinar si hay
    superposición de competencias entre industrias distintas.

    Ej: Contador → Analista de datos (SI, skills transferibles)
        Ingeniero → Médico Veterinario (NO, skills no transferibles)
    """
    # Si no hay skills o roles, no hay transferibilidad
    if not expanded_skills or not candidate_roles:
        return False

    # Si tiene skills muy específicas del target, hay transferibilidad
    prompt = f"""
    Eres un analista de transferibilidad profesional.
    Determina si las habilidades y roles de un candidato son TRANSFERIBLES
    a un rol objetivo en OTRA industria.

    Rol objetivo: {target_role}
    Roles del candidato: {candidate_roles}
    Habilidades del candidato: {expanded_skills}

    Responde SOLO con "TRUE" si las habilidades son transferibles
    (ej. un Contador puede ser Analista Financiero porque ambos usan Excel,
    análisis de datos, reporting).
    Responde "FALSE" si NO hay transferibilidad real
    (ej. un Ingeniero de Software no tiene habilidades de Cirugía Veterinaria).

    Respuesta (TRUE/FALSE):
    """

    result = await self.llm_service.call_agent(
        prompt=prompt,
        input_data="",
        stage_name="TRANSFERABILITY_CHECK",
        temperature=0.0
    )

    if isinstance(result, str) and result.strip().upper() == "TRUE":
        return True
    return False
```

### **4.4 Fix 4: Rúbrica Sin Autocirculación (dynamic_rubric_service.py - Líneas 88-101)**

**Estrategia:** En lugar de inyectar `job_title` como grado requerido, usar inferencia semántica del campo de estudio a partir del título del cargo.

```python
# ANTES:
if not rubric.education.required_degrees and job_title != GENERIC_FALLBACK:
    rubric.education.required_degrees = [job_title]
    rubric.education.kill_clause = True

# DESPUÉS:
if not rubric.education.required_degrees and job_title != GENERIC_FALLBACK:
    # Inferir campo de estudio desde job_title usando el LLM
    inferred_degree = await self._infer_degree_from_title(job_title)
    if inferred_degree:
        logger.info(f"🧩 Inferred degree '{inferred_degree}' from job title '{job_title}'")
        rubric.education.required_degrees = [inferred_degree]
        rubric.education.kill_clause = False  # No kill clause porque es inferido
    else:
        # Último recurso: sin grado requerido, scoring usará inferencia propia
        logger.info(f"🧩 Could not infer degree from '{job_title}'. Leaving empty.")
```

**Nuevo método en DynamicRubricService:**

```python
async def _infer_degree_from_title(self, job_title: str) -> Optional[str]:
    """
    Usa el LLM para inferir qué título académico estándar requiere un puesto.
    Ej: "Médico Veterinario" → "Medicina Veterinaria"
        "Desarrollador Full Stack" → "Ingeniería Informática o afín"
        "Recepcionista" → None (no requiere título específico)
    """
    prompt = f"""
    Eres un orientador vocacional y experto en RRHH.

    Dado el siguiente título de puesto de trabajo, infiere cuál es el TÍTULO
    ACADÉMICO estándar que normalmente se requiere para ejercerlo.

    Reglas:
    - Sé preciso. No generalices a "cualquier título universitario".
    - Si el puesto no requiere un título específico (ej. "Recepcionista",
      "Vendedor"), responde "NONE".
    - Si el puesto típicamente requiere una carrera (ej. "Médico Veterinario"
      requiere "Medicina Veterinaria"), responde SOLO el nombre del título.
    - Responde en español.

    Título del puesto: {job_title}

    Respuesta (nombre del título o "NONE"):
    """

    result = await self.llm_service.call_agent(
        prompt=prompt,
        input_data="",
        stage_name="INFER_DEGREE_FROM_TITLE",
        temperature=0.0
    )

    if isinstance(result, str):
        cleaned = result.strip().strip('"').strip("'")
        if cleaned.upper() == "NONE":
            return None
        return cleaned
    return None
```

### **4.5 Fix 5: Expansión Semántica con Ejemplos Strict Mode Reales (semantic_service.py - Líneas 73-97)**

**Estrategia:** Reemplazar los ejemplos del prompt de expansión por ejemplos que realmente cumplan con la regla de "hard dependencies ONLY".

```python
# ANTES (ejemplos contradictorios):
"""
Input: ["Django", "React"]
Output: ["django", "python", "backend", "react", "javascript", "frontend"]
# frontend NO es una dependencia técnica de React
"""

# DESPUÉS (ejemplos strict mode reales):
"""
EXAMPLES:
Input: ["Django", "React"]
Output: ["django", "python", "react", "javascript"]
(Explanation: Python is hard dependency of Django, JavaScript is hard dependency of React.
 "frontend" is REJECTED because it's a category, not a technical dependency.)

Input: ["Docker"]
Output: ["docker", "containerization", "linux"]
(Explanation: Linux is a hard dependency of Docker. Containers are the technology.)

Input: ["SAP", "QuickBooks"]
Output: ["sap", "quickbooks"]
(Explanation: No hard technical dependencies added. "Accounting" is REJECTED
 because it's a domain, not a dependency.)

Input: ["TensorFlow"]
Output: ["tensorflow", "python", "machine learning", "deep learning"]
(Explanation: Python is hard dependency. ML/DL are the technical field of the tool.)

REJECTED (soft associations, domains, categories):
- "React" → "frontend" (REJECTED: it's a category)
- "Excel" → "accounting" (REJECTED: it's a domain)
- "Python" → "data science" (REJECTED: it's a field of application, not dependency)
"""
```

### **4.6 Fix 6: Prompt de Scoring Rediseñado (scoring_service.py - Líneas 552-617)**

**Estrategia:** El prompt ya no pide scores numéricos al LLM. Solo pide reasoning y resumen cualitativo. Esto reduce tokens y elimina la contradicción de generar datos que se descartan.

```python
def _build_evaluation_prompt_with_rubric(self, rubric, baseline_scores) -> str:
    return f"""Eres un Analista Senior de Reclutamiento. Tu tarea es proporcionar una
evaluación CUALITATIVA de un candidato frente a un puesto de trabajo.

⚠️ IMPORTANTE: NO generes puntajes numéricos. El motor de reglas ya calculó
los scores deterministas. Tu trabajo es exclusivamente INTERPRETAR y REDACTAR.

TABLA DE EVALUACIÓN (Puntajes calculados por motor de reglas):
- Educación: {baseline_scores.get('education', 'N/A')}/100
- Experiencia: {baseline_scores.get('experience', 'N/A')}/100
- Skills: {baseline_scores.get('skills_match', 'N/A')}/100
- Cultural Fit: {baseline_scores.get('cultural_fit', 'N/A')}/100
- Logística: {baseline_scores.get('logistics', 'N/A')}/100
- Trayectoria: {baseline_scores.get('career_trajectory', 'N/A')}/100

INSTRUCCIONES:
1. Genera un `reasoning` para cada dimensión explicando los matices cualitativos.
   Ej: "Aunque tiene 5 años de experiencia, los roles no alinean con la rúbrica"
2. Genera listas de `strengths` (fortalezas reales) y `gaps` (debilidades).
3. Genera un `summary` ejecutivo descriptivo (sin incluir porcentajes numéricos).

CRÍTICO: No incluyas puntajes numéricos en el summary.
El score final se calcula por separado.

FORMATO DE SALIDA (JSON):
{{
  "breakdown": {{
    "skills_match": {{"reasoning": "texto"}},
    "experience": {{"reasoning": "texto"}},
    "education": {{"reasoning": "texto"}},
    "cultural_fit": {{"reasoning": "texto"}},
    "logistics": {{"reasoning": "texto"}},
    "career_trajectory": {{"reasoning": "texto"}}
  }},
  "strengths": ["...", "..."],
  "gaps": ["...", "..."],
  "summary": "texto descriptivo sin porcentajes"
}}
"""
```

Ajuste en `_parse_llm_response`:

```python
# Ya no hay LOCKED_DIMENSIONS porque el LLM no genera scores.
# Los scores vienen 100% de deterministic_scores.
for dimension_key, weight in ScoringRubric.WEIGHTS.items():
    dimension_data = breakdown_dict.get(dimension_key, {})
    reasoning = dimension_data.get("reasoning", "Sin explicación")

    # Score 100% determinista
    if deterministic_scores and dimension_key in deterministic_scores:
        final_score = float(deterministic_scores[dimension_key])
    else:
        final_score = 0.0

    # ...resto del cálculo de weighted_score...
```

---

## **5. Prompts Rediseñados**

### **5.1 Nuevo Prompt: DomainClassifier**

**Archivo:** `app/services/domain_classifier_service.py` (nuevo)

```
Eres un Clasificador de Dominios Profesionales. Tu tarea es analizar el texto
de un CV o descripción de puesto y determinar el DOMINIO PROFESIONAL principal.

DOMINIOS RECONOCIDOS:
- SALUD: medicina, enfermería, veterinaria, odontología, psicología, nutrición
- INGENIERIA: software, sistemas, civil, eléctrica, mecánica, industrial, química
- NEGOCIOS: administración, contabilidad, finanzas, marketing, ventas, logística
- EDUCACION: docencia, pedagogía, educación, formación
- DERECHO: legal, abogacía, leyes, jurídico
- ARTE_DISENO: diseño gráfico, UX/UI, multimedia, creativo, arte
- CONSTRUCCION: arquitectura, construcción, obra, edificación
- OTRO: no clasificable en las categorías anteriores

TEXTO A ANALIZAR:
{text}

Responde con JSON:
{
  "primary_domain": "SALUD | INGENIERIA | NEGOCIOS | ...",
  "confidence": 0.95,
  "reasoning": "breve explicación"
}
```

### **5.2 Prompt de Expansión de Skills Corregido**

**Archivo:** `app/services/semantic_service.py` (reemplazar prompt de expand_skills)

```
You are a Technical Dependency Analyzer operating in STRICT MODE.

TASK: Expand each skill to include ONLY its hard technical prerequisites.

RULES (ABSOLUTE):
1. A "Hard Dependency" means the skill CANNOT EXIST without the prerequisite.
   Example: Django cannot exist without Python. Therefore Python IS included.
2. INCLUDE the SKILL ITSELF in the output.
3. REJECT categories, domains, or fields of application.
   Example: "React" → "frontend" is REJECTED (frontend is a category).
   Example: "Python" → "data science" is REJECTED (data science is a field).
4. REJECT probabilistic associations.
   Example: "Accounting" → "Excel" is REJECTED (accounting can be done without Excel).
5. REJECT soft skills, vague concepts, or industries.
6. Output: flat JSON list of strings in lowercase.
7. When in doubt, DO NOT include it.

EXAMPLES:
Input: ["Django", "React"]
Output: ["django", "python", "react", "javascript"]

Input: ["Chofer", "Contabilidad"]
Output: ["chofer", "contabilidad"]

Input: ["Docker"]
Output: ["docker", "containerization", "linux"]

Input: ["Excel"]
Output: ["excel"]
(Note: "spreadsheets" is REJECTED because Excel itself IS the tool)

TARGET SKILLS:
{unique_skills}

Return JSON list only.
```

---

## **6. Modelos de Datos**

### **6.1 Nuevo Modelo: DomainClassification**

```python
# app/models/domain_classification.py

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class ProfessionalDomain(str, Enum):
    SALUD = "SALUD"
    INGENIERIA = "INGENIERIA"
    NEGOCIOS = "NEGOCIOS"
    EDUCACION = "EDUCACION"
    DERECHO = "DERECHO"
    ARTE_DISENO = "ARTE_DISENO"
    CONSTRUCCION = "CONSTRUCCION"
    OTRO = "OTRO"

class DomainMatch(str, Enum):
    SAME_DOMAIN = "SAME_DOMAIN"           # Misma industria (ej. ingeniero → ingeniero)
    ADJACENT_DOMAIN = "ADJACENT_DOMAIN"   # Industria relacionada (ej. contador → financiero)
    DIFFERENT_DOMAIN = "DIFFERENT_DOMAIN" # Industria distinta (ej. ingeniero → veterinario)

class DomainClassification(BaseModel):
    primary_domain: ProfessionalDomain = Field(...)
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    reasoning: str = Field(default="")
```

### **6.2 Modificación: DynamicRubric (Nuevos Campos)**

```python
# Modificar app/models/dynamic_rubric.py - agregar inferred_field

class RubricEducation(BaseModel):
    required_degrees: List[str] = Field(default_factory=list)
    academic_level: str = Field(default="Técnico")
    kill_clause: bool = Field(default=True)
    # NUEVO: Campo de estudio inferido. Ej: "SALUD", "INGENIERIA"
    inferred_field: Optional[str] = Field(None, description="Campo profesional inferido del título del puesto")
    # NUEVO: Si el grado fue inferido (no explícito en la descripción)
    is_inferred_degree: bool = Field(default=False)
```

---

## **7. Estrategia de Evaluación (LLM-as-a-Judge)**

### **7.1 Nuevo Test: LLM-as-a-Judge para Scoring**

Se crea un test específico que evalúa la precisión del scoring en escenarios de cambio de dominio.

**Archivo:** `tests/test_scoring_judge.py`

```python
"""
LLM-as-a-Judge: Evalúa la precisión del motor de scoring en 4 escenarios clave.
"""
import pytest
import json
import logging
from pydantic import BaseModel, Field
from typing import List
from app.services.scoring_service import ScoringService
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

class ScoringJudgeScorecard(BaseModel):
    reasoning: str = Field(description="Análisis paso a paso de la evaluación")
    education_accuracy: int = Field(description="1-5: ¿El score de educación refleja correctamente la relación entre campos?")
    experience_accuracy: int = Field(description="1-5: ¿El score de experiencia refleja correctamente los roles?")
    overall_plausibility: int = Field(description="1-5: ¿El score global es plausible dado el perfil vs puesto?")
    detected_bugs: List[str] = Field(description="Bugs o inconsistencias detectadas")

# Escenarios de prueba
SCENARIOS = [
    {
        "name": "ingeniero_a_veterinario",
        "description": "Ingeniero Informático postula a Médico Veterinario. Debería obtener ~0 en education y experience.",
        "candidate": {
            "titular_profesional": {"titular": "Ingeniero Informático"},
            "formacion_academica": [{"titulo": "Ingeniería Informática", "institucion": "Universidad de Chile"}],
            "experiencia_laboral": [
                {"cargo": "Desarrollador Full Stack", "empresa": "Tech Corp",
                 "responsabilidades": ["Desarrollo web con React", "APIs en Node.js"]}
            ],
            "habilidades": {"habilidades_tecnicas": ["Python", "JavaScript", "React", "Node.js"]}
        },
        "job": {"title": "Médico Veterinario", "description": "Atención clínica de animales menores y mayores."}
    },
    {
        "name": "ingeniero_a_ingeniero",
        "description": "Ingeniero Informático postula a Desarrollador Senior. Debería obtener score alto en educación.",
        "candidate": {
            "titular_profesional": {"titular": "Ingeniero Informático"},
            "formacion_academica": [{"titulo": "Ingeniería Informática", "institucion": "U. de Chile"}],
            "experiencia_laboral": [
                {"cargo": "Senior Software Engineer", "empresa": "BigTech",
                 "responsabilidades": ["Arquitectura de microservicios", "Liderazgo técnico"]}
            ],
            "habilidades": {"habilidades_tecnicas": ["Python", "AWS", "Docker", "Kubernetes"]}
        },
        "job": {"title": "Desarrollador Full Stack Senior", "description": "5+ años en desarrollo de software."}
    },
    {
        "name": "contador_a_analista",
        "description": "Contador postula a Analista de Datos. Debería obtener score medio (skills transferibles).",
        "candidate": {
            "titular_profesional": {"titular": "Contador Auditor"},
            "formacion_academica": [{"titulo": "Contador Público Auditor", "institucion": "U. Diego Portales"}],
            "experiencia_laboral": [
                {"cargo": "Analista Financiero Senior", "empresa": "Banco",
                 "responsabilidades": ["Análisis de datos financieros", "Reporting con Excel y SQL",
                                       "Modelos financieros en Python"]}
            ],
            "habilidades": {"habilidades_tecnicas": ["Excel", "SQL", "Python", "Power BI"]}
        },
        "job": {"title": "Analista de Datos", "description": "Análisis de datos y reporting para la gerencia."}
    },
    {
        "name": "medico_a_enfermero",
        "description": "Médico postula a Enfermero. Debería obtener score alto (mismo dominio SALUD).",
        "candidate": {
            "titular_profesional": {"titular": "Médico Cirujano"},
            "formacion_academica": [{"titulo": "Medicina", "institucion": "U. Católica"}],
            "experiencia_laboral": [
                {"cargo": "Médico General", "empresa": "Hospital Clínico",
                 "responsabilidades": ["Atención de pacientes", "Diagnóstico clínico",
                                       "Coordinación con enfermería"]}
            ],
            "habilidades": {"habilidades_tecnicas": ["Diagnóstico clínico", "Gestión de pacientes", "Farmacología"]}
        },
        "job": {"title": "Enfermero Jefe", "description": "Supervisión del equipo de enfermería en clínica privada."}
    }
]

@pytest.mark.asyncio
@pytest.mark.parametrize("scenario", SCENARIOS, ids=[s["name"] for s in SCENARIOS])
async def test_scoring_judge(scenario):
    """Evalúa cada escenario con el motor de scoring y luego con LLM-as-a-Judge."""
    llm_service = LLMService()
    scoring_service = ScoringService(llm_service)

    # Ejecutar scoring real
    result = await scoring_service.evaluate_candidate(
        candidate_data=scenario["candidate"],
        job_data=scenario["job"]
    )

    assert result is not None, f"Scoring failed for {scenario['name']}"

    # Preparar data para el juez
    judge_prompt = f"""
    Eres un Evaluador Experto de Calidad de Scoring (QA Judge).
    Tu tarea es evaluar si los scores generados por el motor de matching son
    PLASUBLES dado el perfil del candidato y el puesto.

    ESCENARIO: {scenario['description']}

    PUESTO: {json.dumps(scenario['job'], ensure_ascii=False)}
    CANDIDATO: {json.dumps(scenario['candidate'], ensure_ascii=False)}

    SCORES GENERADOS:
    {json.dumps(result.dict(), ensure_ascii=False, indent=2)}

    Evalúa usando la escala 1-5:
    5 = Perfectamente plausible y correcto
    4 = Bueno, con mínimas objeciones
    3 = Aceptable, pero hay inconsistencias notables
    2 = Malo, hay errores claros de matching
    1 = Crítico, el scoring es incorrecto
    """

    judge_result = await llm_service.call_agent_structured(
        prompt=judge_prompt,
        input_data="",
        response_model=ScoringJudgeScorecard,
        stage_name="SCORING_JUDGE"
    )

    assert judge_result is not None

    print(f"\n====== Escenario: {scenario['name']} ======")
    print(f"Education Accuracy: {judge_result.education_accuracy}/5")
    print(f"Experience Accuracy: {judge_result.experience_accuracy}/5")
    print(f"Overall Plausibility: {judge_result.overall_plausibility}/5")
    if judge_result.detected_bugs:
        print(f"Bugs detectados: {judge_result.detected_bugs}")
    print(f"Reasoning: {judge_result.reasoning[:200]}...")

    # Assertions según escenario
    if scenario["name"] == "ingeniero_a_veterinario":
        assert result.overall_score < 40, (
            f"Ingeniero postulando a Veterinario debería tener score bajo. "
            f"Got: {result.overall_score}"
        )
    elif scenario["name"] == "medico_a_enfermero":
        assert result.overall_score > 50, (
            f"Médico postulando a Enfermero debería tener score medio-alto. "
            f"Got: {result.overall_score}"
        )
```

### **7.2 Matriz de Validación por Escenario**

| Escenario | Educación Esperada | Experiencia Esperada | Score Global Esperado |
|-----------|-------------------|---------------------|---------------------|
| Ingeniero → Veterinario | 0-10 (campo distinto) | 0-20 (roles no transferibles) | < 40 |
| Ingeniero → Ingeniero | 80-100 (mismo campo) | 70-100 (roles similares) | > 70 |
| Contador → Analista Datos | 30-50 (campo relacionado) | 40-60 (skills transferibles) | 40-65 |
| Médico → Enfermero | 70-90 (mismo dominio salud) | 60-80 (roles complementarios) | > 55 |

---

## **8. Plan de Implementación por Fases**

### **Fase 1: Corrección de Bugs Críticos (Día 1-2)**

| # | Tarea | Archivo | Esfuerzo |
|---|-------|---------|----------|
| 1.1 | Fix Career Trajectory (if/elif/else) | `scoring_service.py:546-548` | ~10 min |
| 1.2 | Fix Educación con verificación de campo | `scoring_service.py:237-311` | ~2h |
| 1.3 | Agregar `_score_field_match` y `_compute_domain_penalty` | `scoring_service.py` (nuevos métodos) | ~3h |
| 1.4 | Eliminar boost artificial en fallback de roles | `scoring_service.py:417-423` | ~1h |
| 1.5 | Agregar `_check_role_transferability` | `scoring_service.py` (nuevo método) | ~2h |

**Verificación Fase 1:** Ejecutar `pytest tests/test_scoring_judge.py -k "ingeniero_a_veterinario"` → assert overall_score < 40

### **Fase 2: DomainClassifier (Día 2-3)**

| # | Tarea | Archivo | Esfuerzo |
|---|-------|---------|----------|
| 2.1 | Crear `domain_classifier_service.py` | `app/services/` (nuevo) | ~3h |
| 2.2 | Crear `domain_classification.py` (modelos Pydantic) | `app/models/` (nuevo) | ~30 min |
| 2.3 | Integrar DomainClassifier en scoring_service | `scoring_service.py` | ~2h |
| 2.4 | Tests unitarios del DomainClassifier | `tests/test_domain_classifier.py` | ~2h |

**Verificación Fase 2:** Ejecutar test con los 4 escenarios → asserts de dominio correctos

### **Fase 3: Corrección de Prompts y Optimización (Día 3-4)**

| # | Tarea | Archivo | Esfuerzo |
|---|-------|---------|----------|
| 3.1 | Rediseñar prompt de expand_skills (strict mode real) | `semantic_service.py:73-97` | ~1h |
| 3.2 | Rediseñar prompt de scoring (solo reasoning) | `scoring_service.py:552-617` | ~1h |
| 3.3 | Refactor `_parse_llm_response` (scores 100% deterministas) | `scoring_service.py:619-682` | ~1h |
| 3.4 | Agregar `_infer_degree_from_title` en DynamicRubricService | `dynamic_rubric_service.py` | ~2h |
| 3.5 | Remover autocirculación de job_title como degree | `dynamic_rubric_service.py:88-101` | ~30 min |

**Verificación Fase 3:** Ejecutar todos los tests de scoring → sin regresiones

### **Fase 4: Tests y Validación (Día 4-5)**

| # | Tarea | Archivo | Esfuerzo |
|---|-------|---------|----------|
| 4.1 | Crear `test_scoring_judge.py` con 4 escenarios | `tests/` (nuevo) | ~3h |
| 4.2 | Ejecutar benchmark de regresión con escenarios previos | `tests/debug_scoring.py` (actualizar) | ~1h |
| 4.3 | Medir reducción de tokens en prompt de scoring | Logs de token usage | ~30 min |
| 4.4 | Documentar resultados y ajustar thresholds | Este SDD (actualizar) | ~1h |

**Verificación Fase 4:** Todos los escenarios pasan los asserts de rango esperado

---

## **9. Métricas de Éxito**

### **9.1 Métricas Cuantitativas**

| Métrica | Línea Base (Actual) | Target (Post-Fix) | Cómo se Mide |
|---------|-------------------|-------------------|-------------|
| **Precisión en cambio de dominio** | Ingeniero→Veterinario: ~60-80 en edu | < 10 en edu | `test_scoring_judge.py` |
| **Career trajectory consistency** | Impredecible (bug) | Determinista y correcto | Inspección de código + test |
| **Tokens por evaluación scoring** | ~1200 tokens (prompt actual) | ~700 tokens (-40%) | Logs de `token_usage` |
| **Falsos positivos en skills** | Skills genéricos expandidos | Solo hard dependencies | `test_semantic_expansion.py` |
| **Precisión global matching** | ~65% en escenarios mixtos | > 85% en todos los escenarios | `test_scoring_judge.py` promedio |

### **9.2 Criterios de Aceptación**

1. **Escenario Ingeniero → Veterinario:** `overall_score < 40` y `education < 20`
2. **Escenario Ingeniero → Ingeniero:** `overall_score > 65` y `education > 70`
3. **Escenario Médico → Enfermero:** `overall_score > 50` y `education > 60`
4. **Escenario Contador → Analista:** `education > 20` y `education < 60` (transferibilidad parcial)
5. **Tokens:** Reducción de al menos 30% en el prompt de evaluación de scoring
6. **Sin regresiones:** Todos los tests existentes en `tests/` pasan sin modificación

### **9.3 Riesgos y Mitigaciones**

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Embeddings no discriminan campos | Media | Alto | Usar domain_penalty con léxico de palabras clave como respaldo |
| LLM de transferibilidad es lento | Media | Medio | Cachear resultados con TTL; usar solo cuando el match es dudoso (score entre 30-60) |
| Thresholds muy estrictos | Alta | Medio | Hacer los thresholds configurables vía settings, no hardcoded |
| Regresión en escenarios actuales | Baja | Alto | Todos los fixes tienen tests parametrizados antes de implementar |

---

*Fin del documento.*
