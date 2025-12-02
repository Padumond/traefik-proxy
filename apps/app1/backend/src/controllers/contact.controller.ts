import { Request, Response } from "express";
import { prisma } from "../server";
import { ApiError } from "../utils/ApiError";

export class ContactController {
  /**
   * Get all contacts for the authenticated user
   */
  static async getAll(req: Request, res: Response) {
    const userId = req.user!.id;

    const contacts = await prisma.contact.findMany({
      where: {
        userId,
      },
      include: {
        groups: {
          include: {
            group: true,
          },
        },
      },
    });

    // Transform the data to make it easier to use on the frontend
    const formattedContacts = contacts.map((contact) => {
      return {
        id: contact.id,
        name: contact.name,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        email: contact.email,
        tags: contact.tags,
        customFields: contact.customFields,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
        groups: contact.groups.map((g) => ({
          id: g.group.id,
          name: g.group.name,
        })),
      };
    });

    res.json(formattedContacts);
  }

  /**
   * Get a contact by ID
   */
  static async getById(req: Request, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;

    const contact = await prisma.contact.findUnique({
      where: {
        id,
        userId,
      },
      include: {
        groups: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!contact) {
      throw new ApiError("Contact not found", 404);
    }

    // Transform the data for frontend use
    const formattedContact = {
      id: contact.id,
      name: contact.name,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      email: contact.email,
      tags: contact.tags,
      customFields: contact.customFields,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      groups: contact.groups.map((g) => ({
        id: g.group.id,
        name: g.group.name,
      })),
    };

    res.json(formattedContact);
  }

  /**
   * Create a new contact
   */
  static async create(req: Request, res: Response) {
    const userId = req.user!.id;
    const {
      name,
      firstName,
      lastName,
      phone,
      email,
      tags = [],
      customFields = {},
      groupIds = [],
    } = req.body;

    console.log("Contact creation request:", {
      userId,
      name,
      firstName,
      lastName,
      phone,
      email,
      tags,
      customFields,
      groupIds,
    });

    // Validate required fields
    if (!name || !phone) {
      console.log("Validation failed: missing name or phone");
      throw new ApiError("Name and phone are required", 400);
    }

    // Create the contact
    const contact = await prisma.contact.create({
      data: {
        name,
        firstName,
        lastName,
        phone,
        email,
        tags,
        customFields,
        userId,
        ...(groupIds.length > 0 && {
          groups: {
            create: groupIds.map((groupId: string) => ({
              group: {
                connect: { id: groupId },
              },
            })),
          },
        }),
      },
      include: {
        groups: {
          include: {
            group: true,
          },
        },
      },
    });

    // Format the response
    const formattedContact = {
      id: contact.id,
      name: contact.name,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      email: contact.email,
      tags: contact.tags,
      customFields: contact.customFields,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      groups: contact.groups.map((g) => ({
        id: g.group.id,
        name: g.group.name,
      })),
    };

    console.log("Contact created successfully:", formattedContact);
    res.status(201).json(formattedContact);
  }

  /**
   * Update a contact
   */
  static async update(req: Request, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;
    const {
      name,
      firstName,
      lastName,
      phone,
      email,
      tags,
      customFields,
      groupIds = [],
    } = req.body;

    // Check if contact exists
    const contactExists = await prisma.contact.findUnique({
      where: {
        id,
        userId,
      },
    });

    if (!contactExists) {
      throw new ApiError("Contact not found", 404);
    }

    // Update the contact with transaction to handle group relations
    const contact = await prisma.$transaction(async (prisma) => {
      // Delete existing group relations
      await prisma.contactToGroup.deleteMany({
        where: {
          contactId: id,
        },
      });

      // Update the contact
      const updatedContact = await prisma.contact.update({
        where: {
          id,
        },
        data: {
          name: name !== undefined ? name : contactExists.name,
          firstName:
            firstName !== undefined ? firstName : contactExists.firstName,
          lastName: lastName !== undefined ? lastName : contactExists.lastName,
          phone: phone !== undefined ? phone : contactExists.phone,
          email: email !== undefined ? email : contactExists.email,
          tags: tags !== undefined ? tags : contactExists.tags,
          customFields:
            customFields !== undefined
              ? customFields
              : contactExists.customFields,
          groups: {
            create: groupIds.map((groupId: string) => ({
              group: {
                connect: { id: groupId },
              },
            })),
          },
        },
        include: {
          groups: {
            include: {
              group: true,
            },
          },
        },
      });

      return updatedContact;
    });

    // Format the response
    const formattedContact = {
      id: contact.id,
      name: contact.name,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      email: contact.email,
      tags: contact.tags,
      customFields: contact.customFields,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      groups: contact.groups.map((g) => ({
        id: g.group.id,
        name: g.group.name,
      })),
    };

    res.json(formattedContact);
  }

  /**
   * Delete a contact
   */
  static async delete(req: Request, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if contact exists
    const contactExists = await prisma.contact.findUnique({
      where: {
        id,
        userId,
      },
    });

    if (!contactExists) {
      throw new ApiError("Contact not found", 404);
    }

    // Delete the contact (relations will be cascaded due to Prisma schema)
    await prisma.contact.delete({
      where: {
        id,
      },
    });

    res.status(204).send();
  }
}
