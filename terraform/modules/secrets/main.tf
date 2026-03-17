variable "project_id" {}
variable "db_url" {}
variable "google_api_key" {}

# Secreto: DATABASE_URL
resource "google_secret_manager_secret" "db_url" {
  secret_id = "DATABASE_URL"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_url_data" {
  secret      = google_secret_manager_secret.db_url.id
  secret_data = var.db_url
}

# Secreto: GOOGLE_API_KEY
resource "google_secret_manager_secret" "google_api" {
  secret_id = "GOOGLE_API_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "google_api_data" {
  secret      = google_secret_manager_secret.google_api.id
  secret_data = var.google_api_key
}

# Outputs para ser usados en Cloud Run
output "db_url_secret_id" {
  value = google_secret_manager_secret.db_url.secret_id
}

output "google_api_secret_id" {
  value = google_secret_manager_secret.google_api.secret_id
}
