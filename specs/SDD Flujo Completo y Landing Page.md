# **Documento de Diseño de Software (SDD)**

## **Proyecto: Evalen \- Flujo Global e Integración de Landing Page**

**Fecha:** 22 de Marzo de 2026

**Autor:** Arquitecto de Software & Product Manager

## **1\. Introducción**

### **1.1 Propósito**

Este documento amplía el alcance del diseño de la plataforma Evalen para incluir la experiencia de "Top of Funnel" (ToFu). Define la arquitectura de navegación completa, detallando cómo los usuarios transicionan desde la **Landing Page** pública hacia la aplicación principal, interactuando con los módulos de autenticación, uso del producto (extracción de CVs, matching) y gestión de suscripciones.

### **1.2 Alcance**

* Estructura y objetivos de la Landing Page (/).  
* Matriz de enrutamiento global y *Route Guards* (Middleware).  
* Flujos de conversión (Visitante \-\> Usuario Gratis \-\> Usuario Pro).  
* Interacción entre el sitio de marketing y la aplicación web (SPA/Dashboard).

## **2\. Arquitectura del Flujo Global de Usuario**

El flujo de Evalen se divide conceptualmente en dos áreas: **Public Site** (Marketing/Ventas) y **App Site** (Plataforma/SaaS).

### **2.1 Mapa del Sitio de Alto Nivel**

1. **/ (Landing Page):** Página de inicio, propuesta de valor, captación de leads.  
2. **/pricing (Página de Precios Pública):** Explicación de planes (Gratis, Pro, Enterprise).  
3. **/auth (Login/Registro):** Puerta de entrada a la plataforma.  
4. **/dashboard (App Principal):** Área de trabajo de recursos humanos (CVs, Campañas, Matches).  
5. **/mi-plan (Gestión de Suscripción):** Portal cautivo para usuarios que ya poseen un plan de pago o Trial (definido en el SDD anterior).

## **3\. Lógica de Enrutamiento y Middleware (Actualizada)**

Para garantizar una experiencia fluida, el sistema de enrutamiento (ej. React Router, Next.js Middleware) debe evaluar el estado de autenticación (isAuth) y el estado de la suscripción (planStatus) en cada cambio de ruta.

| **Ruta Origen** | **Estado del Usuario** | **Redirección / Acción** | **Racional UX** | | **/ (Landing)** | Visitante (No Auth) | Renderizar Landing Page | Captación estándar. | | **/ (Landing)** | Autenticado (Cualquier plan) | Redirigir a /dashboard | Si ya está logueado, llevarlo directo a su área de trabajo. El Header de la Landing también puede cambiar a "Ir al Dashboard". | | **/pricing** | Visitante / Gratis | Renderizar /pricing | Mostrar opciones de compra. | | **/pricing** | Autenticado (Pro/Trial) | Redirigir a /mi-plan | Evitar confusión, mostrar beneficios actuales (Ref: *SDD \- Módulo de Gestión de Suscripción*). | | **/auth** | Autenticado | Redirigir a /dashboard | Prevenir doble login. | | **/dashboard** | Visitante (No Auth) | Redirigir a /auth | Proteger rutas privadas. |

## **4\. Estructura de la Landing Page (/)**

La Landing Page debe estar optimizada para la conversión, enfocada en los dolores de los reclutadores (tiempo perdido leyendo CVs, dificultad para encontrar el match perfecto).

### **4.1 Componentes Principales**

1. **Hero Section (Header):**  
   * **Título Fuerte:** ej. "Automatiza la lectura de CVs y encuentra el talento ideal en segundos."  
   * **Subtítulo:** Mención a la IA (Evalen) para el matching de candidatos.  
   * **CTA Principal:** \[Comenzar Gratis\] (Lleva a /auth/register).  
   * **Visual:** Un dashboard o animación breve mostrando un CV transformándose en datos estructurados.  
2. **Sección "Cómo Funciona" (Features Core):**  
   * Extracción de datos de CVs (Parsing).  
   * Creación de Campañas de RR.HH.  
   * Sistema de *Matching* Automatizado con IA.  
3. **Sección de Beneficios (Social Proof & Metrics):**  
   * "Ahorra un 70% del tiempo en la pre-selección".  
   * Testimonios de reclutadores o logos de empresas (si aplica).  
4. **Pricing Teaser (Precios Resumidos):**  
   * Muestra las opciones principales y un botón \[Ver todos los planes\] que lleva a /pricing.  
5. **Footer:**  
   * Enlaces legales, soporte, contacto.

## **5\. Flujos de Conversión Principales**

En un sistema SaaS como Evalen, existen dos flujos "Happy Path" principales dependiendo de dónde el usuario toma la decisión de compra:

### **5.1 Flujo A: Estrategia Freemium / Product-Led (De Gratis a Pago)**

*Es el flujo donde el usuario decide probar el valor de la plataforma antes de comprometerse con un pago.*

1. **Descubrimiento:** El usuario llega a la Landing Page (/).  
2. **Registro:** Hace clic en \[Comenzar Gratis\] y crea su cuenta en /auth/register.  
3. **Onboarding & Uso:** Entra a /dashboard con un plan Free. Configura su perfil, crea su primera campaña y sube sus primeros CVs.  
4. **Fricción/Upsell:** Intenta procesar más CVs de los permitidos por el plan gratuito o usar herramientas de IA avanzadas. La app muestra un Paywall o Modal de Upsell que lo dirige a /pricing para hacer un upgrade.  
5. **Conversión:** Elige el "Plan Pro" y completa el pago.  
6. **Retención/Gestión:** En el futuro, cuando quiera revisar qué incluye su plan, hace clic en "Ver Planes". El sistema detecta que es Pro y lo redirige elegantemente a /mi-plan para reafirmar su valor y permitirle gestionar sus facturas.

### **5.2 Flujo B: Compra Directa (Desde Landing/Pricing Público)**

*Es el flujo para el usuario con alta intención de compra que elige un plan de pago directamente desde el sitio público.*

1. **Selección:** El visitante (no autenticado) evalúa los planes en /pricing y hace clic en \[Comprar Plan Pro\].  
2. **Creación de Cuenta:** Es redirigido a /auth/register. *Nota técnica: El frontend debe almacenar la intención de compra del usuario (ej. ?plan=pro en la URL o en LocalStorage) para mantener el contexto.*  
3. **Checkout:** Inmediatamente después de crear la cuenta, es redirigido automáticamente a la pasarela de pago (ej. Stripe Checkout) para concretar la suscripción.  
4. **Onboarding:** Tras el pago exitoso, completa la configuración inicial (perfil de empresa).  
5. **Dashboard Pro:** Aterriza en el /dashboard con todos los beneficios y límites del Plan Pro desbloqueados desde el primer uso.