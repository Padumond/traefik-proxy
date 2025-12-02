import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL, getAuthToken } from "@/lib/api-config";

export interface SmsPackage {
  id: string;
  name: string;
  description?: string;
  credits: number;
  price: number;
  currency: string;
  isActive: boolean;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PackagePurchase {
  id: string;
  userId: string;
  packageId: string;
  creditsReceived: number;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  paymentReference?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  package?: {
    name: string;
    description?: string;
  };
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PurchasePackageRequest {
  paymentMethod?: "stripe" | "paystack";
  email?: string;
}

export interface CompletePurchaseRequest {
  paymentReference: string;
  paymentMethod?: string;
}

export interface CustomPackageRequest {
  amount: number;
  paymentMethod?: "stripe" | "paystack";
  email?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export const smsPackagesApi = createApi({
  reducerPath: "smsPackagesApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/sms-packages`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      headers.set("content-type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["SmsPackage", "Balance", "Purchase"],
  endpoints: (builder) => ({
    // Get all active packages (public)
    getPackages: builder.query<ApiResponse<SmsPackage[]>, void>({
      query: () => "/packages",
      providesTags: ["SmsPackage"],
    }),

    // Get package by ID (public)
    getPackageById: builder.query<ApiResponse<SmsPackage>, string>({
      query: (packageId) => `/packages/${packageId}`,
      providesTags: (result, error, packageId) => [
        { type: "SmsPackage", id: packageId },
      ],
    }),

    // Get user's SMS balance (protected)
    getUserBalance: builder.query<ApiResponse<{ balance: number }>, void>({
      query: () => "/balance",
      providesTags: ["Balance"],
    }),

    // Get user's purchase history (protected)
    getPurchaseHistory: builder.query<
      ApiResponse<PackagePurchase[]>,
      PaginationParams
    >({
      query: (params = {}) => ({
        url: "/purchases",
        params,
      }),
      providesTags: ["Purchase"],
    }),

    // Purchase package (protected)
    purchasePackage: builder.mutation<
      ApiResponse<{ paymentIntent: PaymentIntent; package: SmsPackage }>,
      { packageId: string; data: PurchasePackageRequest }
    >({
      query: ({ packageId, data }) => ({
        url: `/packages/${packageId}/purchase`,
        method: "POST",
        body: data,
      }),
    }),

    // Complete purchase (protected)
    completePurchase: builder.mutation<
      ApiResponse<{ purchase: PackagePurchase; newBalance: number }>,
      { packageId: string; data: CompletePurchaseRequest }
    >({
      query: ({ packageId, data }) => ({
        url: `/packages/${packageId}/complete`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Balance", "Purchase"],
    }),

    // Purchase custom package (protected)
    purchaseCustomPackage: builder.mutation<
      ApiResponse<{ paymentIntent: PaymentIntent; package: SmsPackage }>,
      CustomPackageRequest
    >({
      query: (data) => ({
        url: "/custom-package/purchase",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Balance"],
    }),

    // Admin endpoints
    createPackage: builder.mutation<
      ApiResponse<SmsPackage>,
      Partial<SmsPackage>
    >({
      query: (data) => ({
        url: "/packages",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["SmsPackage"],
    }),

    updatePackage: builder.mutation<
      ApiResponse<SmsPackage>,
      { packageId: string; data: Partial<SmsPackage> }
    >({
      query: ({ packageId, data }) => ({
        url: `/packages/${packageId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { packageId }) => [
        { type: "SmsPackage", id: packageId },
        "SmsPackage",
      ],
    }),

    deletePackage: builder.mutation<ApiResponse<void>, string>({
      query: (packageId) => ({
        url: `/packages/${packageId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SmsPackage"],
    }),
  }),
});

export const {
  useGetPackagesQuery,
  useGetPackageByIdQuery,
  useGetUserBalanceQuery,
  useGetPurchaseHistoryQuery,
  usePurchasePackageMutation,
  useCompletePurchaseMutation,
  usePurchaseCustomPackageMutation,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
} = smsPackagesApi;
