// src/services/smartRateLimit.js
import { supabase } from '../store/supaStore';

export class SmartRateLimitService {
  
  // Check if user can make API request
  static async checkUserQuota(userId, apiProvider, requestType) {
    try {
      // Get user's current usage
      const { data: userUsage } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('date', new Date().toISOString().split('T')[0])
        .eq('api_provider', apiProvider)
        .single();

      if (!userUsage) {
        // Create new usage record
        await this.initializeUserUsage(userId, apiProvider);
        return { 
          allowed: true, 
          remaining: this.getTierLimits('free')[requestType],
          used: 0,
          tier: 'free'
        };
      }

      const tierLimits = userUsage.tier_limits;
      const currentUsage = userUsage[`${requestType}_requests`] || 0;
      const limit = tierLimits[requestType] || 0;

      return {
        allowed: currentUsage < limit,
        remaining: Math.max(0, limit - currentUsage),
        used: currentUsage,
        limit: limit,
        tier: userUsage.tier
      };
    } catch (error) {
      console.error('Error checking user quota:', error);
      return { allowed: false, error: error.message };
    }
  }

  // Check system capacity
  static async checkSystemCapacity(apiProvider, requestType) {
    try {
      const { data: systemUsage } = await supabase
        .from('system_usage')
        .select('*')
        .eq('date', new Date().toISOString().split('T')[0])
        .eq('api_provider', apiProvider)
        .single();

      if (!systemUsage) {
        await this.initializeSystemUsage(apiProvider);
        return { available: true, capacity: 100, used: 0, limit: 10000 };
      }

      const currentUsage = systemUsage[`${requestType}_requests`] || 0;
      const dailyLimit = systemUsage.daily_limit;
      const capacityUsed = (currentUsage / dailyLimit) * 100;

      return {
        available: currentUsage < dailyLimit,
        capacity: Math.max(0, 100 - capacityUsed),
        used: currentUsage,
        limit: dailyLimit,
        remaining: Math.max(0, dailyLimit - currentUsage)
      };
    } catch (error) {
      console.error('Error checking system capacity:', error);
      return { available: false, error: error.message };
    }
  }

  // Add request to queue
  static async queueRequest(userId, apiProvider, requestType, requestData, priority = 1) {
    try {
      const { data, error } = await supabase
        .from('request_queue')
        .insert({
          user_id: userId,
          api_provider: apiProvider,
          request_type: requestType,
          request_data: requestData,
          priority: priority,
          scheduled_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Get queue position
      const { data: positionData } = await supabase
        .rpc('get_queue_position', { p_queue_id: data.id });

      // Start queue processing if not already running
      setTimeout(() => this.processQueue(apiProvider), 1000);

      return { 
        success: true, 
        queueId: data.id, 
        position: positionData || 1,
        estimatedWait: (positionData || 1) * 2 // 2 seconds per request estimate
      };
    } catch (error) {
      console.error('Error queueing request:', error);
      return { success: false, error: error.message };
    }
  }

  // Process queue
  static async processQueue(apiProvider) {
    try {
      const { data: queuedRequests } = await supabase
        .from('request_queue')
        .select('*')
        .eq('api_provider', apiProvider)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true })
        .limit(5); // Process 5 at a time

      if (!queuedRequests || queuedRequests.length === 0) {
        return;
      }

      for (const request of queuedRequests) {
        // Check if we can process this request type now
        const canProcess = await this.checkRateLimit(apiProvider, request.request_type);
        
        if (canProcess.allowed) {
          await this.processRequest(request);
        } else {
          // Wait and try again later
          console.log(`Rate limit reached for ${apiProvider}:${request.request_type}, waiting...`);
          setTimeout(() => this.processQueue(apiProvider), canProcess.waitTime || 5000);
          break;
        }
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  }

  // Check rate limits against API limits
  static async checkRateLimit(apiProvider, requestType) {
    try {
      const { data: rateLimits } = await supabase
        .from('api_rate_limits')
        .select('*')
        .eq('api_provider', apiProvider)
        .eq('endpoint_type', requestType)
        .single();

      if (!rateLimits) {
        return { allowed: true };
      }

      const now = new Date();
      const currentSecond = Math.floor(now.getTime() / 1000);
      const currentMinute = Math.floor(now.getTime() / (60 * 1000));
      const currentHour = Math.floor(now.getTime() / (60 * 60 * 1000));

      const usage = rateLimits.current_usage || {};
      
      // Check per-second limit
      if (usage[`second_${currentSecond}`] >= rateLimits.requests_per_second) {
        return { allowed: false, reason: 'per_second_limit', waitTime: 1000 };
      }

      // Check per-minute limit
      if (usage[`minute_${currentMinute}`] >= rateLimits.requests_per_minute) {
        return { allowed: false, reason: 'per_minute_limit', waitTime: 60000 };
      }

      // Check per-hour limit
      if (usage[`hour_${currentHour}`] >= rateLimits.requests_per_hour) {
        return { allowed: false, reason: 'per_hour_limit', waitTime: 3600000 };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true }; // Allow on error
    }
  }

  // Execute actual API request
  static async processRequest(queuedRequest) {
    const startTime = Date.now();
    
    try {
      // Update status to processing
      await supabase
        .from('request_queue')
        .update({ 
          status: 'processing', 
          started_at: new Date().toISOString() 
        })
        .eq('id', queuedRequest.id);

      // Make actual API call
      const result = await this.executeAPICall(
        queuedRequest.api_provider,
        queuedRequest.request_type,
        queuedRequest.request_data
      );

      // Update usage counters
      await this.updateUsageCounters(
        queuedRequest.user_id,
        queuedRequest.api_provider,
        queuedRequest.request_type
      );

      // Update rate limit tracking
      await this.updateRateLimitTracking(
        queuedRequest.api_provider,
        queuedRequest.request_type
      );

      const executionTime = Date.now() - startTime;

      // Mark as completed
      await supabase
        .from('request_queue')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          response_data: result,
          execution_time: executionTime
        })
        .eq('id', queuedRequest.id);

      return result;
    } catch (error) {
      // Handle failure
      const executionTime = Date.now() - startTime;
      
      await supabase
        .from('request_queue')
        .update({ 
          status: 'failed', 
          error_message: error.message,
          retry_count: queuedRequest.retry_count + 1,
          execution_time: executionTime,
          completed_at: new Date().toISOString()
        })
        .eq('id', queuedRequest.id);

      // Retry if under retry limit
      if (queuedRequest.retry_count < queuedRequest.max_retries) {
        setTimeout(() => {
          this.retryRequest(queuedRequest.id);
        }, Math.pow(2, queuedRequest.retry_count) * 1000); // Exponential backoff
      }

      throw error;
    }
  }

