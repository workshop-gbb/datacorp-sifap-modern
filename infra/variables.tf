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
  description = "Public recovery key required by the VM API; normal deployment uses Azure Run Command, not inbound SSH."
  validation {
    condition     = startswith(var.ssh_public_key, "ssh-rsa ")
    error_message = "Provide an RSA public recovery key; never a private key."
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
