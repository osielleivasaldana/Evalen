# **Documentación Oficial del Sistema: Evalen (Currify)**

## **1. Visión General del Proyecto**

**Evalen** (con módulos internos denominados currify) es una plataforma avanzada de reclutamiento y selección de personal impulsada por Inteligencia Artificial. Su objetivo principal es automatizar el análisis de currículums (CVs), evaluar a los candidatos contra descripciones de cargos (campañas) de manera semántica, generar puntuaciones (scoring) precisas y gestionar el proceso de selección completo (pipeline).

### **Arquitectura de Alto Nivel**

El sistema sigue una arquitectura orientada a microservicios/servicios distribuidos compuesta por tres pilares fundamentales:

1. **currify-front**: Aplicación web frontend (SPA) para la interacción del usuario final (reclutadores, administradores).  
2. **currify-back**: API REST principal (Backend) que maneja la lógica de negocio, base de datos, autenticación, pagos y orquesta las peticiones.  
3. **currify-core**: Motor de Inteligencia Artificial y procesamiento de datos pesado (Backend secundario) dedicado exclusivamente a la extracción de texto, análisis semántico e interacción con modelos LLM.

## **2. Motor de IA: currify-core**

Este es el cerebro del sistema. Está diseñado para realizar tareas computacionalmente pesadas y de inteligencia artificial de forma aislada, evitando bloquear el hilo principal de la API transaccional.

### **Tecnologías Principales**

* **Lenguaje:** Python 3.x  
* **Framework:** FastAPI (Alta velocidad, tipado estático con Pydantic).  
* **IA & NLP:** Integración con LLMs (probablemente OpenAI vía LangChain u otra librería directa) para extracción estructurada y análisis semántico.  
* **Procesamiento de Documentos:** Librerías de parsing de PDF y estructuración de datos.  
* **Validación:** Pydantic para garantizar que los datos extraídos por la IA cumplan con un esquema estricto (nombre, email, experiencia, habilidades).

### **Funcionalidades y Módulos Principales**

* **API Endpoints (app/api/):**  
  * resume.py: Recibe documentos, los parsea y devuelve el texto estructurado.  
  * scoring.py: Recibe el perfil del candidato estructurado y los requisitos del puesto, devolviendo una evaluación detallada y un puntaje.  
  * analytics.py: Genera métricas sobre las extracciones y evaluaciones.  
* **Servicios de Extracción (app/services/):**  
  * file_parser_service.py: Encargado de leer PDFs y extraer texto crudo.  
  * resume_extraction_service.py / robust_extraction_service.py: Utiliza prompts (resume_prompts.py) para obligar al LLM a convertir texto no estructurado del CV en un JSON estructurado con historial laboral, educación y habilidades.  
  * education_normalizer.py: Estandariza los grados académicos (ej. "Ingeniería", "Bachelor", "Master").

#### Pipeline de Extracción de CV (Arquitectura Detallada)

El sistema de extracción de CVs utiliza una arquitectura de múltiples etapas con estrategias de recuperación:

```
Archivo → FileParserService → ResumeExtractionService → LLMService → DataStructurerService → ResumeData (Pydantic)
```

**1. FileParserService** (`app/services/file_parser_service.py`):
- Extrae texto bruto de múltiples formatos
- **Formatos soportados:** PDF (con OCR fallback), DOCX/DOC, TXT, RTF
- **Características clave:**
  - Procesamiento async con `asyncio.to_thread()`
  - Extracción híbrida PDF (combinación de modos default y layout para mejor manejo de columnas)
  - Fallback OCR con pytesseract + pdf2image cuando la extracción de texto yields < 100 caracteres
  - Corrección de artefactos de diacríticos (ej. "´ a" → "á", "n˜" → "ñ")
  - Validación: formato, tamaño (100B-50MB), filename

