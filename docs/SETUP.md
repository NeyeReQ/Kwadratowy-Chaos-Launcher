# Konfiguracja launchera

## Wymagania
- Windows 10/11 x64
- Node.js 22 LTS lub nowszy do developmentu
- GitHub CLI (darmowe narzedzie do publikowania assetow Release)
- Konto Microsoft z licencja Minecraft: Java Edition
- Java 25 dla Minecraft Java Edition 26.3

## Microsoft OAuth
1. W Microsoft Entra utworz rejestracje aplikacji obslugujaca osobiste konta Microsoft.
2. Wlacz public client flows / allow public client flows.
3. Skopiuj Application (client) ID do pola `microsoftClientId` w `config/launcher.json`.
4. Nie dodawaj client secret — aplikacja desktopowa jest publicznym klientem OAuth.
5. Przebuduj instalator po zmianie konfiguracji.

Logowanie odbywa sie przez Device Code Flow na stronie Microsoft. Haslo nie trafia do launchera, a refresh token jest szyfrowany przez Windows DPAPI przez Electron safeStorage.

## Wersja Minecrafta
Biezacy manifest jest ustawiony na Minecraft Java Edition `26.3`, Java `25` i Fabric Loader `0.20.1`. Jesli zmienisz wersje serwera, zmien razem `minecraftVersion`, `javaMajor` i `loader.version`. Aktualnie aktywne sa vanilla i Fabric; Forge/NeoForge maja zarezerwowane typy, ale ich instalator nie zostal jeszcze wdrozony.

## Darmowy hosting paczki: GitHub Releases

Uzywamy assetow GitHub Releases w tym samym publicznym repozytorium. GitHub pozwala na maksymalnie 1000 assetow w jednym release; kazdy plik musi miec mniej niz 2 GiB. Dokumentacja GitHuba podaje brak limitu lacznego rozmiaru release i transferu. To pasuje do moda Flashback (191,7 MB) i nie wymaga Cloudflare, R2, karty ani platnego hostingu.

1. Zainstaluj darmowe GitHub CLI:
   ```powershell
   winget install --id GitHub.cli
   ```
   Zamknij i otworz ponownie terminal VS Code.
2. Zaloguj CLI do konta z dostepem do repozytorium:
   ```powershell
   gh auth login
   ```
   Wybierz GitHub.com, HTTPS i logowanie przez przegladarke.
3. Ustaw nowa wersje paczki w `launcher/manifest.json`, np. `0.2.0` w polu `packVersion`. Kazda publikacja powinna dostac nowy numer wersji.
4. Umiesc pliki paczki w folderze `pack/`: pliki `.jar` bezposrednio w `pack/mods/`, konfiguracje w `pack/config/`, resourcepacki w `pack/resourcepacks/`, a shadery w `pack/shaderpacks/`.
5. Wygeneruj manifest:
   ```powershell
   $env:PACK_VERSION = "0.2.0"
   npm run manifest:build
   ```
   Generator wyliczy SHA-512 i bezposrednie URL-e do assetow release `pack-v0.2.0`. Nazwy assetow beda splaszczone (np. `mods__Flashback.jar`), ale launcher zapisze pliki w oryginalnych katalogach.
6. Opublikuj pliki paczki:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\tools\publish-pack-release.ps1
   ```
   Skrypt utworzy roboczy release, wysle pliki i opublikuje go dopiero po zakonczeniu uploadu.
7. Wyslij manifest do repozytorium:
   ```powershell
   git add launcher/manifest.json
   git commit -m "Publish modpack 0.2.0"
   git push origin main
   ```

Nie dodawaj zawartosci folderu `pack/` do zwyklych commitow Git — folder jest celowo ignorowany. Jesli pojedynczy plik ma 2 GiB lub wiecej albo paczka ma ponad 1000 plikow, trzeba podzielic publikacje na wiecej release'ow i dostosowac generator manifestu.

Przed kazdym uruchomieniem gry launcher pobiera manifest z `config/launcher.json`, porownuje SHA-512, pobiera tylko brakujace lub zmienione pliki, weryfikuje je i zapisuje atomowo. Stare pliki usuwa tylko wtedy, gdy byly wczesniej wpisane do indeksu plikow zarzadzanych przez launcher. Nie usuwa swiatow, logow, screenshotow ani obcych plikow.

## Uruchomienie i build
```powershell
npm install
npm run dev
npm run typecheck
npm run dist:win
```
Instalator NSIS powstaje w `release/`.

## Aktualizacje launchera
Wypchnij tag `v0.1.1`. GitHub Actions zbuduje instalator x64 i opublikuje Release. Electron Updater sprawdza aktualizacje opublikowane przez GitHub Releases. Workflow wymaga Actions i uprawnien `contents: write`.

## Przed publicznym wydaniem
Ustaw Microsoft Client ID, potwierdz wersje Minecrafta/loadera/Java, wpisz adres serwera, opublikuj faktyczne mody i konfiguracje oraz przetestuj instalacje na czystym koncie Windows.
