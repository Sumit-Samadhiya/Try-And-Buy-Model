param([switch]$CheckOnly, [switch]$NoBrowser, [switch]$Detach, [switch]$Stop)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $root 'sevenshades'
$frontend = Join-Path $root 'sevenshadesfrontend'
$runtime = Join-Path $root '.runtime'
$logs = Join-Path $runtime 'logs'
$owned = @()
$keepRunning = $false
$stateFile = Join-Path $runtime 'servers.json'

# Some IDE/agent shells inject both PATH and path into the Windows process
# environment. Start-Process treats those as duplicate dictionary keys and
# fails before either server can start. Preserve the effective path once using
# Windows' canonical spelling so the launcher behaves the same everywhere.
$projectPath = $env:PATH
[Environment]::SetEnvironmentVariable('PATH', $null, 'Process')
[Environment]::SetEnvironmentVariable('path', $null, 'Process')
[Environment]::SetEnvironmentVariable('Path', $projectPath, 'Process')

New-Item -ItemType Directory -Force $logs | Out-Null

function Stop-OwnedServers {
    if (!(Test-Path $stateFile)) { Write-Host 'No launcher-managed servers are recorded.'; return }
    foreach ($entry in @((Get-Content $stateFile -Raw | ConvertFrom-Json))) {
        $process = Get-Process -Id $entry.id -ErrorAction SilentlyContinue
        if ($process -and $process.StartTime.ToUniversalTime().Ticks.ToString() -eq $entry.started -and $process.Path -eq $entry.executable) {
            $process.Kill()
            $process.WaitForExit(10000) | Out-Null
            Write-Host "Stopped $($entry.name)."
        }
    }
    Remove-Item -LiteralPath $stateFile -ErrorAction SilentlyContinue
}

