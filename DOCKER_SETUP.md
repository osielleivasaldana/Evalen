# Currify - Docker Setup

Este proyecto contiene todos los contenedores necesarios para ejecutar Currify con Docker.

## 🚀 Requisitos

- Docker (versión 20.10 o superior)
- Docker Compose (versión 2.0 o superior)
- Clave de API de Anthropic (para el servicio de AI)

## 📋 Configuración Inicial

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd Currify
   ```

2. **Configurar las variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Luego editar el archivo `.env` con tus propias credenciales:
   ```bash
   # Configurar al menos la clave de Anthropic
   ANTHROPIC_API_KEY=tu_clave_de_anthropic_aqui
   ```

## 🚀 Ejecución

### **Opción 1: Ejecutar todo el sistema**
```bash
docker-compose up --build
```

### **Opción 2: Ejecutar en modo detached (background)**
```bash
docker-compose up --build -d
```

## 🌐 Acceso a los servicios

Una vez que todos los contenedores estén arriba:

- **Frontend (React)**: http://localhost:3000
- **Backend (NestJS)**: http://localhost:3001
- **AI Core (FastAPI)**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🛠 Comandos útiles

### **Ver logs de todos los servicios**
```bash
docker-compose logs -f
```

### **Ver logs de un servicio específico**
```bash
docker-compose logs -f currify-backend
```

### **Ejecutar comandos en un contenedor**
```bash
docker-compose exec currify-backend bash
docker-compose exec currify-core bash
docker-compose exec postgres psql -U postgres
```

### **Reconstruir un servicio específico**
```bash
docker-compose build currify-backend
docker-compose up -d --no-deps --force-recreate currify-backend
```

### **Detener todos los servicios**
```bash
docker-compose down
```

### **Detener y eliminar volúmenes (datos persistentes)**
```bash
docker-compose down -v
```

### **Ejecutar migraciones de Prisma (después de iniciar la base de datos)**
```bash
docker-compose exec currify-backend npx prisma migrate dev
```

## 🔧 Troubleshooting

### **Problemas comunes**

1. **Puertos ocupados**: Asegúrate de que los puertos 3000, 3001, 5432, 6379 y 8000 estén disponibles.

2. **API de Anthropic**: Asegúrate de que la variable `ANTHROPIC_API_KEY` esté correctamente configurada.

3. **Errores de dependencias**: Si hay problemas con las dependencias, intenta reconstruir:
   ```bash
   docker-compose build --no-cache
   docker-compose up --build
   ```

4. **Acceso a la base de datos**: Verifica la conexión a PostgreSQL:
   ```bash
   docker-compose exec postgres psql -U postgres -c "SELECT version();"
   ```

### **Verificar estado de los servicios**
Todos los servicios tienen health checks configurados. Puedes ver el estado con:
```bash
docker-compose ps
```

## 🗂 Estructura del proyecto

```
Currify/
├── docker-compose.yml          # Configuración principal de Docker Compose
├── .env / .env.example         # Variables de entorno
├── init.sql                    # Script de inicialización de PostgreSQL
├── currify-back/               # Backend NestJS
│   ├── Dockerfile              # Imagen del backend
│   └── healthcheck.js          # Script de health check
├── currify-front/              # Frontend React
│   ├── Dockerfile              # Imagen del frontend
│   └── nginx.conf              # Configuración de nginx
└── currify-core/               # Servicio de AI FastAPI
    └── Dockerfile              # Imagen del servicio AI
```

## 🚀 Flujo de desarrollo

1. **Desarrollo local**: Para desarrollo puedes usar los contenedores de base de datos:
   ```bash
   # Solo correr PostgreSQL y Redis
   docker-compose up postgres redis
   ```
   
   Luego ejecutar el backend y frontend localmente con las variables de entorno correctas.

2. **Pruebas de integración**: Ejecutar todos los servicios para pruebas completas:
   ```bash
   docker-compose up --build
   ```

## 📊 Recursos

- **Documentación de Docker Compose**: https://docs.docker.com/compose/
- **Best practices**: Los contenedores siguen prácticas de seguridad y optimización
- **Health checks**: Todos los servicios tienen health checks configurados
- **Volumenes persistentes**: Los datos de PostgreSQL y Redis se mantienen entre reinicios

## ⚠️ Notas importantes

- **Producción**: Para uso en producción, se deben fortalecer las credenciales y considerar servicios externos para almacenamiento.
- **Recursos**: Asegúrate de tener suficiente memoria RAM (recomendado 8GB+) para todos los servicios.
- **API Keys**: Nunca commitees claves de API en el repositorio.
- **Volúmenes**: El volumen de PostgreSQL mantiene los datos entre reinicios de contenedor.