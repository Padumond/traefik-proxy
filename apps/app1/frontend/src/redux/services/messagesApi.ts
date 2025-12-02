import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL, getAuthToken } from "@/lib/api-config";

// Define interfaces for API responses based on backend models
export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface ScheduledMessage {
  id: string;
  name?: string;
  content: string;
  scheduledFor: string;
  status: "SCHEDULED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  recipientCount: number;
  senderId: string;
  userId?: string;
}

export interface Contact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  tags?: string[];
  customFields?: any;
  createdAt: string;
  updatedAt: string;
  groups?: Array<{ id: string; name: string }>;
  groupIds?: string[];
}

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  contacts?: Contact[];
  contactCount?: number;
}

export interface Message {
  id: string;
  message: string;
  recipients: string[];
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED";
  cost: number;
  sentAt: string;
  updatedAt: string;
  senderId?: {
    senderId: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  total?: number;
  page?: number;
  limit?: number;
}

// Define a service using a base URL and expected endpoints
export const messagesApi = createApi({
  reducerPath: "messagesApi",
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
  tagTypes: [
    "MessageTemplate",
    "ScheduledMessage",
    "ContactGroup",
    "Contact",
    "Message",
  ],
  endpoints: (builder) => ({
    // Messages endpoints
    getMessages: builder.query<ApiResponse<Message[]>, PaginationParams>({
      query: (params) => ({
        url: "/sms/logs",
        params,
      }),
      providesTags: ["Message"],
    }),

    // Message Templates endpoints
    getMessageTemplates: builder.query<MessageTemplate[], void>({
      query: () => "/templates",
      providesTags: ["MessageTemplate"],
    }),

    getMessageTemplateById: builder.query<MessageTemplate, string>({
      query: (id) => `/templates/${id}`,
      providesTags: (result, error, id) => [{ type: "MessageTemplate", id }],
    }),

    createMessageTemplate: builder.mutation<
      MessageTemplate,
      Partial<MessageTemplate>
    >({
      query: (template) => ({
        url: "/templates",
        method: "POST",
        body: template,
      }),
      invalidatesTags: ["MessageTemplate"],
    }),

    updateMessageTemplate: builder.mutation<
      MessageTemplate,
      { id: string; template: Partial<MessageTemplate> }
    >({
      query: ({ id, template }) => ({
        url: `/templates/${id}`,
        method: "PUT",
        body: template,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "MessageTemplate", id },
      ],
    }),

    deleteMessageTemplate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/templates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["MessageTemplate"],
    }),

    // Scheduled Messages endpoints
    getScheduledMessages: builder.query<ScheduledMessage[], void>({
      query: () => "/sms-schedule/scheduled",
      providesTags: ["ScheduledMessage"],
    }),

    getScheduledMessageById: builder.query<ScheduledMessage, string>({
      query: (id) => `/sms-schedule/scheduled/${id}`,
      providesTags: (result, error, id) => [{ type: "ScheduledMessage", id }],
    }),

    createScheduledMessage: builder.mutation<
      ScheduledMessage,
      Partial<ScheduledMessage>
    >({
      query: (message) => ({
        url: "/sms-schedule/schedule",
        method: "POST",
        body: message,
      }),
      invalidatesTags: ["ScheduledMessage"],
    }),

    updateScheduledMessage: builder.mutation<
      ScheduledMessage,
      { id: string; message: Partial<ScheduledMessage> }
    >({
      query: ({ id, message }) => ({
        url: `/sms-schedule/scheduled/${id}`,
        method: "PUT",
        body: message,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ScheduledMessage", id },
      ],
    }),

    deleteScheduledMessage: builder.mutation<void, string>({
      query: (id) => ({
        url: `/sms-schedule/schedule/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ScheduledMessage"],
    }),

    // Direct message sending endpoint
    sendMessage: builder.mutation<
      any,
      {
        content: string;
        senderId: string;
        recipientGroups?: string[];
        recipients?: string[];
        recipientCount?: number;
        isScheduled?: boolean;
        scheduledDate?: string;
        billingMode?: string;
      }
    >({
      query: (messageData) => ({
        url: "/sms/send",
        method: "POST",
        body: messageData,
      }),
      invalidatesTags: ["Message"],
    }),

    // Contact Groups endpoints
    getContactGroups: builder.query<ContactGroup[], void>({
      query: () => "/contacts/groups",
      providesTags: ["ContactGroup"],
    }),

    getContactGroupById: builder.query<ContactGroup, string>({
      query: (id) => `/contacts/groups/${id}`,
      providesTags: (result, error, id) => [{ type: "ContactGroup", id }],
    }),

    createContactGroup: builder.mutation<ContactGroup, Partial<ContactGroup>>({
      query: (group) => ({
        url: "/contacts/groups",
        method: "POST",
        body: group,
      }),
      invalidatesTags: ["ContactGroup"],
    }),

    updateContactGroup: builder.mutation<
      ContactGroup,
      { id: string; group: Partial<ContactGroup> }
    >({
      query: ({ id, group }) => ({
        url: `/contacts/groups/${id}`,
        method: "PUT",
        body: group,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ContactGroup", id },
      ],
    }),

    deleteContactGroup: builder.mutation<void, string>({
      query: (id) => ({
        url: `/contacts/groups/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ContactGroup", "Contact"],
    }),

    addContactsToGroup: builder.mutation<
      ContactGroup,
      { groupId: string; contactIds: string[] }
    >({
      query: ({ groupId, contactIds }) => ({
        url: `/contacts/groups/${groupId}/contacts`,
        method: "POST",
        body: { contactIds },
      }),
      invalidatesTags: ["ContactGroup", "Contact"],
    }),

    removeContactsFromGroup: builder.mutation<
      ContactGroup,
      { groupId: string; contactIds: string[] }
    >({
      query: ({ groupId, contactIds }) => ({
        url: `/contacts/groups/${groupId}/contacts`,
        method: "DELETE",
        body: { contactIds },
      }),
      invalidatesTags: ["ContactGroup", "Contact"],
    }),

    // Contacts endpoints
    getContacts: builder.query<Contact[], void>({
      query: () => "/contacts",
      providesTags: ["Contact"],
    }),

    getContactById: builder.query<Contact, string>({
      query: (id) => `/contacts/${id}`,
      providesTags: (result, error, id) => [{ type: "Contact", id }],
    }),

    createContact: builder.mutation<Contact, Partial<Contact>>({
      query: (contact) => ({
        url: "/contacts",
        method: "POST",
        body: contact,
      }),
      invalidatesTags: ["Contact", "ContactGroup"],
    }),

    updateContact: builder.mutation<
      Contact,
      { id: string; contact: Partial<Contact> }
    >({
      query: ({ id, contact }) => ({
        url: `/contacts/${id}`,
        method: "PUT",
        body: contact,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Contact", id },
        "ContactGroup",
      ],
    }),

    deleteContact: builder.mutation<void, string>({
      query: (id) => ({
        url: `/contacts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Contact", "ContactGroup"],
    }),

    // CSV Import endpoints
    importContactsCsv: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: "/contacts/import/csv",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Contact", "ContactGroup"],
    }),

    previewContactsCsv: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: "/contacts/import/preview",
        method: "POST",
        body: formData,
      }),
    }),

    bulkImportContacts: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: "/contacts/import/bulk",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Contact", "ContactGroup"],
    }),
  }),
});

// Export hooks for usage in components, generated based on the defined endpoints
export const {
  // Messages hooks
  useGetMessagesQuery,

  // Message Templates hooks
  useGetMessageTemplatesQuery,
  useGetMessageTemplateByIdQuery,
  useCreateMessageTemplateMutation,
  useUpdateMessageTemplateMutation,
  useDeleteMessageTemplateMutation,

  // Scheduled Messages hooks
  useGetScheduledMessagesQuery,
  useGetScheduledMessageByIdQuery,
  useCreateScheduledMessageMutation,
  useUpdateScheduledMessageMutation,
  useDeleteScheduledMessageMutation,

  // Direct Message Sending hook
  useSendMessageMutation,

  // Contact Groups hooks
  useGetContactGroupsQuery,
  useGetContactGroupByIdQuery,
  useCreateContactGroupMutation,
  useUpdateContactGroupMutation,
  useDeleteContactGroupMutation,
  useAddContactsToGroupMutation,
  useRemoveContactsFromGroupMutation,

  // Contacts hooks
  useGetContactsQuery,
  useGetContactByIdQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,

  // CSV Import hooks
  useImportContactsCsvMutation,
  usePreviewContactsCsvMutation,
  useBulkImportContactsMutation,
} = messagesApi;
