param(
    [string]$Tag = ""
)

$ErrorActionPreference = "Stop"
$Repository = "NeyeReQ/Kwadratowy-Chaos-Launcher"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$packRoot = (Resolve-Path (Join-Path $repoRoot "pack")).Path
$manifestPath = Join-Path $repoRoot "launcher/manifest.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$packVersion = [string]$manifest.packVersion

if ([string]::IsNullOrWhiteSpace($Tag)) {
    $Tag = "pack-v$packVersion"
}
if ($Tag -notmatch '^[A-Za-z0-9._-]+$') {
    throw "Nieprawidlowa nazwa tagu release."
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "Nie znaleziono GitHub CLI. Zainstaluj je poleceniem: winget install --id GitHub.cli"
}

& gh auth status --hostname github.com
if ($LASTEXITCODE -ne 0) {
    throw "Najpierw zaloguj GitHub CLI poleceniem: gh auth login"
}

$rootPrefix = $packRoot.TrimEnd([char[]]@('\', '/')) + [IO.Path]::DirectorySeparatorChar
$allowedRoots = @("mods", "config", "resourcepacks", "shaderpacks", "defaultconfigs", "kubejs", "scripts")
$files = @(Get-ChildItem -LiteralPath $packRoot -File -Recurse | Where-Object {
    $relativePath = $_.FullName.Substring($rootPrefix.Length).Replace('\', '/')
    $firstFolder = $relativePath.Split('/')[0]
    $allowedRoots -contains $firstFolder
})

if ($files.Count -eq 0) {
    throw "Nie znaleziono plikow. Umiesc je w pack/mods/, pack/config/ itd."
}
if ($files.Count -gt 1000) {
    throw "Jeden GitHub Release moze zawierac maksymalnie 1000 assetow. Liczba plikow: $($files.Count)."
}

$staging = Join-Path $env:TEMP ("kwadratowy-chaos-release-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $staging | Out-Null

try {
    $assetNames = @{}
    foreach ($file in $files) {
        if ($file.Length -ge 2GB) {
            throw "Plik przekracza limit GitHub Release (ponizej 2 GiB): $($file.Name)"
        }

        $relativePath = $file.FullName.Substring($rootPrefix.Length).Replace('\', '/')
        $assetName = $relativePath.Replace('/', '__') -replace '[^A-Za-z0-9._-]', '_'
        if ($assetNames.ContainsKey($assetName.ToLowerInvariant())) {
            throw "Kolizja nazw assetow po splaszczeniu sciezek: $assetName"
        }
        $assetNames[$assetName.ToLowerInvariant()] = $true
        $destination = Join-Path $staging $assetName
        Copy-Item -LiteralPath $file.FullName -Destination $destination
    }

    # A failed "release view" prints to stderr when the tag is missing.
    # List releases once, then resume an existing draft safely.
    $releaseRows = @(& gh release list --repo $Repository --limit 1000 --json tagName,isDraft)
    if ($LASTEXITCODE -ne 0) {
        throw "Nie udalo sie pobrac listy GitHub Releases."
    }
    $existingRelease = $null
    if ($releaseRows.Count -gt 0) {
        $releaseJson = $releaseRows -join "`n"
        if (-not [string]::IsNullOrWhiteSpace($releaseJson)) {
            $existingRelease = @($releaseJson | ConvertFrom-Json) | Where-Object { $_.tagName -eq $Tag } | Select-Object -First 1
        }
    }
    if ($existingRelease -and -not $existingRelease.isDraft) {
        throw "Release $Tag jest juz opublikowany. Zmien packVersion (np. 0.2.1), wygeneruj manifest i opublikuj nowa wersje."
    }
    $resumeDraft = [bool]$existingRelease

    if (-not $resumeDraft) {
        Write-Host "Tworzenie roboczego GitHub Release: $Tag"
        & gh release create $Tag --repo $Repository --title "Kwadratowy Chaos modpack $packVersion" --notes "Pliki paczki modow Kwadratowego Chaosu. Zarzadzane przez launcher." --draft --target main
        if ($LASTEXITCODE -ne 0) {
            throw "Nie udalo sie utworzyc GitHub Release."
        }
    } else {
        Write-Host "Wznawianie roboczego Release: $Tag"
    }

    foreach ($asset in Get-ChildItem -LiteralPath $staging -File) {
        Write-Host "Wysylanie: $($asset.Name) ($([math]::Round($asset.Length / 1MB, 2)) MB)"
        & gh release upload $Tag $asset.FullName --repo $Repository --clobber
        if ($LASTEXITCODE -ne 0) {
            throw "Nie udalo sie wyslac assetu: $($asset.Name). Roboczy release pozostawiono jako draft."
        }
    }

    & gh release edit $Tag --repo $Repository --draft=false --prerelease
    if ($LASTEXITCODE -ne 0) {
        throw "Pliki wyslano, ale nie udalo sie opublikowac release. Opublikuj go w GitHub Releases."
    }

    Write-Host ""
    Write-Host "Gotowe. Wyslano $($files.Count) plikow."
    Write-Host "Release (pre-release, nie będzie traktowany jako aktualizacja launchera): https://github.com/$Repository/releases/tag/$Tag"
}
finally {
    Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
}
