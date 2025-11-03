# ?? Currify - Plataforma de Reclutamiento con IA

Currify es una plataforma moderna de reclutamiento que utiliza Inteligencia Artificial para evaluar y clasificar candidatos automáticamente.

## ?? Características

- **Evaluación Automática con IA**: Análisis de CVs usando Claude, GPT-4, Gemini o Groq
- **Gestión de Campañas**: Procesos de reclutamiento con etapas personalizables
- **Scoring Inteligente**: Puntuación automática basada en requisitos
- **Dashboard Interactivo**: Métricas y estadísticas en tiempo real
- **Sistema de Roles**: ADMIN, RECRUITER, INTERVIEWER

## ??? Arquitectura

currify-front/     # Frontend (React + TypeScript + TailwindCSS)
currify-back/      # Backend (NestJS + Prisma + PostgreSQL)
currify-core/      # AI Service (FastAPI + Anthropic/OpenAI/Google/Groq)

## ?? Requisitos

- Docker y Docker Compose
- API key de Anthropic, OpenAI, Google o Groq
- Token de Mapbox (para geocoding)

## ?? Instalación

### 1. Clonar repositorio

git clone https://github.com/osielleivasaldana/Evalen.git
cd Evalen

### 2. Configurar variables

cp .env.example .env
# Editar .env y agregar tus API keys

### 3. Levantar servicios

docker-compose up -d --build

### 4. Aplicar migraciones

docker exec currify-backend npx prisma migrate deploy

## ?? Servicios

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- AI Service: http://localhost:8000
- PostgreSQL: localhost:5432

## ?? Uso

1. Registrarse (primer usuario = ADMIN)
2. Crear campaña de reclutamiento
3. Compartir link con candidatos
4. El sistema evalúa CVs automáticamente
5. Revisar scores y gestionar proceso

## ?? Seguridad

- Contraseñas hasheadas con bcrypt
- JWT para autenticación
- Guards de autorización por roles
- CORS configurado

## ?? Variables de Entorno Críticas

LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=tu_key
REACT_APP_MAPBOX_TOKEN=tu_token
JWT_SECRET=tu_secret
ADMIN_PASSWORD=tu_password

## ?? Contacto

osielnet@outlook.com
