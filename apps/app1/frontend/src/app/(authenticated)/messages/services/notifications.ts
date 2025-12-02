// Notification and error handling utilities for message management

import toast from 'react-hot-toast';

// Success notifications
export const showSuccessNotification = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#10B981',
      color: '#fff',
      fontWeight: 'bold',
    },
  });
};

// Error notifications
export const showErrorNotification = (message: string) => {
  toast.error(message, {
    duration: 5000,
    position: 'top-right',
    style: {
      background: '#EF4444',
      color: '#fff',
      fontWeight: 'bold',
    },
  });
};

// Handle API errors
export const handleApiError = (error: any, defaultMessage: string = 'An error occurred') => {
  console.error(error);
  
  let errorMessage = defaultMessage;
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    if (error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else {
      errorMessage = `Error ${error.response.status}: ${defaultMessage}`;
    }
  } else if (error.request) {
    // The request was made but no response was received
    errorMessage = 'No response received from server. Please check your connection.';
  } else if (error.message) {
    // Something happened in setting up the request that triggered an Error
    errorMessage = error.message;
  }
  
  showErrorNotification(errorMessage);
  return errorMessage;
};

// Confirmation dialog
export const showConfirmDialog = (
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  if (window.confirm(message)) {
    onConfirm();
  } else if (onCancel) {
    onCancel();
  }
};
