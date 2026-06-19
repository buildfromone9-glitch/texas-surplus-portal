/**
 * API: Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for automated payment processing.
 * Events handled:
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - charge.refunded
 * - charge.dispute.created
 * 
 * Future Use: Enable when ready for automated payment tracking
 */

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  let data;
  let eventType;

  // Verify webhook signature (when deployed with webhook secret)
  if (webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(
        req.body, // Raw body needed
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error('[STRIPE-WEBHOOK] Signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
    
    data = event.data;
    eventType = event.type;
  } else {
    // Development mode without signature verification
    data = req.body.data;
    eventType = req.body.type;
  }

  console.log('[STRIPE-WEBHOOK] Event received:', eventType);

  try {
    switch (eventType) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(data.object);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(data.object);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(data.object);
        break;

      default:
        console.log('[STRIPE-WEBHOOK] Unhandled event type:', eventType);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[STRIPE-WEBHOOK] Handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
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
