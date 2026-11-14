# evalen — Sistema visual
### Brand book & design tokens · v1 · abril 2026

> *La IA lee. Los humanos deciden.* Y el diseño tiene que sonar a eso: a un **informe bien hecho**, no a un dashboard pintado con degradados. Este documento es, a la vez, la regla y el ejemplo. Copia el bloque que necesites — ya viene con su look.

**Stack de referencia** (ver §09): `currify-front` = React + TypeScript + **Tailwind CSS** + componentes tipo shadcn/Radix. Tipografías vía fontsource CDN: **Fraunces** (serif), **Instrument Sans** (sans), **IBM Plex Mono** (mono). Dos temas: claro (por defecto) y oscuro, conmutables y persistidos en `localStorage['evalen-theme']`.

---

#### Leyenda de señales de este documento
Usamos un vocabulario fijo para que escanees rápido. No es decoración: cada marca tiene un significado.

- **[MANIFIESTO]** un principio que manda sobre todo lo demás.
- **[TOKEN]** un valor técnico copiable tal cual (hex, rem, px, easing, variable CSS).
- **[SÍ] / [NO]** haz esto / no hagas esto.
- **[GESTO]** un recurso de marca reconocible (losa verde, filigrana, cita, gauge, resaltado, nota a mano).
- **[RECETA]** cómo componer el recurso paso a paso.
- **[PRODUCTO]** anclaje a la app real y a su arquitectura (rutas, flujos, módulos).
- **[⚠]** cuidado / patrón que huele a *AI slop* y cómo evitarlo.

En la paleta semántica, el color **es** la información: 🟢 `good` (≥ 80) · 🟡 `mid` (≥ 60) · 🔴 `low` (< 60).

---

## 00 · Manifiesto

**[MANIFIESTO] 01 — Una familia tipográfica por función.** Fraunces es la *voz*; Instrument Sans son los *datos*; IBM Plex Mono son las *etiquetas*. Nunca mezclar roles. La serif no va en una tabla; la sans no va en un titular emocional; el mono no va en un párrafo.

**[MANIFIESTO] 02 — El recuadro es un acento, no un contenedor.** Por defecto el contenido vive sobre el papel y se separa con tipografía, espacio y líneas finas. Solo tres cosas merecen superficie propia: el objeto sobre el que *actúas*, un *callout* (cita o consejo) y una *barra de navegación*. Lo demás respira.

**[MANIFIESTO] 03 — El drama viene del contraste y del vacío.** Un único héroe con escala grande y silencio alrededor destaca más que cuatro widgets gritando. Si todo tiene el mismo volumen visual, nada importa. *El aire entre bloques es jerarquía.*

**[MANIFIESTO] 04 — El verde profundo es escaso, por eso funciona.** Es el color de la marca y de la "magia de IA" puntual. **Una losa verde por vista, como máximo.** Si lo pones en cada cabecera, deja de ser especial y la página se aplasta en una masa oscura.

**[MANIFIESTO] 05 — Decora con metáforas del producto, no con clichés.** La malla de nodos conectados no es adorno: es la imagen del *matching semántico* que hace `currify-core`. Un *sparkle* genérico o un *blob* aurora es slop; una metáfora del propio producto es diseño.

---

## 01 · Color

El sistema tiene **tres acentos con trabajo distinto** y un lienzo crema. Confundirlos es el error más común.

| Acento | Variable | Claro | Oscuro | Trabajo (único) |
|---|---|---|---|---|
| Naranja | `--cta` | `#D64518` | `#FF6A38` | **La acción.** El único color de "haz clic aquí". Una acción primaria por vista. |
| Naranja hover | `--ctah` | `#B5370F` | `#FF8455` | Hover del primario. |
| Texto sobre naranja | `--ctatext` | `#FFF7EC` | `#10231A` | Legibilidad sobre `--cta`. |
| Amarillo | `--yellow` | `#F3E94E` | `#F3E94E` | **Magia / destacar.** Resaltador `.hl`, punto "en vivo", badge de match, glow del gauge. |
| Amarillo suave | `--yellow2` | `#FBF6AE` | `#5A5418` | Resaltador `.hl-soft` dentro de párrafos. |
| Verde | `--green` | `#1C5B44` | `#5BAE88` | **Marca / éxito.** Acento positivo, eyebrows, iconos de criterio. |
| Verde profundo | `--greendeep` | `#0F3A2C` | `#163528` | **Marca fuerte.** Logo, login, losa "magia IA", *una* card destacada. |
| Verde tint | `--greentint` | `#E4ECE4` | `#1C3329` | Fondo de chip verde / hover suave. |
| Sobre marca | `--onmark` | `#F6F1E6` | `#F1EBDC` | Texto e iconos sobre fondos oscuros. |

