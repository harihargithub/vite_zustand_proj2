// src/utils/behavioralAnalysis.js
import { supabase } from '../store/supaStore';

export const analyzeBehavior = async (requestData) => {
  const { ip_address, user_agent, endpoint, method, user_id } = requestData;
  
  try {
    const behaviorScore = await calculateBehaviorScore({
      ip_address,
      user_agent,
      endpoint,
      method,
      user_id
    });

    return {
      suspiciousScore: behaviorScore.totalScore,
      patterns: behaviorScore.patterns,
      recommendations: generateRecommendations(behaviorScore),
      riskLevel: determineRiskLevel(behaviorScore.totalScore)
    };

  } catch (error) {
    console.error('Behavioral analysis error:', error);
    return {
      suspiciousScore: 0,
      patterns: [],
      recommendations: [],
      riskLevel: 'unknown',
      error: error.message
    };
  }
};

const calculateBehaviorScore = async (data) => {
  const patterns = [];
  let totalScore = 0;

  // 1. Request frequency analysis
  const frequencyAnalysis = await analyzeRequestFrequency(data);
  totalScore += frequencyAnalysis.score;
  if (frequencyAnalysis.suspicious) {
    patterns.push({
      type: 'high_frequency',
      score: frequencyAnalysis.score,
      details: frequencyAnalysis.details
    });
  }

  // 2. User agent consistency
  const uaAnalysis = await analyzeUserAgentConsistency(data);
  totalScore += uaAnalysis.score;
  if (uaAnalysis.suspicious) {
    patterns.push({
      type: 'user_agent_inconsistency',
      score: uaAnalysis.score,
      details: uaAnalysis.details
    });
  }

  // 3. Sequential pattern detection
  const sequentialAnalysis = await analyzeSequentialPatterns(data);
  totalScore += sequentialAnalysis.score;
  if (sequentialAnalysis.suspicious) {
    patterns.push({
      type: 'sequential_patterns',
      score: sequentialAnalysis.score,
      details: sequentialAnalysis.details
    });
  }

  // 4. Time-based analysis
  const timeAnalysis = await analyzeTimePatterns(data);
  totalScore += timeAnalysis.score;
  if (timeAnalysis.suspicious) {
    patterns.push({
      type: 'time_patterns',
      score: timeAnalysis.score,
      details: timeAnalysis.details
    });
  }

  // 5. Endpoint targeting analysis
  const endpointAnalysis = await analyzeEndpointTargeting(data);
  totalScore += endpointAnalysis.score;
  if (endpointAnalysis.suspicious) {
    patterns.push({
      type: 'endpoint_targeting',
      score: endpointAnalysis.score,
      details: endpointAnalysis.details
    });
  }

  // 6. Geographic anomaly detection
  const geoAnalysis = await analyzeGeographicAnomalies(data);
  totalScore += geoAnalysis.score;
  if (geoAnalysis.suspicious) {
    patterns.push({
      type: 'geographic_anomaly',
      score: geoAnalysis.score,
      details: geoAnalysis.details
    });
  }

  return {
    totalScore: Math.min(totalScore, 100),
    patterns
  };
};

