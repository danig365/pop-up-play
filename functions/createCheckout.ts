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

    // Get subscription settings
    const settings = await base44.entities.SubscriptionSettings.list();
    if (!settings || settings.length === 0) {
      return Response.json({ error: 'Subscription not configured' }, { status: 400 });
    }

    const setting = settings[0];

    // Check if user already has subscription
    const existingSubs = await base44.entities.UserSubscription.filter({
      user_email: user.email
    });

    let customerId;
    if (existingSubs.length > 0 && existingSubs[0].stripe_customer_id) {
      customerId = existingSubs[0].stripe_customer_id;
    } else {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_email: user.email,
          user_id: user.id
        }
      });
      customerId = customer.id;
    }

    const appHost = req.headers.get('origin') || 'https://yourapp.base44.io';
    
    // Create checkout session
    const sessionParams = {
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: setting.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${appHost}/#/SubscriptionSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appHost}/#/Pricing`,
      metadata: {
        user_email: user.email,
        user_id: user.id
      }
    };

    // Add trial if enabled and user doesn't have existing subscription
    if (setting.free_trial_enabled && existingSubs.length === 0) {
      sessionParams.subscription_data = {
        trial_period_days: setting.trial_days || 30
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});