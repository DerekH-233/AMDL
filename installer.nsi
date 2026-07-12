; AMDL - Apple Music Downloader Windows Installer

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define PRODUCT_NAME "AMDL"
!define PRODUCT_VERSION "1.0.4"
!define PRODUCT_PUBLISHER "AMDL"
!define PRODUCT_WEB_SITE "https://github.com/DerekH-233/AMDL"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\AMDL.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
!ifdef PRODUCT_OUTFILE
OutFile "${PRODUCT_OUTFILE}"
!else
OutFile "dist\AMDL_Setup_v${PRODUCT_VERSION}.exe"
!endif
InstallDir "$PROGRAMFILES\AMDL"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
RequestExecutionLevel admin
SetCompressor /SOLID lzma
ShowInstDetails show
ShowUnInstDetails show

!define MUI_ABORTWARNING
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"

!define MUI_WELCOMEPAGE_TITLE "AMDL - Apple Music Downloader"
!define MUI_WELCOMEPAGE_TEXT "Welcome to AMDL Setup.$\r$\n$\r$\nA beautiful Apple Music downloader with Web UI.$\r$\n$\r$\nRequires a valid Apple Music subscription."
!define MUI_FINISHPAGE_RUN "$INSTDIR\AMDL_Launcher.bat"
!define MUI_FINISHPAGE_RUN_TEXT "Launch AMDL"
!define MUI_FINISHPAGE_LINK "Visit GitHub Project"
!define MUI_FINISHPAGE_LINK_LOCATION "${PRODUCT_WEB_SITE}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Main" SEC01
  SetOutPath "$INSTDIR"

  File "dist\AMDL.exe"
  !ifndef LITE_VERSION
  File "ffmpeg.exe"
  !endif

  ; Create launcher batch with UTF-8 support
  FileOpen $0 "$INSTDIR\AMDL_Launcher.bat" w
  FileWrite $0 "@echo off$\r$\n"
  FileWrite $0 "chcp 65001 >nul$\r$\n"
  FileWrite $0 "set PYTHONUTF8=1$\r$\n"
  FileWrite $0 "start $\"$\" $\"$INSTDIR\AMDL.exe$\"$\r$\n"
  FileClose $0

  ; Start Menu & Desktop shortcuts
  CreateDirectory "$SMPROGRAMS\AMDL"
  CreateShortCut "$SMPROGRAMS\AMDL\AMDL.lnk" "$INSTDIR\AMDL_Launcher.bat" "" "$INSTDIR\AMDL.exe" 0
  CreateShortCut "$DESKTOP\AMDL.lnk" "$INSTDIR\AMDL_Launcher.bat" "" "$INSTDIR\AMDL.exe" 0

  ; Registry
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\AMDL.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "NoRepair" 1

  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "EstimatedSize" "$0"

  WriteUninstaller "$INSTDIR\uninst.exe"
SectionEnd

Section Uninstall
  Delete "$INSTDIR\AMDL.exe"
  Delete "$INSTDIR\AMDL_Launcher.bat"
  !ifndef LITE_VERSION
  Delete "$INSTDIR\ffmpeg.exe"
  !endif
  Delete "$INSTDIR\uninst.exe"
  RMDir "$INSTDIR"

  Delete "$SMPROGRAMS\AMDL\AMDL.lnk"
  RMDir "$SMPROGRAMS\AMDL"
  Delete "$DESKTOP\AMDL.lnk"

  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"

  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Remove downloaded files and user config?$\r$\n(Includes ~\.amdl\ and Music\Apple Music folders)" \
    IDNO skip_userdata
    RMDir /r "$PROFILE\.amdl"
    RMDir /r "$PROFILE\Music\Apple Music"
  skip_userdata:
SectionEnd

Function .onInit
  ReadRegStr $0 HKLM "${PRODUCT_UNINST_KEY}" "UninstallString"
  StrCmp $0 "" done
  MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
    "AMDL is already installed.$\r$\nClick OK to uninstall the old version first." \
    IDOK uninst
  Abort
uninst:
  ExecWait '$0 /S _?=$INSTDIR'
done:
FunctionEnd