const analyzeRequestFrequency = async ({ ip_address, user_id }) => {
  try {
    const timeWindows = [
      { minutes: 1, threshold: 10 },
      { minutes: 5, threshold: 30 },
      { minutes: 15, threshold: 100 },
      { minutes: 60, threshold: 200 }
    ];

    let maxScore = 0;
    let suspiciousWindow = null;

    for (const window of timeWindows) {
      const startTime = new Date(Date.now() - window.minutes * 60 * 1000);
      
      const { count } = await supabase
        .from('request_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip_address)
        .gte('timestamp', startTime.toISOString());

      if (count > window.threshold) {
        const score = Math.min(((count / window.threshold) - 1) * 50, 80);
        if (score > maxScore) {
          maxScore = score;
          suspiciousWindow = {
            minutes: window.minutes,
            requests: count,
            threshold: window.threshold,
            ratio: count / window.threshold
          };
        }
      }
    }

    return {
      suspicious: maxScore > 0,
      score: maxScore,
      details: suspiciousWindow
    };

  } catch (error) {
    console.error('Request frequency analysis error:', error);
    return { suspicious: false, score: 0, details: null };
  }
};

const analyzeUserAgentConsistency = async ({ ip_address, user_agent }) => {
  try {
    // Get recent user agents from same IP
    const { data: recentRequests } = await supabase
      .from('request_tracking')
      .select('user_agent')
      .eq('ip_address', ip_address)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(50);

    if (!recentRequests || recentRequests.length < 2) {
      return { suspicious: false, score: 0 };
    }

    const uniqueUserAgents = [...new Set(recentRequests.map(r => r.user_agent))];
    const rotationRate = uniqueUserAgents.length / recentRequests.length;

    // Check for suspicious patterns
    let score = 0;
    const issues = [];

    // Too many different user agents (rotation)
    if (uniqueUserAgents.length > 10 && rotationRate > 0.3) {
      score += 60;
      issues.push('high_user_agent_rotation');
    }

    // Very generic user agents
    const genericUAs = uniqueUserAgents.filter(ua => 
      ua.length < 20 || ua === 'Mozilla/5.0' || !ua.includes('/')
    );
    if (genericUAs.length > 2) {
      score += 30;
      issues.push('generic_user_agents');
    }

    // Outdated or suspicious user agents
    const suspiciousUAs = uniqueUserAgents.filter(ua => 
      ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')
    );
    if (suspiciousUAs.length > 0) {
      score += 40;
      issues.push('bot_user_agents');
    }

    return {
      suspicious: score > 0,
      score: Math.min(score, 100),
      details: {
        uniqueUserAgents: uniqueUserAgents.length,
        totalRequests: recentRequests.length,
        rotationRate,
        issues
      }
    };

  } catch (error) {
    console.error('User agent analysis error:', error);
    return { suspicious: false, score: 0 };
  }
};

const analyzeSequentialPatterns = async ({ ip_address, endpoint }) => {
  try {
    // Get recent requests to analyze patterns
    const { data: recentRequests } = await supabase
      .from('request_tracking')
      .select('endpoint, timestamp, method')
      .eq('ip_address', ip_address)
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: true })
      .limit(100);

    if (!recentRequests || recentRequests.length < 5) {
      return { suspicious: false, score: 0 };
    }

    let score = 0;
    const patterns = [];

    // Check for systematic endpoint scanning
    const endpointCounts = {};
    recentRequests.forEach(req => {
      endpointCounts[req.endpoint] = (endpointCounts[req.endpoint] || 0) + 1;
    });

    const uniqueEndpoints = Object.keys(endpointCounts).length;
    const avgRequestsPerEndpoint = recentRequests.length / uniqueEndpoints;

    // Too many different endpoints (scanning behavior)
    if (uniqueEndpoints > 20 && avgRequestsPerEndpoint < 3) {
      score += 70;
      patterns.push('endpoint_scanning');
    }

    // Check for systematic timing patterns
    const timeDiffs = [];
    for (let i = 1; i < recentRequests.length; i++) {
      const diff = new Date(recentRequests[i].timestamp) - new Date(recentRequests[i-1].timestamp);
      timeDiffs.push(diff);
    }

    // Very consistent timing (bot-like)
    const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    const timeDiffVariance = timeDiffs.reduce((acc, diff) => 
      acc + Math.pow(diff - avgTimeDiff, 2), 0) / timeDiffs.length;
    
    if (timeDiffVariance < 1000 && avgTimeDiff < 5000) { // Very consistent, fast requests
      score += 50;
      patterns.push('consistent_timing');
    }

    // Check for alphabetical or numerical patterns in requests
    const sortedEndpoints = recentRequests.map(r => r.endpoint).slice(0, 20);
    if (isAlphabeticalPattern(sortedEndpoints) || isNumericalPattern(sortedEndpoints)) {
      score += 60;
      patterns.push('systematic_ordering');
    }

    return {
      suspicious: score > 0,
      score: Math.min(score, 100),
      details: {
        uniqueEndpoints,
        avgRequestsPerEndpoint,
        avgTimeDiff,
        patterns
      }
    };

  } catch (error) {
    console.error('Sequential pattern analysis error:', error);
    return { suspicious: false, score: 0 };
  }
};

const analyzeTimePatterns = async ({ ip_address }) => {
  try {
    const { data: recentRequests } = await supabase
      .from('request_tracking')
      .select('timestamp')
      .eq('ip_address', ip_address)
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: true });

    if (!recentRequests || recentRequests.length < 10) {
      return { suspicious: false, score: 0 };
    }

    const hours = recentRequests.map(r => new Date(r.timestamp).getHours());
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    let score = 0;
    const patterns = [];

    // Check for 24/7 activity (bot-like)
    const activeHours = Object.keys(hourCounts).length;
    if (activeHours > 20) { // Active in more than 20 hours
      score += 40;
      patterns.push('247_activity');
    }

    // Check for off-hours activity (unusual for humans)
    const offHoursActivity = hours.filter(h => h >= 0 && h <= 6).length;
    const offHoursRatio = offHoursActivity / hours.length;
    if (offHoursRatio > 0.3) { // More than 30% activity in early morning
      score += 30;
      patterns.push('off_hours_activity');
    }

    // Check for very regular patterns
    const variance = calculateVariance(Object.values(hourCounts));
    if (variance < 2) { // Very consistent activity across hours
      score += 25;
      patterns.push('consistent_hourly_pattern');
    }

    return {
      suspicious: score > 0,
      score: Math.min(score, 100),
      details: {
        activeHours,
        offHoursRatio,
        patterns
      }
    };

  } catch (error) {
    console.error('Time pattern analysis error:', error);
    return { suspicious: false, score: 0 };
  }
};

