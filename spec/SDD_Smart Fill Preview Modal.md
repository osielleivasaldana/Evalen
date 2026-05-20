# **SDD: Smart Fill Preview Modal**

**Estado:** Aprobado para Implementación

**Versión:** 1.0

**Responsable:** Full Stack UI/UX Evalen Expert

**Basado en:** SDD_ Smart Fill Engine - Evalen.md / CreateCampaign.tsx / evalen-design-tokens.md

---

## **1. Resumen**

Agregar un modal de previsualización entre la generación del Smart Fill y la hidratación del formulario. El usuario podrá revisar qué va a generar la IA antes de aplicarlo, con control granular para aplicar o descartar.

## **2. Flujo Actual vs. Nuevo**

### Actual
```
[Usuario click "Smart Fill"] → [API] → [Hidrata campos] → [Avanza a paso 2]
```

### Nuevo
```
[Usuario click "Smart Fill"] → [API] → [MODAL: Preview] → [Aplicar / Descartar] → [Solo si aplica: hidrata + avanza]
```

## **3. Arquitectura de Componentes**

```
┌─────────────────────────────────────────────────────┐
│                  CreateCampaign.tsx                   │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  handleSmartFill()                               │ │
│  │  ├─ Llama API                                    │ │
│  │  ├─ setSmartFillResponse(data)                   │ │
│  │  └─ setSmartFillModalOpen(true)                  │ │
│  │                                                   │ │
│  │  handleApplySmartFill()                           │ │
│  │  ├─ Toma smartFillResponse almacenado             │ │
│  │  ├─ Hidrata formData (mapping existente)          │ │
│  │  ├─ setSmartFillModalOpen(false)                  │ │
│  │  └─ setCurrentStep(2)                             │ │
│  │                                                   │ │
│  │  handleDiscardSmartFill()                         │ │
│  │  ├─ setSmartFillResponse(null)                    │ │
│  │  └─ setSmartFillModalOpen(false)                  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  <SmartFillPreviewModal                          │ │
│  │    isOpen={smartFillModalOpen}                   │ │
│  │    response={smartFillResponse}                  │ │
│  │    onApply={handleApplySmartFill}                │ │
│  │    onDiscard={handleDiscardSmartFill}            │ │
│  │  />                                              │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              SmartFillPreviewModal.tsx                │
│                                                       │
│  Props:                                              │
│  ├─ isOpen: boolean                                  │
│  ├─ response: SmartFillResponse | null               │
│  ├─ onApply: () => void                              │
│  ├─ onDiscard: () => void                            │
│  └─ isApplying: boolean                              │
│                                                       │
│  Secciones internas:                                 │
│  ├─ Header: título + badge IA                       │
│  ├─ Info General: modalidad + duración               │
│  ├─ Descripción: texto truncado + "Ver más"         │
│  ├─ Requisitos: lista con bullets                    │
│  ├─ Salario: tarjeta con monto + moneda             │
│  ├─ Rúbrica: barras de peso sugeridas               │
│  └─ Footer: Descartar | Aplicar                      │
└─────────────────────────────────────────────────────┘
```

## **4. Mockups — Ventanas en ASCII**

