# **SDD: Evalen Smart Fill Engine**

**Estado:** Propuesta Técnica

**Versión:** 1.0

**Responsable:** Full Stack UI/UX Evalen Expert

## **1\. Resumen Ejecutivo**

El **Smart Fill Engine** es una funcionalidad de asistencia proactiva integrada en el flujo de creación de campañas de Evalen. Utiliza modelos de lenguaje extensos (LLM) alojados en el currify-core para transformar una entrada mínima del usuario (ej. Título del puesto) en un borrador completo y estructurado de una oferta laboral, optimizando la posterior rúbrica de scoring.

## **2\. Objetivos de Diseño**

1. **Reducción de Fricción:** Eliminar el "miedo a la página en blanco" para los reclutadores.  
2. **Consistencia Semántica:** Asegurar que la descripción del cargo esté alineada con los estándares que el motor de scoring utiliza para evaluar CVs.  
3. **Velocidad:** Completar el Paso 1 y Paso 2 del formulario en menos de 30 segundos.  
4. **Adaptabilidad:** Diseño "Mobile-First" para permitir la creación de campañas desde dispositivos táctiles con mínimo teclado.

## **3\. Arquitectura y Componentes**

### **3.1. Frontend (currify-front)**

* **Action Trigger:** Botón "Smart Fill" (con icono de IA/Destello) ubicado en el Paso 1\.  
* **State Management:** Implementación de un hook de carga (isGenerating) para bloquear inputs durante la inferencia.  
* **Hydration Logic:** Función que mapea la respuesta JSON del backend a los estados del formulario de React (vía react-hook-form o similar).

### **3.2. Backend Orquestador (currify-back)**

* **Endpoint:** POST /api/v1/campaigns/generate-draft  
* **Middleware de Créditos:** Validación proactiva en PostgreSQL para confirmar que el userId tiene cuota disponible para una operación de IA.  
* **Proxy Seguro:** Comunicación con el currify-core mediante mTLS o API Keys internas.

### **3.3. Motor de IA (currify-core)**

* **FastAPI Endpoint:** /api/ai/smart-fill  
* **Prompt Engineering:** Uso de SystemMessage para definir el rol: *"Actúa como un experto en HR Tech y genera una oferta de empleo profesional siguiendo este esquema JSON..."*.  
* **Validation:** Uso de **Pydantic Models** para garantizar que el LLM no devuelva texto libre, sino una estructura de datos válida.

## **4\. Contrato de Datos (API Schema)**

### **4.1. Request (Frontend \-\> Backend)**

{  
  "jobTitle": "Desarrollador Full Stack Senior",  
  "additionalContext": "Experiencia en NestJS y React, trabajo 100% remoto.",  
  "language": "es"  
}

### **4.2. Response (Core \-\> Backend \-\> Frontend)**

{  
  "fields": {  
    "title": "Desarrollador Full Stack Senior",  
    "description": "Buscamos un ingeniero apasionado por la escalabilidad...",  
    "requirements": \["5+ años en Node.js", "Experiencia con React", "Arquitectura Microservicios"\],  
    "modality": "Remote",  
    "duration": "Indefinite",  
    "salary\_range": { "min": 3500000, "max": 5000000, "currency": "CLP" }  
  },  
  "suggested\_rubric\_weights": {  
    "technical\_skills": 0.6,  
    "experience": 0.3,  
    "education": 0.1  
  }  
}

## **5\. Flujo de Usuario y UX**

1. **Ingreso de Semilla:** El usuario escribe el nombre del cargo.  
2. **Invocación:** Al hacer clic en "Smart Fill", los campos de entrada muestran un estado de *Skeleton Loading* animado.  
3. **Visualización Progresiva:** (Opcional) Los campos se van completando con un efecto de "máquina de escribir" para reforzar la percepción de asistencia de IA.  
4. **Validación Humana:** El usuario revisa y edita cualquier detalle. El flujo de "fuga de usuarios" se mitiga permitiendo que el usuario ignore la sugerencia en cualquier momento.

## **6\. Estrategia de Responsividad**

Para asegurar que este flujo funcione en cualquier dispositivo:

* **Desktop:** El botón "Smart Fill" aparece a la derecha del input de título.  
* **Mobile:** El botón se transforma en un "Floating Action Button" (FAB) o una barra de acción sobre el teclado para fácil acceso con el pulgar.  
* **Colapsables:** En pantallas pequeñas, la descripción generada se muestra inicialmente colapsada con un botón de "Ver más" para no romper el scroll.

## **7\. Consideraciones Técnicas de Implementación**

* **Retry Logic:** En caso de error del LLM (timeout), el backend debe reintentar hasta 3 veces con backoff exponencial.  
* **Privacidad:** Ningún dato personal del reclutador es enviado al LLM, solo metadatos del puesto de trabajo.  
* **Caché:** Si dos usuarios buscan el mismo cargo exacto, el currify-back puede servir una respuesta cacheada en Redis para ahorrar costos de tokens.

*Fin del documento.*