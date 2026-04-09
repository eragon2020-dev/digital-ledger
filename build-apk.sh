#!/bin/bash

# APK Build Script for Digital Ledger App
# Usage: ./build-apk.sh [local|eas]

set -e

echo "========================================"
echo "  Digital Ledger - APK Build Script"
echo "========================================"
echo ""

BUILD_TYPE="${1:-eas}"

case "$BUILD_TYPE" in
  local)
    echo "Building APK locally..."
    echo ""
    
    # Prebuild native project
    echo "Step 1: Running expo prebuild..."
    npx expo prebuild --platform android --clean
    
    # Build APK locally
    echo ""
    echo "Step 2: Building APK..."
    cd android && ./gradlew assembleRelease
    
    echo ""
    echo "========================================"
    echo "  APK build complete!"
    echo "  Location: android/app/build/outputs/apk/release/"
    echo "========================================"
    ;;
    
  eas)
    echo "Building APK via EAS Build (Cloud)..."
    echo ""
    echo "This will upload your project to EAS servers and build an APK."
    echo "The APK will be available for download when complete."
    echo ""
    
    npx eas build --platform android --profile preview
    
    echo ""
    echo "========================================"
    echo "  Build submitted!"
    echo "  Check the output above for download link."
    echo "========================================"
    ;;
    
  *)
    echo "Usage: $0 [local|eas]"
    echo ""
    echo "  local  - Build APK locally (requires Android SDK)"
    echo "  eas    - Build APK via EAS Build cloud service (default)"
    echo ""
    exit 1
    ;;
esac
