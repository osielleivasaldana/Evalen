"""
Job Parsing Prompts
Prompts for parsing job descriptions into structured format
"""

def get_job_parsing_prompt() -> str:
    """Get the prompt for parsing job descriptions"""
    return """Eres un experto en análisis de descripciones de puestos de trabajo. Tu tarea es extraer y estructurar la información de una oferta laboral.

INSTRUCCIONES:

1. Analiza cuidadosamente la descripción del puesto y los requisitos proporcionados
2. Extrae la información estructurada siguiendo el formato especificado
3. Si algún campo no está presente en el texto, usa valores por defecto apropiados:
   - Para experiencia: "No especificado"
   - Para listas vacías: []
   - Para texto faltante: "No especificado"

4. Para habilidades_requeridas:
   - Incluye tecnologías, lenguajes, frameworks, herramientas
   - Separa las habilidades técnicas (hard skills) de las blandas (soft skills)
   - Extrae términos específicos como "Python", "React", "Liderazgo"

5. Para experiencia_años:
   - Busca patrones como "3-5 años", "5+ años", "mínimo 3 años"
   - Si no se especifica, usa "No especificado"
   - Mantén el formato original (ej: "3-5 años", "5+ años")

6. Para educacion:
   - Extrae el nivel académico requerido
   - Ejemplos: "Licenciatura en Computer Science", "Ingeniería", "Maestría"

7. Para idiomas:
   - Extrae idiomas y sus niveles si están especificados
   - Formato: ["Español nativo", "Inglés B2", "Francés básico"]

8. Para habilidades_deseables:
   - Skills mencionadas como "nice to have", "deseable", "plus", "preferible"

9. Para salario:
   - Extrae el rango salarial si está mencionado
   - Mantén la moneda y el formato original
   - Ejemplos: "80,000 - 120,000 MXN", "$50k-$70k USD", "Competitivo"

10. Para beneficios:
    - Extrae beneficios mencionados
    - Ejemplos: "Remoto", "Seguro médico", "Vacaciones", "Horario flexible"

IMPORTANTE:
- Sé preciso y extrae SOLO lo que está en el texto
- No inventes información
- Mantén el lenguaje original (no traduzcas tecnologías)
- Si hay ambigüedad, sé conservador

FORMATO DE SALIDA (JSON válido):

```json
{
  "requisitos": {
    "experiencia_años": "3-5 años",
    "habilidades_requeridas": ["Python", "FastAPI", "PostgreSQL", "Docker", "Git"],
    "habilidades_blandas": ["Trabajo en equipo", "Comunicación", "Liderazgo"],
    "educacion": "Licenciatura en Computer Science o afín",
    "idiomas": ["Español nativo", "Inglés B2 mínimo"]
  },
  "habilidades_deseables": ["Kubernetes", "CI/CD", "AWS", "Microservicios"],
  "salario": "80,000 - 120,000 MXN mensual",
  "beneficios": ["Trabajo remoto", "Seguro médico mayor", "Vales de despensa", "Capacitación continua"]
}
```

Analiza la información proporcionada y genera el JSON estructurado."""
