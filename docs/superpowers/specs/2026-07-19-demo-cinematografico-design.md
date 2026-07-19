# Demo Cinematográfica — Design Doc

**Fecha:** 2026-07-19
**Proyecto:** Evalen (currify-front landing page)
**Contexto:** Reemplazar el DemoModal actual (4 pasos navegables) por una demo cinematográfica orquestada de 3 fases.

---

## 1. Objetivo

Transformar la demo del hero de Evalen de una secuencia estática de pasos a una experiencia inmersiva que **emule el pipeline real** de evaluación de candidatos: CV → extracción → comparación vs campaña → scoring. Sin costo LLM, sin llamadas backend, todo simulado con datos hardcodeados.

---

## 2. Arquitectura

### 2.1 Fases del flujo

```
Fase 0 ────→ Fase 1 ──────────→ Fase 2
Inputs       Procesamiento       Resultados
(solo        15s con             Extracción
lectura)     mensajes            destacada +
             progresivos         Scoring
                                 (layout app
                                  real)
```

No hay navegación entre pasos (sin "Anterior"/"Siguiente"). La demo avanza linealmente. Botón "Cerrar" siempre visible.

### 2.2 Estado del modal

```ts
type DemoPhase = 'input' | 'processing' | 'results';
```

- `input`: Fase 0 — muestra CV renderizado + campaña + botón "Iniciar demo"
- `processing`: Fase 1 — overlay con scanline + mensajes progresivos (~15s)
- `results`: Fase 2 — extracción + scoring lado a lado

### 2.3 Tamaño del modal

- Desktop: `~90vw × 90vh`, max-width `1400px`
- Mobile: fullscreen (`100vw × 100dvh`)

---

## 3. Fase 0 — Pantalla Inicial

### 3.1 Layout

Dos columnas iguales (1/2 + 1/2), centradas verticalmente, con padding generoso.

### 3.2 Columna izquierda: CV renderizado como PDF

Fondo blanco, simula una hoja carta con sombra y bordes redondeados suaves. Tipografía serif (`Georgia` o `Merriweather`).

**Estructura del CV renderizado:**

```
+---------------------------------------------------+
|  ANA MARÍA ALARCÓN VERGARA                       |
|  Backend Developer                                |
|  Santiago, Chile · +56 9 8765 4321                |
|  ana.alarcon@email.com · linkedin.com/in/...       |
+---------------------------------------------------+
|  EXTRACTO PROFESIONAL                             |
|  Backend Developer con 5 años de experiencia...   |
+---------------------------------------------------+
|  EXPERIENCIA LABORAL                              |
|                                                    |
|  Senior Backend Developer         Mar 2022 — Presente |
|  PayPal LatAm · Remoto                             |
|  • Diseñé la arquitectura event-driven...          |
|  • Lideré la migración de un monolito...           |
|  • Mentoré a 3 desarrolladores junior...           |
|                                                    |
|  Backend Developer                Ene 2020 — Feb 2022 |
|  MercadoLibre Chile · Santiago                     |
|  • Implementé 15+ endpoints REST...                |
+---------------------------------------------------+
|  FORMACIÓN                                        |
|  Ingeniería Civil en Informática  Universidad de Chile |
|  2015 — 2019                                       |
+---------------------------------------------------+
|  HABILIDADES TÉCNICAS                              |
|  Python FastAPI PostgreSQL Redis Docker Kafka SQL  |
|  TypeScript Node.js AWS                            |
+---------------------------------------------------+
```

- Las habilidades que coinciden con los requisitos de la campaña llevan un badge verde "✓ Match" superpuesto
- Scroll vertical si excede el alto disponible

### 3.3 Columna derecha: Campaña

Card compacta con:

**Header:** "Senior Python Developer · Remoto Global" (con badge "Campaña")

**Cuerpo:**
- **Modalidad:** Remoto Global
- **Experiencia mínima:** 3 años
- **Nivel educación:** Ingeniería o título técnico afín
- **Idiomas:** Español, Inglés
- **Habilidades requeridas:** `Python` `FastAPI` `PostgreSQL` `Docker` (badges sólidos indigo)
- **Habilidades deseables:** `Kafka` `AWS` `TypeScript` (badges outline purple)

### 3.4 CTA

Botón grande centrado debajo de las dos columnas:
"🚀 Iniciar demo" (o "▶ Iniciar demo")
- Brand indigo, hover glow, active scale
- Al hacer clic → transición suave a Fase 1

---

## 4. Fase 1 — Procesamiento

### 4.1 Overlay

Overlay semitransparente oscuro que cubre toda la Fase 0 (pero el contenido de inputs sigue visible detrás, borroso/desenfocado).

### 4.2 Scan line

Línea horizontal animada que barre verticalmente de arriba a abajo sobre el área del CV (~3s por ciclo, loop infinito hasta que termina la fase). SVG o CSS animation.

### 4.3 Mensajes progresivos

Centrados en el overlay, timeline de ~15 segundos total:

