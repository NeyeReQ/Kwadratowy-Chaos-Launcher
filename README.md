# Kwadratowy Chaos Launcher

Desktopowy launcher Minecraft dla społeczności **Kwadratowy Chaos**. Aplikacja Windows oparta na Electron, React i TypeScript.

## Co jest w projekcie

- Nowoczesny, ciemny interfejs launchera.
- Logowanie i końcowe uruchamianie gry w **oficjalnym Minecraft Launcherze** — bez własnego OAuth, Azure, Client ID i przechowywania tokenów.
- Przygotowanie instalacji Minecraft Java i Fabric w standardowym katalogu `.minecraft`.
- Automatyczne tworzenie profilu **Kwadratowy Chaos** w oficjalnym launcherze.
- Osobny katalog danych gry na mody, konfiguracje, światy i screenshoty.
- Ustawienie pamięci RAM zapisywane w profilu oficjalnego launchera.
- Automatyczna synchronizacja paczki przed przygotowaniem gry.
- Sprawdzanie plików przez SHA-512 i pobieranie tylko brakujących lub zmienionych modów.
- Usuwanie wyłącznie plików, które launcher wcześniej zarejestrował jako zarządzane.
- Darmowe publikowanie plików paczki jako assetów GitHub Releases.
- Aktualizacje samego launchera przez GitHub Releases.
- Workflow GitHub Actions do budowania instalatora Windows.

## Jak wygląda uruchamianie gry

1. Gracz klika **Przygotuj grę** w Kwadratowym Chaosie.
2. Launcher pobiera manifest i synchronizuje mody.
3. Przygotowuje wersję Minecrafta i Fabric oraz rejestruje profil `Kwadratowy Chaos` w oficjalnym Minecraft Launcherze.
4. Otwiera oficjalny launcher. Gracz loguje się tam na swoje konto Microsoft, wybiera profil **Kwadratowy Chaos** i klika **Graj**.

Launcher Kwadratowego Chaosu nie prosi o hasło Microsoft i nie przechowuje sesji gracza.

## Automatyczne aktualizacje paczki

Źródłem prawdy jest [launcher/manifest.json](launcher/manifest.json). Każdy plik paczki ma ścieżkę, bezpośredni adres HTTPS, rozmiar i sumę SHA-512. Przy każdym kliknięciu **„Sprawdź mody i otwórz launcher”** lub **„Przygotuj grę”** aplikacja pobiera bieżący manifest i aktualizuje wyłącznie nowe lub zmienione pliki. Niezmienione JAR-y nie są pobierane ponownie.

Administrator publikuje nowy zestaw plików jako kolejny GitHub Release i zapisuje zaktualizowany manifest w repozytorium. Gracze nie pobierają ponownie instalatora ani całej paczki — aktualizacje modów pobierają się automatycznie przy następnym użyciu launchera. Pliki usunięte z paczki są usuwane z katalogu zarządzanego przez launcher, a światy i pozostałe prywatne pliki gracza zostają zachowane.

Szczegółowa procedura: [docs/SETUP.md](docs/SETUP.md).

## Bieżąca konfiguracja

- Minecraft Java Edition: `26.3`
- Fabric Loader: `0.20.1`
- Wersja paczki: `0.2.0`
- Pliki w manifeście: `79`

Przepływ oficjalnego launchera został właśnie wdrożony w kodzie, ale trzeba jeszcze wykonać test end-to-end na komputerze z oficjalnym Minecraft Launcherem. Obsługiwane są Vanilla i Fabric; Forge/NeoForge nie są jeszcze wdrożone.

## Dokumentacja

Instrukcja hostingu plików, publikowania manifestu i budowania instalatora: [docs/SETUP.md](docs/SETUP.md).