**Lienzo y tinta**

| Rol | Variable | Claro | Oscuro |
|---|---|---|---|
| Fondo app | `--paper` | `#F6F1E6` | `#0E1813` |
| Fondo secundario / hover | `--paper2` | `#EFE7D6` | `#13201A` |
| Superficie elevada (cards) | `--card` | `#FCFAF3` | `#16241C` |
| Texto principal | `--ink` | `#15261E` | `#F1EBDC` |
| Texto secundario | `--ink2` | `#4C5B51` | `#AAB6A8` |
| Texto terciario / meta | `--ink3` | `#828E84` | `#7E8C7E` |
| Divisor suave | `--line` | `rgba(21,38,30,.13)` | `rgba(241,235,220,.13)` |
| Borde / divisor | `--line2` | `rgba(21,38,30,.24)` | `rgba(241,235,220,.26)` |

**[TOKEN] Contrato copiable — variables CSS** (pega en tu `:root`; el tema oscuro sobrescribe):

```css
:root {
  --paper:#F6F1E6; --paper2:#EFE7D6; --card:#FCFAF3;
  --ink:#15261E; --ink2:#4C5B51; --ink3:#828E84;
  --green:#1C5B44; --greendeep:#0F3A2C; --greentint:#E4ECE4; --onmark:#F6F1E6;
  --yellow:#F3E94E; --yellow2:#FBF6AE;
  --cta:#D64518; --ctah:#B5370F; --ctatext:#FFF7EC;
  --good:#1C5B44; --goodt:#E4ECE4; --mid:#A9760F; --midt:#F6ECCF; --low:#B23B2E; --lowt:#F4DDD8;
  --line:rgba(21,38,30,.13); --line2:rgba(21,38,30,.24);
}
html[data-theme="dark"] {
  --paper:#0E1813; --paper2:#13201A; --card:#16241C;
  --ink:#F1EBDC; --ink2:#AAB6A8; --ink3:#7E8C7E;
  --green:#5BAE88; --greendeep:#163528; --greentint:#1C3329; --onmark:#F1EBDC;
  --yellow:#F3E94E; --yellow2:#5A5418;
  --cta:#FF6A38; --ctah:#FF8455; --ctatext:#10231A;
  --good:#62B78F; --goodt:#173327; --mid:#E0A93A; --midt:#3A2E12; --low:#E0695A; --lowt:#3A1C18;
  --line:rgba(241,235,220,.13); --line2:rgba(241,235,220,.26);
}
```

### Tono semántico (good / mid / low)
Cada puntaje de 0–100 que devuelve `scoring_service.py` se colorea por umbrales. Cada tono es un **par fondo/texto** para que chips y barras sean legibles en ambos temas.

| Tono | Umbral | Texto claro / oscuro | Fondo claro / oscuro |
|---|---|---|---|
| 🟢 `good` | ≥ 80 | `#1C5B44` / `#62B78F` | `#E4ECE4` / `#173327` |
| 🟡 `mid` | ≥ 60 | `#A9760F` / `#E0A93A` | `#F6ECCF` / `#3A2E12` |
| 🔴 `low` | < 60 | `#B23B2E` / `#E0695A` | `#F4DDD8` / `#3A1C18` |

**[RECETA]** En JS, deriva el tono una sola vez y reutilízalo en anillo, barra y chip del mismo candidato, para que nunca se contradigan:

```js
const toneOf = v => v >= 80 ? 'good' : v >= 60 ? 'mid' : 'low';
```

### ¿Quién manda? (regla de prioridad del color)

```
   ACCIÓN (naranja)  ──►  una por vista, el CTA principal
        │
   MAGIA (amarillo)  ──►  destacar / IA / "en vivo" / .hl
        │
   MARCA (verde)     ──►  acento positivo; losa verde = 1 por vista
        │
   LIENZO (crema)    ──►  todo lo demás vive aquí, sin caja
```