| t (s) | Mensaje |
|-------|---------|
| 0     | Conectando con el parser de Evalen... |
| 3     | Extrayendo información personal... ✅ |
| 6     | Extrayendo experiencia laboral... ✅ |
| 9     | Extrayendo formación y habilidades... ✅ |
| 12    | Comparando contra campaña... ✅ |
| 15    | Generando evaluación de compatibilidad... ✅ |

Cada mensaje:
- Aparece con fade-in + slide-up
- El anterior se mantiene visible pero opaco (0.3)
- El activo está brillante con un spinner/pulse
- Cuando se completa, el check reemplaza el spinner

### 4.4 Transición a Fase 2

Al llegar a "Generando evaluación..." y mostrar el último check → fade-out del overlay + fade-in de los resultados.

---

## 5. Fase 2 — Resultados

Replica exacta del layout de `CandidateDetail.tsx`, con datos sample de Ana María Alarcón.

### 5.1 Layout general

Dos columnas en grid:
- **Izquierda (~1/3):** Scoring
- **Derecha (~2/3):** Extracción destacada

### 5.2 Columna izquierda: Scoring

Card con:
- **Header gradient** naranja→rojo: "Análisis de Compatibilidad"
- **Conic gradient circle** (CSS): grande (w-32 h-32), 96/100
  - Color threshold: ≥90 = green, ≥70 = amber, <70 = red
  - Número grande dentro del círculo, "de 100" debajo
- **Label:** "Compatibilidad alta" (traducción de `strong_fit`)
- **Summary:** texto breve
- **Desglose de Evaluación:** 6 dimensiones con barra de progreso + score/100:

| Dimensión | Score | Peso | Match tooltip |
|-----------|-------|------|--------------|
| Skills técnicos | 98/100 | 30% | Requerido: Python, FastAPI, PostgreSQL, Docker — Tiene: Python, FastAPI, PostgreSQL, Docker + TypeScript, Node.js, AWS |
| Experiencia | 95/100 | 25% | Requerido: 3 años — Tiene: 5 años |
| Educación | 88/100 | 15% | Requerido: Ingeniería o título técnico — Tiene: Ingeniería Civil Informática (Universidad de Chile) |
| Fit cultural | 92/100 | 15% | Requerido: Remoto Global — Tiene: experiencia remota en PayPal LatAm |
| Logística | 100/100 | 10% | Requerido: sin restricciones horarias — Tiene: huso horario GMT-3 compatible |
| Trayectoria | 90/100 | 5% | Tiene: experiencia en startup (MercadoLibre Chile) + big tech (PayPal LatAm) |

- **Fortalezas:** 4 bullets con CheckBadgeIcon verde
- **Áreas de Mejora:** 1 bullet con ExclamationCircleIcon naranja

### 5.3 Columna derecha: Extracción destacada

Cards con header gradient de colores variados (indigo, blue, amber, purple) como en la app real:

- **Contacto** (indigo): nombre, email, teléfono, ubicación, LinkedIn, GitHub
- **Resumen profesional** (blue): texto completo
- **Experiencia** (slate/cyan): timeline con cargo, empresa, periodo, ubicación, responsabilidades
- **Habilidades** (amber): tags técnicas (indigo) + blandas (slate)
- **Idiomas** (purple): Español nativo, Inglés C1, Portugués B1

Las habilidades que están también en la campaña llevan un badge "✓ Match" verde.

### 5.4 Footer de Fase 2

- Checkbox opcional "Mostrar este análisis sin sesgos de género ni edad"
- Botón "Cerrar demo" (mismo que el X)

---

## 6. Datos

Se mantiene el objeto `SAMPLE` existente en `DemoModal.tsx`. No se modifica la data, solo la presentación.

---

## 7. Animaciones

| Fase | Elemento | Animación |
|------|----------|-----------|
| 0→1 | Transición inputs → overlay | Fade out inputs + fade in overlay (300ms) |
| 1 | Scan line | Top→bottom loop, 3s/ciclo, CSS animation |
| 1 | Mensajes | Fade-in + slide-up (cubic-bezier), 300ms entrada |
| 1 | Check reemplazando spinner | Scale + rotate del check icon (200ms) |
| 1→2 | Transición overlay → resultados | Cross-fade (400ms) |
| 2 | Scoring circle | Animar conic-gradient desde 0→96 (800ms ease-out) |
| 2 | Barras de desglose | Animar width desde 0→score (600ms stagger 100ms) |

Todas las animaciones respetan `prefers-reduced-motion`.

---

## 8. Componentes a modificar/crear

| Archivo | Acción |
|---------|--------|
| `src/landing/components/DemoModal.tsx` | **Reescribir** completamente |
| `src/landing/components/HeroSection.tsx` | Sin cambios (ya integra DemoModal) |
| `src/landing/LandingPage.test.tsx` | **Actualizar** tests para nuevo flujo |

El modal se mantiene self-contained (no toca servicios ni backend).

---

## 9. Consideraciones

- **Sin costo LLM:** Todo es simulado con datos hardcodeados
- **Sin login:** La demo se muestra sin autenticación
- **Dark mode:** Todos los colores tienen variante `dark:`
- **Responsive:** En mobile, layout se apila verticalmente
- **Accesibilidad:** Botones con `aria-label`, roles semánticos, focus management al abrir/cerrar
