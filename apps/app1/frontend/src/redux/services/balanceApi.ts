import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL, getAuthToken } from "@/lib/api-config";

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/balance`,
  prepareHeaders: (headers) => {
    const token = getAuthToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    headers.set("content-type", "application/json");
    return headers;
  },
});

export interface BalanceInfo {
  arkeselBalance: number;
  clientBalance: number;
  conversionRate: number;
  lastSync: string;
}

export interface DistributionRequest {
  arkeselCredits: number;
  distributionType: "MANUAL" | "AUTOMATIC";
}

export interface DistributionResult {
  success: boolean;
  arkeselCredits: number;
  clientCredits: number;
  conversionRate: number;
  transaction: any;
}

export interface PricingTier {
  id: string;
  name: string;
  minVolume: number;
  maxVolume?: number;
  discountPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePricingTierRequest {
  name: string;
  minVolume: number;
  maxVolume?: number;
  discountPercentage: number;
  isActive?: boolean;
}

export interface DistributionHistory {
  id: string;
  arkeselCredits: number;
  clientCredits: number;
  distributionType: "MANUAL" | "AUTOMATIC";
  createdAt: string;
}

export interface BulkPricingRequest {
  volumes: number[];
  countryCode?: string;
  smsType?: string;
}

export interface BulkPricingResult {
  bulkPricing: Array<{
    volume: number;
    baseCost: number;
    markup: number;
    clientPrice: number;
    profit: number;
  }>;
  totalVolume: number;
  averagePrice: number;
}

export interface PricingRecommendations {
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    suggestedMarkup?: number;
    potentialSavings?: number;
    suggestedAction?: string;
  }>;
  currentMarkup: number;
  usageStats: {
    totalVolume: number;
    totalCost: number;
    averageMonthlyVolume: number;
    topCountries: string[];
    averageCostPerSms: number;
  };
}

export const balanceApi = createApi({
  reducerPath: "balanceApi",
  baseQuery,
  tagTypes: ["Balance", "PricingTier", "DistributionHistory"],
  endpoints: (builder) => ({
    // Balance Management
    syncArkeselBalance: builder.mutation<
      { balance: number; syncedAt: string },
      void
    >({
      query: () => ({
        url: "/sync",
        method: "POST",
      }),
      invalidatesTags: ["Balance"],
    }),

    distributeBalance: builder.mutation<
      DistributionResult,
      DistributionRequest
    >({
      query: (data) => ({
        url: "/distribute",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Balance", "DistributionHistory"],
    }),

    autoDistributeBalance: builder.mutation<DistributionResult, void>({
      query: () => ({
        url: "/auto-distribute",
        method: "POST",
      }),
      invalidatesTags: ["Balance", "DistributionHistory"],
    }),

    // Pricing Tiers
    getPricingTiers: builder.query<PricingTier[], void>({
      query: () => "/tiers",
      providesTags: ["PricingTier"],
    }),

    createPricingTier: builder.mutation<PricingTier, CreatePricingTierRequest>({
      query: (data) => ({
        url: "/tiers",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["PricingTier"],
    }),

    updatePricingTier: builder.mutation<
      PricingTier,
      { id: string; data: Partial<CreatePricingTierRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/tiers/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["PricingTier"],
    }),

    deletePricingTier: builder.mutation<void, string>({
      query: (id) => ({
        url: `/tiers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PricingTier"],
    }),

    // Distribution History
    getDistributionHistory: builder.query<
      {
        transactions: DistributionHistory[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      },
      {
        page?: number;
        limit?: number;
        startDate?: string;
        endDate?: string;
      }
    >({
      query: (params) => ({
        url: "/history",
        params,
      }),
      providesTags: ["DistributionHistory"],
    }),

    // Bulk Pricing
    calculateBulkPricing: builder.mutation<
      BulkPricingResult,
      BulkPricingRequest
    >({
      query: (data) => ({
        url: "/bulk-pricing",
        method: "POST",
        body: data,
      }),
    }),

    // Pricing Recommendations
    getPricingRecommendations: builder.query<PricingRecommendations, void>({
      query: () => "/recommendations",
    }),

    // Balance Analytics
    getBalanceAnalytics: builder.query<
      {
        distributionSummary: {
          totalDistributed: number;
          averageConversionRate: number;
          manualDistributions: number;
          autoDistributions: number;
        };
        pricingPerformance: {
          activeTiers: number;
          mostUsedTier: string;
          averageDiscount: number;
        };
      },
      { days?: number }
    >({
      query: (params) => ({
        url: "/analytics",
        params,
      }),
    }),
  }),
});

export const {
  useSyncArkeselBalanceMutation,
  useDistributeBalanceMutation,
  useAutoDistributeBalanceMutation,
  useGetPricingTiersQuery,
  useCreatePricingTierMutation,
  useUpdatePricingTierMutation,
  useDeletePricingTierMutation,
  useGetDistributionHistoryQuery,
  useCalculateBulkPricingMutation,
  useGetPricingRecommendationsQuery,
  useGetBalanceAnalyticsQuery,
} = balanceApi;