  // Retry failed request
  static async retryRequest(queueId) {
    try {
      await supabase
        .from('request_queue')
        .update({ 
          status: 'pending',
          scheduled_at: new Date().toISOString()
        })
        .eq('id', queueId);
    } catch (error) {
      console.error('Error retrying request:', error);
    }
  }

  // Execute API call (implement your specific API logic here)
  static async executeAPICall(apiProvider, requestType, requestData) {
    // This is where you implement actual API calls
    switch (apiProvider) {
      case 'hotelbeds':
        return await this.callHotelBedsAPI(requestType, requestData);
      case 'amadeus':
        return await this.callAmadeusAPI(requestType, requestData);
      case 'expedia':
        return await this.callExpediaAPI(requestType, requestData);
      default:
        throw new Error(`Unknown API provider: ${apiProvider}`);
    }
  }

  // HotelBeds API implementation
  static async callHotelBedsAPI(requestType, requestData) {
    // Implement HotelBeds API calls
    const apiKey = process.env.HOTELBEDS_API_KEY;
    const secret = process.env.HOTELBEDS_SECRET;
    
    if (!apiKey || !secret) {
      throw new Error('HotelBeds API credentials not configured');
    }

    // Mock implementation - replace with actual API calls
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          provider: 'hotelbeds',
          type: requestType,
          data: requestData,
          timestamp: new Date().toISOString(),
          mockResult: true
        });
      }, Math.random() * 2000 + 500); // Simulate API delay
    });
  }

  // Amadeus API implementation
  static async callAmadeusAPI(requestType, requestData) {
    // Implement Amadeus API calls
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          provider: 'amadeus',
          type: requestType,
          data: requestData,
          timestamp: new Date().toISOString(),
          mockResult: true
        });
      }, Math.random() * 1500 + 300);
    });
  }

  // Expedia API implementation
  static async callExpediaAPI(requestType, requestData) {
    // Implement Expedia API calls
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          provider: 'expedia',
          type: requestType,
          data: requestData,
          timestamp: new Date().toISOString(),
          mockResult: true
        });
      }, Math.random() * 1800 + 400);
    });
  }

  // Update rate limit tracking
  static async updateRateLimitTracking(apiProvider, requestType) {
    try {
      const now = new Date();
      const currentSecond = Math.floor(now.getTime() / 1000);
      const currentMinute = Math.floor(now.getTime() / (60 * 1000));
      const currentHour = Math.floor(now.getTime() / (60 * 60 * 1000));

      const { data: rateLimits } = await supabase
        .from('api_rate_limits')
        .select('current_usage')
        .eq('api_provider', apiProvider)
        .eq('endpoint_type', requestType)
        .single();

      const usage = rateLimits?.current_usage || {};
      
      // Increment counters
      usage[`second_${currentSecond}`] = (usage[`second_${currentSecond}`] || 0) + 1;
      usage[`minute_${currentMinute}`] = (usage[`minute_${currentMinute}`] || 0) + 1;
      usage[`hour_${currentHour}`] = (usage[`hour_${currentHour}`] || 0) + 1;

      // Clean old entries (keep last hour of data)
      const hourAgo = currentHour - 1;
      Object.keys(usage).forEach(key => {
        if (key.startsWith('second_') && parseInt(key.split('_')[1]) < currentSecond - 60) {
          delete usage[key];
        }
        if (key.startsWith('minute_') && parseInt(key.split('_')[1]) < currentMinute - 60) {
          delete usage[key];
        }
        if (key.startsWith('hour_') && parseInt(key.split('_')[1]) < hourAgo) {
          delete usage[key];
        }
      });

      await supabase
        .from('api_rate_limits')
        .update({ 
          current_usage: usage,
          updated_at: new Date().toISOString()
        })
        .eq('api_provider', apiProvider)
        .eq('endpoint_type', requestType);

    } catch (error) {
      console.error('Error updating rate limit tracking:', error);
    }
  }

  // Helper methods
  static getTierLimits(tier) {
    const limits = {
      free: { search: 10, booking: 2, availability: 20, daily: 100 },
      premium: { search: 50, booking: 10, availability: 100, daily: 1000 },
      enterprise: { search: 200, booking: 50, availability: 500, daily: 10000 }
    };
    return limits[tier] || limits.free;
  }

  static async initializeUserUsage(userId, apiProvider) {
    try {
      // Get user tier from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .single();

      const tier = profile?.tier || 'free';
      const tierLimits = this.getTierLimits(tier);

      await supabase.from('user_usage').insert({
        user_id: userId,
        api_provider: apiProvider,
        tier: tier,
        tier_limits: tierLimits
      });
    } catch (error) {
      console.error('Error initializing user usage:', error);
    }
  }

  static async initializeSystemUsage(apiProvider) {
    try {
      await supabase.from('system_usage').insert({
        api_provider: apiProvider,
        daily_limit: 10000,
        hourly_limit: 500
      });
    } catch (error) {
      console.error('Error initializing system usage:', error);
    }
  }

  static async updateUsageCounters(userId, apiProvider, requestType) {
    try {
      // Update user usage
      await supabase.rpc('increment_user_usage', {
        p_user_id: userId,
        p_api_provider: apiProvider,
        p_request_type: requestType
      });

      // Update system usage
      await supabase.rpc('increment_system_usage', {
        p_api_provider: apiProvider,
        p_request_type: requestType
      });
    } catch (error) {
      console.error('Error updating usage counters:', error);
    }
  }

  // Get queue status for user
  static async getQueueStatus(userId, apiProvider) {
    try {
      const { data: queueItems } = await supabase
        .from('request_queue')
        .select('*')
        .eq('user_id', userId)
        .eq('api_provider', apiProvider)
        .in('status', ['pending', 'processing'])
        .order('scheduled_at', { ascending: true });

      return {
        total: queueItems?.length || 0,
        pending: queueItems?.filter(item => item.status === 'pending').length || 0,
        processing: queueItems?.filter(item => item.status === 'processing').length || 0,
        items: queueItems || []
      };
    } catch (error) {
      console.error('Error getting queue status:', error);
      return { total: 0, pending: 0, processing: 0, items: [] };
    }
  }

  // Get usage statistics
  static async getUsageStats(userId, apiProvider, timeRange = '24h') {
    try {
      const timeRanges = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 24 * 7
      };

      const hours = timeRanges[timeRange] || 24;
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const { data: userUsage } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('api_provider', apiProvider)
        .gte('date', startTime.toISOString().split('T')[0]);

      const { data: systemUsage } = await supabase
        .from('system_usage')
        .select('*')
        .eq('api_provider', apiProvider)
        .gte('date', startTime.toISOString().split('T')[0]);

      return {
        user: userUsage || [],
        system: systemUsage || [],
        timeRange
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return { user: [], system: [], timeRange };
    }
  }
}

export default SmartRateLimitService;
