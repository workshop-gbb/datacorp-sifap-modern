output "hostname" {
  value       = azurerm_public_ip.modern.fqdn
  description = "Public HTTPS hostname for students."
}
output "ip_address" {
  value       = azurerm_public_ip.modern.ip_address
  description = "Public HTTPS address. Inbound SSH is disabled; operations use Azure Run Command."
}
output "resource_group" {
  value       = azurerm_resource_group.modern.name
  description = "Isolated modern environment, never the legacy resource group."
}
output "key_vault_name" {
  value       = azurerm_key_vault.modern.name
  description = "Secret store read by the VM managed identity."
}
output "vm_name" {
  value       = azurerm_linux_virtual_machine.modern.name
  description = "Modern workshop host."
}
output "startup_validator_sha256" {
  description = "Integrity reference for the versioned morning database/application validator."
  value       = sha256(local.startup_validator_script)
}
