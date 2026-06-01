# SDD: Extracción CV por Secciones — Arquitectura Multi-Etapa

**Versión:** 1.0.0  
**Fecha:** 2026-05-31  
**Autor:** Currify Engineering  
**Estado:** Draft — Pendiente implementación

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Problema Actual](#2-problema-actual)
3. [Arquitectura Propuesta](#3-arquitectura-propuesta)
4. [Diseño Detallado](#4-diseño-detallado)
5. [Modelos de Datos](#5-modelos-de-datos)
6. [Prompts Especializados por Sección](#6-prompts-especializados-por-sección)
7. [Control de Concurrencia](#7-control-de-concurrencia)
8. [Estrategia de Fallback y Graceful Degradation](#8-estrategia-de-fallback-y-graceful-degradation)
9. [Plan de Eliminación de Código Deprecado](#9-plan-de-eliminación-de-código-deprecado)
10. [Plan de Implementación](#10-plan-de-implementación)
11. [Métricas de Éxito](#11-métricas-de-éxito)

---

## 1. Resumen Ejecutivo

Este documento describe el rediseño completo del pipeline de extracción de CVs en `currify-core`, migrando de un enfoque **monolítico basado en chunking** a una arquitectura **multi-etapa con extracción paralela por secciones**. 

### ¿Por qué hacemos este cambio?

El pipeline actual presenta fragilidades críticas que afectan la calidad de extracción y la experiencia del usuario:

| Problema | Impacto |
|----------|---------|
| LLM confunde cargo laboral con título profesional | Extrae `"Gerente de Sucursal"` como titular en vez de buscar en sección "Títulos" |
| Extracción monolítica (un solo prompt) | No puede manejar secciones no-estándar del CV (ej: "Competencias Diferenciales") |
| Chunking divide el CV arbitrariamente | El LLM mezcla experiencias entre chunks y parafrasea responsabilidades |
| Sin detección de secciones desconocidas | Se pierde información de secciones como "Otros Antecedentes", "Proyectos", "Referencias" |
| Fallo total si una sección falla | Un error de validación en `formacion_academica` tumba toda la extracción |
| Imposible depurar sección por sección | No se sabe qué parte del CV causó el error |
| Código duplicado y deprecado | 800+ líneas de chunking, reduce, y extracción híbrida que conviven con el código nuevo |

### ¿Qué ganamos?

| Beneficio | Detalle |
|-----------|---------|
| **Robustez** | Cada sección del CV se extrae independientemente con prompts especializados |
| **Velocidad** | 8 secciones en paralelo (`asyncio.gather`) en ~3s vs ~16s secuencial |
| **Extensibilidad** | Nuevos tipos de sección se añaden sin modificar el pipeline existente |
| **Graceful degradation** | Si una sección falla, las otras 7 siguen funcionando |
| **Depurabilidad** | Logs por sección, métricas de éxito/fallo por tipo |
| **Literalidad** | Prompts especializados garantizan extracción verbatim, no parafraseo |
| **Menos código** | -800 líneas deprecadas, +730 líneas nuevas, arquitectura más limpia |

---

## 2. Problema Actual

### 2.1 Arquitectura actual (monolítica + chunking)

```
┌──────────────────────────────────────────────────────────────────┐
│                     PIPELINE ACTUAL                               │
│                                                                    │
│  PDF/DOCX                                                        │
│     │                                                             │
│     ▼                                                             │
│  FileParserService → texto crudo (8527 chars)                     │
│     │                                                             │
│     ▼                                                             │
│  ¿texto > 4000 chars?                                             │
│     │                                                             │
│     ├── NO ──► _execute_hybrid_extraction()                       │
│     │           │                                                  │
│     │           ▼                                                  │
│     │         Prompt monolítico gigante                           │
│     │         "Extrae TODO en un solo JSON"                       │
│     │           │                                                  │
│     │           ▼                                                  │
│     │         Si falla → fallback → emergency → error             │
│     │                                                              │
│     └── SÍ ──► _execute_chunked_extraction()                      │
│                 │                                                  │
│                 ▼                                                  │
│               3 chunks × LLM (PartialResumeData)                   │
│                 │                                                  │
│                 ▼                                                  │
│               _reduce_experiences_with_llm() (otro LLM más)       │
│                 │                                                  │
│                 ▼                                                  │
│               Merge → _fix_missing_required_fields()              │
│                 │                                                  │
│                 ▼                                                  │
│               Pydantic ResumeData (si falla → error 500)          │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Puntos de fallo documentados

```
PROBLEMA 1: Título profesional incorrecto
─────────────────────────────────────────
CV: "Rocío Jil García" con sección "TÍTULOS" que contiene:
    "Licenciada en Educación y Filosofía / Profesora de Filosofía"
    
Extracción: "Gerente de Sucursal Valdivia" (¡es un cargo laboral!)
Causa: El LLM no distingue sección "Títulos" de "Experiencia". 
       El prompt monolítico pide "titular_profesional" y el LLM
       toma el cargo más reciente porque está más cerca en el texto.

PROBLEMA 2: Sección "COMPETENCIAS TÉCNICAS Y DIFERENCIALES" ignorada
──────────────────────────────────────────────────────────────────────
El LLM no reconoce esta sección como "Habilidades".
→ habilidades_tecnicas: [] (vacío)
→ El contenido se pierde completamente.

PROBLEMA 3: Responsabilidades parafraseadas en vez de literales
─────────────────────────────────────────────────────────────────
Original: "Me desempeño como Gerente de Sucursal Valdivia de la 
           compañía, responsable de la gestión comercial y 
           administrativa de la sucursal..."

Extraído: "• gestión comercial y administrativa"
          "• reportar a la gerencia general"
          "• trabajo en terreno con el equipo de ventas"

Causa: El chunk prompt es escueto. Gemini Flash tiende a resumir
       cuando no hay instrucción explícita de "TEXTO LITERAL".

PROBLEMA 4: Fallo en cascada
────────────────────────────
Si _execute_chunked_extraction() falla → _execute_hybrid_extraction()
Si _execute_hybrid_extraction() falla → emergency_response()
Si emergency_response() falla → error 500 "Error interno del servidor"

Un solo campo mal formado en UNA experiencia laboral tumba TODO el CV.
```

### 2.3 Deuda técnica acumulada

```
robust_extraction_service.py: 1831 líneas (antes de limpieza)
├── _execute_hybrid_extraction()    300 líneas — DEPRECADO
├── _execute_chunked_extraction()   200 líneas — DEPRECADO  
├── _reduce_experiences_with_llm()  100 líneas — DEPRECADO
├── _create_robust_extraction_prompt()  60 líneas — DEPRECADO
├── _create_chunk_prompt()           15 líneas — DEPRECADO
├── _extract_titular_from_text()     65 líneas — DEPRECADO
├── _validate_and_clean_extraction() 100 líneas — PARCIALMENTE USADO
└── _map_loose_data_to_model()       80 líneas — PARCIALMENTE USADO
                                    ────
                                    920 líneas a eliminar (~50% del archivo)
```

---

## 3. Arquitectura Propuesta

### 3.1 Visión general

```
┌──────────────────────────────────────────────────────────────────────┐
│              NUEVO PIPELINE: Extracción por Secciones                 │
│                                                                       │
│  PDF/DOCX/HTML                                                       │
│     │                                                                 │
│     ▼                                                                 │
│  ┌─────────────────────────────────────────┐                         │
│  │ FASE 1: SEGMENTACIÓN                      │  sync, ~5ms           │
│  │                                           │                       │
│  │ DocumentAnalyzerService.analyze()         │                       │
│  │   → detectar TODOS los headers            │                       │
│  │   → asignar límites (start/end line)      │                       │
│  │   → clasificar tipo de sección            │                       │
│  │                                           │                       │
│  │ Output: List[ClassifiedSection]           │                       │
│  └────────────────────┬────────────────────┘                         │
│                       │                                              │
│                       ▼                                              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ FASE 2: EXTRACCIÓN PARALELA POR SECCIÓN                         │ │
│  │                                         asyncio.gather, ~3s     │ │
│  │                                                                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │ │
│  │  │experience│  │education │  │  titles  │  │  skills  │  ...  │ │
│  │  │ prompt   │  │ prompt   │  │ prompt   │  │ prompt   │       │ │
│  │  │          │  │          │  │          │  │          │       │ │
│  │  │  LLM     │  │  LLM     │  │  LLM     │  │  LLM     │       │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │ │
│  │       │              │             │             │              │ │
│  │       │       asyncio.gather(*tasks, return_exceptions=True)    │ │
│  │       │              │             │             │              │ │
│  │       ▼              ▼             ▼             ▼              │ │
│  │  LLM result    LLM result    LLM result    LLM result           │ │
│  │       │              │             │             │              │ │
│  │       ├── ¿falló? ───┤── ¿falló? ──┤── ¿falló? ──┤             │ │
│  │       │              │             │             │              │ │
│  │       ▼              ▼             ▼             ▼              │ │
│  │  heuristic     heuristic     heuristic     heuristic            │ │
│  │  fallback      fallback      fallback      fallback             │ │
│  │                                                                  │ │
│  │ Output: Dict[SectionType, Dict[str, Any]]                       │ │
│  └────────────────────┬───────────────────────────────────────────┘ │
│                       │                                              │
│                       ▼                                              │
│  ┌─────────────────────────────────────────┐                         │
│  │ FASE 3: MERGE + NORMALIZACIÓN            │  sync, ~10ms           │
│  │                                           │                       │
│  │ _merge_section_results()                  │                       │
│  │   → titular_profesional: prioridad       │                       │
│  │     titles > education > experience       │                       │
│  │   → otros_antecedentes: secciones other   │                       │
│  │   → proyectos: secciones projects         │                       │
│  │   → habilidades: skills + languages       │                       │
│  │                                           │                       │
│  │ _fix_missing_required_fields()            │                       │
│  │   → fallbacks heurísticos finales         │                       │
│  │   → regex email, teléfono, ubicación      │                       │
│  │                                           │                       │
│  │ Output: ResumeData                        │                       │
│  └─────────────────────────────────────────┘                         │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Comparación antes/después

```
                        ANTES                          DESPUÉS
                        ─────                          ──────
Estrategia          Monolítica + chunking          Extracción por secciones
LLM calls por CV    4-10 (chunks + reduce)         1 por sección (6-8 típico)
Paralelismo         Ninguno                        asyncio.gather (8 en ~3s)
Tiempo total        ~19s                            ~4s
Fallo de sección    Tumba todo el CV                Aislado, otras secciones OK
Secciones nuevas    Requiere modificar modelo       Añadir prompt + clasificador
Depuración          Un solo log gigante             Logs por sección
Código              1831 líneas                     730 líneas + SectionExtractor(400)
Prompt              Uno gigante (monolítico)        Especializados por tipo
Verbatim            No garantizado                  Garantizado por prompt
```

---

## 4. Diseño Detallado

### 4.1 Modelo de Sección

```python
from enum import Enum
from dataclasses import dataclass

class SectionType(str, Enum):
    """Tipos de sección detectables en un CV"""
    PERSONAL_INFO   = "personal_info"    # Nombre, email, teléfono, ubicación
    SUMMARY         = "summary"          # Resumen profesional / Perfil / Sobre mí
    EXPERIENCE      = "experience"       # Experiencia laboral
    EDUCATION       = "education"        # Formación académica
    TITLES          = "titles"           # Títulos profesionales / Credenciales
    SKILLS          = "skills"           # Habilidades técnicas
    LANGUAGES       = "languages"        # Idiomas
    CERTIFICATIONS  = "certifications"   # Certificaciones / Cursos
    PROJECTS        = "projects"         # Proyectos / Portafolio
    AWARDS          = "awards"           # Reconocimientos / Premios
    VOLUNTEER       = "volunteer"        # Voluntariado
    INTERESTS       = "interests"        # Intereses / Hobbies
    REFERENCES      = "references"       # Referencias
    OTHER           = "other"            # Cualquier otra sección

@dataclass
class ClassifiedSection:
    """Sección del CV detectada, clasificada y delimitada"""
    section_type: SectionType
    section_name: str           # Nombre original del header (ej: "COMPETENCIAS TÉCNICAS")
    content: str                # Texto completo de la sección
    start_line: int             # Línea donde empieza
    end_line: int               # Línea donde termina
    confidence: float           # Confianza en la clasificación (0.0-1.0)

@dataclass 
class SectionResult:
    """Resultado de extracción de una sección"""
    section_type: SectionType
    success: bool
    data: Optional[Dict[str, Any]]
    error: Optional[str]
    method: str                 # "llm" | "heuristic" | "default"
    processing_time_ms: float
```

### 4.2 Clasificador de Secciones (mejorado en DocumentAnalyzerService)

```
ALGORITMO DE CLASIFICACIÓN:

1. DETECTAR HEADERS
   ─────────────────
   Recorrer líneas del CV buscando patrones de header:
   - Línea corta (< 80 chars)
   - All-caps o Title Case
   - Seguida de contenido con indentación o bullets
   - Coincide con keywords conocidas

2. CLASIFICAR POR KEYWORD (en orden de especificidad):
   ─────────────────────────────────────────────────

   Header contiene...                         → SectionType
   ─────────────────────────────────────────────────────────
   "experiencia", "work experience",          → EXPERIENCE
   "employment", "trayectoria", "historial"
   
   "formación", "educación", "education",     → EDUCATION
   "estudios", "academic"
   
   "títulos", "títulos profesionales",        → TITLES
   "credenciales", "certificaciones 
    académicas", "grados"
   
   "habilidades", "skills", "competencias     → SKILLS
    técnicas" (si NO contiene "diferenciales")
   
   "competencias diferenciales",              → OTHER
   "competencias transversales",
   "otros antecedentes", "información 
    adicional", "datos complementarios"

   "idiomas", "languages"                     → LANGUAGES

   "certificaciones", "cursos",               → CERTIFICATIONS
   "capacitaciones", "training"

   "proyectos", "portafolio", "projects"      → PROJECTS

   "resumen", "perfil", "sobre mí",           → SUMMARY
   "about me", "profile", "objective"

   "reconocimientos", "premios", "logros",    → AWARDS
   "awards", "achievements"

   "voluntariado", "extracurricular",         → VOLUNTEER
   "volunteer"

   "referencias", "references"                → REFERENCES

   "intereses", "hobbies", "interests"        → INTERESTS
   
   Ninguno de los anteriores                  → OTHER

3. RESOLVER AMBIGÜEDADES:
   ─────────────────────
   - "Competencias Técnicas" → SKILLS
   - "Competencias Técnicas Y Diferenciales" → OTHER (contiene "diferenciales")
   - "Títulos y Certificaciones" → TITLES (titles tiene prioridad)
   - "Formación y Cursos" → EDUCATION
```

### 4.3 SectionExtractor (NUEVO servicio)

```python
class SectionExtractor:
    """
    Servicio responsable de extraer datos estructurados de UNA sección del CV.
    
    Cada tipo de sección tiene:
    - Un prompt especializado optimizado
    - Un fallback heurístico 
    - Un valor por defecto
    
    El LLMService se recibe por DI para testabilidad.
    """

    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        
    async def extract_section(
        self, 
        section: ClassifiedSection, 
        request_id: str
    ) -> SectionResult:
        """
        Extrae datos de una sección con LLM + fallback.
        
        Flujo:
        1. Intentar LLM (con timeout de 30s)
        2. Si falla → fallback heurístico
        3. Si falla → valor por defecto
        """
        start = time.time()
        
        try:
            # Nivel 1: LLM con prompt especializado
            result = await asyncio.wait_for(
                self._extract_with_llm(section, request_id),
                timeout=30.0
            )
            return SectionResult(
                section_type=section.section_type,
                success=True,
                data=result,
                method="llm",
                processing_time_ms=(time.time() - start) * 1000
            )
            
        except asyncio.TimeoutError:
            logger.warning(f"[{request_id}] Timeout en sección {section.section_type}")
        except Exception as e:
            logger.warning(f"[{request_id}] Error LLM en {section.section_type}: {e}")
            
        # Nivel 2: Fallback heurístico
        try:
            heuristic_result = self._heuristic_fallback(section)
            if heuristic_result:
                return SectionResult(
                    section_type=section.section_type,
                    success=True,
                    data=heuristic_result,
                    method="heuristic",
                    processing_time_ms=(time.time() - start) * 1000
                )
        except Exception as e:
            logger.error(f"[{request_id}] Error heurístico en {section.section_type}: {e}")
            
        # Nivel 3: Default
        return SectionResult(
            section_type=section.section_type,
            success=False,
            data=self._default_result(section.section_type),
            method="default",
            error=str(e) if 'e' in dir() else "Timeout",
            processing_time_ms=(time.time() - start) * 1000
        )

    async def extract_all(
        self,
        sections: List[ClassifiedSection],
        request_id: str,
        max_concurrent_per_request: int = 3
    ) -> Dict[str, SectionResult]:
        """
        Extrae TODAS las secciones en paralelo con control de concurrencia.
        
        Usa asyncio.gather + semáforo por request para fair scheduling.
        """
        sem = asyncio.Semaphore(max_concurrent_per_request)
        
        async def _bounded_extract(section: ClassifiedSection):
            async with sem:
                return await self.extract_section(section, request_id)
        
        tasks = [_bounded_extract(s) for s in sections]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        output = {}
        for i, result in enumerate(results):
            section = sections[i]
            if isinstance(result, Exception):
                output[section.section_type.value] = SectionResult(
                    section_type=section.section_type,
                    success=False,
                    error=str(result),
                    method="exception",
                    processing_time_ms=0
                )
            else:
                output[section.section_type.value] = result
                
        return output
```

---

## 5. Modelos de Datos

### 5.1 Nuevos modelos (añadir a `resume.py`)

```python
class SectionType(str, Enum):
    PERSONAL_INFO = "personal_info"
    SUMMARY = "summary"
    EXPERIENCE = "experience"
    EDUCATION = "education"
    TITLES = "titles"
    SKILLS = "skills"
    LANGUAGES = "languages"
    CERTIFICATIONS = "certifications"
    PROJECTS = "projects"
    AWARDS = "awards"
    VOLUNTEER = "volunteer"
    INTERESTS = "interests"
    REFERENCES = "references"
    OTHER = "other"

class SectionDetection(BaseModel):
    """Resultado de detección de sección por DocumentAnalyzerService"""
    section_type: SectionType = Field(..., description="Tipo clasificado de la sección")
    section_name: str = Field(..., description="Nombre original del header en el CV")
    start_line: int = Field(..., description="Línea de inicio (0-indexed)")
    end_line: int = Field(..., description="Línea de fin (exclusiva)")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
```

### 5.2 Cambios a modelos existentes

```python
# ResumeData — añadir campo proyectos como entidad de primera clase
class ResumeData(BaseModel):
    # ... campos existentes ...
    proyectos: Optional[Projects] = Field(None, description="Proyectos destacados")
    # ... resto de campos ...

# Period — comportamiento null cuando vacío (YA IMPLEMENTADO)
class Period(BaseModel):
    fecha_inicio: Optional[str] = Field(None)
    fecha_fin: Optional[str] = Field(None)
    texto_original: Optional[str] = Field(None)
    # Se maneja con data['periodo'] = periodo_data if periodo_data else None

# OnlineProfiles — aceptar listas (YA IMPLEMENTADO)
class OnlineProfiles(BaseModel):
    otros: Optional[List[str]] = Field(None)
```

---

## 6. Prompts Especializados por Sección

### 6.1 Prompt: EXPERIENCE

```
Eres un extractor de historial laboral. Extrae del texto TODAS las experiencias.

⛔ REGLAS CRÍTICAS:
1. TEXTO LITERAL: Las responsabilidades deben ser el texto EXACTO del CV. 
   NO resumas, NO parafrasees, NO conviertas párrafos en bullets.
2. Cargo COMPLETO: "Gerente de Sucursal Valdivia", NO "Gerente".
3. Empresa: razón social completa, separada del cargo.
4. Fechas: "Enero 2019" → "2019-01", "A la Fecha" → "Presente"
5. NO mezcles información entre distintas experiencias.
6. Si una experiencia no tiene fechas, NO las inventes. Usa null.

Output: {"experiencias": [{"cargo": "...", "empresa": "...", 
          "periodo": {"fecha_inicio": "...", "fecha_fin": "...", 
          "texto_original": "..."}, "responsabilidades": ["...", "..."]}]}
```

### 6.2 Prompt: TITLES

```
Eres un clasificador de títulos profesionales y credenciales académicas.

⛔ DIFERENCIA CLAVE:
- "Título profesional" = PROFESIÓN de la persona (Ingeniero Civil, Médico, Abogado)
- "Cargo laboral" = puesto de trabajo (Gerente, Jefe, Coordinador) → NO es un título

INSTRUCCIONES:
1. Busca el TÍTULO PROFESIONAL (lo que estudió, no dónde trabajó). 
   Busca palabras como: Ingeniero/a, Licenciado/a, Arquitecto/a, Médico/a,
   Abogado/a, Contador/a, Profesor/a, Doctor/a, Psicólogo/a
2. Si hay varios títulos, prioriza: Doctorado > Magíster > Licenciatura > Técnico
3. Extrae TODOS los títulos/grados con su institución y fecha si está disponible
4. NO incluyas diplomados ni cursos cortos aquí (van en certificaciones)

Output: {"titulo_profesional": "Ingeniero Civil", 
         "formacion": [{"titulo": "...", "institucion": "...", 
         "periodo": {"fecha_inicio": "...", "fecha_fin": "..."}}]}
```

### 6.3 Prompt: SKILLS

```
Extrae habilidades técnicas, idiomas y habilidades blandas del texto.

⛔ REGLAS:
1. habilidades_tecnicas: SOLO herramientas, tecnologías, metodologías.
   Ej: "Python", "Excel Avanzado", "Metodología Ágil", "SAP", "Power BI"
2. idiomas: idioma + nivel + certificación si existe.
   Ej: {"idioma": "Inglés", "nivel": "Avanzado", "certificacion": "TOEFL 105"}
3. habilidades_blandas: competencias interpersonales.
   Ej: "Liderazgo", "Trabajo en equipo", "Comunicación efectiva"
4. NO incluyas títulos académicos, cargos laborales ni experiencias.

Output: {"habilidades_tecnicas": [{"skill": "...", "level": "..."}],
         "idiomas": [{"idioma": "...", "nivel": "...", "certificacion": "..."}],
         "habilidades_blandas": [{"skill": "...", "level": "..."}]}
```

### 6.4 Prompt: EDUCATION

```
Extrae formación académica del texto.

⛔ REGLAS:
1. titulo: nombre COMPLETO del grado (ej: "Magíster en Dirección de Empresas")
2. institucion: nombre COMPLETO de la universidad/instituto
3. periodo: fechas normalizadas si están disponibles
4. NO incluyas certificaciones ni cursos cortos
5. Extrae TODOS los items, no omitas ninguno

Output: {"formacion": [{"titulo": "...", "institucion": "...", 
          "periodo": {"fecha_inicio": "...", "fecha_fin": "..."}}]}
```

### 6.5 Prompt: SUMMARY

```
Extrae el resumen profesional o perfil del CV.

Si el CV tiene un párrafo bajo títulos como "Perfil", "Resumen", "Sobre mí",
"Objetivo profesional", "Professional Summary":
→ Extrae el TEXTO LITERAL COMPLETO de ese párrafo.
→ NO resumas, NO acortes, NO parafrasees.

Si no hay resumen profesional en el texto → devuelve "".

Output: {"resumen": "texto literal del resumen profesional"}
```

### 6.6 Prompt: OTHER

```
Captura el contenido de esta sección como items de texto estructurado.

Esta sección no corresponde a una categoría estándar de CV. Extrae:
1. section_name: el nombre original de la sección (ej: "Competencias Diferenciales")
2. items: lista de strings con el contenido, preservando bullets y formato original

NO resumas. NO interpretes. Simplemente estructura el texto en items.

Output: {"section_name": "...", "items": ["línea 1", "línea 2", ...]}
```

---

## 7. Control de Concurrencia

### 7.1 Arquitectura de semáforos

```
                        ┌──────────────────────────────┐
                        │   LLMService                  │
                        │                               │
                        │   _global_semaphore(6)        │
                        │   ┌─────────────────────┐     │
                        │   │ Solo 6 LLM calls     │     │
                        │   │ simultáneas en TODO   │     │
                        │   │ el sistema            │     │
                        │   └─────────────────────┘     │
                        └──────────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │  Request A   │    │  Request B   │    │  Request C   │
        │  (CV 1)      │    │  (CV 2)      │    │  (CV 3)      │
        │              │    │              │    │              │
        │ semáforo(3)  │    │ semáforo(3)  │    │ semáforo(3)  │
        │              │    │              │    │              │
        │ 8 secciones  │    │ 6 secciones  │    │ 5 secciones  │
        │ max 3 conc.  │    │ max 3 conc.  │    │ max 3 conc.  │
        └──────────────┘    └──────────────┘    └──────────────┘

Fairness: Cada request obtiene max 3 de los 6 slots globales.
         2 CVs pueden procesarse en paralelo completo.
         Si hay 3+ CVs, se encolan equitativamente.
```

### 7.2 Timeout y graceful degradation

```
Cada sección tiene timeout de 30 segundos:

    ┌──────────────────────────────────────────┐
    │  await asyncio.wait_for(                  │
    │      self._extract_with_llm(section),     │
    │      timeout=30.0                         │
    │  )                                        │
    └──────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
    ✅ Éxito              ⏰ Timeout
        │                       │
        ▼                       ▼
    LLM result           ┌──────────────────┐
                         │ Fallback:         │
                         │ heuristic_fallback│
                         │   ├─ regex cargo  │
                         │   ├─ regex fecha  │
                         │   └─ texto literal│
                         └──────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
                ✅ Datos                ❌ Default vacío
                heurísticos             (lista vacía/null)
```

### 7.3 Configuración

```python
# app/core/config.py
class Settings(BaseSettings):
    # ... otras configs ...
    
    # LLM Concurrency
    llm_concurrency_limit: int = 6          # Max llamadas LLM simultáneas globales
    llm_concurrency_per_request: int = 3    # Max secciones en paralelo por CV
    llm_section_timeout_seconds: float = 30.0  # Timeout por sección
    
    # Section extraction
    section_extraction_enabled: bool = True  # Feature flag para rollout gradual
```

---

## 8. Estrategia de Fallback y Graceful Degradation

### 8.1 Tres niveles de resiliencia

```
                    LLM Prompt Especializado
                    ─────────────────────────
                    │  Calidad: ALTA         │
                    │  Latencia: ~2-4s       │
                    │  Costo: tokens         │
                    └───────────┬────────────┘
                                │ ¿falló?
                                ▼
                    Fallback Heurístico
                    ─────────────────────────
                    │  Calidad: MEDIA        │
                    │  Latencia: ~5ms        │
                    │  Costo: cero           │
                    └───────────┬────────────┘
                                │ ¿falló?
                                ▼
                    Valor por Defecto
                    ─────────────────────────
                    │  Calidad: MÍNIMA       │
                    │  Latencia: 0ms         │
                    │  Costo: cero           │
                    └────────────────────────
```

### 8.2 Fallbacks heurísticos por tipo de sección

```
EXPERIENCE:
  LLM falló → regex patterns:
    - cargo: buscar líneas con keywords de rol después del header
    - empresa: buscar línea siguiente al cargo con formato "Empresa | rubro"
    - fechas: regex mes + año (enero 2019, 01/2019, 2019-01)
    - responsabilidades: líneas con indentación después de cargo/empresa

TITLES:
  LLM falló → buscar en formación_academica:
    - Buscar títulos que NO sean magíster/licenciatura/diplomado
    - Si hay "/" → split y tomar la parte que es profesión
    - Keywords: "Ingeniero/a", "Licenciado/a", "Profesor/a", etc.

SKILLS:
  LLM falló → _heuristic_skill_extraction() existente:
    - Detectar sección "Habilidades"/"Skills"
    - Parsear bullets, líneas, listas separadas por coma

CONTACT_INFO:
  Siempre heurístico (no usa LLM):
    - Email: regex [A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}
    - Teléfono: regex +XX X XXXX XXXX o 8+ dígitos
    - Nombre: primeras líneas en formato Nombre Apellido
    - Ubicación: líneas con patrón "Calle Número, Ciudad"
```

### 8.3 Matriz de degradación

```
┌─────────────────┬──────────┬──────────┬──────────┐
│ Sección         │ LLM OK   │ Heuristic│ Default  │
├─────────────────┼──────────┼──────────┼──────────┤
│ experience      │ 4 items  │ 2 items  │ []       │
│ education       │ 3 items  │ 1 item   │ []       │
│ titles          │ titular  │ titular  │ "No      │
│                 │ + grados │ heuristic│ extraído" │
│ skills          │ 8 skills │ 3 skills │ []       │
│ languages       │ 2 langs  │ 1 lang   │ []       │
│ summary         │ párrafo  │ ""       │ ""       │
│ certifications  │ 2 certs  │ []       │ []       │
│ other           │ items[]  │ items[]  │ []       │
│ personal_info   │ N/A      │ regex    │ defaults │
└─────────────────┴──────────┴──────────┴──────────┘
```

---

## 9. Plan de Eliminación de Código Deprecado

### 9.1 Mapa de reemplazo

```
MÉTODO ACTUAL (a eliminar)          → REEMPLAZO
─────────────────────────────────────────────────────────────
_execute_hybrid_extraction()        → _extract_by_sections()
_execute_chunked_extraction()       → SectionExtractor.extract_all()
_reduce_experiences_with_llm()      → (innecesario: no hay chunks)
_create_robust_extraction_prompt()  → SectionExtractor._prompt_*() 
_create_chunk_prompt()              → (innecesario)
_extract_titular_from_text()        → SectionExtractor (prompt titles)
_map_loose_data_to_model()          → _merge_section_results()
_validate_and_clean_extraction()    → Simplificado en _merge
_create_emergency_response()        → Cada sección tiene su fallback
_customize_prompt_for_attempt()     → (innecesario: sin reintentos)
```

### 9.2 Servicios legacy a archivar

```
app/services/resume_extraction_service.py        → archivar como _deprecated/
app/services/resume_extraction_service_v2.py     → archivar como _deprecated/
app/services/structured_extraction_service.py    → archivar como _deprecated/ (si existe)
```

---

## 10. Plan de Implementación

### 10.1 Secuencia de commits

```
COMMIT 1: Modelos + DocumentAnalyzer mejorado
────────────────────────────────────────────
Archivos:
  [+] app/models/resume.py           → SectionType, SectionDetection
  [~] app/services/document_analyzer_service.py → límites + clasificación completa

Cambios:
  - Añadir enum SectionType con 14 tipos
  - Añadir ClassifiedSection dataclass
  - Añadir SectionDetection Pydantic model
  - Mejorar DocumentAnalyzerService.analyze() para retornar SectionDetection[]
  - Implementar algoritmo de clasificación por keywords (ver sección 4.2)

Verificación:
  - Test unitario: detectar secciones de CVs de prueba
  - Test unitario: clasificar "Competencias Técnicas y Diferenciales" → OTHER
  - Test unitario: clasificar "Títulos" → TITLES


COMMIT 2: SectionExtractor (nuevo servicio)
───────────────────────────────────────────
Archivos:
  [+] app/services/section_extractor.py → NUEVO: 400 líneas

Cambios:
  - Implementar SectionExtractor.extract_section() con 3 niveles
  - Implementar SectionExtractor.extract_all() con asyncio.gather
  - Implementar prompts especializados: _prompt_experience, _prompt_education,
    _prompt_titles, _prompt_skills, _prompt_summary, _prompt_other
  - Implementar fallbacks heurísticos: _heuristic_experience, _heuristic_titles
  - Implementar valores por defecto: _default_result()

Verificación:
  - Test unitario: extraer sección experience de CV de prueba
  - Test unitario: extraer sección titles con titular profesional
  - Test unitario: timeout → fallback heurístico → default
  - Test unitario: asyncio.gather con 8 secciones → resultados en < 5s


COMMIT 3: _extract_by_sections() en RobustExtractionService
──────────────────────────────────────────────────────────────
Archivos:
  [~] app/services/robust_extraction_service.py → +80, -300

Cambios:
  - Nuevo método _extract_by_sections() como pipeline primario
  - Integrar SectionExtractor en __init__
  - Control de concurrencia con semáforo por request
  - Timeout por sección
  - Logging detallado por sección

Verificación:
  - Test de integración: CV completo → ResumeData válido
  - Test de integración: CV sin sección titles → titular desde education
  - Test de integración: simular fallo LLM en 1 sección → resto OK


COMMIT 4: _merge_section_results() + reglas de merge
─────────────────────────────────────────────────────
Archivos:
  [~] app/services/robust_extraction_service.py → +100

Cambios:
  - Implementar _merge_section_results() con reglas de prioridad
  - Prioridad titular: titles > education > experience > "No extraído"
  - Mapeo: other → otros_antecedentes[]
  - Mapeo: projects → proyectos[]
  - Mapeo: awards → reconocimientos
  - Mapeo: volunteer → actividades_extracurriculares
  - Mapeo: certifications → formacion_complementaria
  - Mapeo: languages + skills → habilidades

Verificación:
  - Test unitario: merge con titles + education + experience → titular correcto
  - Test unitario: merge con sección other → otros_antecedentes poblado
  - Test unitario: merge con todas las secciones vacías → defaults


COMMIT 5: Eliminar código deprecado
───────────────────────────────────
Archivos:
  [~] app/services/robust_extraction_service.py → -800 líneas

Eliminar:
  ✗ _execute_hybrid_extraction()           (~300 líneas)
  ✗ _execute_chunked_extraction()          (~200 líneas)
  ✗ _reduce_experiences_with_llm()         (~100 líneas)
  ✗ _create_robust_extraction_prompt()     (~60 líneas)
  ✗ _create_chunk_prompt()                 (~15 líneas)
  ✗ _extract_titular_from_text()          (~65 líneas)
  ✗ _map_loose_data_to_model()            (~80 líneas)
  ✗ _customize_prompt_for_attempt()       (~30 líneas)
  ✗ _create_empty_extraction()            (~15 líneas)
  ✗ _execute_hybrid_extraction references en _execute_robust_extraction
  ✗ Chunk-related methods: _create_intelligent_chunks, _merge_chunk_results

Mover a _deprecated/:
  ✗ app/services/resume_extraction_service.py
  ✗ app/services/resume_extraction_service_v2.py

Verificación:
  - Todos los tests existentes pasan
  - No hay referencias a métodos eliminados
  - Compilación limpia


COMMIT 6: Limpieza final + configuración
────────────────────────────────────────
Archivos:
  [~] app/core/config.py → llm_concurrency_limit=6, llm_concurrency_per_request=3
  [~] app/core/resume_prompts.py → limpiar prompts legacy no usados
  [~] app/services/robust_extraction_service.py → limpieza de imports, logs
  [+] tests/test_section_extractor.py → tests unitarios del nuevo servicio
  [+] tests/test_pipeline.py → tests de integración end-to-end

Verificación:
  - Full test suite pasa
  - Prueba manual con 3 CVs problemáticos:
    1. CV Rocío Jil García (titles, competencias diferenciales, nombre perdido)
    2. CV Gerente Sucursal (responsabilidades literales vs parafraseo)
    3. CV estándar (regresión: nada debe empeorar)
```

### 10.2 Rollout strategy

```
FASE 0: Feature flag (commit 3)
  section_extraction_enabled: False → usa pipeline antiguo
  section_extraction_enabled: True  → usa pipeline nuevo
  
FASE 1: Shadow mode (1 día)
  Ambos pipelines corren en paralelo
  Comparar resultados automáticamente
  Loggear diferencias sin afectar al usuario

FASE 2: Canary (10% tráfico)
  section_extraction_enabled: True para 10% de requests
  Monitorear: tasa de error, latencia p95, calidad de extracción

FASE 3: Full rollout
  section_extraction_enabled: True para 100%
  Eliminar código legacy después de 1 semana sin incidentes
```

---

## 11. Métricas de Éxito

### 11.1 Métricas de calidad

```
Métrica                          Actual    Objetivo   Medición
──────────────────────────────────────────────────────────────
Titular profesional correcto     60%       ≥ 95%      Muestra de 50 CVs
Habilidades extraídas            40%       ≥ 90%      CVs con sección skills
Responsabilidades literales      30%       ≥ 95%      Comparación texto original
Secciones no-estándar capturadas  0%       ≥ 90%      CVs con "Otros Antecedentes"
Tasa de error 500                8%        < 1%       Logs de producción
```

### 11.2 Métricas de rendimiento

```
Métrica                          Actual    Objetivo   Medición
──────────────────────────────────────────────────────────────
Latencia p50                     19s       < 5s       Traces
Latencia p95                     25s       < 8s       Traces
LLM calls por CV                 4-10      6-8        Logs
Tokens consumidos por CV         ~7k       ~5k        Usage headers
Tasa de timeout                  0%        < 2%       Logs
```

### 11.3 Métricas de código

```
Métrica                          Actual    Objetivo
───────────────────────────────────────────────────
Líneas en robust_extraction      1831      < 800
Servicios de extracción           3         1 primario
Métodos con > 100 líneas          4         0
Duplicación de código            15%       < 3%
Cobertura de tests                5%       > 60%
```

---

## Apéndice A: Flujo completo de extracción (diagrama de secuencia)

```
Cliente          API Gateway        RobustExtraction    SectionExtractor    LLMService      Gemini
  │                  │                    │                    │                │              │
  │ POST /extract    │                    │                    │                │              │
  │─────────────────►│                    │                    │                │              │
  │                  │                    │                    │                │              │
  │                  │ extract_from_file()│                    │                │              │
  │                  │───────────────────►│                    │                │              │
  │                  │                    │                    │                │              │
  │                  │                    │ FASE 1: analyze()  │                │              │
  │                  │                    │──┐                 │                │              │
  │                  │                    │◄─┘ 14 secciones     │                │              │
  │                  │                    │                    │                │              │
  │                  │                    │ FASE 2: extract_all(sections)         │              │
  │                  │                    │───────────────────►│                │              │
  │                  │                    │                    │                │              │
  │                  │                    │                    │ asyncio.gather │              │
  │                  │                    │                    │──┬─────────────│              │
  │                  │                    │                    │  │ 8 tasks     │              │
  │                  │                    │                    │  │             │              │
  │                  │                    │                    │  │ sem.acquire │              │
  │                  │                    │                    │  │ (max 3/req) │              │
  │                  │                    │                    │  │             │              │
  │                  │                    │                    │  ├─ experience ┼─call_agent──►│
  │                  │                    │                    │  ├─ education  ┼─call_agent──►│
  │                  │                    │                    │  ├─ titles     ┼─call_agent──►│
  │                  │                    │                    │  │  ... wait   │              │
  │                  │                    │                    │  │             │◄─ results ──│
  │                  │                    │                    │  ├─ skills     ┼─call_agent──►│
  │                  │                    │                    │  ├─ summary    ┼─call_agent──►│
  │                  │                    │                    │  ├─ other      ┼─call_agent──►│
  │                  │                    │                    │  │             │◄─ results ──│
  │                  │                    │                    │◄─┴─────────────│              │
  │                  │                    │                    │  8 SectionResult              │
  │                  │                    │◄───────────────────│                               │
  │                  │                    │                    │                               │
  │                  │                    │ FASE 3: merge()    │                               │
  │                  │                    │──┐                 │                               │
  │                  │                    │◄─┘ ResumeData      │                               │
  │                  │                    │                    │                               │
  │                  │◄─ 200 OK ──────────│                    │                               │
  │◄─ JSON ─────────│                    │                    │                               │
```

---

## Apéndice B: Ejemplo de resolución de "Título Profesional"

```
CV: Rocío Jil García

Secciones detectadas:
┌─────────────────────────────────────────────────────────────┐
│ EXPERIENCE:                                                  │
│   "Consultoría Estratégica en RR.HH." (Blends And Tea SPA)  │
│   "Encargada de Administración y RR.HH." (Editorial Ocho)   │
│   ...                                                        │
├─────────────────────────────────────────────────────────────┤
│ TITLES:                                                      │
│   "Licenciada en Educación y Filosofía / Profesora de        │
│    Filosofía" (Pontificia Universidad Católica de Valparaíso)│
│   "Magíster en Dirección de Recursos Humanos" (UAI)          │
│   "Diplomado en Gestión y Desarrollo Humano" (PUC)           │
└─────────────────────────────────────────────────────────────┘

RESOLUCIÓN DE TITULAR:

1. Sección TITLES existe → extraer con prompt titles:
   LLM output: {
     "titulo_profesional": "Profesora de Filosofía",
     "formacion": [
       {"titulo": "Licenciada en Educación y Filosofía", 
        "institucion": "Pontificia Universidad Católica de Valparaíso"},
       {"titulo": "Profesora de Filosofía",
        "institucion": "Pontificia Universidad Católica de Valparaíso"},
       {"titulo": "Magíster en Dirección de Recursos Humanos",
        "institucion": "Universidad Adolfo Ibáñez"},
       {"titulo": "Diplomado en Gestión y Desarrollo Humano en las Organizaciones",
        "institucion": "Pontificia Universidad Católica de Chile"}
     ]
   }

2. Merge:
   - titular_profesional = "Profesora de Filosofía"  ✅
   - formacion_academica = merge(titles.formacion, education.formacion)
   
3. Resultado final:
   {
     "titular_profesional": {"titular": "Profesora de Filosofía"},
     "formacion_academica": [
       {"titulo": "Licenciada en Educación y Filosofía", ...},
       {"titulo": "Profesora de Filosofía", ...},
       {"titulo": "Magíster en Dirección de Recursos Humanos", ...},
       {"titulo": "Diplomado en Gestión y Desarrollo Humano...", ...}
     ]
   }
```

---

**Fin del documento**
