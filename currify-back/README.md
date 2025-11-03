# Currify Backend

Backend de la plataforma SaaS **Currify** para transformar currículums en datos estructurados usando inteligencia artificial.

## 🚀 Características

- **Autenticación JWT**: Sistema seguro de login/registro
- **Gestión de Campañas**: Crear campañas de reclutamiento con URLs públicas
- **Procesamiento de Documentos**: Subida y procesamiento automático de CVs (PDF, Word)
- **Análisis de Candidatos**: Búsquedas avanzadas y filtros
- **APIs RESTful**: Endpoints completos para todas las funcionalidades

## 📋 Requisitos Previos

- Node.js >= 18.0.0
- PostgreSQL >= 12
- npm o yarn

## ⚡ Instalación Rápida

1. **Clonar e instalar dependencias:**
```bash
npm install
```

2. **Configurar base de datos:**
```bash
# Copiar variables de entorno
cp .env.example .env

# Editar .env con tus credenciales de PostgreSQL
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/currify_db"
JWT_SECRET="tu-clave-secreta-jwt"
```

3. **Configurar Prisma y migrar base de datos:**
```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. **Iniciar servidor de desarrollo:**
```bash
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000`

## 📊 Estructura del Proyecto

```
src/
├── auth/           # Autenticación y autorización
├── campaigns/      # Gestión de campañas
├── candidates/     # Gestión de candidatos
├── documents/      # Procesamiento de documentos
├── prisma/         # Cliente de base de datos
└── main.ts         # Punto de entrada
```

## 🔑 Endpoints Principales

### Autenticación
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Inicio de sesión
- `GET /auth/profile` - Perfil del usuario

### Campañas
- `POST /campaigns` - Crear campaña
- `GET /campaigns` - Listar campañas del usuario
- `GET /campaigns/public/:publicId` - Vista pública de campaña
- `PATCH /campaigns/:id` - Actualizar campaña

### Documentos
- `POST /documents/upload` - Subir documento (público)
- `GET /documents/:id/download` - Descargar documento

### Candidatos
- `GET /candidates/campaign/:campaignId` - Listar candidatos
- `GET /candidates/:id` - Detalle de candidato
- `POST /candidates/campaign/:campaignId/search-by-skills` - Búsqueda por habilidades

## 🗄️ Modelos de Base de Datos

### User
- Usuarios/empresas registradas en la plataforma

### Campaign
- Campañas de reclutamiento con URL pública única

### Candidate
- Candidatos con datos estructurados procesados por IA

### Document
- Documentos subidos (PDFs, Word) con metadatos

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod

# Base de datos
npx prisma migrate dev
npx prisma studio
npx prisma generate

# Prisma Studio (GUI para la BD)
npx prisma studio
```

## 🧪 Ejemplo de Uso

1. **Registrar usuario:**
```json
POST /auth/register
{
  "email": "empresa@email.com",
  "password": "password123",
  "name": "Mi Empresa",
  "company": "Tech Corp"
}
```

2. **Crear campaña:**
```json
POST /campaigns
{
  "title": "Desarrollador Full Stack",
  "description": "Buscamos desarrollador con experiencia en React y Node.js",
  "requirements": "3+ años de experiencia",
  "conditions": "Remoto, $60k-80k"
}
```

3. **Subir CV (público):**
```bash
curl -X POST http://localhost:3000/documents/upload \
  -F "file=@curriculum.pdf" \
  -F "campaignPublicId=clt..." \
  -F "candidateEmail=candidato@email.com"
```

## 🤖 Procesamiento con IA

El sistema incluye un simulador de procesamiento de documentos que:
- Extrae texto del documento
- Identifica datos estructurados (nombre, email, habilidades, experiencia)
- Almacena la información en formato JSON para búsquedas

Para integración real con IA, reemplaza el método `extractDataFromDocument` en `documents.service.ts`.

## 🚀 Despliegue

Para producción, configura:
- Variables de entorno seguras
- Base de datos PostgreSQL en la nube
- Almacenamiento de archivos (AWS S3, Cloudinary)
- Integración con APIs de procesamiento de documentos

## 📝 Notas

- Los archivos se almacenan localmente en `/uploads`
- El procesamiento de documentos está simulado
- Las URLs públicas de campañas son seguras y únicas
- Incluye validaciones y manejo de errores completo