import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL, getAuthToken } from "@/lib/api-config";

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}`,
  prepareHeaders: (headers) => {
    const token = getAuthToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    headers.set("content-type", "application/json");
    return headers;
  },
});

// Transaction interfaces
export interface Transaction {
  id: string;
  userId: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  description?: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface WalletBalance {
  balance: number;
  pendingCredits: number;
  pendingDebits: number;
  totalCredits: number;
  totalDebits: number;
  lastTransaction?: string;
}

export interface TransactionSummary {
  totalCredits: number;
  totalDebits: number;
  netAmount: number;
  transactionCount: number;
  averageAmount: number;
}

export interface TransactionHistory {
  transactions: Transaction[];
  summary: TransactionSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface WalletStatistics {
  balance: WalletBalance;
  summary: TransactionSummary;
  recentTransactions: Transaction[];
  trends: {
    dailyAverage: number;
    weeklyAverage: number;
    monthlyProjection: number;
  };
}

export interface PaymentReceipt {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  downloadUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  type?: "CREDIT" | "DEBIT" | "ALL";
  status?: "COMPLETED" | "PENDING" | "FAILED" | "ALL";
  search?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  total?: number;
  page?: number;
  limit?: number;
}

export const transactionsApi = createApi({
  reducerPath: "transactionsApi",
  baseQuery,
  tagTypes: ["Transaction", "WalletBalance", "PaymentReceipt", "Statistics"],
  endpoints: (builder) => ({
    // Get all transactions with filtering
    getAllTransactions: builder.query<
      ApiResponse<TransactionHistory>,
      PaginationParams
    >({
      query: (params = {}) => ({
        url: "/wallet/transactions",
        params: {
          ...params,
          type: params.type === "ALL" ? undefined : params.type,
          status: params.status === "ALL" ? undefined : params.status,
        },
      }),
      providesTags: ["Transaction"],
      // Add error handling and mock data fallback
      transformErrorResponse: (response: any) => {
        console.log("API Error:", response);
        return response;
      },
    }),

    // Get wallet top-up transactions only
    getWalletTopups: builder.query<
      ApiResponse<TransactionHistory>,
      PaginationParams
    >({
      query: (params = {}) => ({
        url: "/wallet/transactions",
        params: {
          ...params,
          type: "CREDIT",
          description: "topup", // Filter for wallet top-ups (matches "Wallet topup via...")
        },
      }),
      providesTags: ["Transaction"],
    }),

    // Get message purchase transactions
    getMessagePurchases: builder.query<
      ApiResponse<TransactionHistory>,
      PaginationParams
    >({
      query: (params = {}) => ({
        url: "/sms-packages/purchases",
        params,
      }),
      providesTags: ["Transaction"],
    }),

    // Get wallet balance
    getWalletBalance: builder.query<ApiResponse<WalletBalance>, void>({
      query: () => "/wallet/balance",
      providesTags: ["WalletBalance"],
    }),

    // Get wallet statistics (fallback to basic balance for now)
    getWalletStatistics: builder.query<
      ApiResponse<WalletStatistics>,
      { days?: number }
    >({
      query: (params = {}) => ({
        url: "/wallet/balance", // Use basic balance endpoint for now
        params,
      }),
      providesTags: ["Statistics"],
    }),

    // Get payment receipts
    getPaymentReceipts: builder.query<
      ApiResponse<PaymentReceipt[]>,
      PaginationParams
    >({
      query: (params = {}) => ({
        url: "/payments/receipts",
        params,
      }),
      providesTags: ["PaymentReceipt"],
    }),

    // Export transactions
    exportTransactions: builder.mutation<
      Blob,
      {
        format: "csv" | "excel" | "pdf";
        filters?: PaginationParams;
      }
    >({
      query: ({ format, filters = {} }) => ({
        url: `/wallet-enhanced/export/${format}`,
        method: "POST",
        body: filters,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetAllTransactionsQuery,
  useGetWalletTopupsQuery,
  useGetMessagePurchasesQuery,
  useGetWalletBalanceQuery,
  useGetWalletStatisticsQuery,
  useGetPaymentReceiptsQuery,
  useExportTransactionsMutation,
} = transactionsApi;
