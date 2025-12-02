// Mock data for fallback when API is unavailable

// Define the types for our dashboard data
export interface MessageCount {
  today: number;
  week: number;
  month: number;
  total: number;
}

export interface WalletBalance {
  credits: number;
  amountSpent: number;
  lastTopup: string;
  lastTopupAmount: number;
}

export interface SenderIds {
  active: number;
  pending: number;
  rejected: number;
}

export interface ApiUsage {
  requests: number;
  failures: number;
}

export interface DashboardStats {
  messagesCount: MessageCount;
  walletBalance: WalletBalance;
  senderIds: SenderIds;
  apiUsage: ApiUsage;
}

export interface RecentMessage {
  id: string;
  recipients: number;
  content: string;
  senderId: string;
  date: string;
  status: "delivered" | "failed" | "pending" | "processing";
}

export interface Transaction {
  id: string;
  type: "topup" | "charge" | "refund";
  amount: number;
  credits: number;
  date: string;
  status: "completed" | "pending" | "failed";
}

export interface DashboardData {
  stats: DashboardStats;
  recentMessages: RecentMessage[];
  recentTransactions: Transaction[];
}

// Mock data provider functions - used only as fallback in the RTK Query error handlers

// Function to get all dashboard data
export const getMockDashboardData = (): DashboardData => {
  // Mock data as fallback
  return {
    stats: {
      messagesCount: {
        today: 245,
        week: 1432,
        month: 5674,
        total: 24562,
      },
      walletBalance: {
        credits: 3240,
        amountSpent: 1200,
        lastTopup: "2023-06-10T10:30:00Z",
        lastTopupAmount: 500,
      },
      senderIds: {
        active: 3,
        pending: 1,
        rejected: 0,
      },
      apiUsage: {
        requests: 3245,
        failures: 24,
      },
    },
    recentMessages: [
      {
        id: "1",
        recipients: 120,
        content: "Your appointment has been confirmed for tomorrow at 10am.",
        senderId: "COMPANY",
        date: "2023-06-15T08:30:00Z",
        status: "delivered",
      },
      {
        id: "2",
        recipients: 45,
        content: "Your order #12345 has been shipped and will arrive tomorrow.",
        senderId: "DELIVERY",
        date: "2023-06-14T14:20:00Z",
        status: "delivered",
      },
      {
        id: "3",
        recipients: 200,
        content: "Flash sale! 30% off all products for the next 24 hours.",
        senderId: "MARKETING",
        date: "2023-06-13T09:15:00Z",
        status: "processing",
      },
    ],
    recentTransactions: [
      {
        id: "t1",
        type: "topup",
        amount: 100,
        credits: 10000,
        date: "2023-06-14T10:24:00Z",
        status: "completed",
      },
      {
        id: "t2",
        type: "charge",
        amount: 25,
        credits: 2500,
        date: "2023-06-13T15:42:00Z",
        status: "completed",
      },
      {
        id: "t3",
        type: "refund",
        amount: 10,
        credits: 1000,
        date: "2023-06-12T09:30:00Z",
        status: "pending",
      },
    ],
  };
};

// Function to get only dashboard stats (if needed separately)
export const getMockDashboardStats = (): DashboardStats => {
  // Return mock data as fallback
  return {
    messagesCount: {
      today: 245,
      week: 1432,
      month: 5674,
      total: 24562,
    },
    walletBalance: {
      credits: 3240,
      amountSpent: 1200,
      lastTopup: "2023-06-10T10:30:00Z",
      lastTopupAmount: 500,
    },
    senderIds: {
      active: 3,
      pending: 1,
      rejected: 0,
    },
    apiUsage: {
      requests: 3245,
      failures: 24,
    },
  };
};
