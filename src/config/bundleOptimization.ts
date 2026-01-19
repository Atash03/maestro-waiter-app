/**
 * Bundle Optimization Configuration
 *
 * Documents and configures bundle size optimizations for the app.
 * This file serves as a central reference for all optimization strategies.
 */

/**
 * Image optimization recommendations
 *
 * 1. Use expo-image for all images (automatic optimization)
 * 2. Prefer WebP format for better compression
 * 3. Use appropriate image dimensions (avoid oversized assets)
 * 4. Lazy load off-screen images
 */
export const imageOptimizationConfig = {
  // Recommended max dimensions for different contexts
  maxDimensions: {
    thumbnail: { width: 100, height: 100 },
    card: { width: 300, height: 200 },
    hero: { width: 600, height: 400 },
    fullScreen: { width: 1200, height: 800 },
  },
  // Recommended formats by platform
  preferredFormats: {
    ios: ['webp', 'png'],
    android: ['webp', 'png'],
    web: ['webp', 'png', 'svg'],
  },
};

/**
 * Code splitting configuration
 *
 * Screens and components that should be lazy loaded
 */
export const lazyLoadConfig = {
  // Secondary screens that can be loaded on-demand
  secondaryScreens: ['app/(main)/settings', 'app/(main)/bill/[orderId]'],
  // Heavy modals that should be lazy loaded
  heavyModals: ['components/tables/TableDetailModal', 'components/orders/SendToKitchenModal'],
  // Features that can be deferred
  deferredFeatures: ['analytics', 'crashReporting'],
};

/**
 * Dependencies to tree-shake
 *
 * These dependencies have submodule imports available
 * to reduce bundle size
 */
export const treeShakeConfig = {
  '@expo/vector-icons': {
    // Import specific icon sets instead of the entire library
    // Example: import { Ionicons } from '@expo/vector-icons/Ionicons'
    recommended: ['Ionicons', 'MaterialIcons', 'FontAwesome'],
  },
  'date-fns': {
    // Import specific functions instead of the entire library
    // Example: import { format } from 'date-fns/format'
    recommended: true,
  },
};

/**
 * Production optimizations enabled
 */
export const productionOptimizations = {
  // Remove console.log in production (via metro.config.js)
  dropConsole: true,
  // Enable dead code elimination
  deadCodeElimination: true,
  // Minify JavaScript
  minify: true,
  // Enable Hermes engine (faster startup, smaller bundle)
  hermes: true,
};

/**
 * Bundle analysis commands
 *
 * Run these commands to analyze bundle size:
 *
 * 1. Generate source maps:
 *    npx expo export --platform ios --source-maps
 *
 * 2. Analyze with source-map-explorer:
 *    npx source-map-explorer dist/bundles/ios-*.js
 *
 * 3. Check bundle size:
 *    npx react-native-bundle-visualizer
 */
export const bundleAnalysisCommands = {
  generateSourceMaps: 'npx expo export --platform ios --source-maps',
  analyzeBundle: 'npx source-map-explorer dist/bundles/ios-*.js',
  visualize: 'npx react-native-bundle-visualizer',
};

/**
 * Estimated bundle savings from optimizations
 *
 * These are approximate values and will vary based on actual usage
 */
export const estimatedSavings = {
  // Removing unused template images
  unusedImages: '~50KB',
  // Lazy loading secondary screens
  lazyLoading: '~100-200KB',
  // Tree-shaking vector icons
  iconTreeShaking: '~80-150KB',
  // Metro minification
  minification: '~15-30%',
  // Total estimated reduction
  totalEstimate: '~300-500KB (20-30%)',
};
