// src/services/saasBilling.js
import { supabase } from '../store/supaStore';

export class SaaSBillingService {
  // Legacy: get all subscriptions (enriched)
  static async getAllSubscriptions() {
    // Fetch all subscriptions
    const { data: subscriptions } = await supabase.from('subscriptions').select('*');
    // Fetch all users
    const { data: users } = await supabase.from('profiles').select('*');
    // Fetch all usage
    const { data: usage } = await supabase.from('billing_usage').select('*');

    // Enrich subscriptions for dashboard
    const enrichedSubscriptions = (subscriptions || []).map(sub => {
      const user = users?.find(u => u.id === sub.user_id);
      const usageRow = usage?.find(us => us.subscription_id === sub.id);
      return {
        id: sub.id,
        user_id: sub.user_id,
        user_email: user?.email || '',
        plan_type: sub.plan_id,
        status: sub.status,
        monthly_revenue: usageRow?.total_amount || 0,
        next_billing_date: sub.current_period_end || '',
      };
    });
    return enrichedSubscriptions;
  }
  // Legacy: get all users (enriched)
  static async getAllUsers() {
    // Log session info for RLS troubleshooting
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('[getAllUsers] Supabase session:', sessionData, 'Session error:', sessionError);

    // Fetch all users
    const { data: users, error: userError } = await supabase.from('profiles').select('*');
    console.log('[getAllUsers] users:', users, 'User error:', userError);
    // Fetch all subscriptions
    const { data: subscriptions, error: subError } = await supabase.from('subscriptions').select('*');
    // Fetch all usage
    const { data: usage, error: usageError } = await supabase.from('billing_usage').select('*');

    // DEBUG: Log all fetched data and errors
    console.log('[getAllUsers] subscriptions:', subscriptions, 'Sub error:', subError);
    console.log('[getAllUsers] usage:', usage, 'Usage error:', usageError);

    const enrichedUsers = (users || []).map(u => {
      // Find any subscription for the user (active or not)
      const sub = subscriptions?.find(s => s.user_id === u.id);
      const usageRow = usage?.find(us => us.user_id === u.id);
      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        plan_type: sub?.plan_id || u.tier || 'free',
        current_usage: usageRow?.api_calls_used || 0,
        usage_limit: sub ? (this.pricingPlans[sub.plan_id]?.monthly_api_calls || 0) : (this.pricingPlans[u.tier]?.monthly_api_calls || 0),
        lifetime_value: usageRow?.total_amount || 0,
        status: sub?.status || 'inactive',
        role: u.role || 'authenticated'
      };
    });
    console.log('[getAllUsers] enrichedUsers:', enrichedUsers);
    return enrichedUsers;
  }
  // Admin overview aggregation for dashboard
  static async getAdminOverview() {
    // Fetch all users
    const { data: users, error: userError } = await supabase.from('profiles').select('*');
    // Fetch all subscriptions
    const { data: subscriptions, error: subError } = await supabase.from('subscriptions').select('*');
    // Fetch all usage
    const { data: usage, error: usageError } = await supabase.from('billing_usage').select('*');

    // DEBUG LOG: include user role
    if (users && Array.isArray(users)) {
      users.forEach(u => {
        console.log('[getAdminOverview] user:', {
          id: u.id,
          email: u.email,
          role: u.role || '(no role field)'
        });
      });
    }

    // Aggregate plan counts
    const planCounts = subscriptions?.reduce((acc, sub) => {
      acc[sub.plan_id] = (acc[sub.plan_id] || 0) + 1;
      return acc;
    }, {});

    // Aggregate revenue
    const totalRevenue = usage?.reduce((sum, u) => sum + (u.total_amount || 0), 0) || 0;
    // Active subscriptions
    const activeSubs = subscriptions?.filter(sub => sub.status === 'active') || [];

    // Usage by user
    const usageByUser = usage?.reduce((acc, u) => {
      acc[u.user_id] = (acc[u.user_id] || 0) + (u.api_calls_used || 0);
      return acc;
    }, {});

    // Revenue by user
    const revenueByUser = usage?.reduce((acc, u) => {
      acc[u.user_id] = (acc[u.user_id] || 0) + (u.total_amount || 0);
      return acc;
    }, {});

    // Compose overview with frontend-expected fields
    // Calculate API calls today (filter by today's date)
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const todayStr = `${dd}-${mm}-${yyyy}`;
    const apiCallsToday = usage?.filter(u => u.period_start === todayStr).reduce((sum, u) => sum + (u.api_calls_used || 0), 0) || 0;

    // Calculate new users this month
    const monthStr = `${yyyy}-${mm}`;
    const newUsersThisMonth = users?.filter(u => (u.created_at || '').startsWith(monthStr)).length || 0;

    // Calculate average daily calls (simple average over all usage rows)
    const avgDailyCalls = usage && usage.length > 0 ? Math.round(usage.reduce((sum, u) => sum + (u.api_calls_used || 0), 0) / usage.length) : 0;

    // Dummy revenue growth and daily revenue trend
    const revenueGrowth = 0; // Implement logic if needed
    const dailyRevenue = [];

    // Enrich users for dashboard
    const enrichedUsers = (users || []).map(u => {
      const sub = subscriptions?.find(s => s.user_id === u.id && s.status === 'active');
      const usageRow = usage?.find(us => us.user_id === u.id);
      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        plan_type: sub?.plan_id || u.tier || 'free',
        current_usage: usageRow?.api_calls_used || 0,
        usage_limit: sub ? (this.pricingPlans[sub.plan_id]?.monthly_api_calls || 0) : (this.pricingPlans[u.tier]?.monthly_api_calls || 0),
        lifetime_value: usageRow?.total_amount || 0,
        status: sub?.status || 'inactive',
        role: u.role || 'authenticated'
      };
    });

    // Enrich subscriptions for dashboard
    const enrichedSubscriptions = (subscriptions || []).map(sub => {
      const user = users?.find(u => u.id === sub.user_id);
      const usageRow = usage?.find(us => us.subscription_id === sub.id);
      return {
        id: sub.id,
        user_id: sub.user_id,
        user_email: user?.email || '',
        plan_type: sub.plan_id,
        status: sub.status,
        monthly_revenue: usageRow?.total_amount || 0,
        next_billing_date: sub.current_period_end || '',
      };
    });

    return {
      total_users: users?.length || 0,
      active_subscriptions: activeSubs.length,
      monthly_revenue: totalRevenue,
      api_calls_today: apiCallsToday,
      plan_distribution: planCounts || {},
      new_users_this_month: newUsersThisMonth,
      revenue_growth: revenueGrowth,
      avg_daily_calls: avgDailyCalls,
      daily_revenue: dailyRevenue,
      users: enrichedUsers,
      subscriptions: enrichedSubscriptions,
      usage: usage || [],
      errors: { userError, subError, usageError }
    };
  }
  
  // Pricing plans configuration
  static pricingPlans = {
    free: {
      name: 'Free Starter',
      price: 0,
      monthly_api_calls: 1000,
      features: ['Basic API access', 'Standard support', 'Community forum'],
      overage_rate: 0.01, // $0.01 per extra call
      providers: ['hotelbeds']
    },
    premium: {
      name: 'Professional',
      price: 49,
      monthly_api_calls: 10000,
      features: ['Priority queue', 'Advanced analytics', 'Email support', 'All providers'],
      overage_rate: 0.008,
      providers: ['hotelbeds', 'amadeus', 'expedia']
    },
    enterprise: {
      name: 'Enterprise',
      price: 199,
      monthly_api_calls: 50000,
      features: ['Dedicated support', 'Custom integrations', 'SLA guarantee', 'Priority processing'],
      overage_rate: 0.005,
      providers: ['hotelbeds', 'amadeus', 'expedia', 'custom']
    },
    custom: {
      name: 'Custom Enterprise',
      price: 'contact_sales',
      monthly_api_calls: 'unlimited',
      features: ['White-label', 'On-premise deployment', 'Custom SLA', 'Dedicated infrastructure'],
      overage_rate: 'negotiated',
      providers: ['all']
    }
  };

  // Check user's subscription and quota
  static async checkSubscriptionQuota(userId, apiProvider, requestType) {
    try {
      // Get user's active subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          billing_usage (
            api_calls_used,
            overage_charges,
            total_amount,
            status
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (subError || !subscription) {
        return { 
          allowed: false, 
          reason: 'No active subscription',
          needsUpgrade: true,
          suggestedPlan: 'premium'
        };
      }

      // Get current billing period usage
      const currentPeriod = this.getCurrentBillingPeriod(subscription.billing_cycle);
      const { data: currentUsage } = await supabase
        .from('billing_usage')
        .select('*')
        .eq('subscription_id', subscription.id)
        .eq('period_start', currentPeriod.start)
        .single();

      const plan = this.pricingPlans[subscription.plan_id];
      if (!plan) {
        return { allowed: false, reason: 'Invalid subscription plan' };
      }

      // Check provider access
      if (!plan.providers.includes(apiProvider) && !plan.providers.includes('all')) {
        return {
          allowed: false,
          reason: `${apiProvider} not available in ${plan.name} plan`,
          needsUpgrade: true,
          suggestedPlan: this.getSuggestedPlan(apiProvider)
        };
      }

      const usedCalls = currentUsage?.api_calls_used || 0;
      const monthlyLimit = plan.monthly_api_calls;

      // Check if within quota
      if (typeof monthlyLimit === 'number' && usedCalls >= monthlyLimit) {
        // Check overage policy
        if (plan.overage_rate && typeof plan.overage_rate === 'number') {
          return {
            allowed: true,
            overage: true,
            overageRate: plan.overage_rate,
            currentUsage: usedCalls,
            monthlyLimit: monthlyLimit,
            overageAmount: (usedCalls - monthlyLimit + 1) * plan.overage_rate
          };
        } else {
          return {
            allowed: false,
            reason: 'Monthly quota exceeded',
            currentUsage: usedCalls,
            monthlyLimit: monthlyLimit,
            needsUpgrade: true,
            suggestedPlan: this.getNextTierPlan(subscription.plan_id)
          };
        }
      }

      return {
        allowed: true,
        subscription: subscription,
        currentUsage: usedCalls,
        monthlyLimit: monthlyLimit,
        remaining: typeof monthlyLimit === 'number' ? monthlyLimit - usedCalls : 'unlimited',
        plan: plan
      };

    } catch (error) {
      console.error('Error checking subscription quota:', error);
      return { allowed: false, error: error.message };
    }
  }

  // Usage Analytics for dashboard
  static async getUsageAnalytics(userId, timeRange = '30d') {
    // Aggregate usage over a time range (default last 30 days)
    // Supabase data uses DD-MM-YYYY format, so generate date strings accordingly
    const days = parseInt(timeRange.replace(/\D/g, '')) || 30;
    const now = new Date();
    const dateList = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      dateList.push(`${dd}-${mm}-${yyyy}`);
    }
    console.log('[getUsageAnalytics] userId:', userId, 'dateList:', dateList);
    const { data: usageRows, error: usageError } = await supabase
      .from('user_usage')
      .select('date, search_requests, booking_requests, tier')
      .eq('user_id', userId)
      .in('date', dateList);
    console.log('[getUsageAnalytics] usageRows:', usageRows, 'error:', usageError);

    // Sum search and booking requests
    const total_calls = usageRows ? usageRows.reduce((sum, u) => sum + (u.search_requests || 0), 0) : 0;
    const total_bookings = usageRows ? usageRows.reduce((sum, u) => sum + (u.booking_requests || 0), 0) : 0;
    // Growth calculation (compare last day vs previous day)
    let calls_growth = 0;
    if (usageRows && usageRows.length > 1) {
      const sorted = usageRows.sort((a, b) => dateList.indexOf(a.date) - dateList.indexOf(b.date));
      const last = sorted[0]?.search_requests || 0;
      const prev = sorted[1]?.search_requests || 0;
      calls_growth = last - prev;
    }

    const { data: billingRows, error: billingError } = await supabase
      .from('billing_usage')
      .select('total_amount')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(1);
    console.log('[getUsageAnalytics] billingRows:', billingRows, 'error:', billingError);

    return {
      total_calls,
      total_bookings,
      calls_growth,
      total_cost: billingRows?.[0]?.total_amount || 0,
      cost_growth: 0,
      avg_response_time: 100, // Placeholder
      response_time_change: 0,
      success_rate: 100, // Placeholder
      success_rate_change: 0,
      daily_usage: usageRows ? usageRows.map(u => ({ date: u.date, calls: u.search_requests })) : []
    };
  }

  static async getAPIUsageBreakdown(userId, timeRange = '30d') {
    // Aggregate breakdown by provider over time range
    const days = parseInt(timeRange.replace(/\D/g, '')) || 30;
    const now = new Date();
    const dateList = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      dateList.push(`${dd}-${mm}-${yyyy}`);
    }
    console.log('[getAPIUsageBreakdown] userId:', userId, 'dateList:', dateList);
    const { data: usageRows, error: usageError } = await supabase
      .from('user_usage')
      .select('api_provider, search_requests, date')
      .eq('user_id', userId)
      .in('date', dateList);
    console.log('[getAPIUsageBreakdown] usageRows:', usageRows, 'error:', usageError);

    const breakdown = {};
    usageRows?.forEach(row => {
      if (!breakdown[row.api_provider]) {
        breakdown[row.api_provider] = { calls: 0, cost: 0, avg_time: 100, success_rate: 100 };
      }
      breakdown[row.api_provider].calls += row.search_requests || 0;
    });
    return breakdown;
  }

  static async getUsagePredictions(userId) {
    // Example: stub predictions
    return {
      month_prediction: 1,
      next_month_prediction: 2,
      estimated_cost: 0,
      month_confidence: 100,
      next_month_confidence: 100,
      overage_risk: 0
    };
  }

  static async getUsageAlerts(userId) {
    // Example: stub alerts
    return [];
  }


  // Record billable usage
  static async recordBillableUsage(userId, apiProvider, requestType, cost = 0) {
    try {
      // Get active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Get or create current billing period usage
      const currentPeriod = this.getCurrentBillingPeriod(subscription.billing_cycle);
      
      const { data: existingUsage } = await supabase
        .from('billing_usage')
        .select('*')
        .eq('subscription_id', subscription.id)
        .eq('period_start', currentPeriod.start)
        .single();

      if (existingUsage) {
        // Update existing usage
        const plan = this.pricingPlans[subscription.plan_id];
        const newUsage = existingUsage.api_calls_used + 1;
        const isOverage = newUsage > plan.monthly_api_calls;
        const overageCharge = isOverage ? plan.overage_rate : 0;

        await supabase
          .from('billing_usage')
          .update({
            api_calls_used: newUsage,
            overage_charges: existingUsage.overage_charges + overageCharge,
            total_amount: existingUsage.total_amount + cost + overageCharge
          })
          .eq('id', existingUsage.id);
      } else {
        // Create new usage record
        await supabase
          .from('billing_usage')
          .insert({
            user_id: userId,
            subscription_id: subscription.id,
            period_start: currentPeriod.start,
            period_end: currentPeriod.end,
            api_calls_used: 1,
            overage_charges: 0,
            total_amount: cost,
            status: 'pending'
          });
      }

      return { success: true };
    } catch (error) {
      console.error('Error recording billable usage:', error);
      return { success: false, error: error.message };
    }
  }

  // Create new subscription
  static async createSubscription(userId, planId, stripeSubscriptionId = null) {
    try {
      const plan = this.pricingPlans[planId];
      if (!plan) {
        throw new Error('Invalid plan ID');
      }

      const currentPeriod = this.getCurrentBillingPeriod('monthly');
      
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: currentPeriod.start,
          current_period_end: currentPeriod.end,
          stripe_subscription_id: stripeSubscriptionId
        })
        .select()
        .single();

      if (error) throw error;

      // Update user profile with new tier
      await supabase
        .from('profiles')
        .upsert({
          id: userId,
          tier: planId,
          api_access: true,
          daily_quota: plan.monthly_api_calls / 30 // Approximate daily quota
        });

      return { success: true, subscription: data };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Upgrade subscription
  static async upgradeSubscription(userId, newPlanId) {
    try {
      const { data: currentSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!currentSub) {
        throw new Error('No active subscription found');
      }

      // Update subscription
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan_id: newPlanId,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSub.id);

      if (error) throw error;

      // Update user profile
      const newPlan = this.pricingPlans[newPlanId];
      await supabase
        .from('profiles')
        .update({
          tier: newPlanId,
          daily_quota: newPlan.monthly_api_calls / 30
        })
        .eq('id', userId);

      return { success: true };
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancel subscription
  static async cancelSubscription(userId) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;

      // Downgrade to free tier
      await supabase
        .from('profiles')
        .update({
          tier: 'free',
          daily_quota: 100
        })
        .eq('id', userId);

      return { success: true };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Get billing history
  static async getBillingHistory(userId, limit = 12) {
    try {
      const { data, error } = await supabase
        .from('billing_usage')
        .select(`
          *,
          subscriptions (
            plan_id,
            billing_cycle
          )
        `)
        .eq('user_id', userId)
        .order('period_start', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching billing history:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate monthly revenue
  static async calculateMonthlyRevenue() {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      const { data, error } = await supabase
        .from('billing_usage')
        .select(`
          total_amount,
          subscriptions (
            plan_id,
            status
          )
        `)
        .gte('period_start', `${currentMonth}-01`)
        .eq('subscriptions.status', 'active');

      if (error) throw error;

      const revenue = data.reduce((total, usage) => total + (usage.total_amount || 0), 0);
      const subscriptionRevenue = data.reduce((total, usage) => {
        const plan = this.pricingPlans[usage.subscriptions?.plan_id];
        return total + (plan?.price || 0);
      }, 0);

      return {
        success: true,
        totalRevenue: revenue + subscriptionRevenue,
        usageRevenue: revenue,
        subscriptionRevenue: subscriptionRevenue,
        activeSubscriptions: data.length
      };
    } catch (error) {
      console.error('Error calculating revenue:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  static getCurrentBillingPeriod(billingCycle = 'monthly') {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (billingCycle === 'monthly') {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      };
    } else if (billingCycle === 'yearly') {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      };
    }
  }

  static getSuggestedPlan(apiProvider) {
    if (apiProvider === 'amadeus' || apiProvider === 'expedia') {
      return 'premium';
    }
    return 'premium';
  }

  static getNextTierPlan(currentPlan) {
    const tiers = ['free', 'premium', 'enterprise', 'custom'];
    const currentIndex = tiers.indexOf(currentPlan);
    return tiers[currentIndex + 1] || 'enterprise';
  }

  // Get user's current subscription
  static async getUserSubscription(userId) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return { success: true, subscription: data };
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return { success: false, error: error.message };
    }
  }
}

export default SaaSBillingService;
