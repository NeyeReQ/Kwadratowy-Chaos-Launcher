# Kwadratowy Chaos Launcher

Desktopowy launcher Minecraft dla społeczności **Kwadratowy Chaos**. Aplikacja Windows oparta na Electron, React i TypeScript.

## Co jest w projekcie

- Nowoczesny, ciemny interfejs launchera.
- Logowanie Microsoft przez Device Code Flow (bez wpisywania hasła w aplikacji).
- Osobny katalog gry, niezależny od oficjalnego launchera.
- Konfiguracja RAM i ścieżki Java.
- Instalowanie Minecrafta i Fabric.
- Automatyczna synchronizacja paczki przed uruchomieniem gry.
- Sprawdzanie plików przez SHA-512 i pobieranie tylko brakujących lub zmienionych modów.
- Usuwanie wyłącznie plików, które launcher wcześniej zarejestrował jako zarządzane.
- Aktualizacje samego launchera przez GitHub Releases.
- Workflow GitHub Actions do budowania instalatora Windows.

## Automatyczne aktualizacje paczki

Źródłem prawdy jest [launcher/manifest.json](launcher/manifest.json). Każdy plik paczki ma ścieżkę, adres HTTPS i sumę SHA-512. Przy każdym kliknięciu **Graj** launcher pobiera bieżący manifest, weryfikuje lokalne pliki, aktualizuje różnice i dopiero wtedy uruchamia Minecrafta.

Nie trzeba ręcznie aktualizować modów na komputerze gracza. Administrator publikuje nową paczkę i manifest; klient synchronizuje ją automatycznie.

## Stan bieżący

To pierwsza wersja szkieletowa. Manifest startowy ma pustą listę plików (`files: []`), nie zawiera jeszcze właściwych modów ani adresu serwera. Manifest wskazuje teraz Minecraft Java 26.3, Java 25 i Fabric Loader 0.20.1; przed publicznym wydaniem trzeba jeszcze przetestować instalację gry. Microsoft Client ID również wymaga konfiguracji. Launcher nie jest jeszcze gotowym publicznym instalatorem.

Obecnie aktywna ścieżka instalacji gry obsługuje **Vanilla i Fabric**. Forge/NeoForge wymagają osobnego wdrożenia.

## Dokumentacja

Instrukcja ustawienia OAuth, manifestu paczki, hostingu plików i budowania instalatora: [docs/SETUP.md](docs/SETUP.md).
