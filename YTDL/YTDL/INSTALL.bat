@echo off
title Lord of Frogs - Installation
color 0A
echo.
echo ============================================================
echo   LORD OF FROGS v4.0 - Installation
echo   Clic droit - Executer en ADMINISTRATEUR
echo ============================================================
echo.
pause

echo [1/3] yt-dlp...
if not exist "C:\yt-dlp" mkdir "C:\yt-dlp"
curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -o "C:\yt-dlp\yt-dlp.exe"
if not exist "C:\yt-dlp\yt-dlp.exe" powershell -NoProfile -Command "Invoke-WebRequest 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile 'C:\yt-dlp\yt-dlp.exe'"
"C:\yt-dlp\yt-dlp.exe" -U
echo     OK

echo [2/3] aria2c (telechargeur multi-thread, beaucoup plus rapide)...
if not exist "C:\yt-dlp\aria2c.exe" (
    curl -L "https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip" -o "%TEMP%\aria2.zip"
    if exist "%TEMP%\aria2.zip" (
        powershell -NoProfile -Command "Expand-Archive '%TEMP%\aria2.zip' '%TEMP%\aria2ext' -Force"
        for /r "%TEMP%\aria2ext" %%f in (aria2c.exe) do copy /Y "%%f" "C:\yt-dlp\aria2c.exe" >nul
        rd /s /q "%TEMP%\aria2ext" >nul 2>&1
        del "%TEMP%\aria2.zip" >nul 2>&1
        if exist "C:\yt-dlp\aria2c.exe" ( echo     aria2c OK ) else ( echo     aria2c echec )
    )
) else ( echo     aria2c deja installe )

echo [3/3] Node.js (requis par yt-dlp pour YouTube 2025)...
node --version >nul 2>&1
if errorlevel 1 (
    echo     Node.js absent - telechargement...
    curl -L "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi" -o "%TEMP%\node.msi"
    if exist "%TEMP%\node.msi" (
        msiexec /i "%TEMP%\node.msi" /quiet /norestart ADDLOCAL=ALL
        del "%TEMP%\node.msi" >nul 2>&1
        echo     Node.js installe - redemarrez Windows si besoin
    )
) else (
    echo     Node.js deja installe :
    node --version
)

echo [3/3] ffmpeg...
curl -L "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -o "%TEMP%\ff.zip"
if not exist "%TEMP%\ff.zip" powershell -NoProfile -Command "Invoke-WebRequest 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile '%TEMP%\ff.zip'"
if exist "%TEMP%\ff.zip" (
    powershell -NoProfile -Command "Expand-Archive '%TEMP%\ff.zip' '%TEMP%\ffx' -Force"
    for /r "%TEMP%\ffx" %%f in (ffmpeg.exe)  do copy /Y "%%f" "C:\yt-dlp\ffmpeg.exe"  >nul
    for /r "%TEMP%\ffx" %%f in (ffprobe.exe) do copy /Y "%%f" "C:\yt-dlp\ffprobe.exe" >nul
    rd /s /q "%TEMP%\ffx" >nul 2>&1
    del "%TEMP%\ff.zip"   >nul 2>&1
)
echo     OK

echo [3/3] Plugin After Effects...
set "CEP=%APPDATA%\Adobe\CEP\extensions"
if not exist "%CEP%" mkdir "%CEP%"
set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"
for %%d in (YTDownloader-AE YTDL com.ytdl.ae com.ytdl.ae2 com.ytdl.ae3 com.ytdl.ae4 com.yt2ae.v6 com.lordoffrogs.ae com.lordoffrogs.v4) do (
    if exist "%CEP%\%%d" rd /s /q "%CEP%\%%d" >nul 2>&1
)
mkdir "%CEP%\YTDL" 2>nul
xcopy "%SRC%\*" "%CEP%\YTDL\" /E /I /Y /Q
reg add "HKCU\SOFTWARE\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\SOFTWARE\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\SOFTWARE\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\SOFTWARE\Adobe\CSXS.9"  /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
echo     OK

echo.
echo ============================================================
if exist "C:\yt-dlp\yt-dlp.exe"  echo   [OK] yt-dlp
if exist "C:\yt-dlp\ffmpeg.exe"  echo   [OK] ffmpeg
if exist "%CEP%\YTDL\index.html" echo   [OK] Plugin
echo.
echo   Fermez et relancez After Effects
echo   Fenetre > Extensions > Lord of Frogs
echo ============================================================
pause