const analyzeEndpointTargeting = async ({ ip_address, endpoint }) => {
  try {
    const { data: recentRequests } = await supabase
      .from('request_tracking')
      .select('endpoint, method')
      .eq('ip_address', ip_address)
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (!recentRequests || recentRequests.length < 5) {
      return { suspicious: false, score: 0 };
    }

    let score = 0;
    const patterns = [];

    // Check for admin/sensitive endpoint targeting
    const sensitiveEndpoints = [
      '/admin', '/api/admin', '/dashboard', '/config', 
      '/users', '/auth', '/login', '/password'
    ];

    const sensitiveRequests = recentRequests.filter(r => 
      sensitiveEndpoints.some(se => r.endpoint.includes(se))
    );

    if (sensitiveRequests.length > 0) {
      score += Math.min(sensitiveRequests.length * 15, 60);
      patterns.push('sensitive_endpoint_targeting');
    }

    // Check for API enumeration
    const apiRequests = recentRequests.filter(r => r.endpoint.includes('/api/'));
    const uniqueApiEndpoints = [...new Set(apiRequests.map(r => r.endpoint))];

    if (uniqueApiEndpoints.length > 10) {
      score += 40;
      patterns.push('api_enumeration');
    }

    // Check for error page targeting (404 hunting)
    const errorPatterns = ['404', 'error', 'notfound', 'missing'];
    const errorTargeting = recentRequests.filter(r => 
      errorPatterns.some(ep => r.endpoint.toLowerCase().includes(ep))
    );

    if (errorTargeting.length > 2) {
      score += 30;
      patterns.push('error_page_targeting');
    }

    return {
      suspicious: score > 0,
      score: Math.min(score, 100),
      details: {
        sensitiveRequests: sensitiveRequests.length,
        uniqueApiEndpoints: uniqueApiEndpoints.length,
        patterns
      }
    };

  } catch (error) {
    console.error('Endpoint targeting analysis error:', error);
    return { suspicious: false, score: 0 };
  }
};

const analyzeGeographicAnomalies = async ({ ip_address }) => {
  try {
    // This would integrate with a geolocation service
    // For now, we'll do basic analysis based on request patterns
    
    const { data: recentRequests } = await supabase
      .from('request_tracking')
      .select('ip_address, timestamp')
      .eq('ip_address', ip_address)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: true });

    if (!recentRequests || recentRequests.length < 5) {
      return { suspicious: false, score: 0 };
    }

    // In a real implementation, you would:
    // 1. Get geographic location for each IP
    // 2. Calculate distances between consecutive requests
    // 3. Check for impossible travel speeds
    // 4. Identify proxy/VPN switching patterns

    // For demo purposes, we'll return a placeholder
    return {
      suspicious: false,
      score: 0,
      details: {
        message: 'Geographic analysis requires geolocation service integration'
      }
    };

  } catch (error) {
    console.error('Geographic analysis error:', error);
    return { suspicious: false, score: 0 };
  }
};

// Helper functions
const isAlphabeticalPattern = (endpoints) => {
  if (endpoints.length < 3) return false;
  
  for (let i = 1; i < Math.min(endpoints.length, 10); i++) {
    if (endpoints[i] < endpoints[i-1]) return false;
  }
  return true;
};

const isNumericalPattern = (endpoints) => {
  const numbers = endpoints
    .map(e => e.match(/\d+/))
    .filter(m => m)
    .map(m => parseInt(m[0]));
  
  if (numbers.length < 3) return false;
  
  for (let i = 1; i < Math.min(numbers.length, 10); i++) {
    if (numbers[i] !== numbers[i-1] + 1) return false;
  }
  return true;
};

const calculateVariance = (values) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
};

const generateRecommendations = (behaviorScore) => {
  const recommendations = [];
  
  behaviorScore.patterns.forEach(pattern => {
    switch (pattern.type) {
      case 'high_frequency':
        recommendations.push('Implement rate limiting');
        break;
      case 'user_agent_inconsistency':
        recommendations.push('Add user agent validation');
        break;
      case 'sequential_patterns':
        recommendations.push('Monitor for systematic scanning');
        break;
      case 'endpoint_targeting':
        recommendations.push('Enhance endpoint security');
        break;
      default:
        recommendations.push('Monitor this IP closely');
    }
  });

  return [...new Set(recommendations)];
};

const determineRiskLevel = (score) => {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'minimal';
};

export {
  calculateBehaviorScore,
  analyzeRequestFrequency,
  analyzeUserAgentConsistency,
  analyzeSequentialPatterns,
  analyzeTimePatterns,
  analyzeEndpointTargeting,
  analyzeGeographicAnomalies,
  generateRecommendations,
  determineRiskLevel
};
