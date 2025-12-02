import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.ARKESSEL_API_KEY = 'test-api-key';
process.env.ARKESSEL_SENDER_ID = 'TestSender';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/mas3ndi_test';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    walletBalance: 100.0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  createMockSenderId: (overrides = {}) => ({
    id: 'test-sender-123',
    senderId: 'TestSender',
    userId: 'test-user-123',
    status: 'APPROVED',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  createMockSmsLog: (overrides = {}) => ({
    id: 'test-log-123',
    messageId: 'msg_123456',
    userId: 'test-user-123',
    senderId: 'test-sender-123',
    message: 'Test message',
    recipients: ['+1234567890'],
    cost: 0.01,
    status: 'SENT',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  createMockArkeselResponse: (overrides = {}) => ({
    status: 'success',
    message: 'SMS sent successfully',
    data: {
      id: 'msg_123456',
      balance: 99.99,
      user: 'testuser',
      api_key: 'test-key',
      type: 'plain',
      unicode: false,
      message: 'Test message',
      sender: 'TestSender',
      recipients: '+1234567890',
      scheduled_date: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides,
    },
  }),

  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Extend Jest matchers
expect.extend({
  toBeValidPhoneNumber(received: string) {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const pass = phoneRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid phone number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid phone number`,
        pass: false,
      };
    }
  },

  toBeValidSenderId(received: string) {
    const senderIdRegex = /^[A-Za-z0-9]{1,11}$/;
    const pass = senderIdRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid sender ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid sender ID`,
        pass: false,
      };
    }
  },

  toBeWithinCostRange(received: number, expectedMin: number, expectedMax: number) {
    const pass = received >= expectedMin && received <= expectedMax;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be within cost range ${expectedMin}-${expectedMax}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within cost range ${expectedMin}-${expectedMax}`,
        pass: false,
      };
    }
  },
});

// Type declarations for global utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidPhoneNumber(): R;
      toBeValidSenderId(): R;
      toBeWithinCostRange(expectedMin: number, expectedMax: number): R;
    }
  }

  var testUtils: {
    createMockUser: (overrides?: any) => any;
    createMockSenderId: (overrides?: any) => any;
    createMockSmsLog: (overrides?: any) => any;
    createMockArkeselResponse: (overrides?: any) => any;
    sleep: (ms: number) => Promise<void>;
  };
}

// Cleanup function for tests
afterEach(() => {
  jest.clearAllMocks();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};
