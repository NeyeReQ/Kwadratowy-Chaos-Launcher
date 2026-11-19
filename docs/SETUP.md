# Konfiguracja launchera

## Wymagania
- Windows 10/11 x64
- Node.js 22 lub 24 LTS do developmentu (obecny stos Electron 39 nie jest testowany na Node.js 26)
- GitHub CLI (darmowe narzedzie do publikowania assetow Release)
- Konto Microsoft z licencja Minecraft: Java Edition
- Oficjalny Minecraft Launcher (sam pobiera odpowiednie środowisko Java)

## Logowanie i uruchamianie gry

Launcher nie przechowuje danych logowania i nie wykonuje własnego OAuth. Gracz loguje się w oficjalnym Minecraft Launcherze. Kwadratowy Chaos przygotowuje profil Fabric w `%APPDATA%\\.minecraft\\launcher_profiles.json`, a mody i konfiguracje zapisuje w osobnym katalogu danych paczki. W oficjalnym launcherze wybierz profil **Kwadratowy Chaos** i kliknij **Graj**.

Przed przygotowaniem profilu zamknij oficjalny Minecraft Launcher, aby nie nadpisał pliku `launcher_profiles.json`. Po przygotowaniu Kwadratowy Chaos może otworzyć oficjalną aplikację, jeśli jest zainstalowana.

## Wersja Minecrafta
Biezacy manifest jest ustawiony na Minecraft Java Edition `26.3` i Fabric Loader `0.20.1`. Oficjalny Minecraft Launcher zarzadza swoim srodowiskiem Java. Jesli zmienisz wersje serwera, zaktualizuj `minecraftVersion` i `loader.version`. Aktualnie aktywne sa vanilla i Fabric; Forge/NeoForge nie sa jeszcze obslugiwane.

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
   Generator wyliczy SHA-512 i bezposrednie URL-e do assetow release `pack-v0.2.0`. Nazwy assetow beda splaszczone i oczyszczone z nawiasow, spacji i znakow specjalnych (np. `mods__Only_Jugs_1.8.1_.jar`), ale launcher zapisze pliki w oryginalnych katalogach. Jesli publikacja przerwie sie w trakcie, ten sam skrypt wznowi istniejący roboczy Release i nadpisze juz wyslane assety.
