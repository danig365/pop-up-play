import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptions = await base44.entities.UserSubscription.filter({
      user_email: user.email
    });

    if (subscriptions.length === 0 || !subscriptions[0].stripe_subscription_id) {
      return Response.json({ error: 'No subscription found' }, { status: 404 });
    }

    const subscription = subscriptions[0];

    // Cancel at period end in Stripe
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Cancel error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});