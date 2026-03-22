# Software Design Document (SDD) - Evalen Landing Page

## 1. Visión General
Este documento define la estructura, el diseño y el contenido de la Landing Page principal de **Evalen**. El objetivo de esta página es actuar como el principal embudo de conversión (funnel) para captar nuevos usuarios, comunicar el valor del producto (Product-Led Growth) y redirigir al flujo de registro/login.

## 2. Especificaciones de Enrutamiento (Routing)
* **Ruta:** `/` (Raíz del dominio).
* **Estado de Protección:** **PÚBLICA (No protegida)**. 
* **Comportamiento:** Cualquier usuario de internet puede acceder a esta ruta sin necesidad de autenticación (sin token).
* **Redirecciones:** * Los botones de "Comenzar gratis" o "Elegir plan" redirigen a `/signup` o `/login`.
    * Si un usuario ya autenticado (con token válido) visita `/`, debe ser redirigido automáticamente al dashboard (`/dashboard`).

## 3. Estructura de la Landing Page (Componentes Modernos SaaS)

La página estará dividida en las siguientes secciones secuenciales, optimizadas para la conversión:

### 3.1. Navigation Bar (Sticky)
* **Logo:** Evalen (Izquierda).
* **Enlaces de anclaje:** Beneficios, Cómo funciona, Precios.
* **Acciones (Derecha):** Botón fantasma (Ghost) "Iniciar Sesión" y Botón principal (Solid) "Comenzar Gratis".

### 3.2. Hero Section (El primer impacto)
* **Etiqueta superior (Badge):** 🚀 "La nueva era del reclutamiento con IA"
* **Título Principal (H1):** "Reclutamiento inteligente en segundos, no en semanas."
* **Subtítulo (H2):** "Automatiza la extracción de datos de CVs, crea campañas al instante y encuentra al candidato ideal con la magia de la Inteligencia Artificial. Sin fricción, listo para usar."
* **Llamado a la acción (CTA):** Botón grande "Crear mi primera campaña gratis" (Redirige al signup).
* **Visual:** Un mockup o animación del Dashboard interactivo (mostrando la zona de "Arrastra un CV" y el botón de EvalenPro).

### 3.3. Social Proof (Confianza)
* **Frase:** "Empresas innovadoras ya optimizan su talento con Evalen."
* **Elementos:** Logos en escala de grises de empresas ficticias/reales o métricas clave (ej. "+10,000 CVs procesados").

### 3.4. Features / Beneficios (¿Por qué Evalen?)
Diseño en cuadrícula (Grid) o Zig-Zag (Texto a un lado, imagen al otro).
1.  **Lectura de CVs con IA:** "Olvídate de leer currículums uno por uno. Nuestra IA extrae las habilidades, experiencia y datos clave en tiempo real."
2.  **Campañas en Automático:** "Selecciona el área (Ventas, Tecnología, etc.) y deja que Evalen estructure la campaña por ti."
3.  **Smart Match:** "Algoritmos avanzados que comparan los requerimientos de tu oferta con el perfil del candidato, mostrándote el porcentaje de compatibilidad exacto."

### 3.5. Cómo Funciona (Paso a Paso)
* **Paso 1:** Regístrate y cuéntanos sobre tu empresa.
* **Paso 2:** Arrastra un CV o elige un área de especialidad.
* **Paso 3:** ¡Comienza la magia! Evalen crea la campaña y evalúa al candidato.

### 3.6. Pricing (Transparencia)
Sección crucial antes del registro. Tarjetas de precios claras.

* **Plan Starter (Gratis para siempre)**
    * *Ideal para probar la magia.*
    * Precio: $0 / mes.
    * Incluye: 1 Campaña activa, procesamiento de hasta 15 CVs/mes, extracción básica de datos.
    * CTA: "Comenzar Gratis"
* **Plan EvalenPro (Recomendado) 🌟**
    * *Para equipos de RRHH que buscan escalar.*
    * Precio: $49 / mes (ejemplo).
    * Incluye: Campañas ilimitadas, procesamiento ilimitado de CVs, Smart Match avanzado, exportación de reportes.
    * CTA: "Probar EvalenPro"
* **Plan Enterprise**
    * *Para grandes corporativos.*
    * Precio: Personalizado.
    * Incluye: SSO, API de integración, soporte prioritario, onboarding personalizado.
    * CTA: "Contactar Ventas"

### 3.7. Footer
* Logo de Evalen.
* Enlaces legales (Términos y condiciones, Privacidad).
* Enlaces de soporte y contacto.

---

## 4. Frases Comerciales (Copywriting Extra)
* *"Deja el trabajo operativo a la IA y enfócate en lo humano."*
* *"Tu próximo gran talento, a un 'Drag & Drop' de distancia."*
* *"Sube un CV. Nosotros hacemos el resto."*
* *"De la vacante a la contratación, sin estrés."*

---

## 5. Diseño y Estilos (UI/UX)

La Landing Page debe compartir el mismo Sistema de Diseño (Design System) que el Dashboard para mantener consistencia visual. 

### 5.1. Esquema de Colores
* **Color Primario (Acentos y Botones Principales):** Un tono vibrante que denote tecnología y profesionalismo (ej. Azul Eléctrico o Índigo `#4F46E5`). Este es el color del botón "EvalenPro" y "Comenzar la magia".
* **Textos:** Gris carbón (`#1F2937`) para modo claro, Gris claro (`#F3F4F6`) para modo oscuro.
* **Fondos de Tarjetas (Cards):** Blanco (`#FFFFFF`) en modo claro, Gris oscuro (`#1F2937` o `#111827`) en modo oscuro.
* **Color de Éxito / Match:** Verde esmeralda (`#10B981`) para porcentajes de compatibilidad altos.

### 5.2. Modo Claro y Modo Oscuro (Theme Toggle)
La Landing Page implementará soporte nativo para *Dark Mode* y *Light Mode*.
* **Comportamiento por defecto:** Respetar la preferencia del sistema operativo del usuario (`prefers-color-scheme`).
* **Control Manual:** Un botón en el Navigation Bar (ícono de Sol/Luna) que permita cambiar el tema manualmente y guarde la preferencia en `localStorage`.
* **Transiciones:** Animaciones suaves (`transition-colors duration-300`) en los fondos y textos al cambiar de modo para evitar parpadeos bruscos.