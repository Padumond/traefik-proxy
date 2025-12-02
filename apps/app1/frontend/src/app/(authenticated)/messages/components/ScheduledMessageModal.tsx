'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useGetMessageTemplatesQuery, useCreateScheduledMessageMutation, useUpdateScheduledMessageMutation, ScheduledMessage } from '@/redux/services/messagesApi';

interface ScheduledMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (message: ScheduledMessage) => void;
  scheduledMessage?: ScheduledMessage;
  mode: 'create' | 'edit' | 'view';
}

export default function ScheduledMessageModal({
  isOpen,
  onClose,
  onSave,
  scheduledMessage,
  mode
}: ScheduledMessageModalProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [senderId, setSenderId] = useState('');
  const [recipientCount, setRecipientCount] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Format date for input field
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
  };

  useEffect(() => {
    if (scheduledMessage) {
      setName(scheduledMessage.name);
      setContent(scheduledMessage.content);
      setScheduledFor(formatDateForInput(scheduledMessage.scheduledFor));
      setSenderId(scheduledMessage.senderId);
      setRecipientCount(scheduledMessage.recipientCount);
    } else {
      setName('');
      setContent('');
      setScheduledFor(formatDateForInput(new Date(Date.now() + 3600000).toISOString())); // Default to 1 hour from now
      setSenderId('');
      setRecipientCount(0);
    }
    setSelectedTemplate('');
    setError(null);
  }, [scheduledMessage, isOpen]);

  // RTK Query hooks
  const { data: templates = [], isLoading: isLoadingTemplates } = useGetMessageTemplatesQuery();
  const [createScheduledMessage, { isLoading: isCreating }] = useCreateScheduledMessageMutation();
  const [updateScheduledMessage, { isLoading: isUpdating }] = useUpdateScheduledMessageMutation();

  const isLoading = isCreating || isUpdating || isLoadingTemplates;

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;

    const template = templates.find((t: any) => t.id === selectedTemplate);
    if (template) {
      setContent(template.content);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Message name is required');
      return;
    }

    if (!content.trim()) {
      setError('Message content is required');
      return;
    }

    // Check if scheduled time is in the future
    const scheduledTime = new Date(scheduledFor).getTime();
    const currentTime = Date.now();

    if (scheduledTime <= currentTime) {
      setError('Scheduled time must be in the future');
      return;
    }

    const messageData = {
      name: name.trim(),
      content: content.trim(),
      scheduledFor: new Date(scheduledFor).toISOString(),
      senderId: senderId || undefined,
      recipients: [], // This would need to be populated with actual recipients
      recipientCount: recipientCount || 0
    };

    try {
      let result;

      if (mode === 'create') {
        result = await createScheduledMessage(messageData).unwrap();
      } else if (mode === 'edit' && scheduledMessage?.id) {
        result = await updateScheduledMessage({ id: scheduledMessage.id, message: messageData }).unwrap();
      }

      const updatedMessage: ScheduledMessage = {
        id: result?.id || scheduledMessage?.id || `schedule-${Date.now()}`,
        name,
        content,
        scheduledFor: new Date(scheduledFor).toISOString(),
        senderId,
        status: result?.status || 'SCHEDULED',
        recipientCount: recipientCount || 0,
        createdAt: result?.createdAt || scheduledMessage?.createdAt || new Date().toISOString(),
        updatedAt: result?.updatedAt || new Date().toISOString()
      };

      onSave(updatedMessage);
      onClose();
    } catch (err) {
      console.error('Failed to save scheduled message:', err);
      setError('Failed to save scheduled message. Please try again.');
    }
  };

  const modalTitle = {
    'create': 'Schedule New Message',
    'edit': 'Edit Scheduled Message',
    'view': 'View Scheduled Message'
  }[mode];

  const isViewOnly = mode === 'view';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="message-name" className="block text-sm font-medium text-gray-700 mb-1">
            Message Name
          </label>
          <input
            type="text"
            id="message-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isViewOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., Monthly Newsletter"
          />
        </div>

        {!isViewOnly && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Template</label>
              <div className="flex gap-2">
                <select
                  id="template-select"
                  aria-label="Select message template"
                  className="flex-grow p-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 bg-white dark:bg-gray-800"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  disabled={mode === 'view' || isLoadingTemplates}
                >
                  <option value="">Select a template...</option>
                  {templates.map((template: any) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="message-content" className="block text-sm font-medium text-gray-700 mb-1">
            Message Content
          </label>
          <div className="mt-1">
            <textarea
              id="message-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isViewOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your message content here."
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {content.length} characters
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="scheduled-for" className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Date & Time
            </label>
            <input
              type="datetime-local"
              id="scheduled-for"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              disabled={isViewOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="sender-id" className="block text-sm font-medium text-gray-700 mb-1">
              Sender ID
            </label>
            <input
              type="text"
              id="sender-id"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              disabled={isViewOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., COMPANY"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="recipient-count" className="block text-sm font-medium text-gray-700 mb-1">
            Number of Recipients
          </label>
          <input
            type="number"
            id="recipient-count"
            value={recipientCount}
            onChange={(e) => setRecipientCount(parseInt(e.target.value) || 0)}
            disabled={isViewOnly}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          
          {!isViewOnly && (
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {mode === 'create' ? 'Schedule Message' : 'Save Changes'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
