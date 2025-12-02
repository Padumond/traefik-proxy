import request from 'supertest';
import express from 'express';
import { SmsController } from '../../controllers/sms.controller';
import { SmsService } from '../../services/sms.service';
import { authenticate } from '../../middleware/auth.middleware';

// Mock dependencies
jest.mock('../../services/sms.service');
jest.mock('../../middleware/auth.middleware');

const mockedSmsService = SmsService as jest.Mocked<typeof SmsService>;
const mockedAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

// Create test app
const app = express();
app.use(express.json());

// Mock authentication middleware
mockedAuthenticate.mockImplementation((req: any, res, next) => {
  req.user = {
    userId: 'test-user-123',
    email: 'test@example.com',
  };
  next();
});

// Setup routes
app.post('/api/sms/send', authenticate, SmsController.sendSms);
app.get('/api/sms/test-connection', authenticate, SmsController.testConnection);
app.get('/api/sms/balance', authenticate, SmsController.getBalance);

describe('SmsController', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/sms/send', () => {
    const validSmsRequest = {
      senderId: 'TestSender',
      message: 'Hello, this is a test message',
      recipients: ['+1234567890', '+0987654321'],
    };

    it('should send SMS successfully', async () => {
      const mockResponse = {
        success: true,
        messageId: 'msg_123456',
        cost: 0.02,
        recipients: 2,
        message: 'SMS sent successfully',
      };

      mockedSmsService.sendSms.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/sms/send')
        .send(validSmsRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'SMS sent successfully',
        data: mockResponse,
      });

      expect(mockedSmsService.sendSms).toHaveBeenCalledWith({
        ...validSmsRequest,
        userId: 'test-user-123',
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidRequest = {
        senderId: 'TestSender',
        // Missing message and recipients
      };

      const response = await request(app)
        .post('/api/sms/send')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should return 400 for empty recipients array', async () => {
      const invalidRequest = {
        ...validSmsRequest,
        recipients: [],
      };

      const response = await request(app)
        .post('/api/sms/send')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('At least one recipient');
    });

    it('should return 400 for empty message', async () => {
      const invalidRequest = {
        ...validSmsRequest,
        message: '',
      };

      const response = await request(app)
        .post('/api/sms/send')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Message cannot be empty');
    });

    it('should handle service errors', async () => {
      mockedSmsService.sendSms.mockRejectedValue(
        new Error('Insufficient wallet balance')
      );

      const response = await request(app)
        .post('/api/sms/send')
        .send(validSmsRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to send SMS');
      expect(response.body.error).toBe('Insufficient wallet balance');
    });

    it('should handle API errors with proper status codes', async () => {
      const apiError = new Error('Sender ID not approved');
      (apiError as any).statusCode = 403;

      mockedSmsService.sendSms.mockRejectedValue(apiError);

      const response = await request(app)
        .post('/api/sms/send')
        .send(validSmsRequest)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Sender ID not approved');
    });

    it('should validate recipients array length', async () => {
      const tooManyRecipients = {
        ...validSmsRequest,
        recipients: Array(1001).fill('+1234567890'), // Assuming 1000 is the limit
      };

      const response = await request(app)
        .post('/api/sms/send')
        .send(tooManyRecipients)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Too many recipients');
    });

    it('should handle scheduled SMS', async () => {
      const scheduledRequest = {
        ...validSmsRequest,
        scheduledDate: '2024-12-31T23:59:59Z',
      };

      const mockResponse = {
        success: true,
        messageId: 'msg_123456',
        cost: 0.02,
        recipients: 2,
        message: 'SMS scheduled successfully',
      };

      mockedSmsService.sendSms.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/sms/send')
        .send(scheduledRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedSmsService.sendSms).toHaveBeenCalledWith({
        ...scheduledRequest,
        userId: 'test-user-123',
      });
    });
  });

  describe('GET /api/sms/test-connection', () => {
    it('should test connection successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Arkessel API connection successful',
        balance: 150.75,
      };

      mockedSmsService.testArkeselConnection.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/sms/test-connection')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Connection test completed',
        data: mockResponse,
      });
    });

    it('should handle connection test failures', async () => {
      mockedSmsService.testArkeselConnection.mockRejectedValue(
        new Error('Network error')
      );

      const response = await request(app)
        .get('/api/sms/test-connection')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Connection test failed');
    });
  });

  describe('GET /api/sms/balance', () => {
    it('should get balance successfully', async () => {
      const mockResponse = {
        success: true,
        balance: 150.75,
        message: 'Balance retrieved successfully',
      };

      mockedSmsService.getArkeselBalance.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/sms/balance')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Balance retrieved successfully',
        data: mockResponse,
      });
    });

    it('should handle balance check failures', async () => {
      mockedSmsService.getArkeselBalance.mockRejectedValue(
        new Error('Authentication failed')
      );

      const response = await request(app)
        .get('/api/sms/balance')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get balance');
    });
  });

  describe('Authentication', () => {
    beforeEach(() => {
      // Reset authentication mock to require authentication
      mockedAuthenticate.mockImplementation((req, res, next) => {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      });
    });

    it('should require authentication for SMS sending', async () => {
      const response = await request(app)
        .post('/api/sms/send')
        .send({
          senderId: 'TestSender',
          message: 'Test message',
          recipients: ['+1234567890'],
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication required');
    });

    it('should require authentication for connection test', async () => {
      const response = await request(app)
        .get('/api/sms/test-connection')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication required');
    });

    it('should require authentication for balance check', async () => {
      const response = await request(app)
        .get('/api/sms/balance')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication required');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      // Reset authentication mock to allow requests
      mockedAuthenticate.mockImplementation((req: any, res, next) => {
        req.user = {
          userId: 'test-user-123',
          email: 'test@example.com',
        };
        next();
      });
    });

    it('should validate message length', async () => {
      const longMessage = 'A'.repeat(1601); // Assuming 1600 is the limit

      const response = await request(app)
        .post('/api/sms/send')
        .send({
          senderId: 'TestSender',
          message: longMessage,
          recipients: ['+1234567890'],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Message too long');
    });

    it('should validate sender ID format', async () => {
      const response = await request(app)
        .post('/api/sms/send')
        .send({
          senderId: 'Invalid Sender ID!', // Contains invalid characters
          message: 'Test message',
          recipients: ['+1234567890'],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid sender ID format');
    });
  });
});
