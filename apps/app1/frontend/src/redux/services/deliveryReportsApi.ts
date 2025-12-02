import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL, getAuthToken } from "@/lib/api-config";

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/messages`,
  prepareHeaders: (headers) => {
    const token = getAuthToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    headers.set("content-type", "application/json");
    return headers;
  },
});

export interface DeliveryMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalPending: number;
  deliveryRate: number;
  failureRate: number;
  avgDeliveryTime: number;
  totalCost: number;
  costPerSms: number;
}

export interface RealTimeDashboard {
  timestamp: string;
  summary: DeliveryMetrics & {
    trend: {
      deliveryRate: number;
      totalSent: number;
      avgDeliveryTime: number;
      totalCost: number;
    };
  };
  last24Hours: DeliveryMetrics;
  lastHour: DeliveryMetrics;
  recentDeliveries: Array<{
    id: string;
    messageId: string;
    status: string;
    recipients: number;
    senderId: string;
    countryCode: string;
    networkOperator?: string;
    cost: number;
    deliveredAt?: string;
    createdAt: string;
  }>;
  activeMessages: {
    count: number;
    messages: Array<{
      id: string;
      messageId: string;
      status: string;
      recipients: number;
      senderId: string;
      createdAt: string;
      timeElapsed: number;
    }>;
  };
  topCountries: Array<{
    countryCode: string;
    totalSent: number;
    deliveryRate: number;
  }>;
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    timestamp: string;
  }>;
}

export interface DeliveryReport {
  id: string;
  messageId: string;
  status: string;
  recipients: number;
  senderId: string;
  message: string;
  countryCode?: string;
  networkOperator?: string;
  cost: number;
  failureReason?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  lastStatusUpdate: string;
}

export interface DeliveryReportsResponse {
  reports: DeliveryReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface DeliveryAnalytics {
  overview: DeliveryMetrics;
  timeSeries: Array<{
    date: string;
    metrics: DeliveryMetrics;
  }>;
  countryBreakdown: Array<{
    countryCode: string;
    countryName: string;
    metrics: DeliveryMetrics;
    topOperators: Array<{
      operator: string;
      count: number;
      deliveryRate: number;
    }>;
  }>;
  operatorBreakdown: Array<{
    operator: string;
    metrics: DeliveryMetrics;
    countries: string[];
  }>;
  failureAnalysis: {
    totalFailures: number;
    failureReasons: Array<{
      reason: string;
      count: number;
    }>;
  };
  deliveryTimeAnalysis: {
    avgDeliveryTime: number;
    minDeliveryTime: number;
    maxDeliveryTime: number;
    medianDeliveryTime: number;
    distribution: Array<{
      range: string;
      min: number;
      max: number;
      count: number;
    }>;
  };
  filters: {
    startDate: string;
    endDate: string;
    countryCode?: string;
    serviceType?: string;
  };
}

export interface PerformanceMetrics {
  deliveryRates: {
    overall: number;
    byCountry: Array<{ countryCode: string; rate: number }>;
    byOperator: Array<{ operator: string; rate: number }>;
    trend: Array<{ date: string; rate: number }>;
  };
  deliveryTimes: {
    average: number;
    median: number;
    p95: number;
    trend: Array<{ date: string; avgTime: number }>;
  };
  costs: {
    total: number;
    average: number;
    byCountry: Array<{ countryCode: string; cost: number }>;
    trend: Array<{ date: string; cost: number }>;
  };
  volumes: {
    total: number;
    byCountry: Array<{ countryCode: string; volume: number }>;
    byHour: Array<{ hour: number; volume: number }>;
    trend: Array<{ date: string; volume: number }>;
  };
}

export interface DeliveryInsights {
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    impact: string;
    priority: "high" | "medium" | "low";
    actionItems: string[];
  }>;
  trends: {
    deliveryRate: { direction: "up" | "down" | "stable"; change: number };
    cost: { direction: "up" | "down" | "stable"; change: number };
    volume: { direction: "up" | "down" | "stable"; change: number };
  };
  alerts: Array<{
    type: string;
    severity: "error" | "warning" | "info";
    message: string;
    affectedCountries?: string[];
    affectedOperators?: string[];
  }>;
  optimization: {
    costSavings: number;
    deliveryImprovement: number;
    suggestedActions: string[];
  };
}

export const deliveryReportsApi = createApi({
  reducerPath: "deliveryReportsApi",
  baseQuery,
  tagTypes: ["Dashboard", "Reports", "Analytics", "Insights"],
  endpoints: (builder) => ({
    // Real-time Dashboard
    getRealTimeDashboard: builder.query<RealTimeDashboard, void>({
      query: () => "/dashboard/realtime",
      providesTags: ["Dashboard"],
    }),

    // Delivery Reports
    getDeliveryReports: builder.query<
      DeliveryReportsResponse,
      {
        page?: number;
        limit?: number;
        status?: string;
        countryCode?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
      }
    >({
      query: (params) => ({
        url: "/reports",
        params,
      }),
      providesTags: ["Reports"],
    }),

    getDeliveryReport: builder.query<DeliveryReport, string>({
      query: (messageId) => `/reports/${messageId}`,
      providesTags: ["Reports"],
    }),

    exportDeliveryReports: builder.mutation<
      Blob,
      {
        format?: string;
        startDate?: string;
        endDate?: string;
        status?: string;
        countryCode?: string;
      }
    >({
      query: (params) => ({
        url: "/reports/export",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),

    // Analytics
    getDeliveryAnalytics: builder.query<
      DeliveryAnalytics,
      {
        startDate?: string;
        endDate?: string;
        countryCode?: string;
        serviceType?: string;
        period?: string;
      }
    >({
      query: (params) => ({
        url: "/analytics",
        params,
      }),
      providesTags: ["Analytics"],
    }),

    getPerformanceMetrics: builder.query<
      PerformanceMetrics,
      {
        period?: string;
      }
    >({
      query: (params) => ({
        url: "/analytics/performance",
        params,
      }),
      providesTags: ["Analytics"],
    }),

    getDeliveryInsights: builder.query<
      DeliveryInsights,
      {
        period?: string;
      }
    >({
      query: (params) => ({
        url: "/analytics/insights",
        params,
      }),
      providesTags: ["Insights"],
    }),

    // Status Summary
    getDeliveryStatusSummary: builder.query<
      {
        period: string;
        startDate: string;
        endDate: string;
        summary: DeliveryMetrics;
      },
      {
        period?: string;
      }
    >({
      query: (params) => ({
        url: "/status/summary",
        params,
      }),
      providesTags: ["Dashboard"],
    }),
  }),
});

export const {
  useGetRealTimeDashboardQuery,
  useGetDeliveryReportsQuery,
  useGetDeliveryReportQuery,
  useExportDeliveryReportsMutation,
  useGetDeliveryAnalyticsQuery,
  useGetPerformanceMetricsQuery,
  useGetDeliveryInsightsQuery,
  useGetDeliveryStatusSummaryQuery,
} = deliveryReportsApi;
