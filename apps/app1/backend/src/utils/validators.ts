/**
 * Utility functions for validating input data
 */

/**
 * Validates if a string is a valid phone number
 * Supports both local Ghanaian format (0XXXXXXXXX) and international format (+233XXXXXXXXX)
 *
 * @param phoneNumber The phone number to validate
 * @returns boolean indicating if the phone number is valid
 */
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  // Remove any spaces, dashes, or parentheses
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, "");

  // Ghanaian phone number patterns:
  // 1. Local format: 0XXXXXXXXX (10 digits starting with 0)
  // 2. International format: +233XXXXXXXXX or 233XXXXXXXXX (12-13 digits)
  // 3. General international format: +[country code][number]

  // Check for Ghanaian local format (0XXXXXXXXX - 10 digits)
  if (/^0[2-9]\d{8}$/.test(cleaned)) {
    return true;
  }

  // Check for Ghanaian international format (+233XXXXXXXXX or 233XXXXXXXXX)
  if (/^(\+?233)[2-9]\d{8}$/.test(cleaned)) {
    return true;
  }

  // Check for general international format (+[1-9][4-14 more digits])
  if (/^\+[1-9]\d{4,14}$/.test(cleaned)) {
    return true;
  }

  // Check for other country codes without + (minimum 7 digits, maximum 15)
  if (/^[1-9]\d{6,14}$/.test(cleaned)) {
    return true;
  }

  return false;
};

/**
 * Validates if a string is a valid email address
 *
 * @param email The email to validate
 * @returns boolean indicating if the email is valid
 */
export const isValidEmail = (email: string): boolean => {
  // RFC 5322 compliant email regex
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email);
};

/**
 * Validates if a string is a valid sender ID
 *
 * @param senderId The sender ID to validate
 * @returns boolean indicating if the sender ID is valid
 */
export const isValidSenderId = (senderId: string): boolean => {
  // Sender ID should be 3-11 alphanumeric characters
  // This is based on common SMS provider requirements
  const senderIdRegex = /^[a-zA-Z0-9]{3,11}$/;

  return senderIdRegex.test(senderId);
};

/**
 * Validates if a date string is a valid future date
 *
 * @param dateString The date string to validate
 * @param minMinutesInFuture Minimum minutes in the future (default: 5)
 * @returns boolean indicating if the date is valid and in the future
 */
export const isValidFutureDate = (
  dateString: string,
  minMinutesInFuture: number = 5
): boolean => {
  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return false;
    }

    // Check if date is in the future
    const now = new Date();
    const minFutureTime = new Date(
      now.getTime() + minMinutesInFuture * 60 * 1000
    );

    return date >= minFutureTime;
  } catch (error) {
    return false;
  }
};

/**
 * Validates pagination parameters
 *
 * @param page The page number
 * @param limit The limit per page
 * @returns An object with validated page and limit values
 */
export const validatePagination = (
  page?: string | number,
  limit?: string | number
): { page: number; limit: number } => {
  let validPage = 1;
  let validLimit = 10;

  if (page !== undefined) {
    const parsedPage = typeof page === "string" ? parseInt(page, 10) : page;
    if (!isNaN(parsedPage) && parsedPage > 0) {
      validPage = parsedPage;
    }
  }

  if (limit !== undefined) {
    const parsedLimit = typeof limit === "string" ? parseInt(limit, 10) : limit;
    if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
      validLimit = parsedLimit;
    }
  }

  return { page: validPage, limit: validLimit };
};
