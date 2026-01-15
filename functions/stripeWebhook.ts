import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    const base44 = createClientFromRequest(req);
    
    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userEmail = session.metadata.user_email;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        const subscriptionData = {
          user_email: userEmail,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: subscription.status === 'trialing' ? 'trial' : 'active',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
        };

        if (subscription.trial_start) {
          subscriptionData.trial_start = new Date(subscription.trial_start * 1000).toISOString();
          subscriptionData.trial_end = new Date(subscription.trial_end * 1000).toISOString();
        }

        // Check if subscription exists
        const existing = await base44.asServiceRole.entities.UserSubscription.filter({
          user_email: userEmail
        });

        if (existing.length > 0) {
          await base44.asServiceRole.entities.UserSubscription.update(
            existing[0].id,
            subscriptionData
          );
        } else {
          await base44.asServiceRole.entities.UserSubscription.create(subscriptionData);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userEmail = subscription.metadata.user_email || 
                         (await stripe.customers.retrieve(subscription.customer)).email;

        const existing = await base44.asServiceRole.entities.UserSubscription.filter({
          stripe_subscription_id: subscription.id
        });

        if (existing.length > 0) {
          await base44.asServiceRole.entities.UserSubscription.update(
            existing[0].id,
            {
              status: subscription.status === 'trialing' ? 'trial' : 
                     subscription.status === 'active' ? 'active' :
                     subscription.status === 'canceled' ? 'cancelled' : 'expired',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
            }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        const existing = await base44.asServiceRole.entities.UserSubscription.filter({
          stripe_subscription_id: subscription.id
        });

        if (existing.length > 0) {
          await base44.asServiceRole.entities.UserSubscription.update(
            existing[0].id,
            { status: 'cancelled' }
          );
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});