variable "subscription_id" {
  type        = string
  description = "Explicit Azure subscription for the isolated modern workshop."
}
variable "owner" {
  type        = string
  description = "Workshop resource owner tag."
}
variable "ssh_public_key" {
  type        = string
  description = "Public operator key. The private key never enters Terraform."
}
variable "operator_cidr" {
  type        = string
  description = "Single operator IPv4 address permitted to connect over SSH."
  validation {
    condition     = can(cidrhost(var.operator_cidr, 0)) && endswith(var.operator_cidr, "/32")
    error_message = "Use one IPv4 /32, never an unrestricted administrative CIDR."
  }
}
variable "location" {
  type        = string
  description = "Azure region verified to support the selected SKU."
  default     = "eastus2"
}
variable "vm_size" {
  type        = string
  description = "Workshop host SKU. D2s_v7 availability was verified in this tenant."
  default     = "Standard_D2s_v7"
}
variable "bootstrap_secrets" {
  type        = bool
  description = "Temporarily permit this new VM identity to initialize its own vault; set false immediately after seeding."
  default     = false
}
