import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if subscription is enabled
    const settings = await base44.entities.SubscriptionSettings.list();
    if (!settings || settings.length === 0) {
      return Response.json({ 
        required: false,
        hasAccess: true
      });
    }

    // Get the most recently updated settings (in case there are multiple records)
    const setting = settings.sort((a: any, b: any) => 
      new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime()
    )[0];

    if (!setting.subscription_enabled) {
      return Response.json({ 
        required: false,
        hasAccess: true
      });
    }

    // Check user subscription
    const subscriptions = await base44.entities.UserSubscription.filter({
      user_email: user.email
    });

    if (subscriptions.length === 0) {
      // No subscription - check if trial is enabled
      if (setting.free_trial_enabled) {
        // Create trial subscription
        const trialStart = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + (setting.trial_days || 30));

        await base44.entities.UserSubscription.create({
          user_email: user.email,
          status: 'trial',
          trial_start: trialStart.toISOString(),
          trial_end: trialEnd.toISOString()
        });

        return Response.json({
          required: true,
          hasAccess: true,
          status: 'trial',
          trialEnd: trialEnd.toISOString()
        });
      } else {
        return Response.json({
          required: true,
          hasAccess: false,
          status: 'none'
        });
      }
    }

    const subscription = subscriptions[0];

    // Check if trial has expired
    if (subscription.status === 'trial') {
      const trialEnd = new Date(subscription.trial_end);
      const now = new Date();

      if (now > trialEnd) {
        await base44.entities.UserSubscription.update(subscription.id, {
          status: 'expired'
        });
        return Response.json({
          required: true,
          hasAccess: false,
          status: 'expired',
          trialEnd: subscription.trial_end
        });
      }

      return Response.json({
        required: true,
        hasAccess: true,
        status: 'trial',
        trialEnd: subscription.trial_end
      });
    }

    // Check active subscription
    const hasAccess = subscription.status === 'active';

    return Response.json({
      required: true,
      hasAccess,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end
    });
  } catch (error) {
    console.error('Get status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});