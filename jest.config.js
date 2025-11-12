module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  setupFiles: [
    '<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|expo-router|@expo|react-native-reanimated|@react-navigation|react-native-gesture-handler)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
};