'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { MessageTemplate, ScheduledMessage, ContactGroup } from '@/redux/services/messagesApi';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: any, isScheduled: boolean) => Promise<void>;
  templates: MessageTemplate[];
  contactGroups: ContactGroup[];
  senderIds: string[];
  isLoading?: boolean;
}

export default function SendMessageModal({
  isOpen,
  onClose,
  onSend,
  templates,
  contactGroups,
  senderIds,
  isLoading = false
}: SendMessageModalProps) {
  // Form state
  const [content, setContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Scheduling options
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  
  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setSelectedTemplate('');
      setSelectedGroups([]);
      setSelectedSenderId(senderIds.length > 0 ? senderIds[0] : '');
      setIsScheduled(false);
      
      // Set default scheduled date to current time + 5 minutes
      const now = new Date();
      now.setMinutes(now.getMinutes() + 5);
      setScheduledDate(now.toISOString().slice(0, 16));
      
      setError(null);
    }
  }, [isOpen, senderIds]);
  
  // Apply template content when template is selected
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setContent(template.content);
      }
    }
  };
  
  // Toggle group selection
  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };
  
  // Form validation
  const validateForm = () => {
    if (!content.trim()) {
      setError('Message content is required');
      return false;
    }
    
    if (selectedGroups.length === 0) {
      setError('At least one contact group must be selected');
      return false;
    }
    
    if (!selectedSenderId) {
      setError('Sender ID is required');
      return false;
    }
    
    if (isScheduled && !scheduledDate) {
      setError('Scheduled date and time is required');
      return false;
    }
    
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const recipientCount = selectedGroups.reduce((count, groupId) => {
        const group = contactGroups.find(g => g.id === groupId);
        return count + (group?.contactCount || 0);
      }, 0);
      
      const messageData = {
        content: content.trim(),
        senderId: selectedSenderId,
        recipientGroups: selectedGroups,
        // Add scheduling information if needed
        ...(isScheduled && {
          scheduledFor: new Date(scheduledDate).toISOString()
        }),
        recipientCount
      };
      
      await onSend(messageData, isScheduled);
      onClose();
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Message" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {/* Sender ID selection */}
        <div>
          <label htmlFor="sender-id" className="block text-sm font-medium text-gray-700 mb-1">
            Sender ID
          </label>
          <select
            id="sender-id"
            value={selectedSenderId}
            onChange={(e) => setSelectedSenderId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          >
            {senderIds.length === 0 && <option value="">No sender IDs available</option>}
            {senderIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
        
        {/* Template selection */}
        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
            Message Template
          </label>
          <select
            id="template"
            value={selectedTemplate}
            onChange={handleTemplateChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">-- Select a template --</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
        </div>
        
        {/* Message content */}
        <div>
          <label htmlFor="message-content" className="block text-sm font-medium text-gray-700 mb-1">
            Message Content
          </label>
          <div className="mt-1">
            <textarea
              id="message-content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your message content here..."
              required
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Characters: {content.length} | Messages: {Math.ceil(content.length / 160)}
          </p>
        </div>
        
        {/* Contact groups selection */}
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Select Recipient Groups ({selectedGroups.length} selected)
          </span>
          <div className="mt-1 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
            {contactGroups.length === 0 ? (
              <p className="text-sm text-gray-500">No contact groups available</p>
            ) : (
              contactGroups.map(group => (
                <div key={group.id} className="flex items-center mb-1 last:mb-0">
                  <input
                    type="checkbox"
                    id={`group-${group.id}`}
                    checked={selectedGroups.includes(group.id)}
                    onChange={() => handleGroupToggle(group.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`group-${group.id}`} className="ml-2 text-sm text-gray-700">
                    {group.name} ({group.contactCount || 0} contacts)
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Schedule checkbox and datetime picker */}
        <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
          <input
            type="checkbox"
            id="schedule-checkbox"
            checked={isScheduled}
            onChange={() => setIsScheduled(!isScheduled)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="schedule-checkbox" className="text-sm text-gray-700">
            Schedule for later
          </label>
        </div>
        
        {/* Conditional datetime picker for scheduling */}
        {isScheduled && (
          <div>
            <label htmlFor="schedule-datetime" className="block text-sm font-medium text-gray-700 mb-1">
              Date and time to send
            </label>
            <input
              type="datetime-local"
              id="schedule-datetime"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
        )}
        
        {/* Form actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
          >
            {isSubmitting || isLoading ? 'Sending...' : isScheduled ? 'Schedule Message' : 'Send Now'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
