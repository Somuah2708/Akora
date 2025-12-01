import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

// Initialize Sentry - you'll need to create a project at sentry.io and get your DSN
export const initSentry = () => {
  Sentry.init({
    dsn: 'YOUR_SENTRY_DSN_HERE', // Replace with your actual Sentry DSN from sentry.io
    
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    
    // Enable native crash reporting
    enableNative: true,
    
    // Enable auto session tracking
    enableAutoSessionTracking: true,
    
    // Session timeout in seconds
    sessionTrackingIntervalMillis: 30000,
    
    // Add environment
    environment: __DEV__ ? 'development' : 'production',
    
    // Enable debug mode in development
    debug: __DEV__,
    
    // Attach stack traces to errors
    attachStacktrace: true,
    
    // Sample rate for error events (1.0 = 100%)
    sampleRate: 1.0,
    
    // Integrations
    integrations: [
      new Sentry.ReactNativeTracing({
        // Pass instrumentation to be used as `routingInstrumentation`
        routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
        
        // How long before a transaction is considered slow
        tracingOrigins: ['localhost', /^\//],
        
        // Enable HTTP tracking
        enableHTTPTracking: true,
      }),
    ],
    
    // Before sending error to Sentry, you can filter or modify it
    beforeSend(event, hint) {
      // Filter out errors in development if you want
      if (__DEV__) {
        console.log('Sentry Event:', event);
        console.log('Sentry Hint:', hint);
      }
      
      // Example: Don't send network errors in development
      // if (__DEV__ && event.exception?.values?.[0]?.type === 'NetworkError') {
      //   return null;
      // }
      
      return event;
    },
    
    // Before sending breadcrumb
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter sensitive data from breadcrumbs
      if (breadcrumb.category === 'console') {
        return breadcrumb;
      }
      return breadcrumb;
    },
  });
};

// Helper function to capture exceptions manually
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
};

// Helper function to capture messages
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

// Helper function to set user context
export const setUser = (user: { id: string; email?: string; username?: string } | null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
};

// Helper function to add breadcrumb
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};

// Helper function to set tag
export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

// Helper function to set context
export const setContext = (name: string, context: Record<string, any>) => {
  Sentry.setContext(name, context);
};

export default Sentry;