### 4.1 Desktop (Pantalla completa con overlay)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████████████████████████████████████ │  ← overlay: bg-black/60 backdrop-blur-sm
│ ██                                                                           ██ │
│ ██   ┌─────────────────────────────────────────────────────────────────────┐  ██ │
│ ██   │  ┌──────────────────────────────────────────────────────────────┐   │  ██ │
│ ██   │  │  ✨  Vista Previa: Smart Fill Asistente              [×]     │   │  ██ │  ← bg-gradient-to-r from-indigo-600 to-purple-600
│ ██   │  │  Revisa el borrador generado por IA antes de aplicarlo       │   │  ██ │  │    text-white, rounded-t-2xl
│ ██   │  └──────────────────────────────────────────────────────────────┘   │  ██ │
│ ██   │                                                                     │  ██ │
│ ██   │  ┌─ Información General ─────────────────────────────────────────┐  │  ██ │
│ ██   │  │                                                               │  │  ██ │
│ ██   │  │  🏢  Desarrollador Full Stack Senior                          │  │  ██ │  ← text-gray-900 font-bold text-xl
│ ██   │  │                                                               │  │  ██ │
│ ██   │  │  🏠  Remoto        ⏱  Indefinido                             │  │  ██ │  ← text-gray-700 con íconos
│ ██   │  │                                                               │  │  ██ │
│ ██   │  └───────────────────────────────────────────────────────────────┘  │  ██ │  ← bg-white border border-gray-200 rounded-xl
│ ██   │                                                                     │  ██ │
│ ██   │  ┌─ Descripción del Puesto ──────────────────────────────────────┐  │  ██ │
│ ██   │  │                                                               │  │  ██ │
│ ██   │  │  Buscamos un ingeniero apasionado por la escalabilidad y      │  │  ██ │  ← text-gray-800
│ ██   │  │  el desarrollo de productos digitales. Serás responsable de   │  │  ██ │
│ ██   │  │  diseñar, construir y mantener sistemas robustos usando       │  │  ██ │
│ ██   │  │  tecnologías modernas como NestJS, React y AWS...             │  │  ██ │
│ ██   │  │                                                               │  │  ██ │
│ ██   │  │  [Ver texto completo]                                         │  │  ██ │  ← text-indigo-600 hover:text-indigo-700
│ ██   │  │                                                               │  │  ██ │
│ ██   │  └───────────────────────────────────────────────────────────────┘  │  ██ │
│ ██   │                                                                     │  ██ │
│ ██   │  ┌─ Requisitos ──────────────────────────────────────────────────┐  │  ██ │
│ ██   │  │                                                               │  │  ██ │
│ ██   │  │  ●  5+ años de experiencia en Node.js                         │  │  ██ │  ← text-gray-800 list-disc
│ ██   │  │  ●  Experiencia comprobable con React o Next.js               │  │  ██ │
│ ██   │  │  ●  Arquitectura de Microservicios                            │  │  ██ │
│ ██   │  │  ●  Inglés intermedio (lectura técnica)                       │  │  ██ │
│ ██   │  │                                                               │  │  ██ │
│ ██   │  └───────────────────────────────────────────────────────────────┘  │  ██ │
│ ██   │                                                                     │  ██ │
│ ██   │  ┌─ Salario ─────────────────────────────────────────────────────┐  │  ██ │
│ ██   │  │                                                               │  │  ██ │
│ ██   │  │  💰  $3.500.000  -  $5.000.000  CLP                          │  │  ██ │  ← text-gray-900 font-bold text-lg
│ ██   │  │                                                               │  │  ██ │  │  bg-green-50 border-green-200
│ ██   │  └───────────────────────────────────────────────────────────────┘  │  ██ │
│ ██   │                                                                     │  ██ │
│ ██   │  ┌─ Pesos de Rúbrica Sugeridos ──────────────────────────────────┐  │  ██ │
│ ██   │  │                                                               │  │  ██ │
│ ██   │  │  Habilidades Técnicas  ████████████████████████░░░░  60%      │  │  ██ │  ← bg-gray-50
│ ██   │  │                          └── bar: bg-indigo-600 ──┘           │  │  ██ │
│ ██   │  │  Experiencia          ██████████████░░░░░░░░░░░░  30%         │  │  ██ │
│ ██   │  │                          └── bar: bg-purple-600 ─┘            │  │  ██ │
│ ██   │  │  Educación            ████████░░░░░░░░░░░░░░░░░░  10%         │  │  ██ │
│ ██   │  │                          └── bar: bg-indigo-300 ─┘            │  │  ██ │
│ ██   │  │                                                               │  │  ██ │
│ ██   │  └───────────────────────────────────────────────────────────────┘  │  ██ │
│ ██   │                                                                     │  ██ │
│ ██   │  ┌──────────────────────────────────────────────────────────────┐  │  ██ │
│ ██   │  │                   [Descartar]    [Aplicar a la campaña]      │  │  ██ │
│ ██   │  │                                    ↑ gradient brand           │  │  ██ │
│ ██   │  │                    ↑ bg-gray-200    from-indigo-600           │  │  ██ │
│ ██   │  │                      text-gray-700  to-purple-600             │  │  ██ │
│ ██   │  └──────────────────────────────────────────────────────────────┘  │  ██ │  ← border-t border-gray-200, p-6
│ ██   │                                                                     │  ██ │
│ ██   └─────────────────────────────────────────────────────────────────────┘  ██ │
│ ██                                                                           ██ │
│ ████████████████████████████████████████████████████████████████████████████████ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Mobile (viewport < 640px)

