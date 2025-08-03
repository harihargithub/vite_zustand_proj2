// src/utils/rateLimiting.js
import { supabase } from '../store/supaStore';

// Rate limiting configurations
const RATE_LIMITS = {
  global: { requests: 1000, window: 60 * 60 * 1000 }, // 1000 requests per hour
  perIP: { requests: 100, window: 60 * 60 * 1000 },   // 100 requests per hour per IP
  perUser: { requests: 200, window: 60 * 60 * 1000 }, // 200 requests per hour per user
  api: { requests: 50, window: 60 * 60 * 1000 },      // 50 API requests per hour per IP
  auth: { requests: 10, window: 15 * 60 * 1000 },     // 10 auth attempts per 15 minutes
  sensitive: { requests: 5, window: 60 * 60 * 1000 }  // 5 sensitive operations per hour
};

// Sliding window rate limiter using Supabase
export const checkRateLimit = async (identifier, limitType = 'perIP', customLimit = null) => {
  try {
    const limit = customLimit || RATE_LIMITS[limitType];
    if (!limit) {
      throw new Error(`Unknown rate limit type: ${limitType}`);
    }

    const windowStart = new Date(Date.now() - limit.window);
    
    // Count requests in the current window
    const { count, error } = await supabase
      .from('request_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', identifier)
      .gte('timestamp', windowStart.toISOString());

    if (error) {
      console.error('Rate limit check error:', error);
      return {
        allowed: true, // Allow on error to prevent blocking legitimate users
        remaining: limit.requests,
        resetTime: new Date(Date.now() + limit.window),
        error: error.message
      };
    }

    const requestCount = count || 0;
    const remaining = Math.max(0, limit.requests - requestCount);
    const allowed = requestCount < limit.requests;

    return {
      allowed,
      requestCount,
      remaining,
      limit: limit.requests,
      resetTime: new Date(Date.now() + limit.window),
      windowMs: limit.window
    };

  } catch (error) {
    console.error('Rate limiting error:', error);
    return {
      allowed: true,
      remaining: 1,
      resetTime: new Date(),
      error: error.message
    };
  }
};

// Enhanced rate limiter with burst protection
export const checkBurstRateLimit = async (identifier, endpoint) => {
  try {
    // Different limits for different endpoints
    const endpointLimits = {
      '/api/auth/login': { requests: 5, window: 15 * 60 * 1000 },
      '/api/auth/register': { requests: 3, window: 60 * 60 * 1000 },
      '/api/auth/reset-password': { requests: 3, window: 60 * 60 * 1000 },
      '/api/products': { requests: 100, window: 60 * 60 * 1000 },
      '/api/admin': { requests: 20, window: 60 * 60 * 1000 }
    };

    // Find matching endpoint limit
    const matchingEndpoint = Object.keys(endpointLimits).find(ep => 
      endpoint.includes(ep)
    );

    const limit = matchingEndpoint ? 
      endpointLimits[matchingEndpoint] : 
      RATE_LIMITS.perIP;

    // Check multiple time windows for burst detection
    const windows = [
      { duration: 60 * 1000, threshold: Math.ceil(limit.requests * 0.1) },      // 1 minute
      { duration: 5 * 60 * 1000, threshold: Math.ceil(limit.requests * 0.3) },  // 5 minutes
      { duration: limit.window, threshold: limit.requests }                      // Full window
    ];

    for (const window of windows) {
      const windowStart = new Date(Date.now() - window.duration);
      
      const { count } = await supabase
        .from('request_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', identifier)
        .eq('endpoint', endpoint)
        .gte('timestamp', windowStart.toISOString());

      if (count >= window.threshold) {
        return {
          allowed: false,
          reason: 'burst_limit_exceeded',
          windowMs: window.duration,
          requestCount: count,
          threshold: window.threshold,
          resetTime: new Date(Date.now() + window.duration)
        };
      }
    }

    return {
      allowed: true,
      reason: 'within_limits'
    };

  } catch (error) {
    console.error('Burst rate limit check error:', error);
    return {
      allowed: true,
      reason: 'error',
      error: error.message
    };
  }
};

