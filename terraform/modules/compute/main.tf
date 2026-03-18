variable "project_id" {}
variable "region" {}
variable "db_url_secret_id" {}
variable "google_api_secret_id" {}

# ===============================================
# Service Account para Cloud Run
# ===============================================
resource "google_service_account" "cloudrun_sa" {
  account_id   = "currify-cloudrun-sa"
  display_name = "Currify Cloud Run Service Account"
}

# Otorgar permisos a la SA para acceder a los secretos
resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# ===============================================
# 1. Cloud Run: Core (FastAPI)
# ===============================================
resource "google_cloud_run_v2_service" "core" {
  name     = "currify-core"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloudrun_sa.email
    
    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello" # Placeholder temporal hasta el primer CI/CD
      
      env {
        name = "GOOGLE_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.google_api_secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "API_SECRET_KEY"
        value = "17adb908927887e60b6f9108415facd42f3c8b8e69498df9d36e5b72c497316d"
      }

      env {
        name  = "ALLOWED_ORIGINS"
        value = "http://localhost:3000,http://localhost:8080,http://localhost:5173"
      }
      
      env {
        name  = "ENVIRONMENT"
        value = "production"
      }
    }
    
    scaling {
      min_instance_count = 0  # Escala a 0 en reposo
      max_instance_count = 5
    }
  }

  depends_on = [google_project_iam_member.secret_accessor]
}

# Permitir acceso público no autenticado al core (o configuraremos IAM después)
resource "google_cloud_run_service_iam_member" "public_core" {
  location = var.region
  service  = google_cloud_run_v2_service.core.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ===============================================
# 2. Cloud Run Job: Prisma Migrate
# ===============================================
resource "google_cloud_run_v2_job" "prisma_migrate" {
  name     = "currify-prisma-migrate"
  location = var.region

  template {
    template {
      service_account = google_service_account.cloudrun_sa.email

      containers {
        image = "us-docker.pkg.dev/cloudrun/container/hello" # Reemplazaremos por la imagen del backend
        command = ["npx", "prisma", "migrate", "deploy"]
        
        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = var.db_url_secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  depends_on = [google_project_iam_member.secret_accessor]
}