**2. ResumeExtractionService** (`app/services/resume_extraction_service.py`):
- Orquestación principal del proceso de extracción
- **Métodos principales:**
  - `extract_from_file()` - Punto de entrada que valida y parsea archivos
  - `extract_from_text()` - Lógica core de extracción con detección de perfil
  - `_execute_all_llm_extractions()` - Ejecuta múltiples estrategias de extracción LLM
  - `_apply_advanced_prompting()` - Aplica Chain-of-Thought, descomposición y autocorrección

**Pipeline de Extracción:**
1. **Análisis de Documento:** Usa `DocumentAnalyzerService` para detectar secciones
2. **Detección de Perfil:** Usa `ProfileDetectionService` para identificar tipo de candidato (JUNIOR, SENIOR, TECHNICAL, CREATIVE)
3. **Extracción Principal:** Llama al LLM con prompts específicos por perfil
4. **Prompting Avanzado:** Si quality < 0.5, aplica:
   - Chain-of-Thought (CoT) extraction
   - Descomposición para secciones faltantes
   - Autocorrección
   - Extracción comprehensiva de fallback
5. **Estructuración de Datos:** Usa `DataStructurerService` para normalizar salida

**Evaluación de Calidad:**
```python
# Calcula completitud basada en:
# - Info contacto (peso 1.0)
# - Experiencia laboral (peso 2.0)
# - Educación (peso 1.5)
# - Habilidades (peso 0.5)
```

**3. RobustExtractionService** (`app/services/robust_extraction_service.py`):
- Servicio alternativo con robustez mejorada
- **Características clave:**
  - Extracción por chunks para CVs > 4000 caracteres
  - Salidas estructuradas usando librería `instructor` para extracción basada en Pydantic
  - Cadena de fallback: Structured → JSON fallback → Extracción vacía
  - Deduplicación: Remueve experiencias/educación duplicadas por company+date
  - Normalización de fechas: Parsea diversos formatos (Enero 2018, 2018-2020, etc.)

**4. LLMService** (`app/services/llm_service.py`):
- Interfaz unificada para múltiples proveedores LLM
- **Proveedores soportados:** OpenAI, Anthropic (Claude), Google Gemini, Groq
- **Características clave:**
  - Control de concurrencia global con `asyncio.Semaphore`
  - Exponential backoff: reintentos en errores 429 con espera 2-60s + jitter
  - Extracción JSON: múltiples estrategias para extraer JSON de respuestas LLM
  - Seguridad: envuelve input del usuario en delimitadores para prevenir prompt injection

**5. DataStructurerService** (`app/services/data_structurer_service.py`):
- Normaliza y estructura output bruto del LLM en formato ResumeData consistente
- **Funciones principales:**
  - Fusión multi-fuente: Combina datos de extracción principal, técnicas avanzadas y validación
  - Clasificación Académica vs Complementaria: Separa títulos formales de cursos/diplomados
  - Parseo de fechas: Regex-based para diversos formatos
  - Generación de fallback: Crea estructura mínima válida en errores

**6. Modelos Resume** (`app/models/resume.py`):
- Modelos Pydantic: `ResumeData`, `ContactInfo`, `ProfessionalTitle`, `ProfessionalSummary`, `WorkExperience`, `Education`, `Skills`, `ThinkingResumeData`
- **Validadores:**
  - Validación de formato email
  - Normalización de nivel de habilidades (Básico/Intermedio/Avanzado/Experto)
  - Normalización de fechas (maneja "Presente", nulls)
  - Normalización de campos raíz (maneja LLM retornando estructuras planas)

**7. Prompts** (`app/core/resume_prompts.py`):
- Tipos de prompt:
  - `get_main_extraction_prompt()` - Extracción completa de CV con hints de análisis
  - `get_junior_profile_prompt()` - Adaptado para perfiles junior
  - `get_senior_profile_prompt()` - Enfatiza liderazgo/logros
  - `get_technical_profile_prompt()` - Enfoca en tech stack
  - `get_creative_profile_prompt()` - Enfoca en portfolio/herramientas
  - `get_multilingual_prompt()` - Maneja CVs multi-idioma

