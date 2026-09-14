# CHAPA: sirve el generador en esta PC y crea un enlace para otra persona.
$ErrorActionPreference = "Stop"
$Port = 8931
$Root = $PSScriptRoot
$HostUrl = "http://127.0.0.1:$Port"

function Test-PortOpen {
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $iar = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(400)
    if ($ok) { $client.EndConnect($iar) | Out-Null }
    $client.Close()
    return $ok
  } catch {
    return $false
  }
}

function Get-LanIps {
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.PrefixOrigin -ne "WellKnown" -and
      $_.IPAddress -notlike "169.254.*"
    } |
    Select-Object -ExpandProperty IPAddress -Unique
}

Write-Host ""
Write-Host "  CHAPA - compartir el sistema" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-PortOpen)) {
  Write-Host "  Arrancando servidor en el puerto $Port..."
  Start-Process -FilePath "node" -ArgumentList "servidor.mjs" -WorkingDirectory $Root -WindowStyle Minimized
  $ready = $false
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 250
    if (Test-PortOpen) { $ready = $true; break }
  }
  if (-not $ready) {
    Write-Host "  No se pudo abrir el puerto $Port. Cierra otros servidores o prueba de nuevo." -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "  El servidor ya estaba en marcha."
}

try {
  New-NetFirewallRule -DisplayName "CHAPA NFC $Port" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -ErrorAction Stop | Out-Null
} catch {
}

Write-Host ""
Write-Host "  En ESTA computadora:" -ForegroundColor Green
Write-Host "    http://localhost:$Port/index.html"
Write-Host ""
Write-Host "  En la MISMA WiFi (otra laptop o celular):"
$ips = @(Get-LanIps)
if ($ips.Count -eq 0) {
  Write-Host "    No se detecto IP de red. Revisa que el WiFi este conectado."
} else {
  foreach ($ip in $ips) {
    Write-Host "    http://${ip}:$Port/index.html"
  }
  Write-Host "    (si no abre, usa la IP que empiece por 192.168.)"
}
Write-Host ""
Write-Host "  Enlace de INTERNET (cualquiera con el link):" -ForegroundColor Green
Write-Host "    Se esta creando un tunel. Copia la URL https://... cuando aparezca."
Write-Host "    Deja esta ventana abierta. Ctrl+C cierra el enlace publico."
Write-Host ""

$npx = Get-Command npx -ErrorAction SilentlyContinue
if (-not $npx) {
  Write-Host "  Falta Node.js / npx. Instalalo para el enlace de internet." -ForegroundColor Red
  Write-Host "  Mientras tanto puedes usar el enlace de la WiFi de arriba."
  Write-Host ""
  Pause
  exit 0
}

& npx --yes cloudflared@latest tunnel --url $HostUrl
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "  Cloudflare no arranco. Probando localtunnel..." -ForegroundColor Yellow
  & npx --yes localtunnel --port $Port
}
