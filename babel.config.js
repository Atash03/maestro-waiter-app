module.exports = (api) => {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // React Native Reanimated plugin must be last
      'react-native-reanimated/plugin',
    ],
    env: {
      production: {
        plugins: [
          // Transform imports for better tree-shaking in production
          // Uses template literal for dynamic member replacement
          [
            'transform-imports',
            {
              '@expo/vector-icons': {
                transform: '@expo/vector-icons/build/{{member}}',
                preventFullImport: true,
              },
            },
          ],
        ].filter(Boolean),
      },
    },
  };
};
