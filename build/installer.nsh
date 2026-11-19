; Kwadratowy Chaos - dark violet / pink NSIS skin.
; Define global colors before Modern UI pages are inserted.
!define KC_COLOR_BG "11091E"
!define KC_COLOR_PANEL "1B112C"
!define KC_COLOR_FIELD "211532"
!define KC_COLOR_TEXT "E6D9FF"
!define KC_COLOR_MUTED "CDBBE8"
!define KC_COLOR_PRIMARY "A36CFF"
!define KC_COLOR_PINK "D75DC9"
!define KC_COLOR_BUTTON_ALT "352442"

!define MUI_BGCOLOR "\${KC_COLOR_BG}"
!define MUI_TEXTCOLOR "\${KC_COLOR_TEXT}"
!define MUI_HEADER_TRANSPARENT_TEXT
!define MUI_INSTFILESPAGE_COLORS "DDAFF8 \${KC_COLOR_BG}"
!define MUI_INSTFILESPAGE_PROGRESSBAR "smooth colored"
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "OPERACJA ZAKOŃCZONA"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "Kwadratowy Chaos jest gotowy."
!define MUI_INSTFILESPAGE_ABORTHEADER_TEXT "OPERACJA PRZERWANA"
!define MUI_INSTFILESPAGE_ABORTHEADER_SUBTEXT "Proces został zatrzymany przed zakończeniem."
!ifndef MUI_ABORTWARNING
  !define MUI_ABORTWARNING
!endif
!define MUI_ABORTWARNING_TEXT "Czy na pewno chcesz przerwać instalację Kwadratowego Chaosu?"
!define MUI_UNABORTWARNING
!define MUI_UNABORTWARNING_TEXT "Czy na pewno chcesz przerwać odinstalowywanie Kwadratowego Chaosu?"
!define MUI_CUSTOMFUNCTION_GUIINIT "KC_InstallerGuiInit"
!define MUI_CUSTOMFUNCTION_UNGUIINIT "un.KC_UninstallerGuiInit"

Var KC_InstallerButtonFont

