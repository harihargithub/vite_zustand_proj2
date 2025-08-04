// src/components/UsageAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { SaaSBillingService } from '../services/saasBilling';
import { useAuthStore } from '../store/authStore';
import './UsageAnalytics.css';

const UsageAnalytics = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30d');
    const [usageData, setUsageData] = useState(null);
    const [breakdown, setBreakdown] = useState(null);
    const [predictions, setPredictions] = useState(null);
    const [alerts, setAlerts] = useState([]);

    const billingService = new SaaSBillingService();

    useEffect(() => {
        if (user?.id) {
            loadUsageAnalytics();
        }
    }, [user, timeRange]);

    const loadUsageAnalytics = async () => {
        try {
            setLoading(true);

            // Get usage data for selected time range
            const usage = await billingService.getUsageAnalytics(user.id, timeRange);
            setUsageData(usage);

            // Get API breakdown
            const apiBreakdown = await billingService.getAPIUsageBreakdown(user.id, timeRange);
            setBreakdown(apiBreakdown);

            // Get usage predictions
            const predictionData = await billingService.getUsagePredictions(user.id);
            setPredictions(predictionData);

            // Check for usage alerts
            const alertData = await billingService.getUsageAlerts(user.id);
            setAlerts(alertData);

        } catch (error) {
            console.error('Error loading usage analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTimeRangeLabel = (range) => {
        const labels = {
            '7d': 'Last 7 days',
            '30d': 'Last 30 days',
            '90d': 'Last 90 days',
            '1y': 'Last year'
        };
        return labels[range] || range;
    };

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num?.toString() || '0';
    };

    const getGrowthColor = (growth) => {
        if (growth > 0) return '#10b981'; // Green
        if (growth < 0) return '#ef4444'; // Red
        return '#6b7280'; // Gray
    };

    if (loading) {
        return (
            <div className="usage-analytics loading">
                <div className="loading-spinner"></div>
                <p>Loading usage analytics...</p>
            </div>
        );
    }

    return (
        <div className="usage-analytics">
            <div className="analytics-header">
                <h2>Usage Analytics</h2>
                <div className="time-range-selector">
                    {['7d', '30d', '90d', '1y'].map(range => (
                        <button
                            key={range}
                            className={`time-range-btn ${timeRange === range ? 'active' : ''}`}
                            onClick={() => setTimeRange(range)}
                        >
                            {getTimeRangeLabel(range)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Usage Alerts */}
            {alerts.length > 0 && (
                <div className="alerts-section">
                    {alerts.map((alert, index) => (
                        <div key={index} className={`alert alert-${alert.type}`}>
                            <div className="alert-icon">
                                {alert.type === 'warning' && '⚠️'}
                                {alert.type === 'danger' && '🚨'}
                                {alert.type === 'info' && 'ℹ️'}
                            </div>
                            <div className="alert-content">
                                <h4>{alert.title}</h4>
                                <p>{alert.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Overview Cards */}
            <div className="analytics-overview">
                <div className="overview-card">
                    <div className="card-icon">📊</div>
                    <div className="card-content">
                        <h3>Total API Calls</h3>
                        <div className="metric-value">
                            {formatNumber(usageData?.total_calls)}
                        </div>
                        <div className="metric-change" style={{ color: getGrowthColor(usageData?.calls_growth) }}>
                            {usageData?.calls_growth > 0 ? '+' : ''}{usageData?.calls_growth?.toFixed(1)}% vs previous period
                        </div>
                    </div>
                </div>

                <div className="overview-card">
                    <div className="card-icon">💰</div>
                    <div className="card-content">
                        <h3>Total Cost</h3>
                        <div className="metric-value">
                            ${usageData?.total_cost?.toFixed(2) || '0.00'}
                        </div>
                        <div className="metric-change" style={{ color: getGrowthColor(usageData?.cost_growth) }}>
                            {usageData?.cost_growth > 0 ? '+' : ''}{usageData?.cost_growth?.toFixed(1)}% vs previous period
                        </div>
                    </div>
                </div>

                <div className="overview-card">
                    <div className="card-icon">⚡</div>
                    <div className="card-content">
                        <h3>Avg Response Time</h3>
                        <div className="metric-value">
                            {usageData?.avg_response_time?.toFixed(0) || '0'}ms
                        </div>
                        <div className="metric-change" style={{ color: getGrowthColor(-usageData?.response_time_change) }}>
                            {usageData?.response_time_change > 0 ? '+' : ''}{usageData?.response_time_change?.toFixed(1)}ms vs previous period
                        </div>
                    </div>
                </div>

                <div className="overview-card">
                    <div className="card-icon">✅</div>
                    <div className="card-content">
                        <h3>Success Rate</h3>
                        <div className="metric-value">
                            {usageData?.success_rate?.toFixed(1) || '0'}%
                        </div>
                        <div className="metric-change" style={{ color: getGrowthColor(usageData?.success_rate_change) }}>
                            {usageData?.success_rate_change > 0 ? '+' : ''}{usageData?.success_rate_change?.toFixed(1)}% vs previous period
                        </div>
                    </div>
                </div>
            </div>

            {/* Usage Chart */}
            <div className="analytics-card">
                <div className="card-header">
                    <h3>Usage Trend</h3>
                </div>
                <div className="card-content">
                    <div className="chart-container">
                        {usageData?.daily_usage && (
                            <div className="simple-chart">
                                {usageData.daily_usage.map((day, index) => {
                                    const maxUsage = Math.max(...usageData.daily_usage.map(d => d.calls));
                                    const height = (day.calls / maxUsage) * 100;
                                    return (
                                        <div key={index} className="chart-bar-container">
                                            <div 
                                                className="chart-bar"
                                                style={{ height: `${height}%` }}
                                                title={`${day.date}: ${day.calls} calls`}
                                            ></div>
                                            <span className="chart-label">
                                                {new Date(day.date).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric' 
                                                })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* API Breakdown */}
            <div className="analytics-card">
                <div className="card-header">
                    <h3>API Usage Breakdown</h3>
                </div>
                <div className="card-content">
                    {breakdown && (
                        <div className="breakdown-grid">
                            {Object.entries(breakdown).map(([provider, data]) => (
                                <div key={provider} className="breakdown-item">
                                    <div className="breakdown-header">
                                        <h4>{provider.charAt(0).toUpperCase() + provider.slice(1)}</h4>
                                        <span className="breakdown-percentage">
                                            {((data.calls / usageData?.total_calls) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="breakdown-stats">
                                        <div className="stat">
                                            <span className="stat-label">Calls</span>
                                            <span className="stat-value">{formatNumber(data.calls)}</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-label">Cost</span>
                                            <span className="stat-value">${data.cost?.toFixed(2)}</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-label">Avg Time</span>
                                            <span className="stat-value">{data.avg_time?.toFixed(0)}ms</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-label">Success</span>
                                            <span className="stat-value">{data.success_rate?.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="breakdown-bar">
                                        <div 
                                            className="breakdown-fill"
                                            style={{ 
                                                width: `${(data.calls / usageData?.total_calls) * 100}%`,
                                                backgroundColor: getProviderColor(provider)
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Usage Predictions */}
            {predictions && (
                <div className="analytics-card">
                    <div className="card-header">
                        <h3>Usage Predictions</h3>
                        <span className="prediction-disclaimer">Based on current trends</span>
                    </div>
                    <div className="card-content">
                        <div className="predictions-grid">
                            <div className="prediction-item">
                                <h4>This Month</h4>
                                <div className="prediction-value">
                                    {formatNumber(predictions.month_prediction)}
                                </div>
                                <div className="prediction-confidence">
                                    {predictions.month_confidence}% confidence
                                </div>
                            </div>
                            <div className="prediction-item">
                                <h4>Next Month</h4>
                                <div className="prediction-value">
                                    {formatNumber(predictions.next_month_prediction)}
                                </div>
                                <div className="prediction-confidence">
                                    {predictions.next_month_confidence}% confidence
                                </div>
                            </div>
                            <div className="prediction-item">
                                <h4>Estimated Cost</h4>
                                <div className="prediction-value">
                                    ${predictions.estimated_cost?.toFixed(2)}
                                </div>
                                <div className="prediction-confidence">
                                    Including overages
                                </div>
                            </div>
                        </div>
                        {predictions.overage_risk > 50 && (
                            <div className="overage-warning">
                                <span className="warning-icon">⚠️</span>
                                <span>High risk of overage charges this month ({predictions.overage_risk}%)</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const getProviderColor = (provider) => {
    const colors = {
        hotelbeds: '#3b82f6',
        amadeus: '#10b981',
        expedia: '#f59e0b',
        booking: '#8b5cf6',
        agoda: '#ef4444'
    };
    return colors[provider] || '#6b7280';
};

export default UsageAnalytics;