function Run-Checked($exe, $arguments) {
    & $exe @arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $exe $($arguments -join ' ')" }
}
function Test-Python($exe) {
    if (!$exe -or !(Test-Path $exe)) { return $false }
    try {
        & $exe -c 'import sys; sys.exit(0 if sys.version_info[:2] == (3,12) else 1)' 2>$null
        return $LASTEXITCODE -eq 0
    } catch { return $false }
}
function Wait-Service($process, $url, $name) {
    $deadline = (Get-Date).AddSeconds(300)
    $nextUpdate = (Get-Date).AddSeconds(15)
    do {
        $process.Refresh()
        if ($process.HasExited) { throw "$name stopped. See $logs\$name.err.log and $name.out.log" }
        try {
            $response = Invoke-WebRequest $url -Headers @{Accept='text/html'} -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) { return }
        } catch { }
        if ((Get-Date) -ge $nextUpdate) {
            Write-Host "Waiting for $name... logs: $logs\$name.out.log"
            $nextUpdate = (Get-Date).AddSeconds(15)
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw "$name did not become ready within 5 minutes. See $logs"
}
try {
    if ($Stop) { Stop-OwnedServers; exit 0 }
    Write-Host 'SevenShades local startup - checking environment...'
    if (!$CheckOnly) {
        foreach ($port in @(8000,3000)) {
            $socket = New-Object System.Net.Sockets.TcpClient
            try {
                try { $null = $socket.ConnectAsync('127.0.0.1', $port).Wait(1000) } catch { }
                if ($socket.Connected) { throw "Port $port is already in use. If this project is running, use STOP_PROJECT.bat first. Existing programs were not stopped." }
            } finally { $socket.Dispose() }
        }
    }
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    Run-Checked $node @('-e', 'if(parseInt(process.versions.node)<18)process.exit(1)')
    $candidates = @((Join-Path $runtime 'venv\Scripts\python.exe'), (Join-Path $backend '.venv\Scripts\python.exe'))
    $py = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($py) {
        try {
            $found = & $py.Source -3.12 -c 'import sys; print(sys.executable)' 2>$null
            if ($LASTEXITCODE -eq 0) { $candidates += $found }
        } catch { }
    }
    $candidates += Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe'
    $candidates += Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
    $python = $candidates | Where-Object { Test-Python $_ } | Select-Object -First 1
    if (!$python) { throw 'Python 3.12 could not run. Install Python 3.12 (python.org), then double-click START_PROJECT.bat again.' }
    # Reuse this checkout's installed packages only when every required version and import works.
    $env:PYTHONPATH = ''
    if ($python -ne (Join-Path $runtime 'venv\Scripts\python.exe')) {
        $env:PYTHONPATH = Join-Path $backend '.venv\Lib\site-packages'
    }
    $probe = Join-Path $PSScriptRoot 'check-dependencies.py'
    Push-Location $backend
    try {
        & $python $probe *> (Join-Path $logs 'python-check.log')
        $ready = $LASTEXITCODE -eq 0
    } catch { $ready = $false } finally { Pop-Location }
    if (!$ready) {
        if ($CheckOnly) { throw "Backend dependencies need setup. Run START_PROJECT.bat normally. Details: $logs\python-check.log" }
        $env:PYTHONPATH = ''
        $localPython = Join-Path $runtime 'venv\Scripts\python.exe'
        if (!(Test-Python $localPython)) { Run-Checked $python @('-m', 'venv', (Join-Path $runtime 'venv')) }
        $python = $localPython
        Write-Host 'Preparing backend dependencies (first setup needs internet)...'
        Run-Checked $python @('-m', 'pip', 'install', '-r', (Join-Path $backend 'requirements.txt'))
        Run-Checked $python @($probe)
    }
    $env:DJANGO_DEBUG = '1'
    $env:DJANGO_ALLOWED_HOSTS = '127.0.0.1,localhost'
    $env:FRONTEND_ORIGINS = 'http://127.0.0.1:3000,http://localhost:3000'
    $env:HOST = '127.0.0.1'
    $env:PORT = '3000'
    $env:BROWSER = 'none'
    $env:PYTHONUNBUFFERED = '1'
    $lock = Join-Path $frontend 'package-lock.json'
    $stamp = Join-Path $runtime 'frontend-lock.sha256'
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $stream = [System.IO.File]::OpenRead($lock)
    try { $hash = ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '') }
    finally { $stream.Dispose(); $sha.Dispose() }
    Push-Location $frontend
    try {
        # Existing installations are checked without forcing a first-run reinstall.
        $validModules = Test-Path 'node_modules\react-scripts\scripts\start.js'
        if ($validModules -and !(Test-Path $stamp)) {
            & $npm ls --depth=0 --omit=optional *> (Join-Path $logs 'npm-check.log')
            $validModules = $LASTEXITCODE -eq 0
        }
        if (!$validModules -or ((Test-Path $stamp) -and (Get-Content $stamp) -ne $hash)) {
            if ($CheckOnly) { throw 'Frontend dependencies need setup for the current lockfile. Run START_PROJECT.bat normally.' }
            Write-Host 'Preparing frontend dependencies (internet required)...'
            Run-Checked $npm @('ci', '--legacy-peer-deps', '--no-audit', '--no-fund', '--fetch-retries=1', '--fetch-timeout=30000')
        }
        if (!$CheckOnly) { Set-Content $stamp $hash }
    } finally { Pop-Location }
    Push-Location $backend
    try { Run-Checked $python @('manage.py', 'check') } finally { Pop-Location }
    if ($CheckOnly) { Write-Host 'Environment and dependencies are ready.'; exit 0 }
    foreach ($port in @(8000,3000)) {
        $socket = New-Object System.Net.Sockets.TcpClient
        try {
            $connection = $socket.ConnectAsync('127.0.0.1', $port)
            try { $null = $connection.Wait(1000) } catch { }
            $occupied = $socket.Connected
        } finally { $socket.Dispose() }
        if ($occupied) {
            throw "Port $port is already in use. Close the previous project launcher/server and try again. No existing process was stopped."
        }
    }
    Push-Location $backend
    try { Run-Checked $python @('manage.py', 'migrate', '--noinput') } finally { Pop-Location }
    Write-Host 'Starting backend...'
    $server = Start-Process $python -ArgumentList 'manage.py runserver 127.0.0.1:8000 --noreload' -WorkingDirectory $backend -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'backend.out.log') -RedirectStandardError (Join-Path $logs 'backend.err.log')
    $owned += $server
    Wait-Service $server 'http://127.0.0.1:8000/admin/login/' 'backend'
    Write-Host 'Starting frontend (first compile may take a minute)...'
    $client = Start-Process $node -ArgumentList 'node_modules/react-scripts/scripts/start.js' -WorkingDirectory $frontend -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'frontend.out.log') -RedirectStandardError (Join-Path $logs 'frontend.err.log')
    $owned += $client
    Wait-Service $client 'http://127.0.0.1:3000' 'frontend'
    @(
        @{id=$server.Id; name='backend'; executable=$server.Path; started=$server.StartTime.ToUniversalTime().Ticks.ToString()},
        @{id=$client.Id; name='frontend'; executable=$client.Path; started=$client.StartTime.ToUniversalTime().Ticks.ToString()}
    ) | ConvertTo-Json | Set-Content $stateFile
    Write-Host "Project ready: http://127.0.0.1:3000/home`nLogs: $logs"
    if (!$NoBrowser) { Start-Process 'http://127.0.0.1:3000/home' }
    if ($Detach) {
        $keepRunning = $true
        Write-Host 'Servers are running in the background. Use STOP_PROJECT.bat to stop them.'
    } else {
        Read-Host 'Keep this window open. Press ENTER here to stop both servers (or use STOP_PROJECT.bat)' | Out-Null
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    if (!$keepRunning) {
        foreach ($process in $owned) {
            $process.Refresh()
            if (!$process.HasExited) { $process.Kill() }
        }
        if ($owned.Count -gt 0 -and (Test-Path $stateFile)) {
            $recordedIds = @((Get-Content $stateFile -Raw | ConvertFrom-Json) | ForEach-Object { $_.id })
            if (@($owned | Where-Object { $_.Id -in $recordedIds }).Count -eq $owned.Count) {
                Remove-Item -LiteralPath $stateFile -ErrorAction SilentlyContinue
            }
        }
    }
}
