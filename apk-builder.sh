#!/bin/bash
set -e

echo "🔨 Expo Android APK Builder"
echo "=========================="

# --- Detect project root ---
PROJECT_ROOT="$(pwd)"

if [ ! -f "$PROJECT_ROOT/app.json" ]; then
  echo "❌ Error: app.json not found. Run this from your Expo project root."
  exit 1
fi

# --- Extract Android package name from app.json ---
PACKAGE_NAME=$(node -e "
  try {
    const cfg = require('$PROJECT_ROOT/app.json');
    const pkg = cfg.expo?.android?.package;
    if (!pkg) {
      console.error('❌ Error: android.package not set in app.json');
      process.exit(1);
    }
    console.log(pkg);
  } catch(e) {
    console.error('❌ Error reading app.json:', e.message);
    process.exit(1);
  }
")

if [ $? -ne 0 ]; then
  echo "$PACKAGE_NAME"
  exit 1
fi

# Convert package name to path (com.example.app -> com/example/app)
PACKAGE_PATH=$(echo "$PACKAGE_NAME" | tr '.' '/')

echo "📦 Package: $PACKAGE_NAME"
echo ""

# --- Step 1: Run expo prebuild ---
echo "📦 Running expo prebuild..."
npx expo prebuild --clean --platform android

# --- Step 2: Fix MainActivity.kt to remove SplashScreenManager ---
MAIN_ACTIVITY="android/app/src/main/java/$PACKAGE_PATH/MainActivity.kt"

if [ -f "$MAIN_ACTIVITY" ]; then
  echo "🔧 Fixing MainActivity.kt..."
  # Remove the entire expo-splashscreen generated block
  sed -i '/\/\/ @generated begin expo-splashscreen/,/\/\/ @generated end expo-splashscreen/d' "$MAIN_ACTIVITY"
  # Remove SplashScreenManager import
  sed -i '/import expo\.modules\.splashscreen\.SplashScreenManager/d' "$MAIN_ACTIVITY"
  # Remove leftover splash comments
  sed -i '/\/\/ Set the theme to AppTheme BEFORE onCreate/,/\/\/ This is required for expo-splash-screen\./d' "$MAIN_ACTIVITY"
  echo "  ✅ SplashScreenManager removed"
else
  echo "  ⚠️  MainActivity.kt not found at: $MAIN_ACTIVITY"
fi

# --- Step 3: Fix ic_launcher_background.xml ---
IC_LAUNCHER="android/app/src/main/res/drawable/ic_launcher_background.xml"
if [ -f "$IC_LAUNCHER" ]; then
  echo "🔧 Fixing ic_launcher_background.xml..."
  cat > "$IC_LAUNCHER" << 'EOF'
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splashscreen_background"/>
</layer-list>
EOF
  echo "  ✅ splashscreen_logo reference removed"
fi

# --- Step 4: Delete splash_screen_view.xml if it exists ---
SPLASH_LAYOUT="android/app/src/main/res/layout/splash_screen_view.xml"
if [ -f "$SPLASH_LAYOUT" ]; then
  echo "🗑️ Deleting splash_screen_view.xml..."
  rm -f "$SPLASH_LAYOUT"
  echo "  ✅ splash_screen_view.xml deleted"
fi

# --- Step 5: Disable lint for release builds ---
BUILD_GRADLE="android/build.gradle"
if [ -f "$BUILD_GRADLE" ]; then
  if ! grep -q "checkReleaseBuilds false" "$BUILD_GRADLE"; then
    echo "🔧 Disabling lint for release builds..."
    cat >> "$BUILD_GRADLE" << 'EOF'

subprojects {
  afterEvaluate {
    if (project.hasProperty('android')) {
      android {
        lintOptions {
          checkReleaseBuilds false
        }
      }
    }
  }
}
EOF
    echo "  ✅ Lint disabled"
  fi
fi

# --- Step 6: Ensure newArchEnabled in gradle.properties ---
GRADLE_PROPS="android/gradle.properties"
if [ -f "$GRADLE_PROPS" ]; then
  sed -i 's/^newArchEnabled=false/newArchEnabled=true/' "$GRADLE_PROPS"
fi

# --- Step 7: Build release APK ---
echo ""
echo "🏗️ Building release APK..."
cd android
./gradlew assembleRelease

echo ""
echo "=========================="
echo "✅ Build complete!"
echo "📱 APK: android/app/build/outputs/apk/release/app-release.apk"
echo "=========================="