**[⚠]** El naranja y el amarillo **nunca compiten** en el mismo componente: amarillo *señala*, naranja *ejecuta*. Si un botón es amarillo, ya no es una acción, es un distintivo.

---

## 02 · Tipografía

Tres familias, tres trabajos, cero ambigüedad. Cargadas con sus pesos reales (no sintéticos):

- **Fraunces** — 400 / 500 / 600 / 700 + itálica 500 / 600. *La voz y la marca.*
- **Instrument Sans** — 400 / 500 / 600 / 700. *Interfaz y datos.*
- **IBM Plex Mono** — 400 / 500. *Etiquetas y metadatos.*

### Escala de uso

| Rol | Familia | Tamaño / peso | Tracking | Dónde |
|---|---|---|---|---|
| Hero / display | Fraunces | 2.4–4rem / 600 | -0.02em | Apertura de landing, titular de análisis |
| Titular de sección | Fraunces | 1.3–1.8rem / 600 | -0.01em | Encabezados de bloque |
| Veredicto / cita | Fraunces | 1.0–1.14rem / 500 *itálica* | normal | Insight de la IA, consejos |
| Nombre / número héroe | Fraunces | 1.9–4.1rem / 600 | -0.02/-0.03em | Nombre del candidato, gauge numérico |
| Wordmark | Fraunces | 1.35rem / 600 | -0.02em | `evalen` |
| Título UI / dato | Instrument Sans | 1.05–1.3rem / 600–700 | -0.01em | Títulos de campaña, datos, expediente |
| Cuerpo | Instrument Sans | 13–15px / 400 | normal | Texto corrido, justificaciones |
| Botón | Instrument Sans | 13–15px / 600 | normal | Toda acción |
| Eyebrow / label | IBM Plex Mono | 10–11px / 500 | +0.12–0.18em, **CAPS** | Etiquetas, secciones numeradas |
| Chip de estado | IBM Plex Mono | 10.5px / 500 | +0.08–0.14em, CAPS | Etapas, niveles |
| Meta / fecha / kbd | IBM Plex Mono | 10–11.5px / 400 | normal o +0.04em | Timestamps, contadores, atajos |

**[SÍ]** Usa el mono en mayúsculas **solo en etiquetas cortas** (1–3 palabras).
**[NO]** Párrafos enteros en CAPS: cansan la vista y gritan "plantilla".

**[SÍ]** Contraste de tamaño *dentro* de una misma línea para crear jerarquía sin cajas: p. ej. un número en `2.2rem/700` seguido de su unidad en `12px/500 ink3`.

**[TOKEN] `tailwind.config` — fontFamily** (copia tal cual en `theme.extend`):

```js
fontFamily: {
  serif: ['Fraunces','Georgia','Times New Roman','serif'],
  sans:  ['Instrument Sans','system-ui','-apple-system','Segoe UI','Roboto','sans-serif'],
  mono:  ['IBM Plex Mono','ui-monospace','SFMono-Regular','Menlo','monospace']
}
```

---

## 03 · Resaltado y notas a mano

Los dos gestos que hacen que el texto parezca *subrayado por una persona*. Úsalos con medida: resaltan, no decoran.

### 03.1 · El marcador amarillo `.hl`

**[GESTO]** Un resaltado con puntas irregulares, como un rotulador pasado a mano. La variante `.hl-soft` es el mismo amarillo pero claro y sin skew, para resaltar dentro de párrafos sin tanto drama.

**[TOKEN]**

```css
.hl {
  background: linear-gradient(104deg,
    transparent .6%, var(--yellow) 2.2%, var(--yellow) 96%, transparent 97.4%);
  padding: .02em .2em; margin: 0 -.06em; border-radius: 3px;
  -webkit-box-decoration-break: clone; box-decoration-break: clone;
}
.hl-soft {
  background: var(--yellow2); padding: .02em .22em; border-radius: 3px;
  -webkit-box-decoration-break: clone; box-decoration-break: clone;
}
html[data-theme="dark"] .hl-soft { background: var(--yellow2); color: var(--ink); }
```

**[RECETA] Por qué funciona:** el `linear-gradient` con `transparent` en los extremos da las *puntas* diagonales; `box-decoration-break: clone` hace que el resaltado se rompa correctamente cuando el texto salta de línea; el padding mínimo y el `border-radius: 3px` evitan que parezca un `<mark>` cuadrado de navegador.

