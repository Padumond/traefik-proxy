"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  useGetMessagesQuery,
  useSendMessageMutation,
  useGetMessageTemplatesQuery,
  useGetContactGroupsQuery,
  useCreateMessageTemplateMutation,
  useUpdateMessageTemplateMutation,
  useDeleteMessageTemplateMutation,
  MessageTemplate,
} from "@/redux/services/messagesApi";
import { useGetSenderIdsQuery } from "@/redux/services/senderIdApi";
import { useGetUserBalanceQuery } from "@/redux/services/smsPackagesApi";
import { useGetWalletBalanceQuery } from "@/redux/services/transactionsApi";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { useLoadingStates } from "@/hooks/useLoadingStates";
import {
  LoadingSpinner,
  LoadingSkeleton,
} from "@/components/ui/LoadingSpinner";
import { InlineLoader } from "@/components/ui/GlobalLoader";
import SenderIdModal from "@/components/sender-id/SenderIdModal";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("send");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // SMS Form State
  const [smsForm, setSmsForm] = useState({
    senderId: "",
    messageType: "quick", // Changed default to "quick"
    recipients: "",
    message: "",
    isScheduled: false,
    scheduledDate: "",
    scheduledTime: "",
    selectedTemplate: "",
    templateVariables: {} as Record<string, string>,
    selectedGroups: [] as string[],
    delimiter: "\\n", // Default delimiter - newline for better UX
    removeDuplicates: true, // Default to remove duplicates
    billingMode: "credits", // Default to credit-based billing
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvedSenderIds, setApprovedSenderIds] = useState<string[]>([]);
  const [isSenderIdModalOpen, setIsSenderIdModalOpen] = useState(false);
  const itemsPerPage = 10;

  // Loading hooks
  const { withErrorHandling, executeWithLoading } = useLoadingStates();

  // Handle URL tab parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["send", "history", "scheduled", "templates"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Template management state
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] =
    useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<MessageTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    content: "",
    category: "GENERAL",
    variables: [] as string[],
  });

  // Template mutations
  const [createTemplate] = useCreateMessageTemplateMutation();
  const [updateTemplate] = useUpdateMessageTemplateMutation();
  const [deleteTemplate] = useDeleteMessageTemplateMutation();

  // API Hooks
  const {
    data: senderIdsData,
    isLoading: senderIdsLoading,
    refetch: refetchSenderIds,
  } = useGetSenderIdsQuery();
  const { data: templates, isLoading: templatesLoading } =
    useGetMessageTemplatesQuery();
  const { data: contactGroups, isLoading: contactGroupsLoading } =
    useGetContactGroupsQuery();
  const [sendMessage] = useSendMessageMutation();

  // Balance API hooks
  const { data: balanceData, isLoading: balanceLoading } =
    useGetUserBalanceQuery();
  const { data: walletBalanceData, isLoading: walletBalanceLoading } =
    useGetWalletBalanceQuery();

  // Fetch messages data
  const {
    data: messagesData,
    isLoading,
    error,
    refetch: refetchMessages,
  } = useGetMessagesQuery({
    page: currentPage,
    limit: itemsPerPage,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: searchTerm,
  });

  // Process messages data with proper error handling
  const messages = (() => {
    try {
      if (!messagesData?.data) return [];

      // Handle different possible data structures
      if (Array.isArray(messagesData.data)) {
        return messagesData.data;
      } else if (
        messagesData.data.data &&
        Array.isArray(messagesData.data.data)
      ) {
        return messagesData.data.data;
      } else if (
        messagesData.data.messages &&
        Array.isArray(messagesData.data.messages)
      ) {
        return messagesData.data.messages;
      } else {
        console.warn("Unexpected messages data structure:", messagesData);
        return [];
      }
    } catch (error) {
      console.error("Error processing messages data:", error);
      return [];
    }
  })();

  const totalPages = Math.ceil((messagesData?.total || 0) / itemsPerPage);

  // Process sender IDs data
  useEffect(() => {
    if (senderIdsData?.data) {
      try {
        // Handle different possible data structures
        let senderIdsArray = [];

        if (Array.isArray(senderIdsData.data)) {
          // If data is directly an array
          senderIdsArray = senderIdsData.data;
        } else if (
          senderIdsData.data.data &&
          Array.isArray(senderIdsData.data.data)
        ) {
          // If data is nested (e.g., { data: { data: [...] } })
          senderIdsArray = senderIdsData.data.data;
        } else if (
          senderIdsData.data.senderIds &&
          Array.isArray(senderIdsData.data.senderIds)
        ) {
          // If data has senderIds property
          senderIdsArray = senderIdsData.data.senderIds;
        } else {
          console.warn("Unexpected sender IDs data structure:", senderIdsData);
          return;
        }

        const approved = senderIdsArray
          .filter((senderId: any) => senderId.status === "APPROVED")
          .map((senderId: any) => senderId.senderId);
        setApprovedSenderIds(approved);
      } catch (error) {
        console.error("Error processing sender IDs data:", error);
        console.log("Sender IDs data structure:", senderIdsData);
        setApprovedSenderIds([]);
      }
    }
  }, [senderIdsData]);

  // Form Handlers
  const handleFormChange = (field: string, value: string) => {
    setSmsForm((prev) => ({ ...prev, [field]: value }));
  };

  // Template helper functions
  const handleTemplateSelect = (templateId: string) => {
    const selectedTemplate = templates?.find((t) => t.id === templateId);
    if (selectedTemplate) {
      setSmsForm((prev) => ({
        ...prev,
        selectedTemplate: templateId,
        message: selectedTemplate.content,
        templateVariables: {},
      }));

      // Extract variables from template
      const variableMatches = selectedTemplate.content.match(/\{(\w+)\}/g);
      if (variableMatches) {
        const variables = variableMatches.map((match) => match.slice(1, -1));
        const variableObj: Record<string, string> = {};
        variables.forEach((variable) => {
          variableObj[variable] = "";
        });
        setSmsForm((prev) => ({
          ...prev,
          templateVariables: variableObj,
        }));
      }
    }
  };

  const updateTemplateVariable = (variableName: string, value: string) => {
    setSmsForm((prev) => ({
      ...prev,
      templateVariables: {
        ...prev.templateVariables,
        [variableName]: value,
      },
    }));

    // Update message with variable substitution
    if (smsForm.selectedTemplate) {
      const template = templates?.find(
        (t) => t.id === smsForm.selectedTemplate
      );
      if (template) {
        let updatedMessage = template.content;
        Object.entries({
          ...smsForm.templateVariables,
          [variableName]: value,
        }).forEach(([key, val]) => {
          const regex = new RegExp(`\\{${key}\\}`, "g");
          updatedMessage = updatedMessage.replace(regex, val);
        });
        setSmsForm((prev) => ({
          ...prev,
          message: updatedMessage,
        }));
      }
    }
  };

  const clearTemplate = () => {
    setSmsForm((prev) => ({
      ...prev,
      selectedTemplate: "",
      templateVariables: {},
      message: "",
    }));
  };

  // Helper function to process recipients with delimiters and duplicate removal
  const processRecipients = (
    recipientText: string,
    delimiter: string,
    removeDuplicates: boolean
  ) => {
    if (!recipientText.trim()) return [];

    // Handle different delimiters
    let recipients: string[] = [];

    if (delimiter === "\\n") {
      // For newline delimiter, split by actual newlines and carriage returns
      recipients = recipientText
        .split(/\r?\n/)
        .map((num) => num.trim())
        .filter((num) => num.length > 0);
    } else {
      // For other delimiters, use the delimiter directly
      recipients = recipientText
        .split(delimiter)
        .map((num) => num.trim())
        .filter((num) => num.length > 0);
    }

    // Remove duplicates if enabled
    if (removeDuplicates) {
      recipients = [...new Set(recipients)];
    }

    return recipients;
  };

  // Get processed recipients count for display
  const getRecipientCount = () => {
    return processRecipients(
      smsForm.recipients,
      smsForm.delimiter,
      smsForm.removeDuplicates
    ).length;
  };

  // Validate phone number format (supports Ghanaian and international formats)
  const isValidPhoneNumber = (phone: string) => {
    // Remove any spaces, dashes, or parentheses
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");

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

  // Get invalid phone numbers for display
  const getInvalidNumbers = () => {
    const recipients = processRecipients(
      smsForm.recipients,
      smsForm.delimiter,
      smsForm.removeDuplicates
    );
    return recipients.filter((num) => !isValidPhoneNumber(num));
  };

  // Calculate SMS parts based on message length
  const getSmsCount = (message: string) => {
    if (!message) return 1;
    // Basic SMS calculation: 160 chars per SMS for GSM 7-bit
    // 70 chars per SMS for Unicode (contains non-GSM characters)
    const isUnicode = /[^\x00-\x7F]/.test(message);
    const maxLength = isUnicode ? 70 : 160;
    return Math.ceil(message.length / maxLength);
  };

  // Calculate estimated cost
  const getEstimatedCost = () => {
    const validRecipients = getRecipientCount() - getInvalidNumbers().length;
    const smsCount = getSmsCount(smsForm.message);
    const costPerSms = 0.059; // GH₵0.059 per SMS
    return validRecipients * smsCount * costPerSms;
  };

  // Calculate SMS cost based on billing mode
  const calculateSMSCost = () => {
    const smsCount = Math.ceil(smsForm.message.length / 160) || 1;

    let recipientCount = 0;

    if (smsForm.messageType === "quick") {
      recipientCount = getRecipientCount();
    } else {
      // For bulk SMS: count both contact groups AND direct recipients
      const groupCount =
        smsForm.selectedGroups?.reduce((total, groupId) => {
          const group = contactGroups?.find((g) => g.id === groupId);
          return total + (group?.contactCount || 0);
        }, 0) || 0;

      const directRecipientCount = getRecipientCount();
      recipientCount = groupCount + directRecipientCount;
    }

    const totalSMSUnits = smsCount * recipientCount;

    if (smsForm.billingMode === "credits") {
      return {
        credits: totalSMSUnits,
        amount: totalSMSUnits * 0.059, // For fallback calculation
        totalSMSUnits,
        recipientCount,
        smsCount,
      };
    } else {
      return {
        credits: 0,
        amount: totalSMSUnits * 0.059,
        totalSMSUnits,
        recipientCount,
        smsCount,
      };
    }
  };

  // Check if user has sufficient balance for selected billing mode
  const checkSufficientBalance = () => {
    // Return loading state if balance data is not yet available
    if (balanceLoading || walletBalanceLoading) {
      return { sufficient: true, mode: "loading", fallback: false };
    }

    const cost = calculateSMSCost();
    const userBalance = balanceData?.data?.balance || 0;
    const walletBalance = walletBalanceData?.data?.balance || 0;

    if (smsForm.billingMode === "credits") {
      // Check if user has enough credits, if not check wallet balance for fallback
      if (userBalance >= cost.credits) {
        return { sufficient: true, mode: "credits", fallback: false };
      } else if (walletBalance >= cost.amount) {
        return { sufficient: true, mode: "wallet", fallback: true };
      } else {
        return { sufficient: false, mode: "none", fallback: false };
      }
    } else {
      // Wallet mode - check wallet balance only
      return {
        sufficient: walletBalance >= cost.amount,
        mode: "wallet",
        fallback: false,
      };
    }
  };

  const validateForm = () => {
    if (!smsForm.senderId) {
      toast.error("Please select a sender ID");
      return false;
    }

    // Check recipients based on message type
    const hasDirectRecipients = smsForm.recipients.trim().length > 0;
    const hasSelectedGroups = smsForm.selectedGroups.length > 0;

    if (smsForm.messageType === "quick" && !hasDirectRecipients) {
      toast.error("Please enter recipient phone numbers");
      return false;
    }

    if (
      smsForm.messageType === "bulk" &&
      !hasDirectRecipients &&
      !hasSelectedGroups
    ) {
      toast.error(
        "Please select contact groups or enter recipient phone numbers"
      );
      return false;
    }

    if (!smsForm.message.trim()) {
      toast.error("Please enter a message");
      return false;
    }
    if (
      smsForm.isScheduled &&
      (!smsForm.scheduledDate || !smsForm.scheduledTime)
    ) {
      toast.error("Please select both date and time for scheduled messages");
      return false;
    }
    return true;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    await withErrorHandling(
      async () => {
        // Process recipients with delimiter and duplicate removal
        const recipients = processRecipients(
          smsForm.recipients,
          smsForm.delimiter,
          smsForm.removeDuplicates
        );

        // For quick SMS, we need direct recipients
        // For bulk SMS, we need either direct recipients or selected groups
        if (smsForm.messageType === "quick" && recipients.length === 0) {
          toast.error("No valid recipients found");
          return;
        }

        if (
          smsForm.messageType === "bulk" &&
          recipients.length === 0 &&
          smsForm.selectedGroups.length === 0
        ) {
          toast.error(
            "Please select contact groups or enter valid recipient phone numbers"
          );
          return;
        }

        const messageData = {
          content: smsForm.message, // Using 'content' to match Redux API expectations
          senderId: smsForm.senderId,
          recipientGroups:
            smsForm.messageType === "bulk" ? smsForm.selectedGroups : [],
          recipients: recipients, // Always include processed recipients for both quick and bulk
          isScheduled: smsForm.isScheduled,
          scheduledDate: smsForm.isScheduled
            ? `${smsForm.scheduledDate}T${smsForm.scheduledTime}:00.000Z`
            : undefined,
          billingMode: smsForm.billingMode, // Include billing mode preference
        };

        const result = await sendMessage(messageData).unwrap();

        // Reset form
        setSmsForm({
          senderId: "",
          messageType: "quick",
          recipients: "",
          message: "",
          isScheduled: false,
          scheduledDate: "",
          scheduledTime: "",
          selectedTemplate: "",
          templateVariables: {},
          selectedGroups: [],
          delimiter: "\\n",
          removeDuplicates: true,
          billingMode: "credits", // Reset to default
        });

        // Refresh messages list
        refetchMessages();

        // Switch to history tab to see the sent message
        setActiveTab("history");
      },
      {
        loadingMessage: smsForm.isScheduled
          ? "Scheduling message..."
          : "Sending message...",
        successMessage: smsForm.isScheduled
          ? "Message scheduled successfully!"
          : "Message sent successfully!",
        errorMessage: "Failed to send message",
        type: "action",
      }
    );
  };

  // Template management functions
  const handleCreateTemplate = async () => {
    await withErrorHandling(
      async () => {
        await createTemplate(templateForm).unwrap();
        setIsCreateTemplateModalOpen(false);
        setTemplateForm({
          name: "",
          content: "",
          category: "GENERAL",
          variables: [],
        });
      },
      {
        loadingMessage: "Creating template...",
        successMessage: "Template created successfully!",
        errorMessage: "Failed to create template",
        type: "action",
      }
    );
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    await withErrorHandling(
      async () => {
        await updateTemplate({
          id: editingTemplate.id,
          ...templateForm,
        }).unwrap();
        setEditingTemplate(null);
        setTemplateForm({
          name: "",
          content: "",
          category: "GENERAL",
          variables: [],
        });
      },
      {
        loadingMessage: "Updating template...",
        successMessage: "Template updated successfully!",
        errorMessage: "Failed to update template",
        type: "action",
      }
    );
  };

  const handleDeleteTemplate = async (templateId: string) => {
    await withErrorHandling(
      async () => {
        await deleteTemplate(templateId).unwrap();
      },
      {
        loadingMessage: "Deleting template...",
        successMessage: "Template deleted successfully!",
        errorMessage: "Failed to delete template",
        type: "action",
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      PENDING: "bg-yellow-100 text-yellow-800",
      SENT: "bg-blue-100 text-blue-800",
      DELIVERED: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          statusClasses[status as keyof typeof statusClasses] ||
          "bg-gray-100 text-gray-800"
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
              <p className="text-gray-600 mt-2">
                Send SMS messages and view your message history
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button className="flex items-center px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
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
                Send Message
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <motion.div variants={itemVariants}>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("send")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "send"
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Send Message
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "history"
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Message History
              </button>
              <button
                onClick={() => setActiveTab("scheduled")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "scheduled"
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Scheduled Messages
              </button>
              <button
                onClick={() => setActiveTab("templates")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "templates"
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Quick Templates
              </button>
            </nav>
          </div>
        </motion.div>

        {/* Send Message Tab */}
        {activeTab === "send" && (
          <motion.div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            variants={itemVariants}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Send New Message
            </h2>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sender ID
                  </label>
                  <div className="relative">
                    <select
                      value={smsForm.senderId}
                      onChange={(e) => {
                        if (e.target.value === "__add_new__") {
                          setIsSenderIdModalOpen(true);
                        } else {
                          handleFormChange("senderId", e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                      disabled={senderIdsLoading}
                    >
                      <option value="">
                        {senderIdsLoading ? "Loading..." : "Select Sender ID"}
                      </option>
                      {approvedSenderIds.map((senderId) => (
                        <option key={senderId} value={senderId}>
                          {senderId}
                        </option>
                      ))}
                      {!senderIdsLoading && (
                        <option
                          value="__add_new__"
                          className="text-primary-600 font-medium"
                        >
                          + Add New Sender ID
                        </option>
                      )}
                      {approvedSenderIds.length === 0 && !senderIdsLoading && (
                        <option value="" disabled>
                          No approved sender IDs found
                        </option>
                      )}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Type
                  </label>
                  <select
                    value={smsForm.messageType}
                    onChange={(e) =>
                      handleFormChange("messageType", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="quick">Quick SMS</option>
                    <option value="bulk">Bulk SMS</option>
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    {smsForm.messageType === "quick"
                      ? "Send to individual phone numbers with custom delimiters"
                      : "Send to contact groups for bulk messaging"}
                  </div>
                </div>

                {/* Billing Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Mode
                  </label>
                  <select
                    value={smsForm.billingMode}
                    onChange={(e) =>
                      handleFormChange("billingMode", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="credits">SMS Credits (Default)</option>
                    <option value="wallet">Wallet Balance</option>
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    {smsForm.billingMode === "credits"
                      ? "Use SMS credits first, fallback to wallet if insufficient"
                      : "Charge directly from wallet balance"}
                  </div>
                </div>
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Use Template (Optional)
                </label>
                <div className="flex space-x-2">
                  <select
                    value={smsForm.selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={templatesLoading}
                  >
                    <option value="">
                      {templatesLoading
                        ? "Loading templates..."
                        : "Select a template..."}
                    </option>
                    {templates?.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                    {templates?.length === 0 && !templatesLoading && (
                      <option value="" disabled>
                        No templates found
                      </option>
                    )}
                  </select>
                  {smsForm.selectedTemplate && (
                    <button
                      type="button"
                      onClick={clearTemplate}
                      className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Recipients Section */}
              {smsForm.messageType === "quick" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipients
                    </label>
                    <textarea
                      value={smsForm.recipients}
                      onChange={(e) =>
                        handleFormChange("recipients", e.target.value)
                      }
                      placeholder={`Enter phone numbers separated by ${
                        smsForm.delimiter === ","
                          ? "commas"
                          : smsForm.delimiter === ";"
                          ? "semicolons"
                          : smsForm.delimiter === "|"
                          ? "pipes"
                          : "newlines"
                      } (e.g., ${
                        smsForm.delimiter === "\\n"
                          ? "233201234567\n233207654321"
                          : `233201234567${smsForm.delimiter}233207654321`
                      })`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={4}
                      required
                    />
                  </div>

                  {/* Delimiter and Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delimiter
                      </label>
                      <select
                        value={smsForm.delimiter}
                        onChange={(e) =>
                          handleFormChange("delimiter", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value=",">Comma (,)</option>
                        <option value=";">Semicolon (;)</option>
                        <option value="|">Pipe (|)</option>
                        <option value="\\n">New Line</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id="removeDuplicates"
                        checked={smsForm.removeDuplicates}
                        onChange={(e) =>
                          handleFormChange("removeDuplicates", e.target.checked)
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label
                        htmlFor="removeDuplicates"
                        className="text-sm text-gray-700"
                      >
                        Remove duplicate numbers
                      </label>
                    </div>
                  </div>

                  {/* Recipients Summary */}
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Valid Recipients:</span>
                      <span className="font-medium text-green-600">
                        {getRecipientCount() - getInvalidNumbers().length}
                      </span>
                    </div>
                    {getInvalidNumbers().length > 0 && (
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-600">Invalid Numbers:</span>
                        <span className="font-medium text-red-600">
                          {getInvalidNumbers().length}
                        </span>
                      </div>
                    )}
                    {smsForm.removeDuplicates && smsForm.recipients && (
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-600">Original Count:</span>
                        <span className="text-gray-500">
                          {
                            processRecipients(
                              smsForm.recipients,
                              smsForm.delimiter,
                              false
                            ).length
                          }
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm mt-1 pt-1 border-t border-gray-200">
                      <span className="text-gray-600">Total Recipients:</span>
                      <span className="font-medium text-gray-900">
                        {getRecipientCount()}
                      </span>
                    </div>
                  </div>

                  {/* Invalid Numbers Warning */}
                  {getInvalidNumbers().length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
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
                            Invalid Phone Numbers Detected
                          </h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>The following numbers appear to be invalid:</p>
                            <ul className="list-disc list-inside mt-1 max-h-20 overflow-y-auto">
                              {getInvalidNumbers()
                                .slice(0, 5)
                                .map((num, index) => (
                                  <li key={index} className="font-mono text-xs">
                                    {num}
                                  </li>
                                ))}
                              {getInvalidNumbers().length > 5 && (
                                <li className="text-xs">
                                  ... and {getInvalidNumbers().length - 5} more
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Group Selection for Bulk Messages */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Contact Groups
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                      {contactGroupsLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <div
                              key={`group-skeleton-${index}`}
                              className="flex items-center space-x-2"
                            >
                              <LoadingSkeleton
                                variant="default"
                                className="w-4 h-4"
                              />
                              <LoadingSkeleton
                                variant="text"
                                className="w-32"
                              />
                            </div>
                          ))}
                        </div>
                      ) : contactGroups?.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-2">
                          No contact groups found
                        </div>
                      ) : (
                        contactGroups?.map((group) => (
                          <label
                            key={group.id}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              checked={
                                smsForm.selectedGroups?.includes(group.id) ||
                                false
                              }
                              onChange={(e) => {
                                const selectedGroups =
                                  smsForm.selectedGroups || [];
                                if (e.target.checked) {
                                  setSmsForm((prev) => ({
                                    ...prev,
                                    selectedGroups: [
                                      ...selectedGroups,
                                      group.id,
                                    ],
                                  }));
                                } else {
                                  setSmsForm((prev) => ({
                                    ...prev,
                                    selectedGroups: selectedGroups.filter(
                                      (id) => id !== group.id
                                    ),
                                  }));
                                }
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">
                              {group.name} ({group.contactCount || 0} contacts)
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recipients Section - Same as Quick SMS */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Recipients (Optional)
                      </label>
                      <textarea
                        value={smsForm.recipients}
                        onChange={(e) =>
                          handleFormChange("recipients", e.target.value)
                        }
                        placeholder={`Enter phone numbers separated by ${
                          smsForm.delimiter === ","
                            ? "commas"
                            : smsForm.delimiter === ";"
                            ? "semicolons"
                            : smsForm.delimiter === "|"
                            ? "pipes"
                            : "newlines"
                        } (e.g., ${
                          smsForm.delimiter === "\\n"
                            ? "233201234567\n233207654321"
                            : `233201234567${smsForm.delimiter}233207654321`
                        })`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows={4}
                      />
                    </div>

                    {/* Delimiter and Options - Same as Quick SMS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Delimiter
                        </label>
                        <select
                          value={smsForm.delimiter}
                          onChange={(e) =>
                            handleFormChange("delimiter", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value=",">Comma (,)</option>
                          <option value=";">Semicolon (;)</option>
                          <option value="|">Pipe (|)</option>
                          <option value="\\n">New Line</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-2 pt-6">
                        <input
                          type="checkbox"
                          id="bulk-remove-duplicates"
                          checked={smsForm.removeDuplicates}
                          onChange={(e) =>
                            handleFormChange(
                              "removeDuplicates",
                              e.target.checked
                            )
                          }
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label
                          htmlFor="bulk-remove-duplicates"
                          className="text-sm text-gray-700"
                        >
                          Remove duplicate numbers
                        </label>
                      </div>
                    </div>

                    {/* Recipient Statistics - Same as Quick SMS */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Valid Recipients:
                          </span>
                          <span className="text-green-600 font-medium">
                            {getRecipientCount() - getInvalidNumbers().length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Invalid Numbers:
                          </span>
                          <span className="text-red-600 font-medium">
                            {getInvalidNumbers().length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Original Count:</span>
                          <span className="text-gray-500">
                            {
                              processRecipients(
                                smsForm.recipients,
                                smsForm.delimiter,
                                false
                              ).length
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Total Recipients:
                          </span>
                          <span className="text-blue-600 font-medium">
                            {getRecipientCount()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Invalid Numbers Warning - Same as Quick SMS */}
                    {getInvalidNumbers().length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-red-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
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
                              Invalid Phone Numbers Detected
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                              <p>The following numbers appear to be invalid:</p>
                              <ul className="list-disc list-inside mt-1">
                                {getInvalidNumbers().map((num, index) => (
                                  <li key={index}>{num}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={smsForm.message}
                  onChange={(e) => handleFormChange("message", e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={4}
                  required
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>
                    Character count: {smsForm.message.length}/160 | SMS parts:{" "}
                    {Math.ceil(smsForm.message.length / 160) || 1}
                  </span>
                  <div className="text-right">
                    {(() => {
                      const cost = calculateSMSCost();
                      const balanceCheck = checkSufficientBalance();

                      return (
                        <div className="space-y-1">
                          <div className="text-primary-600 font-medium">
                            {smsForm.billingMode === "credits" ? (
                              <span>Est. Cost: {cost.credits} credits</span>
                            ) : (
                              <span>
                                Est. Cost: GH₵{cost.amount.toFixed(3)}
                              </span>
                            )}
                          </div>

                          {/* Balance Status */}
                          <div
                            className={`text-xs ${
                              balanceCheck.sufficient
                                ? balanceCheck.fallback
                                  ? "text-orange-600"
                                  : "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {balanceCheck.mode === "loading"
                              ? "⏳ Checking balance..."
                              : balanceCheck.sufficient
                              ? balanceCheck.fallback
                                ? "⚠️ Will use wallet (insufficient credits)"
                                : balanceCheck.mode === "credits"
                                ? "✅ Sufficient credits available"
                                : "✅ Sufficient wallet balance"
                              : "❌ Insufficient balance"}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Scheduling Options */}
              <div className="border-t pt-4">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="schedule-message"
                    checked={smsForm.isScheduled}
                    onChange={(e) =>
                      handleFormChange(
                        "isScheduled",
                        e.target.checked.toString()
                      )
                    }
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="schedule-message"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Schedule this message
                  </label>
                </div>

                {smsForm.isScheduled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={smsForm.scheduledDate}
                        onChange={(e) =>
                          handleFormChange("scheduledDate", e.target.value)
                        }
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required={smsForm.isScheduled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time
                      </label>
                      <input
                        type="time"
                        value={smsForm.scheduledTime}
                        onChange={(e) =>
                          handleFormChange("scheduledTime", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required={smsForm.isScheduled}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setSmsForm({
                      senderId: "",
                      messageType: "quick",
                      recipients: "",
                      message: "",
                      isScheduled: false,
                      scheduledDate: "",
                      scheduledTime: "",
                      selectedTemplate: "",
                      templateVariables: {},
                      selectedGroups: [],
                      delimiter: "\\n",
                      removeDuplicates: true,
                      billingMode: "credits",
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded-md focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    isSubmitting
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-primary-600 text-white hover:bg-primary-700"
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
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
                      {smsForm.isScheduled ? "Scheduling..." : "Sending..."}
                    </div>
                  ) : smsForm.isScheduled ? (
                    "Schedule Message"
                  ) : (
                    "Send Now"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Message History Tab */}
        {activeTab === "history" && (
          <motion.div variants={itemVariants}>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="SENT">Sent</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="FAILED">Failed</option>
                  </select>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Messages Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Message History
                </h2>
              </div>

              {isLoading ? (
                <div className="divide-y divide-gray-200">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={`skeleton-${index}`} className="px-6 py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <LoadingSkeleton
                            variant="text"
                            className="w-3/4 mb-2"
                          />
                          <LoadingSkeleton variant="text" className="w-1/2" />
                        </div>
                        <LoadingSkeleton variant="text" className="w-16" />
                        <LoadingSkeleton variant="text" className="w-20" />
                        <LoadingSkeleton variant="text" className="w-24" />
                        <LoadingSkeleton variant="text" className="w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-6 text-center text-red-600">
                  Error loading messages. Please try again.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Message
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recipients
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sent At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {messages.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <svg
                                className="w-12 h-12 text-gray-400 mb-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No messages found
                              </h3>
                              <p className="text-gray-500 mb-4">
                                {searchTerm || statusFilter !== "all"
                                  ? "Try adjusting your search or filters"
                                  : "Get started by sending your first message"}
                              </p>
                              {!searchTerm && statusFilter === "all" && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("send")}
                                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                                >
                                  Send Your First Message
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        messages.map((message: any) => (
                          <tr key={message.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate">
                                {message.message}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {message.recipients?.length || 0} recipient(s)
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(message.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                ₦{message.cost?.toFixed(2) || "0.00"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(message.sentAt).toLocaleDateString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(message.sentAt).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-primary-600 hover:text-primary-900">
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      messagesData?.total || 0
                    )}{" "}
                    of {messagesData?.total || 0} results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Scheduled Messages Tab */}
        {activeTab === "scheduled" && (
          <motion.div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            variants={itemVariants}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Scheduled Messages
            </h2>
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No scheduled messages
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by scheduling a message.
              </p>
            </div>
          </motion.div>
        )}

        {/* Template Management Tab */}
        {activeTab === "templates" && (
          <motion.div
            className="bg-white rounded-lg shadow-sm border border-gray-200"
            variants={itemVariants}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Message Templates
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Create and manage reusable message templates
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateTemplateModalOpen(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Create Template
                </button>
              </div>
            </div>

            {templatesLoading ? (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`template-skeleton-${index}`}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <LoadingSkeleton variant="text" className="w-3/4 mb-2" />
                      <LoadingSkeleton variant="text" className="w-full mb-2" />
                      <LoadingSkeleton variant="text" className="w-2/3 mb-4" />
                      <div className="flex justify-between">
                        <LoadingSkeleton variant="text" className="w-16" />
                        <LoadingSkeleton variant="text" className="w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : templates?.length === 0 ? (
              <div className="p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No templates found
                </h3>
                <p className="text-gray-500 mb-4">
                  Get started by creating your first message template
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateTemplateModalOpen(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Create Your First Template
                </button>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates?.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">
                          {template.name}
                        </h3>
                        <div className="flex space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSmsForm((prev) => ({
                                ...prev,
                                message: template.content,
                              }));
                              setActiveTab("send");
                            }}
                            className="text-primary-600 hover:text-primary-700 text-xs px-2 py-1 rounded"
                            title="Use template"
                          >
                            Use
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTemplate(template);
                              setTemplateForm({
                                name: template.name,
                                content: template.content,
                                category: template.category || "GENERAL",
                                variables: template.variables || [],
                              });
                            }}
                            className="text-gray-600 hover:text-gray-700 text-xs px-2 py-1 rounded"
                            title="Edit template"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600 hover:text-red-700 text-xs px-2 py-1 rounded"
                            title="Delete template"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                        {template.content}
                      </p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{template.content.length} characters</span>
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          {template.category || "GENERAL"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Template Creation/Edit Modal */}
        {(isCreateTemplateModalOpen || editingTemplate) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingTemplate ? "Edit Template" : "Create Template"}
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="GENERAL">General</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="NOTIFICATION">Notification</option>
                    <option value="REMINDER">Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Content
                  </label>
                  <textarea
                    value={templateForm.content}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={4}
                    placeholder="Enter your message template..."
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {templateForm.content.length} characters
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateTemplateModalOpen(false);
                    setEditingTemplate(null);
                    setTemplateForm({
                      name: "",
                      content: "",
                      category: "GENERAL",
                      variables: [],
                    });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={
                    editingTemplate
                      ? handleUpdateTemplate
                      : handleCreateTemplate
                  }
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  {editingTemplate ? "Update Template" : "Create Template"}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Sender ID Modal */}
      <SenderIdModal
        isOpen={isSenderIdModalOpen}
        onClose={() => setIsSenderIdModalOpen(false)}
        onSuccess={() => {
          // Refresh sender IDs after successful creation
          refetchSenderIds();
          toast.success("Sender ID request submitted successfully!");
        }}
      />
    </motion.div>
  );
}