```
┌──────────────────────────────────────┐
│ ┌────────────────────────────────────┐│
│ │ ✨ Vista Previa             [×]   ││  ← header gradient brand
│ │ Smart Fill Asistente               ││
│ └────────────────────────────────────┘│
│                                       │
│ ┌── Info General ────────────────────┐│
│ │ 🏢 Desarrollador Full Stack Sr.   ││
│ │ 🏠 Remoto   ⏱ Indefinido         ││
│ └────────────────────────────────────┘│
│                                       │
│ ┌── Descripción ────────────────────┐│
│ │ Buscamos un ingeniero apasionado  ││
│ │ por la escalabilidad...           ││
│ │ [Ver texto completo]              ││
│ └────────────────────────────────────┘│
│                                       │
│ ┌── Requisitos ─────────────────────┐│
│ │ ● 5+ años Node.js                 ││
│ │ ● Experiencia React/Next.js       ││
│ │ ● Microservicios                  ││
│ │ ● Inglés intermedio               ││
│ └────────────────────────────────────┘│
│                                       │
│ ┌── Salario ────────────────────────┐│
│ │ 💰 $3.500K - $5.000K CLP         ││
│ └────────────────────────────────────┘│
│                                       │
│ ┌── Rúbrica Sugerida ───────────────┐│
│ │ Técnica    ████████░░░░ 60%       ││
│ │ Experiencia ████░░░░░░░░ 30%      ││
│ │ Educación  ██░░░░░░░░░░ 10%       ││
│ └────────────────────────────────────┘│
│                                       │
│ ┌────────────────────────────────────┐│
│ │ [Descartar]  [Aplicar campaña]    ││
│ └────────────────────────────────────┘│
└──────────────────────────────────────┘
```

### 4.3 Empty State (cuando no hay salario)

```
┌── Salario ─────────────────────────────────────────────────────────────────┐
│                                                                            │
│  💰  No especificado                                                       │  ← text-gray-400 italic
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Estado "Aplicando..." (loading en botón)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   [Descartar]    ◌  Aplicando...                      │
│                                   ↑ spinner animate-spin               │
│                                     + disabled state                    │
└────────────────────────────────────────────────────────────────────────┘
```

## **5. Paleta de Colores (consistente con diseño actual)**

| Token | Clase Tailwind | Hex | Uso |
|---|---|---|---|
| `modal-backdrop` | `bg-black/60 backdrop-blur-sm` | `#000` 60% | Overlay |
| `modal-bg` | `bg-white rounded-2xl shadow-2xl` | `#ffffff` | Contenedor modal |
| `modal-header` | `from-indigo-600 to-purple-600` | `#4f46e5 → #9333ea` | Header gradiente |
| `modal-header-text` | `text-white` | `#ffffff` | Título en header |
| `modal-close` | `text-white/80 hover:text-white` | `rgba(255,255,255,0.8)` | Botón cerrar |
| `section-title` | `text-sm font-semibold text-gray-500 uppercase tracking-wider` | `#6b7280` | Títulos de sección |
| `section-border` | `border border-gray-200` | `#e5e7eb` | Bordes de secciones |
| `section-bg` | `bg-white` | `#ffffff` | Fondo secciones |
| `text-primary` | `text-gray-900` | `#111827` | Título del puesto |
| `text-body` | `text-gray-800` | `#1f2937` | Descripción, requisitos |
| `text-secondary` | `text-gray-700` | `#374151` | Modalidad, duración |
| `text-muted` | `text-gray-400` | `#9ca3af` | Placeholder, "no especificado" |
| `salary-bg` | `bg-green-50 border border-green-200` | `#f0fdf4 / #bbf7d0` | Tarjeta de salario |
| `salary-text` | `text-gray-900 font-bold` | `#111827` | Monto del salario |
| `rubric-bar-1` | `bg-indigo-600` | `#4f46e5` | Barra: technical_skills |
| `rubric-bar-2` | `bg-purple-600` | `#9333ea` | Barra: experience |
| `rubric-bar-3` | `bg-indigo-300` | `#a5b4fc` | Barra: education |
| `rubric-label` | `text-sm font-medium text-gray-700` | `#374151` | Label de cada peso |
| `rubric-value` | `text-sm font-bold text-gray-900` | `#111827` | Porcentaje numérico |
| `btn-discard` | `bg-gray-200 text-gray-700 hover:bg-gray-300` | `#e5e7eb / #374151` | Botón descartar |
| `btn-apply` | `from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg` | `#4f46e5 → #9333ea` | Botón aplicar |
| `btn-disabled` | `bg-gray-400 text-white cursor-not-allowed` | `#9ca3af` | Botón disabled |
| `link-expand` | `text-indigo-600 hover:text-indigo-700 font-medium` | `#4f46e5` | Link "Ver texto completo" |

