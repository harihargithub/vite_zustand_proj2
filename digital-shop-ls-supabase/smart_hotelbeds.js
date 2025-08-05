import { supabase } from '../store/supaStore';

/**
 * Log HotelBeds API request and update usage counters in Supabase.
 * @param {string} userId - User UUID.
 * @param {object} payload - The request payload.
 * @param {object|string} response - The API response.
 * @param {number} statusCode - HTTP status code.
 */
export async function logHotelbeds(userId, payload, response, statusCode) {
  await supabase.from('request_tracking').insert([{
    ip_address: '127.0.0.1', // Replace with actual IP if available
    user_agent: 'mock-test-agent', // Replace with actual user agent if available
    endpoint: 'hotelbeds_search',
    method: 'POST',
    timestamp: new Date().toISOString(),
    user_id: userId,
    response_time: 100, // Replace with actual response time if available
    status_code: statusCode,
    request_size: JSON.stringify(payload).length,
    response_size: typeof response === 'string'
      ? response.length
      : JSON.stringify(response).length,
    referer: 'mock-test',
    suspicious_score: 0
  }]);

  // Update user usage (custom RPC function)
  await supabase.rpc('increment_user_usage', {
    p_user_id: userId,
    p_api_provider: 'hotelbeds',
    p_request_type: 'search'
  });

  // Update system usage (custom RPC function)
  await supabase.rpc('increment_system_usage', {
    p_api_provider: 'hotelbeds',
    p_request_type: 'search'
  });
}