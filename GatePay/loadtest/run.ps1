[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidateSet('gd3', 'gd3-scale', 'validation', 'settlement', 'forged', 'all')]
  [string]$Scenario = 'all',

  [switch]$Smoke,

  [string]$EnvFile,

  [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$')]
  [string]$RunId,

  [switch]$SaveQuickLog
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$loadtestRoot = $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($EnvFile)) {
  $EnvFile = Join-Path $loadtestRoot '.env.local'
} elseif (-not [IO.Path]::IsPathRooted($EnvFile)) {
  $EnvFile = Join-Path (Get-Location) $EnvFile
}

$allowedEnvNames = @(
  'BASE_URL',
  'PAYGATE_USERNAME',
  'PAYGATE_PASSWORD',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'DEST_ACCOUNT_ID',
  'PAYMENT_AMOUNT',
  'GD3_VUS',
  'GD3_BARRIER_SECONDS',
  'GD3_SETTLEMENT_WAIT_SECONDS',
  'GD3_SCALE_USERNAMES',
  'GD3_SCALE_PASSWORD',
  'GD3_SCALE_REQUESTS_PER_USER',
  'GD4_TEST_ENV',
  'GD4_ALLOW_MUTATION',
  'GD4_CALLBACK_SAFE',
  'WEBHOOK_SECRET',
  'MERCHANT_CODE',
  'MERCHANT_API_KEY',
  'CHECKOUT_AMOUNT',
  'GD4_RETURN_URL',
  'GD4_CANCEL_URL',
  'GD4_BANK_CODE',
  'GD4_ACCOUNT_NUMBER',
  'GD4_VALIDATION_VUS',
  'GD4_VALIDATION_DURATION',
  'GD4_SETTLEMENT_VUS',
  'GD4_SETTLEMENT_BARRIER_SECONDS',
  'GD4_FORGED_VUS',
  'GD4_FORGED_DURATION',
  'FORGED_AMOUNT'
)

$script:environmentSnapshot = @{}

function Get-ProcessEnv([string]$Name) {
  [Environment]::GetEnvironmentVariable($Name, [EnvironmentVariableTarget]::Process)
}

function Set-ScopedEnv([string]$Name, [string]$Value) {
  if (-not $script:environmentSnapshot.ContainsKey($Name)) {
    $script:environmentSnapshot[$Name] = Get-ProcessEnv $Name
  }

  [Environment]::SetEnvironmentVariable(
    $Name,
    $Value,
    [EnvironmentVariableTarget]::Process
  )
}

function Restore-Environment {
  foreach ($name in $script:environmentSnapshot.Keys) {
    [Environment]::SetEnvironmentVariable(
      $name,
      $script:environmentSnapshot[$name],
      [EnvironmentVariableTarget]::Process
    )
  }
}

function Import-SafeDotEnv([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Write-Warning "Khong tim thay $Path. Runner se dung ENV hien co va hoi secret con thieu."
    return
  }

  $seen = @{}
  $lineNumber = 0

  foreach ($rawLine in Get-Content -LiteralPath $Path -Encoding UTF8) {
    $lineNumber++
    $line = $rawLine.Trim()

    if ($line.Length -eq 0 -or $line.StartsWith('#')) {
      continue
    }

    if ($line -notmatch '^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
      throw "Dong $lineNumber trong .env.local khong co dang KEY=VALUE."
    }

    $name = $Matches[1]
    $value = $Matches[2].Trim()

    if ($allowedEnvNames -notcontains $name) {
      throw "Bien khong duoc ho tro '$name' tai dong $lineNumber."
    }

    if ($seen.ContainsKey($name)) {
      throw "Bien '$name' bi khai bao lap tai dong $lineNumber."
    }
    $seen[$name] = $true

    if ($value.StartsWith("'") -or $value.StartsWith('"')) {
      $quote = $value.Substring(0, 1)
      if ($value.Length -lt 2 -or $value.Substring($value.Length - 1, 1) -ne $quote) {
        throw "Gia tri co dau quote chua dong tai dong $lineNumber."
      }
      $value = $value.Substring(1, $value.Length - 2)
    }

    # Explicit process ENV takes precedence over .env.local.
    if ([string]::IsNullOrWhiteSpace((Get-ProcessEnv $name)) -and
        -not [string]::IsNullOrWhiteSpace($value)) {
      Set-ScopedEnv $name $value
    }
  }

  Write-Host "Da nap cau hinh local: $Path"
}

