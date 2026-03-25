param(
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $root "Client\MeliGo"
$backendDir = Join-Path $root "Server\MeliGo"

$frontendOutLog = Join-Path $root "frontend.out.log"
$frontendErrLog = Join-Path $root "frontend.err.log"
$backendOutLog = Join-Path $root "backend.out.log"
$backendErrLog = Join-Path $root "backend.err.log"

function Stop-ListenerOnPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($processId in $listeners) {
        if ($processId -and $processId -ne $PID) {
            try {
                Stop-Process -Id $processId -Force -ErrorAction Stop
                Write-Host "Stopped existing process on port $Port (PID $processId)."
            }
            catch {
                Write-Warning "Could not stop PID $processId on port ${Port}: $($_.Exception.Message)"
            }
        }
    }
}

function Wait-ForPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($listening) {
            return $true
        }

        Start-Sleep -Milliseconds 500
    }

    return $false
}

Write-Host "Starting MeliGo dev environment..."

Stop-ListenerOnPort -Port 4200
Stop-ListenerOnPort -Port 5207

Remove-Item $frontendOutLog, $frontendErrLog, $backendOutLog, $backendErrLog -Force -ErrorAction SilentlyContinue

sqllocaldb start MSSQLLocalDB | Out-Null
Write-Host "LocalDB is running."

if (-not $NoBuild) {
    Push-Location $backendDir
    try {
        Write-Host "Building backend..."
        dotnet build ".\MeliGo.csproj" --ignore-failed-sources
    }
    finally {
        Pop-Location
    }
}

$backendProcess = Start-Process `
    -FilePath "dotnet" `
    -ArgumentList @("bin\Debug\net8.0\MeliGo.dll") `
    -WorkingDirectory $backendDir `
    -RedirectStandardOutput $backendOutLog `
    -RedirectStandardError $backendErrLog `
    -PassThru `
    -Environment @{
        ASPNETCORE_ENVIRONMENT = "Development"
        ASPNETCORE_URLS = "http://localhost:5207"
    }

if (-not (Wait-ForPort -Port 5207)) {
    throw "Backend failed to start. Check $backendOutLog and $backendErrLog."
}

Write-Host "Backend started on http://localhost:5207 (PID $($backendProcess.Id))."

$frontendProcess = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList @("start", "--", "--host", "127.0.0.1") `
    -WorkingDirectory $frontendDir `
    -RedirectStandardOutput $frontendOutLog `
    -RedirectStandardError $frontendErrLog `
    -PassThru

if (-not (Wait-ForPort -Port 4200)) {
    throw "Frontend failed to start. Check $frontendOutLog and $frontendErrLog."
}

Write-Host "Frontend started on http://127.0.0.1:4200 (PID $($frontendProcess.Id))."
Write-Host ""
Write-Host "MeliGo is ready:"
Write-Host "  Frontend: http://127.0.0.1:4200"
Write-Host "  Backend:  http://localhost:5207"
Write-Host ""
Write-Host "Logs:"
Write-Host "  $frontendOutLog"
Write-Host "  $frontendErrLog"
Write-Host "  $backendOutLog"
Write-Host "  $backendErrLog"
