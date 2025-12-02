import axios, { AxiosResponse } from "axios";
import { ApiError } from "../middleware/error.middleware";

// Arkessel API interfaces based on common SMS API patterns
interface ArkeselSendSmsRequest {
  api_key: string;
  to: string | string[];
  message: string;
  sender: string;
  type?: "plain" | "unicode";
  scheduled_date?: string;
}

interface ArkeselSendSmsResponse {
  status: string;
  message?: string;
  data:
    | Array<{
        recipient: string;
        id: string;
      }>
    | {
        "invalid numbers": string[];
      };
}

interface ArkeselBalanceResponse {
  status?: string;
  message?: string;
  code?: string;
  data?: {
    balance: number;
    user: string;
  };
  // Direct response format from Arkessel API
  balance?: number;
  user?: string;
  country?: string;
}

interface ArkeselDeliveryStatusResponse {
  status: string;
  message: string;
  data?: {
    id: string;
    status: string;
    message: string;
    recipients: Array<{
      recipient: string;
      status: string;
      message_id: string;
    }>;
  };
}

export class ArkeselService {
  private static readonly BASE_URL = "https://sms.arkesel.com/api/v2/sms/send";
  private static readonly API_KEY = process.env.ARKESSEL_API_KEY;
  private static readonly SENDER_ID =
    process.env.ARKESSEL_SENDER_ID || "Mas3ndi";
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  /**
   * Validate API configuration
   */
  private static validateConfig(): void {
    if (!this.API_KEY) {
      throw new ApiError("Arkessel API key not configured", 500);
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry wrapper for API calls
   */
  private static async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Don't retry on authentication errors or client errors
        if (
          error.statusCode &&
          error.statusCode >= 400 &&
          error.statusCode < 500
        ) {
          throw error;
        }

        if (attempt < retries) {
          console.warn(
            `Arkessel API attempt ${attempt} failed, retrying in ${this.RETRY_DELAY}ms:`,
            error.message
          );
          await this.sleep(this.RETRY_DELAY * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Enhanced logging for API calls
   */
  private static logApiCall(
    operation: string,
    params: any,
    response?: any,
    error?: any
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      operation,
      params: {
        ...params,
        api_key: params.api_key ? "HIDDEN" : undefined,
      },
      response: response
        ? {
            status: response.status,
            message: response.message,
            code: response.code,
          }
        : undefined,
      error: error
        ? {
            message: error.message,
            statusCode: error.statusCode,
          }
        : undefined,
    };

    if (error) {
      console.error("Arkessel API Error:", logData);
    } else {
      console.log("Arkessel API Call:", logData);
    }
  }

  /**
   * Send SMS through Arkessel API
   */
  static async sendSms({
    to,
    message,
    sender,
    type = "plain",
    scheduledDate,
  }: {
    to: string | string[];
    message: string;
    sender: string;
    type?: "plain" | "unicode";
    scheduledDate?: string;
  }): Promise<ArkeselSendSmsResponse> {
    this.validateConfig();

    const params = {
      to: Array.isArray(to) ? to.join(",") : to,
      message,
      sender,
      type,
      scheduledDate,
    };

    return this.withRetry(async () => {
      try {
        // Use POST request with JSON body as required by Arkessel API v2
        const recipients = Array.isArray(to) ? to : [to];

        const requestData = {
          sender: sender,
          message: message,
          recipients: recipients,
          ...(scheduledDate && { scheduled_date: scheduledDate }),
        };

        console.log(
          "Arkessel v2 API Request:",
          JSON.stringify(requestData, null, 2)
        );

        const response: AxiosResponse<ArkeselSendSmsResponse> =
          await axios.post(this.BASE_URL, requestData, {
            headers: {
              "api-key": this.API_KEY,
              "Content-Type": "application/json",
              Accept: "application/json",
              "User-Agent": "Mas3ndi-SMS-Platform/1.0",
            },
            timeout: 30000, // 30 seconds timeout
          });

        // Log successful API call
        this.logApiCall("sendSms", params, response.data);

        // Handle Arkessel v2 API response format
        if (response.status === 200) {
          // v2 API uses "status": "success" for successful responses
          if (response.data.status === "success") {
            return response.data;
          }

          // Handle error responses
          const error = new ApiError(
            `Arkessel API Error: ${
              response.data.message || "SMS sending failed"
            }`,
            400
          );
          this.logApiCall("sendSms", params, response.data, error);
          throw error;
        }

        const error = new ApiError(
          `Arkessel API Error: ${response.data?.message || "Unknown error"}`,
          response.status || 400
        );
        this.logApiCall("sendSms", params, response.data, error);
        throw error;
      } catch (error: any) {
        // Log error
        this.logApiCall("sendSms", params, undefined, error);

        if (error instanceof ApiError) {
          throw error;
        }

        if (error.response) {
          // API responded with error status
          const errorMessage =
            error.response.data?.message || "Unknown API error";
          throw new ApiError(
            `Arkessel API Error: ${errorMessage}`,
            error.response.status
          );
        } else if (error.request) {
          // Network error
          throw new ApiError("Failed to connect to Arkessel API", 503);
        } else {
          // Other error
          throw new ApiError(`SMS Service Error: ${error.message}`, 500);
        }
      }
    });
  }

  /**
   * Check account balance
   */
  static async getBalance(): Promise<ArkeselBalanceResponse> {
    this.validateConfig();

    try {
      const requestData = new URLSearchParams({
        action: "check-balance",
        api_key: this.API_KEY,
        response: "json",
      });

      const response: AxiosResponse<ArkeselBalanceResponse> = await axios.post(
        this.BASE_URL,
        requestData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          timeout: 15000,
        }
      );

      // Handle Arkessel balance response format
      if (response.status === 200) {
        // Check if it's the direct API response format
        if (response.data.balance !== undefined) {
          // Transform direct API response to expected format
          return {
            status: "success",
            message: "Balance retrieved successfully",
            data: {
              balance: response.data.balance,
              user: response.data.user || "Unknown",
            },
          };
        }

        // Check for error codes in response (legacy format)
        if (response.data.code && response.data.code !== "000") {
          throw new ApiError(
            `Arkessel Balance Error ${response.data.code}: ${
              response.data.message || "Authentication failed"
            }`,
            400
          );
        }

        return response.data;
      }

      throw new ApiError(
        `Arkessel Balance Error: ${response.data?.message || "Unknown error"}`,
        response.status || 400
      );
    } catch (error: any) {
      console.error("Arkessel Balance Check Error:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.message || "Failed to check balance";
        throw new ApiError(
          `Arkessel Balance Error: ${errorMessage}`,
          error.response.status
        );
      }

      throw new ApiError("Failed to check Arkessel balance", 503);
    }
  }

  /**
   * Check delivery status of sent SMS
   */
  static async getDeliveryStatus(
    messageId: string
  ): Promise<ArkeselDeliveryStatusResponse> {
    this.validateConfig();

    try {
      const response: AxiosResponse<ArkeselDeliveryStatusResponse> =
        await axios.get(`${this.BASE_URL}/sms/${messageId}`, {
          params: {
            api_key: this.API_KEY,
          },
          headers: {
            Accept: "application/json",
          },
          timeout: 15000,
        });

      return response.data;
    } catch (error: any) {
      console.error("Arkessel Delivery Status Error:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.message || "Failed to get delivery status";
        throw new ApiError(
          `Arkessel Status Error: ${errorMessage}`,
          error.response.status
        );
      }

      throw new ApiError("Failed to get delivery status from Arkessel", 503);
    }
  }

  /**
   * Validate phone number format for Arkessel
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Remove any spaces, dashes, or parentheses
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, "");

    // Check if it starts with + and has 10-15 digits
    const phoneRegex = /^\+[1-9]\d{9,14}$/;

    return phoneRegex.test(cleaned);
  }

  /**
   * Format phone numbers for Arkessel API
   * Converts local Ghanaian numbers (0XXXXXXXXX) to international format (+233XXXXXXXXX)
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove any spaces, dashes, or parentheses
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, "");

    // Handle Ghanaian local format (0XXXXXXXXX) - convert to international
    if (/^0[2-9]\d{8}$/.test(cleaned)) {
      // Remove leading 0 and add +233
      cleaned = "+233" + cleaned.substring(1);
    }
    // Handle Ghanaian international without + (233XXXXXXXXX)
    else if (/^233[2-9]\d{8}$/.test(cleaned)) {
      // Add + prefix
      cleaned = "+" + cleaned;
    }
    // Handle other international numbers without +
    else if (/^[1-9]\d{6,14}$/.test(cleaned) && !cleaned.startsWith("233")) {
      // Add + prefix for other international numbers
      cleaned = "+" + cleaned;
    }
    // If already has +, keep as is
    else if (cleaned.startsWith("+")) {
      // Already formatted
    }
    // Default: add + if not present
    else if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }

    return cleaned;
  }

  /**
   * Calculate SMS cost based on message length and recipients
   */
  static calculateSmsCount(message: string): number {
    // Standard SMS is 160 characters for GSM 7-bit encoding
    // Unicode SMS is 70 characters
    const isUnicode = /[^\x00-\x7F]/.test(message);
    const maxLength = isUnicode ? 70 : 160;

    return Math.ceil(message.length / maxLength);
  }

  /**
   * Test API connection
   */
  static async testConnection(): Promise<{
    success: boolean;
    message: string;
    balance?: number;
  }> {
    try {
      const balanceResponse = await this.getBalance();

      if (balanceResponse.status === "success") {
        return {
          success: true,
          message: "Arkessel API connection successful",
          balance: balanceResponse.data?.balance,
        };
      } else {
        return {
          success: false,
          message: `API connection failed: ${balanceResponse.message}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
      };
    }
  }
}
