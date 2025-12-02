import axios, { AxiosResponse } from "axios";
import { ApiError } from "../middleware/error.middleware";

// Arkessel Sender ID API interfaces
interface ArkeselSenderIdRequest {
  api_key: string;
  sender_id: string;
  purpose: string;
  sample_message: string;
  company_name?: string;
  contact_person?: string;
  phone_number?: string;
  email?: string;
}

interface ArkeselSenderIdResponse {
  status: string;
  message: string;
  code?: string;
  data?: {
    id: string;
    sender_id: string;
    status: "pending" | "approved" | "rejected";
    purpose: string;
    sample_message: string;
    submitted_at: string;
    approved_at?: string;
    rejected_at?: string;
    rejection_reason?: string;
  };
}

interface ArkeselSenderIdListResponse {
  status: string;
  message: string;
  data?: Array<{
    id: string;
    sender_id: string;
    status: "pending" | "approved" | "rejected";
    purpose: string;
    submitted_at: string;
    approved_at?: string;
    rejected_at?: string;
  }>;
}

export class ArkeselSenderIdService {
  private static readonly BASE_URL =
    process.env.ARKESSEL_API_URL || "https://sms.arkesel.com/api/v2";
  private static readonly API_KEY = process.env.ARKESSEL_API_KEY;
  private static readonly TIMEOUT = 30000; // 30 seconds

  /**
   * Validate configuration
   */
  private static validateConfig(): void {
    if (!this.API_KEY) {
      throw new ApiError("Arkessel API key not configured", 500);
    }
  }

  /**
   * Note: Based on Arkessel documentation review, they may not have public APIs for sender ID management.
   * Sender ID registration might be handled through their dashboard or manual process.
   * This service provides a framework that can be updated when/if APIs become available.
   */

