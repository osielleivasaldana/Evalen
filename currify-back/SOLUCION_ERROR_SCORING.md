# 🔧 Solución Error de Integración NestJS → FastAPI

## ❌ Error Original

```
[Nest] 23684  - 06-10-2025, 12:52:50 a. m.   ERROR [ScoringService]
HttpException: Failed to parse job description
    at ScoringService.parseJobDescription (scoring.service.ts:135:13)
{
  response: 'Failed to parse job description',
  status: 503,
  options: undefined
}
```

---

## 🔍 Causa Raíz

Tu backend **NestJS** estaba enviando campos en **español** al servicio **FastAPI**, pero FastAPI espera campos en **inglés**.

### **❌ Código Incorrecto (ANTES):**

```typescript
// scoring.service.ts línea 109-112
const response = await axios.post(`${this.scoringServiceUrl}/scoring/parse-job`, {
  descripcion: campaign.description,  // ❌ Campo incorrecto
  requisitos: campaign.requirements,  // ❌ Campo incorrecto
  condiciones: campaign.conditions    // ❌ Campo incorrecto
}, ...);
```

### **✅ Código Corregido (DESPUÉS):**

```typescript
// scoring.service.ts línea 109-111
const response = await axios.post(`${this.scoringServiceUrl}/scoring/parse-job`, {
  description: campaign.description || '',  // ✅ Correcto
  requirements: `${campaign.requirements || ''}\n${campaign.conditions || ''}`.trim(),  // ✅ Correcto
}, ...);
```

---

## 🛠️ Cambios Realizados

### **1. Fix en Job Parsing (línea 109-111)**

**ANTES:**
```typescript
{
  descripcion: campaign.description || '',
  requisitos: campaign.requirements || '',
  condiciones: campaign.conditions || '',
}
```

**DESPUÉS:**
```typescript
{
  description: campaign.description || '',
  requirements: `${campaign.requirements || ''}\n${campaign.conditions || ''}`.trim(),
}
```

**Por qué:** FastAPI espera `description` y `requirements` (inglés), no `descripcion` y `requisitos` (español). Además, combinamos `requirements` y `conditions` en un solo campo.

---

### **2. Fix en Scoring Evaluation (línea 236-237)**

**ANTES:**
```typescript
{
  candidate_data: candidate.structuredData,
  job_data: completeJobData,
}
```

**DESPUÉS:**
```typescript
{
  candidate: candidate.structuredData,
  job: completeJobData,
}
```

**Por qué:** El endpoint `/scoring/evaluate` espera `candidate` y `job`, no `candidate_data` y `job_data`.

---

## ✅ Verificación del .env

Tu archivo `.env` en NestJS ya tiene las credenciales correctas:

```env
SCORING_SERVICE_URL="http://localhost:8000"
SCORING_SERVICE_USERNAME="kinich"
SCORING_SERVICE_PASSWORD="kinich!"
```

✅ Estas coinciden con las del FastAPI.

---

## 🧪 Cómo Probar la Solución

### **Opción 1: Script de Diagnóstico Automático**

```bash
cd currify-back
node test-scoring-integration.js
```

Este script probará:
- ✅ Conexión a FastAPI
- ✅ Autenticación
- ✅ Job Parsing
- ✅ Scoring Evaluation

### **Opción 2: Prueba Manual con cURL**

```bash
# 1. Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "kinich", "password": "kinich!"}'

# 2. Parse Job (guardar el token del paso 1)
TOKEN="tu_token_aqui"

curl -X POST http://localhost:8000/scoring/parse-job \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "description": "Buscamos desarrollador backend senior",
    "requirements": "3-5 años Python, FastAPI"
  }'
```

---

## 🚀 Pasos para Resolver

### **1. Asegúrate de que FastAPI esté corriendo**

