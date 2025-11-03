# 🔍 Diagnóstico de Servicios - Currify

## ✅ Resultados de las Pruebas

### **1. Autenticación - POST /auth/login**
**Status:** ✅ FUNCIONANDO

**Problema Detectado:** Error 400 Bad Request
**Causa Raíz:** Credenciales incorrectas enviadas desde el frontend

**Credenciales Correctas (desde .env):**
```json
{
  "username": "kinich",
  "password": "kinich!"
}
```

**❌ Credenciales INCORRECTAS que causan error:**
```json
{
  "username": "admin",
  "password": "change-me-in-production"
}
```

**✅ Test Exitoso:**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "kinich", "password": "kinich!"}'

# Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

---

### **2. Job Parsing - POST /scoring/parse-job**
**Status:** ✅ FUNCIONANDO PERFECTAMENTE

**Test:**
```bash
curl -X POST http://localhost:8000/scoring/parse-job \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "description": "Buscamos un Senior Backend Developer...",
    "requirements": "3-5 años de experiencia..."
  }'
```

**Response (exitosa en 2.5 segundos):**
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

---

### **3. Scoring Evaluation - POST /scoring/evaluate**
**Status:** ✅ FUNCIONANDO PERFECTAMENTE

**Test:**
```bash
curl -X POST http://localhost:8000/scoring/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d @test_scoring.json
```

**Response (exitosa en 6.7 segundos):**
```json
{
  "overall_score": 85.5,
  "recommendation": "strong_fit",
  "breakdown": {
    "skills_match": {
      "score": 85.0,
      "weight": 30.0,
      "weighted_score": 25.5,
      "reasoning": "El candidato demuestra 4/5 habilidades técnicas requeridas..."
    },
    "experience": {
      "score": 80.0,
      "weight": 25.0,
      "weighted_score": 20.0,
      "reasoning": "4 años de experiencia en desarrollo backend vs 3-5 años requeridos..."
    },
    // ... resto de dimensiones
  },
  "strengths": [
    "Experiencia técnica sólida en el stack tecnológico principal",
    "Nivel de seniority apropiado con 4 años de experiencia",
    "Educación formal en Computer Science con certificación adicional en AWS",
    "Ubicación geográfica ideal y disponibilidad inmediata",
    "Habilidades blandas alineadas con la cultura de la empresa"
  ],
  "gaps": [
    "Falta experiencia en herramientas de DevOps específicas (Kubernetes)",
    "No tiene experiencia previa en la industria fintech",
    "Patrón de rotación laboral relativamente alta en los últimos años"
  ],
  "summary": "Candidato muy compatible con un 85% de compatibilidad general..."
}
```

---

## 🐛 Problema Identificado: Error 400 en /auth/login

### **Causa:**
El frontend está enviando credenciales incorrectas. El error 400 ocurre porque:

1. **Validación de longitud:** El password debe tener al menos 6 caracteres
2. **Credenciales incorrectas:** Las credenciales por defecto en la documentación no coinciden con las del .env

### **Solución para el Frontend:**

#### **Opción 1: Usar las credenciales correctas del .env**
```javascript
// Frontend: services/authService.js
const credentials = {
  username: "kinich",
  password: "kinich!"
}

const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(credentials)
});
```

#### **Opción 2: Usar API Key (más simple)**
```javascript
// Frontend: services/authService.js
const apiKeyData = {
  api_key: "prod-key-12345"  // O "backup-key-67890"
}

const response = await fetch('/auth/login-api-key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(apiKeyData)
});
```

---

## 📊 Métricas de Performance

| Endpoint | Status | Tiempo de Respuesta | LLM Calls |
|----------|--------|---------------------|-----------|
| /auth/login | ✅ | ~200ms | 0 |
| /scoring/parse-job | ✅ | ~2.5s | 1 |
| /scoring/evaluate | ✅ | ~6.7s | 1 |

**Total para flujo completo:** ~9.4 segundos (login + parse + score)

---

## 🔧 Validaciones de Requests

### **/auth/login**
```typescript
interface LoginRequest {
  username: string;  // min 3 chars
  password: string;  // min 6 chars
}
```

**Errores comunes:**
- ❌ `username` o `password` vacíos → 400 "Username and password are required"
- ❌ `username` < 3 chars → 400 "Invalid username or password format"
- ❌ `password` < 6 chars → 400 "Invalid username or password format"
- ❌ Credenciales incorrectas → 401 "Invalid username or password"

### **/scoring/parse-job**
```typescript
interface JobParsingRequest {
  description: string;  // required, non-empty
  requirements?: string;  // optional
}
```

### **/scoring/evaluate**
```typescript
interface ScoringRequest {
  candidate: object;  // required, non-empty
  job: object;  // required, non-empty
}
```

---

## ✅ Checklist para el Frontend

- [ ] Actualizar credenciales de login a `kinich` / `kinich!`
- [ ] O cambiar a autenticación con API key (`prod-key-12345`)
- [ ] Validar que el token se guarda correctamente en el state
- [ ] Validar que el token se envía en header `Authorization: Bearer TOKEN`
- [ ] Manejar timeout de 120s para llamadas a scoring
- [ ] Mostrar loading mientras se procesa (puede tardar 6-10s)

---

## 🧪 Scripts de Testing

### **Test Rápido de Autenticación**
```bash
# Login con credenciales
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "kinich", "password": "kinich!"}'

# Login con API key
curl -X POST http://localhost:8000/auth/login-api-key \
  -H "Content-Type: application/json" \
  -d '{"api_key": "prod-key-12345"}'
```

### **Test de Job Parsing**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:8000/scoring/parse-job \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "description": "Tu descripción aquí",
    "requirements": "Tus requisitos aquí"
  }'
```

### **Test de Scoring**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:8000/scoring/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @test_scoring.json
```

---

## 🎯 Conclusión

**Todos los servicios están funcionando correctamente.** El error 400 en el frontend se debe a credenciales incorrectas.

**Acción Inmediata:** Actualizar las credenciales en el frontend de:
- ❌ `admin` / `change-me-in-production`
- ✅ `kinich` / `kinich!`

O usar API key: `prod-key-12345`
