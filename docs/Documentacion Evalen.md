# **Documentación Oficial del Sistema: Evalen (Currify)**

## **1\. Visión General del Proyecto**

**Evalen** (con módulos internos denominados currify) es una plataforma avanzada de reclutamiento y selección de personal impulsada por Inteligencia Artificial. Su objetivo principal es automatizar el análisis de currículums (CVs), evaluar a los candidatos contra descripciones de cargos (campañas) de manera semántica, generar puntuaciones (scoring) precisas y gestionar el proceso de selección completo (pipeline).

### **Arquitectura de Alto Nivel**

El sistema sigue una arquitectura orientada a microservicios/servicios distribuidos compuesta por tres pilares fundamentales:

1. **currify-front**: Aplicación web frontend (SPA) para la interacción del usuario final (reclutadores, administradores).  
2. **currify-back**: API REST principal (Backend) que maneja la lógica de negocio, base de datos, autenticación, pagos y orquesta las peticiones.  
3. **currify-core**: Motor de Inteligencia Artificial y procesamiento de datos pesado (Backend secundario) dedicado exclusivamente a la extracción de texto, análisis semántico e interacción con modelos LLM.

## **2\. Motor de IA: currify-core**

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
  * file\_parser\_service.py: Encargado de leer PDFs y extraer texto crudo.  
  * resume\_extraction\_service.py / robust\_extraction\_service.py: Utiliza prompts (resume\_prompts.py) para obligar al LLM a convertir texto no estructurado del CV en un JSON estructurado con historial laboral, educación y habilidades.  
  * education\_normalizer.py: Estandariza los grados académicos (ej. "Ingeniería", "Bachelor", "Master").  
* **Servicios de Evaluación (Scoring):**  
  * dynamic\_rubric\_service.py: A partir de una descripción de cargo, genera dinámicamente una rúbrica de evaluación (qué pesar más, qué habilidades son excluyentes).  
  * scoring\_service.py: Cruza el JSON del candidato con la rúbrica y utiliza el llm\_service.py para generar un razonamiento y una nota final.  
* **Manejo de Prompts (app/core/):** Contiene las instrucciones precisas para el LLM (job\_parsing\_prompts.py, resume\_prompts.py, scoring\_rubric.py), garantizando respuestas consistentes.

## **3\. API Principal: currify-back**

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

## **4\. Interfaz de Usuario: currify-front**

La capa de presentación que interactúa con los usuarios. Está diseñada para ser reactiva, rápida y ofrecer una experiencia de usuario (UX) moderna.

### **Tecnologías Principales**

* **Lenguaje:** TypeScript  
* **Librería Core:** React.js  
* **Estilos:** Tailwind CSS (Framework de utilidades para diseño responsivo) \+ UI Components personalizados (basados posiblemente en Radix UI / shadcn/ui como se ve en src/components/ui/).  
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

## **5\. Infraestructura, Despliegue y DevOps**

El proyecto está preparado para la nube y entornos escalables mediante contenedores y la infraestructura como código (IaC).

* **Docker & Docker Compose (Dockerfile, docker-compose.yml, DOCKER\_SETUP.md):**  
  * Cada uno de los tres módulos cuenta con su propio Dockerfile optimizado (separación de dependencias de desarrollo Dockerfile.dev y producción).  
  * docker-compose.yml permite levantar todo el stack localmente (Core, Backend, Frontend y PostgreSQL) con un solo comando, facilitando el desarrollo.  
* **Infraestructura como Código (Terraform) (terraform/):**  
    * Configuración formalizada para **Google Cloud Platform (GCP)**.  
    * Incluye módulos para servicios (project_services/), manejo de secretos (modules/secrets/) y compute (Cloud Run).
* **CI/CD (GitHub Actions) (.github/workflows/deploy.yml):**  
  * Pipeline automatizado. Tras hacer push a la rama principal, automatiza las pruebas (tests del backend y core), la construcción de imágenes Docker y el despliegue al servidor de producción a través del script deploy.sh.

## **6\. Flujo Principal de Trabajo (Ejemplo: Evaluación de un CV)**

1. **Usuario (Frontend):** Entra a una Campaña específica en el Frontend y arrastra un archivo PDF en el componente FileUpload.tsx.  
2. **Frontend \-\> Backend:** El frontend hace un POST multipart al endpoint /documents/upload del currify-back.  
3. **Backend (Guards & DB):** El Backend verifica la sesión (JWT), descuenta un "crédito" al usuario en PostgreSQL (Prisma), y guarda el archivo.  
4. **Backend \-\> Core:** El Backend envía el PDF al currify-core (endpoint /api/resume/extract).  
5. **Core (Procesamiento):** El Core parsea el PDF. Usa prompts estrictos para que el LLM extraiga habilidades y experiencia. Valida la estructura con Pydantic.  
6. **Core \-\> Backend:** El Core devuelve el JSON limpio.  
7. **Backend \-\> Core (Scoring):** El Backend cruza este JSON con el texto de la Campaña y solicita un "Scoring" al Core. El Core devuelve las notas y justificaciones.  
8. **Backend \-\> DB \-\> Frontend:** El Backend guarda los resultados completos en PostgreSQL, asocia el Candidato a la Campaña y retorna la respuesta final al Frontend.  
9. **Usuario (Frontend):** El usuario visualiza la nota del candidato en la pantalla CVResults.tsx o dentro del CandidateDrawer.tsx.

*Documento generado automáticamente a partir del análisis del código fuente. Última actualización: Marzo 2026\.*