/**
 * API: Refund Payment
 * 
 * Processes refunds for cancelled jobs or disputed services.
 * Supports full and partial refunds.
 * 
 * Future Use: Connect to cancellation workflow when ready
 */

export default async function handler(req, res) {
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
    const { 
      payment_intent_id, 
      amount, 
      reason = 'requested_by_customer',
      quote_id,
      notes 
    } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Create the refund
    const refund = await stripe.refunds.create({
      payment_intent: payment_intent_id,
      amount: amount, // If omitted, full refund
      reason: reason, // 'duplicate', 'fraudulent', 'requested_by_customer'
      metadata: {
        quote_id: quote_id || '',
        notes: notes || ''
      }
    });

    console.log('[REFUND-PAYMENT] Refund created:', {
      refund_id: refund.id,
      payment_intent_id,
      amount: refund.amount,
      status: refund.status,
      timestamp: new Date().toISOString()
    });

    // TODO: Update database when ready
    // await supabase
    //   .from('payments')
    //   .update({ 
    //     status: 'refunded',
    //     refunded_at: new Date().toISOString(),
    //     refund_id: refund.id
    //   })
    //   .eq('stripe_payment_intent_id', payment_intent_id);

    res.status(200).json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
        created: refund.created
      }
    });

  } catch (error) {
    console.error('[REFUND-PAYMENT] Error:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Cannot refund this payment',
        details: error.message 
      });
    }

    res.status(500).json({ 
      error: 'Failed to process refund',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
