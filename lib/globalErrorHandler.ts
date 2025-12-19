import { Platform } from 'react-native';

/**
 * Global Error Handlers
 * Catches all unhandled errors, promise rejections, and console errors
 * Logs them to the console for debugging
 */

let isInitialized = false;

export const setupGlobalErrorHandlers = () => {
  if (isInitialized) {
    console.log('⚠️ Global error handlers already initialized');
    return;
  }

  console.log('🛡️ Setting up global error handlers...');

  // 1. Catch all unhandled JavaScript errors
  const originalErrorHandler = (global as any).ErrorUtils?.getGlobalHandler();
  
  (global as any).ErrorUtils?.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error('💥 Global Error Handler:', error);
    console.error('💥 Error details:', {
      isFatal,
      type: 'Global Error Handler',
      platform: Platform.OS,
    });

    // Call original handler to maintain default behavior
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });

  // 2. Catch unhandled promise rejections
  const rejectionTracking = require('promise/setimmediate/rejection-tracking');
  rejectionTracking.enable({
    allRejections: true,
    onUnhandled: (id: string, error: Error) => {
      console.error('❌ Unhandled Promise Rejection:', error);
      console.error('❌ Rejection details:', {
        type: 'Unhandled Promise Rejection',
        platform: Platform.OS,
        rejectionId: id,
      });
    },
    onHandled: () => {
      // Promise rejection was handled later
    },
  });

  // 3. Track network errors
  const originalFetch = (global as any).fetch;
  (global as any).fetch = async (...args: any[]) => {
    const startTime = Date.now();
    
    try {
      const response = await originalFetch(...args);
      const duration = Date.now() - startTime;
      
      // Log failed requests
      if (!response.ok) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as any)?.url;
        console.warn(`🌐 HTTP ${response.status}: ${url} (${duration}ms)`);
        
        // Log 5xx errors more prominently
        if (response.status >= 500) {
          console.error(`🌐 Server Error: ${url}`, {
            status: response.status,
            statusText: response.statusText,
            duration,
          });
        }
      }
      
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as any)?.url;
      
      // Filter out abort errors - these are intentional cancellations
      if (error?.name === 'AbortError' || error?.message?.includes('Aborted')) {
        console.log('🌐 Fetch aborted (intentional):', url);
        throw error;
      }
      
      console.error('🌐 Network Error:', error);
      console.error('🌐 Network Error details:', {
        url,
        duration,
        type: 'Network Error',
      });
      
      throw error;
    }
  };

  isInitialized = true;
  console.log('✅ Global error handlers initialized');
};

// Helper to manually report errors (just logs to console now)
export const reportError = (
  error: Error | string,
  context?: Record<string, any>,
  level: 'fatal' | 'error' | 'warning' | 'info' = 'error'
) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  const logMethod = level === 'info' ? console.info : 
                    level === 'warning' ? console.warn : 
                    console.error;
  
  logMethod('📤 Error reported:', errorObj, context);
};

// Helper to add debugging breadcrumbs (just logs to console now)
export const addDebugBreadcrumb = (
  message: string,
  data?: Record<string, any>
) => {
  console.log('🍞 Debug breadcrumb:', message, data);
};
