; Interface settings are declared before electron-builder inserts the MUI pages.
!define MUI_BGCOLOR "130B20"
!define MUI_TEXTCOLOR "F8F1FF"
!define MUI_HEADER_TRANSPARENT_TEXT
!define MUI_INSTFILESPAGE_COLORS "E6A1F3 130B20"
!define MUI_INSTFILESPAGE_PROGRESSBAR "smooth colored"
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "INSTALACJA ZAKOŃCZONA"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "Kwadratowy Chaos jest gotowy do uruchomienia."
!define MUI_INSTFILESPAGE_ABORTHEADER_TEXT "INSTALACJA PRZERWANA"
!define MUI_INSTFILESPAGE_ABORTHEADER_SUBTEXT "Proces instalacji został zatrzymany."
!ifndef MUI_ABORTWARNING
  !define MUI_ABORTWARNING
!endif
!define MUI_ABORTWARNING_TEXT "Czy na pewno chcesz przerwać instalację Kwadratowego Chaosu?"
!define MUI_CUSTOMFUNCTION_GUIINIT "KC_InstallerGuiInit"
!define MUI_CUSTOMFUNCTION_UNGUIINIT "un.KC_UninstallerGuiInit"

!macro customHeader
  ; All wizard surfaces and standard navigation buttons use the launcher palette.
  Function KC_InstallerGuiInit
    SetCtlColors $HWNDPARENT "" "130B20"
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

  ; These callbacks belong only to the installer build. electron-builder
  ; compiles the uninstaller first with BUILD_UNINSTALLER defined.
  !ifndef BUILD_UNINSTALLER
    ; This page is the install-scope selection inserted after Welcome.
    Function KC_InstallModePageShow
      SetCtlColors $MultiUser.InstallModePage "" "130B20"
      SetCtlColors $MultiUser.InstallModePage.Text "F8F1FF" "130B20"
      SetCtlColors $MultiUser.InstallModePage.AllUsers "F8F1FF" "130B20"
      SetCtlColors $MultiUser.InstallModePage.CurrentUser "F8F1FF" "130B20"
      SetCtlColors $RadioButtonLabel1 "DCC8EB" "130B20"
    FunctionEnd

    ; The progress page shows the live NSIS file operation log on a dark surface.
    Function KC_InstallFilesPageShow
      SetCtlColors $mui.InstFilesPage "" "130B20"
      SetCtlColors $mui.InstFilesPage.Text "F8F1FF" "130B20"
      SetCtlColors $mui.InstFilesPage.Log "F8F1FF" "130B20"
      SetCtlColors $mui.InstFilesPage.ShowLogButton "FFFFFF" "9145C8"
    FunctionEnd
  !endif
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Witaj w Kwadratowym Chaosie"
  !define MUI_WELCOMEPAGE_TEXT "Twój świat zaczyna się tutaj.$\r$\n$\r$\nZainstaluj oficjalny launcher, aby uruchamiać Minecrafta, synchronizować mody i zarządzać ustawieniami w jednym miejscu.$\r$\n$\r$\nKliknij Dalej, aby przygotować instalację."
  !insertmacro MUI_PAGE_WELCOME

  ; This callback is consumed by electron-builder's install-scope selection page.
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW "KC_InstallModePageShow"

  !define MUI_DIRECTORYPAGE_TEXT_TOP "Wybierz miejsce dla swojego launchera."
  !define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Folder instalacji:"
  !define MUI_DIRECTORYPAGE_BGCOLOR "291638"
  !define MUI_DIRECTORYPAGE_TEXTCOLOR "F8F1FF"
!macroend

; electron-builder inserts this hook after the folder page and before the progress page.
!macro customPageAfterChangeDir
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW "KC_InstallFilesPageShow"
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Odinstaluj Kwadratowy Chaos"
  !define MUI_WELCOMEPAGE_TEXT "Czy na pewno chcesz usunąć launcher Kwadratowy Chaos z tego komputera?$\r$\n$\r$\nUstawienia i dane gry zapisane poza folderem aplikacji pozostaną bez zmian."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
