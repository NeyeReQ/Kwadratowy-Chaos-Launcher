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

Manifest jest źródłem prawdy. Każdy wpis ma `path`, bezpośredni adres `url` HTTPS, `sha512` i rozmiar pliku. Dozwolone katalogi: `mods/`, `config/`, `resourcepacks/`, `shaderpacks/`, `defaultconfigs/`, `kubejs/`, `scripts/`.

### Hosting: Cloudflare R2

Na start używamy Cloudflare R2. Darmowy limit obejmuje 10 GB-miesiąc standardowego storage, 1 mln operacji Class A i 10 mln Class B miesięcznie; transfer wychodzący jest bezpłatny. Publiczny adres `r2.dev` jest ograniczony i przeznaczony do testów. Do publicznego, produkcyjnego wydania najlepiej podpiąć własną domenę do bucketu.

1. Utwórz bezpłatne konto Cloudflare i bucket R2 o nazwie np. `kwadratowy-chaos` (klasa Standard).
2. W Cloudflare R2 otwórz bucket, przejdź do **Settings → Public Development URL → Enable** i potwierdź publiczny dostęp. Skopiuj wygenerowany adres w rodzaju `https://pub-xxxx.r2.dev`.
3. W terminalu VS Code, w głównym folderze repozytorium, zaloguj Wrangler do Cloudflare:
   ```powershell
   npx --yes wrangler@latest login
   ```
4. Umieść pliki paczki w folderze `pack/`: pliki `.jar` bezpośrednio w `pack/mods/`, konfiguracje w `pack/config/`, resourcepacki w `pack/resourcepacks/`, a shadery w `pack/shaderpacks/`.
5. Wyślij wszystkie pliki do bucketu:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\tools\upload-pack.ps1 -Bucket "kwadratowy-chaos"
   ```
   Skrypt wysyła wyłącznie dozwolone katalogi paczki i zachowuje ich strukturę. Wrangler obsługuje pojedyncze pliki do 315 MB; większe obiekty wymagają uploadu multipart przez rclone.
6. Wygeneruj manifest, podstawiając swój adres publiczny:
   ```powershell
   $env:PACK_CDN_BASE_URL = "https://pub-xxxx.r2.dev/kwadratowy-chaos/"
   $env:PACK_VERSION = "0.2.0"
   npm run manifest:build
   ```
7. Zacommituj wyłącznie manifest do repozytorium:
   ```powershell
   git add launcher/manifest.json
   git commit -m "Publish modpack 0.2.0"
   git push origin main
   ```

Przed publikacją sprawdź, czy przykładowy plik otwiera się pod adresem `https://pub-xxxx.r2.dev/kwadratowy-chaos/mods/NAZWA_PLIKU.jar`. W manifeście znajdą się bezpośrednie adresy HTTPS, sumy SHA-512 i rozmiary plików.

Przed każdym uruchomieniem gry launcher pobiera manifest z `config/launcher.json`, porównuje SHA-512, pobiera wyłącznie brakujące lub zmienione pliki, weryfikuje je i zapisuje atomowo. Stare pliki usuwa tylko wtedy, gdy były wcześniej wpisane do indeksu plików zarządzanych przez launcher. Nie usuwa światów, logów, screenshotów ani obcych plików.

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