!macro customHeader
  ; The Modern UI creates the outer navigation buttons before these callbacks run.
  ; Remove Windows' dark/light native theme so SetCtlColors also controls button text.
  Function KC_InstallerGuiInit
    SetCtlColors $HWNDPARENT "" "\${KC_COLOR_BG}"
    Call KC_StyleWizardButtons
  FunctionEnd

  Function KC_StyleWizardButtons
    CreateFont $KC_InstallerButtonFont "$(^Font)" "9" "700"

    ; Primary action: Next / Install / Finish, using the launcher's Start purple.
    GetDlgItem $0 $HWNDPARENT 1
    System::Call 'UXTHEME::SetWindowTheme(p$0,w" ",w" ")'
    SetCtlColors $0 "FFFFFF" "\${KC_COLOR_PRIMARY}"
    SendMessage $0 \${WM_SETFONT} $KC_InstallerButtonFont 1

    ; Secondary actions: Back and Cancel on a dark plum surface.
    GetDlgItem $0 $HWNDPARENT 2
    System::Call 'UXTHEME::SetWindowTheme(p$0,w" ",w" ")'
    SetCtlColors $0 "\${KC_COLOR_TEXT}" "\${KC_COLOR_BUTTON_ALT}"
    SendMessage $0 \${WM_SETFONT} $KC_InstallerButtonFont 1

    GetDlgItem $0 $HWNDPARENT 3
    System::Call 'UXTHEME::SetWindowTheme(p$0,w" ",w" ")'
    SetCtlColors $0 "\${KC_COLOR_TEXT}" "\${KC_COLOR_BUTTON_ALT}"
    SendMessage $0 \${WM_SETFONT} $KC_InstallerButtonFont 1
  FunctionEnd

  !ifdef BUILD_UNINSTALLER
    Function un.KC_UninstallerGuiInit
      SetCtlColors $HWNDPARENT "" "\${KC_COLOR_BG}"
      Call un.KC_StyleUninstallerButtons
    FunctionEnd

    Function un.KC_StyleUninstallerButtons
      CreateFont $KC_InstallerButtonFont "$(^Font)" "9" "700"

      GetDlgItem $0 $HWNDPARENT 1
      System::Call 'UXTHEME::SetWindowTheme(p$0,w" ",w" ")'
      SetCtlColors $0 "FFFFFF" "\${KC_COLOR_PRIMARY}"
      SendMessage $0 \${WM_SETFONT} $KC_InstallerButtonFont 1

      GetDlgItem $0 $HWNDPARENT 2
      System::Call 'UXTHEME::SetWindowTheme(p$0,w" ",w" ")'
      SetCtlColors $0 "\${KC_COLOR_TEXT}" "\${KC_COLOR_BUTTON_ALT}"
      SendMessage $0 \${WM_SETFONT} $KC_InstallerButtonFont 1

      GetDlgItem $0 $HWNDPARENT 3
      System::Call 'UXTHEME::SetWindowTheme(p$0,w" ",w" ")'
      SetCtlColors $0 "\${KC_COLOR_TEXT}" "\${KC_COLOR_BUTTON_ALT}"
      SendMessage $0 \${WM_SETFONT} $KC_InstallerButtonFont 1
    FunctionEnd
  !else
    ; Install-scope selection uses nsDialogs radio buttons. Windows' themed
    ; radio controls ignore SetCtlColors, so disable their theme before repaint.
    Function KC_InstallModePageShow
      SetCtlColors $MultiUser.InstallModePage "" "\${KC_COLOR_BG}"

      SetCtlColors $MultiUser.InstallModePage.Text "\${KC_COLOR_TEXT}" "\${KC_COLOR_BG}"
      SendMessage $MultiUser.InstallModePage.Text \${WM_SETFONT} $KC_InstallerButtonFont 0

      SetCtlColors $MultiUser.InstallModePage.AllUsers "\${KC_COLOR_TEXT}" "\${KC_COLOR_BG}"
      System::Call 'UXTHEME::SetWindowTheme(p$MultiUser.InstallModePage.AllUsers,w" ",w" ")'
      SendMessage $MultiUser.InstallModePage.AllUsers \${WM_SETFONT} $KC_InstallerButtonFont 1

      SetCtlColors $MultiUser.InstallModePage.CurrentUser "\${KC_COLOR_TEXT}" "\${KC_COLOR_BG}"
      System::Call 'UXTHEME::SetWindowTheme(p$MultiUser.InstallModePage.CurrentUser,w" ",w" ")'
      SendMessage $MultiUser.InstallModePage.CurrentUser \${WM_SETFONT} $KC_InstallerButtonFont 1

      SetCtlColors $RadioButtonLabel1 "\${KC_COLOR_MUTED}" "\${KC_COLOR_BG}"
    FunctionEnd

    ; Live extraction log and progress page: readable lavender text on deep purple.
    Function KC_InstallFilesPageShow
      SetCtlColors $mui.InstFilesPage "" "\${KC_COLOR_BG}"
      SetCtlColors $mui.InstFilesPage.Text "\${KC_COLOR_TEXT}" "\${KC_COLOR_BG}"
      SetCtlColors $mui.InstFilesPage.Log "\${KC_COLOR_TEXT}" "\${KC_COLOR_BG}"

      SetCtlColors $mui.InstFilesPage.ShowLogButton "\${KC_COLOR_TEXT}" "\${KC_COLOR_BUTTON_ALT}"
      System::Call 'UXTHEME::SetWindowTheme(p$mui.InstFilesPage.ShowLogButton,w" ",w" ")'
      SendMessage $mui.InstFilesPage.ShowLogButton \${WM_SETFONT} $KC_InstallerButtonFont 1

      Call KC_StyleWizardButtons
    FunctionEnd
  !endif
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Witaj w Kwadratowym Chaosie"
  !define MUI_WELCOMEPAGE_TEXT "Twój świat zaczyna się tutaj.$\\r$\\n$\\r$\\nZainstaluj oficjalny launcher, aby uruchamiać Minecrafta, synchronizować mody i zarządzać ustawieniami w jednym miejscu.$\\r$\\n$\\r$\\nKliknij Dalej, aby przygotować instalację."
  !insertmacro MUI_PAGE_WELCOME

  ; The next page is electron-builder's install-scope selector.
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW "KC_InstallModePageShow"

  !define MUI_DIRECTORYPAGE_TEXT_TOP "Wybierz miejsce dla swojego launchera."
  !define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Folder instalacji:"
  !define MUI_DIRECTORYPAGE_BGCOLOR "\${KC_COLOR_FIELD}"
  !define MUI_DIRECTORYPAGE_TEXTCOLOR "\${KC_COLOR_TEXT}"

  ; Replace the generic native button caption with the installer's Polish action.
  InstallButtonText "ZAINSTALUJ"
!macroend

; electron-builder inserts this macro after the directory page and before InstallFiles.
!macro customPageAfterChangeDir
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW "KC_InstallFilesPageShow"
  !define MUI_FINISHPAGE_TITLE "Kwadratowy Chaos jest gotowy!"
  !define MUI_FINISHPAGE_TEXT "Instalacja zakończona. Możesz już uruchomić launcher."
  !define MUI_FINISHPAGE_BUTTON "ZAKOŃCZ"
  !define MUI_FINISHPAGE_RUN_TEXT "Uruchom Kwadratowy Chaos"
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Odinstaluj Kwadratowy Chaos"
  !define MUI_WELCOMEPAGE_TEXT "Czy na pewno chcesz usunąć launcher Kwadratowy Chaos z tego komputera?$\\r$\\n$\\r$\\nUstawienia i dane gry zapisane poza folderem aplikacji pozostaną bez zmian."
  !insertmacro MUI_UNPAGE_WELCOME

  !define MUI_FINISHPAGE_TITLE "Kwadratowy Chaos został usunięty"
  !define MUI_FINISHPAGE_TEXT "Odinstalowywanie zakończone. Dziękujemy za korzystanie z launchera."
  !define MUI_FINISHPAGE_BUTTON "ZAMKNIJ"
!macroend
