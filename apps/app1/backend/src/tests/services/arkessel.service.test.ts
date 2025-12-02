import { ArkeselService } from '../../services/arkessel.service';
import axios from 'axios';
import { ApiError } from '../../middleware/error.middleware';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ArkeselService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...originalEnv,
      ARKESSEL_API_KEY: 'test-api-key',
      ARKESSEL_SENDER_ID: 'TestSender',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Configuration Validation', () => {
    it('should throw error when API key is not configured', async () => {
      delete process.env.ARKESSEL_API_KEY;

      await expect(
        ArkeselService.sendSms({
          to: '+1234567890',
          message: 'Test message',
          sender: 'TestSender',
        })
      ).rejects.toThrow('Arkessel API key not configured');
    });
  });

  describe('sendSms', () => {
    const mockSuccessResponse = {
      status: 200,
      data: {
        status: 'success',
        message: 'SMS sent successfully',
        data: {
          id: 'msg_123456',
          balance: 100,
          user: 'testuser',
          api_key: 'test-api-key',
          type: 'plain',
          unicode: false,
          message: 'Test message',
          sender: 'TestSender',
          recipients: '+1234567890',
          scheduled_date: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
    };

    it('should send SMS successfully with single recipient', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockSuccessResponse);

      const result = await ArkeselService.sendSms({
        to: '+1234567890',
        message: 'Test message',
        sender: 'TestSender',
      });

      expect(result.status).toBe('success');
      expect(result.data?.id).toBe('msg_123456');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('action=send-sms'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
            'User-Agent': 'Mas3ndi-SMS-Platform/1.0',
          }),
          timeout: 30000,
        })
      );
    });

    it('should send SMS successfully with multiple recipients', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        ...mockSuccessResponse,
        data: {
          ...mockSuccessResponse.data,
          data: {
            ...mockSuccessResponse.data.data!,
            recipients: '+1234567890,+0987654321',
          },
        },
      });

      const result = await ArkeselService.sendSms({
        to: ['+1234567890', '+0987654321'],
        message: 'Test message',
        sender: 'TestSender',
      });

      expect(result.status).toBe('success');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('to=%2B1234567890%2C%2B0987654321'),
        expect.any(Object)
      );
    });

    it('should send scheduled SMS successfully', async () => {
      const scheduledDate = '2024-12-31T23:59:59Z';
      mockedAxios.get.mockResolvedValueOnce(mockSuccessResponse);

      await ArkeselService.sendSms({
        to: '+1234567890',
        message: 'Test message',
        sender: 'TestSender',
        scheduledDate,
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`schedule=${scheduledDate}`),
        expect.any(Object)
      );
    });

    it('should handle unicode messages', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockSuccessResponse);

      await ArkeselService.sendSms({
        to: '+1234567890',
        message: 'Test message with emoji 😀',
        sender: 'TestSender',
        type: 'unicode',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('sms=Test%20message%20with%20emoji%20%F0%9F%98%80'),
        expect.any(Object)
      );
    });

    it('should handle Arkessel error codes', async () => {
      const errorResponse = {
        status: 200,
        data: {
          status: 'error',
          message: 'Authentication failed',
          code: '102',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(errorResponse);

      await expect(
        ArkeselService.sendSms({
          to: '+1234567890',
          message: 'Test message',
          sender: 'TestSender',
        })
      ).rejects.toThrow('Arkessel Error 102: Authentication failed');
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        request: {},
        message: 'Network Error',
      });

      await expect(
        ArkeselService.sendSms({
          to: '+1234567890',
          message: 'Test message',
          sender: 'TestSender',
        })
      ).rejects.toThrow('Failed to connect to Arkessel API');
    });

    it('should handle API response errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            message: 'Internal Server Error',
          },
        },
      });

      await expect(
        ArkeselService.sendSms({
          to: '+1234567890',
          message: 'Test message',
          sender: 'TestSender',
        })
      ).rejects.toThrow('Arkessel API Error: Internal Server Error');
    });
  });

  describe('getBalance', () => {
    const mockBalanceResponse = {
      status: 200,
      data: {
        status: 'success',
        message: 'Balance retrieved successfully',
        data: {
          balance: 150.75,
          user: 'testuser',
        },
      },
    };

    it('should get balance successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockBalanceResponse);

      const result = await ArkeselService.getBalance();

      expect(result.status).toBe('success');
      expect(result.data?.balance).toBe(150.75);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('action=check-balance'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
          timeout: 15000,
        })
      );
    });

    it('should handle balance check errors', async () => {
      const errorResponse = {
        status: 200,
        data: {
          status: 'error',
          message: 'Invalid API key',
          code: '102',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(errorResponse);

      await expect(ArkeselService.getBalance()).rejects.toThrow(
        'Arkessel Balance Error 102: Invalid API key'
      );
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate correct phone numbers', () => {
      const validNumbers = [
        '+1234567890',
        '+233123456789',
        '+44123456789',
        '+91123456789',
      ];

      validNumbers.forEach(number => {
        expect(ArkeselService.validatePhoneNumber(number)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '123456789', // No country code
        '+12345', // Too short
        '+123456789012345678901', // Too long
        'invalid', // Not a number
        '', // Empty
        '+1-234-567-890', // Contains dashes
      ];

      invalidNumbers.forEach(number => {
        expect(ArkeselService.validatePhoneNumber(number)).toBe(false);
      });
    });
  });

  describe('Phone Number Formatting', () => {
    it('should format phone numbers correctly', () => {
      const testCases = [
        { input: '1234567890', expected: '+1234567890' },
        { input: '+1234567890', expected: '+1234567890' },
        { input: '001234567890', expected: '+1234567890' },
        { input: ' +1234567890 ', expected: '+1234567890' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(ArkeselService.formatPhoneNumber(input)).toBe(expected);
      });
    });
  });

  describe('SMS Count Calculation', () => {
    it('should calculate SMS count for plain text', () => {
      const testCases = [
        { message: 'Hello', expected: 1 },
        { message: 'A'.repeat(160), expected: 1 },
        { message: 'A'.repeat(161), expected: 2 },
        { message: 'A'.repeat(320), expected: 2 },
        { message: 'A'.repeat(321), expected: 3 },
      ];

      testCases.forEach(({ message, expected }) => {
        expect(ArkeselService.calculateSmsCount(message)).toBe(expected);
      });
    });

    it('should calculate SMS count for unicode text', () => {
      const testCases = [
        { message: 'Hello 😀', expected: 1 },
        { message: '😀'.repeat(70), expected: 1 },
        { message: '😀'.repeat(71), expected: 2 },
      ];

      testCases.forEach(({ message, expected }) => {
        expect(ArkeselService.calculateSmsCount(message)).toBe(expected);
      });
    });
  });

  describe('testConnection', () => {
    it('should return success when connection is working', async () => {
      const mockBalanceResponse = {
        status: 200,
        data: {
          status: 'success',
          message: 'Balance retrieved successfully',
          data: {
            balance: 100,
            user: 'testuser',
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockBalanceResponse);

      const result = await ArkeselService.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Arkessel API connection successful');
      expect(result.balance).toBe(100);
    });

    it('should return failure when connection fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await ArkeselService.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection test failed');
    });
  });
});
