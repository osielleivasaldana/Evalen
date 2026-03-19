variable "project_id" {}
variable "db_url" {}
variable "google_api_key" {}
variable "google_client_id" {}
variable "google_client_secret" {}
variable "stripe_secret_key" {}
variable "stripe_price_id_pro" {}

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

# Secreto: GOOGLE_CLIENT_ID
resource "google_secret_manager_secret" "google_client_id" {
  secret_id = "GOOGLE_CLIENT_ID"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "google_client_id_data" {
  secret      = google_secret_manager_secret.google_client_id.id
  secret_data = var.google_client_id
}

# Secreto: GOOGLE_CLIENT_SECRET
resource "google_secret_manager_secret" "google_client_secret" {
  secret_id = "GOOGLE_CLIENT_SECRET"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "google_client_secret_data" {
  secret      = google_secret_manager_secret.google_client_secret.id
  secret_data = var.google_client_secret
}

# Secreto: STRIPE_SECRET_KEY
resource "google_secret_manager_secret" "stripe_secret_key" {
  secret_id = "STRIPE_SECRET_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "stripe_secret_key_data" {
  secret      = google_secret_manager_secret.stripe_secret_key.id
  secret_data = var.stripe_secret_key
}

# Secreto: STRIPE_PRICE_ID_PRO
resource "google_secret_manager_secret" "stripe_price_id_pro" {
  secret_id = "STRIPE_PRICE_ID_PRO"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "stripe_price_id_pro_data" {
  secret      = google_secret_manager_secret.stripe_price_id_pro.id
  secret_data = var.stripe_price_id_pro
}

# Outputs para ser usados en Cloud Run
output "db_url_secret_id" {
  value = google_secret_manager_secret.db_url.secret_id
}

output "google_api_secret_id" {
  value = google_secret_manager_secret.google_api.secret_id
}

output "google_client_id_secret_id" {
  value = google_secret_manager_secret.google_client_id.secret_id
}

output "google_client_secret_secret_id" {
  value = google_secret_manager_secret.google_client_secret.secret_id
}

output "stripe_secret_key_secret_id" {
  value = google_secret_manager_secret.stripe_secret_key.secret_id
}

output "stripe_price_id_pro_secret_id" {
  value = google_secret_manager_secret.stripe_price_id_pro.secret_id
}
