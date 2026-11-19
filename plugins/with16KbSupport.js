const {
  withProjectBuildGradle,
  withAppBuildGradle,
  withGradleProperties,
  withAndroidManifest,
} = require('@expo/config-plugins');

const NDK_VERSION = '27.1.12297006';

function with16KbSupport(config) {
  // 1. Ensure ndkVersion is in gradle.properties
  config = withGradleProperties(config, (modConfig) => {
    const existing = modConfig.modResults.find(
      (item) => item.type === 'property' && item.key === 'ndkVersion'
    );
    if (existing) {
      existing.value = NDK_VERSION;
    } else {
      modConfig.modResults.push({
        type: 'property',
        key: 'ndkVersion',
        value: NDK_VERSION,
      });
    }
    return modConfig;
  });

  // 2. Set rootProject.ext.ndkVersion in project root build.gradle
  config = withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === 'groovy') {
      let contents = modConfig.modResults.contents;
      if (!contents.includes(`ndkVersion = "${NDK_VERSION}"`)) {
        if (contents.includes('allprojects {')) {
          contents = contents.replace(
            /allprojects\s*{/,
            `allprojects {\n  ext {\n    ndkVersion = "${NDK_VERSION}"\n  }`
          );
        } else {
          contents = `ext {\n  ndkVersion = "${NDK_VERSION}"\n}\n` + contents;
        }
      }
      modConfig.modResults.contents = contents;
    }
    return modConfig;
  });

  // 3. Ensure packagingOptions in app/build.gradle disables legacy packaging (16 KB alignment)
  config = withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === 'groovy') {
      let contents = modConfig.modResults.contents;
      if (contents.includes('ndkVersion rootProject.ext.ndkVersion')) {
        // Already uses rootProject.ext.ndkVersion
      } else if (contents.includes('ndkVersion')) {
        contents = contents.replace(/ndkVersion\s+.+/, `ndkVersion "${NDK_VERSION}"`);
      }
      if (!contents.includes('useLegacyPackaging = false')) {
        contents = contents.replace(
          /android\s*{/,
          `android {\n    packagingOptions {\n        jniLibs {\n            useLegacyPackaging = false\n        }\n    }`
        );
      }
      modConfig.modResults.contents = contents;
    }
    return modConfig;
  });

  // 4. Disable split-screen and multi-window mode at the OS level & mark portrait hardware feature as optional
  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const mainApplication = manifest.application?.[0];
    if (mainApplication?.activity) {
      const mainActivity = mainApplication.activity.find(
        (a) => a.$['android:name'] === '.MainActivity'
      );
      if (mainActivity) {
        mainActivity.$['android:resizeableActivity'] = 'false';
      }
    }

    // Mark portrait hardware feature as optional for Google Play Console availability
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    manifest['uses-feature'] = manifest['uses-feature'] || [];

    const portraitFeature = manifest['uses-feature'].find(
      (f) => f.$ && f.$['android:name'] === 'android.hardware.screen.portrait'
    );
    if (portraitFeature) {
      portraitFeature.$['android:required'] = 'false';
      portraitFeature.$['tools:replace'] = 'android:required';
    } else {
      manifest['uses-feature'].push({
        $: {
          'android:name': 'android.hardware.screen.portrait',
          'android:required': 'false',
          'tools:replace': 'android:required',
        },
      });
    }

    return modConfig;
  });

  return config;
}

module.exports = with16KbSupport;
