/**
 * Centralized API Configuration
 * This file contains all API-related configuration and utilities
 */

// API Base URL from environment variables
// Note: NEXT_PUBLIC_API_URL should be the base URL (e.g., https://api.mas3ndi.com)
// We append /api to form the complete API path
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
export const API_BASE_URL = baseUrl.endsWith("/api")
  ? baseUrl
  : `${baseUrl}/api`;

// Performance configuration
export const API_CONFIG = {
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "10000"),
  retryAttempts: parseInt(process.env.NEXT_PUBLIC_RETRY_ATTEMPTS || "3"),
  cacheTime: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || "300") * 1000,
  staleTime: parseInt(process.env.NEXT_PUBLIC_STALE_TIME || "60000"),
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    VERIFY_EMAIL: "/auth/verify-email",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },

  // User Management
  USER: {
    PROFILE: "/user/profile",
    UPDATE_PROFILE: "/user/profile",
    CHANGE_PASSWORD: "/user/change-password",
    DELETE_ACCOUNT: "/user/delete-account",
  },

  // Sender IDs
  SENDER_IDS: {
    LIST: "/sender-ids",
    CREATE: "/sender-ids",
    GET_BY_ID: (id: string) => `/sender-ids/${id}`,
    UPDATE: (id: string) => `/sender-ids/${id}`,
    DELETE: (id: string) => `/sender-ids/${id}`,
    APPROVE: (id: string) => `/sender-ids/${id}/approve`,
    REJECT: (id: string) => `/sender-ids/${id}/reject`,
    PENDING: "/sender-ids/pending",
  },

  // Messages
  MESSAGES: {
    SEND: "/messages/send",
    SEND_BULK: "/messages/send-bulk",
    SEND_SCHEDULED: "/messages/send-scheduled",
    LIST: "/messages",
    GET_BY_ID: (id: string) => `/messages/${id}`,
    DELIVERY_REPORTS: "/messages/delivery-reports",
    TEMPLATES: "/messages/templates",
    CREATE_TEMPLATE: "/messages/templates",
  },

  // Dashboard
  DASHBOARD: {
    STATS: "/dashboard/stats",
    RECENT_MESSAGES: "/dashboard/recent-messages",
    ANALYTICS: "/dashboard/analytics",
    ACTIVITY: "/dashboard/activity",
  },

  // Balance & Wallet
  BALANCE: {
    GET: "/balance",
    HISTORY: "/balance/history",
    TOP_UP: "/balance/top-up",
    PACKAGES: "/balance/packages",
    PURCHASE_PACKAGE: "/balance/purchase-package",
  },

  // API Keys
  API_KEYS: {
    LIST: "/api-keys",
    CREATE: "/api-keys",
    GET_BY_ID: (id: string) => `/api-keys/${id}`,
    UPDATE: (id: string) => `/api-keys/${id}`,
    DELETE: (id: string) => `/api-keys/${id}`,
    REGENERATE: (id: string) => `/api-keys/${id}/regenerate`,
  },

  // Contacts
  CONTACTS: {
    LIST: "/contacts",
    CREATE: "/contacts",
    GET_BY_ID: (id: string) => `/contacts/${id}`,
    UPDATE: (id: string) => `/contacts/${id}`,
    DELETE: (id: string) => `/contacts/${id}`,
    IMPORT: "/contacts/import",
    EXPORT: "/contacts/export",
    GROUPS: "/contacts/groups",
  },

  // Admin (if user has admin role)
  ADMIN: {
    USERS: "/admin/users",
    SENDER_IDS: "/admin/sender-ids",
    MESSAGES: "/admin/messages",
    ANALYTICS: "/admin/analytics",
    SETTINGS: "/admin/settings",
  },
} as const;

// Helper function to get auth token from localStorage
export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    // First try to get from the mas3ndi_auth_state
    const authState = localStorage.getItem("mas3ndi_auth_state");
    if (authState) {
      const parsedState = JSON.parse(authState);
      return parsedState.token;
    }

    // Fallback to direct token storage
    return localStorage.getItem("token");
  } catch (error) {
    console.error("Failed to get token from localStorage:", error);
    return null;
  }
};

// Helper function to get auth headers
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

// Helper function to get auth headers for multipart/form-data
export const getAuthHeadersMultipart = (): Record<string, string> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Don't set Content-Type for multipart/form-data - let browser set it with boundary
  return headers;
};

// Base fetch configuration
export const createApiConfig = (options: RequestInit = {}): RequestInit => {
  return {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  };
};

// Base fetch configuration for multipart
export const createApiConfigMultipart = (
  options: RequestInit = {}
): RequestInit => {
  return {
    ...options,
    headers: {
      ...getAuthHeadersMultipart(),
      ...options.headers,
    },
  };
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// Helper function to handle API responses
export const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      success: false,
      message: "Network error occurred",
    }));
    throw new Error(
      errorData.message || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();

  // Handle backend response format
  if (data.success === false) {
    throw new Error(data.message || "API request failed");
  }

  // Return the data directly if it's in the expected format
  return data.data || data;
};

// Utility function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function to format currency in Ghana Cedis
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(amount);
};
