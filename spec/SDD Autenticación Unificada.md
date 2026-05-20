# **Documento de Diseño de Software (SDD)**

## **Módulo: Flujo de Autenticación Unificada (Unified Auth) & Onboarding**

**Proyecto:** Evalen (Currify)

**Fecha:** Marzo 2026

**Autor:** Full Stack UI/UX Evalen Expert

## **1\. Visión General y Propósito**

El presente documento detalla la implementación del nuevo flujo de Autenticación Unificada para la plataforma Evalen.

**Problema a resolver:** El flujo anterior presentaba una desconexión cognitiva (disonancia) al redirigir usuarios desde llamados a la acción de "Comienza gratis" hacia pantallas de "Login" estáticas. Además, el panel lateral repetía textos de marketing, causando "fatiga de onboarding", y solicitaba demasiada información (ej. Nombre de Empresa) en el primer paso, incrementando la fricción y las tasas de abandono (drop-off).

**Solución:** Implementar un patrón de **Divulgación Progresiva (Progressive Disclosure)** mediante una única vista de entrada ("Unified Auth"). El sistema determinará dinámicamente si el usuario debe iniciar sesión o registrarse basándose en su correo electrónico, trasladando la recolección de datos secundarios (como la Empresa) a un asistente de configuración (Onboarding) posterior a la creación de la cuenta.

## **2\. Experiencia de Usuario (UX) y Flujo Lógico**

El componente actuará como una Máquina de Estados Finitos (FSM) con 4 estados principales (step):

1. **initial (Punto de Entrada):**  
   * Muestra el botón primario de SSO (Google Auth).  
   * Muestra un input único para el Email Corporativo.  
   * **Acción:** Al enviar el email, el frontend consulta al backend (endpoint /auth/check-email).  
2. **login (Usuario Existente):**  
   * Si el backend responde que el email *existe*, la UI transita a esta vista.  
   * Saluda al usuario ("¡Bienvenido de nuevo\!") y muestra su email (bloqueado).  
   * Pide únicamente la Contraseña.  
   * Incluye botón de "¿Olvidaste tu contraseña?".  
3. **signup (Usuario Nuevo):**  
   * Si el backend responde que el email *no existe*, la UI transita a esta vista.  
   * Indica que se está creando una cuenta para el email ingresado.  
   * Pide Nombre Completo y la creación de una Contraseña.  
   * **Transición:** Al enviar, se crea el usuario en base de datos e inmediatamente pasa al estado onboarding.  
4. **onboarding (Configuración de Cuenta):**  
   * Paso final exclusivo para nuevos registros.  
   * Saluda al usuario por su primer nombre.  
   * Solicita el Nombre de la Empresa.  
   * **Transición:** Finaliza el flujo y redirige al Dashboard principal.

## **3\. Especificaciones de Interfaz de Usuario (UI)**

Para alinear el componente con el rediseño interno de Evalen (luminoso y mágico), se abandonan los tonos oscuros/marinos en favor de una paleta vibrante basada en violetas y blancos.

### **3.1. Layout General (Split-Screen)**

* **Contenedor Principal:** min-h-screen flex w-full font-sans bg-white text-slate-800.  
* **Panel Izquierdo (Roadmap):** Oculto en móviles (hidden lg:flex w-1/2).  
* **Panel Derecho (Formularios):** Centrado (w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12).

### **3.2. Panel Izquierdo (Roadmap de Onboarding)**

