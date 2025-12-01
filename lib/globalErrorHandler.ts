import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

/**
 * Global Error Handlers
 * Catches all unhandled errors, promise rejections, and console errors
 * Reports everything to Sentry automatically
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
    
    // Report to Sentry with context
    Sentry.captureException(error, {
      contexts: {
        error: {
          isFatal,
          type: 'Global Error Handler',
          platform: Platform.OS,
        },
      },
      level: isFatal ? 'fatal' : 'error',
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
      
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      Sentry.captureException(errorObj, {
        contexts: {
          error: {
            type: 'Unhandled Promise Rejection',
            platform: Platform.OS,
            rejectionId: id,
          },
        },
        level: 'error',
      });
    },
    onHandled: () => {
      // Promise rejection was handled later
    },
  });

  // 3. Intercept console.error to catch all logged errors
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    // Call original console.error to maintain logging
    originalConsoleError(...args);
    
    // Check if this is an error object or error message
    const firstArg = args[0];
    let error: Error;
    
    if (firstArg instanceof Error) {
      error = firstArg;
    } else if (typeof firstArg === 'string') {
      // Check if it looks like a common error pattern
      if (
        firstArg.includes('Error:') ||
        firstArg.includes('Warning:') ||
        firstArg.includes('Failed') ||
        firstArg.includes('Exception') ||
        firstArg.includes('undefined') ||
        firstArg.includes('null')
      ) {
        error = new Error(firstArg);
        // Attach additional args as context
        if (args.length > 1) {
          (error as any).context = args.slice(1);
        }
      } else {
        // Skip non-error console.error calls
        return;
      }
    } else {
      return; // Skip non-error calls
    }
    
    // Add breadcrumb for debugging
    Sentry.addBreadcrumb({
      category: 'console',
      message: args.map(arg => String(arg)).join(' '),
      level: 'error',
    });
    
    // Report to Sentry
    Sentry.captureException(error, {
      contexts: {
        console: {
          args: args.map(arg => String(arg)),
          type: 'console.error intercept',
        },
      },
      level: 'warning', // Lower severity since it's just console.error
    });
  };

  // 4. Intercept console.warn for warnings
  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    originalConsoleWarn(...args);
    
    // Add breadcrumb for warnings
    Sentry.addBreadcrumb({
      category: 'console',
      message: args.map(arg => String(arg)).join(' '),
      level: 'warning',
    });
  };

  // 5. Track network errors
  const originalFetch = global.fetch;
  global.fetch = async (...args: Parameters<typeof fetch>) => {
    const startTime = Date.now();
    
    try {
      const response = await originalFetch(...args);
      const duration = Date.now() - startTime;
      
      // Log failed requests
      if (!response.ok) {
        const url = typeof args[0] === 'string' ? args[0] : args[0].url;
        
        Sentry.addBreadcrumb({
          category: 'http',
          message: `HTTP ${response.status}: ${url}`,
          level: 'warning',
          data: {
            url,
            status: response.status,
            statusText: response.statusText,
            duration,
          },
        });
        
        // Report 5xx errors to Sentry
        if (response.status >= 500) {
          Sentry.captureMessage(`Server Error: ${url}`, {
            level: 'error',
            contexts: {
              http: {
                url,
                status: response.status,
                statusText: response.statusText,
                duration,
              },
            },
          });
        }
      }
      
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      
      // Filter out abort errors - these are intentional cancellations
      if (error?.name === 'AbortError' || error?.message?.includes('Aborted')) {
        console.log('🌐 Fetch aborted (intentional):', url);
        throw error;
      }
      
      console.error('🌐 Network Error:', error);
      
      Sentry.captureException(error as Error, {
        contexts: {
          http: {
            url,
            duration,
            type: 'Network Error',
          },
        },
        level: 'error',
      });
      
      throw error;
    }
  };

  isInitialized = true;
  console.log('✅ Global error handlers initialized');
};

// Helper to manually report errors
export const reportError = (
  error: Error | string,
  context?: Record<string, any>,
  level: 'fatal' | 'error' | 'warning' | 'info' = 'error'
) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  Sentry.captureException(errorObj, {
    contexts: context ? { custom: context } : undefined,
    level,
  });
  
  console.error('📤 Reported to Sentry:', errorObj);
};

// Helper to add debugging breadcrumbs
export const addDebugBreadcrumb = (
  message: string,
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    category: 'debug',
    message,
    level: 'info',
    data,
  });
};
