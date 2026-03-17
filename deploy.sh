#!/bin/bash

# ==========================================================
# Currify Production Deployment Script
# Usage: ./deploy.sh
# ==========================================================

echo "🚀 Iniciando despliegue de Currify en Producción..."

# 1. Validación del Entorno
if [ ! -f .env.production ]; then
    echo "❌ Error: No se encontró el archivo .env.production"
    echo "Asegúrate de crearlo basándote en el .env de tu proyecto."
    exit 1
fi

# 2. Actualización de Código
echo "📥 Descargando los últimos cambios de GitHub..."
git fetch origin
git reset --hard origin/main

echo "🔄 Copiando .env.production a .env para Docker Compose..."
cp .env.production .env

# 3. Limpieza y Detención de Servicios Previos
echo "🛑 Deteniendo contenedores actuales..."
docker compose down

# 4. Preparación de Base de Datos y Migraciones
echo "🔧 Levantando PostgreSQL..."
docker compose up -d postgres

echo "⏳ Esperando 10 segundos a que Postgres esté totalmente operativo..."
sleep 10

echo "🗄️ Ejecutando migraciones de Prisma en la base de datos..."
# Levantamos un contenedor temporal del backend solo para correr las migraciones
docker compose run --rm --no-deps currify-backend npx prisma migrate deploy

# 5. Construcción y Despliegue Final
echo "🏗️ Construyendo y levantando todos los servicios en segundo plano..."
# El flag --build asegura que lea los últimos cambios del código que acabamos de descargar
docker compose up -d --build --remove-orphans

# 6. Limpieza
echo "🧹 Limpiando imágenes huérfanas de Docker para liberar espacio..."
docker image prune -a -f

echo "✅ ¡Despliegue de Currify Completado de Forma Exitosa!"
echo "   Frontend (React):   http://localhost:3000"
echo "   Backend (NestJS):   http://localhost:3001"
echo "   Core API (FastAPI): http://localhost:8000"
