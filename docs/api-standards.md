# Evalen — API Standards: Diccionario de Códigos HTTP

> **Documento Maestro de Referencia.** Este archivo define el contrato estricto de códigos de estado HTTP para todos los microservicios de la plataforma Evalen (Currify).
>
> **Última actualización:** Abril 2026
> **Autoridad:** Tech Lead — Evalen

---

## 📌 Principio Fundamental

Cada microservicio tiene su propio dominio de responsabilidad y, por tanto, su propio diccionario de códigos HTTP. **Nunca** un servicio debe devolver un código que no pertenezca a su dominio definido aquí.

---

## 1. Contratos del Backend (NestJS → Frontend)

**Dominio:** API Gateway pública/protegida. Maneja negocio, sesiones, pagos y actúa como puente entre el Frontend y el Core IA.

### ✅ Éxito

| Código | Significado | Cuándo Usarlo | Acción del Frontend |
|--------|-------------|---------------|---------------------|
| `200` | **OK** | Solicitud exitosa. Datos devueltos correctamente. | Renderizar datos en UI. |
| `201` | **Created** | Recurso creado exitosamente en DB (ej. Nueva Campaña, Nuevo Candidato). | Mostrar confirmación, actualizar lista. |

### ❌ Errores de Cliente (UI / Negocio)

| Código | Significado | Cuándo Usarlo | Acción del Frontend |
|--------|-------------|---------------|---------------------|
| `400` | **Bad Request** | Faltan campos obligatorios en el formulario, formato de email inválido, datos mal estructurados. | Resaltar campos con error, mostrar mensaje específico. |
| `401` | **Unauthorized** | JWT expirado, inválido o ausente. | Redirigir automáticamente al Login (`/login`). |
| `402` | **Payment Required** | **[CRÍTICO]** Usuario sin créditos suficientes para evaluar un CV o suscripción inactiva. | Mostrar modal de upgrade/pago, redirigir a `/billing` o `/checkout`. |
| `403` | **Forbidden** | Intento de acceder a datos de otra empresa (violación Multi-Tenant), rol insuficiente. | Mostrar pantalla de "Acceso Denegado", loguear evento de seguridad. |
| `413` | **Payload Too Large** | PDF subido excede 5MB. Atrapado en el Backend antes de llegar al Core. | Mostrar toast: "El archivo excede 5MB. Comprime el PDF e intenta de nuevo." |
| `415` | **Unsupported Media Type** | El archivo subido NO es un PDF (ej. .docx, .png, .txt). | Mostrar toast: "Solo se aceptan archivos PDF." |
| `422` | **Unprocessable Entity** | **Reenviado desde el Core.** La IA no pudo extraer/estructurar los datos del CV. | Mostrar mensaje amigable: "No pudimos procesar este CV. Verifica que sea legible e intenta de nuevo." |

### 🔥 Errores de Servidor

| Código | Significado | Cuándo Usarlo | Acción del Frontend |
|--------|-------------|---------------|---------------------|
| `500` | **Internal Server Error** | Falla interna en NestJS o Prisma (ej. query fallida, error de lógica). | Mostrar pantalla genérica de error. NO exponer detalles técnicos. |
| `502` | **Bad Gateway** | El contenedor del `currify-core` está caído o inalcanzable. | Mostrar: "El motor de IA no está disponible. Intenta en unos minutos." |
| `503` | **Service Unavailable** | **Reenviado desde el Core.** Proveedor de IA (OpenAI/Anthropic) caído. | Mostrar: "Servicio de análisis temporalmente no disponible. Reintenta más tarde." |

---

## 2. Contratos del Core IA (FastAPI → Backend)

**Dominio:** API interna. Es agnóstica al negocio/usuarios. Solo se enfoca en procesamiento de documentos, NLP y extracción estructurada.

### ✅ Éxito

| Código | Significado | Cuándo Usarlo |
|--------|-------------|---------------|
| `200` | **OK** | CV procesado exitosamente. JSON estructurado generado y validado por Pydantic. |

### ❌ Errores de Procesamiento

| Código | Significado | Cuándo Usarlo |
|--------|-------------|---------------|
| `400` | **Bad Request** | El Backend envió un payload malformado (ej. faltan los bytes del documento, formato de request inválido). |
| `422` | **Unprocessable Entity** | **[CRÍTICO]** El PDF está encriptado, es una imagen sin texto (sin OCR), o el LLM falló repetidamente la validación Pydantic y no pudo estructurar el JSON tras los reintentos. |

### 🔥 Errores de Infraestructura IA

| Código | Significado | Cuándo Usarlo |
|--------|-------------|---------------|
| `500` | **Internal Server Error** | Falla de código Python interno (ej. error en la librería de parsing de PDF, excepción no manejada). |
| `503` | **Service Unavailable** | **[CRÍTICO]** LangChain reporta que el proveedor del LLM (OpenAI/Anthropic) está caído o rechazando requests. |
| `504` | **Gateway Timeout** | El documento era demasiado complejo y el LLM superó el tiempo máximo de inferencia configurado. |

---

## 3. Mapa de Traducción (Core → Backend → Frontend)

Cuando el Backend recibe un error del Core, **debe traducirlo** al código correspondiente del dominio Backend antes de responder al Frontend:

| Core IA Devuelve | Backend Traduce a | Razón |
|------------------|-------------------|-------|
| `400` Bad Request | `500` Internal Server Error | Es un bug de comunicación entre servicios, no culpa del usuario. |
| `422` Unprocessable Entity | `422` Unprocessable Entity | Se reenvía tal cual — el problema es el documento del usuario. |
| `500` Internal Server Error | `502` Bad Gateway | El Core falló internamente = Bad Gateway desde la perspectiva del Backend. |
| `503` Service Unavailable | `503` Service Unavailable | Se reenvía tal cual — el proveedor de IA está caído. |
| `504` Gateway Timeout | `503` Service Unavailable | Timeout del LLM se traduce como servicio no disponible temporalmente. |

---

## 4. Reglas de Oro

1. **Nunca exponer errores internos del Core al Frontend directamente.** El Backend siempre traduce.
2. **Nunca devolver `500` genérico para errores de negocio.** Usa `400`, `402`, `403`, `422` según corresponda.
3. **El `402 Payment Required` es sagrado.** Es el único código que maneja la lógica de créditos/suscripción.
4. **Los mensajes de error al Frontend deben ser amigables.** Los detalles técnicos van solo en los logs del servidor.
5. **Todo endpoint debe documentar sus posibles respuestas** en su contrato API (DTOs/Pydantic models).

---

*Este documento es vivo. Cualquier cambio debe ser aprobado por el Tech Lead y reflejado aquí antes de implementarse.*
