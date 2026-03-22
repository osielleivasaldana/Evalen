# **Documento de Diseño de Software (SDD)**

## **Proyecto: Evalen \- Módulo de Gestión de Suscripción Pro**

**Fecha:** 20 de Marzo de 2026

**Autor:** Especialista UX/UI & Arquitecto de Software

## **1\. Introducción**

### **1.1 Propósito**

El propósito de este documento es definir la arquitectura, el flujo de usuario y los requisitos técnicos para la nueva experiencia de gestión de suscripciones de Evalen. El objetivo principal es reemplazar la visualización estática de la página de precios (/pricing) para los usuarios que ya poseen un plan Pro o están en período de prueba (Trial), ofreciéndoles un panel de control personalizado (/mi-plan o /dashboard/billing).

### **1.2 Alcance**

Este diseño abarca:

* La lógica de enrutamiento y redirección basada en el estado de la suscripción del usuario.  
* El diseño de componentes para la nueva vista "Mi Plan".  
* La integración de datos necesarios para mostrar el estado actual, métodos de pago y beneficios.  
* El manejo específico para usuarios en período de prueba (Trial).

## **2\. Lógica de Enrutamiento y Flujo de Usuario**

El sistema debe interceptar la navegación hacia la ruta pública de precios y evaluar el estado de la sesión actual.

### **2.1 Reglas de Redirección (Middleware / Route Guards)**

| Estado del Usuario | Acción al visitar /pricing | Destino / Vista Final | Racional |
| :---- | :---- | :---- | :---- |
| No Autenticado | Permitir acceso | /pricing (Página de marketing) | Adquisición de nuevos clientes. |
| Autenticado \- Plan Gratis | Permitir acceso | /pricing (Página de marketing) | Fomentar el *upgrade*. |
| Autenticado \- Plan Pro | **Redirigir** | /mi-plan (Dashboard de facturación) | Evitar confusión, mostrar valor actual y permitir gestión. |
| Autenticado \- Trial Pro | **Redirigir** | /mi-plan (Dashboard de facturación) | Mostrar valor actual, urgencia (días restantes) y CTA de *upgrade*. |

## **3\. Arquitectura de la Interfaz de Usuario (UI)**

La nueva página /mi-plan estará compuesta por los siguientes módulos (basados en el prototipo UX):

### **3.1 HeaderWelcome**

* **Descripción:** Saludo personalizado.  
* **Datos:** user.firstName.  
* **Estado:** Muestra "Te damos la bienvenida a tu Plan Pro" o "Disfrutando tu prueba de Evalen Pro".

### **3.2 BenefitsGrid (Módulo Principal Izquierdo)**

* **Descripción:** Reafirmación de la propuesta de valor. Muestra los límites o accesos actuales.  
* **Contenido Estático/Dinámico:** \* Búsqueda Avanzada de CVs.  
  * Matching Automatizado AI (mostrar cuota de uso si aplica).  
  * Generación de Campañas de RR.HH.  
  * Informes de Rendimiento.  
* **UX:** Uso de íconos claros y texto conciso.

### **3.3 SubscriptionManagement (Módulo Superior Derecho)**

* **Descripción:** Resumen operativo de la cuenta.  
* **Datos requeridos:** planName, renewalDate, paymentMethodMasked (ej. VISA terminada en 4567).  
* **Acciones (Botones):**  
  1. Ver Facturas (Redirige al portal del proveedor de pagos, ej. Stripe Customer Portal).  
  2. Modificar Método de Pago.  
  3. Cancelar Suscripción (Debe ser visible pero menos prominente, abriendo un modal de retención).

### **3.4 TrialStatusBanner (Condicional \- Solo para usuarios Trial)**

* **Descripción:** Módulo de urgencia para convertir la prueba en pago.  
* **Datos requeridos:** trialDaysLeft.  
* **Acciones:** Botón primario destacado \[ACTUALIZAR AHORA\] que abre el flujo de checkout.

### **3.5 UpsellSection (Módulo Inferior Derecho)**

* **Descripción:** Venta cruzada sutil para planes superiores (ej. Enterprise o agregar más asientos).  
* **Acciones:** \[VER MÁS PLANES\] que puede abrir un modal comparativo o redirigir a una vista específica de *upgrade* de cuenta.

## **4\. Modelos de Datos Requeridos**

El Frontend requerirá que el objeto de sesión del usuario (o un endpoint específico /api/billing/status) retorne la siguiente estructura de datos:

interface UserSubscription {  
  status: 'active' | 'trialing' | 'canceled' | 'past\_due' | 'free';  
  planId: 'pro\_monthly' | 'pro\_annual' | 'enterprise';  
  planName: string; // Ej: "Pro Anual"  
  currentPeriodEnd: string; // ISO Date para calcular la fecha de renovación o fin de trial  
  cancelAtPeriodEnd: boolean; // Para saber si ya canceló pero sigue activo hasta fin de mes  
  paymentMethod?: {  
    brand: string; // "visa", "mastercard"  
    last4: string; // "4567"  
  };  
  trial: {  
    isActive: boolean;  
    daysLeft: number;  
  };  
}

## **5\. Integración con Servicios Externos (Facturación)**

Se asume el uso de un proveedor como **Stripe**.

1. **Portal de Cliente (Customer Portal):** Para evitar construir interfaces complejas de gestión de tarjetas y facturas históricas, el botón \[Ver Facturas\] y \[Modificar Método de Pago\] debe generar una sesión de Stripe Customer Portal mediante una llamada al backend (POST /api/billing/customer-portal) y redirigir al usuario a esa URL segura.  
2. **Webhooks:** El backend debe estar escuchando eventos de Stripe (ej. customer.subscription.updated, invoice.payment\_succeeded) para mantener la base de datos de Evalen sincronizada con el estado real del usuario y actualizar la UI inmediatamente si el usuario hace un cambio en el portal.

## **6\. Resolución de Preguntas del Análisis Original**

Para dejar registro histórico de las decisiones tomadas respecto al análisis inicial:

1. **¿Qué debe ver un usuario Pro cuando visita /pricing?** Redirección directa a /mi-plan (Opción B/C híbrida). Ve sus beneficios y opciones de *manage*.  
2. **¿Debe haber una página separada o modificar PricingPage?** **Página separada** (/mi-plan). Modificar el /pricing general mezcla el código de adquisición (ventas) con el de retención (gestión). Es mejor separar las responsabilidades a nivel de código y diseño.  
3. **¿Qué acciones debe tener?** Ver estado, gestionar pago/facturas y un *upsell* sutil. "Cancelar" debe estar disponible por normativas, pero secundario.  
4. **¿Qué pasa con el Trial activo?** Sigue el mismo flujo que el Pro (redirección a /mi-plan), pero se activa el componente TrialStatusBanner priorizando el CTA de *Upgrade*.