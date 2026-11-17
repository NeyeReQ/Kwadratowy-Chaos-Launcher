# Konfiguracja launchera

## Wymagania
- Windows 10/11 x64
- Node.js 22 LTS lub nowszy do developmentu
- Konto Microsoft z licencją Minecraft: Java Edition
- Java 25 dla Minecraft Java Edition 26.3

## Microsoft OAuth
1. W Microsoft Entra utwórz rejestrację aplikacji obsługującą osobiste konta Microsoft.
2. Włącz public client flows / allow public client flows.
3. Skopiuj Application (client) ID do pola `microsoftClientId` w `config/launcher.json`.
4. Nie dodawaj client secret — aplikacja desktopowa jest publicznym klientem OAuth.
5. Przebuduj instalator po zmianie konfiguracji.

Logowanie odbywa się przez Device Code Flow na stronie Microsoft. Hasło nie trafia do launchera, a refresh token jest szyfrowany przez Windows DPAPI przez Electron safeStorage.

## Wersja Minecrafta
Bieżący manifest jest ustawiony na Minecraft Java Edition `26.3`, Java `25` i Fabric Loader `0.20.1`. Wartości te pochodzą z aktualnych informacji Fabric dla Minecrafta 26.3. Jeżeli zmienisz wersję serwera, zmień razem `minecraftVersion`, `javaMajor` i `loader.version`. Aktualnie aktywne są vanilla i Fabric; Forge/NeoForge mają zarezerwowane typy, ale ich instalator nie został jeszcze wdrożony.

## Automatyczne aktualizacje modów
Manifest jest źródłem prawdy. Każdy wpis ma `path`, bezpośredni `url` HTTPS, `sha512` oraz opcjonalny `size`. Dozwolone katalogi: `mods/`, `config/`, `resourcepacks/`, `shaderpacks/`, `defaultconfigs/`, `kubejs/`, `scripts/`.

1. Umieść pliki paczki w lokalnym folderze `pack/`: pliki `.jar` bezpośrednio w `pack/mods/`, konfiguracje w `pack/config/`, paczki zasobów w `pack/resourcepacks/`, a shadery w `pack/shaderpacks/`.
2. Opublikuj jego zawartość na publicznym hostingu HTTPS/CDN.
3. Uruchom np. `$env:PACK_CDN_BASE_URL='https://cdn.example.com/kwadratowy-chaos/'; $env:PACK_VERSION='0.2.0'; npm run manifest:build`.
4. Zacommituj wygenerowany `launcher/manifest.json` do gałęzi `main`.

Przed każdym uruchomieniem gry launcher pobiera manifest, porównuje SHA-512, pobiera wyłącznie brakujące/zmienione pliki, weryfikuje je i zapisuje atomowo. Stare pliki usuwa tylko wtedy, gdy były wcześniej wpisane do indeksu plików zarządzanych przez launcher. Nie usuwa światów, logów, screenshotów ani obcych plików.

## Uruchomienie i build
```powershell
npm install
npm run dev
npm run typecheck
npm run dist:win
```
Instalator NSIS powstaje w `release/`.

## Aktualizacje launchera
Wypchnij tag `v0.1.1`. GitHub Actions zbuduje instalator x64 i opublikuje Release. Electron Updater sprawdza aktualizacje opublikowane przez GitHub Releases. Workflow wymaga Actions i uprawnień `contents: write`.

## Przed publicznym wydaniem
Ustaw Microsoft Client ID, potwierdź wersję Minecrafta/loadera/Java, wpisz adres serwera, opublikuj faktyczne mody i konfiguracje oraz przetestuj instalację na czystym koncie Windows.