## **6. Contratos y Tipos**

### Estados de CreateCampaign.tsx (adicionales)

```typescript
// --- NUEVOS ESTADOS ---
const [smartFillResponse, setSmartFillResponse] = useState<SmartFillResponse | null>(null);
const [smartFillModalOpen, setSmartFillModalOpen] = useState(false);
const [isApplying, setIsApplying] = useState(false);
```

### Props de SmartFillPreviewModal

```typescript
interface SmartFillPreviewModalProps {
  isOpen: boolean;
  response: SmartFillResponse | null;
  onApply: () => void;
  onDiscard: () => void;
  isApplying?: boolean;
}
```

### SmartFillResponse (ya existe en api.ts — no requiere cambios)

```typescript
export interface SmartFillResponse {
  fields: {
    title: string;
    description: string;
    requirements: string[];
    modality: string;
    duration: string;
    salary_range?: { min: number; max: number; currency: string };
  };
  suggested_rubric_weights: {
    technical_skills: number;
    experience: number;
    education: number;
  };
}
```

## **7. Cambios en CreateCampaign.tsx**

### handleSmartFill() — MODIFICADO

```typescript
const handleSmartFill = async () => {
  if (!formData.title?.trim()) {
    setErrors({ title: 'Ingresa un título para usar Smart Fill' });
    return;
  }

  setIsGenerating(true);
  setErrors({});
  try {
    const response = await apiService.generateCampaignDraft({
      jobTitle: formData.title,
      additionalContext: smartFillContext,
      language: 'es'
    });

    // ANTES: hidrataba directamente + avanzaba
    // AHORA: guarda respuesta y abre modal
    setSmartFillResponse(response);
    setSmartFillModalOpen(true);

    // Refrescar perfil (créditos) se mantiene
    const profile = await apiService.getProfile();
    setCurrentUser(profile);
  } catch (err: any) {
    setErrors({ submit: err.message || 'Error al generar la campaña con IA' });
  } finally {
    setIsGenerating(false);
  }
};
```

### handleApplySmartFill() — NUEVO

```typescript
const handleApplySmartFill = async () => {
  if (!smartFillResponse) return;
  setIsApplying(true);

  // Mismo mapping que existía en handleSmartFill original
  const mapModality = (mod: string) => {
    if (!mod) return undefined;
    const upper = mod.toUpperCase();
    if (upper.includes('REMOTE') || upper.includes('REMOTA')) return 'REMOTE';
    if (upper.includes('HYBRID') || upper.includes('HIBRID')) return 'HYBRID';
    return 'ON_SITE';
  };

  const mapDuration = (dur: string) => {
    if (!dur) return undefined;
    const upper = dur.toUpperCase();
    if (upper.includes('FIXED')) return 'FIXED_TERM';
    if (upper.includes('PROJECT')) return 'PROJECT';
    return 'INDEFINITE';
  };

  setFormData(prev => ({
    ...prev,
    description: smartFillResponse.fields.description || prev.description,
    requirements: smartFillResponse.fields.requirements
      ? `<ul>${smartFillResponse.fields.requirements.map(r => `<li>${DOMPurify.sanitize(r)}</li>`).join('')}</ul>`
      : prev.requirements,
    modality: mapModality(smartFillResponse.fields.modality) || prev.modality,
    duration: mapDuration(smartFillResponse.fields.duration) || prev.duration,
    salary: smartFillResponse.fields.salary_range?.min || prev.salary,
    currency: (smartFillResponse.fields.salary_range?.currency as any) || prev.currency,
  }));

  setSmartFillModalOpen(false);
  setSmartFillResponse(null);
  setCurrentStep(2);

  setIsApplying(false);
};
```

### handleDiscardSmartFill() — NUEVO

```typescript
const handleDiscardSmartFill = () => {
  setSmartFillModalOpen(false);
  setSmartFillResponse(null);
};
```

### Render condicional — NUEVO (antes del cierre de Layout)

```tsx
<SmartFillPreviewModal
  isOpen={smartFillModalOpen}
  response={smartFillResponse}
  onApply={handleApplySmartFill}
  onDiscard={handleDiscardSmartFill}
  isApplying={isApplying}
/>
```

