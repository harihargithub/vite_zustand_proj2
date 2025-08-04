// src/components/BillingDashboard.jsx
import React, { useState, useEffect } from 'react';
import { SaaSBillingService } from '../services/saasBilling';
import { useAuthStore } from '../store/authStore';
import './BillingDashboard.css';

const BillingDashboard = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState(null);
    const [usage, setUsage] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [billingHistory, setBillingHistory] = useState([]);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

    const billingService = new SaaSBillingService();

    useEffect(() => {
        if (user?.id) {
            loadBillingData();
        }
    }, [user]);

    const loadBillingData = async () => {
        try {
            setLoading(true);
            
            // Load subscription details
            const subData = await billingService.getUserSubscription(user.id);
            setSubscription(subData);

            // Load current usage
            const usageData = await billingService.getCurrentUsage(user.id);
            setUsage(usageData);

            // Load invoices
            const invoiceData = await billingService.getUserInvoices(user.id);
            setInvoices(invoiceData);

            // Load billing history
            const historyData = await billingService.getBillingHistory(user.id);
            setBillingHistory(historyData);

        } catch (error) {
            console.error('Error loading billing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgradePlan = async (planType) => {
        try {
            setLoading(true);
            
            if (subscription) {
                await billingService.updateSubscription(subscription.id, {
                    plan_type: planType,
                    updated_at: new Date().toISOString()
                });
            } else {
                await billingService.createSubscription(user.id, planType);
            }
            
            await loadBillingData();
            setShowUpgradeModal(false);
        } catch (error) {
            console.error('Error upgrading plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!subscription) return;
        
        if (window.confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
            try {
                setLoading(true);
                await billingService.cancelSubscription(subscription.id);
                await loadBillingData();
            } catch (error) {
                console.error('Error canceling subscription:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const getUsagePercentage = () => {
        if (!usage || !subscription) return 0;
        const planLimits = billingService.getPlanLimits(subscription.plan_type);
        return Math.min((usage.api_calls / planLimits.api_calls_limit) * 100, 100);
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

    if (loading) {
        return (
            <div className="billing-dashboard loading">
                <div className="loading-spinner"></div>
                <p>Loading billing information...</p>
            </div>
        );
    }

    return (
        <div className="billing-dashboard">
            <div className="billing-header">
                <h2>Billing & Subscription</h2>
                <div className="billing-actions">
                    <button 
                        className="btn-upgrade"
                        onClick={() => setShowUpgradeModal(true)}
                    >
                        Upgrade Plan
                    </button>
                </div>
            </div>

            {/* Current Plan Card */}
            <div className="billing-card current-plan">
                <div className="card-header">
                    <h3>Current Plan</h3>
                    {subscription && (
                        <span 
                            className={`plan-badge ${subscription.plan_type}`}
                            style={{ backgroundColor: getPlanColor(subscription.plan_type) }}
                        >
                            {subscription.plan_type.toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="card-content">
                    {subscription ? (
                        <>
                            <div className="plan-details">
                                <div className="plan-info">
                                    <h4>{subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)} Plan</h4>
                                    <p className="plan-price">
                                        ${billingService.getPlanLimits(subscription.plan_type).price}/month
                                    </p>
                                    <p className="plan-limits">
                                        {billingService.getPlanLimits(subscription.plan_type).api_calls_limit.toLocaleString()} API calls included
                                    </p>
                                </div>
                                <div className="plan-status">
                                    <span className={`status-badge ${subscription.status}`}>
                                        {subscription.status}
                                    </span>
                                    <p className="billing-cycle">
                                        Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            {subscription.plan_type !== 'free' && (
                                <button 
                                    className="btn-cancel"
                                    onClick={handleCancelSubscription}
                                >
                                    Cancel Subscription
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="no-subscription">
                            <p>No active subscription found</p>
                            <button 
                                className="btn-subscribe"
                                onClick={() => setShowUpgradeModal(true)}
                            >
                                Choose Plan
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Usage Card */}
            <div className="billing-card usage-card">
                <div className="card-header">
                    <h3>Usage This Month</h3>
                    <span className="usage-period">
                        Billing period: {subscription ? 
                            new Date(subscription.current_period_start).toLocaleDateString() : 
                            'N/A'
                        } - {subscription ?
                            new Date(subscription.current_period_end).toLocaleDateString() :
                            'N/A'
                        }
                    </span>
                </div>
                <div className="card-content">
                    {usage && subscription ? (
                        <>
                            <div className="usage-stats">
                                <div className="usage-metric">
                                    <span className="metric-value">{usage.api_calls?.toLocaleString() || 0}</span>
                                    <span className="metric-label">API Calls Used</span>
                                </div>
                                <div className="usage-metric">
                                    <span className="metric-value">
                                        {billingService.getPlanLimits(subscription.plan_type).api_calls_limit.toLocaleString()}
                                    </span>
                                    <span className="metric-label">Monthly Limit</span>
                                </div>
                                <div className="usage-metric">
                                    <span className="metric-value">${usage.overage_charges?.toFixed(2) || '0.00'}</span>
                                    <span className="metric-label">Overage Charges</span>
                                </div>
                            </div>
                            <div className="usage-progress">
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill"
                                        style={{ 
                                            width: `${getUsagePercentage()}%`,
                                            backgroundColor: getUsagePercentage() > 90 ? '#EF4444' : 
                                                          getUsagePercentage() > 75 ? '#F59E0B' : '#10B981'
                                        }}
                                    ></div>
                                </div>
                                <span className="progress-text">
                                    {getUsagePercentage().toFixed(1)}% of monthly quota used
                                </span>
                            </div>
                        </>
                    ) : (
                        <p>No usage data available</p>
                    )}
                </div>
            </div>

            {/* Billing History */}
            <div className="billing-card billing-history">
                <div className="card-header">
                    <h3>Billing History</h3>
                </div>
                <div className="card-content">
                    {billingHistory.length > 0 ? (
                        <div className="history-table">
                            <div className="table-header">
                                <span>Date</span>
                                <span>Description</span>
                                <span>Amount</span>
                                <span>Status</span>
                            </div>
                            {billingHistory.map((record, index) => (
                                <div key={index} className="table-row">
                                    <span>{new Date(record.created_at).toLocaleDateString()}</span>
                                    <span>{record.description}</span>
                                    <span>${record.amount.toFixed(2)}</span>
                                    <span className={`status-badge ${record.status}`}>
                                        {record.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No billing history available</p>
                    )}
                </div>
            </div>

            {/* Upgrade Modal */}
            {showUpgradeModal && (
                <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
                    <div className="upgrade-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Choose Your Plan</h3>
                            <button 
                                className="modal-close"
                                onClick={() => setShowUpgradeModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="plans-grid">
                            {Object.entries(billingService.PRICING_PLANS).map(([planType, plan]) => (
                                <div 
                                    key={planType}
                                    className={`plan-option ${subscription?.plan_type === planType ? 'current' : ''}`}
                                >
                                    <h4>{plan.name}</h4>
                                    <div className="plan-price-large">
                                        <span className="currency">$</span>
                                        <span className="amount">{plan.price}</span>
                                        <span className="period">/month</span>
                                    </div>
                                    <ul className="plan-features">
                                        <li>{plan.api_calls_limit.toLocaleString()} API calls/month</li>
                                        <li>{plan.features.priority_support ? 'Priority support' : 'Standard support'}</li>
                                        <li>{plan.features.overage_allowed ? 'Overage billing available' : 'No overage billing'}</li>
                                        {plan.features.custom_integrations && <li>Custom integrations</li>}
                                        {plan.features.dedicated_support && <li>Dedicated account manager</li>}
                                    </ul>
                                    {subscription?.plan_type !== planType && (
                                        <button 
                                            className="btn-select-plan"
                                            onClick={() => handleUpgradePlan(planType)}
                                            disabled={loading}
                                        >
                                            {subscription ? 'Switch to this plan' : 'Select Plan'}
                                        </button>
                                    )}
                                    {subscription?.plan_type === planType && (
                                        <span className="current-plan-label">Current Plan</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingDashboard;