6. Opublikuj pliki paczki:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\tools\publish-pack-release.ps1
   ```
   Skrypt utworzy roboczy release, wysle pliki i opublikuje go jako **pre-release** dopiero po zakonczeniu uploadu. To wazne: release `pack-v...` zawiera mody, a nie aktualizacje programu.
7. Wyslij manifest do repozytorium:
   ```powershell
   git add launcher/manifest.json
   git commit -m "Publish modpack 0.2.0"
   git push origin main
   ```

Nie dodawaj zawartosci folderu `pack/` do zwyklych commitow Git — folder jest celowo ignorowany. Jesli pojedynczy plik ma 2 GiB lub wiecej albo paczka ma ponad 1000 plikow, trzeba podzielic publikacje na wiecej release'ow i dostosowac generator manifestu.

### Jak aktualizować mody bez ponownego instalowania launchera

To jest niezależne od aktualizacji samej aplikacji. Gracze **nie pobierają ponownie instalatora** i nie muszą ręcznie pobierać modów.

1. Dodaj nowe pliki do `pack/mods/`, podmień istniejące JAR-y albo usuń te, których nie ma już być. Tak samo możesz aktualizować pliki w `config/`, `resourcepacks/` itd.
2. Zwiększ `packVersion` w `launcher/manifest.json`, np. z `0.2.0` na `0.2.1`.
3. W terminalu VS Code uruchom:
   ```powershell
   $env:PACK_VERSION = "0.2.1"
   npm.cmd run manifest:build
   powershell -ExecutionPolicy Bypass -File .\tools\publish-pack-release.ps1
   git add launcher/manifest.json
   git commit -m "Publish modpack 0.2.1"
   git push origin main
   ```
   Wstaw ten sam nowy numer wersji w trzech miejscach. Najpierw publikowane są pliki Release, a potem manifest, który wskazuje na te pliki.
4. Gracz zamyka Minecrafta i przy następnym użyciu launchera klika **„Sprawdź mody i otwórz launcher”** albo **„Przygotuj grę”**.

Launcher pobiera najnowszy manifest z GitHuba i porównuje SHA-512 każdego lokalnego pliku. Pobiera tylko nowe lub zmienione pliki, a niezmienione pomija. Pliki usunięte z manifestu usuwa z komputera gracza tylko wtedy, gdy wcześniej były zarządzane przez launcher. Światy, screenshoty, logi i inne pliki użytkownika pozostają nietknięte. Zmiana samych modów **nie wymaga nowej wersji instalatora ani aktualizacji launchera**.

### Jednorazowa naprawa starszego release paczki

Starsze wydanie `pack-v0.2.0` mogło zostać opublikowane jako zwykły release. Wtedy GitHub uznaje je za najnowsze wydanie i `electron-updater` próbuje znaleźć w nim plik `latest.yml`, którego paczka modów nie zawiera.

W terminalu PowerShell wykonaj jednorazowo:
```powershell
gh release edit pack-v0.2.0 --prerelease --repo NeyeReQ/Kwadratowy-Chaos-Launcher
```

Po tej zmianie GitHub przestanie traktować paczkę modów jako stabilne wydanie programu. W przyszłości skrypt publikujący mody sam oznaczy każdy `pack-v...` jako pre-release. Wydania launchera `v...` pozostają zwykłymi, stabilnymi release'ami i zawierają `latest.yml`.

### Jak opublikować aktualizację samego launchera

Po pobraniu zmian z repozytorium:
```powershell
git pull origin main
git tag v0.1.11
git push origin v0.1.110
```
GitHub Actions zbuduje instalator Windows x64 i opublikuje go w GitHub Releases. Każdy push na `main` buduje też testowy instalator jako artefakt Actions. Zwiększ numer `version` w `package.json` i użyj odpowiedniego tagu `v...` dla kolejnej wersji aplikacji. Zainstalowane, spakowane wydania launchera sprawdzają aktualizacje przez Electron Updater; gracze nie muszą ręcznie pobierać nowego instalatora przy kolejnych aktualizacjach aplikacji.


### Aktualizacje launchera bez plików `.blockmap`
Od wersji `0.1.9` aktualizator pobiera pełny instalator NSIS w tle, bez aktualizacji różnicowych. Wydania zawierają tylko instalator `.exe` oraz `latest.yml`; `differentialPackage: false` i `autoUpdater.disableDifferentialDownload = true` wyłączają mechanizm `.blockmap`. Aktualizacje nadal instalują się automatycznie po zamknięciu aplikacji, ale zużywają więcej transferu niż aktualizacje różnicowe.

## Podpis cyfrowy i ostrzeżenia Windows (SmartScreen)

Pierwszy instalator z GitHub Releases będzie niepodpisany, dopóki nie zostanie dodany zaufany certyfikat podpisywania kodu. W takiej sytuacji Windows może pokazać komunikat „Windows ochronił Twój komputer” albo „Nieznany wydawca”. To nie oznacza automatycznie, że plik jest złośliwy — oznacza, że Microsoft nie ma jeszcze podstaw, by ufać wydawcy lub reputacji tego pliku.

Nie da się legalnie i rzetelnie wyłączyć tego ostrzeżenia samą zmianą nazwy, ikony, ustawień NSIS czy dodaniem własnoręcznie wygenerowanego certyfikatu. Certyfikat self-signed zachowuje się w SmartScreen podobnie jak brak podpisu. Nawet prawidłowy certyfikat OV/EV nie gwarantuje braku ostrzeżenia przy pierwszych pobraniach; reputacja może narastać z czasem. Nie należy obiecywać graczom, że SmartScreen na pewno zniknie. 

Jeśli kiedyś kupisz zaufany certyfikat Code Signing w formacie PFX/P12, workflow obsługuje go opcjonalnie:
1. W repozytorium otwórz **Settings → Secrets and variables → Actions**.
2. Dodaj sekret `WIN_CSC_LINK` z certyfikatem PFX/P12 zakodowanym jako Base64 (bezpieczniej przechowywać go jako sekret niż dodawać do repozytorium).
3. Dodaj sekret `WIN_CSC_KEY_PASSWORD` z hasłem do certyfikatu.
4. Ponowne zbudowanie instalatora przez GitHub Actions automatycznie użyje certyfikatu do podpisu.

Nigdy nie commituj pliku PFX/P12 ani hasła do GitHuba. Bez certyfikatu workflow nadal zbuduje normalny instalator NSIS, ale będzie on niepodpisany. Podpis może pokazać zweryfikowaną nazwę wydawcy i potwierdza, że plik nie został zmieniony po podpisaniu; nie jest gwarancją braku ostrzeżenia SmartScreen.

## Uruchomienie i build
```powershell
npm install
npm run dev
npm run typecheck
npm run dist:win
```
Instalator NSIS powstaje w `release/`.

## Aktualizacje launchera
Wypchnij tag `v0.1.11`. GitHub Actions zbuduje instalator x64 i opublikuje Release. Electron Updater sprawdza aktualizacje opublikowane przez GitHub Releases. Workflow wymaga Actions i uprawnien `contents: write`.

## Przed publicznym wydaniem
Potwierdz wersje Minecrafta/loadera/Java, wpisz adres serwera, opublikuj faktyczne mody i konfiguracje oraz przetestuj instalacje na czystym koncie Windows z oficjalnym Minecraft Launcherem.
