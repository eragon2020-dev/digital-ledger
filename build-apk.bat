@echo off
echo ========================================
echo Building APK using EAS Build (Cloud)
echo ========================================
echo.
echo This will upload your project to EAS servers and build an APK.
echo The APK will be available for download when complete.
echo.
pause

npx eas build --platform android --profile preview

echo.
echo ========================================
echo Build complete! Check the output above for the download link.
echo ========================================
pause
