param(
    [Parameter(Mandatory = $true)]
    [string]$Bucket,

    [string]$Prefix = "kwadratowy-chaos"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$packRoot = (Resolve-Path (Join-Path $repoRoot "pack")).Path
$allowedRoots = @("mods", "config", "resourcepacks", "shaderpacks", "defaultconfigs", "kubejs", "scripts")

$files = Get-ChildItem -LiteralPath $packRoot -File -Recurse | Where-Object {
    $relative = $_.FullName.Substring($packRoot.TrimEnd('\', '/') .Length).TrimStart('\', '/')
    $firstFolder = ($relative -split '[\\/]')[0]
    $allowedRoots -contains $firstFolder
}

if (-not $files -or $files.Count -eq 0) {
    throw "Nie znaleziono plikow w dozwolonych folderach pack/. Dodaj mody do pack/mods/ itd."
}

Write-Host "Znaleziono $($files.Count) plikow do wyslania do R2."
Write-Host "Bucket: $Bucket"
Write-Host "Prefix: $Prefix"
Write-Host ""

$uploaded = 0
foreach ($file in $files) {
    $relative = $file.FullName.Substring($packRoot.TrimEnd('\', '/') .Length).TrimStart('\', '/').Replace('\', '/')
    $objectKey = (($Prefix.Trim('/'), $relative) -join '/').TrimStart('/')
    $objectPath = "$Bucket/$objectKey"

    Write-Host "Wysylanie: $relative ($([math]::Round($file.Length / 1MB, 2)) MB)"

    $cliArgs = @(
        "r2", "object", "put", $objectPath,
        "--file=$($file.FullName)",
        "--remote",
        "--content-type=application/octet-stream",
        "--cache-control=public, max-age=300"
    )

    & npx --yes wrangler@latest @cliArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Upload nie powiodl sie dla pliku: $relative"
    }

    $uploaded++
}

Write-Host ""
Write-Host "Gotowe. Wyslano $uploaded plikow do Cloudflare R2."
