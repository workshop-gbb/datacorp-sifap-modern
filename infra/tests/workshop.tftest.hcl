mock_provider "azurerm" {
  mock_data "azurerm_client_config" {
    defaults = {
      tenant_id = "00000000-0000-0000-0000-000000000001"
    }
  }
  mock_resource "azurerm_linux_virtual_machine" {
    defaults = {
      identity = [{
        type         = "SystemAssigned"
        principal_id = "00000000-0000-0000-0000-000000000002"
        tenant_id    = "00000000-0000-0000-0000-000000000001"
      }]
    }
  }
}
mock_provider "random" {}

variables {
  subscription_id = "00000000-0000-0000-0000-000000000000"
  owner           = "test"
  operator_cidr   = "192.0.2.10/32"
  ssh_public_key  = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDaCSTkT9o2bLjY9qcnGsivOTdv5Z1PKjuITytRe7bNIeMwDCEZ+GVuBd55xUf3yT8d5qjsShB/zrCckBVRqP03DRvCsvu02izEmtWZXP9ICWqOiZ+QeKNL8kuMX2RHrMH8YsRh/2mcAcq1QxdHy4lWU5Y1/ICd5SCYCCsJATJs98B6ns340fVl7Kuid//RBTeLW4cyzEMNOQbKR+ZBc5ksTACg2WZKPPVCpRMvob4XNIoR7b405CzUppuj/1fZkyPQRoPjS+fUaJzaV0M/FlzLjgHAAmOvh+DmLISHQXv3eTYUTAJKA9KB7Y1fxOGwaduZqXXkqce6o+CtjpZhz3cp fixture-only"
}

run "isolated_read_only_runtime" {
  command = plan

  assert {
    condition     = azurerm_resource_group.modern.name == "sifap-modern-rg-eus2"
    error_message = "The modern environment must never target the legacy resource group."
  }
  assert {
    condition     = azurerm_key_vault.modern.public_network_access_enabled == false
    error_message = "Runtime secrets must remain behind the private endpoint."
  }
  assert {
    condition     = azurerm_role_assignment.runtime_secrets.role_definition_name == "Key Vault Secrets User"
    error_message = "The runtime must not retain bootstrap secret-write permissions."
  }
}

run "reject_open_ssh" {
  command = plan
  variables {
    operator_cidr = "0.0.0.0/0"
  }
  expect_failures = [var.operator_cidr]
}
