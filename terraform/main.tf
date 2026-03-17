# ==============================================================================
# CURRIFY - INFRASTRUCTURE ENTRYPOINT
# ==============================================================================

# 1. Habilitar APIs necesarias en GCP
module "project_services" {
  source                      = "terraform-google-modules/project-factory/google//modules/project_services"
  version                     = "~> 14.0"
  project_id                  = var.project_id
  disable_services_on_destroy = false
  
  activate_apis = [
    "run.googleapis.com",              # Para Cloud Run Services y Jobs
    "secretmanager.googleapis.com",    # Para gestión de secretos
    "artifactregistry.googleapis.com", # Para almacenar imágenes Docker
    "cloudbuild.googleapis.com",       # (Opcional) Si en el futuro usamos Cloud Build
    "iam.googleapis.com",              # Gestión de identidades
    "compute.googleapis.com"           # Redes y conectividad
  ]
}

# 2. Artifact Registry para nuestras imágenes Docker
resource "google_artifact_registry_repository" "currify_repo" {
  provider      = google-beta
  location      = var.region
  repository_id = "currify-repo"
  description   = "Repositorio Docker para imágenes de Currify (front, back, core)"
  format        = "DOCKER"
  depends_on    = [module.project_services]
}

# 3. Módulo Secret Manager (IAM y valores de secretos)
module "secrets" {
  source     = "./modules/secrets"
  project_id = var.project_id
  db_url     = var.db_url
  anthropic_api_key = var.google_api_key
  depends_on = [module.project_services]
}

# 4. Módulo Compute (Cloud Run)
module "compute" {
  source     = "./modules/compute"
  project_id = var.project_id
  region     = var.region
  
  # Secretos referenciados
  db_url_secret_id         = module.secrets.db_url_secret_id
  anthropic_api_secret_id  = module.secrets.google_api_secret_id
  
  # Dependemos de que el repositorio exista
  depends_on = [google_artifact_registry_repository.currify_repo, module.secrets]
}
