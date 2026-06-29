// api/helcim-checkout.js
// Initialize a Helcim checkout session for labor services payments

export const config = { runtime: 'edge' };

const HELCIM_API_TOKEN = process.env.HELCIM_API_TOKEN;

export default async function handler(req) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // GET - Health check / status
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'ok',
      provider: 'helcim',
      configured: !!HELCIM_API_TOKEN
    }), {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    if (!HELCIM_API_TOKEN) {
      return new Response(JSON.stringify({
        error: 'Helcim API Token is not configured. Please add HELCIM_API_TOKEN to Vercel environment variables.'
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { amount, customerEmail, customerName, trackingId, description } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Initialize Helcim checkout
    const checkoutData = {
      amount: amount.toFixed(2),
      currency: 'USD',
      paymentMethods: ['card'],
      customer: customerEmail ? {
        email: customerEmail,
        name: customerName || customerEmail.split('@')[0]
      } : undefined,
      metadata: {
        tracking_id: trackingId || 'unknown',
        description: description || `Vorvo Services Coordination Payment - ${trackingId || 'unknown'}`
      }
    };

    console.log('[Helcim] Initializing checkout for amount:', amount, 'trackingId:', trackingId);

    // Call Helcim API to initialize checkout session
    const helcimRes = await fetch('https://api.helcim.com/v2/checkout/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HELCIM_API_TOKEN}`,
      },
      body: JSON.stringify(checkoutData),
    });

    const helcimData = await helcimRes.json();

    if (!helcimRes.ok) {
      console.error('[Helcim] Checkout initialization failed:', helcimData);
      throw new Error(helcimData.message || helcimData.error || 'Helcim API error');
    }

    console.log('[Helcim] Checkout initialized successfully:', helcimData.checkoutToken);

    // Return checkout token to frontend
    return new Response(JSON.stringify({
      checkoutToken: helcimData.checkoutToken,
      secretToken: helcimData.secretToken,
      checkoutId: helcimData.checkoutId
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error('[Helcim] Checkout initialization failed:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
