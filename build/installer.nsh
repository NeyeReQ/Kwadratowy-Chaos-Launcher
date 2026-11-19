!macro customHeader
  ; One dark violet/pink theme for every MUI page.
  !define MUI_BGCOLOR "130B20"
  !define MUI_TEXTCOLOR "F8F1FF"
  !define MUI_HEADERIMAGE
  !define MUI_HEADER_TRANSPARENT_TEXT
  !define MUI_INSTFILESPAGE_COLORS "E6A1F3 130B20"
  !define MUI_INSTFILESPAGE_PROGRESSBAR "smooth colored"
  !define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "INSTALACJA ZAKOŃCZONA"
  !define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "Kwadratowy Chaos jest gotowy do uruchomienia."
  !define MUI_INSTFILESPAGE_ABORTHEADER_TEXT "INSTALACJA PRZERWANA"
  !define MUI_INSTFILESPAGE_ABORTHEADER_SUBTEXT "Proces instalacji został zatrzymany."
  !define MUI_ABORTWARNING
  !define MUI_ABORTWARNING_TEXT "Czy na pewno chcesz przerwać instalację Kwadratowego Chaosu?"
  !define MUI_CUSTOMFUNCTION_GUIINIT "KC_InstallerGuiInit"
  !define MUI_CUSTOMFUNCTION_UNGUIINIT "un.KC_UninstallerGuiInit"
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Witaj w Kwadratowym Chaosie"
  !define MUI_WELCOMEPAGE_TEXT "Twój świat zaczyna się tutaj.$\r$\n$\r$\nZainstaluj oficjalny launcher, aby uruchamiać Minecrafta, synchronizować mody i zarządzać ustawieniami w jednym miejscu.$\r$\n$\r$\nKliknij Dalej, aby przygotować instalację."
  !insertmacro MUI_PAGE_WELCOME

  ; The next page in electron-builder's assisted installer is the folder picker.
  !define MUI_DIRECTORYPAGE_TEXT_TOP "Wybierz miejsce dla swojego launchera."
  !define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Folder instalacji:"
  !define MUI_DIRECTORYPAGE_BGCOLOR "291638"
  !define MUI_DIRECTORYPAGE_TEXTCOLOR "F8F1FF"
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW "KC_DirectoryPageShow"
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Odinstaluj Kwadratowy Chaos"
  !define MUI_WELCOMEPAGE_TEXT "Czy na pewno chcesz usunąć launcher Kwadratowy Chaos z tego komputera?$\\r$\\n$\\r$\\nUstawienia i dane gry zapisane poza folderem aplikacji pozostaną bez zmian."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

Function KC_InstallerGuiInit
  ; Darken the wizard surface itself, not only the sidebar artwork.
  SetCtlColors $HWNDPARENT "" "130B20"

  ; Match the standard wizard navigation buttons to the launcher's palette.
  GetDlgItem $0 $HWNDPARENT 1
  SetCtlColors $0 "FFFFFF" "9145C8"
  GetDlgItem $0 $HWNDPARENT 2
  SetCtlColors $0 "F8F1FF" "38234B"
  GetDlgItem $0 $HWNDPARENT 3
  SetCtlColors $0 "F8F1FF" "38234B"
FunctionEnd

Function un.KC_UninstallerGuiInit
  SetCtlColors $HWNDPARENT "" "130B20"
  GetDlgItem $0 $HWNDPARENT 1
  SetCtlColors $0 "FFFFFF" "9145C8"
  GetDlgItem $0 $HWNDPARENT 2
  SetCtlColors $0 "F8F1FF" "38234B"
  GetDlgItem $0 $HWNDPARENT 3
  SetCtlColors $0 "F8F1FF" "38234B"
FunctionEnd

Function KC_DirectoryPageShow
  ; The directory page is a separate dialog inside the wizard.
  FindWindow $0 "#32770" "" $HWNDPARENT
  SetCtlColors $0 "" "130B20"

  GetDlgItem $1 $0 1006
  SetCtlColors $1 "F8F1FF" "130B20"

  GetDlgItem $1 $0 1020
  SetCtlColors $1 "E4B7F3" "130B20"

  GetDlgItem $1 $0 1019
  SetCtlColors $1 "FFFFFF" "291638"

  GetDlgItem $1 $0 1001
  SetCtlColors $1 "FFFFFF" "9145C8"

  GetDlgItem $1 $0 1023
  SetCtlColors $1 "DCC8EB" "130B20"

  GetDlgItem $1 $0 1024
  SetCtlColors $1 "DCC8EB" "130B20"
FunctionEnd