* **Fondo:** Gradiente lineal de morado a azul claro.  
  * Clase Tailwind: bg-gradient-to-br from-\[\#7E3AF2\] to-\[\#5C60F5\].  
* **Decoración:** Efectos "Glassmorphism" con círculos difuminados (blur-\[120px\] bg-white/15) y un grid SVG sutil (opacity-10).  
* **Contenido:** \* Logo en versión blanco/violeta (bg-white text-\[\#7E3AF2\]).  
  * Título claro: "Configura tu espacio de reclutamiento ✨".  
  * Lista de 3 pasos (Acceso, Campaña, Magia IA) utilizando iconos numéricos con fondos translúcidos (bg-white/20 backdrop-blur-sm border border-white/30).  
  * Footer de seguridad con el icono de candado (Lock).

### **3.3. Panel Derecho y Formularios**

* **Color de Acento:** Todo el branding de botones e inputs activos debe usar Violeta-600.  
  * Bordes activos: focus:ring-violet-600.  
  * Botones primarios: bg-violet-600 hover:bg-violet-700.  
* **Inputs:**  
  * Estilo: py-3 pl-10 pr-3 border border-slate-200 rounded-xl.  
  * Iconos de Lucide React en color text-slate-400 (Mail, Lock, User, Building2) posicionados absolutamente a la izquierda.  
* **Botón de Google (SSO):**  
  * Debe ser el elemento más prominente en el paso initial.  
  * Estilo: Fondo blanco, borde sutil (bg-white border-slate-200 hover:bg-slate-50), logo SVG original de Google a color.  
* **Animaciones:**  
  * Transición de Initial a Login/Signup: Animación de entrada lateral.  
    * @keyframes fadeInRight { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }  
  * Transición a Onboarding: Animación de entrada hacia arriba.  
    * @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

## **4\. Arquitectura Frontend (currify-front)**

### **4.1. Componente React (EvalenAuth.tsx)**

El componente debe construirse gestionando el estado local de la siguiente manera:

import React, { useState } from 'react';

type AuthStep \= 'initial' | 'login' | 'signup' | 'onboarding';

export const EvalenAuth: React.FC \= () \=\> {  
  const \[step, setStep\] \= useState\<AuthStep\>('initial');  
  const \[isLoading, setIsLoading\] \= useState\<boolean\>(false);  
  const \[email, setEmail\] \= useState\<string\>('');  
  const \[password, setPassword\] \= useState\<string\>('');  
  const \[name, setName\] \= useState\<string\>('');  
  const \[company, setCompany\] \= useState\<string\>('');

  // ... manejadores de eventos (handlers)  
}

### **4.2. Integración con API (Axios/Fetch)**

* **Verificación de Email (handleEmailSubmit):**  
  Llamar a GET /auth/check-email?email={email}. Si retorna exists: true, setStep('login'), de lo contrario setStep('signup').  
* **Registro (handleAuthSubmit en modo signup):**  
  Llamar a POST /auth/register con payload { email, password, name }. Al recibir token 200 OK, setStep('onboarding').  
* **Onboarding (handleOnboardingSubmit):**  
  Llamar a PATCH /users/me/company (o endpoint similar) con payload { companyName: company }. Redirigir usando react-router-dom a /dashboard.

## **5\. Requisitos de Backend (currify-back / NestJS)**

Para soportar este flujo sin fisuras, el módulo de autenticación de NestJS debe exponer y/o adaptar los siguientes endpoints:

### **5.1. Nuevo Endpoint: Verificación de Existencia**

* **Ruta:** GET /auth/check-email  
* **Query Params:** ?email=usuario@empresa.com  
* **Lógica:** Realizar un findUnique en Prisma por email.  
* **Respuesta (JSON):**  
  * Si existe: { "exists": true, "authProvider": "local" | "google" }  
  * Si no existe: { "exists": false }  
* *Nota de Seguridad:* Aplicar un **Rate Limiter** estricto a este endpoint (ej. max 5 peticiones por IP por minuto) para evitar ataques de enumeración de correos.

### **5.2. Adaptación del Registro (POST /auth/register)**

* **Cambio en Prisma (schema.prisma):**  
  El campo companyId o companyName en la tabla User **debe ser opcional (?)** a nivel de base de datos.  
* **Lógica:** Permitir crear un usuario enviando únicamente email, password y name. El usuario se creará en un estado "incompleto" hasta que termine el Onboarding.

### **5.3. Adaptación SSO Google (/auth/google/callback)**

La estrategia de Passport.js para Google debe identificar si el usuario es nuevo (isNewUser).

Si el usuario se crea mediante Google por primera vez, el backend debe añadir una "bandera" (flag) en el JWT de retorno o en la cookie, para que el Frontend (React) sepa que debe redirigir a /onboarding en lugar de /dashboard y pedirle el nombre de la empresa.

## **6\. Edge Cases (Casos Extremos) y Manejo de Errores**

1. **Abandono en Onboarding:** Si el usuario se registra pero cierra el navegador en el paso onboarding, su cuenta existe pero sin empresa. El Frontend debe detectar esto en futuros inicios de sesión (comprobando si user.companyId es null) y forzar la pantalla de Onboarding antes de dejarlo usar el Dashboard.  
2. **Usuario existe vía Google pero intenta Login manual:** Si el usuario se registró con Google y luego intenta ingresar contraseña, la API debe devolver un error amigable indicando: *"Creaste esta cuenta usando Google. Por favor, usa el botón de Google para ingresar"*.  
3. **Prevención de doble clic:** Todos los botones de submit deben tener disabled={isLoading} y mostrar un spinner (ej. \<Loader2 className="animate-spin" /\>) para prevenir el envío múltiple de peticiones.