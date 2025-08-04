// src/services/saasBilling.js
import { supabase } from '../store/supaStore';

export class SaaSBillingService {
  
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