function Read-SecretText([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $pointer = [IntPtr]::Zero

  try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    if ($pointer -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
    $secure.Dispose()
  }
}

function Ensure-Secret([string]$Name, [string]$Prompt) {
  if (-not [string]::IsNullOrWhiteSpace((Get-ProcessEnv $Name))) {
    return
  }

  $value = Read-SecretText $Prompt
  try {
    if ([string]::IsNullOrWhiteSpace($value)) {
      throw "Secret '$Name' khong duoc de trong."
    }
    Set-ScopedEnv $Name $value
  } finally {
    $value = $null
  }
}

function Ensure-RequiredValues([string[]]$Names, [string]$Label) {
  $missing = @(
    foreach ($name in $Names) {
      if ([string]::IsNullOrWhiteSpace((Get-ProcessEnv $name))) {
        $name
      }
    }
  )

  if ($missing.Count -gt 0) {
    throw "$Label thieu cau hinh: $($missing -join ', '). Bo sung vao loadtest/.env.local."
  }
}

function Assert-Gd4Safety {
  Ensure-RequiredValues @(
    'GD4_TEST_ENV',
    'GD4_ALLOW_MUTATION',
    'GD4_CALLBACK_SAFE'
  ) 'GD4'

  if ((Get-ProcessEnv 'GD4_TEST_ENV') -ne 'isolated' -or
      (Get-ProcessEnv 'GD4_ALLOW_MUTATION') -ne 'true' -or
      (Get-ProcessEnv 'GD4_CALLBACK_SAFE') -ne 'true') {
    throw @'
GD4 bi chan vi chua xac nhan moi truong an toan.
Can dung: GD4_TEST_ENV=isolated, GD4_ALLOW_MUTATION=true, GD4_CALLBACK_SAFE=true.
Chi bat cac co nay voi database disposable va callback NULL/local-safe.
'@
  }
}

function Find-K6 {
  foreach ($commandName in @('k6.exe', 'k6')) {
    $command = Get-Command $commandName -CommandType Application -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($null -ne $command) {
      return $command.Source
    }
  }

  $fallback = 'C:\Program Files\k6\k6.exe'
  if (Test-Path -LiteralPath $fallback -PathType Leaf) {
    return $fallback
  }

  throw 'Khong tim thay k6 trong PATH hoac C:\Program Files\k6\k6.exe.'
}

function Test-Backend([string]$BaseUrl) {
  try {
    $uri = [Uri]$BaseUrl
  } catch {
    throw "BASE_URL khong hop le: $BaseUrl"
  }

  if (-not $uri.IsAbsoluteUri -or @('http', 'https') -notcontains $uri.Scheme) {
    throw 'BASE_URL phai la URL http/https tuyet doi.'
  }

  $client = New-Object Net.Sockets.TcpClient
  $async = $null
  try {
    $async = $client.BeginConnect($uri.DnsSafeHost, $uri.Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(3000, $false)) {
      throw "Timeout khi ket noi $($uri.DnsSafeHost):$($uri.Port)."
    }
    $client.EndConnect($async)
  } catch {
    throw "Backend chua mo tai $BaseUrl. Hay chay PayGate port 8081 truoc. $($_.Exception.Message)"
  } finally {
    if ($null -ne $async) {
      $async.AsyncWaitHandle.Close()
    }
    $client.Close()
  }

  Write-Host "Backend reachable: $BaseUrl"
}

function Prepare-Scenario([string]$Name) {
  switch ($Name) {
    'gd3' {
      Ensure-RequiredValues @(
        'PAYGATE_USERNAME',
        'ADMIN_USERNAME',
        'DEST_ACCOUNT_ID',
        'PAYMENT_AMOUNT'
      ) 'GD3'
      Ensure-Secret 'PAYGATE_PASSWORD' 'Nhap password payer'
      Ensure-Secret 'ADMIN_PASSWORD' 'Nhap password admin'

      if ($Smoke) {
        Set-ScopedEnv 'GD3_VUS' '8'
        Set-ScopedEnv 'GD3_BARRIER_SECONDS' '1'
      }
    }
    'gd3-scale' {
      Ensure-RequiredValues @(
        'GD3_SCALE_USERNAMES',
        'ADMIN_USERNAME',
        'DEST_ACCOUNT_ID',
        'PAYMENT_AMOUNT'
      ) 'GD3 scale'
      Ensure-Secret 'GD3_SCALE_PASSWORD' 'Nhap password dung chung cua payer scale'
      Ensure-Secret 'ADMIN_PASSWORD' 'Nhap password admin'

      if ($Smoke) {
        Set-ScopedEnv 'GD3_SCALE_REQUESTS_PER_USER' '2'
        Set-ScopedEnv 'GD3_BARRIER_SECONDS' '1'
      }
    }
    'validation' {
      Assert-Gd4Safety
      Ensure-Secret 'WEBHOOK_SECRET' 'Nhap bank webhook HMAC secret'

      if ($Smoke) {
        Set-ScopedEnv 'GD4_VALIDATION_VUS' '1'
        Set-ScopedEnv 'GD4_VALIDATION_DURATION' '1s'
      }
    }
    'settlement' {
      Assert-Gd4Safety
      Ensure-RequiredValues @(
        'MERCHANT_CODE',
        'CHECKOUT_AMOUNT',
        'GD4_RETURN_URL',
        'GD4_CANCEL_URL',
        'GD4_BANK_CODE',
        'GD4_ACCOUNT_NUMBER'
      ) 'GD4 settlement'
      Ensure-Secret 'WEBHOOK_SECRET' 'Nhap bank webhook HMAC secret'
      Ensure-Secret 'MERCHANT_API_KEY' 'Nhap merchant API key'

      if ($Smoke) {
        Set-ScopedEnv 'GD4_SETTLEMENT_VUS' '1'
        Set-ScopedEnv 'GD4_SETTLEMENT_BARRIER_SECONDS' '1'
      }
    }
    'forged' {
      Assert-Gd4Safety
      Ensure-RequiredValues @(
        'MERCHANT_CODE',
        'CHECKOUT_AMOUNT',
        'GD4_RETURN_URL',
        'GD4_CANCEL_URL',
        'GD4_BANK_CODE',
        'GD4_ACCOUNT_NUMBER',
        'FORGED_AMOUNT'
      ) 'GD4 forged'
      Ensure-Secret 'WEBHOOK_SECRET' 'Nhap bank webhook HMAC secret'
      Ensure-Secret 'MERCHANT_API_KEY' 'Nhap merchant API key'

      if ($Smoke) {
        Set-ScopedEnv 'GD4_FORGED_VUS' '1'
        Set-ScopedEnv 'GD4_FORGED_DURATION' '1s'
      }
    }
  }
}

function New-ScenarioRunId([string]$Name, [int]$TargetCount) {
  if (-not [string]::IsNullOrWhiteSpace($RunId)) {
    if ($TargetCount -eq 1) {
      return $RunId
    }
    return "$RunId-$Name"
  }

  $mode = if ($Smoke) { 'smoke' } else { 'run' }
  "$Name-$mode-$(Get-Date -Format 'yyyyMMdd-HHmmss-fff')"
}

function Invoke-K6Scenario([string]$Name, [string]$K6Path, [int]$TargetCount) {
  $currentRunId = New-ScenarioRunId $Name $TargetCount

  switch ($Name) {
    'gd3' {
      Set-ScopedEnv 'GD3_RUN_ID' $currentRunId
      Set-ScopedEnv 'IDEMPOTENCY_KEY' "GD3-IDEM-$currentRunId"
      $scriptPath = Join-Path $loadtestRoot 'gd3\gd3-idempotency-test.js'
    }
    'gd3-scale' {
      Set-ScopedEnv 'GD3_RUN_ID' $currentRunId
      $scriptPath = Join-Path $loadtestRoot 'gd3\gd3-idempotency-scale-test.js'
    }
    'validation' {
      Set-ScopedEnv 'GD4_RUN_ID' $currentRunId
      $scriptPath = Join-Path $loadtestRoot 'gd4\gd4-validation-test.js'
    }
    'settlement' {
      Set-ScopedEnv 'GD4_RUN_ID' $currentRunId
      $scriptPath = Join-Path $loadtestRoot 'gd4\gd4-settlement-test.js'
    }
    'forged' {
      Set-ScopedEnv 'GD4_RUN_ID' $currentRunId
      $scriptPath = Join-Path $loadtestRoot 'gd4\gd4-forged-amount-test.js'
    }
  }

  if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "Khong tim thay script: $scriptPath"
  }

  Write-Host ''
  Write-Host "=== Running $Name | Run ID: $currentRunId ==="
  $k6Arguments = @('run', '--no-color')

  if ($SaveQuickLog) {
    $quickRunDirectory = Join-Path $loadtestRoot ".quick-runs\$currentRunId"
    $null = New-Item -ItemType Directory -Force -Path $quickRunDirectory
    $logPath = Join-Path $quickRunDirectory 'console.log'
    $eventsPath = Join-Path $quickRunDirectory 'events.log'
    $k6Arguments += @('--console-output', $eventsPath)
    $k6Arguments += $scriptPath
    $oldErrorActionPreference = $ErrorActionPreference
    try {
      $ErrorActionPreference = 'Continue'
      & $K6Path @k6Arguments | Tee-Object -FilePath $logPath
      $exitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $oldErrorActionPreference
    }
    Write-Host "Quick log: $logPath"
    Write-Host "Event log: $eventsPath"
  } else {
    $k6Arguments += $scriptPath
    & $K6Path @k6Arguments
    $exitCode = $LASTEXITCODE
  }

  if ($exitCode -ne 0) {
    throw "Scenario '$Name' that bai voi k6 exit code $exitCode."
  }
  Write-Host "PASS: $Name"
}

