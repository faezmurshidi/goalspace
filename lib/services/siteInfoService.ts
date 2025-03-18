/**
 * Site Information Service
 * 
 * Collects non-sensitive information about the user's device, browser,
 * and preferences to enhance the user experience.
 */

export interface SiteInfo {
  // Basic device info
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenSize: { width: number; height: number };
  browserInfo: { name: string; version: string };
  
  // Time context
  visitTime: Date;
  timezone: string;
  
  // Language
  preferredLanguage: string;
  
  // Session context
  referrer: string;
  entryPath: string;
  
  // Connection (basic)
  connectionType?: string;
  connectionEffectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
}

/**
 * Detects the user's device type based on screen width and user agent
 */
export function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'; // Default for SSR
  
  // Check for mobile-specific user agent patterns
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(userAgent.substr(0, 4))) {
    // Check tablet vs phone based on screen width
    return window.innerWidth >= 768 ? 'tablet' : 'mobile';
  }
  
  // Check for tablet-specific dimensions
  if (window.innerWidth >= 768 && window.innerWidth <= 1024) {
    return 'tablet';
  }
  
  return 'desktop';
}

/**
 * Detects the user's browser name and version
 */
export function detectBrowser(): { name: string; version: string } {
  if (typeof window === 'undefined') {
    return { name: 'unknown', version: 'unknown' };
  }

  const userAgent = navigator.userAgent;
  let browserName = 'unknown';
  let browserVersion = 'unknown';

  // Chrome
  if (/Chrome/.test(userAgent) && !/Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
    browserName = 'Chrome';
    browserVersion = userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1] || '';
  }
  // Firefox
  else if (/Firefox/.test(userAgent)) {
    browserName = 'Firefox';
    browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] || '';
  }
  // Safari
  else if (/Safari/.test(userAgent) && !/Chrome|Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
    browserName = 'Safari';
    browserVersion = userAgent.match(/Version\/(\d+\.\d+)/)?.[1] || '';
  }
  // Edge
  else if (/Edge|Edg/.test(userAgent)) {
    browserName = 'Edge';
    browserVersion = userAgent.match(/Edge\/(\d+\.\d+)|Edg\/(\d+\.\d+)/)?.[1] || '';
  }
  // Opera
  else if (/OPR|Opera/.test(userAgent)) {
    browserName = 'Opera';
    browserVersion = userAgent.match(/OPR\/(\d+\.\d+)|Opera\/(\d+\.\d+)/)?.[1] || '';
  }

  return { name: browserName, version: browserVersion };
}

/**
 * Gets connection type if available
 */
export function getConnectionType(): string | undefined {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const conn = (navigator as any).connection;
    return conn?.type;
  }
  return undefined;
}

/**
 * Gets effective connection type if available
 */
export function getConnectionEffectiveType(): '4g' | '3g' | '2g' | 'slow-2g' | undefined {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const conn = (navigator as any).connection;
    return conn?.effectiveType;
  }
  return undefined;
}

/**
 * Collects all available site information
 */
export function collectSiteInfo(): SiteInfo {
  if (typeof window === 'undefined') {
    // Provide default values for SSR
    return {
      deviceType: 'desktop',
      screenSize: { width: 1920, height: 1080 },
      browserInfo: { name: 'unknown', version: 'unknown' },
      visitTime: new Date(),
      timezone: 'UTC',
      preferredLanguage: 'en',
      referrer: '',
      entryPath: '/',
    };
  }
  
  // Device detection
  const deviceType = detectDeviceType();
  
  // Browser detection
  const browserInfo = detectBrowser();
  
  return {
    // Device info
    deviceType,
    screenSize: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    browserInfo,
    
    // Time context
    visitTime: new Date(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    
    // Language preferences
    preferredLanguage: navigator.language || 'en',
    
    // Session context
    referrer: document.referrer,
    entryPath: window.location.pathname,
    
    // Network (if available)
    connectionType: getConnectionType(),
    connectionEffectiveType: getConnectionEffectiveType()
  };
}