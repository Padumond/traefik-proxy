import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL, getAuthToken } from "@/lib/api-config";

// Types
export interface SenderID {
  id: string;
  senderId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  purpose: string;
  sampleMessage: string;
  createdAt: string;
  updatedAt: string;
  companyName?: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  consentFormPath?: string;
  consentFormOriginalName?: string;
  approvedBy?: string;
  adminNotes?: string;
  emailNotificationSent?: boolean;
}

export interface CreateSenderIdRequest {
  senderId: string;
  purpose: string;
  sampleMessage: string;
  companyName?: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const senderIdApi = createApi({
  reducerPath: "senderIdApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/sender-ids`,
    prepareHeaders: (headers, { getState }) => {
      const token = getAuthToken();
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      headers.set("content-type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["SenderID"],
  endpoints: (builder) => ({
    // Get user's sender IDs
    getSenderIds: builder.query<ApiResponse<SenderID[]>, void>({
      query: () => "",
      providesTags: ["SenderID"],
    }),

    // Create new sender ID
    createSenderId: builder.mutation<
      ApiResponse<SenderID>,
      CreateSenderIdRequest
    >({
      query: (data) => ({
        url: "",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["SenderID"],
    }),

    // Get single sender ID
    getSenderIdById: builder.query<ApiResponse<SenderID>, string>({
      query: (id) => `/${id}`,
      providesTags: ["SenderID"],
    }),

    // Delete sender ID
    deleteSenderId: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SenderID"],
    }),

    // Admin endpoints
    getPendingSenderIds: builder.query<ApiResponse<SenderID[]>, void>({
      query: () => "/pending",
      providesTags: ["SenderID"],
    }),

    approveSenderId: builder.mutation<
      ApiResponse<SenderID>,
      { id: string; adminNotes?: string }
    >({
      query: ({ id, adminNotes }) => ({
        url: `/${id}/approve`,
        method: "POST",
        body: { adminNotes },
      }),
      invalidatesTags: ["SenderID"],
    }),

    rejectSenderId: builder.mutation<
      ApiResponse<SenderID>,
      { id: string; adminNotes?: string }
    >({
      query: ({ id, adminNotes }) => ({
        url: `/${id}/reject`,
        method: "POST",
        body: { adminNotes },
      }),
      invalidatesTags: ["SenderID"],
    }),
  }),
});

export const {
  useGetSenderIdsQuery,
  useCreateSenderIdMutation,
  useGetSenderIdByIdQuery,
  useDeleteSenderIdMutation,
  useGetPendingSenderIdsQuery,
  useApproveSenderIdMutation,
  useRejectSenderIdMutation,
} = senderIdApi;
