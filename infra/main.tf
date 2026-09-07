data "azurerm_client_config" "current" {}
resource "random_string" "suffix" {
  length  = 6
  lower   = true
  numeric = true
  upper   = false
  special = false
}
resource "azurerm_resource_group" "modern" {
  name     = "${local.prefix}-rg-eus2"
  location = var.location
  tags     = local.tags
}
resource "azurerm_virtual_network" "modern" {
  name                = "${local.prefix}-vnet"
  resource_group_name = azurerm_resource_group.modern.name
  location            = var.location
  address_space       = ["10.83.0.0/16"]
  tags                = local.tags
}
resource "azurerm_subnet" "runtime" {
  name                 = "runtime"
  resource_group_name  = azurerm_resource_group.modern.name
  virtual_network_name = azurerm_virtual_network.modern.name
  address_prefixes     = ["10.83.1.0/24"]
}
resource "azurerm_network_security_group" "modern" {
  name                = "${local.prefix}-nsg"
  resource_group_name = azurerm_resource_group.modern.name
  location            = var.location
  tags                = local.tags
  security_rule {
    name                       = "web"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["80", "443"]
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
}
resource "azurerm_subnet_network_security_group_association" "runtime" {
  subnet_id                 = azurerm_subnet.runtime.id
  network_security_group_id = azurerm_network_security_group.modern.id
}
resource "azurerm_public_ip" "modern" {
  name                = "${local.prefix}-pip"
  resource_group_name = azurerm_resource_group.modern.name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
  domain_name_label   = "${local.prefix}-${random_string.suffix.result}"
  tags                = local.tags
  lifecycle {
    # O tenant injeta ip_tags; remove-los substituiria o endereco publico.
    ignore_changes = [ip_tags]
  }
}
resource "azurerm_network_interface" "modern" {
  name                = "${local.prefix}-nic"
  resource_group_name = azurerm_resource_group.modern.name
  location            = var.location
  tags                = local.tags
  ip_configuration {
    name                          = "runtime"
    subnet_id                     = azurerm_subnet.runtime.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.modern.id
  }
}
resource "azurerm_linux_virtual_machine" "modern" {
  name                              = "${local.prefix}-vm"
  resource_group_name               = azurerm_resource_group.modern.name
  location                          = var.location
  size                              = var.vm_size
  admin_username                    = "sifapops"
  disable_password_authentication   = true
  secure_boot_enabled               = true
  vtpm_enabled                      = true
  vm_agent_platform_updates_enabled = true
  encryption_at_host_enabled        = false
  network_interface_ids             = [azurerm_network_interface.modern.id]
  custom_data                       = base64encode(file("${path.module}/cloud-init.yaml"))
  tags                              = local.tags
  identity { type = "SystemAssigned" }
  admin_ssh_key {
    username   = "sifapops"
    public_key = var.ssh_public_key
  }
  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 64
  }
  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }
  lifecycle {
    prevent_destroy = true
  }
}
resource "azurerm_key_vault" "modern" {
  name                          = "sifapmod${random_string.suffix.result}"
  resource_group_name           = azurerm_resource_group.modern.name
  location                      = var.location
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  enable_rbac_authorization     = true
  public_network_access_enabled = false
  purge_protection_enabled      = true
  soft_delete_retention_days    = 7
  tags                          = local.tags
}
resource "azurerm_private_dns_zone" "vault" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = azurerm_resource_group.modern.name
  tags                = local.tags
}
resource "azurerm_private_dns_zone_virtual_network_link" "vault" {
  name                  = "modern-vault"
  resource_group_name   = azurerm_resource_group.modern.name
  private_dns_zone_name = azurerm_private_dns_zone.vault.name
  virtual_network_id    = azurerm_virtual_network.modern.id
  tags                  = local.tags
}
resource "azurerm_private_endpoint" "vault" {
  name                = "${local.prefix}-pe-vault"
  resource_group_name = azurerm_resource_group.modern.name
  location            = var.location
  subnet_id           = azurerm_subnet.runtime.id
  tags                = local.tags
  private_service_connection {
    name                           = "vault"
    private_connection_resource_id = azurerm_key_vault.modern.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }
  private_dns_zone_group {
    name                 = "vault"
    private_dns_zone_ids = [azurerm_private_dns_zone.vault.id]
  }
}
resource "azurerm_role_assignment" "runtime_secrets" {
  scope                = azurerm_key_vault.modern.id
  role_definition_name = var.bootstrap_secrets ? "Key Vault Secrets Officer" : "Key Vault Secrets User"
  principal_id         = azurerm_linux_virtual_machine.modern.identity[0].principal_id
}
