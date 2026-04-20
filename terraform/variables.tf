variable "project_id" {
  description = "El ID del proyecto de Google Cloud (ej. mi-proyecto-123)"
  type        = string
}

variable "region" {
  description = "La región principal donde desplegar (ej. us-central1, southamerica-east1)"
  type        = string
  default     = "us-central1"
}

variable "db_url" {
  description = "La cadena de conexión a NeonDB"
  type        = string
  sensitive   = true
}

variable "google_api_key" {
  description = "Google API Key para modelo Gemini"
  type        = string
  sensitive   = true
}

# Añadiremos el resto de los secretos manejados vía Secret Manager más adelante

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe Secret Key"
  type        = string
  sensitive   = true
  default     = "dummy"
}

variable "stripe_price_id_pro" {
  description = "Stripe Price ID for PRO plan"
  type        = string
  default     = ""
}

variable "gcs_cv_bucket_name" {
  description = "Nombre del bucket GCS para almacenar CVs"
  type        = string
  default     = ""
}
