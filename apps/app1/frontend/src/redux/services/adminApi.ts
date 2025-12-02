import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL, getAuthToken } from "@/lib/api-config";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  walletBalance: number;
  messagesSent?: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSenderID {
  id: string;
  userId: string;
  senderId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
  };
}

export interface AdminMessage {
  id: string;
  userId: string;
  message: string;
  recipients: string[];
  status: string;
  cost: number;
  sentAt: string;
  user: {
    name: string;
    email: string;
  };
  senderId?: {
    senderId: string;
  };
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  description?: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export interface PaginationInfo {
  total: number;
  pages: number;
  current: number;
  limit: number;
}

export interface PaginatedData<T> {
  data: T;
  pagination: PaginationInfo;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  total?: number;
  page?: number;
  limit?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreditDebitRequest {
  userId: string;
  amount: number;
  description?: string;
}

export interface SenderIdUpdateRequest {
  status: "APPROVED" | "REJECTED";
  notes?: string;
}

export const adminApi = createApi({
  reducerPath: "adminApi",
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
  tagTypes: ["AdminUser", "AdminSenderID", "AdminMessage", "WalletTransaction"],
  endpoints: (builder) => ({
    // Users management
    getUsers: builder.query<ApiResponse<AdminUser[]>, PaginationParams>({
      query: (params) => ({
        url: "/users",
        params: {
          ...params,
          role: params.role || "CLIENT", // Default to CLIENT role
        },
      }),
      providesTags: ["AdminUser"],
    }),

    getUserById: builder.query<ApiResponse<AdminUser>, string>({
      query: (id) => `/users/${id}`,
      providesTags: ["AdminUser"],
    }),

    updateUser: builder.mutation<
      ApiResponse<AdminUser>,
      { id: string; data: Partial<AdminUser> }
    >({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["AdminUser"],
    }),

    // Wallet management
    creditWallet: builder.mutation<
      ApiResponse<WalletTransaction>,
      CreditDebitRequest
    >({
      query: (data) => ({
        url: "/wallet/credit",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["AdminUser", "WalletTransaction"],
    }),

    debitWallet: builder.mutation<
      ApiResponse<WalletTransaction>,
      CreditDebitRequest
    >({
      query: (data) => ({
        url: "/wallet/debit",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["AdminUser", "WalletTransaction"],
    }),

    getWalletTransactions: builder.query<
      ApiResponse<WalletTransaction[]>,
      PaginationParams
    >({
      query: (params) => ({
        url: "/wallet/transactions",
        params,
      }),
      providesTags: ["WalletTransaction"],
    }),

    // Sender ID management
    getAllSenderIds: builder.query<
      ApiResponse<PaginatedData<AdminSenderID[]>>,
      PaginationParams
    >({
      query: (params) => ({
        url: "/sender-ids/all",
        params,
      }),
      providesTags: ["AdminSenderID"],
    }),

    updateSenderIdStatus: builder.mutation<
      ApiResponse<AdminSenderID>,
      { id: string; data: SenderIdUpdateRequest }
    >({
      query: ({ id, data }) => ({
        url: `/sender-ids/${id}/status`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["AdminSenderID"],
    }),

    // Messages management
    getAllMessages: builder.query<
      ApiResponse<PaginatedData<AdminMessage[]>>,
      PaginationParams
    >({
      query: (params) => ({
        url: "/sms/admin/logs",
        params,
      }),
      providesTags: ["AdminMessage"],
    }),

    // Dashboard stats
    getAdminDashboardStats: builder.query<ApiResponse<any>, void>({
      query: () => "/dashboard/admin",
      providesTags: ["AdminUser", "AdminMessage", "WalletTransaction"],
    }),

    // System reports
    getSystemReports: builder.query<
      ApiResponse<any>,
      { type: string; startDate?: string; endDate?: string }
    >({
      query: (params) => ({
        url: "/reports/system",
        params,
      }),
    }),

    exportReport: builder.mutation<
      Blob,
      { type: string; format: string; filters?: any }
    >({
      query: (data) => ({
        url: "/reports/export",
        method: "POST",
        body: data,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useCreditWalletMutation,
  useDebitWalletMutation,
  useGetWalletTransactionsQuery,
  useGetAllSenderIdsQuery,
  useUpdateSenderIdStatusMutation,
  useGetAllMessagesQuery,
  useGetAdminDashboardStatsQuery,
  useGetSystemReportsQuery,
  useExportReportMutation,
} = adminApi;
