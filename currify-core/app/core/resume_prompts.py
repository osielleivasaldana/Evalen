"""
Prompts especializados para extracción de datos de currículum vitae
"""

class ResumeExtractionPrompts:
    """Colección de prompts optimizados para extracción de CV"""

    @staticmethod
    def get_main_extraction_prompt(analysis_hints: dict = None) -> str:
        """Prompt principal para extracción completa de CV con análisis inteligente"""

        # Construir instrucciones específicas basadas en el análisis
        specific_instructions = ""
        if analysis_hints:
            if analysis_hints.get("experience_section"):
                specific_instructions += f"\n- EXPERIENCIA: {analysis_hints['experience_section']}"
            if analysis_hints.get("education_section"):
                specific_instructions += f"\n- EDUCACIÓN: {analysis_hints['education_section']}"
            if analysis_hints.get("skills_section"):
                specific_instructions += f"\n- HABILIDADES: {analysis_hints['skills_section']}"
            if analysis_hints.get("rating_system"):
                specific_instructions += f"\n- SISTEMA DE EVALUACIÓN: {analysis_hints['rating_system']}"

        return f"""
Eres un experto analista de recursos humanos especializado en extracción profunda de CV.

ANÁLISIS PREVIO DEL DOCUMENTO:{specific_instructions}

INSTRUCCIONES CRÍTICAS:
- Busca secciones con nombres variables (Experiencia, Formación, Habilidades, etc.)
- Extrae TODO el contenido, incluso si está en secciones con nombres no estándar
- Si encuentras sistemas de evaluación (★, %, niveles), conviértelos a formato estándar
- Mantén el texto original pero estructura la información
- Si un campo no está disponible, usa null
- NO incluyas metadata en esta extracción

ESTRATEGIAS DE BÚSQUEDA INTELIGENTE:
1. Busca palabras clave en diferentes idiomas y variaciones
2. Identifica patrones de fechas y períodos (Enero 2018 - Julio 2019, etc.)
3. Reconoce estructuras de listas y viñetas
4. Detecta sistemas de evaluación visual (estrellas, puntos, etc.)
5. Analiza el contexto para clasificar información correctamente
6. CRÍTICO: Captura texto multi-línea con indentación como responsabilidades
7. Identifica descripciones detalladas que siguen al cargo/empresa

ESTRUCTURA JSON REQUERIDA:

```json
{{
  "datos_contacto": {{
    "nombre_completo": "string - Nombre y apellidos completos",
    "telefono": "string o null - Número de teléfono",
    "email": "string - Correo electrónico principal",
    "ubicacion": "string - Ciudad, País"
  }},
  "titular_profesional": {{
    "titular": "string - Título o frase que define el perfil profesional"
  }},
  "resumen_profesional": {{
    "resumen": "string - Párrafo que resume experiencia y competencias"
  }},
  "experiencia_laboral": [
    {{
      "cargo": "string - Título del puesto",
      "empresa": "string - Nombre de la empresa",
      "periodo": {{
        "fecha_inicio": "string o null - YYYY-MM o YYYY",
        "fecha_fin": "string o null - YYYY-MM, YYYY o 'Presente'",
        "texto_original": "string - Texto original del período"
      }},
      "logros": ["string - Lista de responsabilidades y logros"],
      "ubicacion": "string o null - Ciudad/País"
    }}
  ],
  "formacion_academica": [
    {{
      "titulo": "string - Grado o título académico",
      "institucion": "string - Universidad o institución",
      "periodo": {{
        "fecha_inicio": "string o null - YYYY-MM o YYYY",
        "fecha_fin": "string o null - YYYY-MM, YYYY o 'Presente'",
        "texto_original": "string - Texto original del período"
      }},
      "gpa": "string o null - Promedio académico",
      "ubicacion": "string o null - Ciudad/País"
    }}
  ],
  "habilidades": {{
    "habilidades_tecnicas": [
      {{
        "skill": "string - Nombre de la habilidad",
        "level": "string o null - Básico|Intermedio|Avanzado|Experto",
        "years_experience": "number o null - Años de experiencia"
      }}
    ],
    "idiomas": [
      {{
        "idioma": "string - Nombre del idioma",
        "nivel": "string - Nivel de competencia",
        "certificacion": "string o null - Certificación"
      }}
    ],
    "habilidades_blandas": ["string - Lista de soft skills"]
  }},
  "perfiles_online": {{
    "linkedin": "string o null - URL de LinkedIn",
    "portfolio": "string o null - URL de portafolio",
    "github": "string o null - URL de GitHub",
    "otros": "object o null - Otros perfiles profesionales"
  }},
  "formacion_complementaria": {{
    "certificaciones_cursos": ["string - Lista de certificaciones y cursos"]
  }},
  "reconocimientos": {{
    "logros_premios": ["string - Lista de premios y reconocimientos"]
  }},
  "actividades_extracurriculares": {{
    "voluntariado": ["string - Experiencias de voluntariado"]
  }},
  "intereses": {{
    "hobbies_intereses": ["string - Lista de hobbies e intereses"]
  }}
}}
```

EJEMPLOS DE FORMATOS COMPLEJOS QUE DEBES MANEJAR:

**EJEMPLO 1 - Experiencia con responsabilidades multi-línea:**
```
Enero 2018 Hospital San José de Parral.
– Julio 2019 Tecnóloga médica.
             Encargada de la sección de Bacteriología.
             Microbiología, uroanálisis, parasitología y TBC.
             Encargada de la sección Hematología y UMT
```

**EXTRACCIÓN CORRECTA:**
- cargo: "Tecnóloga médica"
- empresa: "Hospital San José de Parral"
- periodo: "Enero 2018 - Julio 2019"
- logros: ["Encargada de la sección de Bacteriología", "Microbiología, uroanálisis, parasitología y TBC", "Encargada de la sección Hematología y UMT"]

REGLAS IMPORTANTES:
- Extrae información completa y precisa
- Usa null para campos faltantes
- Mantén texto original en descripciones
- CRÍTICO: Captura TODAS las líneas con indentación como responsabilidades separadas
- Identifica texto que sigue al cargo/empresa como descripción de tareas

RESPONDE ÚNICAMENTE CON JSON VÁLIDO. NO agregues texto adicional.
"""

    @staticmethod
    def get_contact_extraction_prompt() -> str:
        """Prompt especializado para extracción de datos de contacto"""
        return """
Extrae únicamente los datos de contacto del CV. Busca cuidadosamente:

**NOMBRE COMPLETO:**
- Buscar en la parte superior del CV
- Incluir nombre(s) y apellido(s) completos
- Evitar títulos profesionales o académicos

**EMAIL:**
- Debe ser un email válido con formato correcto
- Preferir emails profesionales sobre personales
- Si hay múltiples, elegir el más profesional

**TELÉFONO:**
- Incluir código de país si está presente
- Mantener formato original pero normalizar espacios
- Si hay múltiples, elegir el principal/móvil

**UBICACIÓN:**
- Ciudad y país más específicos disponibles
- Si solo hay país, usar solo país
- Formato: "Ciudad, País" o "País"

Responde con JSON:
```json
{
  "nombre_completo": "string",
  "telefono": "string o null",
  "email": "string",
  "ubicacion": "string",
  "metadata": {
    "confidence_general": "high|medium|low",
    "campos_encontrados": ["lista de campos encontrados"],
    "observaciones": "string con notas adicionales"
  }
}
```
"""

    @staticmethod
    def get_experience_extraction_prompt() -> str:
        """Prompt especializado para extracción de experiencia laboral"""
        return """
Extrae TODA la experiencia laboral mencionada en el CV. Para cada experiencia identifica:

**CARGO/PUESTO:**
- Título exacto del puesto ocupado
- Si hay múltiples títulos en una empresa, crear entradas separadas

**EMPRESA:**
- Nombre completo de la organización
- Incluir tipo de empresa si está mencionado

**PERÍODO:**
- Fechas de inicio y fin exactas
- Convertir a formato estructurado cuando sea posible
- Identificar trabajos actuales como "Presente"

**LOGROS Y RESPONSABILIDADES:**
- Extraer TODAS las viñetas/puntos mencionados
- Incluir métricas, tecnologías, logros específicos
- Mantener el texto original

**UBICACIÓN:**
- Ciudad/país donde se realizó el trabajo
- Solo si está explícitamente mencionado

**PATRONES A BUSCAR:**
- Secciones: "Experiencia", "Experience", "Work History", "Historial Laboral"
- Formatos de fecha: "2020-2023", "Ene 2020 - Presente", "Jan 2020 - Current"
- Indicadores de responsabilidades: •, -, *, números

Responde con JSON array:
```json
[
  {
    "cargo": "string",
    "empresa": "string",
    "periodo": {
      "fecha_inicio": "YYYY-MM o YYYY",
      "fecha_fin": "YYYY-MM, YYYY o Presente",
      "texto_original": "string"
    },
    "logros": ["array de strings"],
    "ubicacion": "string o null",
    "metadata": {
      "confidence_level": "high|medium|low",
      "extraction_method": "direct|inferred|parsed",
      "source_text": "texto original de esta experiencia"
    }
  }
]
```
"""

    @staticmethod
    def get_skills_extraction_prompt(analysis_hints: dict = None) -> str:
        """Prompt especializado para extracción profunda de habilidades"""

        # Construir instrucciones específicas para sistemas de evaluación
        rating_instructions = ""
        if analysis_hints and analysis_hints.get("rating_system"):
            rating_instructions = f"""
**SISTEMA DE EVALUACIÓN DETECTADO:**
{analysis_hints['rating_system']}

**CONVERSIÓN DE RATINGS:**
- ★★★★★ (5 estrellas) → Experto
- ★★★★☆ (4 estrellas) → Avanzado
- ★★★☆☆ (3 estrellas) → Intermedio
- ★★☆☆☆ (2 estrellas) → Básico
- ★☆☆☆☆ (1 estrella) → Principiante
- 90-100% → Experto
- 70-89% → Avanzado
- 50-69% → Intermedio
- 30-49% → Básico
- Experto/Expert/Avanzado → Experto
- Intermedio/Intermediate → Intermedio
- Básico/Basic/Principiante → Básico
"""

        skills_section_hint = ""
        if analysis_hints and analysis_hints.get("skills_section"):
            skills_section_hint = f"""
**SECCIÓN DE HABILIDADES DETECTADA:**
{analysis_hints['skills_section']}
"""

        return f"""
Eres un experto en análisis de habilidades profesionales. Extrae y categoriza TODAS las habilidades con sus niveles de evaluación.

{skills_section_hint}
{rating_instructions}

**BÚSQUEDA INTELIGENTE DE HABILIDADES:**
- Busca en secciones con nombres variables: "Habilidades", "Skills", "Competencias", "Conocimientos", "Aptitudes"
- Detecta sistemas de evaluación visual: estrellas (★), puntos (●), barras, porcentajes, niveles textuales
- Analiza contexto para categorizar correctamente (técnica vs blanda)
- Extrae habilidades agrupadas por categorías o mezcladas

**HABILIDADES TÉCNICAS:**
- Lenguajes: Python, JavaScript, Java, C++, SQL, etc.
- Frameworks: React, Django, Spring, Angular, Vue.js, etc.
- Herramientas: Git, Docker, Kubernetes, Jenkins, etc.
- Plataformas: AWS, Azure, GCP, Linux, etc.
- Bases de datos: MySQL, PostgreSQL, MongoDB, etc.
- Metodologías: Agile, Scrum, DevOps, etc.

**IDIOMAS:**
- Todos los idiomas con sus niveles exactos
- Certificaciones (TOEFL, IELTS, DELE, etc.)
- Conversión de niveles: A1-C2, Básico-Nativo, 1-5 estrellas

**HABILIDADES BLANDAS:**
- Liderazgo, comunicación, trabajo en equipo
- Resolución de problemas, pensamiento crítico
- Adaptabilidad, creatividad, organización

Responde con JSON:
```json
{{
  "habilidades_tecnicas": [
    {{
      "skill": "string",
      "level": "Básico|Intermedio|Avanzado|Experto o null",
      "years_experience": "number o null",
      "metadata": {{
        "confidence_level": "high|medium|low",
        "extraction_method": "direct|inferred|parsed",
        "source_text": "texto original"
      }}
    }}
  ],
  "idiomas": [
    {{
      "idioma": "string",
      "nivel": "string",
      "certificacion": "string o null",
      "metadata": {{
        "confidence_level": "high|medium|low",
        "extraction_method": "direct|inferred|parsed",
        "source_text": "texto original"
      }}
    }}
  ],
  "habilidades_blandas": ["array de strings"]
}}
```
"""

    @staticmethod
    def get_education_extraction_prompt() -> str:
        """Prompt especializado para extracción de educación"""
        return """
Extrae TODA la formación académica formal del CV:

**INFORMACIÓN A EXTRAER:**

**TÍTULO/GRADO:**
- Nombre completo del título: "Ingeniería en Sistemas", "Bachelor of Science"
- Incluir especialización si está mencionada
- Mantener idioma original

**INSTITUCIÓN:**
- Nombre completo de la universidad/institución
- Incluir siglas si están presentes

**PERÍODO:**
- Fechas de inicio y graduación
- Si está en curso, marcar fin como "Presente"
- Convertir a formato estructurado

**INFORMACIÓN ADICIONAL:**
- GPA/Promedio si está mencionado
- Honores, menciones especiales
- Ubicación de la institución

**PATRONES A BUSCAR:**
- Secciones: "Education", "Educación", "Formación Académica"
- Títulos: "Licenciatura", "Ingeniería", "Master", "PhD", "Técnico"
- Instituciones: "Universidad", "Instituto", "Colegio"

**EXCLUSIONES:**
- Cursos cortos (< 6 meses)
- Certificaciones profesionales (van en otra sección)
- Workshops o seminarios

Responde con JSON array:
```json
[
  {
    "titulo": "string",
    "institucion": "string",
    "periodo": {
      "fecha_inicio": "YYYY-MM o YYYY",
      "fecha_fin": "YYYY-MM, YYYY o Presente",
      "texto_original": "string"
    },
    "gpa": "string o null",
    "ubicacion": "string o null",
    "metadata": {
      "confidence_level": "high|medium|low",
      "extraction_method": "direct|inferred|parsed",
      "source_text": "texto original"
    }
  }
]
```
"""

    @staticmethod
    def get_validation_prompt() -> str:
        """Prompt para validación y limpieza de datos extraídos"""
        return """
Valida y corrige los datos de CV extraídos. Verifica:

**VALIDACIONES REQUERIDAS:**

1. **DATOS DE CONTACTO:**
   - Email tiene formato válido
   - Teléfono tiene al menos 7 dígitos
   - Nombre tiene al menos 2 palabras
   - Ubicación es coherente

2. **FECHAS Y PERÍODOS:**
   - Fechas en formato correcto (YYYY-MM o YYYY)
   - Fecha fin >= fecha inicio
   - Períodos coherentes entre experiencias
   - "Presente" solo en trabajos actuales

3. **EXPERIENCIA LABORAL:**
   - Al menos una experiencia presente
   - Cargos y empresas no vacíos
   - Logros específicos y medibles

4. **EDUCACIÓN:**
   - Al menos un registro educativo
   - Títulos e instituciones válidos
   - Períodos coherentes

5. **HABILIDADES:**
   - Categorización correcta (técnicas vs blandas)
   - Niveles coherentes con experiencia
   - Sin duplicados

**CORRECCIONES A APLICAR:**
- Normalizar formatos de fecha
- Corregir emails malformados
- Limpiar caracteres especiales
- Eliminar duplicados
- Completar campos inferibles

**MÉTRICAS DE CALIDAD:**
- Completitud: % de campos obligatorios llenos
- Consistencia: coherencia entre secciones
- Precisión: calidad de la extracción

Responde con:
```json
{
  "datos_validados": {}, // CV corregido
  "validacion": {
    "es_valido": boolean,
    "completitud_score": number, // 0-100
    "errores": ["array de errores críticos"],
    "advertencias": ["array de advertencias"],
    "campos_faltantes": ["array de campos requeridos faltantes"],
    "sugerencias_mejora": ["array de sugerencias"]
  }
}
```
"""

    @staticmethod
    def get_junior_profile_prompt() -> str:
        """Prompt especializado para perfiles junior/recién graduados"""
        return """
Este CV pertenece a un perfil JUNIOR o recién graduado. Adapta la extracción considerando:

**CARACTERÍSTICAS ESPECIALES:**
- Poca o nula experiencia laboral formal
- Proyectos académicos como experiencia
- Prácticas/internships como experiencia válida
- Énfasis en educación y proyectos personales
- Certificaciones y cursos pueden ser más relevantes

**EXPERIENCIA ALTERNATIVA A BUSCAR:**
- Prácticas profesionales/internships
- Proyectos universitarios/académicos
- Trabajos de medio tiempo/temporales
- Freelance o proyectos personales
- Voluntariado con responsabilidades técnicas

**HABILIDADES TÉCNICAS:**
- Proyectos de curso como evidencia de skills
- GitHub/repositorios como evidencia
- Tecnologías aprendidas en cursos
- Certificaciones online (Coursera, Udemy, etc.)

**AJUSTES EN EXTRACCIÓN:**
- No exigir experiencia laboral mínima
- Valorar proyectos académicos como experiencia
- Incluir cursos relevantes en formación complementaria
- Detectar potencial a partir de proyectos

Usa el formato JSON estándar pero con criterios más flexibles para experiencia.
"""

    @staticmethod
    def get_senior_profile_prompt() -> str:
        """Prompt especializado para perfiles senior/ejecutivos"""
        return """
Este CV pertenece a un perfil SENIOR o ejecutivo. Adapta la extracción considerando:

**CARACTERÍSTICAS ESPECIALES:**
- Larga trayectoria profesional (10+ años)
- Posiciones de liderazgo y gestión
- Logros cuantificables y métricas de negocio
- Múltiples empresas y roles
- Posible educación ejecutiva (MBA, etc.)

**EXPERIENCIA A PRIORIZAR:**
- Cargos directivos y de liderazgo
- Logros en números: % mejoras, $ ahorros, equipos gestionados
- Transformaciones digitales lideradas
- Fusiones, adquisiciones, expansiones
- Reconocimientos y premios del sector

**HABILIDADES EJECUTIVAS:**
- Strategic planning, business development
- People management, team leadership
- P&L responsibility, budget management
- Stakeholder management
- Change management, digital transformation

**INFORMACIÓN ADICIONAL:**
- Board positions, advisory roles
- Speaking engagements, publicaciones
- Patentes, innovaciones desarrolladas
- Mentoring y desarrollo de talento

**AJUSTES EN EXTRACCIÓN:**
- Enfoque en impacto de negocio
- Métricas y KPIs como logros principales
- Timeline de promociones y crecimiento
- Red profesional y reconocimientos

Usa el formato JSON estándar con énfasis en liderazgo y resultados.
"""

    @staticmethod
    def get_technical_profile_prompt() -> str:
        """Prompt especializado para perfiles técnicos/ingeniería"""
        return """
Este CV pertenece a un perfil TÉCNICO especializado. Adapta la extracción considerando:

**CARACTERÍSTICAS ESPECIALES:**
- Stack tecnológico específico y profundo
- Proyectos técnicos complejos
- Arquitecturas, sistemas, metodologías
- Open source contributions
- Certificaciones técnicas especializadas

**EXPERIENCIA TÉCNICA A BUSCAR:**
- Arquitecturas diseñadas e implementadas
- Tecnologías específicas: frameworks, lenguajes, DBs
- Metodologías: Agile, DevOps, microservices
- Performance optimizations, scalability
- Security implementations

**HABILIDADES TÉCNICAS ESPECÍFICAS:**
- Programming languages con niveles de expertise
- Cloud platforms (AWS, Azure, GCP)
- DevOps tools (Docker, Kubernetes, CI/CD)
- Databases (SQL, NoSQL, BigData)
- Security tools y frameworks

**PROYECTOS Y CONTRIBUCIONES:**
- GitHub repositories y contributions
- Open source projects
- Technical articles, blogs
- Conference talks, technical presentations
- Patents o innovaciones técnicas

**CERTIFICACIONES TÉCNICAS:**
- Cloud certifications (AWS Solutions Architect, etc.)
- Technology-specific certs (Oracle, Microsoft, etc.)
- Security certifications (CISSP, CEH, etc.)
- Metodología certs (Scrum Master, PMP, etc.)

**AJUSTES EN EXTRACCIÓN:**
- Detallar stack tecnológico completo
- Niveles de experiencia por tecnología
- Arquitecturas y patrones implementados
- Métricas técnicas (performance, uptime, etc.)

Usa el formato JSON estándar con énfasis en profundidad técnica.
"""

    @staticmethod
    def get_creative_profile_prompt() -> str:
        """Prompt especializado para perfiles creativos/diseño"""
        return """
Este CV pertenece a un perfil CREATIVO (diseño, marketing, contenido). Adapta la extracción:

**CARACTERÍSTICAS ESPECIALES:**
- Portfolio como elemento central
- Proyectos creativos y campañas
- Herramientas de diseño especializadas
- Colaboraciones y clientes destacados
- Awards y reconocimientos creativos

**EXPERIENCIA CREATIVA:**
- Campañas desarrolladas y su impacto
- Clientes o marcas trabajadas
- Colaboraciones con equipos creativos
- Proyectos personales y freelance
- Exhibitions, shows, publicaciones

**HABILIDADES CREATIVAS:**
- Design tools: Adobe Creative Suite, Figma, Sketch
- Marketing tools: Analytics, social media platforms
- Content creation: video, photo, copywriting
- Brand development, UX/UI design
- Project management en contexto creativo

**PORTFOLIO Y TRABAJOS:**
- URLs de portfolio, Behance, Dribbble
- Proyectos destacados con descripción
- Métricas creativas: engagement, conversions
- Collaborations con influencers/brands
- Awards, features, press mentions

**FORMACIÓN CREATIVA:**
- Art schools, design degrees
- Workshops, masterclasses
- Online courses específicos de diseño
- Certifications en herramientas creativas

**AJUSTES EN EXTRACCIÓN:**
- Énfasis en portfolio links
- Proyectos como experiencia válida
- Tools creativos como skills técnicas
- Impacto visual/engagement como métricas

Usa el formato JSON estándar adaptado para el mundo creativo.
"""

    @staticmethod
    def get_multilingual_prompt() -> str:
        """Prompt para CVs en múltiples idiomas o idiomas no-inglés"""
        return """
Este CV está en múltiples idiomas o en un idioma específico. Consideraciones especiales:

**DETECCIÓN DE IDIOMA:**
- Identificar idioma principal del CV
- Detectar secciones en diferentes idiomas
- Normalizar términos según el contexto

**TRADUCCIONES Y EQUIVALENCIAS:**
- Títulos académicos: traducir a equivalentes estándar
- Cargos profesionales: normalizar a términos internacionales
- Instituciones: mantener nombre original + país
- Certificaciones: traducir si es necesario

**FORMATOS CULTURALES:**
- Fechas en diferentes formatos (DD/MM/YYYY vs MM/DD/YYYY)
- Nombres con diferentes estructuras culturales
- Direcciones y teléfonos según país
- Títulos profesionales específicos del país

**TÉRMINOS COMUNES POR IDIOMA:**

**ESPAÑOL:**
- "Experiencia Laboral", "Historial Profesional"
- "Formación Académica", "Educación"
- "Habilidades", "Competencias", "Destrezas"
- "Datos Personales", "Información de Contacto"

**PORTUGUÉS:**
- "Experiência Profissional", "Histórico Profissional"
- "Formação Acadêmica", "Educação"
- "Habilidades", "Competências"
- "Dados Pessoais", "Informações de Contato"

**FRANCÉS:**
- "Expérience Professionnelle"
- "Formation", "Éducation"
- "Compétences", "Qualifications"
- "Coordonnées", "Informations Personnelles"

**ALEMÁN:**
- "Berufserfahrung", "Werdegang"
- "Ausbildung", "Bildung"
- "Fähigkeiten", "Kompetenzen"
- "Kontaktdaten", "Persönliche Daten"

**AJUSTES EN EXTRACCIÓN:**
- Mantener nombres originales de instituciones
- Traducir solo cuando sea necesario para claridad
- Preservar formatos culturales específicos
- Detectar equivalencias de títulos académicos

Responde siempre en el formato JSON estándar con campos en inglés.
"""