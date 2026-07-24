// api/create-payment-intent.js
// Secure server-side endpoint to create a Stripe PaymentIntent for direct labor deposits or payments.

export const config = { runtime: 'edge' };

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const DEFAULT_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

export default async function handler(req) {
  if (req.method === 'GET') {
    if (!DEFAULT_PUBLISHABLE_KEY) return json({ error: 'Stripe publishable key is not configured' }, 500);
    return json({ publishableKey: DEFAULT_PUBLISHABLE_KEY });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    if (!STRIPE_SECRET_KEY) {
        return json({ error: 'Stripe is not configured on the server' }, 500);
    }

    const { amount, currency, trackingId, description } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call Stripe API to create PaymentIntent
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: Math.round(amount * 100).toString(), // convert to cents
        currency: currency || 'usd',
        description: description || `Vorvo Services Direct Labor Payment - ${trackingId}`,
        'metadata[tracking_id]': trackingId || 'unknown',
      }),
    });

    const data = await stripeRes.json();

    if (!stripeRes.ok) {
      throw new Error(data.error?.message || 'Stripe API error');
    }

    return json({
      clientSecret: data.client_secret,
      publishableKey: DEFAULT_PUBLISHABLE_KEY
    });
  } catch (err) {
    console.error('[Stripe] PaymentIntent creation failed:', err.message);
    return json({ error: err.message }, 500);
  }
}
