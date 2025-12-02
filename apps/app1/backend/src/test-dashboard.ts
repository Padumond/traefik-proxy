import express, { Request, Response } from 'express';
import { PrismaClient, SenderIdStatus, TransactionType } from '@prisma/client';
import cors from 'cors';

// Initialize express app
const app = express();
const PORT = 3001; // Different than main app port

// Initialize Prisma client
const prisma = new PrismaClient();

// Middleware
app.use(express.json());
app.use(cors());

// Test Route - Get dashboard data for any client user
app.get('/api/dashboard/test', (req: Request, res: Response) => {
  (async () => {
  try {
    // Get a sample user ID to test with
    const testUser = await prisma.user.findFirst({
      where: { role: 'CLIENT' }
    });
    
    if (!testUser) {
      return res.status(404).json({ success: false, message: 'No test users found' });
    }
    
    const userId = testUser.id;
    
    // Get current date values for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);

    // Get message counts
    const [todayCount, weekCount, monthCount, totalCount] = await Promise.all([
      // Today's messages
      prisma.smsLog.count({
        where: {
          userId,
          sentAt: { gte: today }
        }
      }),
      // Week's messages
      prisma.smsLog.count({
        where: {
          userId,
          sentAt: { gte: weekAgo }
        }
      }),
      // Month's messages
      prisma.smsLog.count({
        where: {
          userId,
          sentAt: { gte: monthAgo }
        }
      }),
      // Total messages
      prisma.smsLog.count({
        where: { userId }
      })
    ]);

    // Get sender ID counts
    const [activeSenderIds, pendingSenderIds, rejectedSenderIds] = await Promise.all([
      prisma.senderID.count({
        where: {
          userId,
          status: SenderIdStatus.APPROVED
        }
      }),
      prisma.senderID.count({
        where: {
          userId,
          status: SenderIdStatus.PENDING
        }
      }),
      prisma.senderID.count({
        where: {
          userId,
          status: SenderIdStatus.REJECTED
        }
      })
    ]);

    // Get wallet information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletBalance: true
      }
    });

    // Get recent messages
    const recentMessages = await prisma.smsLog.findMany({
      where: { userId },
      orderBy: {
        sentAt: 'desc'
      },
      take: 5,
      include: {
        senderId: true
      }
    });

    // Get recent transactions
    const recentTransactions = await prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    // Format the response
    const response = {
      success: true,
      data: {
        stats: {
          messagesCount: {
            today: todayCount,
            week: weekCount,
            month: monthCount,
            total: totalCount
          },
          walletBalance: {
            balance: user?.walletBalance || 0,
            amountSpent: 0, // Calculate if needed
            lastTopup: null,
            lastTopupAmount: null
          },
          senderIds: {
            active: activeSenderIds,
            pending: pendingSenderIds,
            rejected: rejectedSenderIds
          },
          apiUsage: {
            requests: totalCount,
            failures: 0
          }
        },
        recentMessages: recentMessages.map(message => ({
          id: message.id,
          recipients: message.recipients.length,
          message: message.message,
          senderId: message.senderId?.senderId || 'Unknown',
          date: message.sentAt.toISOString(),
          status: message.status
        })),
        recentTransactions: recentTransactions.map(transaction => ({
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          date: transaction.createdAt.toISOString(),
          description: transaction.description
        }))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  })();
});

// Health check route
app.get('/health', (req: Request, res: Response) => {
  (async () => {
    res.status(200).json({ status: 'ok', message: 'Dashboard test server is running' });
  })();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Dashboard test server running at http://localhost:${PORT}`);
  console.log(`Access the test API at: http://localhost:${PORT}/api/dashboard/test`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  prisma.$disconnect();
  process.exit();
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully');
  prisma.$disconnect();
  process.exit();
});