  /**
   * Create/Request a new sender ID on Arkessel
   */
  static async createSenderId({
    senderId,
    purpose,
    sampleMessage,
    companyName,
    contactPerson,
    phoneNumber,
    email,
  }: {
    senderId: string;
    purpose: string;
    sampleMessage: string;
    companyName?: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
  }): Promise<ArkeselSenderIdResponse> {
    this.validateConfig();

    // For now, simulate the process since Arkessel may not have public sender ID APIs
    console.log("Arkessel Sender ID Registration Request:", {
      senderId,
      purpose,
      sampleMessage,
      companyName,
      email,
    });

    // TODO: Replace this with actual Arkessel API call when available
    // For now, return a simulated response indicating manual approval is needed
    return {
      status: "success",
      message:
        "Sender ID registration request logged. Manual approval required through Arkessel dashboard.",
      data: {
        id: `arkessel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender_id: senderId,
        status: "pending",
        purpose,
        sample_message: sampleMessage,
        submitted_at: new Date().toISOString(),
      },
    };

    /*
    // Uncomment and update this when actual Arkessel sender ID API is available
    try {
      const response: AxiosResponse<ArkeselSenderIdResponse> = await axios.post(
        `${this.BASE_URL}/sender-ids`,
        {
          api_key: this.API_KEY,
          sender_id: senderId,
          purpose,
          sample_message: sampleMessage,
          company_name: companyName,
          contact_person: contactPerson,
          phone_number: phoneNumber,
          email,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: this.TIMEOUT,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Arkessel Create Sender ID Error:", error);

      if (error.response) {
        const errorMessage = error.response.data?.message || "Failed to create sender ID";
        throw new ApiError(
          `Arkessel Error: ${errorMessage}`,
          error.response.status
        );
      }

      throw new ApiError("Failed to create sender ID on Arkessel", 503);
    }
    */
  }

  /**
   * Get sender ID status from Arkessel
   */
  static async getSenderIdStatus(
    arkeselSenderIdId: string
  ): Promise<ArkeselSenderIdResponse> {
    this.validateConfig();

    try {
      const response: AxiosResponse<ArkeselSenderIdResponse> = await axios.get(
        `${this.BASE_URL}/sender-ids/${arkeselSenderIdId}`,
        {
          params: {
            api_key: this.API_KEY,
          },
          headers: {
            Accept: "application/json",
          },
          timeout: this.TIMEOUT,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Arkessel Get Sender ID Status Error:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.message || "Failed to get sender ID status";
        throw new ApiError(
          `Arkessel Error: ${errorMessage}`,
          error.response.status
        );
      }

      throw new ApiError("Failed to get sender ID status from Arkessel", 503);
    }
  }

  /**
   * List all sender IDs from Arkessel
   */
  static async listSenderIds(): Promise<ArkeselSenderIdListResponse> {
    this.validateConfig();

    try {
      const response: AxiosResponse<ArkeselSenderIdListResponse> =
        await axios.get(`${this.BASE_URL}/sender-ids`, {
          params: {
            api_key: this.API_KEY,
          },
          headers: {
            Accept: "application/json",
          },
          timeout: this.TIMEOUT,
        });

      return response.data;
    } catch (error: any) {
      console.error("Arkessel List Sender IDs Error:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.message || "Failed to list sender IDs";
        throw new ApiError(
          `Arkessel Error: ${errorMessage}`,
          error.response.status
        );
      }

      throw new ApiError("Failed to list sender IDs from Arkessel", 503);
    }
  }

  /**
   * Update sender ID on Arkessel (if supported)
   */
  static async updateSenderId(
    arkeselSenderIdId: string,
    updates: {
      purpose?: string;
      sampleMessage?: string;
    }
  ): Promise<ArkeselSenderIdResponse> {
    this.validateConfig();

    try {
      const response: AxiosResponse<ArkeselSenderIdResponse> = await axios.put(
        `${this.BASE_URL}/sender-ids/${arkeselSenderIdId}`,
        {
          api_key: this.API_KEY,
          ...updates,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: this.TIMEOUT,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Arkessel Update Sender ID Error:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.message || "Failed to update sender ID";
        throw new ApiError(
          `Arkessel Error: ${errorMessage}`,
          error.response.status
        );
      }

      throw new ApiError("Failed to update sender ID on Arkessel", 503);
    }
  }

  /**
   * Delete sender ID from Arkessel (if supported)
   */
  static async deleteSenderId(
    arkeselSenderIdId: string
  ): Promise<{ success: boolean; message: string }> {
    this.validateConfig();

    try {
      const response: AxiosResponse<{ status: string; message: string }> =
        await axios.delete(`${this.BASE_URL}/sender-ids/${arkeselSenderIdId}`, {
          params: {
            api_key: this.API_KEY,
          },
          headers: {
            Accept: "application/json",
          },
          timeout: this.TIMEOUT,
        });

      return {
        success: response.data.status === "success",
        message: response.data.message,
      };
    } catch (error: any) {
      console.error("Arkessel Delete Sender ID Error:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.message || "Failed to delete sender ID";
        throw new ApiError(
          `Arkessel Error: ${errorMessage}`,
          error.response.status
        );
      }

      throw new ApiError("Failed to delete sender ID from Arkessel", 503);
    }
  }

  /**
   * Map Arkessel status to Mas3ndi status
   */
  static mapArkeselStatusToMas3ndi(
    arkeselStatus: string
  ): "PENDING" | "APPROVED" | "REJECTED" {
    switch (arkeselStatus.toLowerCase()) {
      case "pending":
        return "PENDING";
      case "approved":
        return "APPROVED";
      case "rejected":
        return "REJECTED";
      default:
        return "PENDING";
    }
  }

  /**
   * Check if Arkessel API is available
   */
  static async checkApiHealth(): Promise<boolean> {
    try {
      this.validateConfig();
      // Try to list sender IDs as a health check
      await this.listSenderIds();
      return true;
    } catch (error) {
      console.error("Arkessel API health check failed:", error);
      return false;
    }
  }
}