### 03.2 · La anotación a mano `.hand-note`

**[GESTO]** Una flecha curva dibujada en SVG (trazo naranja, puntas redondeadas) + un texto en mono ligeramente rotado. Parece una nota garabateada al margen señalando algo.

**[TOKEN] Contenedor**

```css
.hand-note {
  position: absolute; display: flex; align-items: center; gap: .5rem;
  color: var(--cta); font-family: 'IBM Plex Mono', monospace;
  font-size: .78rem; line-height: 1.3; max-width: 170px; pointer-events: none;
}
.hand-note svg { flex: none; overflow: visible; }
```

**[RECETA] Tres variantes** (el trazo es el mismo SVG; cambia orientación y rotación):

```html
<!-- A · entra por la derecha, rotada -5° -->
<div class="hand-note" style="right:-6px; top:-2px; transform:rotate(-5deg)">
  <svg width="58" height="34" viewBox="0 0 58 34" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M54 4 C 38 4, 22 12, 8 26"/>      <!-- curva -->
    <path d="M8 26 l 9 -1 M8 26 l 1 -9"/>       <!-- punta de flecha -->
  </svg>
  <span>¡este sí!</span>
</div>

<!-- B · entra por la izquierda (espejada con scaleX(-1)) -->
<div class="hand-note" style="left:-8px; bottom:-6px; transform:rotate(3deg); flex-direction:row-reverse">
  <svg width="58" height="34" viewBox="0 0 58 34" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:scaleX(-1)">
    <path d="M54 4 C 38 4, 22 12, 8 26"/><path d="M8 26 l 9 -1 M8 26 l 1 -9"/>
  </svg>
  <span class="text-right">se paga solo</span>
</div>

<!-- C · subrayado ondulado (sin texto, bajo una palabra) -->
<svg width="150" height="12" viewBox="0 0 150 12" fill="none"
     stroke="var(--cta)" stroke-width="2.4" stroke-linecap="round">
  <path d="M2 7 C 20 2, 34 11, 52 6 S 86 2, 104 7 S 134 11, 148 5"/>
</svg>
```

**[⚠]** Máximo **una** nota a mano por zona visible. Dos ya parecen un cuaderno de primaria; cero en una vista de datos densos está bien. Son un *acento humano*, no un patrón de layout.

---

## 04 · Gestos de marca

Cuatro recursos que "suenan" a Evalen. Cada uno con su **cuándo sí / cuándo no**. El error típico es usar los cuatro a la vez: elige **uno por zona**.

### 04.1 · Losa verde profunda
**[GESTO]** Fondo `--greendeep` con un *glow* radial amarillo en una esquina y la malla de nodos en crema al ~8%. Es el gesto de "aquí pasa magia de marca/IA".

**[SÍ]** Pantalla de login, bloque *Smart Fill* del wizard, **una** card de stat destacada por vista.
**[NO]** Cabecera de contenido (ahí el fondo es *papel*; ver §04.2). Repetirla en cada sección aplasta la jerarquía.

### 04.2 · Filigrana de nodos (membrete de informe)
**[GESTO]** La misma malla semántica, pero en **tinta** al ~5% sobre fondo claro. Convierte una card en la portada de un *expediente*. Es la metáfora visual del matching: nodos = criterios/candidatos conectados.

**[TOKEN] SVG base** (recorta el `viewBox` a tu proporción; `preserveAspectRatio="xMidYMid slice"`):

```html
<svg aria-hidden="true" class="report-watermark"
     style="position:absolute;inset:0;width:100%;height:100%;opacity:.05;color:var(--ink)"
     viewBox="0 0 760 320" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" stroke-width="1">
  <g>
    <line x1="40" y1="48" x2="150" y2="34"/><line x1="150" y1="34" x2="262" y2="78"/>
    <line x1="262" y1="78" x2="384" y2="42"/><line x1="384" y1="42" x2="506" y2="96"/>
    <line x1="262" y1="78" x2="322" y2="146"/><line x1="150" y1="34" x2="92" y2="134"/>
    <line x1="92" y1="134" x2="212" y2="166"/><line x1="322" y1="146" x2="452" y2="188"/>
  </g>
  <g fill="currentColor" stroke="none">
    <circle cx="40" cy="48" r="2.2"/><circle cx="384" cy="42" r="2.2"/><circle cx="322" cy="146" r="2.2"/>
    <circle class="animate-nodepulse" cx="150" cy="34" r="3"/>
    <circle class="animate-nodepulse" cx="262" cy="78" r="3" style="animation-delay:.9s"/>
  </g>
</svg>
```

