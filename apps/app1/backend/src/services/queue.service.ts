import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient, MessageStatus } from '@prisma/client';
import { SmsService } from './sms.service';

const prisma = new PrismaClient();
// No need to instantiate SmsService as we'll use its static methods

// Create Redis connection
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Create SMS queue
export const smsQueue = new Queue('sms-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Define job data interface
export interface ScheduleSmsJobData {
  smsLogId: string;
  userId: string;
  message: string;
  recipients: string[];
  senderId: string; // Changed from optional to required
  cost: number;
}

/**
 * Add a scheduled SMS job to the queue
 */
export const scheduleSmsJob = async (
  jobData: ScheduleSmsJobData,
  scheduledFor: Date
): Promise<string> => {
  // Calculate delay in milliseconds
  const now = new Date();
  const delay = scheduledFor.getTime() - now.getTime();
  
  // Schedule the job with the calculated delay
  const job = await smsQueue.add('send-scheduled-sms', jobData, {
    delay: delay > 0 ? delay : 0,
    jobId: jobData.smsLogId, // Use smsLogId as the job ID for easy reference
  });

  // Ensure we return a string - job.id should be the same as jobData.smsLogId
  return job.id || jobData.smsLogId;
};

/**
 * Cancel a scheduled SMS job
 */
export const cancelScheduledSmsJob = async (jobId: string): Promise<boolean> => {
  try {
    const removed = await smsQueue.remove(jobId);
    
    if (removed) {
      // Update the SMS log status to cancelled
      await prisma.smsLog.update({
        where: { id: jobId },
        data: {
          scheduleStatus: 'CANCELLED',
        },
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error cancelling scheduled SMS job:', error);
    return false;
  }
};

/**
 * Initialize the SMS queue worker
 */
export const initSmsQueueWorker = (): Worker => {
  const worker = new Worker('sms-queue', async (job: Job<ScheduleSmsJobData>) => {
    const { smsLogId, userId, message, recipients, senderId, cost } = job.data as ScheduleSmsJobData;
    
    try {
      // Update SMS log status to processing
      await prisma.smsLog.update({
        where: { id: smsLogId },
        data: {
          scheduleStatus: 'PROCESSING',
        },
      });

      // Process the SMS sending - use static method
      const result = await SmsService.sendSms({
        userId,
        message,
        recipients,
        senderId,
        // Removed cost parameter as it's not in SendSmsParams interface
      });

      // Update the SMS log with the result
      await prisma.smsLog.update({
        where: { id: smsLogId },
        data: {
          status: result.status,
          providerRef: result.messageId, // Using messageId instead of providerRef
          scheduleStatus: 'COMPLETED',
        },
      });

      return result;
    } catch (error) {
      console.error(`Error processing scheduled SMS job ${smsLogId}:`, error);
      
      // Update SMS log with failed status
      await prisma.smsLog.update({
        where: { id: smsLogId },
        data: {
          status: 'FAILED',
          scheduleStatus: 'COMPLETED',
        },
      });
      
      throw error;
    }
  }, { connection: redisConnection });

  // Handle worker events
  worker.on('completed', (job: Job<ScheduleSmsJobData>) => {
    console.log(`Scheduled SMS job ${job.id} completed successfully`);
  });

  worker.on('failed', (job: Job<ScheduleSmsJobData> | undefined, error: Error) => {
    console.error(`Scheduled SMS job ${job?.id} failed:`, error);
  });

  return worker;
};
