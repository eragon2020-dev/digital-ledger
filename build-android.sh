#!/bin/bash
set -e

echo "🔨 Building Android Release APK..."

# Step 1: Run expo prebuild
echo "📦 Running expo prebuild..."
npx expo prebuild --clean --platform android

# Step 2: Fix MainActivity.kt to remove SplashScreenManager
MAIN_ACTIVITY="android/app/src/main/java/com/digitalledger/app/MainActivity.kt"

if [ -f "$MAIN_ACTIVITY" ]; then
  echo "🔧 Fixing MainActivity.kt..."
  # Remove the entire expo-splashscreen generated block
  sed -i '/\/\/ @generated begin expo-splashscreen/,/\/\/ @generated end expo-splashscreen/d' "$MAIN_ACTIVITY"
  # Remove SplashScreenManager import
  sed -i '/import expo\.modules\.splashscreen\.SplashScreenManager/d' "$MAIN_ACTIVITY"
  # Remove leftover splash comments
  sed -i '/\/\/ Set the theme to AppTheme BEFORE onCreate/,/\/\/ This is required for expo-splash-screen\./d' "$MAIN_ACTIVITY"
  echo "✅ MainActivity.kt fixed"
fi

# Step 3: Fix ic_launcher_background.xml
IC_LAUNCHER="android/app/src/main/res/drawable/ic_launcher_background.xml"
if [ -f "$IC_LAUNCHER" ]; then
  echo "🔧 Fixing ic_launcher_background.xml..."
  cat > "$IC_LAUNCHER" << 'EOF'
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splashscreen_background"/>
</layer-list>
EOF
  echo "✅ ic_launcher_background.xml fixed"
fi

# Step 4: Delete splash_screen_view.xml if it exists
SPLASH_LAYOUT="android/app/src/main/res/layout/splash_screen_view.xml"
if [ -f "$SPLASH_LAYOUT" ]; then
  echo "🗑️ Deleting splash_screen_view.xml..."
  rm -f "$SPLASH_LAYOUT"
  echo "✅ splash_screen_view.xml deleted"
fi

# Step 5: Build release APK
echo "🏗️ Building release APK..."
cd android
./gradlew assembleRelease

echo ""
echo "✅ Build complete!"
echo "📱 APK: android/app/build/outputs/apk/release/app-release.apk"
