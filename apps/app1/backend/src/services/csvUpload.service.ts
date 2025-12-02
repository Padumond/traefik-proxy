import { PrismaClient } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";
import { ContactService } from "./contact.service";
import { ArkeselService } from "./arkessel.service";
import csv from "csv-parser";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface CsvContact {
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  tags?: string;
  [key: string]: any; // For custom fields
}

interface UploadResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  created: number;
  skipped: number;
  errors: string[];
  preview: CsvContact[];
}

export class CsvUploadService {
  /**
   * Parse CSV file and validate contacts
   */
  static async parseCsvFile(
    filePath: string,
    userId: string
  ): Promise<UploadResult> {
    try {
      const contacts: CsvContact[] = [];
      const errors: string[] = [];
      let rowNumber = 0;

      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on("data", (row) => {
            rowNumber++;
            try {
              // Normalize column names (case insensitive)
              const normalizedRow: any = {};
              Object.keys(row).forEach((key) => {
                const normalizedKey = key.toLowerCase().trim();
                normalizedRow[normalizedKey] = row[key]?.trim();
              });

              // Extract required fields
              const contact: CsvContact = {
                name:
                  normalizedRow.name ||
                  normalizedRow.fullname ||
                  `${normalizedRow.firstname || ""} ${
                    normalizedRow.lastname || ""
                  }`.trim(),
                firstName: normalizedRow.firstname || normalizedRow.first_name,
                lastName: normalizedRow.lastname || normalizedRow.last_name,
                phone:
                  normalizedRow.phone ||
                  normalizedRow.phonenumber ||
                  normalizedRow.mobile,
                email: normalizedRow.email || normalizedRow.emailaddress,
                tags: normalizedRow.tags,
              };

              // Add custom fields
              const customFields: any = {};
              Object.keys(normalizedRow).forEach((key) => {
                if (
                  ![
                    "name",
                    "fullname",
                    "firstname",
                    "first_name",
                    "lastname",
                    "last_name",
                    "phone",
                    "phonenumber",
                    "mobile",
                    "email",
                    "emailaddress",
                    "tags",
                  ].includes(key)
                ) {
                  customFields[key] = normalizedRow[key];
                }
              });

              if (Object.keys(customFields).length > 0) {
                contact.customFields = customFields;
              }

              // Validate required fields
              if (!contact.name && !contact.firstName && !contact.lastName) {
                errors.push(`Row ${rowNumber}: Name is required`);
                return;
              }

              if (!contact.phone) {
                errors.push(`Row ${rowNumber}: Phone number is required`);
                return;
              }

              // Validate phone number format
              try {
                const formattedPhone = ArkeselService.formatPhoneNumber(
                  contact.phone
                );
                if (!ArkeselService.validatePhoneNumber(formattedPhone)) {
                  errors.push(
                    `Row ${rowNumber}: Invalid phone number format - ${contact.phone}`
                  );
                  return;
                }
                contact.phone = formattedPhone;
              } catch (error) {
                errors.push(
                  `Row ${rowNumber}: Invalid phone number - ${contact.phone}`
                );
                return;
              }

              // Set default name if not provided
              if (!contact.name) {
                contact.name = `${contact.firstName || ""} ${
                  contact.lastName || ""
                }`.trim();
              }

              contacts.push(contact);
            } catch (error) {
              errors.push(`Row ${rowNumber}: ${error}`);
            }
          })
          .on("end", async () => {
            try {
              const result: UploadResult = {
                totalRows: rowNumber,
                validRows: contacts.length,
                invalidRows: errors.length,
                created: 0,
                skipped: 0,
                errors,
                preview: contacts.slice(0, 10), // First 10 contacts for preview
              };

              resolve(result);
            } catch (error) {
              reject(error);
            }
          })
          .on("error", (error) => {
            reject(new ApiError(`CSV parsing error: ${error.message}`, 400));
          });
      });
    } catch (error) {
      console.error("CSV Upload Service Error:", error);
      throw ApiError.internal("Failed to parse CSV file");
    }
  }

  /**
   * Import contacts from parsed CSV data
   */
  static async importContacts(
    contacts: CsvContact[],
    userId: string,
    groupId?: string
  ): Promise<UploadResult> {
    try {
      const result: UploadResult = {
        totalRows: contacts.length,
        validRows: contacts.length,
        invalidRows: 0,
        created: 0,
        skipped: 0,
        errors: [],
        preview: [],
      };

      // Process contacts in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);

        for (const contactData of batch) {
          try {
            // Check if contact already exists
            const existingContact = await prisma.contact.findFirst({
              where: {
                userId,
                phone: contactData.phone,
              },
            });

            if (existingContact) {
              result.skipped++;
              continue;
            }

            // Parse tags if provided
            let tags: string[] = [];
            if (contactData.tags) {
              tags = contactData.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0);
            }

            // Create contact
            const newContact = await prisma.contact.create({
              data: {
                userId,
                name: contactData.name,
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                phone: contactData.phone,
                email: contactData.email,
                tags,
                customFields: contactData.customFields || {},
              },
            });

            // Add to group if specified
            if (groupId) {
              await prisma.contactToGroup.create({
                data: {
                  contactId: newContact.id,
                  groupId: groupId,
                },
              });
            }

            result.created++;
          } catch (error: any) {
            result.errors.push(
              `Error importing ${contactData.name}: ${error.message}`
            );
            result.skipped++;
          }
        }
      }

      return result;
    } catch (error) {
      console.error("Contact Import Error:", error);
      throw ApiError.internal("Failed to import contacts");
    }
  }

  /**
   * Process uploaded CSV file
   */
  static async processUploadedFile(
    filePath: string,
    userId: string,
    groupId?: string,
    preview = false
  ): Promise<UploadResult> {
    try {
      // Parse CSV file
      const parseResult = await this.parseCsvFile(filePath, userId);

      // If preview mode, return parsed data without importing
      if (preview) {
        return parseResult;
      }

      // Import valid contacts
      if (parseResult.validRows > 0) {
        const importResult = await this.importContacts(
          parseResult.preview, // Use all valid contacts, not just preview
          userId,
          groupId
        );

        // Combine results
        return {
          ...parseResult,
          created: importResult.created,
          skipped: importResult.skipped,
          errors: [...parseResult.errors, ...importResult.errors],
        };
      }

      return parseResult;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("CSV Processing Error:", error);
      throw ApiError.internal("Failed to process CSV file");
    } finally {
      // Clean up uploaded file
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error("File cleanup error:", cleanupError);
      }
    }
  }

  /**
   * Generate CSV template
   */
  static generateCsvTemplate(): string {
    const headers = [
      "name",
      "firstName",
      "lastName",
      "phone",
      "email",
      "tags",
      "company",
      "position",
    ];

    const sampleData = [
      'John Doe,John,Doe,+233123456789,john@example.com,"customer,vip",Acme Corp,Manager',
      "Jane Smith,Jane,Smith,+233987654321,jane@example.com,customer,Tech Solutions,Developer",
    ];

    return [headers.join(","), ...sampleData].join("\n");
  }

  /**
   * Validate CSV file format
   */
  static validateCsvFile(filePath: string): { valid: boolean; error?: string } {
    try {
      // Check file exists
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: "File not found" };
      }

      // Check file size (max 10MB)
      const stats = fs.statSync(filePath);
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (stats.size > maxSize) {
        return { valid: false, error: "File size exceeds 10MB limit" };
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (![".csv", ".txt"].includes(ext)) {
        return {
          valid: false,
          error: "Invalid file format. Only CSV files are allowed",
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: "Failed to validate file" };
    }
  }

  /**
   * Get upload statistics
   */
  static async getUploadStats(userId: string) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [totalContacts, recentUploads] = await Promise.all([
        prisma.contact.count({ where: { userId } }),
        prisma.contact.count({
          where: {
            userId,
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
      ]);

      return {
        totalContacts,
        recentUploads,
        uploadLimit: 10000, // Configurable limit
      };
    } catch (error) {
      console.error("Upload Stats Error:", error);
      throw ApiError.internal("Failed to get upload statistics");
    }
  }
}