* **Servicios de Evaluación (Scoring):**  
  * dynamic_rubric_service.py: A partir de una descripción de cargo, genera dinámicamente una rúbrica de evaluación (qué peso tiene cada criterio, qué habilidades son excluyentes).  
  * scoring_service.py: Cruza el JSON del candidato con la rúbrica y utiliza el llm_service.py para generar un razonamiento y una nota final.  
* **Manejo de Prompts (app/core/):** Contiene las instrucciones precisas para el LLM (job_parsing_prompts.py, resume_prompts.py, scoring_rubric.py), garantizando respuestas consistentes.

## **3. API Principal: currify-back**

Este sistema actúa como el director de orquesta. Mantiene el estado de la aplicación, interactúa con la base de datos y provee datos seguros al frontend.

### **Tecnologías Principales**

* **Lenguaje:** TypeScript / Node.js  
* **Framework:** NestJS (Arquitectura modular, inyección de dependencias).  
* **Base de Datos:** PostgreSQL.  
* **ORM:** Prisma (prisma/schema.prisma). Facilita las migraciones y el tipado seguro de la DB.  
* **Autenticación:** Passport.js (JWT, Google OAuth2).  
* **Pagos:** Integración con Stripe (stripe.service.ts).

### **Funcionalidades y Módulos Principales**

* **Autenticación y Autorización (src/auth/):**  
  * Maneja registro, login tradicional (JWT) y SSO (Google).  
  * Incluye Guards (jwt-auth.guard.ts, roles.guard.ts) para proteger rutas según el rol del usuario (Admin, Reclutador) y usage.guard.ts para verificar si el usuario tiene créditos suficientes para evaluar un CV.  
* **Gestión de Usuarios (src/users/):**  
  * CRUD de usuarios. Control de créditos disponibles para evaluaciones.  
* **Campañas / Ofertas de Trabajo (src/campaigns/):**  
  * Permite crear puestos de trabajo. Las campañas almacenan la descripción del cargo que luego el currify-core usará para crear la rúbrica.  
* **Candidatos y Procesos (src/candidates/, src/processes/):**  
  * Almacena la información extraída de los candidatos.  
  * Gestiona el Pipeline/Workflow (ej. "En revisión", "Entrevista", "Rechazado") a través de processes.service.ts y actualización de etapas (update-stage.dto.ts).  
* **Sistema de Scoring (src/scoring/):**  
  * Actúa como puente. Cuando se sube un CV, este módulo envía los datos al currify-core vía HTTP interno, recibe el resultado analítico y lo persiste en la base de datos a través de Prisma.  
* **Gestión de Documentos (src/documents/):**  
  * Manejo seguro de la subida de archivos (CVs en PDF), validación de tipos y almacenamiento (posiblemente S3 o local).  
* **Pagos y Notificaciones (src/payments/, src/notifications/, src/email/):**  
  * Suscripciones o compra de créditos vía Stripe. Emisión de alertas del sistema y correos transaccionales (activación de cuenta, resultados).

## **4. Interfaz de Usuario: currify-front**

La capa de presentación que interactúa con los usuarios. Está diseñada para ser reactiva, rápida y ofrecer una experiencia de usuario (UX) moderna.

### **Tecnologías Principales**

* **Lenguaje:** TypeScript  
* **Librería Core:** React.js  
* **Estilos:** Tailwind CSS (Framework de utilidades para diseño responsivo) + UI Components personalizados (basados posiblemente en Radix UI / shadcn/ui como se ve en src/components/ui/).  
* **Enrutamiento:** React Router DOM (AppRouter.tsx).  
* **Servidor de Producción:** Nginx (nginx.conf) para servir los estáticos en los contenedores Docker.

### **Funcionalidades y Módulos Principales**

