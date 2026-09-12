param(
  [string]$ReleaseName = "",
  [string]$OutputRoot = "",
  [string]$CommitSha = "",
  [switch]$DryRun,
  [switch]$KeepLegacyArchives
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

if ([string]::IsNullOrWhiteSpace($CommitSha)) {
  $CommitSha = (& git -C $workspaceRoot rev-parse HEAD).Trim()
}

if ($CommitSha -notmatch '^[0-9a-f]{40}$') {
  throw "Commit SHA invalido: $CommitSha"
}

if ([string]::IsNullOrWhiteSpace($ReleaseName)) {
  $ReleaseName = "promy-release-$($CommitSha.Substring(0, 12))"
}
if ($ReleaseName -notmatch '^[A-Za-z0-9._-]+$') {
  throw "ReleaseName contiene caracteres no permitidos: $ReleaseName"
}

$releaseRoot = if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  Join-Path $workspaceRoot "release"
} else {
  [System.IO.Path]::GetFullPath($OutputRoot)
}
$bundleRoot = Join-Path $releaseRoot $ReleaseName

$projects = @(
  @{ Name = "promy-api"; Path = Join-Path $workspaceRoot "promy-api" },
  @{ Name = "promy-web"; Path = Join-Path $workspaceRoot "promy-web" },
  @{ Name = "promy-landing"; Path = Join-Path $workspaceRoot "promy-landing" },
  @{ Name = "promy-mobile"; Path = Join-Path $workspaceRoot "promy-mobile" }
)

$legacyArchivePaths = @(
  (Join-Path $workspaceRoot "api.zip"),
  (Join-Path $workspaceRoot "web.zip"),
  (Join-Path $workspaceRoot "landing.zip"),
  (Join-Path $workspaceRoot "mobile.zip")
)

$excludedDirectories = @(
  ".git",
  "node_modules",
  "dist",
  ".qa",
  ".expo",
  ".cache",
  "coverage",
  "audit",
  ".codex",
  ".agents",
  "release"
)

$excludedFilePatterns = @(
  ".env*",
  "*.log",
  "*.tsbuildinfo"
)

$excludedExactFiles = @(
  ".env"
)

function Test-ShouldExcludeDirectory {
  param([string]$Name)

  return $excludedDirectories -contains $Name
}

function Test-ShouldExcludeFile {
  param(
    [string]$Name,
    [string]$FullName
  )

  if ($excludedExactFiles -contains $Name) {
    return $true
  }

  if ($Name -eq ".env.example") {
    return $false
  }

  foreach ($pattern in $excludedFilePatterns) {
    if ($Name -like $pattern) {
      return $true
    }
  }

  return $false
}

