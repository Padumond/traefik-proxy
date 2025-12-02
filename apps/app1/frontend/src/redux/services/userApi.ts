import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL, getAuthToken } from "@/lib/api-config";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  walletBalance: number;
  apiKey?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AvatarUploadResponse {
  user: User;
  avatarUrl: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  password?: string;
}

export const userApi = createApi({
  reducerPath: "userApi",
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
  tagTypes: ["User"],
  endpoints: (builder) => ({
    getCurrentUser: builder.query<ApiResponse<User>, void>({
      query: () => "/users/profile",
      providesTags: ["User"],
    }),
    uploadAvatar: builder.mutation<ApiResponse<AvatarUploadResponse>, FormData>(
      {
        query: (formData) => ({
          url: "/users/avatar",
          method: "POST",
          body: formData,
        }),
        invalidatesTags: ["User"],
      }
    ),
    deleteAvatar: builder.mutation<ApiResponse<User>, void>({
      query: () => ({
        url: "/users/avatar",
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
    updateProfile: builder.mutation<ApiResponse<User>, UpdateProfileRequest>({
      query: (data) => ({
        url: "/users/profile",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetCurrentUserQuery,
  useUploadAvatarMutation,
  useDeleteAvatarMutation,
  useUpdateProfileMutation,
} = userApi;