* **Dashboard (src/components/dashboard/):**  
  * Vista principal. Muestra métricas rápidas, procesos activos y atajos para subir nuevos CVs (DashboardUploadModal.tsx).  
* **Subida y Procesamiento (src/components/FileUpload.tsx, CVResults.tsx):**  
  * Interfaz drag-and-drop para cargar PDFs. Muestra el estado de carga y, posteriormente, el análisis devuelto por el motor de IA de forma visual y estructurada.  
* **Gestión de Campañas (src/components/campaigns/):**  
  * Formularios para crear y editar ofertas de empleo (CreateCampaign.tsx, EditCampaign.tsx), integrando editores de texto enriquecido (RichTextEditor.tsx).  
  * Vista pública de campañas (PublicCampaign.tsx) para que los candidatos apliquen externamente.  
* **Gestión de Candidatos (src/components/candidates/, src/components/processes/):**  
  * CandidatesManagerNew.tsx: Tabla o vista general para filtrar y buscar candidatos.  
  * CandidateProcessPanel.tsx: Panel interactivo (tipo Kanban o lista por pasos) para mover al candidato a través de las distintas fases del proceso de selección.  
  * CandidateDrawer.tsx / CandidateDetail.tsx: Vista detallada del perfil del candidato, mostrando su experiencia extraída y el análisis de coincidencia (match).  
* **Módulos Administrativos y de Negocio:**  
  * Auth: Interfaces completas de Login, Registro y Activación. Flujo de Onboarding (OnboardingWizard.tsx) para nuevos clientes.  
  * PricingPage.tsx: Vista de planes y precios conectada al módulo de pagos del backend.  
  * UserManagement.tsx: Panel exclusivo para administradores del sistema.

## **5. Infraestructura, Despliegue y DevOps**

El proyecto está preparado para la nube y entornos escalables mediante contenedores y la infraestructura como código (IaC).

* **Docker & Docker Compose (Dockerfile, docker-compose.yml, DOCKER_SETUP.md):**  
  * Cada uno de los tres módulos cuenta con su propio Dockerfile optimizado (separación de dependencias de desarrollo Dockerfile.dev y producción).  
  * docker-compose.yml permite levantar todo el stack localmente (Core, Backend, Frontend y PostgreSQL) con un solo comando, facilitando el desarrollo.  
* **Infraestructura como Código (Terraform) (terraform/):**  
  * Configuración formalizada para **Google Cloud Platform (GCP)**.  
  * Incluye módulos para servicios (project_services/), manejo de secretos (modules/secrets/) y compute (Cloud Run).
* **CI/CD (GitHub Actions) (.github/workflows/deploy.yml):**  
  * Pipeline automatizado. Tras hacer push a la rama principal, automatiza las pruebas (tests del backend y core), la construcción de imágenes Docker y el despliegue al servidor de producción a través del script deploy.sh.

## **6. Flujo Principal de Trabajo (Ejemplo: Evaluación de un CV)**

1. **Usuario (Frontend):** Entra a una Campaña específica en el Frontend y arrastra un archivo PDF en el componente FileUpload.tsx.  
2. **Frontend -> Backend:** El frontend hace un POST multipart al endpoint /documents/upload del currify-back.  
3. **Backend (Guards & DB):** El Backend verifica la sesión (JWT), descuenta un "crédito" al usuario en PostgreSQL (Prisma), y guarda el archivo.  
4. **Backend -> Core:** El Backend envía el PDF al currify-core (endpoint /api/resume/extract).  
5. **Core (Procesamiento):** El Core parsea el PDF. Usa prompts estrictos para que el LLM extraiga habilidades y experiencia. Valida la estructura con Pydantic.  
6. **Core -> Backend:** El Core devuelve el JSON limpio.  
7. **Backend -> Core (Scoring):** El Backend cruza este JSON con el texto de la Campaña y solicita un "Scoring" al Core. El Core devuelve las notas y justificaciones.  
8. **Backend -> DB -> Frontend:** El Backend guarda los resultados completos en PostgreSQL, asocia el Candidato a la Campaña y retorna la respuesta final al Frontend.  
9. **Usuario (Frontend):** El usuario visualiza la nota del candidato en la pantalla CVResults.tsx o dentro del CandidateDrawer.tsx.

