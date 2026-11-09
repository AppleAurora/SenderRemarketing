# Ejecutar desde PowerShell en whatsapp-worker. No requiere Docker.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (Test-Path ".env") {
  Write-Host "Ya existe .env. No se reemplazo ninguna clave." -ForegroundColor Yellow
  exit 0
}
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$token = [Convert]::ToBase64String($bytes)
"WHATSAPP_SESSION_SERVICE_TOKEN=$token" | Set-Content -Path ".env" -Encoding ascii -NoNewline
Write-Host "Archivo .env creado en esta carpeta. No compartas su contenido." -ForegroundColor Green
Write-Host "Cuando llegue el momento, copia la clave a Netlify como variable privada WHATSAPP_SESSION_SERVICE_TOKEN."
