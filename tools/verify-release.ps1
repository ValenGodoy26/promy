param(
  [Parameter(Mandatory = $true)][string]$BundlePath,
  [Parameter(Mandatory = $true)][string]$ExpectedCommit
)

$ErrorActionPreference = "Stop"
$bundle = [System.IO.Path]::GetFullPath($BundlePath)
$manifestPath = Join-Path $bundle "release-manifest.json"
$checksumsPath = Join-Path $bundle "SHA256SUMS.txt"
if (-not (Test-Path -LiteralPath $manifestPath) -or -not (Test-Path -LiteralPath $checksumsPath)) {
  throw "Manifest o checksums faltantes"
}

$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
if ($manifest.commitSha -ne $ExpectedCommit) {
  throw "SHA del manifest no coincide: $($manifest.commitSha)"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$expectedChecksumLines = New-Object System.Collections.Generic.List[string]
foreach ($artifact in $manifest.artifacts) {
  $zipPath = Join-Path $bundle $artifact.file
  $actualHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $artifact.sha256) {
    throw "Checksum invalido: $($artifact.file)"
  }
  $expectedChecksumLines.Add("$actualHash  $($artifact.file)")
  $archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    foreach ($entry in $archive.Entries) {
      $normalized = "/$($entry.FullName.Replace('\', '/'))/"
      if ($normalized -match '/(\.git|node_modules|dist|\.qa|\.expo|\.cache|coverage|audit|release)/' -or
          [System.IO.Path]::GetFileName($entry.FullName) -match '^\.env($|\.(?!example$))' -or
          $entry.FullName -match '\.(log|tsbuildinfo)$') {
        throw "Entrada excluida encontrada en $($artifact.file): $($entry.FullName)"
      }
    }
  } finally {
    $archive.Dispose()
  }
}

$checksumLines = @(Get-Content -LiteralPath $checksumsPath | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
if (($checksumLines.Count -ne $expectedChecksumLines.Count) -or
    (Compare-Object -ReferenceObject @($expectedChecksumLines) -DifferenceObject $checksumLines)) {
  throw "SHA256SUMS.txt no coincide con el manifest"
}

Write-Output "[release-verify] PASS commit=$ExpectedCommit artifacts=$($manifest.artifacts.Count)"
