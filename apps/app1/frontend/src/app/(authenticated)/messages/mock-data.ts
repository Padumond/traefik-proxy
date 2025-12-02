// Mock data for message templates, scheduled messages, and contact groups

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledMessage {
  id: string;
  name: string;
  content: string;
  scheduledFor: string;
  status: 'scheduled' | 'pending' | 'sent' | 'failed';
  recipientCount: number;
  senderId: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  groupIds: string[];
  createdAt: string;
}

export const mockMessageTemplates: MessageTemplate[] = [
  {
    id: 'template-1',
    name: 'Welcome Message',
    content: 'Welcome to our service! We are excited to have you on board. Reply HELP for assistance.',
    createdAt: '2025-05-15T10:30:00Z',
    updatedAt: '2025-05-15T10:30:00Z'
  },
  {
    id: 'template-2',
    name: 'Payment Reminder',
    content: 'This is a friendly reminder that your payment of Gh₵{{amount}} is due on {{date}}. Thank you!',
    createdAt: '2025-05-20T14:15:00Z',
    updatedAt: '2025-05-25T09:45:00Z'
  },
  {
    id: 'template-3',
    name: 'Appointment Confirmation',
    content: 'Your appointment has been confirmed for {{date}} at {{time}}. Reply C to confirm or R to reschedule.',
    createdAt: '2025-05-22T11:20:00Z',
    updatedAt: '2025-05-22T11:20:00Z'
  }
];

export const mockScheduledMessages: ScheduledMessage[] = [
  {
    id: 'scheduled-1',
    name: 'Monthly Newsletter',
    content: 'Check out our latest products and offers this month! Visit our website for more details.',
    scheduledFor: '2025-06-15T10:00:00Z',
    status: 'pending',
    recipientCount: 1250,
    senderId: 'COMPANY'
  },
  {
    id: 'scheduled-2',
    name: 'Weekend Promotion',
    content: 'Get 20% off all products this weekend! Use code WEEKEND20 at checkout.',
    scheduledFor: '2025-06-07T09:00:00Z',
    status: 'scheduled',
    recipientCount: 850,
    senderId: 'PROMO'
  },
  {
    id: 'scheduled-3',
    name: 'Service Update',
    content: 'Our system will be under maintenance on June 10 from 2-4AM. Service might be temporarily unavailable.',
    scheduledFor: '2025-06-08T15:00:00Z',
    status: 'scheduled',
    recipientCount: 2500,
    senderId: 'UPDATES'
  }
];

export const mockContactGroups: ContactGroup[] = [
  {
    id: 'group-1',
    name: 'Customers',
    description: 'Active customers who have made purchases in the last 6 months',
    contactCount: 243,
    createdAt: '2025-04-10T08:30:00Z',
    updatedAt: '2025-06-01T14:20:00Z'
  },
  {
    id: 'group-2',
    name: 'Subscribers',
    description: 'Newsletter subscribers who opted in for promotional messages',
    contactCount: 187,
    createdAt: '2025-04-15T11:45:00Z',
    updatedAt: '2025-05-28T09:15:00Z'
  },
  {
    id: 'group-3',
    name: 'VIP Clients',
    description: 'High-value customers with premium service access',
    contactCount: 42,
    createdAt: '2025-05-05T16:20:00Z',
    updatedAt: '2025-05-30T10:10:00Z'
  }
];

export const mockContacts: Contact[] = [
  {
    id: 'contact-1',
    name: 'John Doe',
    phoneNumber: '+233501234567',
    email: 'john.doe@example.com',
    groupIds: ['group-1', 'group-3'],
    createdAt: '2025-04-12T09:30:00Z'
  },
  {
    id: 'contact-2',
    name: 'Jane Smith',
    phoneNumber: '+233507654321',
    email: 'jane.smith@example.com',
    groupIds: ['group-1', 'group-2'],
    createdAt: '2025-04-15T14:45:00Z'
  },
  {
    id: 'contact-3',
    name: 'Michael Johnson',
    phoneNumber: '+233509876543',
    groupIds: ['group-2'],
    createdAt: '2025-05-02T11:20:00Z'
  }
];
