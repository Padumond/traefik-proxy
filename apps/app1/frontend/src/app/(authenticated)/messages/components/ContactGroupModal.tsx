'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { 
  useCreateContactGroupMutation, 
  useUpdateContactGroupMutation,
  useGetContactsQuery,
  ContactGroup,
  Contact
} from '@/redux/services/messagesApi';

interface ContactGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: ContactGroup) => void;
  group?: ContactGroup;
  mode: 'create' | 'edit' | 'view';
}

export default function ContactGroupModal({
  isOpen,
  onClose,
  onSave,
  group,
  mode
}: ContactGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description);
      
      // If group has contacts property with contact IDs
      if (group.contacts) {
        setSelectedContacts(group.contacts.map((contact: any) => contact.id));
      } else {
        setSelectedContacts([]);
      }
    } else {
      setName('');
      setDescription('');
      setSelectedContacts([]);
    }
    setError(null);
  }, [group, isOpen]);

  // RTK Query hooks
  const [createGroup, { isLoading: isCreating }] = useCreateContactGroupMutation();
  const [updateGroup, { isLoading: isUpdating }] = useUpdateContactGroupMutation();
  const { data: contacts = [], isLoading: isLoadingContacts, error: contactsError } = useGetContactsQuery();
  
  const isLoading = isCreating || isUpdating;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    
    const groupData = {
      name: name.trim(),
      description: description.trim() || undefined
    };
    
    try {
      let result;
      
      if (mode === 'create') {
        result = await createGroup(groupData).unwrap();
      } else if (mode === 'edit' && group?.id) {
        result = await updateGroup({ id: group.id, group: groupData }).unwrap();
      }
      
      const updatedGroup: ContactGroup = {
        id: result?.id || group?.id || `group-${Date.now()}`,
        name,
        description,
        createdAt: result?.createdAt || group?.createdAt || new Date().toISOString(),
        updatedAt: result?.updatedAt || new Date().toISOString(),
        contactCount: result?.contactCount || selectedContacts.length
      };
      
      onSave(updatedGroup);
      onClose();
    } catch (err) {
      console.error('Failed to save contact group:', err);
      setError('Failed to save contact group. Please try again.');
    }
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const modalTitle = {
    'create': 'Create Contact Group',
    'edit': 'Edit Contact Group',
    'view': 'View Contact Group'
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
          <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-1">
            Group Name
          </label>
          <input
            type="text"
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isViewOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., Customers"
          />
        </div>
        
        <div>
          <label htmlFor="group-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="group-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isViewOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Describe the purpose of this contact group"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contacts ({selectedContacts.length} selected)
          </label>
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <div className="max-h-60 overflow-y-auto p-2 space-y-1">
              {isLoadingContacts ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading contacts...</p>
                </div>
              ) : contactsError ? (
                <div className="text-center py-4 text-sm text-red-500">
                  Error loading contacts. Please try again.
                </div>
              ) : contacts.length > 0 ? (
                contacts.map(contact => (
                  <div 
                    key={contact.id} 
                    className="flex items-center p-2 hover:bg-gray-50 rounded-md"
                  >
                    <input
                      type="checkbox"
                      id={`contact-${contact.id}`}
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                      disabled={isViewOnly}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label 
                      htmlFor={`contact-${contact.id}`}
                      className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      <div>{contact.name}</div>
                      <div className="text-xs text-gray-500">{contact.phoneNumber}</div>
                    </label>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-gray-500">
                  No contacts available
                </div>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {isViewOnly ? 
              `This group has ${selectedContacts.length} contacts.` : 
              'Select contacts to include in this group.'}
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
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {mode === 'create' ? 'Create Group' : 'Save Changes'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
