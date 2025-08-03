// src/hooks/useBotProtection.js
import { useEffect } from 'react';
import { useBotDetection } from '../components/BotDetectionProvider';

// Custom hook for protecting components with bot detection
export const useBotProtection = (options = {}) => {
  const {
    endpoint,
    method = 'GET',
    autoCheck = true,
    onBlocked = null,
    onSuspicious = null,
    enableToast = true
  } = options;

  const { checkRequest, isEnabled, getDetectionThresholds } = useBotDetection();

  useEffect(() => {
    if (autoCheck && isEnabled && endpoint) {
      performProtectionCheck();
    }
  }, [endpoint, autoCheck, isEnabled]);

  const performProtectionCheck = async () => {
    try {
      const result = await checkRequest(endpoint, method);
      
      if (!result.allowed) {
        handleBlocked(result);
        return false;
      }

      if (result.suspiciousScore >= getDetectionThresholds().suspiciousScore) {
        handleSuspicious(result);
      }

      return true;
    } catch (error) {
      console.error('Bot protection check failed:', error);
      return true; // Allow on error to prevent blocking legitimate users
    }
  };

  const handleBlocked = (result) => {
    if (enableToast) {
      console.warn('Bot Detection: Access denied. Suspicious activity detected.');
      // You can replace this with your toast component
      // Toast({ errorMessage: 'Access denied. Suspicious activity detected.', type: 'error' })
    }
    
    if (onBlocked) {
      onBlocked(result);
    } else {
      // Default action: redirect to home or show error page
      window.location.href = '/';
    }
  };

  const handleSuspicious = (result) => {
    if (enableToast) {
      console.warn('Bot Detection: Your activity is being monitored for security purposes.');
      // You can replace this with your toast component
      // Toast({ errorMessage: 'Your activity is being monitored for security purposes.', type: 'warning' })
    }
    
    if (onSuspicious) {
      onSuspicious(result);
    }
  };

  return {
    checkProtection: performProtectionCheck,
    isProtectionEnabled: isEnabled
  };
};

// Hook for protecting API calls
export const useApiProtection = () => {
  const { checkRequest, isEnabled } = useBotDetection();

  const protectedFetch = async (url, options = {}) => {
    if (!isEnabled) {
      return fetch(url, options);
    }

    try {
      // Extract endpoint from URL
      const urlObj = new URL(url, window.location.origin);
      const endpoint = urlObj.pathname;
      const method = options.method || 'GET';

      // Check if request is allowed
      const protectionResult = await checkRequest(endpoint, method);
      
      if (!protectionResult.allowed) {
        throw new Error(`Request blocked: ${protectionResult.reason}`);
      }

      // Add bot detection headers
      const enhancedOptions = {
        ...options,
        headers: {
          ...options.headers,
          'X-Bot-Detection-Score': protectionResult.suspiciousScore || 0,
          'X-Request-ID': generateRequestId()
        }
      };

      return fetch(url, enhancedOptions);
    } catch (error) {
      console.error('Protected fetch error:', error);
      throw error;
    }
  };

  const generateRequestId = () => {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  };

  return { protectedFetch };
};

// Hook for form protection
export const useFormProtection = (formType = 'general') => {
  const { checkRequest } = useBotDetection();

  const protectFormSubmission = async (formData, endpoint) => {
    try {
      // Additional form-specific checks
      const formChecks = {
        honeypot: checkHoneypot(formData),
        timing: checkFormTiming(),
        fields: checkFieldPatterns(formData)
      };

      // Check with bot detection
      const protectionResult = await checkRequest(endpoint, 'POST', {
        formType,
        formChecks
      });

      if (!protectionResult.allowed) {
        return {
          success: false,
          reason: protectionResult.reason,
          message: getBlockMessage(protectionResult.reason)
        };
      }

      return {
        success: true,
        protectionData: protectionResult
      };
    } catch (error) {
      console.error('Form protection error:', error);
      return {
        success: true, // Allow on error
        error: error.message
      };
    }
  };

  const checkHoneypot = (formData) => {
    // Check for hidden honeypot fields that should remain empty
    const honeypotFields = ['website', 'url', 'phone2', 'fax'];
    return honeypotFields.some(field => formData[field] && formData[field].trim() !== '');
  };

  const checkFormTiming = () => {
    // Check if form was filled too quickly (indicates bot)
    const formStartTime = window.formStartTime || Date.now();
    const fillTime = Date.now() - formStartTime;
    const minimumTime = 2000; // 2 seconds minimum
    
    return fillTime < minimumTime;
  };

  const checkFieldPatterns = (formData) => {
    let suspiciousPatterns = 0;
    
    Object.values(formData).forEach(value => {
      if (typeof value === 'string') {
        // Check for suspicious patterns
        if (value.includes('http://') || value.includes('https://')) {
          suspiciousPatterns++;
        }
        if (value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)?.length > 1) {
          suspiciousPatterns++;
        }
        if (value.length > 1000) {
          suspiciousPatterns++;
        }
      }
    });

    return suspiciousPatterns > 0;
  };

  const getBlockMessage = (reason) => {
    const messages = {
      'rate_limit_exceeded': 'Too many requests. Please wait and try again.',
      'suspicious_behavior': 'Suspicious activity detected. Please try again later.',
      'proxy_detected': 'Proxy usage detected. Please use a direct connection.',
      'bot_detected': 'Automated behavior detected. Please verify you are human.',
      'high_risk_score': 'Security check failed. Please contact support if you believe this is an error.'
    };

    return messages[reason] || 'Access denied for security reasons.';
  };

  return {
    protectFormSubmission,
    initFormTiming: () => { window.formStartTime = Date.now(); }
  };
};

export default useBotProtection;
