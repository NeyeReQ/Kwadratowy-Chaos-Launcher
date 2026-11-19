!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Witaj w Kwadratowym Chaosie"
  !define MUI_WELCOMEPAGE_TEXT "Zainstaluj oficjalny launcher i przygotuj się do wejścia na serwer.$\r$\n$\r$\nJedno miejsce do uruchamiania gry, synchronizacji modów i zarządzania ustawieniami.$\r$\n$\r$\nKliknij Dalej, aby rozpocząć instalację."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Odinstaluj Kwadratowy Chaos"
  !define MUI_WELCOMEPAGE_TEXT "Możesz usunąć aplikację Kwadratowy Chaos z tego komputera.$\r$\n$\r$\nUstawienia oraz dane przechowywane poza folderem aplikacji nie są usuwane przez sam instalator."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
