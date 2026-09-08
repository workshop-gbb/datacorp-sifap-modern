locals {
  startup_validator_script = file("${path.module}/runtime/verify-startup.sh")
  prefix                   = "sifap-modern"
  tags = {
    project       = "sifap-modern"
    environment   = "workshop"
    owner         = var.owner
    "cost-center" = "workshop-legacy-modernization"
    "managed-by"  = "terraform"
  }
}
