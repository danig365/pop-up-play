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

    // Check active subscription - also check if end_date has passed (for access codes)
    if (subscription.status === 'active') {
      const now = new Date();
      const endDate = subscription.end_date ? new Date(subscription.end_date) : null;

      // If subscription has an end_date and it has passed, mark as expired
      if (endDate && now > endDate) {
        console.log('Subscription expired:', subscription.id);
        
        // Update subscription status to expired
        await base44.asServiceRole.entities.UserSubscription.update(subscription.id, {
          status: 'expired'
        });

        // Auto pop-down user if they're popped up
        try {
          const profiles = await base44.asServiceRole.entities.UserProfile.filter({
            user_email: user.email
          });
          
          if (profiles.length > 0 && profiles[0].is_popped_up) {
            await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
              is_popped_up: false,
              popup_message: ''
            });
            console.log('Auto pop-down for expired subscription:', user.email);
          }
        } catch (popdownError) {
          console.warn('Error auto pop-down for expired subscription:', popdownError.message);
        }

        return Response.json({
          required: true,
          hasAccess: false,
          status: 'expired',
          endDate: subscription.end_date
        });
      }

      // Subscription is still active and not expired
      return Response.json({
        required: true,
        hasAccess: true,
        status: 'active',
        endDate: subscription.end_date,
        currentPeriodEnd: subscription.end_date
      });
    }

    // Any other status (inactive, expired, etc.)
    return Response.json({
      required: true,
      hasAccess: false,
      status: subscription.status
    });
  } catch (error) {
    console.error('Get status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});