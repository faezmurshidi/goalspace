/**
 * Analytics destination options
 */
type AnalyticsOptions = {
  path?: string
  analyticsId?: string
  debug?: boolean
}

/**
 * Web Vitals metric type
 */
type WebVitalsMetric = {
  name: string
  value: number
  delta: number
  id: string
}

/**
 * Send metrics to your analytics service
 * Replace with your actual analytics implementation
 */
function sendToAnalytics(metric: WebVitalsMetric, options: AnalyticsOptions = {}) {
  const { name, value, id, delta } = metric
  const { path, debug = false } = options
  
  if (debug) {
    // Log to console in development/debugging
    console.log(`[Web Vitals]`, {
      name,
      value,
      id,
      delta,
      path: path || window.location.pathname,
    })
  }
  
  // Example: Send to Google Analytics 4
  // if (window.gtag && options.analyticsId) {
  //   window.gtag('event', name, {
  //     value: Math.round(name === 'CLS' ? value * 1000 : value),
  //     event_category: 'Web Vitals',
  //     event_label: id,
  //     non_interaction: true,
  //   })
  // }
  
  // TODO: Add your actual analytics service implementation here
}

/**
 * Initialize Web Vitals reporting
 */
export function initWebVitals(options: AnalyticsOptions = {}) {
  try {
    // Use dynamic import for better code splitting
    import('web-vitals').then((webVitals) => {
      // Get all the necessary metrics from the module
      const { onCLS, onFID, onLCP, onTTFB, onFCP } = webVitals;
      
      // Core Web Vitals
      onCLS((metric) => sendToAnalytics(metric as WebVitalsMetric, options));
      onFID((metric) => sendToAnalytics(metric as WebVitalsMetric, options));
      onLCP((metric) => sendToAnalytics(metric as WebVitalsMetric, options));
      
      // Additional metrics
      onTTFB((metric) => sendToAnalytics(metric as WebVitalsMetric, options));
      onFCP((metric) => sendToAnalytics(metric as WebVitalsMetric, options));
    });
  } catch (err) {
    console.error('[Web Vitals] Error initializing metrics:', err);
  }
} 