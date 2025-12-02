// Mock data for messages
export interface Message {
  id: string;
  recipient: string;
  content: string;
  senderId: string;
  status: 'delivered' | 'failed' | 'pending';
  timestamp: string;
  cost: number;
}

export const mockMessages: Message[] = [
  {
    id: '1',
    recipient: '+233201234567',
    content: 'Your verification code is 123456. It expires in 10 minutes.',
    senderId: 'COMPANY',
    status: 'delivered',
    timestamp: '2023-06-03T14:30:00Z',
    cost: 0.05
  },
  {
    id: '2',
    recipient: '+233207654321',
    content: 'Thank you for your purchase! Your order #12345 has been confirmed.',
    senderId: 'ALERTS',
    status: 'delivered',
    timestamp: '2023-06-03T12:15:00Z',
    cost: 0.05
  },
  {
    id: '3',
    recipient: '+233241234567',
    content: 'Your appointment is scheduled for tomorrow at 2:00 PM. Reply YES to confirm.',
    senderId: 'COMPANY',
    status: 'pending',
    timestamp: '2023-06-03T10:45:00Z',
    cost: 0.05
  },
  {
    id: '4',
    recipient: '+233247654321',
    content: '20% OFF all products this weekend! Shop now at example.com/sale',
    senderId: 'MARKETING',
    status: 'failed',
    timestamp: '2023-06-02T16:20:00Z',
    cost: 0.05
  },
  {
    id: '5',
    recipient: '+233261234567',
    content: 'Your account password was reset. If you did not request this, please contact support.',
    senderId: 'SUPPORT',
    status: 'delivered',
    timestamp: '2023-06-02T09:10:00Z',
    cost: 0.05
  },
  {
    id: '6',
    recipient: '+233267654321',
    content: 'Your monthly statement is now available. Log in to view details.',
    senderId: 'ALERTS',
    status: 'delivered',
    timestamp: '2023-06-01T15:40:00Z',
    cost: 0.05
  },
  {
    id: '7',
    recipient: '+233271234567',
    content: 'Reminder: Your subscription will renew in 3 days. Update preferences at example.com/account',
    senderId: 'COMPANY',
    status: 'failed',
    timestamp: '2023-06-01T11:25:00Z',
    cost: 0.05
  },
  {
    id: '8',
    recipient: '+233277654321',
    content: 'Congratulations! You have earned 500 loyalty points. Check your rewards.',
    senderId: 'MARKETING',
    status: 'delivered',
    timestamp: '2023-05-31T17:50:00Z',
    cost: 0.05
  },
  {
    id: '9',
    recipient: '+233281234567',
    content: 'System maintenance scheduled for tonight from 2-4 AM. Services may be unavailable.',
    senderId: 'SUPPORT',
    status: 'pending',
    timestamp: '2023-05-31T14:15:00Z',
    cost: 0.05
  },
  {
    id: '10',
    recipient: '+233287654321',
    content: 'Your feedback is important! Rate your recent experience: example.com/feedback',
    senderId: 'COMPANY',
    status: 'delivered',
    timestamp: '2023-05-30T10:30:00Z',
    cost: 0.05
  }
];

// Helper functions
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const formatPhoneNumber = (phoneNumber: string) => {
  // Simple formatting for display purposes
  if (phoneNumber.length === 12 && phoneNumber.startsWith('+')) {
    return `${phoneNumber.substring(0, 4)} ${phoneNumber.substring(4, 7)} ${phoneNumber.substring(7)}`;
  }
  return phoneNumber;
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const formatCurrency = (amount: number) => {
  return 'Gh₵ ' + new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
