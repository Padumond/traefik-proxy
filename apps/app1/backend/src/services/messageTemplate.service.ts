import { PrismaClient } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";

const prisma = new PrismaClient();

interface CreateTemplateInput {
  name: string;
  content: string;
  category?: string;
  variables?: string[];
  isPublic?: boolean;
  tags?: string[];
}

interface UpdateTemplateInput {
  name?: string;
  content?: string;
  category?: string;
  variables?: string[];
  isPublic?: boolean;
  tags?: string[];
}

export class MessageTemplateService {
  /**
   * Get all message templates for a user
   */
  static async getAll(userId: string) {
    return prisma.messageTemplate.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  /**
   * Get a message template by ID
   */
  static async getById(userId: string, id: string) {
    return prisma.messageTemplate.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  /**
   * Create a new message template
   */
  static async create(userId: string, data: CreateTemplateInput) {
    return prisma.messageTemplate.create({
      data: {
        ...data,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  /**
   * Update a message template
   */
  static async update(userId: string, id: string, data: UpdateTemplateInput) {
    // First check if the template exists and belongs to the user
    const template = await prisma.messageTemplate.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!template) {
      throw ApiError.notFound("Template not found");
    }

    return prisma.messageTemplate.update({
      where: {
        id,
      },
      data,
    });
  }

  /**
   * Delete a message template
   */
  static async delete(userId: string, id: string) {
    // First check if the template exists and belongs to the user
    const template = await prisma.messageTemplate.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!template) {
      throw ApiError.notFound("Template not found");
    }

    return prisma.messageTemplate.delete({
      where: {
        id,
      },
    });
  }

  /**
   * Process template with variables
   */
  static processTemplate(
    content: string,
    variables: Record<string, string>
  ): string {
    let processedContent = content;

    // Replace variables in the format {{variable_name}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      processedContent = processedContent.replace(regex, value);
    });

    return processedContent;
  }

  /**
   * Extract variables from template content
   */
  static extractVariables(content: string): string[] {
    const variableRegex = /{{\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*}}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      variables.push(match[1]);
    }

    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Calculate estimated cost for template
   */
  static calculateEstimatedCost(content: string): number {
    // Basic cost calculation - 1 SMS unit per 160 characters
    const smsUnits = Math.ceil(content.length / 160);
    const costPerUnit = 0.1; // $0.10 per SMS unit
    return smsUnits * costPerUnit;
  }

  /**
   * Get template categories
   */
  static async getTemplateCategories(userId: string) {
    try {
      const categories = await prisma.messageTemplate.groupBy({
        by: ["category"],
        where: {
          OR: [{ userId }, { isPublic: true }],
        },
        _count: {
          category: true,
        },
      });

      return categories.map((cat) => ({
        name: cat.category,
        count: cat._count.category,
      }));
    } catch (error) {
      console.error("Get categories error:", error);
      throw ApiError.internal("Failed to get template categories");
    }
  }

  /**
   * Search templates
   */
  static async searchTemplates(
    userId: string,
    query: string,
    options: {
      category?: string;
      isPublic?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const { category, isPublic, limit = 20, offset = 0 } = options;

      const where: any = {
        OR: [{ userId }, { isPublic: true }],
        AND: [
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { content: { contains: query, mode: "insensitive" } },
              { tags: { has: query } },
            ],
          },
        ],
      };

      if (category) {
        where.AND.push({ category });
      }

      if (isPublic !== undefined) {
        where.AND.push({ isPublic });
      }

      const [templates, total] = await Promise.all([
        prisma.messageTemplate.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: limit,
          skip: offset,
        }),
        prisma.messageTemplate.count({ where }),
      ]);

      return {
        templates,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error("Search templates error:", error);
      throw ApiError.internal("Failed to search templates");
    }
  }
}
