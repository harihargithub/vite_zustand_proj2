// src/components/BotDetectionProvider.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { detectBot } from '../middleware/botDetection';
import { supabase } from '../store/supaStore';

const BotDetectionContext = createContext();

export const useBotDetection = () => {
  const context = useContext(BotDetectionContext);
  if (!context) {
    throw new Error('useBotDetection must be used within BotDetectionProvider');
  }
  return context;
};

export const BotDetectionProvider = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [detectionLevel, setDetectionLevel] = useState('medium'); // low, medium, high, critical
  const [stats, setStats] = useState({
    requestsToday: 0,
    blockedToday: 0,
    suspiciousToday: 0,
    proxyDetected: 0
  });

  useEffect(() => {
    if (isEnabled) {
      initializeBotDetection();
      loadTodayStats();
    }
  }, [isEnabled]);

  const initializeBotDetection = () => {
    // Set up real-time monitoring
    const subscription = supabase
      .channel('bot_detection_monitoring')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'request_tracking' },
        (payload) => {
          handleNewRequest(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleNewRequest = (requestData) => {
    // Update real-time stats
    setStats(prev => ({
      ...prev,
      requestsToday: prev.requestsToday + 1,
      ...(requestData.blocked && { blockedToday: prev.blockedToday + 1 }),
      ...(requestData.suspicious_score >= 50 && { suspiciousToday: prev.suspiciousToday + 1 }),
      ...(requestData.is_proxy && { proxyDetected: prev.proxyDetected + 1 })
    }));
  };

  const loadTodayStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayRequests } = await supabase
        .from('request_tracking')
        .select('blocked, suspicious_score, is_proxy')
        .gte('timestamp', today.toISOString());

      if (todayRequests) {
        const requestsToday = todayRequests.length;
        const blockedToday = todayRequests.filter(r => r.blocked).length;
        const suspiciousToday = todayRequests.filter(r => r.suspicious_score >= 50).length;
        const proxyDetected = todayRequests.filter(r => r.is_proxy).length;

        setStats({
          requestsToday,
          blockedToday,
          suspiciousToday,
          proxyDetected
        });
      }
    } catch (error) {
      console.error('Error loading bot detection stats:', error);
    }
  };

  // Main detection function to be called on each request
  const performDetection = async (requestData) => {
    if (!isEnabled) {
      return {
        allowed: true,
        reason: 'detection_disabled'
      };
    }

    try {
      const result = await detectBot(requestData, {
        level: detectionLevel,
        enableRealTimeBlocking: true
      });

      return result;
    } catch (error) {
      console.error('Bot detection error:', error);
      return {
        allowed: true,
        reason: 'detection_error',
        error: error.message
      };
    }
  };

  // Check if request should be allowed
  const checkRequest = async (endpoint, method = 'GET', additionalData = {}) => {
    const requestData = {
      endpoint,
      method,
      ip_address: await getCurrentIP(),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      headers: {
        'accept-language': navigator.language,
        'user-agent': navigator.userAgent
      },
      ...additionalData
    };

    return await performDetection(requestData);
  };

  // Get current user's IP (you might need to implement this differently)
  const getCurrentIP = async () => {
    try {
      // This is a simple way to get IP, you might want to use a more reliable service
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  // Configure detection settings
  const configureDetection = (settings) => {
    if (settings.enabled !== undefined) {
      setIsEnabled(settings.enabled);
    }
    if (settings.level !== undefined) {
      setDetectionLevel(settings.level);
    }
  };

  // Get detection thresholds based on level
  const getDetectionThresholds = () => {
    const thresholds = {
      low: {
        suspiciousScore: 80,
        blockScore: 90,
        rateLimit: 200
      },
      medium: {
        suspiciousScore: 60,
        blockScore: 80,
        rateLimit: 100
      },
      high: {
        suspiciousScore: 40,
        blockScore: 60,
        rateLimit: 50
      },
      critical: {
        suspiciousScore: 20,
        blockScore: 40,
        rateLimit: 20
      }
    };

    return thresholds[detectionLevel] || thresholds.medium;
  };

  const value = {
    isEnabled,
    detectionLevel,
    stats,
    performDetection,
    checkRequest,
    configureDetection,
    getDetectionThresholds,
    loadTodayStats
  };

  return (
    <BotDetectionContext.Provider value={value}>
      {children}
    </BotDetectionContext.Provider>
  );
};

export default BotDetectionProvider;
