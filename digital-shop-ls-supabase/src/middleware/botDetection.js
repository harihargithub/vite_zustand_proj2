// src/middleware/botDetection.js
import { supabase } from '../store/supaStore';
import { detectProxy } from '../utils/proxyDetection';
import { analyzeBehavioralPatterns } from '../utils/behavioralAnalysis';
import { generateFingerprint } from '../utils/fingerprinting';
import { checkHoneypotViolations } from '../utils/honeypots';

export class BotDetectionMiddleware {
  constructor() {
    this.suspiciousThreshold = 70;
    this.blockThreshold = 90;
  }

  async trackRequest(requestData) {
    const startTime = Date.now();
    
    try {
      // Extract request information
      const {
        ip_address,
        user_agent,
        endpoint,
        method,
        headers,
        user_id,
        referer
      } = requestData;

      // Generate fingerprint
      const fingerprint = generateFingerprint({ headers, ip_address });

      // Calculate suspicious score
      const suspiciousScore = await this.calculateSuspiciousScore({
        ip_address,
        user_agent,
        endpoint,
        method,
        headers,
        fingerprint
      });

      // Track the request in database
      const { data: requestRecord, error } = await supabase
        .from('request_tracking')
        .insert({
          ip_address,
          user_agent,
          endpoint,
          method,
          user_id: user_id || null,
          referer,
          suspicious_score: suspiciousScore,
          fingerprint_hash: fingerprint,
          headers_fingerprint: JSON.stringify(headers),
          response_time: Date.now() - startTime,
          status_code: 200,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error tracking request:', error);
        return { allowed: true, score: 0 };
      }

      // Check if request should be blocked
      const shouldBlock = suspiciousScore >= this.blockThreshold;
      const shouldChallenge = suspiciousScore >= this.suspiciousThreshold;

      // Auto-block if necessary
      if (shouldBlock) {
        await this.autoBlockIP(ip_address, suspiciousScore);
      }

      return {
        allowed: !shouldBlock,
        needsChallenge: shouldChallenge && !shouldBlock,
        score: suspiciousScore,
        requestId: requestRecord.id,
        recommendation: this.getRecommendation(suspiciousScore)
      };

    } catch (error) {
      console.error('Bot detection error:', error);
      return { allowed: true, score: 0, error: error.message };
    }
  }

  async calculateSuspiciousScore(requestData) {
    let totalScore = 0;
    const weights = {
      userAgent: 0.2,
      proxy: 0.25,
      behavioral: 0.3,
      honeypot: 0.15,
      frequency: 0.1
    };

    try {
      // 1. User Agent Analysis
      const userAgentScore = this.analyzeUserAgent(requestData.user_agent);
      totalScore += userAgentScore * weights.userAgent;

      // 2. Proxy Detection
      const proxyResult = await detectProxy(requestData);
      const proxyScore = proxyResult.isProxy ? proxyResult.confidence : 0;
      totalScore += proxyScore * weights.proxy;

      // 3. Behavioral Analysis
      const behavioralResult = await analyzeBehavioralPatterns(requestData);
      const behavioralScore = behavioralResult.suspicious ? behavioralResult.score : 0;
      totalScore += behavioralScore * weights.behavioral;

      // 4. Honeypot Check
      const honeypotResult = await checkHoneypotViolations(requestData);
      const honeypotScore = honeypotResult.violated ? honeypotResult.score : 0;
      totalScore += honeypotScore * weights.honeypot;

      // 5. Request Frequency
      const frequencyScore = await this.checkRequestFrequency(requestData.ip_address);
      totalScore += frequencyScore * weights.frequency;

      return Math.min(Math.round(totalScore), 100);

    } catch (error) {
      console.error('Error calculating suspicious score:', error);
      return 0;
    }
  }

  analyzeUserAgent(userAgent) {
    if (!userAgent) return 50;

    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /requests/i,
      /scrapy/i, /selenium/i, /headless/i
    ];

    const humanPatterns = [
      /mozilla/i, /chrome/i, /firefox/i, /safari/i,
      /edge/i, /opera/i
    ];

    let score = 0;

    // Check for suspicious patterns
    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      score += 60;
    }

    // Check for human patterns
    if (!humanPatterns.some(pattern => pattern.test(userAgent))) {
      score += 30;
    }

    // Check for unusual user agent length
    if (userAgent.length < 20 || userAgent.length > 500) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  async checkRequestFrequency(ipAddress) {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      
      const { data: recentRequests, error } = await supabase
        .from('request_tracking')
        .select('id')
        .eq('ip_address', ipAddress)
        .gte('timestamp', oneMinuteAgo);

      if (error) return 0;

      const requestCount = recentRequests?.length || 0;

      // Score based on request frequency
      if (requestCount > 60) return 100; // More than 1 req/sec
      if (requestCount > 30) return 70;  // More than 0.5 req/sec
      if (requestCount > 10) return 40;  // More than 1 req/6sec
      
      return 0;

    } catch (error) {
      console.error('Error checking request frequency:', error);
      return 0;
    }
  }

  async autoBlockIP(ipAddress, score) {
    try {
      // Check if already blocked
      const { data: existing } = await supabase
        .from('blocked_ips')
        .select('id')
        .eq('ip_address', ipAddress)
        .single();

      if (!existing) {
        await supabase.from('blocked_ips').insert({
          ip_address: ipAddress,
          blocked_at: new Date().toISOString(),
          reason: `Auto-blocked: Suspicious score ${score}`,
          auto_blocked: true,
          confidence_score: score
        });

        console.log(`Auto-blocked IP: ${ipAddress} (Score: ${score})`);
      }
    } catch (error) {
      console.error('Error auto-blocking IP:', error);
    }
  }

  getRecommendation(score) {
    if (score >= 90) return 'BLOCK_IMMEDIATELY';
    if (score >= 70) return 'REQUIRE_CAPTCHA';
    if (score >= 50) return 'RATE_LIMIT_STRICT';
    if (score >= 30) return 'MONITOR_CLOSELY';
    return 'ALLOW_NORMAL';
  }
}

// Export singleton instance
export const botDetection = new BotDetectionMiddleware();

// Convenience function for one-off bot detection
export const detectBot = async (requestData) => {
  return await botDetection.detectBot(requestData);
};

// React Hook for easy integration
export const useBotDetection = () => {
  const trackPageView = async (additionalData = {}) => {
    const requestData = {
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
      endpoint: window.location.pathname,
      method: 'GET',
      headers: {
        'user-agent': navigator.userAgent,
        'accept-language': navigator.language,
        'referer': document.referrer
      },
      referer: document.referrer,
      ...additionalData
    };

    return await botDetection.trackRequest(requestData);
  };

  return { trackPageView };
};

// Utility function to get client IP (simplified)
async function getClientIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return '127.0.0.1'; // Fallback
  }
}
