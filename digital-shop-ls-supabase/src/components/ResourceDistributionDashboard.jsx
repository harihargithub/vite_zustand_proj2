// src/components/ResourceDistributionDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../store/supaStore';
import SmartRateLimitService from '../services/smartRateLimit';
import './ResourceDistributionDashboard.css';

const ResourceDistributionDashboard = () => {
  const [systemStats, setSystemStats] = useState({});
  const [userStats, setUserStats] = useState({});
  const [queueStatus, setQueueStatus] = useState({});
  const [rateLimits, setRateLimits] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('hotelbeds');
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('resource_distribution_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'request_queue' },
        () => loadQueueData()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_usage' },
        () => loadSystemStats()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_usage' },
        () => loadUserStats()
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [selectedProvider, timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSystemStats(),
        loadUserStats(),
        loadQueueData(),
        loadRateLimits(),
        loadActiveUsers()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      const { data: systemUsage } = await supabase
        .from('system_usage')
        .select('*')
        .eq('api_provider', selectedProvider)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      if (systemUsage) {
        const capacityUsed = {
          search: (systemUsage.search_requests / systemUsage.daily_limit) * 100,
          booking: (systemUsage.booking_requests / systemUsage.daily_limit) * 100,
          availability: (systemUsage.availability_requests / systemUsage.daily_limit) * 100
        };

        setSystemStats({
          ...systemUsage,
          capacityUsed,
          totalRequests: systemUsage.search_requests + systemUsage.booking_requests + systemUsage.availability_requests
        });
      } else {
        setSystemStats({
          search_requests: 0,
          booking_requests: 0,
          availability_requests: 0,
          daily_limit: 10000,
          hourly_limit: 500,
          capacityUsed: { search: 0, booking: 0, availability: 0 },
          totalRequests: 0
        });
      }
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const stats = await SmartRateLimitService.getUsageStats(
        currentUser.user.id,
        selectedProvider,
        timeRange
      );

      setUserStats(stats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadQueueData = async () => {
    try {
      const { data: queueItems } = await supabase
        .from('request_queue')
        .select('*')
        .eq('api_provider', selectedProvider)
        .in('status', ['pending', 'processing'])
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true })
        .limit(50);

      const statusCounts = {
        pending: queueItems?.filter(item => item.status === 'pending').length || 0,
        processing: queueItems?.filter(item => item.status === 'processing').length || 0
      };

      setQueueStatus({
        items: queueItems || [],
        counts: statusCounts,
        total: queueItems?.length || 0
      });
    } catch (error) {
      console.error('Error loading queue data:', error);
    }
  };

  const loadRateLimits = async () => {
    try {
      const { data: limits } = await supabase
        .from('api_rate_limits')
        .select('*')
        .eq('api_provider', selectedProvider)
        .order('endpoint_type');

      setRateLimits(limits || []);
    } catch (error) {
      console.error('Error loading rate limits:', error);
    }
  };

  const loadActiveUsers = async () => {
    try {
      const { data: users } = await supabase
        .from('user_usage')
        .select(`
          user_id,
          tier,
          search_requests,
          booking_requests,
          availability_requests,
          tier_limits,
          profiles(full_name, email)
        `)
        .eq('api_provider', selectedProvider)
        .eq('date', new Date().toISOString().split('T')[0])
        .order('search_requests', { ascending: false })
        .limit(10);

      setActiveUsers(users || []);
    } catch (error) {
      console.error('Error loading active users:', error);
    }
  };

  const processQueueManually = async () => {
    try {
      await SmartRateLimitService.processQueue(selectedProvider);
      await loadQueueData();
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  };

  const cancelQueueItem = async (queueId) => {
    try {
      await supabase
        .from('request_queue')
        .update({ status: 'cancelled' })
        .eq('id', queueId);
      
      await loadQueueData();
    } catch (error) {
      console.error('Error cancelling queue item:', error);
    }
  };

  const StatCard = ({ title, value, subtitle, color, icon }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );

  const ProgressBar = ({ percentage, label, color = '#3498db' }) => (
    <div className="progress-container">
      <div className="progress-label">
        <span>{label}</span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ 
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color 
          }}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading resource distribution data...</p>
      </div>
    );
  }

  return (
    <div className="resource-distribution-dashboard">
      <div className="dashboard-header">
        <h1>🏗️ Smart Resource Distribution Dashboard</h1>
        <div className="dashboard-controls">
          <select 
            value={selectedProvider} 
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="provider-select"
          >
            <option value="hotelbeds">HotelBeds</option>
            <option value="amadeus">Amadeus</option>
            <option value="expedia">Expedia</option>
          </select>
          
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* System Overview */}
      <div className="stats-grid">
        <StatCard 
          title="Total API Requests" 
          value={systemStats.totalRequests || 0} 
          subtitle={`of ${systemStats.daily_limit || 0} daily limit`}
          icon="📊" 
          color="blue"
        />
        <StatCard 
          title="Search Requests" 
          value={systemStats.search_requests || 0} 
          subtitle={`${systemStats.capacityUsed?.search?.toFixed(1) || 0}% capacity used`}
          icon="🔍" 
          color="green"
        />
        <StatCard 
          title="Booking Requests" 
          value={systemStats.booking_requests || 0} 
          subtitle={`${systemStats.capacityUsed?.booking?.toFixed(1) || 0}% capacity used`}
          icon="🏨" 
          color="orange"
        />
        <StatCard 
          title="Queue Items" 
          value={queueStatus.total || 0} 
          subtitle={`${queueStatus.counts?.pending || 0} pending, ${queueStatus.counts?.processing || 0} processing`}
          icon="⏱️" 
          color="purple"
        />
      </div>

      {/* Capacity Usage */}
      <div className="capacity-section">
        <h2>📈 API Capacity Usage</h2>
        <div className="capacity-grid">
          <div className="capacity-card">
            <h3>Search API</h3>
            <ProgressBar 
              percentage={systemStats.capacityUsed?.search || 0}
              label="Search Capacity"
              color="#28a745"
            />
            <div className="capacity-details">
              {systemStats.search_requests || 0} / {systemStats.daily_limit || 0} requests
            </div>
          </div>
          
          <div className="capacity-card">
            <h3>Booking API</h3>
            <ProgressBar 
              percentage={systemStats.capacityUsed?.booking || 0}
              label="Booking Capacity"
              color="#fd7e14"
            />
            <div className="capacity-details">
              {systemStats.booking_requests || 0} / {systemStats.daily_limit || 0} requests
            </div>
          </div>
          
          <div className="capacity-card">
            <h3>Availability API</h3>
            <ProgressBar 
              percentage={systemStats.capacityUsed?.availability || 0}
              label="Availability Capacity"
              color="#6f42c1"
            />
            <div className="capacity-details">
              {systemStats.availability_requests || 0} / {systemStats.daily_limit || 0} requests
            </div>
          </div>
        </div>
      </div>

      {/* Request Queue */}
      <div className="queue-section">
        <div className="section-header">
          <h2>📋 Request Queue</h2>
          <button 
            onClick={processQueueManually}
            className="btn-process-queue"
          >
            🚀 Process Queue
          </button>
        </div>
        
        <div className="queue-table-container">
          <table className="queue-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Request Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Retry Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queueStatus.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.user_id.substring(0, 8)}...</td>
                  <td>
                    <span className={`request-type ${item.request_type}`}>
                      {item.request_type}
                    </span>
                  </td>
                  <td>
                    <span className={`priority priority-${item.priority}`}>
                      {['Low', 'Medium', 'High', 'Urgent'][item.priority - 1]}
                    </span>
                  </td>
                  <td>
                    <span className={`status status-${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{new Date(item.scheduled_at).toLocaleTimeString()}</td>
                  <td>{item.retry_count}/{item.max_retries}</td>
                  <td>
                    {item.status === 'pending' && (
                      <button 
                        onClick={() => cancelQueueItem(item.id)}
                        className="btn-cancel"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {queueStatus.items.length === 0 && (
            <div className="empty-queue">
              <p>🎉 Queue is empty! All requests processed.</p>
            </div>
          )}
        </div>
      </div>

      {/* Rate Limits */}
      <div className="rate-limits-section">
        <h2>⚡ API Rate Limits</h2>
        <div className="rate-limits-grid">
          {rateLimits.map((limit) => (
            <div key={limit.id} className="rate-limit-card">
              <h3>{limit.endpoint_type}</h3>
              <div className="rate-limit-details">
                <div>Per Second: {limit.requests_per_second}</div>
                <div>Per Minute: {limit.requests_per_minute}</div>
                <div>Per Hour: {limit.requests_per_hour}</div>
                <div>Per Day: {limit.requests_per_day}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Users */}
      <div className="active-users-section">
        <h2>👥 Active Users Today</h2>
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Tier</th>
                <th>Search</th>
                <th>Booking</th>
                <th>Availability</th>
                <th>Usage %</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((user) => {
                const totalUsed = user.search_requests + user.booking_requests + user.availability_requests;
                const totalLimit = user.tier_limits.daily || 100;
                const usagePercentage = (totalUsed / totalLimit) * 100;
                
                return (
                  <tr key={user.user_id}>
                    <td>
                      <div className="user-info">
                        <div>{user.profiles?.full_name || 'Unknown'}</div>
                        <small>{user.profiles?.email}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`tier tier-${user.tier}`}>
                        {user.tier}
                      </span>
                    </td>
                    <td>{user.search_requests}</td>
                    <td>{user.booking_requests}</td>
                    <td>{user.availability_requests}</td>
                    <td>
                      <ProgressBar 
                        percentage={usagePercentage}
                        label=""
                        color={usagePercentage > 80 ? '#dc3545' : usagePercentage > 60 ? '#ffc107' : '#28a745'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResourceDistributionDashboard;
