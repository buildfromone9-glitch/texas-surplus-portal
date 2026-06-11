// api/create-payment-intent.js
// Secure server-side endpoint to create a Stripe PaymentIntent for direct labor deposits or payments.

export const config = { runtime: 'edge' };

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({
        error: 'Stripe Secret Key is not configured on Vercel. Please log into your Vercel dashboard, go to your Project Settings -> Environment Variables, and add STRIPE_SECRET_KEY with your Stripe Secret Key.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
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

    return new Response(JSON.stringify({ clientSecret: data.client_secret }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Stripe] PaymentIntent creation failed:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
