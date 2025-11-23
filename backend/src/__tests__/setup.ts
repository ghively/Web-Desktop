import 'jest';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.PORT = '3002'; // Use different port for testing
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock WebSocket for testing
jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1, // OPEN
  })),
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

// Mock node-pty for testing
jest.mock('node-pty', () => ({
  spawn: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    write: jest.fn(),
    resize: jest.fn(),
    kill: jest.fn(),
    pid: 12345,
  })),
}));