## **7. Sistema de Planes y Suscripciones**

### Estructura de Planes

El sistema define tres niveles de planes mediante el enum `PlanTier` en Prisma:

```prisma
enum PlanTier {
  FREE
  PRO
  ENTERPRISE
}
```

### Límites por Plan

| Campo | FREE | PRO | ENTERPRISE |
|-------|------|-----|------------|
| cvCredits | 3 | 999 | 999 |
| campaignLimit | 1 | 999 | 999 |
| stripeStatus | null | ACTIVE | ACTIVE |

### Modelo de Usuario (Prisma)

```prisma
model User {
  // Plan & Credits
  plan              PlanTier    @default(FREE)  // FREE, PRO, ENTERPRISE
  trialEndsAt       DateTime?
  cvCredits         Int         @default(3)    // Créditos de extracción CV
  campaignLimit     Int         @default(1)    // Máx. campañas activas
  
  // Stripe Integration
  stripeCustomerId       String?   @unique
  stripeSubscriptionId   String?
  stripeStatus           StripeStatus?  // ACTIVE, PAST_DUE, CANCELED, INCOMPLETE, TRIALING
  stripePriceId          String?
}
```

### Servicio de Billing (`src/billing/billing.service.ts`)

El servicio de billing provee el estado actual de suscripción:

```typescript
async getBillingStatus(userId: string): Promise<BillingStatus>
```

**Retorna:**
- `status`: 'active' | 'trialing' | 'canceled' | 'past_due' | 'free'
- `planId`: 'pro_monthly' | 'free'
- `benefits.cvLimit`: 999 para PRO, 3 para FREE
- `benefits.campaignLimit`: 999 para PRO, 1 para FREE

### Integración Stripe (`src/payments/stripe.service.ts`)

**Métodos clave:**

1. **`createCheckoutSession(userId, plan)`** - Crea sesión de checkout de Stripe:
   ```typescript
   const session = await this.stripe.checkout.sessions.create({
       payment_method_types: ['card'],
       line_items: [{ price: priceId, quantity: 1 }],
       mode: 'subscription',
       success_url: `${FRONTEND_URL}/dashboard?checkout_success=true`,
       metadata: { userId, plan }
   });
   ```

2. **`handleWebhook(signature, payload)`** - Procesa webhooks de Stripe
   - Procesa eventos `checkout.session.completed`
   - Actualiza user plan a PRO, establece stripeStatus a ACTIVE

### Sistema de Créditos

**Usage Guard** (`src/common/guards/usage.guard.ts`):
```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCredits = this.reflector.get<number>('requiredCredits', context.getHandler());
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    
    if (dbUser.cvCredits < requiredCredits) {
        throw new HttpException({
            status: HttpStatus.PAYMENT_REQUIRED,
            error: 'Insufficient credits',
            message: 'You have run out of credits. Please upgrade your plan.',
            code: 'INSUFFICIENT_CREDITS'
        }, HttpStatus.PAYMENT_REQUIRED);
    }
    return true;
}
```

**Uso del Decorador:**
```typescript
@RequireCredits(1)
@UseGuards(JwtAuthGuard, UsageGuard)
@Post('extract')
async extractCV(...) { ... }
```

### Checkout Dummy (Modo Desarrollo)

Cuando `STRIPE_SECRET_KEY=dummy`:
- Asigna plan PRO al usuario
- Asigna límites altos (999 campañas, 999 CVs)
- Asigna stripeStatus como 'ACTIVE'
- Retorna `sessionId: 'dummy_session'` y `url: /dashboard?checkout_success=true`

