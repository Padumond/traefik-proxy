import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL, getAuthToken } from "@/lib/api-config";

// Define interfaces for dashboard API data
export interface MessageCount {
  today: number;
  week: number;
  month: number;
  total: number;
}

export interface WalletBalance {
  balance: number;
  amountSpent: number;
  lastTopup: string | null;
  lastTopupAmount: number | null;
}

export interface SenderIds {
  active: number;
  pending: number;
  rejected: number;
}

export interface SmsCredits {
  available: number;
  used: number;
  total: number;
}

export interface SmsBalance {
  smsCredits: number;
  provider: string;
  lastUpdated: string;
  status: "success" | "error";
  error?: string;
}

export interface ApiUsage {
  requests: number;
  failures: number;
}

export interface Analytics {
  deliveryStatus: {
    delivered: number;
    failed: number;
    pending: number;
  };
  messageVolume: {
    daily: {
      labels: string[];
      values: number[];
    };
    weekly: {
      labels: string[];
      values: number[];
    };
    monthly: {
      labels: string[];
      values: number[];
    };
  };
  monthlyDelivery: Array<{
    month: string;
    deliveryRate: number;
    messageCount: number;
  }>;
  averageSuccessRate: {
    overall: number;
    last30Days: number;
    last7Days: number;
    trend: number;
  };
}

export interface DashboardStats {
  messagesCount: MessageCount;
  walletBalance: WalletBalance;
  senderIds: SenderIds;
  smsCredits: SmsCredits;
  apiUsage: ApiUsage;
  analytics: Analytics;
}

export interface RecentMessage {
  id: string;
  recipients: number;
  message: string;
  senderId: string;
  date: string;
  status: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  credits?: number; // SMS credits for CREDIT transactions
  date: string;
  description: string | null;
}

export interface DashboardData {
  stats: DashboardStats;
  recentMessages: RecentMessage[];
  recentTransactions: Transaction[];
}

// Define the dashboard API service
export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = getAuthToken();

      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      headers.set("content-type", "application/json");

      return headers;
    },
  }),
  tagTypes: ["Dashboard", "DashboardStats"],
  endpoints: (builder) => ({
    // Get all dashboard data in one call
    getDashboardData: builder.query<DashboardData, void>({
      query: () => `/dashboard`,
      transformResponse: (response: {
        success: boolean;
        data: DashboardData;
      }) => {
        // Extract the data from the success wrapper
        return response.data;
      },
      providesTags: ["Dashboard"],
      // Handle errors with mock data
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          // Error handling will be in the component using the hook
        }
      },
    }),

    // Get test dashboard data (no auth required)
    getDashboardTestData: builder.query<DashboardData, void>({
      query: () => `/dashboard/test`,
      transformResponse: (response: {
        success: boolean;
        data: DashboardData;
      }) => {
        // Extract the data from the success wrapper
        return response.data;
      },
      providesTags: ["Dashboard"],
    }),

    // Get dashboard stats separately
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => `/dashboard/stats`,
      transformResponse: (response: {
        success: boolean;
        data: DashboardStats;
      }) => {
        return response.data;
      },
      providesTags: ["DashboardStats"],
      // Handle errors with mock data
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (error) {
          console.error("Error fetching dashboard stats:", error);
        }
      },
    }),

    // Get recent messages only
    getRecentMessages: builder.query<RecentMessage[], void>({
      query: () => `/dashboard/messages/recent`,
      transformResponse: (response: {
        success: boolean;
        data: RecentMessage[];
      }) => {
        return response.data;
      },
      providesTags: ["Dashboard"],
      // Handle errors with mock data
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (error) {
          console.error("Error fetching recent messages:", error);
          // Error handling will be in the component using the hook
        }
      },
    }),

    // Get recent transactions only
    getRecentTransactions: builder.query<Transaction[], void>({
      query: () => `/dashboard/transactions/recent`,
      transformResponse: (response: {
        success: boolean;
        data: Transaction[];
      }) => {
        return response.data;
      },
      providesTags: ["Dashboard"],
      // Handle errors with mock data
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (error) {
          console.error("Error fetching recent transactions:", error);
          // Error handling will be in the component using the hook
        }
      },
    }),

    // Get SMS balance from Arkessel
    getSmsBalance: builder.query<SmsBalance, void>({
      query: () => `/dashboard/sms-balance`,
      transformResponse: (response: {
        success: boolean;
        data: SmsBalance;
        message: string;
      }) => {
        return response.data;
      },
      providesTags: ["Dashboard"],
      // Handle errors gracefully
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (error) {
          console.error("Error fetching SMS balance:", error);
          // Error handling will be in the component using the hook
        }
      },
    }),

    // Get average success rate
    getAverageSuccessRate: builder.query<
      {
        overall: number;
        last30Days: number;
        last7Days: number;
        trend: number;
      },
      void
    >({
      query: () => "/dashboard/success-rate",
      transformResponse: (response: {
        success: boolean;
        data: {
          overall: number;
          last30Days: number;
          last7Days: number;
          trend: number;
        };
      }) => {
        return response.data;
      },
      providesTags: ["Dashboard"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (error) {
          console.error("Error fetching average success rate:", error);
        }
      },
    }),
  }),
});

// Export hooks for usage in components, generated based on the defined endpoints
export const {
  useGetDashboardDataQuery,
  useGetDashboardTestDataQuery,
  useGetDashboardStatsQuery,
  useGetRecentMessagesQuery,
  useGetRecentTransactionsQuery,
  useGetSmsBalanceQuery,
  useGetAverageSuccessRateQuery,
} = dashboardApi;
