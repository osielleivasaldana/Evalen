# **Documento de Diseño de Software (SDD)**

## **Módulo: Enrutamiento Dinámico Post-Autenticación (Free vs Pro V1)**

**Proyecto:** Evalen (Currify)

**Fecha:** Marzo 2026

**Autor:** Full Stack UI/UX Evalen Expert

## **1\. Visión General**

Este documento define la arquitectura y el comportamiento del sistema de enrutamiento frontend (currify-front) y su integración con el backend (currify-back) durante el proceso de registro y primer ingreso de un usuario. El objetivo es dirigir al usuario por dos flujos distintos (**Free** o **Pro V1**) dependiendo de la intención de compra originada en la *Landing Page*, minimizando la fricción y optimizando la tasa de conversión (evitando la "fuga de usuarios").

## **2\. Definición del Problema**

Cuando un usuario hace clic en los *Call to Action* (CTA) de la Landing Page, es redirigido a la vista de login con un parámetro de query: ?plan=free o ?plan=pro.

**El Problema Técnico:**

1. **Pérdida de Estado:** Durante el proceso de autenticación, especialmente si se utiliza Single Sign-On (Google OAuth2), el usuario es redirigido a un dominio externo y luego devuelto a nuestra aplicación (/auth/google/callback). Durante este "handshake", los parámetros de la URL original (?plan=...) se pierden.  
2. **Fricción de UX:** Si se pierde la intención original, el usuario que quería el plan "Pro" será enviado al flujo genérico (Free), obligándolo a buscar nuevamente la página de precios, lo que incrementa el *drop-off* (abandono).  
3. **Riesgo de Pagos Huérfanos:** Cobrar antes de crear la cuenta en la base de datos (PostgreSQL/Prisma) genera inconsistencias si el proceso falla a la mitad.

## **3\. Solución Arquitectónica (Full Stack)**

Para garantizar la continuidad cognitiva y técnica, implementaremos una **persistencia de intención de sesión** acoplada con enrutamiento condicional post-login.

### **3.1. Estrategia de Persistencia Frontend (React / SPA)**

1. Al montar el componente de Login (/login), un *hook* (useEffect o useSearchParams de React Router) leerá el parámetro plan.  
2. Este valor se inyectará inmediatamente en el sessionStorage (ej. clave: evalen\_pending\_plan). Usamos sessionStorage y no localStorage para que la intención expire si el usuario cierra la pestaña, evitando comportamientos anómalos en sesiones futuras.

### **3.2. Estrategia de Persistencia Backend (NestJS / OAuth)**

Para el login con Google, el endpoint en auth.controller.ts debe modificarse para aceptar el parámetro en la variable state del estándar OAuth2.

* El frontend llama a: GET /auth/google?state=pro  
* El backend pasa este state a Google. En el callback, el backend lee el state y lo adjunta en la redirección final hacia el frontend: Redirect frontend.com/dashboard?auth\_token=...\&plan=pro.

## **4\. Especificación de Flujos (User Journeys)**

### **Flujo A: Free (Exploración de Valor)**

* **Trigger:** URL http://localhost:3000/login?plan=free  
* **Paso 1:** Autenticación exitosa (se crea el usuario en DB).  
* **Paso 2:** El Router lee plan=free y dirige a /onboarding.  
* **Paso 3:** OnboardingWizard.tsx recolecta datos de la empresa. En el submit, el backend asigna créditos de cortesía al usuario.  
* **Paso 4:** Redirección a /dashboard. El usuario puede subir su primer CV y utilizar el currify-core sin fricción.

### **Flujo B: Pro V1 (Conversión de Alta Intención)**

* **Trigger:** URL http://localhost:3000/login?plan=pro  
* **Paso 1:** Autenticación exitosa. Se crea el registro del usuario (email capturado en Prisma).  
* **Paso 2:** El Router lee plan=pro y **omite el Onboarding**. Dirige a /billing.  
* **Paso 3:** Integración de Stripe Checkout. Se muestra el resumen de compra para el Plan Evalen Pro.  
* **Paso 4 (Éxito):** El webhook de Stripe (stripe.service.ts) notifica al backend. Se actualiza el Rol y los créditos a "Ilimitados". Redirección a /dashboard.  
* **Paso 4 (Abandono):** Si el usuario sale del checkout, queda como usuario registrado sin plan activo. Se activa una **Campaña de Recuperación (Email Transactional)**.

## **5\. Diagrama de Flujo (Mermaid)**

graph TD  
    %% Nodos de Inicio  
    L\_Free(\[Landing: Clic 'Comenzar Gratis'\]) \--\>|URL: ?plan=free| AuthPage  
    L\_Pro(\[Landing: Clic 'Obtener Pro'\]) \--\>|URL: ?plan=pro| AuthPage

    %% Manejo de Estado  
    subgraph Frontend: Manejo de Estado  
        AuthPage\[Vista de Autenticación /login\]  
        AuthPage \--\> SaveState\[Guardar 'plan' en SessionStorage / OAuth State\]  
    end

    %% Proceso de Auth  
    subgraph Backend: currify-back  
        SaveState \--\> AuthCore{Autenticación AuthGuard}  
        AuthCore \--\>|Crea Usuario en Prisma| CreateSession\[Generar JWT\]  
    end

    %% Enrutamiento Condicional  
    subgraph Frontend: Enrutamiento Dinámico  
        CreateSession \--\> RouterRead{Leer variable 'plan'}  
          
        %% Flujo Free  
        RouterRead \--\>|plan \== 'free'| Onboarding\[OnboardingWizard.tsx\]  
        Onboarding \--\> SetupDB\[Asignar Créditos Demo\]  
        SetupDB \--\> DashFree\[Dashboard\]  
          
        %% Flujo Pro  
        RouterRead \--\>|plan \== 'pro'| Billing\[Vista de Pagos /billing\]  
        Billing \--\> Stripe\[Stripe Checkout\]  
        Stripe \--\> CheckPay{¿Pago Exitoso?}  
          
        CheckPay \--\>|Sí| UpgradeDB\[Actualizar Permisos y Créditos a Pro\]  
        UpgradeDB \--\> DashPro\[Dashboard: IA Desbloqueada\]  
          
        CheckPay \--\>|No / Abandona| Recovery\[Queda como 'Free' \+ Gatilla Email de Recuperación\]  
    end

    %% Estilos para claridad visual  
    classDef freeFlow fill:\#e0f7fa,stroke:\#006064,stroke-width:2px;  
    classDef proFlow fill:\#fff8e1,stroke:\#ff6f00,stroke-width:2px;  
    classDef backend fill:\#eceff1,stroke:\#37474f,stroke-width:2px;  
      
    class L\_Free,Onboarding,SetupDB,DashFree freeFlow;  
    class L\_Pro,Billing,Stripe,UpgradeDB,DashPro proFlow;  
    class AuthCore,CreateSession backend;

## **6\. Archivos Impactados**

Para implementar esta lógica, los siguientes archivos del repositorio deberán ser actualizados:

1. currify-front/src/pages/Auth/Login.tsx (Lógica de useSearchParams y sessionStorage).  
2. currify-front/src/routes/AppRouter.tsx (Lógica de redirección condicional interceptando el estado del login).  
3. currify-back/src/auth/auth.controller.ts (Soporte para el parámetro state en endpoints de OAuth).  
4. currify-back/src/stripe/stripe.service.ts (Generación dinámica del link de checkout atado al userId recién creado).

*Fin del Documento de Especificación.*