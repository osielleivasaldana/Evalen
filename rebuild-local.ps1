# Rebuild Local Environment and Create Super Admin
# This script is designed to run locally on Windows using PowerShell.

$VerbosePreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   RECONSTRUCCIÓN DE ENTORNO LOCAL Y CREACIÓN SUPERADMIN   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Stop and remove existing containers, networks, and volumes
Write-Host "`n[1/4] Deteniendo contenedores y eliminando volumenes antiguos (Borrando toda la data)..." -ForegroundColor Yellow
docker compose down -v --remove-orphans

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al detener los contenedores." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Contenedores y volumenes eliminados correctamente." -ForegroundColor Green

# 2. Build and start all containers in the background
Write-Host "`n[2/4] Reconstruyendo y levantando contenedores (modo --build)..." -ForegroundColor Yellow
docker compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al levantar contenedores." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Contenedores iniciados en segundo plano." -ForegroundColor Green

# 3. Wait for the backend container to be healthy
Write-Host "`n[3/4] Esperando a que el backend ('currify-backend') esté saludable (HEALTHY)..." -ForegroundColor Yellow
$container = "currify-backend"
$timeout = 180 # 3 minutos
$elapsed = 0
$interval = 5
$isHealthy = $false

while ($elapsed -lt $timeout) {
    $status = docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $container 2>$null
    if ($null -ne $status) {
        $status = $status.Trim()
        Write-Host "[Verbose] Estado de $($container): $status (transcurrido: $($elapsed)s)" -ForegroundColor DarkGray
        if ($status -eq "healthy") {
            $isHealthy = $true
            break
        }
    } else {
        Write-Host "[Verbose] Esperando inicio del contenedor $($container)..." -ForegroundColor DarkGray
    }
    Start-Sleep -Seconds $interval
    $elapsed += $interval
}

if (-not $isHealthy) {
    Write-Host "`n[ERROR] El backend no logró alcanzar el estado 'healthy' tras $timeout segundos." -ForegroundColor Red
    Write-Host "Mostrando últimos 20 logs de 'currify-backend' para depuración:" -ForegroundColor Red
    docker logs --tail 20 currify-backend
    exit 1
}

Write-Host "[OK] El backend está en estado SALUDABLE." -ForegroundColor Green

# 4. Run database migrations inside the backend container
Write-Host "`n[4/4] Ejecutando todas las migraciones de Prisma..." -ForegroundColor Yellow
docker compose exec -T currify-backend npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al ejecutar las migraciones de base de datos." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Migraciones aplicadas con éxito." -ForegroundColor Green

# 5. Create/Promote Super Admin User
Write-Host "`n[+] Configurando el usuario Super Admin..." -ForegroundColor Yellow
docker compose exec -T currify-backend node create-owner.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al configurar el Super Admin." -ForegroundColor Red
    exit 1
}

# 6. Final verification and checklist display
Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   CHECKLIST DE ACCIONES REALIZADAS CON EXITO             " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  [OK] Contenedores detenidos y volumenes removidos (data eliminada)." -ForegroundColor Green
Write-Host "  [OK] Contenedores reconstruidos y levantados con exito." -ForegroundColor Green
Write-Host "  [OK] Espera de salud de backend completada exitosamente." -ForegroundColor Green
Write-Host "  [OK] Migraciones de Prisma aplicadas a la nueva base de datos." -ForegroundColor Green
Write-Host "  [OK] Usuario Super Admin (OWNER) creado/actualizado en la DB." -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "  CREDENCIALES DE ACCESO DEL SUPER ADMIN:" -ForegroundColor Yellow
Write-Host "  Email:      osielnet@gmail.com" -ForegroundColor Cyan
Write-Host "  Password:   SuperAdmin2026!" -ForegroundColor Cyan
Write-Host "  Rol:        OWNER (Super Admin / Propietario)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
