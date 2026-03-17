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

variable "anthropic_api_key" {
  description = "Anthropic API Key para modelo Claude"
  type        = string
  sensitive   = true
}

# Añadiremos el resto de los secretos manejados vía Secret Manager más adelante
