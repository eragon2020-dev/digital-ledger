const { withAndroidStyles, withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs/promises");

/**
 * Config plugin to remove splash screen configuration from Android
 * This prevents expo-splash-screen from generating splash screen resources
 */
function withRemovedSplashScreen(config) {
  // Remove splash screen theme from styles.xml
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults;

    // Find and remove the Theme.App.SplashScreen style
    styles.resources.style = styles.resources.style.filter(
      (style) => style.$.name !== "Theme.App.SplashScreen"
    );

    return config;
  });

  // Update AndroidManifest.xml to use AppTheme instead of SplashScreen theme
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const activity = manifest.manifest.application?.[0]?.activity?.[0];

    if (activity && activity.$) {
      // Change theme from SplashScreen to AppTheme
      if (activity.$["android:theme"] === "@style/Theme.App.SplashScreen") {
        activity.$["android:theme"] = "@style/AppTheme";
      }
    }

    return config;
  });

  // Delete splashscreen_logo.png files and fix MainActivity
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const androidPath = path.resolve(
        config.modRequest.projectRoot,
        "android"
      );

      const drawableFolders = [
        "drawable-hdpi",
        "drawable-mdpi",
        "drawable-xhdpi",
        "drawable-xxhdpi",
        "drawable-xxxhdpi",
        "drawable",
      ];

      for (const folder of drawableFolders) {
        const filePath = path.join(
          androidPath,
          "app",
          "src",
          "main",
          "res",
          folder,
          "splashscreen_logo.png"
        );

        try {
          await fs.unlink(filePath);
        } catch (error) {
          // File doesn't exist, ignore
        }
      }

      // Fix ic_launcher_background.xml to remove splashscreen_logo reference
      const icLauncherBackgroundPath = path.join(
        androidPath,
        "app",
        "src",
        "main",
        "res",
        "drawable",
        "ic_launcher_background.xml"
      );

      try {
        const content = await fs.readFile(icLauncherBackgroundPath, "utf-8");
        const fixedContent = content.replace(
          /<layer-list[^>]*>[\s\S]*<\/layer-list>/,
          `<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splashscreen_background"/>
</layer-list>`
        );
        await fs.writeFile(icLauncherBackgroundPath, fixedContent);
      } catch (error) {
        // File doesn't exist, ignore
      }

      // Delete splash_screen_view.xml layout file if it exists
      const splashScreenLayoutPath = path.join(
        androidPath,
        "app",
        "src",
        "main",
        "res",
        "layout",
        "splash_screen_view.xml"
      );

      try {
        await fs.unlink(splashScreenLayoutPath);
      } catch (error) {
        // File doesn't exist, ignore
      }

      // Fix MainActivity.kt to remove SplashScreenManager registration
      const mainActivityPath = path.join(
        androidPath,
        "app",
        "src",
        "main",
        "java",
        "com",
        "digitalledger",
        "app",
        "MainActivity.kt"
      );

      try {
        let content = await fs.readFile(mainActivityPath, "utf-8");
        // Remove the entire expo-splashscreen generated block
        content = content.replace(
          /\/\/ @generated begin expo-splashscreen[\s\S]*?\/\/ @generated end expo-splashscreen\s*/g,
          ""
        );
        // Remove the SplashScreenManager import
        content = content.replace(
          /import expo\.modules\.splashscreen\.SplashScreenManager\s*\n/g,
          ""
        );
        // Remove leftover splash screen comments
        content = content.replace(
          /\/\/ Set the theme to AppTheme BEFORE onCreate[\s\S]*?\/\/ This is required for expo-splash-screen\.\s*\n/g,
          ""
        );
        await fs.writeFile(mainActivityPath, content);
      } catch (error) {
        // File doesn't exist, ignore
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withRemovedSplashScreen;
module.exports.default = withRemovedSplashScreen;
