# Setup permissions for network monitor
$ErrorActionPreference = "Stop"

# Get the current directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)
$dataDir = Join-Path $projectRoot "data"

Write-Host "Setting up permissions for network monitor..."
Write-Host "Project root: $projectRoot"
Write-Host "Data directory: $dataDir"

try {
    # Create data directory if it doesn't exist
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Path $dataDir -Force
        Write-Host "Created data directory"
    }

    # Get current user
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    Write-Host "Current user: $currentUser"

    # Set proper permissions
    $acl = Get-Acl $dataDir
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $currentUser,
        "FullControl",
        "ContainerInherit,ObjectInherit",
        "None",
        "Allow"
    )
    $acl.SetAccessRule($rule)
    Set-Acl $dataDir $acl

    # Create packets.json if it doesn't exist
    $packetsFile = Join-Path $dataDir "packets.json"
    if (-not (Test-Path $packetsFile)) {
        Set-Content -Path $packetsFile -Value '{"packets": [], "anomalies": []}' -Encoding UTF8
        Write-Host "Created packets.json file"
    }

    # Set permissions for packets.json
    $acl = Get-Acl $packetsFile
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $currentUser,
        "FullControl",
        "Allow"
    )
    $acl.SetAccessRule($rule)
    Set-Acl $packetsFile $acl

    Write-Host "Successfully set up permissions"
} catch {
    Write-Error "Error setting up permissions: $_"
    exit 1
} 