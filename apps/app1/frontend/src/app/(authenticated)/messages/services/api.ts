// API service for messages, templates, scheduled messages, and contact groups

import axios from "axios";
import { getAuthToken } from "@/lib/api-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Setup axios instance with common configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Message Templates API
export const messageTemplateApi = {
  getAll: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get("/templates");
      return response.data;
    } catch (error) {
      console.error("Error fetching message templates:", error);
      throw error;
    }
  },

  getById: async (id: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/templates/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching message template ${id}:`, error);
      throw error;
    }
  },

  create: async (template: any): Promise<any> => {
    try {
      const response = await apiClient.post("/templates", template);
      return response.data;
    } catch (error) {
      console.error("Error creating message template:", error);
      throw error;
    }
  },

  update: async (id: string, template: any): Promise<any> => {
    try {
      const response = await apiClient.put(`/templates/${id}`, template);
      return response.data;
    } catch (error) {
      console.error(`Error updating message template ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/templates/${id}`);
      return Promise.resolve();
    } catch (error) {
      console.error(`Error deleting message template ${id}:`, error);
      throw error;
    }
  },
};

// Scheduled Messages API
export const scheduledMessageApi = {
  getAll: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get("/sms-schedule/scheduled");
      return response.data;
    } catch (error) {
      console.error("Error fetching scheduled messages:", error);
      throw error;
    }
  },

  getById: async (id: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/sms-schedule/scheduled/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching scheduled message ${id}:`, error);
      throw error;
    }
  },

  create: async (message: any): Promise<any> => {
    try {
      const response = await apiClient.post("/sms-schedule/schedule", message);
      return response.data;
    } catch (error) {
      console.error("Error creating scheduled message:", error);
      throw error;
    }
  },

  update: async (id: string, message: any): Promise<any> => {
    try {
      const response = await apiClient.put(
        `/sms-schedule/scheduled/${id}`,
        message
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating scheduled message ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/sms-schedule/schedule/${id}`);
      return Promise.resolve();
    } catch (error) {
      console.error(`Error deleting scheduled message ${id}:`, error);
      throw error;
    }
  },
};

// Contact Groups API
export const contactGroupApi = {
  getAll: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get("/contacts/groups");
      return response.data;
    } catch (error) {
      console.error("Error fetching contact groups:", error);
      throw error;
    }
  },

  getById: async (id: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/contacts/groups/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching contact group ${id}:`, error);
      throw error;
    }
  },

  create: async (group: any): Promise<any> => {
    try {
      const response = await apiClient.post("/contacts/groups", group);
      return response.data;
    } catch (error) {
      console.error("Error creating contact group:", error);
      throw error;
    }
  },

  update: async (id: string, group: any): Promise<any> => {
    try {
      const response = await apiClient.put(`/contacts/groups/${id}`, group);
      return response.data;
    } catch (error) {
      console.error(`Error updating contact group ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/contacts/groups/${id}`);
      return Promise.resolve();
    } catch (error) {
      console.error(`Error deleting contact group ${id}:`, error);
      throw error;
    }
  },
};

// Import types
import { MessageTemplate, ScheduledMessage, ContactGroup } from "../mock-data";

// Note: We're still importing the types from mock-data.ts, but not using the mock data anymore
