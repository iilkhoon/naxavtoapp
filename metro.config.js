const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Tslib çözümleri, Expo SDK 54 ile web bundle işlemlerinde çakışmamak adına eklenmektedir
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'tslib') {
        return {
            type: 'sourceFile',
            filePath: require.resolve('tslib'),
        };
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