---

## **8. Flujo de Onboarding**

### Datos Recolectados en Onboarding

El sistema recolecta información de perfil empresarial durante el onboarding:

```prisma
// Profiling & Onboarding
companySize        String?   // ej. "1-10", "11-50", "50-200", "200+"
hiringVolume       String?   // ej. "1-5", "5-20", "20+"
atsSystem          String?   // ej. "greenhouse", "lever", "workday"
onboardingCompleted Boolean  @default(false)
```

### Flujo de Registro

**Auth Service** (`src/auth/auth.service.ts`):

```typescript
async register(registerDto: RegisterDto) {
    // Crea usuario con plan FREE por defecto
    const user = await this.prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            company,
            role: 'ADMIN',  // Siempre ADMIN para SaaS
            plan: 'FREE',
            cvCredits: 3,
            campaignLimit: 1
        }
    });
    
    // Retorna JWT con info del plan
    const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        plan: user.plan,
        cvCredits: user.cvCredits,
        campaignLimit: user.campaignLimit
    };
}
```

### OAuth/Social Login (Google)

1. Usuario se autentica con Google
2. Si es nuevo → crea con `isActive: true`, `socialProvider: 'google'`
3. Si existe → vincula socialId
4. Retorna JWT con flag `onboardingPending: !user.company`

### Completación de Onboarding

```typescript
// UsersService
async updateCompany(userId: string, companyName: string) {
    return await this.prisma.user.update({
        where: { id: userId },
        data: {
            company: companyName,
            onboardingCompleted: true
        }
    });
}
```

### Onboarding State en JWT

```typescript
// Auth Service - Login/Register response
const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    company: user.company,
    onboardingPending: !user.company,  // Frontend usa esto para redirigir
    plan: user.plan,
    cvCredits: user.cvCredits,
    campaignLimit: user.campaignLimit
};
```

### Crédito de Cortesía

Los usuarios nuevos en plan FREE reciben:
- **3 CVs** credits para evaluaciones
- **1 campaña** activa

---

## **9. Flujo de Autenticación y Landing Page (Marzo 2026)**

### Landing Page Unificada

La página de inicio (landing) ahora reside en la ruta `/` (antes `/home`). Esta página contiene:

* **LandingNavbar**: Barra de navegación con theme toggle (dark/light). Si el usuario está autenticado, muestra "Ir al Dashboard".
* **HeroSection**: Carrusel con frases rotativas y botones CTA.
* **DemoSection**: Mockup interactivo con efectos hover.
* **FeaturesSection**: Grid de 3 beneficios.
* **HowItWorks**: Proceso en 3 pasos.
* **LandingPricing**: Tarjetas de planes (Starter $0, EvalenPro $49, Enterprise).
* **LandingFooter**: Links y pies de página.

### Flujo de Autenticación Unificado

El sistema implementa un flujo de autenticación optimizado donde **Login** es el punto de entrada principal:

```
Landing → /login?plan=free (Starter)
        → /login?plan=pro (EvalenPro)
```

**En /login:**
1. **Botón principal**: "Continuar con Google" - Registra usuarios nuevos o hace login si ya existen.
2. **Formulario fallback**: Email + Contraseña para usuarios sin cuenta Google.
3. **Link a Register**: "Regístrate gratis" → `/register` (página de backup).

### Parámetro `plan` en OAuth

Para preservar la intención del plan a través del flujo de OAuth:

1. **Frontend → Backend**: El parámetro `plan` se codifica en el estado OAuth:
   ```typescript
   const state = btoa(JSON.stringify({ plan: 'pro', csrf: randomString() }));
   window.location.href = `/auth/google?state=${state}`;
   ```

2. **Backend → Frontend**: El estado se preserva en el callback:
   ```typescript
   // auth.controller.ts
   res.redirect(`/auth/callback?token=${token}&new=${isNew}&state=${req.query.state}`);
   ```

