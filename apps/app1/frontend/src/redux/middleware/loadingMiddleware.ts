import { Middleware } from '@reduxjs/toolkit';
import { isRejectedWithValue } from '@reduxjs/toolkit';

// Define loading action types
export const LOADING_START = 'loading/start';
export const LOADING_END = 'loading/end';
export const LOADING_ERROR = 'loading/error';

// Loading action creators
export const startLoading = (operation: string, message?: string) => ({
  type: LOADING_START,
  payload: { operation, message },
});

export const endLoading = (operation: string) => ({
  type: LOADING_END,
  payload: { operation },
});

export const errorLoading = (operation: string, error: string) => ({
  type: LOADING_ERROR,
  payload: { operation, error },
});

// Middleware to automatically handle loading states for RTK Query
export const loadingMiddleware: Middleware = (store) => (next) => (action) => {
  // Handle RTK Query pending actions
  if (action.type.endsWith('/pending')) {
    const operation = action.type.replace('/pending', '');
    const message = getLoadingMessage(operation);
    
    // Dispatch loading start action
    store.dispatch(startLoading(operation, message));
  }
  
  // Handle RTK Query fulfilled actions
  if (action.type.endsWith('/fulfilled')) {
    const operation = action.type.replace('/fulfilled', '');
    store.dispatch(endLoading(operation));
  }
  
  // Handle RTK Query rejected actions
  if (action.type.endsWith('/rejected')) {
    const operation = action.type.replace('/rejected', '');
    const errorMessage = action.payload?.message || 'An error occurred';
    store.dispatch(errorLoading(operation, errorMessage));
  }

  return next(action);
};

// Helper function to get appropriate loading messages
function getLoadingMessage(operation: string): string {
  const messages: Record<string, string> = {
    // Contact operations
    'messagesApi/executeQuery(getContacts)': 'Loading contacts...',
    'messagesApi/executeMutation(createContact)': 'Creating contact...',
    'messagesApi/executeMutation(updateContact)': 'Updating contact...',
    'messagesApi/executeMutation(deleteContact)': 'Deleting contact...',
    'messagesApi/executeMutation(importContactsCsv)': 'Importing contacts...',
    'messagesApi/executeMutation(bulkImportContacts)': 'Processing bulk import...',
    
    // Contact group operations
    'messagesApi/executeQuery(getContactGroups)': 'Loading contact groups...',
    'messagesApi/executeMutation(createContactGroup)': 'Creating group...',
    'messagesApi/executeMutation(updateContactGroup)': 'Updating group...',
    'messagesApi/executeMutation(deleteContactGroup)': 'Deleting group...',
    
    // Message operations
    'messagesApi/executeQuery(getMessages)': 'Loading messages...',
    'messagesApi/executeMutation(sendMessage)': 'Sending message...',
    'messagesApi/executeMutation(createMessageTemplate)': 'Creating template...',
    'messagesApi/executeMutation(updateMessageTemplate)': 'Updating template...',
    'messagesApi/executeMutation(deleteMessageTemplate)': 'Deleting template...',
    
    // Scheduled message operations
    'messagesApi/executeQuery(getScheduledMessages)': 'Loading scheduled messages...',
    'messagesApi/executeMutation(createScheduledMessage)': 'Scheduling message...',
    'messagesApi/executeMutation(updateScheduledMessage)': 'Updating scheduled message...',
    'messagesApi/executeMutation(deleteScheduledMessage)': 'Deleting scheduled message...',
    
    // Default fallback
    default: 'Loading...',
  };

  return messages[operation] || messages.default;
}

// Loading state slice
interface LoadingState {
  operations: Record<string, {
    isLoading: boolean;
    message?: string;
    error?: string;
  }>;
  globalLoading: boolean;
}

const initialState: LoadingState = {
  operations: {},
  globalLoading: false,
};

// Loading reducer
export const loadingReducer = (state = initialState, action: any): LoadingState => {
  switch (action.type) {
    case LOADING_START:
      return {
        ...state,
        operations: {
          ...state.operations,
          [action.payload.operation]: {
            isLoading: true,
            message: action.payload.message,
            error: undefined,
          },
        },
        globalLoading: true,
      };
      
    case LOADING_END:
      const { [action.payload.operation]: removed, ...remainingOperations } = state.operations;
      return {
        ...state,
        operations: remainingOperations,
        globalLoading: Object.keys(remainingOperations).length > 0,
      };
      
    case LOADING_ERROR:
      return {
        ...state,
        operations: {
          ...state.operations,
          [action.payload.operation]: {
            isLoading: false,
            error: action.payload.error,
          },
        },
        globalLoading: Object.keys(state.operations).filter(
          key => key !== action.payload.operation && state.operations[key].isLoading
        ).length > 0,
      };
      
    default:
      return state;
  }
};

// Selectors
export const selectIsLoading = (state: { loading: LoadingState }) => state.loading.globalLoading;
export const selectOperationLoading = (operation: string) => (state: { loading: LoadingState }) => 
  state.loading.operations[operation]?.isLoading || false;
export const selectOperationError = (operation: string) => (state: { loading: LoadingState }) => 
  state.loading.operations[operation]?.error;
export const selectLoadingMessage = (state: { loading: LoadingState }) => {
  const operations = Object.values(state.loading.operations);
  const loadingOperation = operations.find(op => op.isLoading);
  return loadingOperation?.message || 'Loading...';
};