**[RECETA] Opacidad por fondo:** sobre *papel* → nodos en `var(--ink)` al **5%**; sobre *losa verde* → nodos en `var(--onmark)` al **7–8%**. Nunca por encima: es agua, no pared.

### 04.3 · Cita con barra lateral
**[GESTO]** `border-left: 2px solid var(--cta)` + padding izquierdo + texto en Fraunces itálica. Es el "diagnóstico" del informe.

**[SÍ]** Veredicto de la IA, consejos, extractos literales del CV.
**[NO]** Texto neutro sin carga de voz (ahí, sans normal).

### 04.4 · Gauge / anillo de match
**[GESTO]** Arco de **270°** (no un donut cerrado), trazo con el color del tono (`--hero` = color del tono del match), *glow* tenue detrás, y el número en Fraunces con **count-up** sincronizado al arco. Es el héroe del análisis IA.

**[TOKEN] Geometría** (para `size` y `stroke` dados): `r = (size - stroke)/2`; `circ = 2πr`; arco visible = `circ * 0.75`; offset final = `arcoVisible * (1 - pct/100)`. Rotar el SVG `135°` para que el gap quede abajo.

**[RECETA] Count-up + arco** (ease-out, 1.2 s; siempre con *fallback* para `prefers-reduced-motion`):

```js
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const vis = circ * 0.75, finalOff = vis * (1 - pct / 100);
if (reduce) { num.textContent = pct; prog.style.strokeDashoffset = finalOff; return; }
prog.style.strokeDashoffset = finalOff;            // el arco anima por transición CSS
let start = null; const ease = t => 1 - (1 - t) ** 3;
(function step(ts){ if(!start) start = ts; const p = Math.min(1,(ts-start)/1200);
  num.textContent = Math.round(ease(p) * pct);
  p < 1 ? requestAnimationFrame(step) : num.textContent = pct; })(performance.now());
```

**[SÍ]** Héroe del análisis, anillo de avatar en el drawer.
**[NO]** Repetirlo en cada fila de una tabla (ahí: número tabular + barra fina).

---

## 05 · Componentes

### 05.1 · Botones
Tres tipos. La regla de oro: **una acción naranja por vista.**

| Tipo | Uso | Construcción |
|---|---|---|
| Primario | La acción principal | `bg-cta text-ctatext shadow-cta hover:bg-ctah hover:-translate-y-0.5` |
| Ghost / secundario | Lo demás | `border border-line2 bg-card text-ink hover:border-ink` |
| Oscuro / marca | Acciones "de sistema" sobre claro | `bg-greendeep text-onmark` |

Radio `xl` (12 px). Icono a la derecha con micro-desplazamiento en hover (`group-hover:translate-x-0.5`). Foco visible con anillo del color del botón.

### 05.2 · Chips de estado
Píldora mono en CAPS con punto de tono. Usa el par semántico del §01:

```html
<span class="inline-flex items-center gap-1.5 rounded-full bg-goodt px-2.5 py-1
             font-mono text-[10.5px] font-medium uppercase tracking-wide text-good">
  <span class="h-1.5 w-1.5 rounded-full bg-good"></span> En entrevista
</span>
```

### 05.3 · Campos
Radio `xl`, borde `line2`, foco en `green` con anillo suave (`focus:ring-2 focus:ring-green/25`). Label en mono CAPS `11px`. Checkbox/radio con `accent-cta`. Inputs sobre fondo oscuro (p. ej. dentro de una losa) usan fondo **claro fijo** para legibilidad, no transparente.

### 05.4 · La regla del recuadro (la más importante)

```
  [NO]  todo en cajas              [SÍ]  cajas solo como acento
  ┌──────────┐                     Título que fluye sobre el papel
  │  caja    │                     Texto separado por una línea fina…
  ├──────────┤                     ┌──────────────────────────────┐
  │  caja    │                     │ …y UNA caja, porque es       │
  ├──────────┤                     │    accionable / callout.     │
  │  caja    │                     └──────────────────────────────┘
  └──────────┘
```

