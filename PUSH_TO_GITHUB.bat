@echo off
title Nila's Treat - GitHub Upload
cd /d "%~dp0"
cls
echo ================================================================
echo       Nila's Treat - GitHub Repository Uploader
echo       Repository: https://github.com/santhosh1062007p-bit/Nila.git
echo       Branch:     main
echo ================================================================
echo.
echo Pushing your latest code to GitHub...
echo.

git push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo ================================================================
    echo  SUCCESS! All code has been uploaded to your GitHub repository!
    echo  View it at: https://github.com/santhosh1062007p-bit/Nila
    echo ================================================================
) else (
    echo ================================================================
    echo  GitHub authentication required!
    echo  If browser window opened, click "Sign in with browser".
    echo  Or generate a Personal Access Token at:
    echo  https://github.com/settings/tokens
    echo ================================================================
)
echo.
pause