## **8. Nuevo Archivo: SmartFillPreviewModal.tsx**

### Estado sin salario

```
┌──────────────────────────────────────────────────────────────┐
│  💰  No especificado                                         │
│  ─────────────────────────────────────────────               │
│  Texto gris claro (text-gray-400 italic) si salary_range     │
│  es null/undefined.                                          │
└──────────────────────────────────────────────────────────────┘
```

### Estado "Ver texto completo"

```
┌──────────────────────────────────────────────────────────────┐
│  Descripción del Puesto                                      │
│                                                              │
│  Buscamos un ingeniero apasionado por la escalabilidad y     │
│  el desarrollo de productos digitales. Serás responsable...  │
│                                                              │
│  [Ver texto completo]  ← solo visible si la descripción     │
│                          excede los N caracteres (ej: 200)   │
│                                                              │
│  Al hacer clic: abre un expand/collapse o un sub-modal       │
│  mostrando el texto completo sin truncar                     │
└──────────────────────────────────────────────────────────────┘
```

### Estados de carga en botón "Aplicar"

| Estado | Botón "Aplicar" | Botón "Descartar" |
|---|---|---|
| Normal | `from-indigo-600 to-purple-600` | `bg-gray-200 text-gray-700` |
| Aplicando | `bg-gray-400 + spinner + "Aplicando..."` | Disabled |
| Disabled (response null) | `bg-gray-400 cursor-not-allowed` | `bg-gray-200` |

## **9. Responsividad**

| Breakpoint | Modal width | Padding | Layout |
|---|---|---|---|
| Desktop (≥ 768px) | `max-w-2xl` (672px) | `p-6` secciones | Grid de 2 columnas para salario+rúbrica |
| Mobile (< 768px) | `mx-4` full width | `p-4` secciones | Stack vertical, texto más compacto |
| Altura | `max-h-[90vh] overflow-y-auto` en ambas | — | Scroll interno si es necesario |

### Scroll Behavior

```
┌────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐  │
│  │  HEADER (gradiente, sticky top-0)                    │  │  ← sticky, z-10
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                      │  │
│  │  CONTENIDO SCROLLEABLE                              │  │  ← overflow-y-auto
│  │  (secciones)                                        │  │     max-h-[calc(90vh-180px)]
│  │                                                      │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  FOOTER (botones, sticky bottom-0, border-t)        │  │  ← sticky, z-10
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## **10. Checklist de Implementación**

- [ ] Crear `SmartFillPreviewModal.tsx` con todas las secciones (info, descripción, requisitos, salario, rúbrica)
- [ ] Agregar estados `smartFillResponse`, `smartFillModalOpen`, `isApplying` en `CreateCampaign.tsx`
- [ ] Modificar `handleSmartFill()` para que almacene respuesta + abra modal (no hidrate directo)
- [ ] Crear `handleApplySmartFill()` con el mapping existente + DOMPurify en requirements
- [ ] Crear `handleDiscardSmartFill()` para limpiar estado
- [ ] Renderizar `<SmartFillPreviewModal>` dentro del return de CreateCampaign
- [ ] Implementar responsive: mobile full-width, desktop max-w-2xl
- [ ] Implementar "Ver texto completo" toggle para descripciones largas
- [ ] Manejar empty state para salary_range
- [ ] Verificar accesibilidad: roles, aria-modal, focus trap, escape key
- [ ] Verificar que los créditos se descuenten correctamente (solo si se aplica)
- [ ] Probar flujo: generar → modal → aplicar → paso 2 hidratado
- [ ] Probar flujo: generar → modal → descartar → sigue en paso 1 sin cambios

## **11. Notas Técnicas Adicionales**

- **No se modifica ningún archivo backend** (ni NestJS, ni FastAPI, ni Prisma)
- **No se modifica `api.ts`** — los tipos `SmartFillResponse` ya existen
- **DOMPurify** ya está importado en `CreateCampaign.tsx` (línea 12), se usa en `handleApplySmartFill` para sanitizar requisitos
- El mapping de enums (modality, duration) se extrae a `handleApplySmartFill` pero **sigue siendo idéntico** al original
- El refresco de perfil (`getProfile()`) se mantiene en `handleSmartFill()` para mostrar créditos actualizados apenas se abre el modal
- **No se requiere** el uso del `suggested_rubric_weights` en esta iteración — solo se muestra en el modal como referencia visual; la hidratación de rúbrica queda para una iteración futura (ver SDD_ Smart Fill Engine)
