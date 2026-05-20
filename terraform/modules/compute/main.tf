variable "project_id" {}
variable "region" {}
variable "db_url_secret_id" {}
variable "google_api_secret_id" {}
variable "google_client_id_secret_id" {}
variable "google_client_secret_secret_id" {}
variable "stripe_secret_key_secret_id" {}
variable "stripe_price_id_pro_secret_id" {}
variable "cv_bucket_name" {}

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

# Otorgar permisos a la SA para leer/escribir en el bucket de GCS
resource "google_storage_bucket_iam_member" "bucket_accessor" {
  bucket = var.cv_bucket_name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloudrun_sa.email}"
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
        name  = "ADMIN_USERNAME"
        value = "kinich"
      }

      env {
        name  = "ADMIN_PASSWORD"
        value = "kinich!"
      }

      env {
        name  = "ALLOWED_ORIGINS"
        value = "https://currify-frontend-4yfulzoska-uc.a.run.app,http://localhost:3000,http://localhost:8080,http://localhost:5173"
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

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
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

# ===============================================
# 3. Cloud Run: Backend (NestJS)
# ===============================================
resource "google_cloud_run_v2_service" "backend" {
  name     = "currify-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloudrun_sa.email

    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.db_url_secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "GOOGLE_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = var.google_client_id_secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "GOOGLE_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.google_client_secret_secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "STRIPE_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = var.stripe_secret_key_secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "STRIPE_PRICE_ID_PRO"
        value_source {
          secret_key_ref {
            secret  = var.stripe_price_id_pro_secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "SCORING_SERVICE_URL"
        value = google_cloud_run_v2_service.core.uri
      }

      env {
        name  = "SCORING_SERVICE_USERNAME"
        value = "kinich"
      }

      env {
        name  = "SCORING_SERVICE_PASSWORD"
        value = "kinich!"
      }

      env {
        name  = "JWT_SECRET"
        value = "evalen-jwt-secreto-temporal-123"
      }
      
      env {
        name  = "STORAGE_TYPE"
        value = "gcs"
      }
      
      env {
        name  = "GCS_BUCKET_NAME"
        value = var.cv_bucket_name
      }
      
      env {
        name  = "FRONTEND_URL"
        value = "https://currify-frontend-4yfulzoska-uc.a.run.app" 
      }

      env {
        name  = "GOOGLE_CALLBACK_URL"
        value = "https://currify-backend-4yfulzoska-uc.a.run.app/api/auth/google/callback" 
      }

      env {
        name  = "ALLOWED_ORIGINS"
        value = "https://currify-frontend-4yfulzoska-uc.a.run.app,http://localhost:3000"
      }

      env {
        name  = "PAYMENT_GATEWAY"
        value = "mercadopago"
      }

      env {
        name  = "MERCADOPAGO_ACCESS_TOKEN"
        value = "TEST-4289580756248676-052011-231abbb301eb4a706240c23bbd2044f3-31737893"
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
  }

  depends_on = [google_project_iam_member.secret_accessor]
}

resource "google_cloud_run_service_iam_member" "public_backend" {
  location = var.region
  service  = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ===============================================
# 4. Cloud Run: Frontend (React)
# ===============================================
resource "google_cloud_run_v2_service" "frontend" {
  name     = "currify-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloudrun_sa.email

    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
  }

  depends_on = [google_project_iam_member.secret_accessor]
}

resource "google_cloud_run_service_iam_member" "public_frontend" {
  location = var.region
  service  = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
