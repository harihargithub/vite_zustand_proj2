// src/utils/honeypots.js
import { supabase } from '../store/supaStore';

/**
 * Honeypot system for detecting automated tools and bots
 * Sets traps that only automated tools would trigger
 */

/**
 * Check for honeypot violations in the request
 */
export const checkHoneypotViolations = async (requestData) => {
  const { endpoint, form_data, headers, query_params, method } = requestData;
  
  const violations = [];
  let suspiciousScore = 0;
  
  try {
    // 1. Check for trap URL access
    const trapViolation = checkTrapURLs(endpoint);
    if (trapViolation.violated) {
      violations.push(trapViolation);
      suspiciousScore += trapViolation.score;
    }
    
    // 2. Check hidden form fields
    const hiddenFieldViolation = checkHiddenFormFields(form_data);
    if (hiddenFieldViolation.violated) {
      violations.push(hiddenFieldViolation);
      suspiciousScore += hiddenFieldViolation.score;
    }
    
    // 3. Check JavaScript challenge
    const jsViolation = checkJavaScriptChallenge(headers, endpoint);
    if (jsViolation.violated) {
      violations.push(jsViolation);
      suspiciousScore += jsViolation.score;
    }
    
    // 4. Check for robots.txt violations
    const robotsViolation = checkRobotsViolations(endpoint);
    if (robotsViolation.violated) {
      violations.push(robotsViolation);
      suspiciousScore += robotsViolation.score;
    }
    
    // 5. Check timing patterns (too fast form submission)
    const timingViolation = checkFormTimingPatterns(requestData);
    if (timingViolation.violated) {
      violations.push(timingViolation);
      suspiciousScore += timingViolation.score;
    }
    
    // 6. Check for CSS-based traps
    const cssViolation = checkCSSTraps(form_data);
    if (cssViolation.violated) {
      violations.push(cssViolation);
      suspiciousScore += cssViolation.score;
    }

    return {
      violated: violations.length > 0,
      violations,
      score: Math.min(suspiciousScore, 100),
      details: {
        totalViolations: violations.length,
        endpoint,
        method,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Error checking honeypot violations:', error);
    return {
      violated: false,
      violations: [],
      score: 0,
      error: error.message
    };
  }
};

/**
 * Check if accessing trap URLs that should not be accessed by humans
 */
const checkTrapURLs = (endpoint) => {
  const trapURLs = [
    '/admin',
    '/admin/',
    '/admin-login',
    '/wp-admin',
    '/wp-login.php',
    '/administrator',
    '/phpmyadmin',
    '/mysql',
    '/database',
    '/api/internal',
    '/api/admin',
    '/api/secret',
    '/robots.txt.backup',
    '/sitemap.xml.backup',
    '/.env',
    '/.git',
    '/config.php',
    '/config.json',
    '/backup',
    '/test',
    '/dev',
    '/staging',
    '/hidden',
    '/secret',
    '/private',
    '/internal'
  ];
  
  const isTrapped = trapURLs.some(trapUrl => 
    endpoint.toLowerCase().includes(trapUrl.toLowerCase())
  );
  
  return {
    violated: isTrapped,
    type: 'TRAP_URL_ACCESS',
    score: isTrapped ? 80 : 0,
    details: {
      endpoint,
      message: isTrapped ? 'Accessed honeypot trap URL' : 'No trap URL violation'
    }
  };
};

/**
 * Check for hidden form fields that were filled (bots often fill all fields)
 */
const checkHiddenFormFields = (formData) => {
  if (!formData || typeof formData !== 'object') {
    return { violated: false, score: 0 };
  }
  
  // Common honeypot field names
  const honeypotFields = [
    'website',
    'url',
    'contact',
    'phone_number',
    'fax',
    'address_line_3',
    'middle_name_2',
    'company_website',
    'business_phone',
    'honeypot',
    'bot_trap',
    'hidden_field',
    'do_not_fill',
    'leave_empty',
    'spam_protection'
  ];
  
  const filledHoneypots = honeypotFields.filter(field => 
    formData[field] && formData[field].toString().trim() !== ''
  );
  
  return {
    violated: filledHoneypots.length > 0,
    type: 'HIDDEN_FIELD_FILLED',
    score: filledHoneypots.length * 40, // Each filled honeypot = 40 points
    details: {
      filledFields: filledHoneypots,
      message: filledHoneypots.length > 0 
        ? `Filled ${filledHoneypots.length} honeypot fields` 
        : 'No honeypot fields filled'
    }
  };
};

/**
 * Check JavaScript challenge - API requests should include JS execution proof
 */
const checkJavaScriptChallenge = (headers, endpoint) => {
  // Skip JS check for certain endpoints
  const skipJSCheck = [
    '/api/public',
    '/health',
    '/status',
    '/robots.txt',
    '/sitemap.xml'
  ];
  
  if (skipJSCheck.some(skip => endpoint.includes(skip))) {
    return { violated: false, score: 0 };
  }
  
  // Check for JavaScript challenge headers
  const hasJSChallenge = headers['x-js-challenge'] || 
                        headers['x-csrf-token'] ||
                        headers['x-requested-with'] === 'XMLHttpRequest';
  
  // API endpoints should have JS proof
  const isAPIEndpoint = endpoint.includes('/api/');
  const needsJSChallenge = isAPIEndpoint && !hasJSChallenge;
  
  return {
    violated: needsJSChallenge,
    type: 'MISSING_JS_CHALLENGE',
    score: needsJSChallenge ? 30 : 0,
    details: {
      endpoint,
      isAPIEndpoint,
      hasJSChallenge,
      message: needsJSChallenge 
        ? 'API request missing JavaScript challenge proof' 
        : 'JavaScript challenge check passed'
    }
  };
};

/**
 * Check for robots.txt violations
 */
const checkRobotsViolations = (endpoint) => {
  // URLs that should be disallowed in robots.txt
  const disallowedPaths = [
    '/admin',
    '/private',
    '/internal',
    '/api/admin',
    '/dashboard/bot-detection',
    '/dashboard/resource-distribution'
  ];
  
  const isDisallowed = disallowedPaths.some(path => 
    endpoint.toLowerCase().startsWith(path.toLowerCase())
  );
  
  return {
    violated: isDisallowed,
    type: 'ROBOTS_VIOLATION',
    score: isDisallowed ? 25 : 0,
    details: {
      endpoint,
      message: isDisallowed 
        ? 'Accessed path that should be disallowed by robots.txt' 
        : 'No robots.txt violation'
    }
  };
};

/**
 * Check form submission timing patterns
 */
const checkFormTimingPatterns = (requestData) => {
  const { form_data, timestamp, headers } = requestData;
  
  if (!form_data || !timestamp) {
    return { violated: false, score: 0 };
  }
  
  // Check if form was submitted too quickly (less than 2 seconds)
  const pageLoadTime = headers['x-page-load-time'];
  const formStartTime = headers['x-form-start-time'];
  
  let violations = [];
  let score = 0;
  
  if (pageLoadTime && formStartTime) {
    const submissionTime = new Date(timestamp).getTime();
    const startTime = parseInt(formStartTime);
    const timeDiff = submissionTime - startTime;
    
    // Too fast submission (less than 2 seconds)
    if (timeDiff < 2000) {
      violations.push('Form submitted too quickly');
      score += 35;
    }
    
    // Impossibly fast (less than 500ms)
    if (timeDiff < 500) {
      violations.push('Impossibly fast form submission');
      score += 45;
    }
  }
  
  return {
    violated: violations.length > 0,
    type: 'TIMING_VIOLATION',
    score,
    details: {
      violations,
      message: violations.length > 0 
        ? violations.join(', ') 
        : 'Form timing appears normal'
    }
  };
};

/**
 * Check CSS-based traps (invisible elements that were interacted with)
 */
const checkCSSTraps = (formData) => {
  if (!formData || typeof formData !== 'object') {
    return { violated: false, score: 0 };
  }
  
  // CSS trap fields (should be invisible and not filled)
  const cssTrapFields = [
    'css_hidden',
    'invisible_field',
    'display_none',
    'off_screen',
    'zero_opacity',
    'negative_tab_index'
  ];
  
  const triggeredTraps = cssTrapFields.filter(field => 
    formData[field] && formData[field].toString().trim() !== ''
  );
  
  return {
    violated: triggeredTraps.length > 0,
    type: 'CSS_TRAP_TRIGGERED',
    score: triggeredTraps.length * 50, // Each CSS trap = 50 points
    details: {
      triggeredTraps,
      message: triggeredTraps.length > 0 
        ? `Triggered ${triggeredTraps.length} CSS traps` 
        : 'No CSS traps triggered'
    }
  };
};

/**
 * Generate honeypot HTML for forms
 */
export const generateHoneypotHTML = () => {
  return `
    <!-- Honeypot fields - DO NOT REMOVE -->
    <div style="position: absolute; left: -9999px; visibility: hidden;" aria-hidden="true">
      <input type="text" name="website" placeholder="Website" tabindex="-1" autocomplete="off" />
      <input type="email" name="contact" placeholder="Contact Email" tabindex="-1" autocomplete="off" />
      <input type="tel" name="phone_number" placeholder="Phone" tabindex="-1" autocomplete="off" />
      <textarea name="message_backup" placeholder="Additional Message" tabindex="-1"></textarea>
    </div>
    
    <!-- CSS-based traps -->
    <style>
      .honeypot { 
        position: absolute !important; 
        left: -9999px !important; 
        visibility: hidden !important; 
        opacity: 0 !important; 
        display: none !important; 
      }
    </style>
    <input type="text" name="css_hidden" class="honeypot" />
    <input type="text" name="invisible_field" style="position: absolute; left: -9999px;" />
  `;
};

/**
 * Generate JavaScript challenge for forms
 */
export const generateJavaScriptChallenge = () => {
  return `
    <script>
      // Bot detection JavaScript challenge
      (function() {
        // Simple math challenge
        const challenge = Math.floor(Math.random() * 100) + 1;
        const result = challenge * 2 + 1;
        
        // Set challenge header for AJAX requests
        if (window.XMLHttpRequest) {
          const originalOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(method, url) {
            originalOpen.apply(this, arguments);
            this.setRequestHeader('X-JS-Challenge', btoa(result.toString()));
          };
        }
        
        // Set challenge for fetch requests
        if (window.fetch) {
          const originalFetch = window.fetch;
          window.fetch = function(url, options) {
            options = options || {};
            options.headers = options.headers || {};
            options.headers['X-JS-Challenge'] = btoa(result.toString());
            return originalFetch(url, options);
          };
        }
        
        // Store challenge for form submissions
        document.addEventListener('DOMContentLoaded', function() {
          const forms = document.querySelectorAll('form');
          forms.forEach(form => {
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'js_challenge';
            hiddenInput.value = btoa(result.toString());
            form.appendChild(hiddenInput);
          });
        });
      })();
    </script>
  `;
};

/**
 * Set up honeypot monitoring
 */
export const setupHoneypotMonitoring = async () => {
  try {
    // Log honeypot setup
    console.log('Honeypot monitoring initialized');
    
    // You could set up periodic cleanup here
    // or additional monitoring logic
    
    return { success: true, message: 'Honeypot monitoring active' };
  } catch (error) {
    console.error('Error setting up honeypot monitoring:', error);
    return { success: false, error: error.message };
  }
};

export default {
  checkHoneypotViolations,
  generateHoneypotHTML,
  generateJavaScriptChallenge,
  setupHoneypotMonitoring
};