3. **AuthCallback**: Decodifica el estado y redirige según el plan.

### Flujo de Redirección Post-Autenticación

El sistema implementa un enrutamiento condicional basado en el parámetro `plan`:

| Usuario | plan=free | plan=pro |
|---------|------------|----------|
| **Nuevo** | `/onboarding` → `/dashboard` | `/checkout` → `/dashboard` |
| **Existente** | `/dashboard` | `/checkout` → `/dashboard` |

**Detalles del flujo:**

1. **Free (Exploración)**:
   * URL: `/login?plan=free`
   * Autenticación (Google o Email)
   * Redirect a `/onboarding` (nuevos) o `/dashboard` (existentes)
   * Onboarding Wizard recolecta datos de empresa
   * Asigna créditos de cortesía (3 CVs, 1 campaña)

2. **Pro (Conversión)**:
   * URL: `/login?plan=pro`
   * Autenticación (Google o Email)
   * Redirect directo a `/checkout` (resumen de compra)
   * No pasa por onboarding (omite este paso)
   * Checkout muestra resumen: "Evalen Pro - $49/mes"

### Página de Checkout (/checkout)

La página de checkout muestra un resumen de compra antes de procesar el pago:

* **Plan**: Evalen Pro - $49/mes
* **Beneficios incluidos**: Campañas ilimitadas, CVs ilimitados, Smart Match, Exportación, Soporte
* **Resumen de precio**: Subtotal, impuestos, total
* **Botón**: "Confirmar y pagar $49/mes"
* **Procesamiento**: Spinner de 2 segundos (mock)
* **Resultado**: Redirect a `/dashboard?checkout_success=true`

**Características del Checkout:**
* **Header minimalista**: Solo logo + ícono de candado (sin navegación)
* **Protección de salida**: Si usuario intenta salir, muestra confirmación
* **Modo sin distracciones**: Oculta navbar completo durante checkout

### Página de Billing (/billing)

La página de billing muestra la gestión de suscripción para usuarios existentes:

* Muestra el plan actual (Free o Pro)
* Beneficios del plan activo
* Uso actual (campañas, CVs)
* Acciones: Ir al Dashboard, Cambiar Plan

**Nota**: `/billing` NO muestra pricing cards. Esa vista es solo para gestión de suscripción.

### Botones del Landing

| Ubicación | Botón | Destino |
|-----------|-------|---------|
| LandingNavbar | "Comenzar Gratis" | `/login?plan=free` |
| HeroSection | "Crear mi primera campaña gratis" | `/login?plan=free` |
| HowItWorks | "Empieza ahora gratis" | `/login?plan=free` |
| LandingPricing (Starter) | "Comenzar Gratis" | `/login?plan=free` |
| LandingPricing (Pro) | "Probar EvalenPro" | `/login?plan=pro` |

### Rutas de Autenticación

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/` | Landing page (pública) | Público |
| `/login` | Página principal de autenticación | Público |
| `/register` | Página de registro backup | Público |
| `/auth/callback` | Callback de OAuth | Público |
| `/onboarding` | Wizard para nuevos usuarios | Requiere auth |
| `/billing` | Gestión de suscripción | Requiere auth |
| `/checkout` | Resumen de compra + pago | Requiere auth |
| `/dashboard` | Dashboard principal | Requiere auth |

### Persistencia del Plan

El sistema usa múltiples estrategias para persistir la intención del plan:

1. **URL**: Parámetro `?plan=pro` en la URL de login
2. **sessionStorage**: Guarda `selectedPlan` al montar el componente de login
3. **OAuth State**: Codifica el plan en el estado OAuth para preservar entre redirects

Esta arquitectura garantiza que la intención del usuario (comprar Pro) se mantenga durante todo el flujo de autenticación.

*Documento generado automáticamente a partir del análisis del código fuente. Última actualización: Abril 2026.*
