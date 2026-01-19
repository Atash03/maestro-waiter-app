module.exports = {
  projects: [
    // Node environment for unit tests (non-component tests)
    {
      displayName: 'node',
      preset: 'jest-expo/node',
      testMatch: [
        '<rootDir>/src/__tests__/dependencies.test.ts',
        '<rootDir>/src/__tests__/types.test.ts',
        '<rootDir>/src/__tests__/api-client.test.ts',
        '<rootDir>/src/__tests__/api-endpoints.test.ts',
        '<rootDir>/src/__tests__/auth-store.test.ts',
        '<rootDir>/src/__tests__/protected-route.test.ts',
        '<rootDir>/src/__tests__/table-store.test.ts',
        '<rootDir>/src/__tests__/my-section.test.tsx',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      transform: {
        '^.+\\.(ts|tsx)$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.json',
            useESM: false,
          },
        ],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
    // Web environment for component tests (better Jest compatibility)
    {
      displayName: 'web',
      preset: 'jest-expo/web',
      testMatch: [
        '<rootDir>/src/__tests__/*-screen.test.tsx',
        '<rootDir>/src/__tests__/ui-components-render.test.tsx',
        '<rootDir>/src/__tests__/table-queries.test.tsx',
        '<rootDir>/src/__tests__/table-item.test.tsx',
        '<rootDir>/src/__tests__/table-info-popup.test.tsx',
        '<rootDir>/src/__tests__/table-detail-modal.test.tsx',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-sse|react-native-uuid|react-native-toast-message|@react-native-async-storage|zustand|@tanstack|react-native-reanimated)',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!**/node_modules/**',
  ],
};
