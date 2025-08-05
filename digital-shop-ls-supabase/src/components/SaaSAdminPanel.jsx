// src/components/SaaSAdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { SaaSBillingService } from '../services/saasBilling';
import { useAuthStore } from '../store/authStore';
import './SaaSAdminPanel.css';

const SaaSAdminPanel = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [adminData, setAdminData] = useState({
        overview: null,
        users: [],
        subscriptions: [],
        revenue: null,
        usage: null
    });
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);

    // Remove instance creation; use static methods on SaaSBillingService

    useEffect(() => {
        if (user?.id) {
            loadAdminData();
        }
    }, [user, activeTab]);

    const loadAdminData = async () => {
        try {
            setLoading(true);
            
            switch (activeTab) {
                case 'overview':
                    const overview = await SaaSBillingService.getAdminOverview();
                    setAdminData(prev => ({ ...prev, overview }));
                    break;
                    
                case 'users':
                    const users = await SaaSBillingService.getAllUsers();
                    setAdminData(prev => ({ ...prev, users }));
                    break;

                case 'subscriptions':
                    const subscriptions = await SaaSBillingService.getAllSubscriptions();
                    setAdminData(prev => ({ ...prev, subscriptions }));
                    break;
                    
                case 'revenue':
                    const revenue = await billingService.getRevenueAnalytics();
                    setAdminData(prev => ({ ...prev, revenue }));
                    break;
                    
                case 'usage':
                    const usage = await billingService.getSystemUsageStats();
                    setAdminData(prev => ({ ...prev, usage }));
                    break;
            }
        } catch (error) {
            console.error('Error loading admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserAction = async (userId, action, data = {}) => {
        try {
            setLoading(true);
            
            switch (action) {
                case 'suspend':
                    await billingService.suspendUser(userId);
                    break;
                case 'reactivate':
                    await billingService.reactivateUser(userId);
                    break;
                case 'change_plan':
                    await billingService.adminChangePlan(userId, data.planType);
                    break;
                case 'add_credits':
                    await billingService.addCredits(userId, data.credits);
                    break;
                case 'reset_usage':
                    await billingService.resetUserUsage(userId);
                    break;
            }
            
            await loadAdminData();
        } catch (error) {
            console.error('Error performing user action:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US').format(num || 0);
    };

    const getPlanColor = (planType) => {
        const colors = {
            free: '#6B7280',
            premium: '#3B82F6',
            enterprise: '#7C3AED',
            custom: '#F59E0B'
        };
        return colors[planType] || '#6B7280';
    };

    if (loading && !adminData.overview) {
        return (
            <div className="admin-panel loading">
                <div className="loading-spinner"></div>
                <p>Loading admin panel...</p>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <h1>SaaS Admin Panel</h1>
                <div className="admin-tabs">
                    {['overview', 'users', 'subscriptions', 'revenue', 'usage'].map(tab => (
                        <button
                            key={tab}
                            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && adminData.overview && (
                <div className="tab-content">
                    <div className="overview-grid">
                        <div className="metric-card">
                            <div className="metric-icon">👥</div>
                            <div className="metric-content">
                                <h3>Total Users</h3>
                                <div className="metric-value">{formatNumber(adminData.overview.total_users)}</div>
                                <div className="metric-change positive">
                                    +{adminData.overview.new_users_this_month} this month
                                </div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">💳</div>
                            <div className="metric-content">
                                <h3>Active Subscriptions</h3>
                                <div className="metric-value">{formatNumber(adminData.overview.active_subscriptions)}</div>
                                <div className="metric-change positive">
                                    {((adminData.overview.active_subscriptions / adminData.overview.total_users) * 100).toFixed(1)}% conversion
                                </div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">💰</div>
                            <div className="metric-content">
                                <h3>Monthly Revenue</h3>
                                <div className="metric-value">{formatCurrency(adminData.overview.monthly_revenue)}</div>
                                <div className="metric-change positive">
                                    +{adminData.overview.revenue_growth?.toFixed(1)}% vs last month
                                </div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">📊</div>
                            <div className="metric-content">
                                <h3>API Calls Today</h3>
                                <div className="metric-value">{formatNumber(adminData.overview.api_calls_today)}</div>
                                <div className="metric-change">
                                    {formatNumber(adminData.overview.avg_daily_calls)} avg daily
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overview-charts">
                        <div className="chart-card">
                            <h3>Plan Distribution</h3>
                    <div className="plan-distribution">
                        {Object.entries(adminData.overview.plan_distribution || {}).map(([plan, count]) => (
                            <div key={plan} className="plan-item">
                                <div className="plan-bar">
                                    <div 
                                        className="plan-fill"
                                        style={{ 
                                            width: `${(count / adminData.overview.total_users) * 100}%`,
                                            backgroundColor: getPlanColor(plan)
                                        }}
                                    ></div>
                                </div>
                                <div className="plan-info">
                                    <span className="plan-name">{plan.toUpperCase()}</span>
                                    <span className="plan-count">{count} users</span>
                                </div>
                            </div>
                        ))}
                    </div>
                        </div>

                        <div className="chart-card">
                            <h3>Revenue Trend (Last 7 Days)</h3>
                            <div className="revenue-chart">
                                {adminData.overview.daily_revenue?.map((day, index) => {
                                    const maxRevenue = Math.max(...adminData.overview.daily_revenue.map(d => d.amount));
                                    const height = (day.amount / maxRevenue) * 100;
                                    return (
                                        <div key={index} className="revenue-bar-container">
                                            <div 
                                                className="revenue-bar"
                                                style={{ height: `${height}%` }}
                                                title={`${day.date}: ${formatCurrency(day.amount)}`}
                                            ></div>
                                            <span className="revenue-label">
                                                {new Date(day.date).toLocaleDateString('en-US', { 
                                                    weekday: 'short' 
                                                })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="tab-content">
                    <div className="table-header">
                        <h3>User Management</h3>
                        <div className="table-filters">
                            <select>
                                <option value="">All Plans</option>
                                <option value="free">Free</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                                <option value="custom">Custom</option>
                            </select>
                            <input type="search" placeholder="Search users..." />
                        </div>
                    </div>
                    <div className="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Plan</th>
                                    <th>Usage</th>
                                    <th>Revenue</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adminData.users.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="user-info">
                                                <div className="user-avatar">
                                                    {user.email?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="user-name">{user.email}</div>
                                                    <div className="user-id">ID: {user.id.slice(0, 8)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span 
                                                className="plan-badge"
                                                style={{ backgroundColor: getPlanColor(user.plan_type) }}
                                            >
                                                {user.plan_type?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="usage-info">
                                                <div>{formatNumber(user.current_usage)} calls</div>
                                                <div className="usage-limit">
                                                    / {formatNumber(user.usage_limit)} limit
                                                </div>
                                            </div>
                                        </td>
                                        <td>{formatCurrency(user.lifetime_value)}</td>
                                        <td>
                                            <span className={`status-badge ${user.status}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button 
                                                    className="btn-small"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowUserModal(true);
                                                    }}
                                                >
                                                    Manage
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Subscriptions Tab */}
            {activeTab === 'subscriptions' && (
                <div className="tab-content">
                    <div className="table-header">
                        <h3>Subscription Management</h3>
                    </div>
                    <div className="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Subscription ID</th>
                                    <th>User</th>
                                    <th>Plan</th>
                                    <th>Status</th>
                                    <th>Revenue</th>
                                    <th>Next Billing</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adminData.subscriptions.map(sub => (
                                    <tr key={sub.id}>
                                        <td className="mono">{sub.id.slice(0, 8)}</td>
                                        <td>{sub.user_email}</td>
                                        <td>
                                            <span 
                                                className="plan-badge"
                                                style={{ backgroundColor: getPlanColor(sub.plan_type) }}
                                            >
                                                {sub.plan_type?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${sub.status}`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td>{formatCurrency(sub.monthly_revenue)}</td>
                                        <td>{new Date(sub.next_billing_date).toLocaleDateString()}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn-small">Edit</button>
                                                <button className="btn-small danger">Cancel</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Revenue Tab */}
            {activeTab === 'revenue' && adminData.revenue && (
                <div className="tab-content">
                    <div className="revenue-overview">
                        <div className="revenue-metrics">
                            <div className="revenue-card">
                                <h3>Total Revenue</h3>
                                <div className="revenue-value">{formatCurrency(adminData.revenue.total)}</div>
                            </div>
                            <div className="revenue-card">
                                <h3>This Month</h3>
                                <div className="revenue-value">{formatCurrency(adminData.revenue.this_month)}</div>
                            </div>
                            <div className="revenue-card">
                                <h3>Last Month</h3>
                                <div className="revenue-value">{formatCurrency(adminData.revenue.last_month)}</div>
                            </div>
                            <div className="revenue-card">
                                <h3>Growth</h3>
                                <div className="revenue-value positive">
                                    +{adminData.revenue.growth?.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Usage Tab */}
            {activeTab === 'usage' && adminData.usage && (
                <div className="tab-content">
                    <div className="usage-overview">
                        <div className="usage-metrics">
                            <div className="usage-card">
                                <h3>Total API Calls</h3>
                                <div className="usage-value">{formatNumber(adminData.usage.total_calls)}</div>
                            </div>
                            <div className="usage-card">
                                <h3>Today</h3>
                                <div className="usage-value">{formatNumber(adminData.usage.calls_today)}</div>
                            </div>
                            <div className="usage-card">
                                <h3>This Month</h3>
                                <div className="usage-value">{formatNumber(adminData.usage.calls_this_month)}</div>
                            </div>
                            <div className="usage-card">
                                <h3>Average Response Time</h3>
                                <div className="usage-value">{adminData.usage.avg_response_time}ms</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* User Management Modal */}
            {showUserModal && selectedUser && (
                <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
                    <div className="user-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Manage User: {selectedUser.email}</h3>
                            <button 
                                className="modal-close"
                                onClick={() => setShowUserModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-content">
                            <div className="user-actions">
                                <button
                                    className="action-btn"
                                    onClick={() => handleUserAction(selectedUser.id, 'change_plan', { planType: 'premium' })}
                                >
                                    Upgrade to Premium
                                </button>
                                <button
                                    className="action-btn"
                                    onClick={() => handleUserAction(selectedUser.id, 'add_credits', { credits: 1000 })}
                                >
                                    Add 1000 Credits
                                </button>
                                <button
                                    className="action-btn"
                                    onClick={() => handleUserAction(selectedUser.id, 'reset_usage')}
                                >
                                    Reset Usage
                                </button>
                                <button
                                    className="action-btn danger"
                                    onClick={() => handleUserAction(selectedUser.id, 'suspend')}
                                >
                                    Suspend User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaaSAdminPanel;
