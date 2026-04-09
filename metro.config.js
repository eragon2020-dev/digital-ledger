const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add wasm to asset extensions so Metro bundles it correctly
config.resolver.assetExts = [...config.resolver.assetExts, 'wasm'];

module.exports = config;
