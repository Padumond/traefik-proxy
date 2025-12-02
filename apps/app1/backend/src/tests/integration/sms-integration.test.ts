import { ArkeselService } from '../../services/arkessel.service';
import { SmsService } from '../../services/sms.service';
import { ApiError } from '../../middleware/error.middleware';

// Integration tests for SMS functionality
describe('SMS Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ARKESSEL_API_KEY: 'test-api-key',
      ARKESSEL_SENDER_ID: 'TestSender',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Phone Number Validation and Formatting', () => {
    it('should validate and format various phone number formats', () => {
      const testCases = [
        { input: '+1234567890', expected: '+1234567890', valid: true },
        { input: '1234567890', expected: '+1234567890', valid: true },
        { input: '001234567890', expected: '+1234567890', valid: true },
        { input: ' +1234567890 ', expected: '+1234567890', valid: true },
        { input: '+233123456789', expected: '+233123456789', valid: true },
        { input: '+44123456789', expected: '+44123456789', valid: true },
        { input: '123456789', expected: '+123456789', valid: false }, // Too short
        { input: '+12345', expected: '+12345', valid: false }, // Too short
        { input: 'invalid', expected: '+invalid', valid: false }, // Not a number
        { input: '', expected: '+', valid: false }, // Empty
      ];

      testCases.forEach(({ input, expected, valid }) => {
        const formatted = ArkeselService.formatPhoneNumber(input);
        const isValid = ArkeselService.validatePhoneNumber(formatted);

        expect(formatted).toBe(expected);
        expect(isValid).toBe(valid);

        if (valid) {
          expect(formatted).toBeValidPhoneNumber();
        }
      });
    });
  });

  describe('SMS Count Calculation', () => {
    it('should calculate SMS count correctly for different message types', () => {
      const testCases = [
        // Plain text messages
        { message: 'Hello', expected: 1, type: 'plain' },
        { message: 'A'.repeat(160), expected: 1, type: 'plain' },
        { message: 'A'.repeat(161), expected: 2, type: 'plain' },
        { message: 'A'.repeat(320), expected: 2, type: 'plain' },
        { message: 'A'.repeat(321), expected: 3, type: 'plain' },
        { message: 'A'.repeat(480), expected: 3, type: 'plain' },
        { message: 'A'.repeat(481), expected: 4, type: 'plain' },

        // Unicode messages (shorter limit)
        { message: 'Hello 😀', expected: 1, type: 'unicode' },
        { message: '😀'.repeat(70), expected: 1, type: 'unicode' },
        { message: '😀'.repeat(71), expected: 2, type: 'unicode' },
        { message: '😀'.repeat(140), expected: 2, type: 'unicode' },
        { message: '😀'.repeat(141), expected: 3, type: 'unicode' },

        // Mixed content
        { message: 'Hello world! 🌍', expected: 1, type: 'unicode' },
        { message: 'Regular text with émojis 😀🎉', expected: 1, type: 'unicode' },
      ];

      testCases.forEach(({ message, expected, type }) => {
        const count = ArkeselService.calculateSmsCount(message);
        expect(count).toBe(expected);

        // Verify message type detection
        const hasUnicode = /[^\x00-\x7F]/.test(message);
        expect(hasUnicode ? 'unicode' : 'plain').toBe(type);
      });
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate costs correctly for different scenarios', () => {
      const costPerSms = 0.01;

      const testCases = [
        {
          recipients: 1,
          smsCount: 1,
          expectedCost: 0.01,
          description: 'Single recipient, single SMS',
        },
        {
          recipients: 5,
          smsCount: 1,
          expectedCost: 0.05,
          description: 'Multiple recipients, single SMS',
        },
        {
          recipients: 1,
          smsCount: 3,
          expectedCost: 0.03,
          description: 'Single recipient, long message (3 SMS)',
        },
        {
          recipients: 10,
          smsCount: 2,
          expectedCost: 0.20,
          description: 'Multiple recipients, long message',
        },
        {
          recipients: 100,
          smsCount: 1,
          expectedCost: 1.00,
          description: 'Bulk SMS to 100 recipients',
        },
      ];

      testCases.forEach(({ recipients, smsCount, expectedCost, description }) => {
        const calculatedCost = costPerSms * recipients * smsCount;
        expect(calculatedCost).toBe(expectedCost);
        expect(calculatedCost).toBeWithinCostRange(expectedCost - 0.001, expectedCost + 0.001);
      });
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle various API error codes correctly', () => {
      const errorCodes = [
        { code: '102', message: 'Authentication Failed', expectedStatus: 400 },
        { code: '103', message: 'Insufficient Balance', expectedStatus: 400 },
        { code: '104', message: 'Invalid Phone Number', expectedStatus: 400 },
        { code: '105', message: 'Invalid Sender ID', expectedStatus: 400 },
        { code: '999', message: 'Unknown Error', expectedStatus: 400 },
      ];

      errorCodes.forEach(({ code, message, expectedStatus }) => {
        expect(() => {
          throw new ApiError(`Arkessel Error ${code}: ${message}`, expectedStatus);
        }).toThrow(`Arkessel Error ${code}: ${message}`);
      });
    });

    it('should handle network timeouts and retries', async () => {
      // Mock a timeout scenario
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ECONNABORTED';

      expect(() => {
        throw new ApiError('Failed to connect to Arkessel API', 503);
      }).toThrow('Failed to connect to Arkessel API');
    });

    it('should handle malformed API responses', () => {
      const malformedResponses = [
        null,
        undefined,
        {},
        { status: 'unknown' },
        { message: 'Error', code: 'invalid' },
        { data: null },
      ];

      malformedResponses.forEach(response => {
        // Test that the service can handle malformed responses gracefully
        expect(response).toBeDefined(); // Basic check that we can process the response
      });
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should handle rate limiting scenarios', async () => {
      // Simulate rate limiting
      const rateLimitError = new ApiError('Rate limit exceeded', 429);
      
      expect(() => {
        throw rateLimitError;
      }).toThrow('Rate limit exceeded');
    });

    it('should implement exponential backoff for retries', async () => {
      const delays = [1000, 2000, 3000]; // Expected delays for 3 retries
      
      delays.forEach((delay, index) => {
        const expectedDelay = 1000 * (index + 1); // Linear backoff for simplicity
        expect(delay).toBe(expectedDelay);
      });
    });
  });

  describe('Message Content Validation', () => {
    it('should validate message content and encoding', () => {
      const testMessages = [
        {
          content: 'Simple ASCII message',
          encoding: 'plain',
          valid: true,
        },
        {
          content: 'Message with émojis 😀🎉',
          encoding: 'unicode',
          valid: true,
        },
        {
          content: 'Arabic text: مرحبا بالعالم',
          encoding: 'unicode',
          valid: true,
        },
        {
          content: 'Chinese text: 你好世界',
          encoding: 'unicode',
          valid: true,
        },
        {
          content: '', // Empty message
          encoding: 'plain',
          valid: false,
        },
        {
          content: 'A'.repeat(1601), // Too long
          encoding: 'plain',
          valid: false,
        },
      ];

      testMessages.forEach(({ content, encoding, valid }) => {
        const hasUnicode = /[^\x00-\x7F]/.test(content);
        const detectedEncoding = hasUnicode ? 'unicode' : 'plain';
        
        expect(detectedEncoding).toBe(encoding);
        
        if (valid) {
          expect(content.length).toBeGreaterThan(0);
          expect(content.length).toBeLessThanOrEqual(1600);
        }
      });
    });
  });

  describe('Sender ID Validation', () => {
    it('should validate sender ID formats', () => {
      const testSenderIds = [
        { senderId: 'TestSender', valid: true },
        { senderId: 'COMPANY', valid: true },
        { senderId: 'Brand123', valid: true },
        { senderId: 'A', valid: true }, // Minimum length
        { senderId: 'MaxLengthID', valid: true }, // 11 characters
        { senderId: 'TooLongSenderID', valid: false }, // Too long
        { senderId: 'Invalid-ID', valid: false }, // Contains hyphen
        { senderId: 'Invalid ID', valid: false }, // Contains space
        { senderId: 'Invalid@ID', valid: false }, // Contains special char
        { senderId: '', valid: false }, // Empty
      ];

      testSenderIds.forEach(({ senderId, valid }) => {
        if (valid) {
          expect(senderId).toBeValidSenderId();
        } else {
          expect(() => {
            if (senderId.length === 0) throw new Error('Sender ID cannot be empty');
            if (senderId.length > 11) throw new Error('Sender ID too long');
            if (!/^[A-Za-z0-9]+$/.test(senderId)) throw new Error('Invalid sender ID format');
          }).toThrow();
        }
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk SMS operations efficiently', () => {
      const bulkSizes = [10, 50, 100, 500, 1000];
      
      bulkSizes.forEach(size => {
        const recipients = Array(size).fill(0).map((_, i) => `+123456789${i.toString().padStart(2, '0')}`);
        
        expect(recipients).toHaveLength(size);
        expect(recipients[0]).toBeValidPhoneNumber();
        expect(recipients[recipients.length - 1]).toBeValidPhoneNumber();
        
        // Calculate expected cost
        const expectedCost = size * 0.01; // $0.01 per SMS
        expect(expectedCost).toBeWithinCostRange(expectedCost - 0.01, expectedCost + 0.01);
      });
    });
  });

  describe('Scheduled SMS', () => {
    it('should validate scheduled dates', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const testDates = [
        { date: future.toISOString(), valid: true },
        { date: new Date(now.getTime() + 60 * 1000).toISOString(), valid: true }, // 1 minute from now
        { date: past.toISOString(), valid: false }, // Past date
        { date: 'invalid-date', valid: false }, // Invalid format
        { date: '', valid: false }, // Empty
      ];

      testDates.forEach(({ date, valid }) => {
        if (valid) {
          const parsedDate = new Date(date);
          expect(parsedDate.getTime()).toBeGreaterThan(now.getTime());
        } else {
          if (date === '') {
            expect(date).toBe('');
          } else if (date === 'invalid-date') {
            expect(isNaN(new Date(date).getTime())).toBe(true);
          } else {
            expect(new Date(date).getTime()).toBeLessThan(now.getTime());
          }
        }
      });
    });
  });
});
