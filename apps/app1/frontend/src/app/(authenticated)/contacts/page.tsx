"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
// import Swal from "sweetalert2";
import CreateContactModal from "@/components/modals/CreateContactModal";
import EditContactModal from "@/components/modals/EditContactModal";
import CreateGroupModal from "@/components/modals/CreateGroupModal";
import {
  useGetContactsQuery,
  useGetContactGroupsQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useCreateContactGroupMutation,
  useDeleteContactMutation,
  useDeleteContactGroupMutation,
} from "@/redux/services/messagesApi";
import { useLoadingStates } from "@/hooks/useLoadingStates";
import { LoadingSkeleton } from "@/components/ui/LoadingSpinner";

export default function ContactsPage() {
  // State for active submenu tab
  const [activeSubMenu, setActiveSubMenu] = useState<string>("groups");

  // State for modals
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMoreOptionsDropdown, setShowMoreOptionsDropdown] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(
    null
  );

  // Table state management
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Import state management
  const [importStep, setImportStep] = useState<
    "upload" | "preview" | "mapping" | "processing"
  >("upload");
  const [importedData, setImportedData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedImportGroup, setSelectedImportGroup] = useState<string>("");

  // File input ref for CSV import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreOptionsDropdown) {
        setShowMoreOptionsDropdown(false);
      }
    };

    if (showMoreOptionsDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMoreOptionsDropdown]);

  // Redux API hooks
  const {
    data: contacts = [],
    isLoading: contactsLoading,
    error: contactsError,
  } = useGetContactsQuery();
  const {
    data: groups = [],
    isLoading: groupsLoading,
    error: groupsError,
  } = useGetContactGroupsQuery();
  const [createContact] = useCreateContactMutation();
  const [updateContact] = useUpdateContactMutation();
  const [createGroup] = useCreateContactGroupMutation();
  const [deleteContact] = useDeleteContactMutation();
  const [deleteGroup] = useDeleteContactGroupMutation();

  // Loading hooks
  const { withCsvImportLoading, withContactLoading, withBatchLoading } =
    useLoadingStates();

  // Filter, search, and sort contacts
  const processedContacts = React.useMemo(() => {
    let result = [...contacts];

    // Apply group filter
    if (selectedGroupFilter) {
      result = result.filter((contact) =>
        contact.groups?.some((group: any) => group.name === selectedGroupFilter)
      );
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        (contact) =>
          contact.name?.toLowerCase().includes(searchLower) ||
          contact.phone?.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.groups?.some((group: any) =>
            group.name?.toLowerCase().includes(searchLower)
          )
      );
    }

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue = "";
        let bValue = "";

        switch (sortConfig.key) {
          case "name":
            aValue = a.name || "";
            bValue = b.name || "";
            break;
          case "phone":
            aValue = a.phone || "";
            bValue = b.phone || "";
            break;
          case "email":
            aValue = a.email || "";
            bValue = b.email || "";
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [contacts, selectedGroupFilter, searchTerm, sortConfig]);

  // Pagination logic
  const totalContacts = processedContacts.length;
  const totalPages = Math.ceil(totalContacts / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedContacts = processedContacts.slice(startIndex, endIndex);

  // For backward compatibility
  const filteredContacts = processedContacts;

  // Action handlers
  const handleAddContact = () => {
    setShowAddContactModal(true);
  };

  const handleMoreOptions = () => {
    setShowMoreOptionsDropdown(!showMoreOptionsDropdown);
  };

  const handleExportContacts = () => {
    try {
      // Get all contacts data
      const contactsData = contacts || [];

      if (contactsData.length === 0) {
        toast.error("❌ No contacts to export");
        return;
      }

      // Create CSV content
      const csvHeaders = "Name,Phone,Email,Groups,Created Date";
      const csvRows = contactsData.map((contact) => {
        const groupNames =
          contact.groups?.map((g) => g.name || g).join("; ") || "No groups";
        return `"${contact.name}","${contact.phone}","${
          contact.email || ""
        }","${groupNames}","${contact.createdAt || ""}"`;
      });

      const csvContent = [csvHeaders, ...csvRows].join("\r\n");

      // Create and download file
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mas3ndi_contacts_export_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => window.URL.revokeObjectURL(url), 100);

      toast.success(
        `✅ Exported ${contactsData.length} contacts successfully!`
      );
      setShowMoreOptionsDropdown(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("❌ Failed to export contacts. Please try again.");
    }
  };

  const handleContactSettings = () => {
    toast.info("⚙️ Contact settings coming soon!");
    setShowMoreOptionsDropdown(false);
  };

  const handleCreateGroup = () => {
    setShowAddGroupModal(true);
  };

  const handleEditGroup = (groupId: string, groupName: string) => {
    toast.info(`✏️ Edit group: ${groupName}`);
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the group "${groupName}"?`
      )
    ) {
      try {
        await deleteGroup(groupId).unwrap();
        toast.success(`🗑️ Group "${groupName}" deleted successfully`);
      } catch (error) {
        toast.error(`❌ Failed to delete group "${groupName}"`);
      }
    }
  };

  const handleViewGroupContacts = (groupName: string) => {
    // Clear any existing filter first, then set the new one
    setSelectedGroupFilter(null);
    setTimeout(() => {
      setSelectedGroupFilter(groupName);
      setActiveSubMenu("manage-contacts");
      toast.success(`📋 Showing contacts in group: ${groupName}`);
    }, 100);
  };

  const handleClearGroupFilter = () => {
    setSelectedGroupFilter(null);
    setCurrentPage(1);
    setSelectedContacts([]);
    toast.info("📋 Showing all contacts");
  };

  // Table handler functions
  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => {
      if (prevConfig?.key === key) {
        return {
          key,
          direction: prevConfig.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === paginatedContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(paginatedContacts.map((contact) => contact.id));
    }
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedContacts([]); // Clear selection when changing pages
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    setSelectedContacts([]);
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) return;

    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete ${selectedContacts.length} selected contacts?\n\nThis action cannot be undone.`
    );

    if (confirmed) {
      try {
        // Delete all selected contacts
        await Promise.all(
          selectedContacts.map((contactId) => deleteContact(contactId).unwrap())
        );
        toast.success(
          `🗑️ Successfully deleted ${selectedContacts.length} contacts`
        );
        setSelectedContacts([]);
      } catch (error) {
        toast.error("❌ Failed to delete some contacts. Please try again.");
      }
    }
  };

  const handleEditContact = (contactId: string, contactName: string) => {
    // Find the contact to edit
    const contactToEdit = contacts.find((c) => c.id === contactId);

    if (contactToEdit) {
      setEditingContact(contactToEdit);
      setShowEditContactModal(true);
    } else {
      toast.error("❌ Contact not found");
    }
  };

  const handleDeleteContact = async (
    contactId: string,
    contactName: string
  ) => {
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete "${contactName}"?\n\nThis action cannot be undone.`
    );

    if (confirmed) {
      try {
        await deleteContact(contactId).unwrap();
        toast.success(`🗑️ Contact "${contactName}" deleted successfully`);
      } catch (error) {
        console.error("Delete contact error:", error);
        toast.error(
          `❌ Failed to delete contact "${contactName}". Please try again.`
        );
      }
    }
  };

  // Modal handlers
  const handleContactUpdated = async (updatedContact: any) => {
    try {
      // Convert group names to group IDs
      const groupIds =
        updatedContact.groups
          ?.map((groupName: string) => {
            const group = groups.find((g) => g.name === groupName);
            return group?.id;
          })
          .filter(Boolean) || [];

      const updatePayload = {
        id: editingContact.id,
        contact: {
          name: updatedContact.name,
          firstName: updatedContact.firstName,
          lastName: updatedContact.lastName,
          phone: updatedContact.phone,
          email: updatedContact.email,
          customFields: updatedContact.customFields,
          groupIds: groupIds,
        },
      };

      await updateContact(updatePayload).unwrap();

      toast.success(`✅ Contact "${updatedContact.name}" updated successfully`);
      setShowEditContactModal(false);
      setEditingContact(null);
    } catch (error) {
      console.error("Contact update error:", error);
      toast.error(`❌ Failed to update contact "${updatedContact.name}"`);
    }
  };

  const handleContactCreated = async (newContact: any) => {
    await withContactLoading(async () => {
      // Convert group names to group IDs
      const groupIds =
        newContact.groups
          ?.map((groupName: string) => {
            const group = groups.find((g) => g.name === groupName);
            return group?.id;
          })
          .filter(Boolean) || [];

      const contactPayload = {
        name: newContact.name,
        firstName: newContact.firstName,
        lastName: newContact.lastName,
        phone: newContact.phone,
        email: newContact.email,
        customFields: newContact.customFields,
        groupIds: groupIds,
      };

      await createContact(contactPayload).unwrap();
      toast.success(`✅ Contact "${newContact.name}" created successfully`);
    }, "Creating");
  };

  const handleGroupCreated = async (newGroup: any) => {
    await withContactLoading(async () => {
      await createGroup({
        name: newGroup.name,
        description: newGroup.description,
      }).unwrap();
      toast.success(`✅ Group "${newGroup.name}" created successfully`);
    }, "Creating group");
  };

  // Loading and error states
  const isLoading = contactsLoading || groupsLoading;
  const hasError = contactsError || groupsError;

  // Helper functions
  const downloadSampleCSV = () => {
    try {
      // Mas3ndi CSV format with proper phone number formatting
      // Using multiple techniques to preserve leading zeros
      const csvData = [
        [
          "Phone Number",
          "Email",
          "Company",
          "First Name",
          "Last Name",
          "Birth Date",
        ],
        [
          "0240000000",
          "john.doe@mas3ndi.com",
          "Mas3ndi",
          "John",
          "Doe",
          "31-12-2000",
        ],
        [
          "0241234567",
          "jane.smith@company.com",
          "Tech Solutions",
          "Jane",
          "Smith",
          "15-06-1995",
        ],
        [
          "0242345678",
          "bob.johnson@business.com",
          "Marketing Corp",
          "Bob",
          "Johnson",
          "22-03-1988",
        ],
      ];

      // Convert to CSV with proper escaping and quotes for phone numbers
      const csvContent = csvData
        .map((row, index) => {
          return row
            .map((cell, cellIndex) => {
              // For phone numbers (first column after header), add special formatting
              if (index > 0 && cellIndex === 0) {
                // Use zero-width space before the number to preserve leading zero without visible characters
                return `"\u200B${cell}"`;
              }
              // For other cells, use standard quoting
              return `"${cell}"`;
            })
            .join(",");
        })
        .join("\r\n");

      // Create proper CSV blob with BOM for Excel compatibility
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mas3ndi_contacts_sample.csv";
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success("✅ Mas3ndi CSV sample downloaded successfully!");
    } catch (error) {
      console.error("CSV download error:", error);
      toast.error("❌ Failed to download CSV sample. Please try again.");
    }
  };

  // Test function to manually test contact creation
  const testContactCreation = async () => {
    console.log("🧪 Starting test contact creation");
    console.log("🔍 createContact function:", typeof createContact);

    try {
      const testContact = {
        name: "Test User",
        firstName: "Test",
        lastName: "User",
        phone: "0240000999",
        email: "test@example.com",
        customFields: {
          company: "Test Company",
          birthDate: "1990-01-01",
        },
        groupIds: [],
      };

      console.log("📝 Testing contact creation with:", testContact);
      console.log("📡 Calling createContact API...");

      const result = await createContact(testContact).unwrap();
      console.log("✅ Test contact creation success:", result);
      toast.success("✅ Test contact created successfully!");
    } catch (error: any) {
      console.error("❌ Test contact creation failed:", error);
      console.error("🔍 Full error:", error);
      console.error("📊 Error data:", error?.data);
      console.error("🔢 Error status:", error?.status);
      console.error("💬 Error message:", error?.message);
      console.error("🏷️ Error name:", error?.name);
      toast.error(
        `❌ Test contact creation failed: ${error?.message || "Unknown error"}`
      );
    }
  };

  // CSV parsing utility
  const parseCSV = (csvText: string) => {
    const lines = csvText.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const data = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      return row;
    });

    return { headers, data };
  };

  // Check for duplicates
  const checkDuplicates = (newData: any[]) => {
    const existingPhones = new Set(contacts.map((c) => c.phone));
    const duplicateEntries: any[] = [];
    const uniqueEntries: any[] = [];

    newData.forEach((entry) => {
      if (
        existingPhones.has(entry.phone) ||
        duplicateEntries.some((d) => d.phone === entry.phone)
      ) {
        duplicateEntries.push(entry);
      } else {
        uniqueEntries.push(entry);
      }
    });

    return { duplicates: duplicateEntries, unique: uniqueEntries };
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      toast.error("File size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const { headers, data } = parseCSV(csvText);

        if (headers.length === 0 || data.length === 0) {
          toast.error("CSV file appears to be empty or invalid");
          return;
        }

        setCsvHeaders(headers);
        setImportedData(data);
        setImportStep("preview");

        // Auto-map common fields
        const autoMapping: Record<string, string> = {};
        headers.forEach((header) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes("phone") || lowerHeader.includes("mobile")) {
            autoMapping[header] = "phone";
          } else if (lowerHeader.includes("email")) {
            autoMapping[header] = "email";
          } else if (
            lowerHeader.includes("first") &&
            lowerHeader.includes("name")
          ) {
            autoMapping[header] = "firstName";
          } else if (
            lowerHeader.includes("last") &&
            lowerHeader.includes("name")
          ) {
            autoMapping[header] = "lastName";
          } else if (lowerHeader.includes("company")) {
            autoMapping[header] = "company";
          } else if (
            lowerHeader.includes("birth") ||
            lowerHeader.includes("date")
          ) {
            autoMapping[header] = "birthDate";
          }
        });

        setFieldMapping(autoMapping);
        toast.success(`Loaded ${data.length} contacts from CSV`);
      } catch (error) {
        toast.error("Failed to parse CSV file. Please check the format.");
      }
    };

    reader.readAsText(file);
  };

  // Process and import contacts
  const handleImportContacts = async () => {
    console.log("🚀 Starting handleImportContacts");
    console.log("📊 Imported data length:", importedData.length);
    console.log("📋 CSV headers:", csvHeaders);
    console.log("🗺️ Field mapping:", fieldMapping);
    console.log("🔍 Field mapping details:");
    Object.entries(fieldMapping).forEach(([csvColumn, dbField]) => {
      console.log(`  - CSV "${csvColumn}" → DB "${dbField}"`);
    });

    if (!importedData.length) {
      console.log("❌ No imported data, returning early");
      toast.error("No data to import");
      return;
    }

    // Check if phone field is mapped
    if (!Object.values(fieldMapping).includes("phone")) {
      console.log("❌ No phone field mapped");
      toast.error(
        "Please map at least one column to 'Phone Number' before importing"
      );
      setImportStep("mapping");
      return;
    }

    // Use the new loading system for CSV import
    await withCsvImportLoading(async (updateProgress) => {
      console.log("✅ Starting CSV import with loading system");
      setImportStep("processing");
      console.log("🔄 Starting data mapping process");

      // Map CSV data to contact format
      const mappedContacts = importedData
        .map((row, index) => {
          console.log(`📝 Processing row ${index + 1}:`, row);
          console.log(`🗺️ Field mapping for row ${index + 1}:`, fieldMapping);

          // Find CSV columns that map to each DB field
          const phoneColumn = Object.keys(fieldMapping).find(
            (key) => fieldMapping[key] === "phone"
          );
          const emailColumn = Object.keys(fieldMapping).find(
            (key) => fieldMapping[key] === "email"
          );
          const firstNameColumn = Object.keys(fieldMapping).find(
            (key) => fieldMapping[key] === "firstName"
          );
          const lastNameColumn = Object.keys(fieldMapping).find(
            (key) => fieldMapping[key] === "lastName"
          );

          const firstName = firstNameColumn
            ? row[firstNameColumn]?.trim() || ""
            : "";
          const lastName = lastNameColumn
            ? row[lastNameColumn]?.trim() || ""
            : "";
          const name = `${firstName} ${lastName}`.trim() || "Unknown";
          const phone = phoneColumn ? row[phoneColumn]?.trim() || "" : "";
          const email = emailColumn ? row[emailColumn]?.trim() || "" : "";

          console.log(`🔍 Field extraction for row ${index + 1}:`);
          console.log(`  - phoneColumn: "${phoneColumn}"`);
          console.log(`  - row[phoneColumn]: "${row[phoneColumn]}"`);
          console.log(`  - extracted phone: "${phone}"`);

          console.log(`👤 Mapped contact ${index + 1}:`, {
            name,
            firstName,
            lastName,
            phone,
            email,
          });

          // Only include non-empty custom fields
          const companyColumn = Object.keys(fieldMapping).find(
            (key) => fieldMapping[key] === "company"
          );
          const birthDateColumn = Object.keys(fieldMapping).find(
            (key) => fieldMapping[key] === "birthDate"
          );

          const customFields: any = {};
          if (companyColumn && row[companyColumn]?.trim()) {
            customFields.company = row[companyColumn].trim();
          }
          if (birthDateColumn && row[birthDateColumn]?.trim()) {
            customFields.birthDate = row[birthDateColumn].trim();
          }

          const contact = {
            name,
            firstName,
            lastName,
            phone,
            email,
            customFields:
              Object.keys(customFields).length > 0 ? customFields : {},
            groupIds: selectedImportGroup ? [selectedImportGroup] : [], // Assign to selected group if any
          };

          console.log(`✅ Final contact ${index + 1}:`, contact);
          return contact;
        })
        .filter((contact) => {
          const isValid = contact.phone && contact.phone.length > 0;
          if (!isValid) {
            console.log("❌ Filtered out contact (no phone):", contact);
          }
          return isValid;
        }); // Only import contacts with valid phone numbers

      console.log("📊 Total mapped contacts:", mappedContacts.length);
      console.log("🔍 Sample mapped contact:", mappedContacts[0]);

      // Check for duplicates
      console.log("🔍 Checking for duplicates...");
      const { duplicates: foundDuplicates, unique: uniqueContacts } =
        checkDuplicates(mappedContacts);

      console.log("📊 Duplicate check results:");
      console.log("  - Duplicates found:", foundDuplicates.length);
      console.log("  - Unique contacts:", uniqueContacts.length);
      console.log("  - Duplicate contacts:", foundDuplicates);

      if (foundDuplicates.length > 0) {
        setDuplicates(foundDuplicates);
        toast.warning(
          `Found ${foundDuplicates.length} duplicate contacts. Review before importing.`
        );
      }

      // Import unique contacts
      let successCount = 0;
      let errorCount = 0;

      console.log("🚀 Starting import process");
      console.log("📊 Contacts to import:", uniqueContacts.length);
      console.log("🔍 Sample contact data:", uniqueContacts[0]);

      if (uniqueContacts.length === 0) {
        console.log("❌ No unique contacts to import");
        toast.error("No unique contacts to import");
        setIsImporting(false);
        setImportStep("upload");
        return;
      }

      for (let i = 0; i < uniqueContacts.length; i++) {
        console.log(
          `\n🔄 Processing contact ${i + 1}/${uniqueContacts.length}`
        );
        console.log("📝 Contact data:", uniqueContacts[i]);

        try {
          console.log("📡 Calling createContact API...");
          const result = await createContact(uniqueContacts[i]).unwrap();
          console.log("✅ Import success:", result);
          successCount++;
        } catch (error: any) {
          errorCount++;
          console.error("❌ Import error for contact:", uniqueContacts[i]);
          console.error("🔍 Full error object:", error);
          console.error("📊 Error data:", error?.data);
          console.error("🔢 Error status:", error?.status);
          console.error("💬 Error message:", error?.message);
          console.error("🏷️ Error name:", error?.name);
        }

        // Update progress using the loading system
        const progress = Math.round(((i + 1) / uniqueContacts.length) * 100);
        console.log(`📈 Progress: ${progress}%`);
        updateProgress(progress);

        // Add small delay to prevent overwhelming the server
        if (i < uniqueContacts.length - 1) {
          console.log("⏳ Waiting 200ms before next import...");
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      console.log("🏁 Import process completed");
      console.log("✅ Success count:", successCount);
      console.log("❌ Error count:", errorCount);

      // Show results
      if (successCount > 0) {
        toast.success(`✅ Successfully imported ${successCount} contacts!`);
      }
      if (errorCount > 0) {
        toast.error(`❌ Failed to import ${errorCount} contacts`);
      }
      if (foundDuplicates.length > 0) {
        toast.info(`⚠️ Skipped ${foundDuplicates.length} duplicate contacts`);
      }

      // Reset import state
      setImportStep("upload");
      setImportedData([]);
      setCsvHeaders([]);
      setFieldMapping({});
      setDuplicates([]);
      setSelectedImportGroup("");
    });

    // Clean up local state
    setIsImporting(false);
  };

  // Reset import process
  const handleResetImport = () => {
    setImportStep("upload");
    setImportedData([]);
    setCsvHeaders([]);
    setFieldMapping({});
    setDuplicates([]);
    setImportProgress(0);
    setSelectedImportGroup("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your contacts, groups, and imports
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {/* Add Contact Button */}
              <button
                type="button"
                onClick={handleAddContact}
                className="flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>
                Add Contact
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={handleMoreOptions}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5 text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                  More Options
                </button>

                {/* Dropdown Menu */}
                {showMoreOptionsDropdown && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div
                      className="py-1"
                      role="menu"
                      aria-orientation="vertical"
                    >
                      <button
                        type="button"
                        onClick={handleExportContacts}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        role="menuitem"
                      >
                        <svg
                          className="mr-3 h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Export Contacts
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          toast.info("🔄 Bulk operations coming soon!");
                          setShowMoreOptionsDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        role="menuitem"
                      >
                        <svg
                          className="mr-3 h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Bulk Delete
                      </button>

                      <div className="border-t border-gray-100"></div>

                      <button
                        type="button"
                        onClick={handleContactSettings}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        role="menuitem"
                      >
                        <svg
                          className="mr-3 h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Contact Settings
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submenu Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav
            className="-mb-px flex space-x-6 overflow-x-auto"
            aria-label="Contact features"
          >
            <button
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeSubMenu === "groups"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveSubMenu("groups")}
            >
              Groups
            </button>
            <button
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeSubMenu === "import-contacts"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveSubMenu("import-contacts")}
            >
              Import Contacts
            </button>
            <button
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeSubMenu === "manage-contacts"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveSubMenu("manage-contacts")}
            >
              Manage Contacts
            </button>
          </nav>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          {activeSubMenu === "groups" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    Contact Groups
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Create and manage your contact groups for targeted
                    messaging.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    ></path>
                  </svg>
                  Create Group
                </button>
              </div>

              {/* Groups Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">
                        {group.name}
                      </h3>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => handleEditGroup(group.id, group.name)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            ></path>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteGroup(group.id, group.name)
                          }
                          className="text-gray-400 hover:text-red-600"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {group.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-indigo-600">
                        {group.contactCount} contacts
                      </span>
                      <button
                        type="button"
                        onClick={() => handleViewGroupContacts(group.name)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        View contacts
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubMenu === "import-contacts" && (
            <div>
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    Import Contacts
                    {importedData.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({importedData.length} contacts loaded)
                      </span>
                    )}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Import contacts from CSV files with field mapping and
                    duplicate detection.
                  </p>
                </div>
                <div className="flex space-x-3">
                  {importStep !== "upload" && (
                    <button
                      type="button"
                      onClick={handleResetImport}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Start Over
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={downloadSampleCSV}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                    Download Sample CSV
                  </button>
                  <button
                    type="button"
                    onClick={testContactCreation}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Test Contact Creation
                  </button>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-center">
                  {["upload", "preview", "mapping", "processing"].map(
                    (step, index) => (
                      <div key={step} className="flex items-center">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                            importStep === step
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : index <
                                [
                                  "upload",
                                  "preview",
                                  "mapping",
                                  "processing",
                                ].indexOf(importStep)
                              ? "border-green-600 bg-green-600 text-white"
                              : "border-gray-300 bg-white text-gray-500"
                          }`}
                        >
                          {index <
                          [
                            "upload",
                            "preview",
                            "mapping",
                            "processing",
                          ].indexOf(importStep) ? (
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <span className="text-sm font-medium">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <span
                          className={`ml-2 text-sm font-medium ${
                            importStep === step
                              ? "text-indigo-600"
                              : "text-gray-500"
                          }`}
                        >
                          {step.charAt(0).toUpperCase() + step.slice(1)}
                        </span>
                        {index < 3 && (
                          <div
                            className={`w-16 h-0.5 mx-4 ${
                              index <
                              [
                                "upload",
                                "preview",
                                "mapping",
                                "processing",
                              ].indexOf(importStep)
                                ? "bg-green-600"
                                : "bg-gray-300"
                            }`}
                          />
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* CSV Format Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <svg
                    className="w-5 h-5 text-blue-400 mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">
                      CSV Format Requirements
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Your CSV file must include these columns in the Mas3ndi
                        format:
                      </p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>
                          <strong>Phone Number</strong> - Phone number (format:
                          0240000000)
                        </li>
                        <li>
                          <strong>Email</strong> - Email address
                        </li>
                        <li>
                          <strong>Company</strong> - Company name
                        </li>
                        <li>
                          <strong>First Name</strong> - Contact's first name
                        </li>
                        <li>
                          <strong>Last Name</strong> - Contact's last name
                        </li>
                        <li>
                          <strong>Birth Date</strong> - Birth date (format:
                          DD-MM-YYYY)
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
                <div className="mt-4">
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Drop your CSV file here, or click to browse
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      Supports CSV files up to 10MB
                    </span>
                  </label>
                  <input
                    ref={fileInputRef}
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      ></path>
                    </svg>
                    Choose CSV File
                  </button>
                </div>
              </div>

              {/* Step 2: Preview Data */}
              {importStep === "preview" && (
                <div className="mt-8">
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Preview Data
                    </h3>
                    <p className="text-sm text-gray-600">
                      Review the first few rows of your CSV data. Proceed to
                      field mapping to configure how columns should be imported.
                    </p>
                  </div>

                  <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {csvHeaders.map((header, index) => (
                              <th
                                key={index}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importedData.slice(0, 5).map((row, index) => (
                            <tr
                              key={index}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              {csvHeaders.map((header, colIndex) => (
                                <td
                                  key={colIndex}
                                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                >
                                  {row[header] || "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={handleResetImport}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportStep("mapping")}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Continue to Field Mapping
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Field Mapping */}
              {importStep === "mapping" && (
                <div className="mt-8">
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Field Mapping
                    </h3>
                    <p className="text-sm text-gray-600">
                      Map your CSV columns to contact fields. Phone number is
                      required for import.
                    </p>
                  </div>

                  <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      {csvHeaders.map((header) => (
                        <div key={header}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CSV Column:{" "}
                            <span className="font-semibold">{header}</span>
                          </label>
                          <select
                            value={fieldMapping[header] || ""}
                            onChange={(e) =>
                              setFieldMapping((prev) => ({
                                ...prev,
                                [header]: e.target.value,
                              }))
                            }
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          >
                            <option value="">Don't import</option>
                            <option value="phone">Phone Number</option>
                            <option value="email">Email</option>
                            <option value="firstName">First Name</option>
                            <option value="lastName">Last Name</option>
                            <option value="company">Company</option>
                            <option value="birthDate">Birth Date</option>
                          </select>
                        </div>
                      ))}
                    </div>

                    {!Object.values(fieldMapping).includes("phone") && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-red-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                              Phone Number Required
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                              <p>
                                Please map at least one column to "Phone Number"
                                to proceed with import.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Group Selection */}
                    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Assign to Group (Optional)
                      </h4>
                      <p className="text-xs text-gray-600 mb-3">
                        Select a group to assign all imported contacts to. You
                        can create a new group or leave blank to import without
                        grouping.
                      </p>
                      <div className="flex space-x-3">
                        <div className="flex-1">
                          <select
                            value={selectedImportGroup}
                            onChange={(e) =>
                              setSelectedImportGroup(e.target.value)
                            }
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          >
                            <option value="">
                              No group (import without grouping)
                            </option>
                            {groups.map((group: any) => (
                              <option key={group.id} value={group.id}>
                                {group.name} ({group._count?.contacts || 0}{" "}
                                contacts)
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const groupName = prompt("Enter new group name:");
                            if (groupName?.trim()) {
                              createGroup({ name: groupName.trim() })
                                .unwrap()
                                .then((newGroup) => {
                                  setSelectedImportGroup(newGroup.id);
                                  toast.success(`Created group: ${groupName}`);
                                })
                                .catch((error) => {
                                  console.error(
                                    "Failed to create group:",
                                    error
                                  );
                                  toast.error("Failed to create group");
                                });
                            }
                          }}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <svg
                            className="h-4 w-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          New Group
                        </button>
                      </div>
                      {selectedImportGroup && (
                        <div className="mt-2 text-xs text-indigo-600">
                          ✓ Contacts will be assigned to:{" "}
                          {
                            groups.find(
                              (g: any) => g.id === selectedImportGroup
                            )?.name
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setImportStep("preview")}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleImportContacts}
                      disabled={!Object.values(fieldMapping).includes("phone")}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Import Contacts
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Processing */}
              {importStep === "processing" && (
                <div className="mt-8 text-center py-12">
                  <div className="mx-auto h-12 w-12 text-indigo-600 mb-4">
                    <svg
                      className="animate-spin h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Importing Contacts
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Please wait while we import your contacts...
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {importProgress}% complete
                  </p>
                </div>
              )}

              {/* Duplicates Warning */}
              {duplicates.length > 0 && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Duplicate Contacts Found
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          Found {duplicates.length} contacts with phone numbers
                          that already exist in your contact list. These will be
                          skipped during import.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubMenu === "manage-contacts" && (
            <div>
              {/* Header Section */}
              <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      Manage Contacts
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({totalContacts}{" "}
                        {totalContacts === 1 ? "contact" : "contacts"})
                      </span>
                    </h2>
                    <p className="text-gray-600 mt-1">
                      View, edit, and manage your individual contacts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddContactModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      ></path>
                    </svg>
                    Add Contact
                  </button>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    {/* Group Filter Dropdown */}
                    <select
                      value={selectedGroupFilter || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedGroupFilter(value || null);
                        setCurrentPage(1);
                        setSelectedContacts([]);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      <option value="">All Groups</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.name}>
                          {group.name} ({group.contactCount})
                        </option>
                      ))}
                    </select>

                    {/* Active Filter Badge */}
                    {selectedGroupFilter && (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          📋 {selectedGroupFilter}
                        </span>
                        <button
                          type="button"
                          onClick={handleClearGroupFilter}
                          className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Search Input */}
                  <div className="w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                        setSelectedContacts([]);
                      }}
                      className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Bulk Actions Toolbar */}
                {selectedContacts.length > 0 && (
                  <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-900">
                        {selectedContacts.length} contact
                        {selectedContacts.length !== 1 ? "s" : ""} selected
                      </span>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={handleBulkDelete}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Delete Selected
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedContacts([])}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Professional Data Table */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    {/* Table Header */}
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={
                              paginatedContacts.length > 0 &&
                              selectedContacts.length ===
                                paginatedContacts.length
                            }
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Name</span>
                            {sortConfig?.key === "name" && (
                              <span className="text-indigo-600">
                                {sortConfig.direction === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("phone")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Phone</span>
                            {sortConfig?.key === "phone" && (
                              <span className="text-indigo-600">
                                {sortConfig.direction === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("email")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Email</span>
                            {sortConfig?.key === "email" && (
                              <span className="text-indigo-600">
                                {sortConfig.direction === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Groups
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contactsLoading
                        ? // Loading skeletons
                          Array.from({ length: 5 }).map((_, index) => (
                            <tr
                              key={`skeleton-${index}`}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <LoadingSkeleton
                                  variant="default"
                                  className="w-4 h-4"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <LoadingSkeleton variant="avatar" />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <LoadingSkeleton
                                  variant="text"
                                  className="w-32"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <LoadingSkeleton
                                  variant="text"
                                  className="w-24"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <LoadingSkeleton
                                  variant="text"
                                  className="w-40"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <LoadingSkeleton
                                  variant="text"
                                  className="w-20"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <LoadingSkeleton
                                  variant="text"
                                  className="w-16"
                                />
                              </td>
                            </tr>
                          ))
                        : paginatedContacts.map((contact, index) => (
                            <tr
                              key={contact.id}
                              className={`${
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              } hover:bg-indigo-50 transition-colors duration-150`}
                            >
                              {/* Checkbox */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedContacts.includes(
                                    contact.id
                                  )}
                                  onChange={() =>
                                    handleSelectContact(contact.id)
                                  }
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                              </td>

                              {/* Avatar */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-indigo-800">
                                    {contact.name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase() || "?"}
                                  </span>
                                </div>
                              </td>

                              {/* Name */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {contact.name}
                                </div>
                              </td>

                              {/* Phone */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {contact.phone}
                                </div>
                              </td>

                              {/* Email */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {contact.email || "-"}
                                </div>
                              </td>

                              {/* Groups */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap gap-1">
                                  {contact.groups &&
                                  contact.groups.length > 0 ? (
                                    contact.groups.map(
                                      (group: any, idx: number) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                                        >
                                          {group.name || group}
                                        </span>
                                      )
                                    )
                                  ) : (
                                    <span className="text-xs text-gray-500">
                                      No groups
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleEditContact(
                                        contact.id,
                                        contact.name
                                      )
                                    }
                                    className="text-indigo-600 hover:text-indigo-900 transition-colors duration-150"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteContact(
                                        contact.id,
                                        contact.name
                                      )
                                    }
                                    className="text-red-600 hover:text-red-900 transition-colors duration-150"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalContacts > 0 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>

                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div className="flex items-center space-x-4">
                        <p className="text-sm text-gray-700">
                          Showing{" "}
                          <span className="font-medium">{startIndex + 1}</span>{" "}
                          to{" "}
                          <span className="font-medium">
                            {Math.min(endIndex, totalContacts)}
                          </span>{" "}
                          of{" "}
                          <span className="font-medium">{totalContacts}</span>{" "}
                          results
                        </p>

                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-700">Show:</label>
                          <select
                            value={pageSize}
                            onChange={(e) =>
                              handlePageSizeChange(Number(e.target.value))
                            }
                            className="border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            type="button"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <svg
                              className="h-5 w-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>

                          {Array.from(
                            { length: Math.min(totalPages, 7) },
                            (_, i) => {
                              let pageNumber;
                              if (totalPages <= 7) {
                                pageNumber = i + 1;
                              } else if (currentPage <= 4) {
                                pageNumber = i + 1;
                              } else if (currentPage >= totalPages - 3) {
                                pageNumber = totalPages - 6 + i;
                              } else {
                                pageNumber = currentPage - 3 + i;
                              }

                              return (
                                <button
                                  key={pageNumber}
                                  type="button"
                                  onClick={() => handlePageChange(pageNumber)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    pageNumber === currentPage
                                      ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                                      : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                  }`}
                                >
                                  {pageNumber}
                                </button>
                              );
                            }
                          )}

                          <button
                            type="button"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Next</span>
                            <svg
                              className="h-5 w-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {processedContacts.length === 0 && (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    ></path>
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {searchTerm
                      ? `No contacts found for "${searchTerm}"`
                      : selectedGroupFilter
                      ? `No contacts in "${selectedGroupFilter}"`
                      : "No contacts"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm
                      ? "Try adjusting your search terms or clear the search to see all contacts."
                      : selectedGroupFilter
                      ? `There are no contacts in the "${selectedGroupFilter}" group yet.`
                      : "Get started by adding your first contact."}
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowAddContactModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 4v16m8-8H4"
                        ></path>
                      </svg>
                      Add your first contact
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Modals */}
      <CreateContactModal
        isOpen={showAddContactModal}
        onClose={() => setShowAddContactModal(false)}
        onContactCreated={handleContactCreated}
        groups={groups}
      />

      <EditContactModal
        isOpen={showEditContactModal}
        onClose={() => {
          setShowEditContactModal(false);
          setEditingContact(null);
        }}
        onContactUpdated={handleContactUpdated}
        contact={editingContact}
        groups={groups}
      />

      <CreateGroupModal
        isOpen={showAddGroupModal}
        onClose={() => setShowAddGroupModal(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
}
