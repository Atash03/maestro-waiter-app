// Jest setup file
// This file runs before each test suite

// Mock window.matchMedia for web tests
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Import jest-native matchers
import '@testing-library/jest-native/extend-expect';

// Mock expo-secure-store for tests
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock AsyncStorage for tests
const mockAsyncStorage = {
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorage,
}));

// Mock sonner-native
jest.mock('sonner-native', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
    promise: jest.fn(),
    dismiss: jest.fn(),
  }),
  Toaster: () => null,
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

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-image
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props) => {
      const { testID, ...rest } = props;
      return <View testID={testID} {...rest} />;
    },
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  // Use react-native-reanimated/mock for web environment
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};

  return {
    ...Reanimated,
    useSharedValue: jest.fn((initialValue) => ({ value: initialValue })),
    useAnimatedStyle: jest.fn((callback) => callback()),
    withTiming: jest.fn((toValue) => toValue),
    withSpring: jest.fn((toValue) => toValue),
    withRepeat: jest.fn((animation) => animation),
    withSequence: jest.fn((...animations) => animations[0]),
    withDelay: jest.fn((_, animation) => animation),
    runOnJS: jest.fn((fn) => fn),
    cancelAnimation: jest.fn(),
    interpolate: jest.fn((value) => value),
    Easing: {
      inOut: jest.fn((easing) => easing),
      ease: jest.fn(),
    },
    createAnimatedComponent: jest.fn((component) => component),
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const mockGesture = {
    onStart: function () {
      return this;
    },
    onUpdate: function () {
      return this;
    },
    onEnd: function () {
      return this;
    },
  };
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }) => children,
    Gesture: {
      Pinch: () => ({ ...mockGesture }),
      Pan: () => ({ ...mockGesture }),
      Simultaneous: (...gestures) => gestures,
      Tap: () => ({
        ...mockGesture,
        numberOfTaps: function () {
          return this;
        },
      }),
    },
    TouchableOpacity: View,
    ScrollView: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    TapGestureHandler: View,
    State: {},
    Directions: {},
  };
});

// Suppress console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
