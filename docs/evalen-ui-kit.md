# 🎨 Evalen UI Kit — Especificaciones Maestras de Diseño

> **Documento Maestro de Referencia Visual para Currify-Front**  
> Última actualización: Abril 2026  
> Estado: ✅ Activo — Fuente de la Verdad

---

## Tabla de Contenidos

1. [Paleta de Colores](#1-paleta-de-colores)
2. [Tipografía](#2-tipografía)
3. [Geometría](#3-geometría)
4. [Componentes Base](#4-componentes-base)
5. [Estados de Interacción y Carga](#5-estados-de-interacción-y-carga)
6. [Animaciones Personalizadas](#6-animaciones-personalizadas)
7. [Utilidades y Helpers](#7-utilidades-y-helpers)
8. [Dependencias UI Instaladas](#8-dependencias-ui-instaladas)

---

## 1. Paleta de Colores

El sistema de colores utiliza **variables CSS en formato HSL** (sin la función `hsl()`) para permitir composición dinámica con TailwindCSS. Esto permite usar opacidades nativas como `bg-primary/50`.

### 1.1 Modo Claro (`:root`)

| Variable CSS | Valor HSL | Color Aproximado | Clase Tailwind | Uso |
|---|---|---|---|---|
| `--background` | `0 0% 100%` | ⬜ Blanco puro | `bg-background` | Fondo principal de la app |
| `--foreground` | `222.2 84% 4.9%` | ⬛ Gris muy oscuro | `text-foreground` | Texto principal |
| `--card` | `0 0% 100%` | ⬜ Blanco | `bg-card` | Fondo de tarjetas |
| `--card-foreground` | `222.2 84% 4.9%` | ⬛ Gris oscuro | `text-card-foreground` | Texto en tarjetas |
| `--popover` | `0 0% 100%` | ⬜ Blanco | `bg-popover` | Fondo de popovers/dropdowns |
| `--popover-foreground` | `222.2 84% 4.9%` | ⬛ Gris oscuro | `text-popover-foreground` | Texto en popovers |
| `--primary` | `222.2 47.4% 11.2%` | 🔵 Azul marino oscuro | `bg-primary` | Botones principales, CTAs |
| `--primary-foreground` | `210 40% 98%` | ⬜ Blanco azulado | `text-primary-foreground` | Texto sobre primary |
| `--secondary` | `210 40% 96.1%` | 🔘 Gris claro | `bg-secondary` | Elementos secundarios |
| `--secondary-foreground` | `222.2 47.4% 11.2%` | ⬛ Gris oscuro | `text-secondary-foreground` | Texto sobre secondary |
| `--muted` | `210 40% 96.1%` | 🔘 Gris claro | `bg-muted` | Texto deshabilitado, fondos suaves |
| `--muted-foreground` | `215.4 16.3% 46.9%` | 🔘 Gris medio | `text-muted-foreground` | Texto secundario, descripciones |
| `--accent` | `210 40% 96.1%` | 🔘 Gris claro | `bg-accent` | Elementos de acento, hover states |
| `--accent-foreground` | `222.2 47.4% 11.2%` | ⬛ Gris oscuro | `text-accent-foreground` | Texto sobre accent |
| `--destructive` | `0 84.2% 60.2%` | 🔴 Rojo | `bg-destructive` | Acciones destructivas, errores |
| `--destructive-foreground` | `210 40% 98%` | ⬜ Blanco | `text-destructive-foreground` | Texto sobre destructive |
| `--border` | `214.3 31.8% 91.4%` | 🔘 Gris borde | `border-border` | Bordes de componentes |
| `--input` | `214.3 31.8% 91.4%` | 🔘 Gris input | `bg-input` | Fondo de inputs |
| `--ring` | `222.2 84% 4.9%` | ⬛ Gris oscuro | `ring-ring` | Anillo de focus |
| `--radius` | `0.5rem` | — | — | Radio base de bordes |

### 1.2 Modo Oscuro (`.dark`)

| Variable CSS | Valor HSL | Color Aproximado | Clase Tailwind | Uso |
|---|---|---|---|---|
| `--background` | `222.2 84% 4.9%` | ⬛ Azul muy oscuro | `bg-background` | Fondo principal |
| `--foreground` | `210 40% 98%` | ⬜ Blanco azulado | `text-foreground` | Texto principal |
| `--card` | `222.2 84% 4.9%` | ⬛ Azul oscuro | `bg-card` | Fondo de tarjetas |
| `--card-foreground` | `210 40% 98%` | ⬜ Blanco azulado | `text-card-foreground` | Texto en tarjetas |
| `--primary` | `217.2 91.2% 59.8%` | 🔵 Azul brillante | `bg-primary` | Botones principales |
| `--primary-foreground` | `222.2 47.4% 11.2%` | ⬛ Azul oscuro | `text-primary-foreground` | Texto sobre primary |
| `--secondary` | `217.2 32.6% 17.5%` | ⬛ Gris azulado | `bg-secondary` | Elementos secundarios |
| `--secondary-foreground` | `210 40% 98%` | ⬜ Blanco | `text-secondary-foreground` | Texto sobre secondary |
| `--muted` | `217.2 32.6% 17.5%` | ⬛ Gris oscuro | `bg-muted` | Fondos suaves |
| `--muted-foreground` | `215 20.2% 65.1%` | 🔘 Gris medio | `text-muted-foreground` | Texto secundario |
| `--accent` | `217.2 32.6% 17.5%` | ⬛ Gris azulado | `bg-accent` | Acentos |
| `--accent-foreground` | `210 40% 98%` | ⬜ Blanco | `text-accent-foreground` | Texto sobre accent |
| `--destructive` | `0 62.8% 30.6%` | 🔴 Rojo oscuro | `bg-destructive` | Errores |
| `--destructive-foreground` | `210 40% 98%` | ⬜ Blanco | `text-destructive-foreground` | Texto sobre destructive |
| `--border` | `217.2 32.6% 17.5%` | ⬛ Gris oscuro | `border-border` | Bordes |
| `--input` | `217.2 32.6% 17.5%` | ⬛ Gris oscuro | `bg-input` | Fondo de inputs |
| `--ring` | `224.3 76.3% 48%` | 🔵 Azul brillante | `ring-ring` | Anillo de focus |

### 1.3 Colores Adicionales (Hardcoded en Componentes)

> ⚠️ **Nota:** Los siguientes colores están hardcodeados en los componentes `Button` y `Badge`. Se recomienda migrarlos a variables CSS para consistencia con el sistema de temas.

| Color | Valor | Uso Actual | Recomendación |
|---|---|---|---|
| `blue-500` | `#3b82f6` | Botón default, Badge info | Migrar a `--primary` en light mode |
| `blue-600` | `#2563eb` | Hover botón default | Migrar a `--primary` con opacidad |
| `red-500` | `#ef4444` | Botón destructive, Badge destructive | ✅ Ya existe `--destructive` |
| `red-600` | `#dc2626` | Hover botón destructive | Migrar a `--destructive/90` |
| `green-500` | `#22c55e` | Botón success, Badge success | **Por definir** — crear `--success` |
| `green-600` | `#16a34a` | Hover botón success | **Por definir** — crear `--success/90` |
| `orange-500` | `#f97316` | Badge warning | **Por definir** — crear `--warning` |
| `gray-900` | `#111827` | Badge default | Migrar a `--foreground` |
| `gray-100` | `#f3f4f6` | Badge secondary | Migrar a `--muted` |
| `gray-300` | `#d1d5db` | Borde botón outline | Migrar a `--border` |
| `gray-500` | `#6b7280` | CardDescription | Migrar a `--muted-foreground` |
| `gray-950` | `#030712` | Badge outline | Migrar a `--foreground` |

### 1.4 Colores del Editor Tiptap (Hardcoded)

| Uso | Valor | Recomendación |
|---|---|---|
| Links | `#4f46e5` (indigo-600) | Usar `--primary` o `--accent` |
| Links hover | `#4338ca` (indigo-700) | Usar `--primary/80` |
| Placeholder | `#adb5bd` | Usar `--muted-foreground` |
| Bordes de tabla | `#e5e7eb` (gray-200) | Usar `--border` |
| Header de tabla | `#f3f4f6` (gray-100) | Usar `--muted` |
| Celda seleccionada | `#e0e7ff` (indigo-100) | Usar `--accent` |

---

## 2. Tipografía

### 2.1 Fuente Principal

| Propiedad | Valor |
|---|---|
| **Fuente configurada en Tailwind** | `Plus Jakarta Sans` (Google Fonts) |
| **Clase Tailwind** | `font-jakarta` |
| **Pesos importados** | 300, 400, 500, 600, 700, 800 |
| **Fuente fallback (body)** | `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif` |
| **Font smoothing** | `antialiased` (webkit), `grayscale` (moz) |

> ⚠️ **Nota:** La fuente `Plus Jakarta Sans` está configurada en `tailwind.config.js` pero el `body` usa system fonts como fallback. Se recomienda aplicar `font-jakarta` globalmente para consistencia.

### 2.2 Escala Tipográfica (Tailwind Default)

| Clase | Tamaño (rem) | Tamaño (px) | Uso Recomendado |
|---|---|---|---|
| `text-xs` | `0.75rem` | 12px | Labels, badges, metadata |
| `text-sm` | `0.875rem` | 14px | Descripciones, texto secundario |
| `text-base` | `1rem` | 16px | Cuerpo de texto, inputs |
| `text-lg` | `1.125rem` | 18px | Subtítulos, texto destacado |
| `text-xl` | `1.25rem` | 20px | Títulos de sección |
| `text-2xl` | `1.5rem` | 24px | CardTitle, títulos de modal |
| `text-3xl` | `1.875rem` | 30px | Títulos de página |
| `text-4xl` | `2.25rem` | 36px | Hero headings |

### 2.3 Pesos de Fuente en Uso

| Clase | Peso | Uso en Componentes |
|---|---|---|
| `font-normal` | 400 | Texto de cuerpo |
| `font-medium` | 500 | Labels, texto intermedio |
| `font-semibold` | 600 | **Botones**, CardTitle, Badge |
| `font-bold` | 700 | Títulos principales, headings |

### 2.4 Estilos del Editor Tiptap

| Elemento | Tamaño | Peso | Margen |
|---|---|---|---|
| `p` | default | normal | `0.5rem 0` |
| `h2` | `1.5rem` (24px) | bold | `1rem 0 0.5rem 0` |
| `h3` | `1.25rem` (20px) | bold | `0.75rem 0 0.5rem 0` |
| Listas | — | — | `padding-left: 1.5rem` |
| Imágenes | `max-width: 100%` | — | `border-radius: 0.5rem`, `margin: 0.5rem 0` |
| Tablas | `width: 100%` | — | `margin: 1rem 0` |

---

## 3. Geometría

### 3.1 Bordes Redondeados

| Clase Tailwind | Valor | Uso Recomendado |
|---|---|---|
| `rounded-sm` | `calc(var(--radius) - 4px)` = `0.125rem` (2px) | Inputs pequeños, elementos compactos |
| `rounded-md` | `calc(var(--radius) - 2px)` = `0.375rem` (6px) | **Botones** (default), inputs estándar |
| `rounded-lg` | `var(--radius)` = `0.5rem` (8px) | **Cards**, contenedores principales |
| `rounded-xl` | `0.75rem` (12px) | Modales, paneles grandes |
| `rounded-2xl` | `1rem` (16px) | Hero sections, contenedores destacados |
| `rounded-full` | `9999px` | **Badges**, avatares, pills |

### 3.2 Sombras

| Clase | Uso en Componentes | Descripción |
|---|---|---|
| `shadow-sm` | **Card** | Sombra sutil para tarjetas |
| `shadow` | — | Sombra estándar (no usada actualmente) |
| `shadow-md` | — | Sombra media (no usada actualmente) |
| `shadow-lg` | — | Sombra grande para modales/dropdowns |

> ⚠️ **Recomendación:** Definir sombras personalizadas en `tailwind.config.js` para consistencia con el diseño de la marca.

### 3.3 Espaciado Estándar

| Contexto | Patrón | Clases Tailwind |
|---|---|---|
| **Card padding** | `p-6` (24px) | `CardHeader`, `CardContent`, `CardFooter` |
| **Card spacing interno** | `space-y-1.5` (6px) | Entre elementos de `CardHeader` |
| **Button padding** | `px-4 py-2` (default) | Botón tamaño default |
| **Button gap** | `gap-2` (8px) | Entre icono y texto en botones |
| **Badge padding** | `px-2.5 py-0.5` | Badges |
| **Input gap** | `gap-2` | Entre label e input |
| **Section gap** | `gap-4` a `gap-8` | Entre secciones de layout |

### 3.4 Alturas de Componentes

| Componente | Altura | Clase |
|---|---|---|
| Button (sm) | `2.25rem` (36px) | `h-9` |
| Button (default) | `2.5rem` (40px) | `h-10` |
| Button (lg) | `2.75rem` (44px) | `h-11` |
| Button (icon) | `2.5rem × 2.5rem` | `h-10 w-10` |

---

## 4. Componentes Base

### 4.1 Botones (`Button`)

**Archivo:** `src/components/ui/button.tsx`

#### Variantes

| Variante | Clase Base | Hover | Uso |
|---|---|---|---|
| `default` | `bg-blue-500 text-white` | `hover:bg-blue-600` | Acción principal, CTA |
| `destructive` | `bg-red-500 text-white` | `hover:bg-red-600` | Eliminar, cancelar acción |
| `success` | `bg-green-500 text-white` | `hover:bg-green-600` | Confirmar, aprobar, éxito |
| `outline` | `border border-gray-300 bg-transparent` | `hover:bg-gray-100` | Acción secundaria con borde |
| `ghost` | `bg-transparent` | `hover:bg-gray-100` | Acciones en toolbar, navbar |
| `link` | `text-blue-500 underline-offset-4` | `hover:underline` | Enlaces de texto |

#### Tamaños

| Tamaño | Altura | Padding | Uso |
|---|---|---|---|
| `sm` | `h-9` (36px) | `px-3` | Acciones compactas, tablas |
| `default` | `h-10` (40px) | `px-4 py-2` | Uso general |
| `lg` | `h-11` (44px) | `px-8` | CTAs principales, hero |
| `icon` | `h-10 w-10` | — | Botones solo con icono |

#### Estructura Base

```tsx
<Button variant="default" size="default">
  <Icon className="w-4 h-4" />
  Texto del botón
</Button>
```

#### Estados

| Estado | Comportamiento |
|---|---|
| `disabled` | `pointer-events-none opacity-50` |
| `focus-visible` | `outline-none ring-2 ring-offset-2` |

#### Ejemplos de Uso

```tsx
// Botón principal
<Button variant="default">Publicar Campaña</Button>

// Botón destructivo
<Button variant="destructive">Eliminar Candidato</Button>

// Botón de éxito
<Button variant="success">Aprobar Candidato</Button>

// Botón outline
<Button variant="outline">Ver Detalles</Button>

// Botón ghost (navbar)
<Button variant="ghost" size="icon">
  <SettingsIcon className="w-4 h-4" />
</Button>

// Botón link
<Button variant="link">¿Olvidaste tu contraseña?</Button>
```

---

### 4.2 Cards (`Card`)

**Archivo:** `src/components/ui/card.tsx`

#### Estructura Completa

```tsx
<Card>
  <CardHeader>
    <CardTitle>Título de la Tarjeta</CardTitle>
    <CardDescription>Descripción breve del contenido.</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Contenido principal */}
  </CardContent>
  <CardFooter>
    {/* Acciones, botones */}
  </CardFooter>
</Card>
```

#### Especificaciones por Sub-componente

| Componente | Clases Base | Padding | Tipografía |
|---|---|---|---|
| `Card` | `rounded-lg border border-gray-200 bg-white shadow-sm` | — | `text-gray-950` |
| `CardHeader` | `flex flex-col space-y-1.5` | `p-6` | — |
| `CardTitle` | `text-2xl font-semibold leading-none tracking-tight` | — | Heading h3 |
| `CardDescription` | `text-sm text-gray-500` | — | Descripción |
| `CardContent` | — | `p-6 pt-0` | Contenido |
| `CardFooter` | `flex items-center` | `p-6 pt-0` | Acciones |

#### Ejemplo de Uso

```tsx
<Card>
  <CardHeader>
    <CardTitle>Candidatos Activos</CardTitle>
    <CardDescription>Resumen de candidatos en proceso</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-4xl font-bold">142</p>
  </CardContent>
  <CardFooter className="justify-between">
    <Button variant="outline">Ver Todos</Button>
    <Button variant="default">Añadir</Button>
  </CardFooter>
</Card>
```

> ⚠️ **Nota:** Los colores están hardcodeados (`border-gray-200`, `bg-white`, `text-gray-950`, `text-gray-500`). Se recomienda migrar a variables CSS (`border-border`, `bg-card`, `text-card-foreground`, `text-muted-foreground`).

---

### 4.3 Badges (`Badge`)

**Archivo:** `src/components/ui/badge.tsx`

#### Variantes

| Variante | Fondo | Texto | Uso |
|---|---|---|---|
| `default` | `bg-gray-900` | `text-gray-50` | Estado genérico |
| `secondary` | `bg-gray-100` | `text-gray-900` | Categoría, tag |
| `destructive` | `bg-red-500` | `text-white` | Error, rechazado |
| `success` | `bg-green-500` | `text-white` | Aprobado, completado |
| `warning` | `bg-orange-500` | `text-white` | Pendiente, en revisión |
| `info` | `bg-blue-500` | `text-white` | Información, nuevo |
| `outline` | `border` (heredada) | `text-gray-950` | Estado neutral con borde |

#### Estructura Base

```tsx
<Badge variant="success">Aprobado</Badge>
```

#### Especificaciones

| Propiedad | Valor |
|---|---|
| Border radius | `rounded-full` |
| Padding | `px-2.5 py-0.5` |
| Tipografía | `text-xs font-semibold` |
| Display | `inline-flex items-center` |
| Focus | `focus:ring-2 focus:ring-offset-2` |

#### Ejemplos de Uso

```tsx
// Estado de candidato
<Badge variant="success">Contratado</Badge>
<Badge variant="warning">En Entrevista</Badge>
<Badge variant="destructive">Rechazado</Badge>
<Badge variant="info">Nuevo</Badge>

// Categoría
<Badge variant="secondary">React</Badge>
<Badge variant="secondary">TypeScript</Badge>
```

---

### 4.4 Inputs (Por Definir — Recomendación)

> ⚠️ **Estado:** No existe componente `Input` en `src/components/ui/`. Se recomienda crearlo siguiendo el patrón shadcn/ui.

#### Estructura Recomendada

```tsx
// src/components/ui/input.tsx
import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

#### Estructura de Formulario Recomendada

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Correo Electrónico</Label>
  <Input
    id="email"
    type="email"
    placeholder="nombre@empresa.com"
    error={errors.email}
  />
  {errors.email && (
    <p className="text-sm text-destructive">{errors.email}</p>
  )}
</div>
```

---

### 4.5 Modals / Dialogs (Por Definir — Recomendación)

> ⚠️ **Estado:** No existe componente `Dialog` en `src/components/ui/`. El proyecto usa `@headlessui/react` para modales. Se recomienda crear un wrapper con el patrón shadcn/ui.

#### Estructura Recomendada (con @headlessui/react)

```tsx
// src/components/ui/dialog.tsx
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { cn } from '../../lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Dialog({ open, onClose, children }: DialogProps) {
  return (
    <Transition.Root show={open} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <HeadlessDialog.Panel
                className={cn(
                  "relative w-full max-w-lg rounded-xl bg-background p-6 shadow-lg",
                  "transform transition-all"
                )}
              >
                {children}
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition.Root>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <HeadlessDialog.Title className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <HeadlessDialog.Description className={cn("text-sm text-muted-foreground", className)} {...props} />
}
```

#### Ejemplo de Uso

```tsx
<Dialog open={isOpen} onClose={() => setIsOpen(false)}>
  <DialogHeader>
    <DialogTitle>Subir CV</DialogTitle>
    <DialogDescription>
      Arrastra el archivo del candidato o haz clic para seleccionar.
    </DialogDescription>
  </DialogHeader>
  <div className="py-4">
    {/* Contenido del modal */}
    <FileUpload />
  </div>
  <div className="flex justify-end gap-2">
    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
    <Button variant="default">Subir</Button>
  </div>
</Dialog>
```

---

## 5. Estados de Interacción y Carga

### 5.1 Estados de Focus

| Estado | Clases | Componente |
|---|---|---|
| Focus visible (botones) | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2` | `Button` |
| Focus visible (badges) | `focus:outline-none focus:ring-2 focus:ring-offset-2` | `Badge` |
| Focus (inputs recomendado) | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` | `Input` (recomendado) |

### 5.2 Estados de Hover

| Componente | Variante | Clase Hover |
|---|---|---|
| Button | default | `hover:bg-blue-600` |
| Button | destructive | `hover:bg-red-600` |
| Button | success | `hover:bg-green-600` |
| Button | outline | `hover:bg-gray-100` |
| Button | ghost | `hover:bg-gray-100` |
| Button | link | `hover:underline` |

### 5.3 Estados Disabled

| Propiedad | Valor |
|---|---|
| Cursor | `pointer-events-none` |
| Opacidad | `opacity-50` |

### 5.4 Skeletons (Por Definir — Recomendación)

> ⚠️ **Estado:** No existe componente `Skeleton`. Se recomienda crearlo para feedback de carga.

#### Estructura Recomendada

```tsx
// src/components/ui/skeleton.tsx
import { cn } from "../../lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

#### Ejemplos de Uso

```tsx
// Skeleton de Card
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-20 w-full" />
  </CardContent>
</Card>

// Skeleton de lista
<div className="space-y-3">
  {Array.from({ length: 5 }).map((_, i) => (
    <Skeleton key={i} className="h-12 w-full" />
  ))}
</div>

// Skeleton de avatar
<Skeleton className="h-10 w-10 rounded-full" />
```

### 5.5 Spinners / Loaders (Por Definir — Recomendación)

> ⚠️ **Estado:** No existe componente `Spinner`. Se recomienda crearlo.

#### Estructura Recomendada

```tsx
// src/components/ui/spinner.tsx
import { cn } from "../../lib/utils"

interface SpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-muted border-t-primary",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Cargando..."
    />
  )
}

export { Spinner }
```

#### Ejemplos de Uso

```tsx
// Spinner simple
<Spinner />

// Spinner con mensaje
<div className="flex flex-col items-center gap-2">
  <Spinner size="lg" />
  <p className="text-sm text-muted-foreground animate-pulse">
    Analizando habilidades...
  </p>
</div>

// Spinner inline en botón
<Button disabled>
  <Spinner size="sm" />
  Procesando...
</Button>
```

### 5.6 Estados de Error en Formularios

#### Patrón Recomendado

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Correo Electrónico</Label>
  <Input
    id="email"
    type="email"
    placeholder="nombre@empresa.com"
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? "email-error" : undefined}
    className={errors.email && "border-destructive focus-visible:ring-destructive"}
  />
  {errors.email && (
    <p id="email-error" className="text-sm text-destructive flex items-center gap-1" role="alert">
      <AlertCircle className="h-4 w-4" />
      {errors.email}
    </p>
  )}
</div>
```

---

## 6. Animaciones Personalizadas

### 6.1 Animaciones Definidas en `index.css`

| Clase | Duración | Easing | Descripción |
|---|---|---|---|
| `animate-slide-up` | `0.3s` | `ease-out` | Slide up con fade-in (usada en modals/toasts) |
| `animate-gradient-xy` | `15s` | `ease infinite` | Gradiente animado (hero backgrounds) |

### 6.2 Animaciones de Tailwind Disponibles

| Clase | Descripción |
|---|---|
| `animate-spin` | Rotación continua (spinners) |
| `animate-ping` | Pulso expansivo (notificaciones) |
| `animate-pulse` | Parpadeo suave (skeletons) |
| `animate-bounce` | Rebote (indicadores de scroll) |

### 6.3 Keyframes Disponibles

```css
/* slideUp — Para modals, toasts, dropdowns */
@keyframes slideUp {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}

/* gradient-xy — Para hero backgrounds */
@keyframes gradient-xy {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
```

---

## 7. Utilidades y Helpers

### 7.1 Función `cn()` (Class Merge)

**Archivo:** `src/lib/utils.ts`

```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Uso:** Combinar clases condicionales con resolución de conflictos de Tailwind.

```tsx
className={cn(
  "clases-base",
  condicion && "clase-condicional",
  props.className
)}
```

### 7.2 Modo Oscuro

| Propiedad | Valor |
|---|---|
| Estrategia | `class` (se activa añadiendo `.dark` al elemento padre) |
| Contexto | `src/contexts/ThemeContext.tsx` |
| Toggle | Debe añadir/remover la clase `dark` en `<html>` o `<body>` |

### 7.3 Checkout Mode

> Clase especial definida en `index.css` que oculta la navegación durante el proceso de pago.

```css
body.checkout-mode .nav-links,
body.checkout-mode .navbar-actions,
body.checkout-mode nav > div:not(:first-child) {
  display: none !important;
}
```

**Uso:** Añadir `checkout-mode` al `<body>` durante el flujo de pago.

---

## 8. Dependencias UI Instaladas

### 8.1 Core UI

| Dependencia | Versión | Uso |
|---|---|---|
| `react` | `^19.1.1` | Framework de UI |
| `react-dom` | `^19.1.1` | Renderizado DOM |
| `react-router-dom` | `^7.9.3` | Enrutamiento |
| `tailwindcss` | `^3.4.18` | Framework de CSS |
| `clsx` | `^2.1.1` | Combinación condicional de clases |
| `tailwind-merge` | `^3.3.1` | Resolución de conflictos de clases Tailwind |

### 8.2 Componentes y Librerías UI

| Dependencia | Versión | Uso |
|---|---|---|
| `@headlessui/react` | `^2.2.9` | Componentes accesibles sin estilo (Dialog, Menu, etc.) |
| `@heroicons/react` | `^2.2.0` | Iconos (Heroicons v2) |
| `react-dropzone` | `^14.3.8` | Drag & drop para subida de archivos |

### 8.3 Editor de Texto Rico

| Dependencia | Versión | Uso |
|---|---|---|
| `@tiptap/react` | `^3.6.5` | Editor WYSIWYG |
| `@tiptap/starter-kit` | `^3.6.5` | Extensiones base de Tiptap |
| `@tiptap/extension-image` | `^3.6.5` | Soporte de imágenes |
| `@tiptap/extension-link` | `^3.6.5` | Soporte de enlaces |
| `@tiptap/extension-table` | `^3.6.5` | Tablas |
| `@tiptap/extension-table-cell` | `^3.6.5` | Celdas de tabla |
| `@tiptap/extension-table-header` | `^3.6.5` | Headers de tabla |
| `@tiptap/extension-table-row` | `^3.6.5` | Filas de tabla |
| `@tiptap/extension-text-align` | `^3.6.5` | Alineación de texto |

### 8.4 Mapas y Geolocalización

| Dependencia | Versión | Uso |
|---|---|---|
| `mapbox-gl` | `^3.16.0` | Mapas interactivos |
| `@mapbox/mapbox-gl-geocoder` | `^5.1.2` | Autocompletado de direcciones |

### 8.5 Utilidades

| Dependencia | Versión | Uso |
|---|---|---|
| `axios` | `^1.12.2` | Cliente HTTP con interceptores |
| `dompurify` | `^3.3.0` | Sanitización de HTML |
| `ajv` | `^8.17.1` | Validación de JSON Schema |
| `ajv-keywords` | `^5.1.0` | Keywords adicionales para AJV |

### 8.6 Componentes Faltantes (Recomendación de Creación)

| Componente | Prioridad | Dependencia Sugerida |
|---|---|---|
| `Input` | 🔴 Alta | Nativo + Tailwind |
| `Label` | 🔴 Alta | Nativo + Tailwind |
| `Dialog` | 🔴 Alta | `@headlessui/react` (ya instalado) |
| `Skeleton` | 🟡 Media | Nativo + `animate-pulse` |
| `Spinner` | 🟡 Media | Nativo + `animate-spin` |
| `Textarea` | 🟡 Media | Nativo + Tailwind |
| `Select` | 🟡 Media | `@headlessui/react` |
| `Toast` | 🟡 Media | `@headlessui/react` o librería dedicada |
| `Table` | 🟢 Baja | Nativo + Tailwind |
| `Avatar` | 🟢 Baja | Nativo + Tailwind |
| `Tabs` | 🟢 Baja | `@headlessui/react` |
| `DropdownMenu` | 🟢 Baja | `@headlessui/react` |
| `Switch` | 🟢 Baja | `@headlessui/react` |
| `Checkbox` | 🟢 Baja | `@headlessui/react` |
| `Progress` | 🟢 Baja | Nativo + Tailwind |
| `Separator` | 🟢 Baja | Nativo + Tailwind |

---

## 📋 Resumen de Acciones Recomendadas

| # | Acción | Prioridad | Impacto |
|---|---|---|---|
| 1 | Migrar colores hardcodeados en `Button` y `Card` a variables CSS | 🔴 Alta | Consistencia de temas |
| 2 | Crear componente `Input` con soporte de errores | 🔴 Alta | Formularios consistentes |
| 3 | Crear componente `Skeleton` | 🟡 Media | Feedback de carga |
| 4 | Crear componente `Spinner` | 🟡 Media | Feedback de carga |
| 5 | Crear componente `Dialog` wrapper de HeadlessUI | 🟡 Media | Modales consistentes |
| 6 | Crear variables CSS para `--success` y `--warning` | 🟡 Media | Soporte para variantes success/warning |
| 7 | Aplicar `font-jakarta` globalmente al body | 🟢 Baja | Consistencia tipográfica |
| 8 | Definir sombras personalizadas en `tailwind.config.js` | 🟢 Baja | Profundidad visual consistente |

---

> **Mantenimiento:** Este documento debe actualizarse cada vez que se añadan nuevos componentes UI, se modifiquen variables CSS o se cambien las directrices de diseño.
> 
> **Responsable:** Frontend Tech Lead — Evalen (currify-front)
