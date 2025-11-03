"""
Servicio de prompting avanzado para extracciones profundas de CV
Implementa técnicas como Chain-of-Thought, Few-Shot Learning, etc.
"""
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class AdvancedPromptingService:
    """
    Servicio que implementa técnicas avanzadas de prompting para mejorar la extracción
    """

    def __init__(self):
        self.examples = self._load_few_shot_examples()

    def create_chain_of_thought_prompt(self, document_text: str, analysis_hints: Dict) -> str:
        """
        Crea un prompt usando Chain-of-Thought para análisis paso a paso
        """
        return f"""
Eres un experto analista de CV que debe extraer información usando razonamiento paso a paso.

**TEXTO DEL CV:**
{document_text[:2000]}...

**ANÁLISIS PASO A PASO - PIENSA EN VOZ ALTA:**

**PASO 1: IDENTIFICACIÓN DE SECCIONES**
Primero, identifica TODAS las secciones del documento, sin importar cómo estén nombradas:
- Busca patrones como "INFORMACIÓN PERSONAL", "TITULOS", "FORMACION PROFESIONAL", "EXPERIENCIA LABORAL"
- Identifica separadores visuales (líneas, espacios, mayúsculas)
- Mapea cada sección con su contenido

**PASO 2: ANÁLISIS DE CONTENIDO POR SECCIÓN**
Para cada sección identificada:
- INFORMACIÓN PERSONAL → Extraer datos de contacto
- DESCRIPCIÓN/PERFIL → Extraer resumen profesional
- TÍTULOS/EDUCACIÓN → Extraer formación académica
- FORMACIÓN PROFESIONAL → Extraer certificaciones y cursos
- EXPERIENCIA → Extraer trabajos y responsabilidades

**PASO 3: EXTRACCIÓN SISTEMÁTICA**
Ahora extrae cada campo de manera metódica:

1. **DATOS DE CONTACTO:**
   - Busco nombres completos (no RUT)
   - Busco emails con formato @
   - Busco teléfonos con números
   - Busco direcciones geográficas

2. **EDUCACIÓN FORMAL (TÍTULOS):**
   - Busco títulos universitarios, grados, magísteres
   - Busco nombres de universidades
   - Busco años o períodos

3. **EXPERIENCIA LABORAL:**
   - Busco rangos de fechas
   - Busco nombres de empresas
   - Busco cargos o posiciones
   - Busco descripciones de responsabilidades

**PASO 4: VERIFICACIÓN Y CORRECCIÓN**
Reviso que no haya información perdida:
- ¿Extraje todos los títulos mencionados?
- ¿Extraje toda la experiencia laboral?
- ¿Los nombres están completos?

**RESULTADO FINAL - JSON:**
Basado en mi análisis paso a paso, extraigo:
"""

    def create_few_shot_prompt(self, document_text: str, section_type: str) -> str:
        """
        Crea un prompt con ejemplos Few-Shot para una sección específica
        """
        examples = self.examples.get(section_type, [])

        examples_text = ""
        for i, example in enumerate(examples, 1):
            examples_text += f"""
**EJEMPLO {i}:**
Texto: "{example['input']}"
Extracción: {example['output']}
"""

        return f"""
Eres un experto en extraer {section_type} de CVs. Aprende de estos ejemplos:

{examples_text}

**AHORA EXTRAE DE ESTE TEXTO:**
{document_text}

Usa el mismo patrón que los ejemplos. Extrae TODO el contenido relevante:
"""

    def create_decomposition_prompt(self, document_text: str, target_section: str) -> str:
        """
        Divide la extracción en sub-tareas específicas
        """
        if target_section == "formacion_academica":
            return f"""
TAREA: Extraer TODA la formación académica del CV de manera exhaustiva.

**SUB-TAREA 1: LOCALIZAR SECCIONES DE EDUCACIÓN**
Busca estas secciones (pueden tener nombres diferentes):
- "TÍTULOS", "EDUCACIÓN", "FORMACIÓN", "ACADEMIC", "STUDIES"
- "GRADO", "TÍTULO", "LICENCIATURA", "MAGISTER", "MBA"
- Cualquier mención de universidades, institutos, colegios

**SUB-TAREA 2: EXTRAER POR CATEGORÍAS**
Para cada título encontrado, extrae:
- Nombre exacto del título/grado
- Institución que lo otorgó
- Año o período
- Lugar/ciudad si está disponible
- Menciones especiales (mejor egresado, honor, etc.)

**SUB-TAREA 3: INCLUIR TODO TIPO DE FORMACIÓN**
No solo universitaria, también:
- Títulos técnicos
- Certificados
- Cursos relevantes para el CV principal
- Formación internacional

**TEXTO DEL CV:**
{document_text}

**RESPUESTA JSON - INCLUIR TODO LO ENCONTRADO:**
"""

        elif target_section == "experiencia_laboral":
            return f"""
TAREA: Extraer TODA la experiencia laboral del CV.

**SUB-TAREA 1: LOCALIZAR EXPERIENCIA**
Busca secciones como:
- "EXPERIENCIA LABORAL", "EXPERIENCE", "TRABAJO", "EMPLEOS"
- "TRAYECTORIA", "CARRERA", "PROFESIONAL"

**SUB-TAREA 2: IDENTIFICAR CADA TRABAJO**
Para cada empleo, busca:
- Fechas de inicio y fin (formatos: "2019 - 2023", "Enero 2019", "A la fecha")
- Nombre de la empresa
- Cargo o posición
- Descripción de responsabilidades
- Ubicación si está disponible

**SUB-TAREA 3: EXTRAER DETALLES COMPLETOS**
No solo el título del cargo, sino:
- Todas las responsabilidades listadas
- Logros específicos
- Proyectos mencionados

**TEXTO DEL CV:**
{document_text}

**RESPUESTA JSON - INCLUIR TODA LA EXPERIENCIA:**
"""

        else:
            return f"""
Extrae exhaustivamente toda la información de la sección {target_section}:

{document_text}
"""

    def create_self_correction_prompt(self, initial_extraction: Dict, document_text: str) -> str:
        """
        Prompt de auto-corrección para mejorar extracciones iniciales
        """
        return f"""
Eres un revisor experto. Tu trabajo es CORREGIR y COMPLETAR esta extracción inicial.

**EXTRACCIÓN INICIAL:**
{initial_extraction}

**TEXTO ORIGINAL DEL CV:**
{document_text[:1500]}...

**ERRORES COMUNES A CORREGIR:**

1. **INFORMACIÓN PERDIDA:**
   - ¿Se perdió algún título o trabajo mencionado en el texto?
   - ¿Faltan fechas, empresas o detalles importantes?

2. **CATEGORIZACIÓN INCORRECTA:**
   - ¿Hay títulos universitarios en formación complementaria?
   - ¿Hay trabajos principales omitidos?

3. **DATOS INCOMPLETOS:**
   - ¿Nombres cortados o incompletos?
   - ¿Fechas mal interpretadas?

4. **SECCIONES VACÍAS INCORRECTAMENTE:**
   - Si formacion_academica está vacía, ¿realmente no hay títulos en el texto?
   - Si experiencia_laboral está vacía, ¿realmente no hay trabajos?

**REVISA LÍNEA POR LÍNEA:**
Examina cada línea del CV y asegúrate de que toda información relevante fue extraída.

**CORRECCIÓN COMPLETA:**
Proporciona la versión CORREGIDA y COMPLETA:
"""

    def create_template_matching_prompt(self, document_text: str, detected_patterns: List[str]) -> str:
        """
        Usa patrones detectados para crear un prompt específico
        """
        pattern_instructions = ""

        for pattern in detected_patterns:
            if pattern == "uppercase_sections":
                pattern_instructions += "\n- Las secciones están en MAYÚSCULAS completas"
            elif pattern == "date_ranges":
                pattern_instructions += "\n- Las fechas usan formato 'YYYY - YYYY' o 'Mes YYYY'"
            elif pattern == "institutional_format":
                pattern_instructions += "\n- Formato institucional con títulos formales"

        return f"""
ANÁLISIS DE PATRONES DETECTADOS:{pattern_instructions}

Basado en estos patrones, extrae información usando la estructura específica del documento:

{document_text}

INSTRUCCIONES ESPECÍFICAS:
- Respeta el formato de fechas detectado
- Busca información donde típicamente aparece en este tipo de CV
- No asumas formatos estándar, adapta a lo encontrado

EXTRACCIÓN JSON:
"""

    def _load_few_shot_examples(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Carga ejemplos para Few-Shot Learning
        """
        return {
            "formacion_academica": [
                {
                    "input": "TITULO DE CONTADOR PUBLICO - AUDITOR LICENCIADO EN CONTABILIDAD Y AUDITORIA Otorgado por la Universidad Diego Portales.",
                    "output": """[{
                        "titulo": "Contador Público - Auditor, Licenciado en Contabilidad y Auditoría",
                        "institucion": "Universidad Diego Portales",
                        "periodo": {"texto_original": "No especificado"}
                    }]"""
                },
                {
                    "input": "2010 – 2011 Universidad MAYOR, Ciudad de Temuco. Magister en Administración de Empresas MBA Executive.",
                    "output": """[{
                        "titulo": "Magister en Administración de Empresas (MBA Executive)",
                        "institucion": "Universidad Mayor",
                        "periodo": {"fecha_inicio": "2010", "fecha_fin": "2011", "texto_original": "2010 – 2011"},
                        "ubicacion": "Temuco"
                    }]"""
                }
            ],
            "experiencia_laboral": [
                {
                    "input": "Enero 2019 Salfa Sur Limitada A la Fecha Gerente de Sucursal Valdivia (Venta de Vehículos, Repuestos, Accesorios) Me desempeño como Gerente responsable de la gestión comercial y administrativa",
                    "output": """[{
                        "cargo": "Gerente de Sucursal Valdivia",
                        "empresa": "Salfa Sur Limitada",
                        "periodo": {"fecha_inicio": "2019-01", "fecha_fin": "Presente", "texto_original": "Enero 2019 A la Fecha"},
                        "logros": ["Responsable de la gestión comercial y administrativa", "Venta de Vehículos, Repuestos, Accesorios"],
                        "ubicacion": "Valdivia"
                    }]"""
                }
            ]
        }

    def create_comprehensive_extraction_prompt(self, document_text: str, analysis_hints: Dict) -> str:
        """
        Combina múltiples técnicas en un prompt comprehensivo
        """
        return f"""
SISTEMA DE EXTRACCIÓN PROFUNDA DE CV - MODO EXPERTO

**CONTEXTO DEL DOCUMENTO:**
{analysis_hints.get('structure_type', 'Estructura detectada automáticamente')}

**METODOLOGÍA DE EXTRACCIÓN:**

1️⃣ **ANÁLISIS ESTRUCTURAL:**
Mapeo completo de secciones (ignoro nombres estándar, busco contenido):
- INFORMACIÓN PERSONAL/CONTACTO → datos_contacto
- DESCRIPCIÓN/PERFIL/RESUMEN → resumen_profesional
- TÍTULOS/EDUCACIÓN/FORMACIÓN ACADÉMICA → formacion_academica
- EXPERIENCIA/TRABAJO/LABORAL → experiencia_laboral
- FORMACIÓN PROFESIONAL/CURSOS → formacion_complementaria

2️⃣ **EXTRACCIÓN EXHAUSTIVA:**
Para cada sección identificada:
- Leo línea por línea
- No asumo formatos estándar
- Extraigo TODO el contenido relevante
- Mantengo información original

3️⃣ **VALIDACIÓN CRUZADA:**
Verifico que no se perdió información:
- ¿Todos los títulos mencionados están extraídos?
- ¿Toda la experiencia laboral está incluida?
- ¿Los datos de contacto están completos?

**TEXTO DEL CV:**
```
{document_text}
```

**EXTRACCIÓN SISTEMÁTICA:**

Ahora procedo a extraer metódicamente cada sección:

🎯 **DATOS DE CONTACTO** (de INFORMACIÓN PERSONAL):
- Nombre completo (sin RUT, sin títulos)
- Teléfono (números de contacto)
- Email (direcciones @)
- Ubicación (dirección o ciudad)

🎯 **TITULAR PROFESIONAL** (de DESCRIPCIÓN PROFESIONAL):
- Extraigo el titular principal de la descripción

🎯 **RESUMEN PROFESIONAL** (de DESCRIPCIÓN PROFESIONAL):
- Toda la descripción o perfil profesional

🎯 **FORMACIÓN ACADÉMICA** (de TÍTULOS):
- Todos los grados, títulos universitarios, licenciaturas
- Universidades e instituciones
- Años cuando estén disponibles

🎯 **EXPERIENCIA LABORAL** (de EXPERIENCIA LABORAL):
- Todos los trabajos con fechas, empresas, cargos
- Descripciones completas de responsabilidades

🎯 **FORMACIÓN COMPLEMENTARIA** (de FORMACIÓN PROFESIONAL):
- Diplomados, cursos, certificaciones
- Instituciones y duraciones

**RESULTADO JSON COMPLETO:**
"""