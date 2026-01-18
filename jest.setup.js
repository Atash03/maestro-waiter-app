// Jest setup file
// This file runs before each test suite

// Mock expo-secure-store for tests
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock AsyncStorage for tests
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => ({
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  },
}));

// Mock react-native-sse (uses ESM that Jest can't parse directly)
jest.mock('react-native-sse', () => {
  class MockEventSource {
    constructor(url, options) {
      this.url = url;
      this.options = options;
      this.readyState = 0;
    }
    open() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  }
  return {
    default: MockEventSource,
    __esModule: true,
  };
});

// Mock react-native-uuid
jest.mock('react-native-uuid', () => ({
  v4: () => '550e8400-e29b-41d4-a716-446655440000',
  v1: () => '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
}));

// Suppress console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
