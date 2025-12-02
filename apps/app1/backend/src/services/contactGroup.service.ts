import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

interface CreateGroupInput {
  name: string;
  description?: string;
}

interface UpdateGroupInput {
  name?: string;
  description?: string;
}

export class ContactGroupService {
  /**
   * Get all contact groups for a user
   */
  static async getAll(userId: string) {
    const groups = await prisma.contactGroup.findMany({
      where: {
        userId
      },
      include: {
        _count: {
          select: {
            contacts: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transform the response to include contactCount
    return groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      contactCount: group._count.contacts,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    }));
  }

  /**
   * Get a contact group by ID
   */
  static async getById(userId: string, id: string) {
    const group = await prisma.contactGroup.findFirst({
      where: {
        id,
        userId
      },
      include: {
        _count: {
          select: {
            contacts: true
          }
        },
        contacts: {
          include: {
            contact: true
          }
        }
      }
    });

    if (!group) {
      return null;
    }

    // Transform the response to include contactCount and contacts
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      contactCount: group._count.contacts,
      contacts: group.contacts.map(c => c.contact),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    };
  }

  /**
   * Create a new contact group
   */
  static async create(userId: string, data: CreateGroupInput) {
    const group = await prisma.contactGroup.create({
      data: {
        ...data,
        user: {
          connect: {
            id: userId
          }
        }
      }
    });

    return {
      ...group,
      contactCount: 0
    };
  }

  /**
   * Update a contact group
   */
  static async update(userId: string, id: string, data: UpdateGroupInput) {
    // First check if the group exists and belongs to the user
    const group = await prisma.contactGroup.findFirst({
      where: {
        id,
        userId
      },
      include: {
        _count: {
          select: {
            contacts: true
          }
        }
      }
    });

    if (!group) {
      throw ApiError.notFound('Contact group not found');
    }

    const updatedGroup = await prisma.contactGroup.update({
      where: {
        id
      },
      data,
      include: {
        _count: {
          select: {
            contacts: true
          }
        }
      }
    });

    return {
      ...updatedGroup,
      contactCount: updatedGroup._count.contacts
    };
  }

  /**
   * Delete a contact group
   */
  static async delete(userId: string, id: string) {
    // First check if the group exists and belongs to the user
    const group = await prisma.contactGroup.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!group) {
      throw ApiError.notFound('Contact group not found');
    }

    // Delete all contact-group relationships first
    await prisma.contactToGroup.deleteMany({
      where: {
        groupId: id
      }
    });

    // Then delete the group
    return prisma.contactGroup.delete({
      where: {
        id
      }
    });
  }

  /**
   * Add contacts to a group
   */
  static async addContacts(userId: string, groupId: string, contactIds: string[]) {
    // First check if the group exists and belongs to the user
    const group = await prisma.contactGroup.findFirst({
      where: {
        id: groupId,
        userId
      }
    });

    if (!group) {
      throw ApiError.notFound('Contact group not found');
    }

    // Check if all contacts exist and belong to the user
    const contacts = await prisma.contact.findMany({
      where: {
        id: {
          in: contactIds
        },
        userId
      }
    });

    if (contacts.length !== contactIds.length) {
      throw ApiError.badRequest('One or more contacts not found');
    }

    // Create the relationships
    const data = contactIds.map(contactId => ({
      contactId,
      groupId
    }));

    await prisma.contactToGroup.createMany({
      data,
      skipDuplicates: true
    });

    // Return the updated group with contact count
    const updatedGroup = await prisma.contactGroup.findUnique({
      where: {
        id: groupId
      },
      include: {
        _count: {
          select: {
            contacts: true
          }
        }
      }
    });

    return {
      ...updatedGroup,
      contactCount: updatedGroup?._count.contacts || 0
    };
  }

  /**
   * Remove contacts from a group
   */
  static async removeContacts(userId: string, groupId: string, contactIds: string[]) {
    // First check if the group exists and belongs to the user
    const group = await prisma.contactGroup.findFirst({
      where: {
        id: groupId,
        userId
      }
    });

    if (!group) {
      throw ApiError.notFound('Contact group not found');
    }

    // Delete the relationships
    await prisma.contactToGroup.deleteMany({
      where: {
        groupId,
        contactId: {
          in: contactIds
        }
      }
    });

    // Return the updated group with contact count
    const updatedGroup = await prisma.contactGroup.findUnique({
      where: {
        id: groupId
      },
      include: {
        _count: {
          select: {
            contacts: true
          }
        }
      }
    });

    return {
      ...updatedGroup,
      contactCount: updatedGroup?._count.contacts || 0
    };
  }
}
