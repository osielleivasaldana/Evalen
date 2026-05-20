# **Documento de Diseño de Software (SDD): Refactorización de Navegación en Tarjetas de Campaña**

## **1\. Objetivo del Proyecto**

Mejorar la retención de usuarios y reducir la fricción ("fuga de usuarios" o drop-off) en el flujo principal (Happy Path) de los reclutadores dentro del sistema Evalen.

Actualmente, el acceso a los candidatos de una campaña está oculto en un menú secundario (kebab menu), lo que añade carga cognitiva y clics innecesarios. El objetivo es hacer que la navegación hacia los detalles de la campaña sea la acción primaria, intuitiva y de un solo clic.

## **2\. Alcance (Scope)**

Esta actualización afectará a las siguientes vistas del frontend (currify-front):

1. **Dashboard** (src/components/dashboard/): Widget de "Mis Campañas" o campañas recientes.  
2. **Listado de Campañas** (src/components/campaigns/): Vista completa donde se listan todas las ofertas activas e inactivas.

## **3\. Requisitos Funcionales y UI/UX**

### **3.1. Área de Interacción (Ley de Fitts)**

* **Requisito:** Toda la superficie de la tarjeta de la campaña debe actuar como un elemento interactivo que redirija a la vista de detalles de la campaña (CandidateProcessPanel.tsx o la ruta equivalente, ej. /campaigns/:id).  
* **UI/UX:** Al hacer hover sobre la tarjeta, el cursor debe cambiar a pointer y la tarjeta debe mostrar un ligero cambio de estado (ej. borde morado y sombra sutil hover:border-purple-400 hover:shadow-md).

### **3.2. Botón de Llamado a la Acción (CTA) Explícito**

* **Requisito:** Incorporar un botón en la parte inferior de la tarjeta con el texto "Gestionar {N} candidatos".  
* **UI/UX:** Este botón es visual, reforzando la acción principal. Al hacer hover sobre la tarjeta, este botón debe resaltar (ej. cambiar a un fondo sólido morado) mediante utilidades de grupo en Tailwind (group-hover).

### **3.3. Refactorización del Menú de Opciones (Kebab Menu)**

* **Requisito:** Eliminar la opción "Ver candidatos" del dropdown de 3 puntos.  
* **UI/UX:** El menú debe contener exclusivamente acciones secundarias de gestión o destructivas: "Editar campaña", "Copiar enlace" y "Eliminar".

### **3.4. Prevención de Eventos Anidados (Event Bubbling)**

* **Requisito (Crítico):** Los clics en acciones secundarias (Pausar, Menú de opciones, o cualquier ítem dentro del menú) **NO** deben disparar la navegación principal de la tarjeta.  
* **Técnica:** Se debe implementar e.stopPropagation() en todos los manejadores de eventos (onClick) de los botones secundarios.

## **4\. Arquitectura de Componentes (React/TypeScript)**

Para evitar duplicación de código, se creará/refactorizará un componente compartido.

### **4.1. Nuevo Componente Compartido**

* **Ruta Sugerida:** src/components/campaigns/shared/CampaignCard.tsx (o directorio UI genérico).  
* **Props (Interfaces TS):**  
  interface CampaignCardProps {  
    id: string;  
    title: string;  
    status: 'Activa' | 'Pausada' | 'Cerrada'; // U otro Enum  
    description: string;  
    candidatesCount: number;  
    createdAt: string; // ISO String o Formateado  
    onEdit?: (id: string) \=\> void;  
    onDelete?: (id: string) \=\> void;  
    onCopyLink?: (id: string) \=\> void;  
    onToggleStatus?: (id: string) \=\> void;  
  }

### **4.2. Lógica de Enrutamiento**

* Utilizar el hook useNavigate de react-router-dom para la redirección.  
  import { useNavigate } from 'react-router-dom';  
  // Dentro del componente  
  const navigate \= useNavigate();  
  const handleCardClick \= (e: React.MouseEvent) \=\> {  
     // Prevenir navegación si se hace clic en un botón interno  
     if ((e.target as HTMLElement).closest('button')) return;  
     navigate(\`/campaigns/${props.id}\`);  
  };

## **5\. Criterios de Aceptación (QA)**

* \[ \] **Caso 1:** El usuario hace clic en cualquier parte vacía de la tarjeta y es redirigido correctamente a la vista de la campaña.  
* \[ \] **Caso 2:** El usuario hace clic en el nuevo botón "Gestionar N candidatos" y es redirigido a la vista de la campaña.  
* \[ \] **Caso 3:** El usuario abre el menú de tres puntos (⋮). El menú se abre *sin* redirigir a la vista de la campaña.  
* \[ \] **Caso 4:** El usuario hace clic en el botón de pausa. La campaña cambia de estado *sin* redirigir a la vista de la campaña.  
* \[ \] **Caso 5:** El menú de tres puntos ya no contiene la opción "Ver candidatos".  
* \[ \] **Caso 6:** El diseño (Tailwind) es completamente responsivo; en pantallas móviles (sm), el botón CTA se ajusta al 100% del ancho (w-full).

## **6\. Consideraciones de Rendimiento**

Dado que la lista podría contener múltiples campañas, se recomienda memorizar el componente si la lista es extensa (React.memo), y asegurar que los iconos de lucide-react no estén causando re-renders innecesarios o sobrecarga en el DOM.