function Get-ReleaseViolations {
  param(
    [string]$RootPath,
    [string]$ProjectName
  )

  $violations = New-Object System.Collections.Generic.List[string]

  Get-ChildItem -LiteralPath $RootPath -Recurse -Force | ForEach-Object {
    $relativePath = $_.FullName.Substring($RootPath.Length).TrimStart('\')

    if ($_.PSIsContainer) {
      if (Test-ShouldExcludeDirectory $_.Name) {
        $violations.Add("$ProjectName incluye carpeta excluida: $relativePath")
      }
      return
    }

    if (Test-ShouldExcludeFile -Name $_.Name -FullName $_.FullName) {
      $violations.Add("$ProjectName incluye archivo excluido: $relativePath")
    }
  }

  if ($ProjectName -eq "promy-api") {
    $requiredPaths = @(
      "prisma",
      "prisma\schema.prisma"
    )

    foreach ($requiredPath in $requiredPaths) {
      $fullRequiredPath = Join-Path $RootPath $requiredPath
      if (-not (Test-Path -LiteralPath $fullRequiredPath)) {
        $violations.Add("$ProjectName no incluye requerido: $requiredPath")
      }
    }
  }

  return $violations
}

function Test-ZipEntryExcluded {
  param([string]$EntryName)

  $normalized = $EntryName.Replace('/', '\')
  $segments = $normalized.Split('\', [System.StringSplitOptions]::RemoveEmptyEntries)

  foreach ($segment in $segments) {
    if (Test-ShouldExcludeDirectory $segment) {
      return $true
    }
  }

  $fileName = Split-Path -Leaf $normalized
  if ($fileName -and (Test-ShouldExcludeFile -Name $fileName -FullName $normalized)) {
    return $true
  }

  return $false
}

function Test-ArchiveContents {
  param(
    [string]$ZipPath,
    [string]$ProjectName
  )

  Add-Type -AssemblyName System.IO.Compression.FileSystem

  $violations = New-Object System.Collections.Generic.List[string]
  $archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)

  try {
    foreach ($entry in $archive.Entries) {
      if ([string]::IsNullOrWhiteSpace($entry.FullName)) {
        continue
      }

      if (Test-ZipEntryExcluded $entry.FullName) {
        $violations.Add("$ProjectName zip incluye entrada excluida: $($entry.FullName)")
      }
    }

    if ($ProjectName -eq "promy-api") {
      $entryNames = $archive.Entries | ForEach-Object { $_.FullName.Replace('/', '\') }
      if (-not ($entryNames -contains "prisma\schema.prisma")) {
        $violations.Add("$ProjectName zip no incluye requerido: prisma/schema.prisma")
      }
    }
  } finally {
    $archive.Dispose()
  }

  return $violations
}

function Remove-LegacyArchives {
  param([string[]]$ArchivePaths)

  foreach ($archivePath in $ArchivePaths) {
    if (-not (Test-Path -LiteralPath $archivePath)) {
      continue
    }

    Remove-Item -LiteralPath $archivePath -Force
    Write-Output "[pack] eliminado archive legado $archivePath"
  }
}

function Copy-ProjectRelease {
  param(
    [string]$ProjectName,
    [string]$SourceRoot,
    [string]$DestinationRoot
  )

  Get-ChildItem -LiteralPath $SourceRoot -Force | ForEach-Object {
    if ($_.PSIsContainer) {
      if (Test-ShouldExcludeDirectory $_.Name) {
        return
      }
    } elseif (Test-ShouldExcludeFile -Name $_.Name -FullName $_.FullName) {
      return
    }

    $sourcePath = $_.FullName
    $relativePath = $sourcePath.Substring($SourceRoot.Length).TrimStart('\')
    $destinationPath = Join-Path $DestinationRoot $relativePath

    if ($_.PSIsContainer) {
      New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null
      Copy-ProjectRelease -ProjectName $ProjectName -SourceRoot $sourcePath -DestinationRoot $destinationPath
      return
    }

    $destinationDirectory = Split-Path -Parent $destinationPath
    if ($destinationDirectory) {
      New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    }

    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
  }
}

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null

if ($DryRun) {
  Write-Output "[pack] dry-run activo"
  Write-Output "[pack] destino: $bundleRoot"
  foreach ($project in $projects) {
    Write-Output "[pack] incluiria: $($project.Name) desde $($project.Path)"
  }
  Write-Output "[pack] excluiria carpetas: $($excludedDirectories -join ', ')"
  Write-Output "[pack] excluiria archivos: $($excludedExactFiles -join ', '), patrones $($excludedFilePatterns -join ', ')"
  Write-Output "[pack] archives historicos no se modifican: $($legacyArchivePaths -join ', ')"
  return
}

$currentHead = (& git -C $workspaceRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $currentHead -ne $CommitSha) {
  throw "CommitSha debe coincidir exactamente con HEAD ($currentHead)"
}

$dirtyProjectPaths = @(
  & git -C $workspaceRoot status --porcelain --untracked-files=all -- @($projects | ForEach-Object { $_.Name })
)
if ($LASTEXITCODE -ne 0) {
  throw "No se pudo verificar el estado Git de los proyectos"
}
if ($dirtyProjectPaths.Count -gt 0) {
  throw "Los proyectos contienen cambios no asociados al commit $CommitSha`n$($dirtyProjectPaths -join [Environment]::NewLine)"
}

New-Item -ItemType Directory -Path $bundleRoot -Force | Out-Null

# Historical archives are inventory only; packaging never deletes them automatically.

$notes = @(
  "Release: $ReleaseName",
  "Commit: $CommitSha",
  "Generado UTC: $([DateTime]::UtcNow.ToString('o'))",
  "Excluidos (carpetas): $($excludedDirectories -join ', ')",
  "Excluidos (archivos): $($excludedExactFiles -join ', ')",
  "Excluidos (patrones): $($excludedFilePatterns -join ', ')"
)

Set-Content -LiteralPath (Join-Path $bundleRoot "RELEASE_NOTES.txt") -Value $notes

foreach ($project in $projects) {
  $projectDestination = Join-Path $bundleRoot $project.Name
  New-Item -ItemType Directory -Path $projectDestination -Force | Out-Null
  Copy-ProjectRelease -ProjectName $project.Name -SourceRoot $project.Path -DestinationRoot $projectDestination

  $copyViolations = Get-ReleaseViolations -RootPath $projectDestination -ProjectName $project.Name
  if ($copyViolations.Count -gt 0) {
    throw ($copyViolations -join [Environment]::NewLine)
  }

  $zipPath = Join-Path $bundleRoot "$($project.Name).zip"
  Compress-Archive -Path (Join-Path $projectDestination "*") -DestinationPath $zipPath -Force

  $archiveViolations = Test-ArchiveContents -ZipPath $zipPath -ProjectName $project.Name
  if ($archiveViolations.Count -gt 0) {
    throw ($archiveViolations -join [Environment]::NewLine)
  }

  Write-Output "[pack] generado $zipPath"
}

$artifactFiles = Get-ChildItem -LiteralPath $bundleRoot -File -Filter "*.zip" | Sort-Object Name
$manifest = [ordered]@{
  schemaVersion = 1
  releaseName = $ReleaseName
  commitSha = $CommitSha
  builtAtUtc = [DateTime]::UtcNow.ToString('o')
  nodeVersion = (& node --version).Trim()
  npmVersion = (& npm --version).Trim()
  projects = @($projects | ForEach-Object { $_.Name })
  artifacts = @($artifactFiles | ForEach-Object {
    [ordered]@{
      file = $_.Name
      bytes = $_.Length
      sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  })
  exclusions = [ordered]@{
    directories = $excludedDirectories
    exactFiles = $excludedExactFiles
    filePatterns = $excludedFilePatterns
  }
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $bundleRoot "release-manifest.json") -Encoding utf8
$manifest.artifacts | ForEach-Object { "$($_.sha256)  $($_.file)" } |
  Set-Content -LiteralPath (Join-Path $bundleRoot "SHA256SUMS.txt") -Encoding ascii

Write-Output "[pack] release lista en $bundleRoot"