// Adaptive rate limiting based on suspicious behavior
export const checkAdaptiveRateLimit = async (identifier, suspiciousScore = 0) => {
  try {
    // Adjust limits based on suspicious score
    let adjustmentFactor = 1;
    
    if (suspiciousScore >= 80) {
      adjustmentFactor = 0.1; // Very restrictive
    } else if (suspiciousScore >= 60) {
      adjustmentFactor = 0.3; // Restrictive
    } else if (suspiciousScore >= 40) {
      adjustmentFactor = 0.5; // Moderately restrictive
    } else if (suspiciousScore >= 20) {
      adjustmentFactor = 0.7; // Slightly restrictive
    }

    const adaptiveLimit = {
      requests: Math.ceil(RATE_LIMITS.perIP.requests * adjustmentFactor),
      window: RATE_LIMITS.perIP.window
    };

    return await checkRateLimit(identifier, 'perIP', adaptiveLimit);

  } catch (error) {
    console.error('Adaptive rate limit error:', error);
    return {
      allowed: true,
      error: error.message
    };
  }
};

// Check if IP should be temporarily blocked
export const checkTempBlock = async (identifier) => {
  try {
    // Check for recent high-severity violations
    const recentViolations = await supabase
      .from('request_tracking')
      .select('suspicious_score, timestamp')
      .eq('ip_address', identifier)
      .gte('suspicious_score', 80)
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (!recentViolations.data || recentViolations.data.length === 0) {
      return { blocked: false };
    }

    const violations = recentViolations.data;
    
    // Temporary block rules
    if (violations.length >= 5) {
      // 5+ high-severity violations in 1 hour = 24-hour block
      return {
        blocked: true,
        reason: 'multiple_high_severity_violations',
        blockUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        violationCount: violations.length
      };
    }

    if (violations.length >= 3) {
      // 3+ high-severity violations in 1 hour = 1-hour block
      return {
        blocked: true,
        reason: 'repeated_high_severity_violations',
        blockUntil: new Date(Date.now() + 60 * 60 * 1000),
        violationCount: violations.length
      };
    }

    return { blocked: false };

  } catch (error) {
    console.error('Temp block check error:', error);
    return { blocked: false, error: error.message };
  }
};

// Get rate limiting headers for HTTP responses
export const getRateLimitHeaders = (rateLimitResult) => {
  if (!rateLimitResult) return {};

  return {
    'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '0',
    'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
    'X-RateLimit-Reset': rateLimitResult.resetTime ? 
      Math.ceil(rateLimitResult.resetTime.getTime() / 1000).toString() : '0',
    'X-RateLimit-Window': rateLimitResult.windowMs ? 
      (rateLimitResult.windowMs / 1000).toString() : '0'
  };
};

// Clean up old rate limiting data
export const cleanupOldRateLimitData = async () => {
  try {
    // Remove records older than 7 days
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { error } = await supabase
      .from('request_tracking')
      .delete()
      .lt('timestamp', cutoffDate.toISOString());

    if (error) {
      console.error('Rate limit cleanup error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error) {
    console.error('Rate limit cleanup error:', error);
    return { success: false, error: error.message };
  }
};

// Get rate limiting statistics
export const getRateLimitStats = async (timeRange = '24h') => {
  try {
    const timeRanges = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 24 * 7
    };

    const hours = timeRanges[timeRange] || 24;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get request counts by IP
    const { data: ipStats } = await supabase
      .from('request_tracking')
      .select('ip_address, endpoint')
      .gte('timestamp', startTime.toISOString());

    if (!ipStats) return null;

    // Calculate statistics
    const ipCounts = {};
    const endpointCounts = {};
    
    ipStats.forEach(req => {
      ipCounts[req.ip_address] = (ipCounts[req.ip_address] || 0) + 1;
      endpointCounts[req.endpoint] = (endpointCounts[req.endpoint] || 0) + 1;
    });

    const totalRequests = ipStats.length;
    const uniqueIPs = Object.keys(ipCounts).length;
    const avgRequestsPerIP = totalRequests / Math.max(uniqueIPs, 1);

    // Find top IPs by request count
    const topIPs = Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // Find rate limit violations
    const violations = topIPs.filter(({ count }) => 
      count > RATE_LIMITS.perIP.requests * (hours / (RATE_LIMITS.perIP.window / (60 * 60 * 1000)))
    );

    return {
      timeRange,
      totalRequests,
      uniqueIPs,
      avgRequestsPerIP: Math.round(avgRequestsPerIP * 100) / 100,
      topIPs,
      violations: violations.length,
      violatingIPs: violations
    };

  } catch (error) {
    console.error('Rate limit stats error:', error);
    return null;
  }
};

export {
  RATE_LIMITS
};
