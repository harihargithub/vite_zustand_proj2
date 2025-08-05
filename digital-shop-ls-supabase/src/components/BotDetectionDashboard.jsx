// src/components/BotDetectionDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../store/supaStore';
import { detectProxy } from '../utils/proxyDetection';
import { analyzeBehavior } from '../utils/behavioralAnalysis';
import './BotDetectionDashboard.css';

const BotDetectionDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    suspicious: 0,
    blocked: 0,
    proxies: 0
  });
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('request_tracking_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'request_tracking' },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [timeRange, filter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const timeRanges = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 24 * 7
      };

      const hours = timeRanges[timeRange] || 1;
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Fetch requests with filters
      let query = supabase
        .from('request_tracking')
        .select('*')
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: false })
        .limit(100);

      if (filter === 'suspicious') {
        query = query.gte('suspicious_score', 50);
      } else if (filter === 'blocked') {
        query = query.eq('blocked', true);
      } else if (filter === 'proxies') {
/*         query = query.eq('is_proxy', true);
 */      }

      const { data: requestData, error } = await query;

      if (error) throw error;

      setRequests(requestData || []);

      // Calculate stats
      const allRequests = await supabase
        .from('request_tracking')
        .select('suspicious_score, blocked')
        .gte('timestamp', startTime.toISOString());

      if (allRequests.data) {
        const total = allRequests.data.length;
        const suspicious = allRequests.data.filter(r => r.suspicious_score >= 50).length;
        const blocked = allRequests.data.filter(r => r.blocked).length;
        const proxies = 0;

        setStats({ total, suspicious, blocked, proxies });
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockIP = async (ipAddress) => {
    try {
      // Add to known proxies as blocked
      await supabase.from('known_proxies').upsert({
        ip_address: ipAddress,
        proxy_type: 'blocked',
        detected_at: new Date().toISOString(),
        confidence_score: 100,
        is_blocked: true
      });

      // Update all requests from this IP
      await supabase
        .from('request_tracking')
        .update({ blocked: true, blocked_at: new Date().toISOString() })
        .eq('ip_address', ipAddress);

      loadDashboardData();
      
    } catch (error) {
      console.error('Error blocking IP:', error);
    }
  };

  const handleUnblockIP = async (ipAddress) => {
    try {
      await supabase
        .from('known_proxies')
        .update({ is_blocked: false })
        .eq('ip_address', ipAddress);

      await supabase
        .from('request_tracking')
        .update({ blocked: false, blocked_at: null })
        .eq('ip_address', ipAddress);

      loadDashboardData();
      
    } catch (error) {
      console.error('Error unblocking IP:', error);
    }
  };

  const analyzeRequest = async (request) => {
    try {
      const proxyResult = await detectProxy({
        ip_address: request.ip_address,
        user_agent: request.user_agent,
        headers: request.headers || {}
      });

      const behaviorResult = await analyzeBehavior({
        ip_address: request.ip_address,
        user_agent: request.user_agent,
        endpoint: request.endpoint,
        method: request.method,
        user_id: request.user_id
      });

      setSelectedRequest({
        ...request,
        analysis: {
          proxy: proxyResult,
          behavior: behaviorResult
        }
      });

    } catch (error) {
      console.error('Error analyzing request:', error);
    }
  };

  const getRiskBadgeClass = (score) => {
    if (score >= 80) return 'risk-critical';
    if (score >= 60) return 'risk-high';
    if (score >= 40) return 'risk-medium';
    if (score >= 20) return 'risk-low';
    return 'risk-minimal';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading bot detection data...</p>
      </div>
    );
  }

  return (
    <div className="bot-detection-dashboard">
      <div className="dashboard-header">
        <h1>Bot Detection Dashboard</h1>
        <div className="dashboard-controls">
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
          
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Requests</option>
            <option value="suspicious">Suspicious Only</option>
            <option value="blocked">Blocked Only</option>
            <option value="proxies">Proxies Only</option>
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard 
          title="Total Requests" 
          value={stats.total} 
          icon="📊" 
          color="blue"
        />
        <StatCard 
          title="Suspicious" 
          value={stats.suspicious} 
          icon="⚠️" 
          color="orange"
        />
        <StatCard 
          title="Blocked" 
          value={stats.blocked} 
          icon="🚫" 
          color="red"
        />
        <StatCard 
          title="Proxies Detected" 
          value={stats.proxies} 
          icon="🔍" 
          color="purple"
        />
      </div>

      <div className="requests-table-container">
        <div className="table-header">
          <h2>Recent Requests</h2>
          <div className="table-info">
            Showing {requests.length} requests
          </div>
        </div>
        
        <div className="requests-table">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>IP Address</th>
                <th>Endpoint</th>
                <th>User Agent</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className={request.blocked ? 'blocked-row' : ''}>
                  <td className="timestamp">
                    {formatTimestamp(request.timestamp)}
                  </td>
                  <td className="ip-address">
                    {request.ip_address}
                    {/* {request.is_proxy && <span className="proxy-badge">PROXY</span>} */}
                  </td>
                  <td className="endpoint">{request.endpoint}</td>
                  <td className="user-agent" title={request.user_agent}>
                    {request.user_agent?.substring(0, 30)}...
                  </td>
                  <td className="risk-score">
                    <span className={`risk-badge ${getRiskBadgeClass(request.suspicious_score)}`}>
                      {request.suspicious_score}
                    </span>
                  </td>
                  <td className="status">
                    {request.blocked ? (
                      <span className="status-blocked">BLOCKED</span>
                    ) : request.suspicious_score >= 50 ? (
                      <span className="status-suspicious">SUSPICIOUS</span>
                    ) : (
                      <span className="status-normal">NORMAL</span>
                    )}
                  </td>
                  <td className="actions">
                    <button 
                      onClick={() => analyzeRequest(request)}
                      className="btn-analyze"
                      title="Analyze Request"
                    >
                      🔍
                    </button>
                    {!request.blocked ? (
                      <button 
                        onClick={() => handleBlockIP(request.ip_address)}
                        className="btn-block"
                        title="Block IP"
                      >
                        🚫
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUnblockIP(request.ip_address)}
                        className="btn-unblock"
                        title="Unblock IP"
                      >
                        ✅
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="analysis-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="analysis-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Analysis</h3>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="analysis-section">
                <h4>Request Details</h4>
                <div className="details-grid">
                  <div><strong>IP:</strong> {selectedRequest.ip_address}</div>
                  <div><strong>Endpoint:</strong> {selectedRequest.endpoint}</div>
                  <div><strong>Method:</strong> {selectedRequest.method}</div>
                  <div><strong>User Agent:</strong> {selectedRequest.user_agent}</div>
                  <div><strong>Timestamp:</strong> {formatTimestamp(selectedRequest.timestamp)}</div>
                </div>
              </div>

              {selectedRequest.analysis?.proxy && (
                <div className="analysis-section">
                  <h4>Proxy Analysis</h4>
                  <div className="analysis-result">
                    <div>
                      <strong>Is Proxy:</strong> 
                      <span className={selectedRequest.analysis.proxy.isProxy ? 'text-danger' : 'text-success'}>
                        {selectedRequest.analysis.proxy.isProxy ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div><strong>Confidence:</strong> {selectedRequest.analysis.proxy.confidence}%</div>
                    {selectedRequest.analysis.proxy.proxyType && (
                      <div><strong>Type:</strong> {selectedRequest.analysis.proxy.proxyType}</div>
                    )}
                    <div><strong>Score:</strong> {selectedRequest.analysis.proxy.score}</div>
                  </div>
                </div>
              )}

              {selectedRequest.analysis?.behavior && (
                <div className="analysis-section">
                  <h4>Behavioral Analysis</h4>
                  <div className="analysis-result">
                    <div><strong>Suspicious Score:</strong> {selectedRequest.analysis.behavior.suspiciousScore}</div>
                    <div><strong>Risk Level:</strong> {selectedRequest.analysis.behavior.riskLevel}</div>
                    
                    {selectedRequest.analysis.behavior.patterns.length > 0 && (
                      <div className="patterns-list">
                        <strong>Detected Patterns:</strong>
                        <ul>
                          {selectedRequest.analysis.behavior.patterns.map((pattern, index) => (
                            <li key={index}>
                              <span className="pattern-type">{pattern.type}</span>
                              <span className="pattern-score">Score: {pattern.score}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {selectedRequest.analysis.behavior.recommendations.length > 0 && (
                      <div className="recommendations-list">
                        <strong>Recommendations:</strong>
                        <ul>
                          {selectedRequest.analysis.behavior.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotDetectionDashboard;