try {
  Import-SafeDotEnv $EnvFile

  if ([string]::IsNullOrWhiteSpace((Get-ProcessEnv 'BASE_URL'))) {
    Set-ScopedEnv 'BASE_URL' 'http://localhost:8081'
  } else {
    Set-ScopedEnv 'BASE_URL' ((Get-ProcessEnv 'BASE_URL').TrimEnd('/'))
  }

  $k6Path = Find-K6
  Test-Backend (Get-ProcessEnv 'BASE_URL')

  [string[]]$targets = if ($Scenario -eq 'all') {
    'gd3', 'validation', 'settlement', 'forged'
  } else {
    @($Scenario)
  }

  $targetCount = @($targets).Count

  foreach ($target in $targets) {
    Prepare-Scenario $target
  }
  $scenarioFailures = @()
  foreach ($target in $targets) {
    try {
      Invoke-K6Scenario $target $k6Path $targetCount
    } catch {
      if ($targetCount -eq 1) {
        throw
      }

      $scenarioFailures += "${target}: $($_.Exception.Message)"
      Write-Warning "FAILED: $target. Runner se tiep tuc scenario ke tiep."
    }
  }

  if (@($scenarioFailures).Count -gt 0) {
    throw "Cac scenario that bai: $($scenarioFailures -join ' | ')"
  }

  Write-Host ''
  Write-Host 'Hoan thanh toan bo scenario da chon.'
} finally {
  Restore-Environment
}