```bash
cd currify-core
venv\Scripts\activate  # Windows
# o: source venv/bin/activate  # Linux/Mac

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Deberías ver:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### **2. Reinicia NestJS**

```bash
cd currify-back
npm run start:dev
```

### **3. Prueba la integración**

Ahora cuando un candidato suba su CV, el flujo completo debería funcionar:

1. ✅ NestJS recibe el CV
2. ✅ Extrae datos estructurados
3. ✅ Llama a FastAPI con campos correctos (`description`, `requirements`)
4. ✅ FastAPI parsea el job
5. ✅ NestJS llama a scoring con (`candidate`, `job`)
6. ✅ FastAPI retorna el score
7. ✅ NestJS guarda en Postgres

---

## 📊 Mapeo de Campos

### **Para `/scoring/parse-job`:**

| NestJS (Database) | FastAPI Endpoint | Combinación |
|-------------------|------------------|-------------|
| `campaign.description` | `description` | Directo |
| `campaign.requirements` | `requirements` | Combinado con `conditions` |
| `campaign.conditions` | `requirements` | Combinado con `requirements` |

### **Para `/scoring/evaluate`:**

| NestJS | FastAPI Endpoint |
|--------|------------------|
| `candidate.structuredData` | `candidate` |
| `completeJobData` | `job` |

---

## 🐛 Debugging

Si aún tienes errores, revisa:

### **1. FastAPI no está corriendo:**
```bash
# Verifica que esté corriendo
curl http://localhost:8000/

# Debería retornar:
{
  "status": "healthy",
  "service": "Currify API"
}
```

### **2. Error de autenticación:**
```bash
# Verifica credenciales
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "kinich", "password": "kinich!"}'

# Debería retornar un token
```

### **3. Error 422 (Unprocessable Entity):**
- Revisa que los campos enviados coincidan exactamente:
  - `description` (no `descripcion`)
  - `requirements` (no `requisitos`)
  - `candidate` (no `candidate_data`)
  - `job` (no `job_data`)

### **4. Timeout:**
- El scoring puede tardar 6-10 segundos
- Asegúrate de que el timeout en NestJS sea suficiente (120s recomendado)

---

## ✅ Checklist Final

- [x] FastAPI corriendo en puerto 8000
- [x] Credenciales correctas en `.env` de NestJS
- [x] Campos corregidos en `scoring.service.ts` (líneas 109-111 y 236-237)
- [x] NestJS reiniciado
- [ ] Probar con el script `test-scoring-integration.js`
- [ ] Probar con un candidato real

---

## 📝 Resumen de Cambios

**Archivo:** `currify-back/src/scoring/scoring.service.ts`

**Línea 109-111:** Cambiar campos de español a inglés
**Línea 236-237:** Cambiar `candidate_data` → `candidate`, `job_data` → `job`

**Tiempo estimado para aplicar fix:** 2 minutos
**Tiempo de test:** 5 minutos

---

## 🎯 Resultado Esperado

Después de aplicar estos cambios, deberías ver en los logs de NestJS:

```
[Nest] INFO [ScoringService] Attempting to authenticate with scoring service
[Nest] INFO [ScoringService] Authentication successful
[Nest] INFO [ScoringService] Parsed job data for campaign xxx
[Nest] INFO [ScoringService] Scoring saved for candidate xxx: 85.5
```

Y en los logs de FastAPI:

```
INFO: [JOB_PARSING] Calling ANTHROPIC API...
INFO: [JOB_PARSING] ANTHROPIC response received in 2.5s
INFO: [SCORING_EVALUATION] Calling ANTHROPIC API...
INFO: [SCORING_EVALUATION] Successfully parsed JSON response
```

---

## 🆘 Soporte

Si después de aplicar estos cambios sigues teniendo problemas:

1. Ejecuta `node test-scoring-integration.js` y comparte el output
2. Revisa los logs de FastAPI mientras haces la prueba
3. Verifica que ambos servicios estén en las últimas versiones
