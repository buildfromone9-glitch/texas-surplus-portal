// Stripe webhook handler. Keep this endpoint on the Node runtime because Stripe
// signature verification requires the exact raw request body.
export const config = { api: { bodyParser: false } };

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' }
});

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    console.error('[STRIPE-WEBHOOK] Missing Stripe webhook configuration');
    return json({ error: 'Webhook is not configured' }, 500);
  }

  let stripe;
  try {
    const module = await import('stripe');
    const Stripe = module.default || module;
    stripe = new Stripe(secret);
  } catch (error) {
    console.error('[STRIPE-WEBHOOK] Stripe SDK unavailable:', error);
    return json({ error: 'Stripe SDK unavailable' }, 500);
  }

  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('[STRIPE-WEBHOOK] Signature verification failed:', error.message);
    return json({ error: 'Invalid webhook signature' }, 400);
  }

  console.log('[STRIPE-WEBHOOK] Event received:', event.id, event.type);
  try {
    const object = event.data?.object;
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(object);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(object);
        break;
      case 'charge.dispute.created':
        await handleDisputeCreated(object);
        break;
      case 'checkout.session.completed':
        await handleCheckoutCompleted(object);
        break;
      default:
        console.log('[STRIPE-WEBHOOK] Unhandled event type:', event.type);
    }
    return json({ received: true });
  } catch (error) {
    console.error('[STRIPE-WEBHOOK] Handler error:', error);
    return json({ error: 'Webhook handler failed' }, 500);
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(paymentIntent) {
  const { id, amount, metadata } = paymentIntent;
  
  console.log('[STRIPE-WEBHOOK] Payment succeeded:', {
    payment_intent_id: id,
    amount: amount / 100,
    quote_id: metadata?.quote_id,
    timestamp: new Date().toISOString()
  });

  // TODO: Update database when ready
  // const { createClient } = require('@supabase/supabase-js');
  // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  // 
  // await supabase
  //   .from('property_quotes')
  //   .update({
  //     payment_status: 'paid',
  //     paid_at: new Date().toISOString(),
  //     stripe_payment_intent_id: id
  //   })
  //   .eq('id', metadata.quote_id);
  //
  // await supabase
  //   .from('payments')
  //   .insert({
  //     quote_id: metadata?.quote_id,
  //     stripe_payment_intent_id: id,
  //     amount: amount / 100,
  //     status: 'succeeded'
  //   });

  // TODO: Send confirmation email to client
  // await sendEmail({
  //   to: metadata.client_email,
  //   subject: 'Payment Confirmed - Vorvo Services',
  //   body: `Your payment of $${(amount/100).toFixed(2)} has been confirmed.`
  // });
}

/**
 * Handle failed payment
 */
async function handlePaymentCanceled(paymentIntent) {
  console.log('[STRIPE-WEBHOOK] Payment canceled:', {
    payment_intent_id: paymentIntent?.id,
    tracking_id: paymentIntent?.metadata?.tracking_id,
    timestamp: new Date().toISOString()
  });
}

async function handlePaymentFailed(paymentIntent) {
  const { id, last_payment_error, metadata } = paymentIntent;
  
  console.log('[STRIPE-WEBHOOK] Payment failed:', {
    payment_intent_id: id,
    error: last_payment_error?.message,
    quote_id: metadata?.quote_id,
    timestamp: new Date().toISOString()
  });

  // TODO: Update database when ready
  // await supabase
  //   .from('property_quotes')
  //   .update({
  //     payment_status: 'failed',
  //     payment_error: last_payment_error?.message
  //   })
  //   .eq('id', metadata.quote_id);

  // TODO: Notify admin of failed payment
  // await sendEmail({
  //   to: 'help@vorvoservices.com',
  //   subject: 'Payment Failed - Action Required',
  //   body: `Payment failed for quote ${metadata?.quote_id}. Error: ${last_payment_error?.message}`
  // });
}

/**
 * Handle refund
 */
async function handleChargeRefunded(charge) {
  const { id, amount_refunded, payment_intent, metadata } = charge;
  
  console.log('[STRIPE-WEBHOOK] Charge refunded:', {
    charge_id: id,
    amount_refunded: amount_refunded / 100,
    payment_intent_id: payment_intent,
    timestamp: new Date().toISOString()
  });

  // TODO: Update database when ready
  // await supabase
  //   .from('payments')
  //   .update({
  //     status: 'refunded',
  //     refunded_at: new Date().toISOString()
  //   })
  //   .eq('stripe_payment_intent_id', payment_intent);
}

/**
 * Handle dispute/chargeback
 */
async function handleDisputeCreated(dispute) {
  const { id, amount, reason, status, charge } = dispute;
  
  console.log('[STRIPE-WEBHOOK] Dispute created:', {
    dispute_id: id,
    amount: amount / 100,
    reason,
    status,
    timestamp: new Date().toISOString()
  });

  // TODO: Alert admin immediately
  // await sendEmail({
  //   to: 'help@vorvoservices.com',
  //   subject: 'URGENT: Dispute Created - Immediate Action Required',
  //   body: `A dispute has been created for $${(amount/100).toFixed(2)}. Reason: ${reason}`
  // });
}

/**
 * Handle checkout session completed (for hosted checkout)
 */
async function handleCheckoutCompleted(session) {
  const { id, payment_intent, metadata } = session;
  
  console.log('[STRIPE-WEBHOOK] Checkout completed:', {
    session_id: id,
    payment_intent_id: payment_intent,
    quote_id: metadata?.quote_id,
    timestamp: new Date().toISOString()
  });

  // TODO: Fulfill the order
  // await fulfillOrder(session);
}
