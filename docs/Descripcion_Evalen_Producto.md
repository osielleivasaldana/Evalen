# Evalen — Descripción del producto, actores y funcionalidades

> **Documento de referencia** generado a partir del código actual del repositorio
> (`currify-front`, `currify-back`, `currify-core`).
> **Fecha:** 2026-11-03
> **Fuente de verdad:** el código. `docs/Documentacion_Evalen.md` (abr-2026) y `README.md`
> están parcialmente desactualizados donde difieren.

---

## Índice

1. [Qué es Evalen](#1-qué-es-evalen)
2. [Arquitectura](#2-arquitectura)
3. [Tipos de usuario y permisos](#3-tipos-de-usuario-y-permisos)
4. [Funcionalidades por módulo](#4-funcionalidades-por-módulo)
5. [Capacidades de IA](#5-capacidades-de-ia)
6. [Planes, créditos y facturación](#6-planes-créditos-y-facturación)
7. [Flujos end-to-end](#7-flujos-end-to-end)
8. [Modelo de datos (resumen)](#8-modelo-de-datos-resumen)
9. [Mapa de rutas del frontend](#9-mapa-de-rutas-del-frontend)
10. [Limitaciones y observaciones actuales](#10-limitaciones-y-observaciones-actuales)

---

## 1. Qué es Evalen

**Evalen** (código interno: *Currify*) es una plataforma SaaS de reclutamiento asistida por
Inteligencia Artificial. Reemplaza la revisión manual de currículums con un flujo automatizado
de extracción, evaluación y gestión del proceso de selección.

Núcleo de valor:

- **Extracción estructurada** de datos desde CVs (PDF/DOC/DOCX/TXT/RTF con OCR de respaldo).
- **Scoring semántico** del candidato contra los requisitos de una campaña.
- **Pipeline de selección** por etapas, con responsables, feedback obligatorio y auditoría.
- **IA auxiliar**: *Smart Fill* (redacción de la campaña) y *guía de entrevista* por etapa.

**Promesa central:** reducir de **horas a minutos** la evaluación de un lote de candidatos,
con menos sesgo y trazabilidad completa.

**Usuarios objetivo** (según `PRODUCT.md`): reclutadores profesionales, equipos de HR,
hiring managers técnicos y agencias de reclutamiento. Contexto laboral, escritorio,
jornada laboral.

---

## 2. Arquitectura

Evalen se compone de tres servicios independientes:

| Servicio | Stack | Rol |
|---|---|---|
| `currify-front` | React + TypeScript + Vite + Tailwind CSS | SPA: landing, portal público, panel de reclutador y panel OWNER |
| `currify-back` | NestJS + Prisma + PostgreSQL | API REST: negocio, auth, permisos, pagos, auditoría, orquestación |
| `currify-core` | FastAPI + Pydantic + LLM | Motor de IA: extracción, scoring, Smart Fill, guía de entrevista, analítica |

### Flujo de comunicación

```
Navegador
   │  HTTPS / JWT
   ▼
currify-front ──► currify-back ──► currify-core
                     │                  │
                     ▼                  ▼
                 PostgreSQL        LLM Providers
              (Prisma ORM)   (Anthropic/OpenAI/Gemini/Groq)
```

- El frontend **nunca** llama a la IA directamente.
- `currify-back` se autentica contra `currify-core` (token con caché) y registra el consumo
  de tokens en la tabla `LlmUsageLog`.
- `currify-core` expone endpoints bajo `/resume`, `/scoring`, `/smart-fill`, `/interview`
  y `/analytics`.

---

## 3. Tipos de usuario y permisos

Existen **4 roles internos** (`enum UserRole`) más **1 actor público sin cuenta**.

### 3.1 Resumen ejecutivo

| Actor | Rol `UserRole` | Ámbito | Se crea por |
|---|---|---|---|
| Candidato público | *(ninguno)* | Una campaña pública | Acceso por enlace |
| Super-administrador | `OWNER` | Toda la plataforma | Scripts / CI (`OWNER_EMAIL`) |
| Administrador de empresa | `ADMIN` | Su empresa | Registro / OAuth (rol por defecto) |
| Reclutador | `RECRUITER` | Su empresa | Invitación de ADMIN/RECRUITER |
| Evaluador técnico | `TECHNICAL_REVIEWER` | Solo sus etapas asignadas | Invitación de ADMIN/RECRUITER |

### 3.2 Visitante / candidato público (sin cuenta)

No tiene registro en la plataforma. Accede mediante el enlace público de una campaña
(`/apply/:publicId`) y puede:

- Ver la oferta: título, descripción, requisitos, condiciones, modalidad, renta (según
  configuración de la campaña).
- Subir su CV **sin autenticación** (límite: 10 MB por archivo, *throttle* de 10 subidas
  por minuto por IP).
- Completar el flujo de postulación y ver la pantalla de confirmación
  ("CV procesado automáticamente", "respuesta en 5 días").

Es el único actor que no requiere JWT.

### 3.3 `OWNER` — Super-administrador de la plataforma

Opera el SaaS, **no una empresa cliente**. No se crea por registro: se aprovisiona mediante
`currify-back/create-owner.js`, `currify-back/promote-owner.js` o el secret `OWNER_EMAIL`
en el pipeline de CI.

Capacidades:

- **Panel global**: usuarios totales, empresas activas, campañas creadas, candidatos
  evaluados.
- **Estadísticas de LLM**: tokens de prompt/completado, número de peticiones, costo
  acumulado estimado por modelo/proveedor.
- **Administración de todos los usuarios** (de todas las empresas):
  - cambiar plan (`FREE` / `PRO` / `ENTERPRISE`),
  - ajustar `cvCredits`, `smartFillCredits`, `campaignLimit`,
  - activar/desactivar cuentas.
- **Mantenimiento de planes**: editar nombre, descripción, precio, límites y features de
  cada tier (`GET/PUT /plans/admin`).

Restricciones: no participa en el flujo operativo de reclutamiento de las empresas.

### 3.4 `ADMIN` — Administrador de empresa

Rol **por defecto** al registrarse (email/password o Google OAuth). **Solo puede existir un
`ADMIN` por empresa.**

Capacidades:

- Visibilidad completa del ámbito de su empresa: campañas, candidatos, procesos,
  dashboard y auditoría.
- Crear y gestionar usuarios, **solo de rol `RECRUITER` o `TECHNICAL_REVIEWER`**.
- Crear/editar/eliminar sus propias campañas.
- Lanzar procesos de selección.
- Decidir etapas y acceder a datos sensibles (renta, modalidad).

Restricciones: no puede crear otro `ADMIN` ni un `OWNER`.

### 3.5 `RECRUITER` — Reclutador

Rol operativo del día a día.

Capacidades:

- Crear y gestionar campañas y candidatos.
- Crear usuarios `RECRUITER` y `TECHNICAL_REVIEWER`.
- Subir CVs, re-evaluar candidatos, lanzar procesos.
- Ver dashboard y auditoría de su ámbito.

Restricciones: no puede asignar `ADMIN`/`OWNER` ni modificar configuración global.

### 3.6 `TECHNICAL_REVIEWER` — Evaluador técnico

Rol acotado al **sandbox de su etapa**.

Capacidades:

- Ver **solo las instancias de etapa donde es responsable** (no etapas hermanas).
- Generar la guía de entrevista de su etapa.
- Tomar notas por pregunta.
- Aceptar o rechazar al candidato en su etapa (el rechazo exige feedback obligatorio).

Restricciones:

- No puede crear usuarios.
- **No ve renta ni modalidad** (datos sensibles ocultos).
- **No ve logs de auditoría** ni el progreso global del proceso.

### 3.7 Capa dinámica: "responsable de etapa"

Por encima del rol existe un permiso contextual que el backend resuelve como `viewer`:

| `viewer` | Quién | Qué ve |
|---|---|---|
| `OWNER` | Creador de la campaña o `ADMIN` | Todo el proceso, todas las etapas, auditoría |
| `STAGE_RESPONSIBLE` | Responsable asignado de una etapa | Solo su etapa (sandbox) |

Esto permite que un `RECRUITER` asignado como responsable quede limitado a su etapa,
igual que un `TECHNICAL_REVIEWER`.

### 3.8 Matriz de permisos

| Acción | OWNER | ADMIN | RECRUITER | TECH_REVIEWER | Público |
|---|:--:|:--:|:--:|:--:|:--:|
| Panel global / métricas LLM | ✅ | — | — | — | — |
| Editar planes | ✅ | — | — | — | — |
| Ver todas las empresas | ✅ | — | — | — | — |
| Gestionar usuarios | ✅ | ✅ (R/TR) | ✅ (R/TR) | — | — |
| Crear campaña | — | ✅ | ✅ | — | — |
| Editar/eliminar campaña | — | ✅ (creador) | ✅ (creador) | — | — |
| Subir CV / evaluar | — | ✅ | ✅ | — | ✅ |
| Lanzar proceso | — | ✅ (creador) | ✅ (creador) | — | — |
| Decidir etapa | — | ✅ | ✅ | ✅ (su etapa) | — |
| Ver auditoría | ✅ | ✅ | ✅ | — | — |
| Ver renta/modalidad | ✅ | ✅ | ✅ | — | según campaña |
| Ver dashboard | ✅ | ✅ | ✅ | — | — |

**Reglas de acceso a campañas** (aplicadas en `campaigns.service` y `dashboard.service`):

- **Listado**: el usuario ve las campañas que creó, donde es responsable de alguna etapa,
  o las de su misma empresa.
- **Editar/eliminar**: solo el creador de la campaña.
- **Iniciar proceso**: solo el creador de la campaña.

---

## 4. Funcionalidades por módulo

### 4.1 Autenticación y onboarding

- Registro con email/password y **Google OAuth**; ambos asignan `ADMIN` e inactivan la
  cuenta hasta la activación (`isActive = false`).
- Activación por token con expiración y email transaccional.
- Login JWT; endpoint `check-email` para detectar duplicados.
- Onboarding wizard: empresa, tamaño de empresa, volumen de contratación, ATS actual;
  marca `onboardingCompleted = true`.
- Selección de plan durante el alta y redirección a checkout.
- Al hacer login, los créditos y el límite de campañas se **sincronizan** con la
  configuración vigente del plan.

### 4.2 Landing y portal público

- Landing con propuesta de valor, demo interactiva del parser de CVs, tarjetas de planes,
  FAQ y **modo claro/oscuro**.
- Claims destacados: "Smart Match semántico" (evalúa significado, no palabras clave),
  "reduce horas a minutos".
- Página pública de campaña `/apply/:publicId`: oferta + formulario + upload de CV.
- Pantalla de publicación con enlace público copiable y compartible (LinkedIn, etc.).

### 4.3 Dashboard

- KPIs: campañas activas, CVs evaluados, candidatos en entrevista, "tiempo ahorrado".
- Embudo por campaña: revisión → entrevista → oferta → contratado/descartado.
- Distribución de match (strong/moderate/weak fit).
- Acceso calculado por ámbito (creador, responsable de etapa o misma empresa).
- Modal de **carga masiva de CVs** con selección de campaña activa y progreso por archivo.

### 4.4 Campañas

- CRUD completo con estados `DRAFT` / `ACTIVE` / `CLOSED` (la UI maneja también `PAUSED`).
- Campos: cargo, descripción, requisitos, ubicación, tipo de contrato (`FULL_TIME`,
  `PART_TIME`, `INTERNSHIP`), modalidad (`REMOTE`, `HYBRID`, `ON_SITE`), duración
  (`INDEFINITE`, `FIXED_TERM`, `PROJECT`), renta + moneda (`CLP`, `USD`, `EUR`, `UF`),
  idioma.
- **Plantillas de etapas** predefinidas (General/Admin, Técnico, Comercial, etc.) con
  etapas y responsables sugeridos.
- Límite de campañas según plan (`campaignLimit`).
- **Smart Fill**: genera un borrador completo de campaña a partir de título + contexto +
  idioma, incluyendo rúbrica de pesos sugerida (suma 1.0). Consume `smartFillCredits`.
- **Invalidación de scores**: al editar requisitos relevantes, los scorings pasan a
  `OUTDATED` y se ofrece re-evaluación masiva.

### 4.5 Extracción de CV

- Formatos soportados: **PDF, DOC, DOCX, TXT, RTF**; tamaño máximo **10 MB**.
- Parser: `pdfplumber` / `python-docx` / `striprtf` / `bs4`.
- **OCR** (pytesseract) cuando el texto extraído es escaso (< ~100 caracteres).
- Detección de perfil: `JUNIOR` / `SENIOR` / `TECHNICAL` / `CREATIVE`.
- Análisis por secciones (`SectionType`) con extracción en paralelo (semáforo de 3).
- Por sección: LLM → fallback heurístico (regex) → default; fusión al final.
- Recuperación **parcial** si una sección falla: el documento no se pierde.
- Resultado en `Candidate.structuredData`; documento en estado `COMPLETED`.
- Estados: `PENDING` / `COMPLETED` / `ERROR`; endpoints de reproceso y reparación.

### 4.6 Scoring / Smart Match

- Comparación **semántica** candidato ↔ campaña.
- **6 dimensiones con pesos fijos** (suman 100):

  | Dimensión | Peso |
  |---|---:|
  | Skills | 30 |
  | Experiencia | 25 |
  | Educación | 15 |
  | Fit cultural | 15 |
  | Logística | 10 |
  | Trayectoria | 5 |

- Umbrales de recomendación:
  - **≥ 80** → `strong_fit`
  - **≥ 60** → `moderate_fit`
  - **< 60** → `weak_fit`
- El score es **100% determinista** (matriz de pesos); el LLM **solo redacta** el
  razonamiento, fortalezas, brechas y recomendación (temperatura 0.0).
- Estados: `CURRENT` / `OUTDATED` / `PENDING`.
- Re-scoring individual o masivo: concurrencia 3, tope `MAX_RESCORE = 100` por lote.
- El crédito se descuenta **solo si el re-score tiene éxito**.

### 4.7 Gestión de candidatos

- Listado por campaña con búsqueda, orden (match, nombre) y filtros por estado.
- Contadores: total, en proceso, por revisar, descartados.
- Detalle con análisis IA: score global, breakdown por dimensión, veredicto,
  fortalezas/brechas, datos estructurados del CV.
- Acciones: ver CV, re-evaluar, iniciar proceso, cambiar estado.
- Gráficos de distribución de match.

### 4.8 Pipeline de selección

- Inicio de proceso desde una campaña, con etapas y responsables (solo el creador).
- Instancias de etapa con estados `PENDING` / `ACTIVE` / `ACCEPTED` / `REJECTED` /
  `OMITTED`.
- Avance secuencial: aceptar activa la siguiente etapa y notifica al responsable.
- **Rechazo**: exige feedback no vacío; marca al candidato `NOT_SELECTED`, cierra el
  proceso y omite las etapas pendientes.
- **Aprobación final**: candidato `SELECTED`.
- **Reapertura** de procesos con registro de auditoría.
- **Guía de entrevista** por etapa: hasta 5 preguntas, con restricciones de privacidad
  (no accede a feedback ni notas de otras etapas).
- Notas por pregunta, guardadas por etapa.

### 4.9 Notificaciones y email

**In-app** (`Notification`):

- `STAGE_ASSIGNED`, `CANDIDATE_NOT_SELECTED`, `CANDIDATE_SELECTED`.
- Contador de no leídas, marcar una como leída, marcar todas.

**Email transaccional**:

- Activación de cuenta.
- Asignación a campaña.
- Inicio de proceso.
- Avance de etapa.
- Rechazo.
- Selección.

### 4.10 Auditoría

- Registro inmutable con: actor, acción, entidad, valores anterior/nuevo, metadata, IP y
  user agent.
- Acciones registradas: `CANDIDATE_STATUS_CHANGED`, `PROCESS_STARTED`, `STAGE_ACCEPTED`,
  `STAGE_REJECTED`, `CANDIDATE_SELECTED`, `PROCESS_REOPENED`.
- Visible para `ADMIN`/`RECRUITER` en su ámbito; **oculto** al `TECHNICAL_REVIEWER`.

### 4.11 Panel OWNER

- Métricas globales de la plataforma.
- Consumo y costo LLM por modelo/proveedor.
- Tabla de todos los usuarios con edición de plan, créditos y límites.
- Editor de la configuración de planes.

### 4.12 Facturación

- Estado de suscripción, método de pago, periodo actual, trial y beneficios.
- Checkout con **Stripe** o **MercadoPago** (selección por `PAYMENT_GATEWAY`).
- Webhooks de confirmación y *reset* a `FREE`.
- Ver [sección 6](#6-planes-créditos-y-facturación).

---

## 5. Capacidades de IA

| Motor | Entrada | Salida | Costo LLM |
|---|---|---|---|
| Extracción | Archivo CV | `ResumeData` estructurado | 5–10 llamadas por CV (1 por sección detectada) |
| Scoring | Candidato + campaña | Score + 6 dimensiones + razonamiento | 1 llamada (solo redacción) |
| Job parsing | Texto de campaña | Requisitos normalizados | 1 llamada, con caché en memoria |
| Smart Fill | Título + contexto + idioma | Borrador de campaña + rúbrica | 1 llamada |
| Guía de entrevista | Campaña + etapa + CV | Hasta 5 preguntas | 1 llamada |
| Analítica | Historial de extracciones | Métricas de calidad | Sin LLM |

**Proveedores soportados:** Anthropic (Claude), OpenAI (GPT), Google (Gemini 2.5 Flash por
defecto) y Groq.

**Determinismo:** temperatura 0.0 en scoring y extracción.

**Conteo de llamadas en extracción:**

- 1 llamada por `SectionType` detectada.
- CV típico ≈ 5 llamadas (experiencia, educación, títulos, skills, resumen).
- CV completo: 7–10 llamadas.
- CV vacío o atípico: 1–2 llamadas.
- Fallback monolítico legacy: 1–2 llamadas.

**Privacidad en la guía de entrevista:**

- Solo recibe la campaña, la etapa actual y el CV del candidato.
- **No** recibe feedback ni notas de etapas anteriores o hermanas.

---

## 6. Planes, créditos y facturación

### 6.1 Definición de planes

| Plan | Nombre | Precio | Créditos CV | Smart Fill | Campañas |
|---|---|---:|---:|---:|---:|
| `FREE` | Starter | $0 | 3 | 3 | 1 |
| `PRO` | Pro | $19.990 CLP | 999 | 999 | 999 |
| `ENTERPRISE` | Enterprise | a medida (`price = -1`) | 9.999 | 9.999 | 9.999 |

Los planes se siembran automáticamente en `onModuleInit` si la tabla `PlanConfig` está
vacía, y son editables por el `OWNER`.

### 6.2 Reglas de créditos

| Evento | Consumo |
|---|---|
| Subida de CV | −1 `cvCredit` **inmediato** |
| Re-score exitoso | −1 `cvCredit` (solo si termina bien) |
| Re-score fallido | No consume |
| Smart Fill | −1 `smartFillCredit` |

- Sin créditos → respuesta **HTTP 402 (Payment Required)**.
- `campaignLimit` se valida al crear campaña.

### 6.3 Pasarelas de pago

- **Stripe**: suscripciones, estados `ACTIVE` / `PAST_DUE` / `CANCELED` / `INCOMPLETE` /
  `TRIALING`.
- **MercadoPago**: alternativa para LATAM.
- Selección por variable `PAYMENT_GATEWAY` (o detección automática por
  `MERCADOPAGO_ACCESS_TOKEN`).

---

## 7. Flujos end-to-end

### 7.1 Alta de empresa

```
Landing
  → Registro / Google OAuth
  → Activación por email
  → Onboarding (empresa, tamaño, volumen, ATS)
  → Selección de plan (FREE / PRO)
  → Checkout (si PRO)
  → Dashboard
```

### 7.2 Creación de campaña y captación

```
Crear campaña (manual o Smart Fill)
  → Definir etapas y responsables (plantilla)
  → Publicar (ACTIVE)
  → Compartir enlace público /apply/:publicId
  → Postulaciones (upload de CV)
  → Extracción automática + scoring
  → Ranking de candidatos
```

### 7.3 Proceso de selección

```
Iniciar proceso (creador de la campaña)
  → Etapa 1: responsable asignado
      → Guía de entrevista + notas
      → Aceptar / Rechazar
  → Etapa 2 … N
  → Aprobación final → Candidato SELECTED
     ó Rechazo → NOT_SELECTED + etapas pendientes OMITTED
  → Auditoría + notificaciones + email
```

### 7.4 Postulación pública

```
/apply/:publicId
  → Ver oferta
  → Subir CV (sin cuenta)
  → Extracción automática
  → Confirmación
```

---

## 8. Modelo de datos (resumen)

Entidades principales en PostgreSQL (Prisma):

| Modelo | Propósito |
|---|---|
| `User` | Cuentas, rol, empresa, plan, créditos, límites, estado |
| `Campaign` | Ofertas/campañas de reclutamiento |
| `Candidate` | Postulantes, `structuredData`, estado, scoring |
| `Document` | CVs subidos y su estado de procesamiento |
| `CandidateScoring` | Resultado de scoring por candidato/campaña |
| `StageTemplate` | Definición de etapas de una campaña + responsable |
| `ProcessInstance` | Proceso de selección de un candidato en una campaña |
| `StageInstance` | Instancia concreta de una etapa (estado, notas, guía) |
| `AuditLog` | Trazabilidad de acciones |
| `Notification` | Notificaciones in-app |
| `LlmUsageLog` | Consumo de tokens y costo por llamada LLM |
| `PlanConfig` | Definición editable de planes |

### Enums relevantes

| Enum | Valores |
|---|---|
| `UserRole` | `OWNER`, `ADMIN`, `RECRUITER`, `TECHNICAL_REVIEWER` |
| `PlanTier` | `FREE`, `PRO`, `ENTERPRISE` |
| `CampaignStatus` | `DRAFT`, `ACTIVE`, `CLOSED` |
| `CandidateStatus` | `NEW`, `IN_PROCESS`, `SELECTED`, `NOT_SELECTED` |
| `StageStatus` | `PENDING`, `ACTIVE`, `ACCEPTED`, `REJECTED`, `OMITTED` |
| `ScoringStatus` | `CURRENT`, `OUTDATED`, `PENDING` |
| `ProcessingStatus` | `PENDING`, `COMPLETED`, `ERROR` |
| `WorkType` | `FULL_TIME`, `PART_TIME`, `INTERNSHIP` |
| `Modality` | `REMOTE`, `HYBRID`, `ON_SITE` |
| `Duration` | `INDEFINITE`, `FIXED_TERM`, `PROJECT` |
| `Currency` | `CLP`, `USD`, `EUR`, `UF` |
| `StripeStatus` | `ACTIVE`, `PAST_DUE`, `CANCELED`, `INCOMPLETE`, `TRIALING` |

---

## 9. Mapa de rutas del frontend

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | Landing | Público |
| `/apply/:publicId` | PublicCampaign | Público |
| `/login` | EvalenAuth | Público |
| `/auth/callback` | AuthCallback | Público (OAuth) |
| `/activate` | ActivateAccount | Público (token) |
| `/onboarding` | OnboardingWizard | Autenticado |
| `/pricing` | PricingPage | Público |
| `/checkout` | Checkout | Autenticado |
| `/dashboard` | DashboardNew | Autenticado |
| `/create-campaign` | CreateCampaign | ADMIN / RECRUITER |
| `/edit-campaign/:campaignId` | EditCampaign | ADMIN / RECRUITER (creador) |
| `/campaigns/:campaignId` | CandidatesManagerNew | Autenticado con acceso |
| `/campaigns/:campaignId/candidate/:candidateId` | CandidateDetail | Autenticado con acceso |
| `/campaigns/:campaignId/candidates/:candidateId/process` | CandidateProcessPanel | Responsable / ADMIN |
| `/admin/users` | UserManagement | ADMIN / RECRUITER *(ver §10)* |
| `/owner/dashboard` | OwnerDashboard | OWNER |
| `/billing` | BillingPage | Autenticado |

---

## 10. Limitaciones y observaciones actuales

1. **`/admin/users` no está protegido a nivel de ruta.** El componente muestra
   "Unauthorized" a roles no autorizados, pero la ruta es accesible en el router. La
   protección real ocurre en el backend (`@Roles('OWNER','ADMIN','RECRUITER')`).

2. **`OWNER` no se crea por registro.** Requiere `create-owner.js`,
   `promote-owner.js` o el secret `OWNER_EMAIL` en CI.

3. **Validaciones de plan con *special-case* para `PRO`.** Algunos checks de créditos y
   límites solo distinguen `PRO`, lo que puede dejar `ENTERPRISE` con comportamiento
   inesperado.

4. **Editar una campaña invalida los scores.** El re-scoring no es automático: el usuario
   debe lanzarlo y consume créditos.

5. **Documentación desactualizada.** `README.md` menciona el rol `INTERVIEWER` (ya no
   existe) y una lista de proveedores sin contexto. `docs/Documentacion_Evalen.md`
   (abr-2026) describe un estado anterior del sistema.

6. **El scoring es determinista por diseño.** La calidad percibida depende de la calidad
   de la extracción y de la definición de requisitos, no del LLM evaluador.

7. **Analítica en memoria en `currify-core`.** Las métricas de `/analytics` se guardan en
   un diccionario y se pierden al reiniciar el proceso.

8. **Límite de re-scoring.** Máximo 100 candidatos por lote, concurrencia 3.

---

*Fin del documento.*
