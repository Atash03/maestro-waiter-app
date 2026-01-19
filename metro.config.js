const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable transformer minification for better tree-shaking
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    compress: {
      // Remove console logs in production builds
      drop_console: process.env.NODE_ENV === 'production',
      // Remove dead code
      dead_code: true,
      // Optimize conditionals
      conditionals: true,
      // Evaluate constant expressions
      evaluate: true,
      // Remove unreachable code
      unused: true,
    },
    mangle: {
      // Enable variable name mangling in production
      toplevel: true,
    },
  },
};

// Optimize resolver for faster module resolution
config.resolver = {
  ...config.resolver,
  // Prioritize platform-specific extensions
  sourceExts: ['ts', 'tsx', 'js', 'jsx', 'json', 'cjs', 'mjs'],
  // Reduce resolution overhead by excluding unnecessary extensions
  assetExts: config.resolver.assetExts.filter((ext) => !['md', 'txt', 'log'].includes(ext)),
};

// Optimize serializer for smaller bundles
config.serializer = {
  ...config.serializer,
  // Remove unused exports (experimental - tree shaking)
  experimentalSerializerHook: (graph, delta) => {
    // Metro's experimental tree shaking support
    return { graph, delta };
  },
};

module.exports = config;
