/* global jest */
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
// Fonts never finish loading under Jest; treat them as loaded so the root layout renders.
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
