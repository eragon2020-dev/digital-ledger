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

  // Delete splashscreen_logo.png files after they're generated
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

      return config;
    },
  ]);

  return config;
}

module.exports = withRemovedSplashScreen;
module.exports.default = withRemovedSplashScreen;
