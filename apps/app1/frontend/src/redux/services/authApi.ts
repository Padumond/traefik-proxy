import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { setCredentials } from "../authSlice";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  walletBalance: number;
  apiKey?: string;
  avatar?: string; // Optional avatar property
  // Add more fields here if frontend expects more
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

// Backend API response structure
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: string;
}

// Helper function to extract auth data from API responses
const extractAuthData = (response: any): AuthResponse => {
  console.log("Raw API Response:", response);

  // If response has a data property, it's the backend standard response format
  if (response.data) {
    console.log("Using nested data from API response");
    return response.data;
  }

  // Otherwise it's already the expected format
  console.log("Using direct API response");
  return response;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.NEXT_PUBLIC_API_URL}/auth`,
  }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
      // Transform the response to handle nested data structure
      transformResponse: (
        response: ApiResponse<AuthResponse> | AuthResponse
      ) => {
        return extractAuthData(response);
      },
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({
        url: "/register",
        method: "POST",
        body,
      }),
      // Transform the response to handle nested data structure
      transformResponse: (
        response: ApiResponse<AuthResponse> | AuthResponse
      ) => {
        return extractAuthData(response);
      },
    }),
    refresh: builder.mutation<AuthResponse, { refreshToken: string }>({
      query: (body) => ({
        url: "/refresh",
        method: "POST",
        body,
      }),
      // Transform the response to handle nested data structure
      transformResponse: (
        response: ApiResponse<AuthResponse> | AuthResponse
      ) => {
        return extractAuthData(response);
      },
    }),
    logout: builder.mutation<{ message: string }, { refreshToken: string }>({
      query: (body) => ({
        url: "/logout",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshMutation,
  useLogoutMutation,
} = authApi;
