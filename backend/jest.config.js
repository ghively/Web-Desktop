module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/internal/'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        noImplicitReturns: false,
        noUnusedLocals: false,
        noUnusedParameters: false
      }
    }
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    testTimeout: 30000,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};