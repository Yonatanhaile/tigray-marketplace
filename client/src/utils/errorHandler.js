import toast from 'react-hot-toast';

/**
 * Centralized error handler for API calls
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {boolean} showToast - Whether to show a toast notification
 */
export const handleApiError = (error, context = 'Operation', showToast = true) => {
  let errorMessage = 'An unexpected error occurred';
  let errorDetails = null;

  // Network errors
  if (!error.response) {
    if (error.message === 'Network Error') {
      errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      errorDetails = {
        type: 'NETWORK_ERROR',
        originalError: error.message
      };
    } else {
      errorMessage = error.message || errorMessage;
      errorDetails = {
        type: 'UNKNOWN_ERROR',
        originalError: error.message
      };
    }
  }
  // HTTP errors
  else {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        errorMessage = data?.message || 'Invalid request. Please check your input.';
        errorDetails = {
          type: 'BAD_REQUEST',
          status,
          data
        };
        break;
      
      case 401:
        errorMessage = 'Your session has expired. Please log in again.';
        errorDetails = {
          type: 'UNAUTHORIZED',
          status,
          data
        };
        // Redirect to login after a delay
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }, 2000);
        break;
      
      case 403:
        errorMessage = data?.message || 'You do not have permission to perform this action.';
        errorDetails = {
          type: 'FORBIDDEN',
          status,
          data
        };
        break;
      
      case 404:
        errorMessage = data?.message || 'The requested resource was not found.';
        errorDetails = {
          type: 'NOT_FOUND',
          status,
          data
        };
        break;
      
      case 429:
        errorMessage = data?.message || 'Too many requests. Please try again later.';
        errorDetails = {
          type: 'RATE_LIMIT',
          status,
          data
        };
        break;
      
      case 500:
        errorMessage = 'Server error. Our team has been notified.';
        errorDetails = {
          type: 'SERVER_ERROR',
          status,
          data
        };
        break;
      
      case 502:
      case 503:
      case 504:
        errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
        errorDetails = {
          type: 'SERVICE_UNAVAILABLE',
          status,
          data
        };
        break;
      
      default:
        errorMessage = data?.message || `${context} failed. Please try again.`;
        errorDetails = {
          type: 'HTTP_ERROR',
          status,
          data
        };
    }
  }

  // Log error details for debugging
  console.error(`[${context}] Error:`, {
    message: errorMessage,
    details: errorDetails,
    originalError: error
  });

  // Show toast notification
  if (showToast) {
    toast.error(errorMessage, {
      duration: 5000,
      position: 'top-right',
    });
  }

  return {
    message: errorMessage,
    details: errorDetails
  };
};

/**
 * Generic error handler for form submissions
 */
export const handleFormError = (error, fieldSetError) => {
  const errorData = error.response?.data;
  
  // Handle validation errors
  if (errorData?.errors && typeof errorData.errors === 'object') {
    Object.keys(errorData.errors).forEach(field => {
      if (fieldSetError) {
        fieldSetError(field, {
          type: 'server',
          message: errorData.errors[field]
        });
      }
    });
  }
  
  // Handle general error
  return handleApiError(error, 'Form submission');
};

/**
 * Retry logic for failed API calls
 */
export const retryApiCall = async (apiCall, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      
      // Wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error) => {
  return !error.response && error.message === 'Network Error';
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error) => {
  return error.response && (error.response.status === 401 || error.response.status === 403);
};

/**
 * Format error for display
 */
export const formatError = (error) => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

export default {
  handleApiError,
  handleFormError,
  retryApiCall,
  isNetworkError,
  isAuthError,
  formatError
};

