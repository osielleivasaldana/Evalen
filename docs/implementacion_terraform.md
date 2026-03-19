# Implementación de Infraestructura con Terraform y CI/CD

Este documento detalla el proceso paso a paso realizado para desplegar la plataforma **Currify** en **Google Cloud Platform (GCP)** utilizando **Infrastructure as Code (IaC)** con Terraform y automatización con **GitHub Actions**.

## Descripción General de la Arquitectura
La aplicación se compone de tres servicios principales desplegados en **Cloud Run**:
1.  **Frontend (React/Nginx):** Servidor web para la interfaz de usuario.
2.  **Backend (NestJS):** API principal que gestiona la lógica de negocio y autenticación.
3.  **Core (FastAPI/Python):** Servicio especializado en el procesamiento y scoring de CVs mediante IA.

La base de datos utilizada es **NeonDB** (PostgreSQL externo), conectada a través de variables de entorno seguras.

---

## Paso a Paso de la Implementación

### 1. Estructura de Terraform
Se diseñó un sistema modular para mayor mantenibilidad:
-   `modules/project_services`: Habilita las APIs necesarias en GCP (Cloud Run, Secret Manager, Artifact Registry, etc.).
-   `modules/secrets`: Gestiona la creación de secretos en **Google Secret Manager** para evitar subir credenciales al repositorio.
-   `modules/compute`: Define los servicios de **Cloud Run** y un **Cloud Run Job** específico para ejecutar las migraciones de Prisma.

### 2. Configuración de Secretos
Se implementaron los siguientes secretos críticos en GCP Secret Manager:
-   `DATABASE_URL`: Cadena de conexión a NeonDB.
-   `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`: Para el inicio de sesión con Google OAuth.
-   `STRIPE_SECRET_KEY`: Para la gestión de pagos y suscripciones.

### 3. Automatización con GitHub Actions
Se configuró un flujo de CI/CD (`.github/workflows/deploy.yml`) que realiza lo siguiente en cada *push* a la rama `main`:
1.  **Build:** Construye las imágenes Docker de los tres servicios.
2.  **Build-Args:** Inyecta variables de tiempo de compilación al frontend (ej. `REACT_APP_API_URL`).
3.  **Push:** Sube las imágenes a **Google Artifact Registry**.
4.  **Deploy:** Despliega las nuevas versiones a Cloud Run.
5.  **Migrations:** Ejecuta el Cloud Run Job para aplicar automáticamente los cambios de base de datos con Prisma.

### 4. Correcciones Críticas Realizadas
-   **Inter-Service Communication:** Se configuró el Backend para que use la URL pública del Core (`SCORING_SERVICE_URL`) en lugar de rutas locales de Docker.
-   **Google OAuth Redirects:** Se ajustó la lógica del frontend para que las redirecciones de Google apunten correctamente al dominio de producción del backend.
-   **Payments 404/GET Fix:** Se robusteció la concatenación de URLs en el frontend para evitar redirecciones que transformaban peticiones `POST` en `GET`, solucionando el error al intentar mejorar al plan Pro.

---

## Estado Actual y Mejoras en Proceso

Actualmente, estamos finalizando la sincronización de la base de datos de producción.

### Item en Proceso: Mejora de Conexión NeonDB
Se está actualizando la configuración de Terraform para asegurar que el backend utilice la cadena de conexión de alto rendimiento de NeonDB:

**Variable de Conexión Destino:**
`postgresql://neondb_owner:npg_7IkPBEKxbX6N@ep-mute-mountain-ackussmo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

**Impacto:**
-   **Seguridad:** Forzamos `sslmode=require` para proteger los datos en tránsito.
-   **Rendimiento:** Se utiliza el pooler de Neon para optimizar las conexiones concurrentes del backend.
-   **Persistencia:** Esta cadena de conexión se almacena cifrada en **Secret Manager** y se inyecta dinámicamente al contenedor en tiempo de ejecución.

---

> [!IMPORTANT]
> **Próximo Paso Manual:** Resolver el estado de migración fallida en NeonDB mediante el comando `npx prisma migrate resolve --applied "20250929134217_init"` para desbloquear el pipeline de despliegue.
