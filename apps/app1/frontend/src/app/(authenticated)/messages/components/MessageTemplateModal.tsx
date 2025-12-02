'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { MessageTemplate } from '@/redux/services/messagesApi';

interface MessageTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: MessageTemplate) => void;
  template?: MessageTemplate;
  mode: 'create' | 'edit' | 'view';
}

export default function MessageTemplateModal({
  isOpen,
  onClose,
  onSave,
  template,
  mode
}: MessageTemplateModalProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
    } else {
      setName('');
      setContent('');
    }
    setError(null);
  }, [template, isOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }
    
    if (!content.trim()) {
      setError('Template content is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const templateData: Partial<MessageTemplate> = {
        name: name.trim(),
        content: content.trim(),
        id: template?.id // Include ID if editing existing template
      };
      
      // Let parent component handle the API call
      await onSave(templateData as MessageTemplate);
      // Parent component will close modal after successful save
    } catch (err) {
      console.error('Failed to save template:', err);
      setError('Failed to save template. Please try again.');
      setIsSubmitting(false); // Only reset if there's an error
    }
  };

  const modalTitle = {
    'create': 'Create Message Template',
    'edit': 'Edit Message Template',
    'view': 'View Message Template'
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
          <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 mb-1">
            Template Name
          </label>
          <input
            type="text"
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isViewOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., Welcome Message"
          />
        </div>
        
        <div>
          <label htmlFor="template-content" className="block text-sm font-medium text-gray-700 mb-1">
            Template Content
          </label>
          <div className="mt-1">
            <textarea
              id="template-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isViewOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your message template content here. You can use placeholders like {{name}} or {{date}}."
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Use placeholders like <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{'{{name}}'}</code> for dynamic content.
          </p>
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
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {mode === 'create' ? 'Create Template' : 'Save Changes'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