**[SÍ] Merecen superficie propia:** (1) el objeto sobre el que actúas, (2) un callout, (3) una barra de navegación. **Todo lo demás** (experiencia, formación, habilidades, resumen) vive como **documento fluido**: etiqueta mono + título sans + contenido, separados por *hairlines* y aire.

---

## 06 · Espacio, radios, sombras, grano

**Radios** — `full` (chips) · `2xl`/16 px (losas, cards) · `xl`/12 px (inputs, botones) · `lg`/9 px (botones sm, icon-btn).

**Sombras** (nombres del sistema):

| Nombre | Valor | Uso |
|---|---|---|
| `soft` | `0 10px 26px -18px rgba(15,40,30,.45)` | Cards en hover |
| `card` | `0 22px 48px -28px rgba(15,40,30,.5)` | Losas / contenedores |
| `pop` | `0 18px 40px -22px rgba(15,40,30,.55)` | Menús / drawer |
| `cta` | `0 12px 22px -12px rgba(214,69,24,.6)` | Botón primario |
| `gold` | `0 10px 24px -12px rgba(243,233,78,.45)` | Badge / match |
| `ring` | `0 14px 30px -16px rgba(15,40,30,.45)` | Anillo flotante |

**Contenedor** — `max-width 1240px`; padding lateral `24px` (móvil) / `32px` (desktop). Entre secciones `mt-10`/`mt-12`; grids `gap-5`/`gap-6`.

**Grano** — una capa fija sobre toda la app, `opacity .04–.05`, `mix-blend-mode: overlay`, con un SVG de `feTurbulence`. Evita que el fondo crema se vea "plástico". **No** lo subas de 0.06 o ensucia.

---

## 07 · Movimiento

**[MANIFIESTO]** Animación con *feedback*, nunca por decorar. Easing estándar del sistema: `cubic-bezier(.2,.7,.2,1)`. **Todo** respeta `prefers-reduced-motion` (en reduce: sin animación y los valores finales aplicados de inmediato).

| Animación | Duración / easing | Dónde |
|---|---|---|
| Reveal on scroll | .6 s ease (opacity + translateY 18 px) | Secciones al entrar |
| Count-up + gauge | 1.2 s ease-out | Héroe del análisis |
| Barra que se llena | 1 s ease | Criterios, skills |
| Hover lift | .18–.25 s | Botones, cards (`-translate-y-0.5`) |
| Acordeón | .32 s (`grid-template-rows 0fr→1fr`) | Razonamiento por criterio |
| Drawer | .34 s ease (`translateX`) | Panel de candidato |
| Pulse "en vivo" | 2.2 s infinito (box-shadow) | Punto amarillo de estado |
| Node pulse | 3.6 s infinito (opacity) | Nodos de la filigrana |
| Flash de vínculo | 1.5 s (fondo amarillo → transparente) | Salto criterio → evidencia |

**[⚠]** Si una animación no *responde* a algo (input, scroll, estado), probablemente sobra. El pulse del punto "en vivo" se justifica porque comunica *estado*; un blob flotando de fondo, no.

---

## 08 · Patrones de composición

Recetas de las estructuras que ya resolvimos, para que las repliques sin reinventar.

**Cabecera de decisión (una vista, un héroe).** Tres zonas separadas por *aire*, sin hairlines entre ellas: (1) **héroe** = gauge + número monumental + chip de nivel; (2) **identidad** = avatar pequeño + nombre en serif + contactos como *texto con icono* (no píldoras); (3) **veredicto** = cita con barra lateral + dos filas "suma / falta" con punto de color. Una sola caja en toda la portada. Sello mono de marca arriba, acciones a la derecha.

**Banda del juicio (compacta, horizontal).** "Por qué esta nota": los criterios como filas con barra + nota siempre visibles y el **razonamiento colapsado** por defecto (*progressive disclosure*: solo lo abres cuando dudas). Al lado, fortalezas/brechas en dos columnas con un divisor vertical, **sin caja**.

**Expediente como documento + índice de anclas (NO tabs).** Las secciones (Resumen · Experiencia · Formación · Habilidades) están **todas en scroll continuo**; un índice *sticky* arriba solo te lleva y marca la activa con scroll-spy. **Nunca** ocultes evidencia detrás de una pestaña en una pantalla de *verificación*.

