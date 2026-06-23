/**
 * API: Capture Payment
 * 
 * Captures a previously authorized Stripe payment after job completion.
 * Used for labor services where payment is authorized upfront and captured
 * after the job is completed successfully.
 * 
 * Future Use: Connect to labor service workflow when ready
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { payment_intent_id, amount, quote_id } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }

    // Initialize Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Capture the payment intent
    const paymentIntent = await stripe.paymentIntents.capture(
      payment_intent_id,
      amount ? { amount_to_capture: amount } : {}
    );

    // Log the capture (future: update database)
    console.log('[CAPTURE-PAYMENT] Captured payment:', {
      payment_intent_id,
      amount: paymentIntent.amount_captured,
      status: paymentIntent.status,
      quote_id,
      timestamp: new Date().toISOString()
    });

    // TODO: When ready, update property_quotes table
    // const { createClient } = require('@supabase/supabase-js');
    // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    // await supabase
    //   .from('payments')
    //   .insert({
    //     quote_id,
    //     stripe_payment_intent_id: payment_intent_id,
    //     amount: paymentIntent.amount_captured / 100,
    //     status: 'captured',
    //     captured_at: new Date().toISOString()
    //   });

    res.status(200).json({
      success: true,
      payment_intent: {
        id: paymentIntent.id,
        amount_captured: paymentIntent.amount_captured,
        status: paymentIntent.status
      }
    });

  } catch (error) {
    console.error('[CAPTURE-PAYMENT] Error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid payment intent',
        details: error.message 
      });
    }

    res.status(500).json({ 
      error: 'Failed to capture payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
