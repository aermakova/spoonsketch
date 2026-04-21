const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prevent Metro from resolving the ESM ("import") condition of package exports.
// Packages like zustand ship .mjs files with import.meta which Metro cannot handle
// in its non-module script output format.
config.resolver.unstable_conditionNames = ['require', 'react-native', 'default'];

module.exports = config;
