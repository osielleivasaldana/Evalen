# Currify - AI-Powered Resume Extraction Platform

Currify es una innovadora plataforma SaaS que transforma currículums en datos estructurados utilizando inteligencia artificial avanzada. Extrae y organiza información clave de cualquier formato de currículum, permitiendo búsquedas y análisis mucho más ágiles.

## 🚀 Características Principales

### ✨ Extracción Inteligente
- **Múltiples formatos**: PDF, DOCX, DOC, TXT, RTF
- **Detección automática** de tipo de perfil (Junior, Senior, Técnico, Creativo)
- **Extracción estructurada** con metadatos de confianza
- **Soporte multiidioma** (Español, Inglés, Francés, Alemán, Portugués)

### 📊 Procesamiento Avanzado
- **Procesamiento individual** con análisis en tiempo real
- **Procesamiento por lotes** asíncrono hasta 50 archivos
- **Validación automática** de datos extraídos
- **Métricas de calidad** y completitud

### 📈 Analytics y Métricas
- **Tendencias de extracciones** por período
- **Insights por tipo de perfil** profesional
- **Benchmarks de calidad** del sistema
- **Correlaciones** entre métricas

### 🔧 Tecnología
- **FastAPI** para APIs de alto rendimiento
- **Claude AI** (Anthropic) para procesamiento inteligente
- **Pydantic** para validación robusta de datos
- **Rate limiting** y autenticación JWT

## 📋 Requisitos

- Python 3.8+
- API Key de Anthropic (Claude)
- Dependencias en `requirements.txt`

## 🛠️ Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd currify
```

2. **Crear entorno virtual**
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

3. **Instalar dependencias**
```bash
pip install -r requirements.txt
```

4. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

Variables requeridas en `.env`:
```env
ANTHROPIC_API_KEY=tu_api_key_de_anthropic
API_SECRET_KEY=tu_clave_secreta_jwt
CLAUDE_MODEL=claude-3-haiku-20240307
ENVIRONMENT=development
```

5. **Ejecutar la aplicación**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📚 Uso de la API

### Autenticación
Primero obtén un token de acceso:

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "change-me-in-production"}'
```

### Extraer CV Individual

```bash
curl -X POST "http://localhost:8000/resume/extract" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@cv_ejemplo.pdf"
```

### Extraer por Lotes

```bash
curl -X POST "http://localhost:8000/resume/extract-batch" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@cv1.pdf" \
  -F "files=@cv2.docx" \
  -F "files=@cv3.txt"
```

### Análisis de Perfil Rápido

```bash
curl -X POST "http://localhost:8000/resume/analyze-profile" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@cv_ejemplo.pdf"
```

### Consultar Métricas

```bash
curl -X GET "http://localhost:8000/analytics/extraction-trends?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Estructura de Datos Extraídos

```json
{
  "datos_contacto": {
    "nombre_completo": "Juan Pérez García",
    "email": "juan.perez@email.com",
    "telefono": "+34 123 456 789",
    "ubicacion": "Madrid, España"
  },
  "titular_profesional": {
    "titular": "Desarrollador Full Stack Senior"
  },
  "experiencia_laboral": [
    {
      "cargo": "Senior Developer",
      "empresa": "Tech Company S.L.",
      "periodo": {
        "fecha_inicio": "2020-01",
        "fecha_fin": "Presente",
        "texto_original": "Enero 2020 - Presente"
      },
      "logros": [
        "Desarrollo de aplicaciones web con React y Node.js",
        "Liderazgo de equipo de 5 desarrolladores"
      ]
    }
  ],
  "habilidades": {
    "habilidades_tecnicas": [
      {
        "skill": "JavaScript",
        "level": "Avanzado",
        "years_experience": 5
      }
    ],
    "idiomas": [
      {
        "idioma": "Inglés",
        "nivel": "C1 Avanzado",
        "certificacion": "TOEFL"
      }
    ]
  }
}
```

## 🎯 Tipos de Perfil Detectados

- **Junior**: Recién graduados, poca experiencia, énfasis en educación
- **Senior**: Liderazgo, gestión, experiencia extensa (5+ años)
- **Técnico**: Stack tecnológico especializado, proyectos complejos
- **Creativo**: Diseño, marketing, portfolio-centrado

## 📈 Endpoints Disponibles

### Resume Extraction
- `POST /resume/extract` - Extracción individual
- `POST /resume/extract-text` - Desde texto ya extraído
- `POST /resume/extract-batch` - Procesamiento por lotes
- `GET /resume/batch/{job_id}` - Estado de lote
- `POST /resume/analyze-profile` - Análisis rápido de perfil
- `POST /resume/validate` - Validación de datos

### Analytics
- `GET /analytics/extraction-trends` - Tendencias temporales
- `GET /analytics/profile-insights` - Insights por perfil
- `GET /analytics/quality-metrics` - Métricas de calidad
- `GET /analytics/benchmarks` - Comparativas

### Sistema
- `GET /` - Health check básico
- `GET /health` - Health check detallado
- `POST /auth/login` - Autenticación

## 🔧 Configuración Avanzada

### Límites del Sistema
- **Tamaño máximo**: 10MB por archivo
- **Lote máximo**: 50 archivos
- **Timeout**: 60 segundos por extracción
- **Rate limiting**: 100 requests/minuto

### Formatos Soportados
- **PDF**: PyPDF2 + pdfplumber fallback
- **Word**: python-docx (.docx, .doc)
- **Texto**: UTF-8, Latin-1, CP1252
- **RTF**: striprtf

## 🏗️ Arquitectura

```
currify/
├── app/
│   ├── api/                 # Endpoints FastAPI
│   │   ├── resume.py       # API principal de CV
│   │   ├── analytics.py    # API de métricas
│   │   └── auth.py         # Autenticación
│   ├── core/               # Configuración y prompts
│   │   ├── config.py       # Configuración general
│   │   ├── currify_config.py # Config específica
│   │   ├── resume_prompts.py # Prompts IA
│   │   └── security.py     # Seguridad JWT
│   ├── models/             # Modelos Pydantic
│   │   ├── resume.py       # Modelos de CV
│   │   └── auth.py         # Modelos de auth
│   ├── services/           # Lógica de negocio
│   │   ├── resume_extraction_service.py # Orquestador
│   │   ├── profile_detection_service.py # Detección perfil
│   │   ├── file_parser_service.py      # Parsers
│   │   └── anthropic_service.py        # Cliente IA
│   ├── utils/              # Utilidades
│   │   └── resume_validators.py # Validadores
│   └── main.py            # Aplicación principal
├── requirements.txt       # Dependencias
└── .env                  # Variables de entorno
```

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- 📧 Email: support@currify.com
- 📚 Documentación: [docs.currify.com](http://docs.currify.com)
- 🐛 Issues: [GitHub Issues](https://github.com/tu-usuario/currify/issues)

---

**Currify** - Transformando currículums en datos estructurados con IA 🚀