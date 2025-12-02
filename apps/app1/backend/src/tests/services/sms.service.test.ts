import { SmsService } from '../../services/sms.service';
import { ArkeselService } from '../../services/arkessel.service';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../middleware/error.middleware';

// Mock dependencies
jest.mock('../../services/arkessel.service');
jest.mock('@prisma/client');

const mockedArkeselService = ArkeselService as jest.Mocked<typeof ArkeselService>;
const mockedPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  senderId: {
    findUnique: jest.fn(),
  },
  smsLog: {
    create: jest.fn(),
  },
  walletTransaction: {
    create: jest.fn(),
  },
} as any;

// Mock prisma instance
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: mockedPrisma,
}));

describe('SmsService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('sendSms', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      walletBalance: 100.0,
    };

    const mockSenderId = {
      id: 'sender-123',
      senderId: 'TestSender',
      userId: 'user-123',
      status: 'APPROVED',
    };

    const mockSmsParams = {
      senderId: 'TestSender',
      message: 'Test message',
      recipients: ['+1234567890', '+0987654321'],
      userId: 'user-123',
    };

    beforeEach(() => {
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedPrisma.senderId.findUnique.mockResolvedValue(mockSenderId);
      mockedArkeselService.calculateSmsCount.mockReturnValue(1);
      mockedArkeselService.formatPhoneNumber.mockImplementation((phone) => phone);
      mockedArkeselService.validatePhoneNumber.mockReturnValue(true);
    });

    it('should send SMS successfully', async () => {
      const mockArkeselResponse = {
        success: true,
        messageId: 'msg_123456',
        message: 'SMS sent successfully',
      };

      mockedArkeselService.sendSms.mockResolvedValue({
        status: 'success',
        message: 'SMS sent successfully',
        data: {
          id: 'msg_123456',
          balance: 99,
          user: 'testuser',
          api_key: 'test-key',
          type: 'plain',
          unicode: false,
          message: 'Test message',
          sender: 'TestSender',
          recipients: '+1234567890,+0987654321',
          scheduled_date: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      mockedPrisma.smsLog.create.mockResolvedValue({
        id: 'log-123',
        messageId: 'msg_123456',
      });

      mockedPrisma.walletTransaction.create.mockResolvedValue({
        id: 'txn-123',
      });

      mockedPrisma.user.update.mockResolvedValue({
        ...mockUser,
        walletBalance: 99.98,
      });

      const result = await SmsService.sendSms(mockSmsParams);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_123456');
      expect(result.cost).toBe(0.02); // 2 recipients * $0.01
      expect(mockedPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          walletBalance: {
            decrement: 0.02,
          },
        },
      });
    });

    it('should throw error when user not found', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);

      await expect(SmsService.sendSms(mockSmsParams)).rejects.toThrow('User not found');
    });

    it('should throw error when sender ID not found', async () => {
      mockedPrisma.senderId.findUnique.mockResolvedValue(null);

      await expect(SmsService.sendSms(mockSmsParams)).rejects.toThrow('Sender ID not found');
    });

    it('should throw error when sender ID not approved', async () => {
      mockedPrisma.senderId.findUnique.mockResolvedValue({
        ...mockSenderId,
        status: 'PENDING',
      });

      await expect(SmsService.sendSms(mockSmsParams)).rejects.toThrow(
        'Sender ID not approved'
      );
    });

    it('should throw error when insufficient balance', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        walletBalance: 0.005, // Less than required $0.02
      });

      await expect(SmsService.sendSms(mockSmsParams)).rejects.toThrow(
        'Insufficient wallet balance'
      );
    });

    it('should handle invalid phone numbers', async () => {
      mockedArkeselService.validatePhoneNumber.mockReturnValue(false);

      await expect(
        SmsService.sendSms({
          ...mockSmsParams,
          recipients: ['invalid-phone'],
        })
      ).rejects.toThrow('Invalid phone number format');
    });

    it('should handle Arkessel API failures', async () => {
      mockedArkeselService.sendSms.mockRejectedValue(
        new ApiError('Arkessel API Error: Authentication failed', 401)
      );

      await expect(SmsService.sendSms(mockSmsParams)).rejects.toThrow(
        'Arkessel API Error: Authentication failed'
      );
    });

    it('should calculate cost correctly for multiple SMS parts', async () => {
      mockedArkeselService.calculateSmsCount.mockReturnValue(2); // Long message

      mockedArkeselService.sendSms.mockResolvedValue({
        status: 'success',
        message: 'SMS sent successfully',
        data: {
          id: 'msg_123456',
          balance: 99,
          user: 'testuser',
          api_key: 'test-key',
          type: 'plain',
          unicode: false,
          message: 'Very long test message...',
          sender: 'TestSender',
          recipients: '+1234567890',
          scheduled_date: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      mockedPrisma.smsLog.create.mockResolvedValue({
        id: 'log-123',
        messageId: 'msg_123456',
      });

      mockedPrisma.walletTransaction.create.mockResolvedValue({
        id: 'txn-123',
      });

      mockedPrisma.user.update.mockResolvedValue({
        ...mockUser,
        walletBalance: 99.98,
      });

      const result = await SmsService.sendSms({
        ...mockSmsParams,
        recipients: ['+1234567890'], // Single recipient
      });

      expect(result.cost).toBe(0.02); // 1 recipient * 2 SMS parts * $0.01
    });
  });

  describe('testArkeselConnection', () => {
    it('should return success when connection works', async () => {
      mockedArkeselService.testConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful',
        balance: 100,
      });

      const result = await SmsService.testArkeselConnection();

      expect(result.success).toBe(true);
      expect(result.balance).toBe(100);
    });

    it('should return failure when connection fails', async () => {
      mockedArkeselService.testConnection.mockRejectedValue(
        new Error('Network error')
      );

      const result = await SmsService.testArkeselConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection test failed');
    });
  });

  describe('getArkeselBalance', () => {
    it('should return balance successfully', async () => {
      mockedArkeselService.getBalance.mockResolvedValue({
        status: 'success',
        message: 'Balance retrieved',
        data: {
          balance: 150.75,
          user: 'testuser',
        },
      });

      const result = await SmsService.getArkeselBalance();

      expect(result.success).toBe(true);
      expect(result.balance).toBe(150.75);
    });

    it('should handle balance check failures', async () => {
      mockedArkeselService.getBalance.mockRejectedValue(
        new ApiError('Authentication failed', 401)
      );

      const result = await SmsService.getArkeselBalance();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Balance check failed');
    });
  });

  describe('Edge Cases', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      walletBalance: 100.0,
    };

    const mockSenderId = {
      id: 'sender-123',
      senderId: 'TestSender',
      userId: 'user-123',
      status: 'APPROVED',
    };

    beforeEach(() => {
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedPrisma.senderId.findUnique.mockResolvedValue(mockSenderId);
      mockedArkeselService.calculateSmsCount.mockReturnValue(1);
      mockedArkeselService.formatPhoneNumber.mockImplementation((phone) => phone);
      mockedArkeselService.validatePhoneNumber.mockReturnValue(true);
    });

    it('should handle empty recipients array', async () => {
      await expect(
        SmsService.sendSms({
          senderId: 'TestSender',
          message: 'Test message',
          recipients: [],
          userId: 'user-123',
        })
      ).rejects.toThrow('At least one recipient is required');
    });

    it('should handle empty message', async () => {
      await expect(
        SmsService.sendSms({
          senderId: 'TestSender',
          message: '',
          recipients: ['+1234567890'],
          userId: 'user-123',
        })
      ).rejects.toThrow('Message cannot be empty');
    });

    it('should handle database transaction failures', async () => {
      mockedArkeselService.sendSms.mockResolvedValue({
        status: 'success',
        message: 'SMS sent successfully',
        data: {
          id: 'msg_123456',
          balance: 99,
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
        },
      });

      mockedPrisma.smsLog.create.mockRejectedValue(new Error('Database error'));

      await expect(
        SmsService.sendSms({
          senderId: 'TestSender',
          message: 'Test message',
          recipients: ['+1234567890'],
          userId: 'user-123',
        })
      ).rejects.toThrow('Database error');
    });
  });
});
