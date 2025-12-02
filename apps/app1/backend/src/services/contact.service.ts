import { PrismaClient } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";
import { ArkeselService } from "./arkessel.service";

const prisma = new PrismaClient();

interface CreateContactParams {
  userId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  tags?: string[];
  customFields?: any;
}

interface UpdateContactParams {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  tags?: string[];
  customFields?: any;
}

interface ContactFilters {
  search?: string;
  tags?: string[];
  groupId?: string;
  page?: number;
  limit?: number;
}

export class ContactService {
  /**
   * Create a new contact
   */
  static async createContact(params: CreateContactParams) {
    try {
      // Validate and format phone number
      const formattedPhone = ArkeselService.formatPhoneNumber(params.phone);
      if (!ArkeselService.validatePhoneNumber(formattedPhone)) {
        throw ApiError.badRequest("Invalid phone number format");
      }

      // Check if contact already exists
      const existingContact = await prisma.contact.findFirst({
        where: {
          userId: params.userId,
          phone: formattedPhone,
        },
      });

      if (existingContact) {
        throw ApiError.conflict(
          "Contact with this phone number already exists"
        );
      }

      const contact = await prisma.contact.create({
        data: {
          userId: params.userId,
          name: params.name,
          firstName: params.firstName,
          lastName: params.lastName,
          phone: formattedPhone,
          email: params.email,
          tags: params.tags || [],
          customFields: params.customFields || {},
        },
      });

      return contact;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Contact Service Error:", error);
      throw ApiError.internal("Failed to create contact");
    }
  }

  /**
   * Get contacts with filtering and pagination
   */
  static async getContacts(userId: string, filters: ContactFilters = {}) {
    try {
      const { search, tags, groupId, page = 1, limit = 20 } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { userId };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      if (tags && tags.length > 0) {
        where.tags = { hasSome: tags };
      }

      if (groupId) {
        where.groups = {
          some: {
            group: {
              id: groupId,
            },
          },
        };
      }

      // Get contacts with pagination
      const [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            groups: {
              include: {
                group: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        prisma.contact.count({ where }),
      ]);

      return {
        data: contacts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Contact Service Error:", error);
      throw ApiError.internal("Failed to get contacts");
    }
  }

  /**
   * Get contact by ID
   */
  static async getContactById(contactId: string, userId: string) {
    try {
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId,
        },
        include: {
          groups: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!contact) {
        throw ApiError.notFound("Contact not found");
      }

      return contact;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Contact Service Error:", error);
      throw ApiError.internal("Failed to get contact");
    }
  }

  /**
   * Update contact
   */
  static async updateContact(
    contactId: string,
    userId: string,
    params: UpdateContactParams
  ) {
    try {
      // Check if contact exists
      const existingContact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId,
        },
      });

      if (!existingContact) {
        throw ApiError.notFound("Contact not found");
      }

      // Validate phone number if provided
      let formattedPhone = existingContact.phone;
      if (params.phone) {
        formattedPhone = ArkeselService.formatPhoneNumber(params.phone);
        if (!ArkeselService.validatePhoneNumber(formattedPhone)) {
          throw ApiError.badRequest("Invalid phone number format");
        }

        // Check if phone number is already used by another contact
        if (formattedPhone !== existingContact.phone) {
          const phoneExists = await prisma.contact.findFirst({
            where: {
              userId,
              phone: formattedPhone,
              id: { not: contactId },
            },
          });

          if (phoneExists) {
            throw ApiError.conflict(
              "Phone number already exists for another contact"
            );
          }
        }
      }

      const updatedContact = await prisma.contact.update({
        where: { id: contactId },
        data: {
          name: params.name ?? existingContact.name,
          firstName: params.firstName ?? existingContact.firstName,
          lastName: params.lastName ?? existingContact.lastName,
          phone: formattedPhone,
          email: params.email ?? existingContact.email,
          tags: params.tags ?? existingContact.tags,
          customFields: params.customFields ?? existingContact.customFields,
        },
        include: {
          groups: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return updatedContact;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Contact Service Error:", error);
      throw ApiError.internal("Failed to update contact");
    }
  }

  /**
   * Delete contact
   */
  static async deleteContact(contactId: string, userId: string) {
    try {
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId,
        },
      });

      if (!contact) {
        throw ApiError.notFound("Contact not found");
      }

      await prisma.contact.delete({
        where: { id: contactId },
      });

      return { success: true, message: "Contact deleted successfully" };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Contact Service Error:", error);
      throw ApiError.internal("Failed to delete contact");
    }
  }

  /**
   * Bulk create contacts
   */
  static async bulkCreateContacts(
    userId: string,
    contacts: CreateContactParams[]
  ) {
    try {
      const results = {
        created: 0,
        skipped: 0,
        errors: [] as string[],
      };

      for (const contactData of contacts) {
        try {
          // Validate and format phone number
          const formattedPhone = ArkeselService.formatPhoneNumber(
            contactData.phone
          );
          if (!ArkeselService.validatePhoneNumber(formattedPhone)) {
            results.errors.push(`Invalid phone number: ${contactData.phone}`);
            results.skipped++;
            continue;
          }

          // Check if contact already exists
          const existingContact = await prisma.contact.findFirst({
            where: {
              userId,
              phone: formattedPhone,
            },
          });

          if (existingContact) {
            results.skipped++;
            continue;
          }

          // Create contact
          await prisma.contact.create({
            data: {
              userId,
              name: contactData.name,
              firstName: contactData.firstName,
              lastName: contactData.lastName,
              phone: formattedPhone,
              email: contactData.email,
              tags: contactData.tags || [],
              customFields: contactData.customFields || {},
            },
          });

          results.created++;
        } catch (error) {
          results.errors.push(
            `Error creating contact ${contactData.name}: ${error}`
          );
          results.skipped++;
        }
      }

      return results;
    } catch (error) {
      console.error("Bulk Contact Creation Error:", error);
      throw ApiError.internal("Failed to create contacts in bulk");
    }
  }

  /**
   * Get contact statistics
   */
  static async getContactStats(userId: string) {
    try {
      const [totalContacts, totalGroups, recentContacts] = await Promise.all([
        prisma.contact.count({ where: { userId } }),
        prisma.contactGroup.count({ where: { userId } }),
        prisma.contact.count({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
      ]);

      return {
        totalContacts,
        totalGroups,
        recentContacts,
      };
    } catch (error) {
      console.error("Contact Stats Error:", error);
      throw ApiError.internal("Failed to get contact statistics");
    }
  }
}