**Vínculo criterio → evidencia.** Cada criterio y cada barra del gauge es clicable: al pulsar, salta a la sección del expediente y le da un *flash* amarillo de 1.5 s. Así el reclutador audita el veredicto contra el CV **sin cambiar de contexto**. Este es el gesto que convierte la vista de "informe estático" en "herramienta de auditoría".

---

## 09 · Conexión con el producto

**[PRODUCTO]** Estos tokens viven en `currify-front` (React + Tailwind). Mapeo de gesto → pantalla, alineado con los flujos de la arquitectura:

| Pantalla / ruta | Gesto dominante | Nota |
|---|---|---|
| `/` Landing | Serif hero + resaltado `.hl` + losa verde *una vez* | CTA → `/login?plan=free` o `?plan=pro` |
| `/login` | Losa verde con foto + cita | Preserva `?plan=` en OAuth state |
| `/onboarding`, `/checkout` | Losa verde / foco sin distracciones | Checkout omite navbar |
| `/dashboard` | Cards sobre papel; *una* card verde destacada | Métricas + cola de decisiones |
| Wizard *Nueva campaña* | Smart Fill = losa verde premium | Genera rúbrica en `currify-core` |
| Campaña · candidatos | Tabla sobre papel + drawer | Drawer = anillo + expediente |
| **Análisis IA** | **Gauge héroe + cita + expediente con índice** | Cruza CV (core) × rúbrica (campaña) |

**Nota técnica de robustez:** cuando uses Tailwind vía Play CDN, añade un *safety-net* de reglas `:where(html[data-theme="light"]) .bg-card{…}` etc., para que el modo claro no quede "blanco con líneas negras" si el CDN no genera alguna utilidad. Las clases `t-*` (`t-ink`, `t-card`, `t-line2`…) son ese respaldo y se aplican junto a las utilidades.

**Nota de datos:** los colores de tono (§01) deben derivarse del `match`/`score` que persiste `currify-back` tras el scoring de `currify-core`, no hardcodearse por candidato. Un mismo componente (anillo, barra, chip) lee el tono una vez y lo reusa.

---

## 10 · Reglas de oro (anti‑slop)

| [NO] | [SÍ] |
|---|---|
| Degradados violeta / rosa / índigo genéricos | Verde profundo + amarillo de marca, con propósito |
| Un recuadro alrededor de cada bloque | Recuadro solo como acento (3 casos) |
| Una tipografía para todo (Inter / Roboto / Arial) | Tres familias por función |
| Hero centrado "título + subtítulo + CTA" | Apertura característica con jerarquía |
| Losa verde en cada cabecera | Una por vista; cabeceras sobre papel |
| Párrafos enteros en MAYÚSCULAS | Mono en CAPS solo en etiquetas cortas |
| Sparkles / blobs / auroras decorativos | Metáforas del producto (malla = matching) |
| Repetir la misma info en 3 widgets | Un héroe + la evidencia anclada debajo |
| Tabs que ocultan evidencia en pantallas de revisión | Documento continuo + índice de anclas |

**[⚠] La regla madre:** el *slop* no es el color crema ni la serif; el *slop* es usar **cualquier cosa por inercia**. El crema de Evalen no es cliché porque tiene una lógica (informe editorial, verde escaso como marca, naranja como única acción). Rompe la lógica y cualquier paleta —incluso esta— se vuelve genérica.

---

## 11 · Checklist para una vista nueva

1. **[MANIFIESTO]** ¿Cuál es el **héroe único** de esta pantalla? Dale escala y silencio alrededor.
2. Asigna familia por rol: voz = Fraunces · dato = Sans · etiqueta = Mono.
3. Cuenta los recuadros: si pasan de 2–3, convierte el resto en documento fluido.
4. ¿Usas verde profundo? Que sea **una vez** y con motivo; si no, papel.
5. Color de estado por tono (good/mid/low); **acción solo en naranja** (una por vista).
6. Añade **un** gesto humano (resaltado o nota) y movimiento con feedback + `reduced-motion`.
7. Si hay veredicto + evidencia: una vista, dos ritmos, y **vínculo** entre ambos.
8. Pasa el filtro del §10: si algo está "porque sí", quítalo.

---

*Evalen · Sistema visual v1 · La IA lee, los humanos deciden.*
*Documento vivo: los tokens de §01–§02 son el contrato; el resto, la forma de usarlos con criterio.*