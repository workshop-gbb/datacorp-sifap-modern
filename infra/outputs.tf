output "hostname" {
  value       = azurerm_public_ip.modern.fqdn
  description = "Public HTTPS hostname for students."
}
output "ip_address" {
  value       = azurerm_public_ip.modern.ip_address
  description = "Operator SSH address, restricted by the network security group."
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
