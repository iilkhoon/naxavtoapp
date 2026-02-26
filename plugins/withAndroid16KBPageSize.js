const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo config plugin: Android 16KB page size fix.
 * Sets packagingOptions.jniLibs.useLegacyPackaging = false
 * so that .so files are stored uncompressed and page-aligned in the APK.
 * Required for Google Play's 16KB memory page size compatibility.
 */
const withAndroid16KBPageSize = (config) => {
    return withAppBuildGradle(config, (config) => {
        const contents = config.modResults.contents;

        if (contents.includes('useLegacyPackaging')) {
            // Already configured, skip
            return config;
        }

        // Insert packagingOptions block inside the android { ... } block
        config.modResults.contents = contents.replace(
            /android\s*\{/,
            `android {\n    packagingOptions {\n        jniLibs {\n            useLegacyPackaging false\n        }\n    }`
        );

        return config;
    });
};

module.exports = withAndroid16KBPageSize;
