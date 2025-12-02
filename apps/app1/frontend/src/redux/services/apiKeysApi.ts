import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL, getAuthToken } from "@/lib/api-config";

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  suffix: string;
  permissions: string[];
  ipWhitelist: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  usageCount: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  apiKey: string; // Only returned when creating/regenerating
}

export interface CreateApiKeyRequest {
  name: string;
  permissions?: string[];
  ipWhitelist?: string[];
  rateLimit?: number;
  expiresAt?: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
  permissions?: string[];
  ipWhitelist?: string[];
  rateLimit?: number;
  isActive?: boolean;
  expiresAt?: string | null;
}

export interface ApiKeyUsageStats {
  totalRequests: number;
  successfulRequests: number;
  errorRequests: number;
  averageResponseTime: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  dailyUsage: Array<{ date: string; count: number }>;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const apiKeysApi = createApi({
  reducerPath: "apiKeysApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/api-keys`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      headers.set("content-type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["ApiKey", "ApiKeyUsage", "Permissions"],
  endpoints: (builder) => ({
    // Get all API keys for the user
    getApiKeys: builder.query<ApiResponse<ApiKey[]>, void>({
      query: () => "",
      providesTags: ["ApiKey"],
    }),

    // Get a specific API key by ID
    getApiKeyById: builder.query<ApiResponse<ApiKey>, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: "ApiKey", id }],
    }),

    // Create a new API key
    createApiKey: builder.mutation<
      ApiResponse<ApiKeyWithSecret>,
      CreateApiKeyRequest
    >({
      query: (data) => ({
        url: "",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ApiKey"],
    }),

    // Update an API key
    updateApiKey: builder.mutation<
      ApiResponse<ApiKey>,
      { id: string; data: UpdateApiKeyRequest }
    >({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ApiKey", id },
        "ApiKey",
      ],
    }),

    // Delete an API key
    deleteApiKey: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ApiKey"],
    }),

    // Regenerate an API key
    regenerateApiKey: builder.mutation<ApiResponse<ApiKeyWithSecret>, string>({
      query: (id) => ({
        url: `/${id}/regenerate`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "ApiKey", id },
        "ApiKey",
      ],
    }),

    // Get API key usage statistics
    getApiKeyUsageStats: builder.query<
      ApiResponse<ApiKeyUsageStats>,
      { id: string; startDate?: string; endDate?: string }
    >({
      query: ({ id, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        return `/${id}/usage${
          params.toString() ? `?${params.toString()}` : ""
        }`;
      },
      providesTags: (result, error, { id }) => [{ type: "ApiKeyUsage", id }],
    }),

    // Get available permissions
    getAvailablePermissions: builder.query<ApiResponse<string[]>, void>({
      query: () => "/permissions",
      providesTags: ["Permissions"],
    }),
  }),
});

export const {
  useGetApiKeysQuery,
  useGetApiKeyByIdQuery,
  useCreateApiKeyMutation,
  useUpdateApiKeyMutation,
  useDeleteApiKeyMutation,
  useRegenerateApiKeyMutation,
  useGetApiKeyUsageStatsQuery,
  useGetAvailablePermissionsQuery,
} = apiKeysApi;
