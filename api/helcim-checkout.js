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
    // Using HelcimPay.js checkout initialization
    const checkoutData = {
      paymentType: 'purchase',
      amount: Number(amount),
      currency: 'USD',
      paymentMethod: 'cc',
      customerRequest: customerEmail ? {
        contactName: customerName || customerEmail.split('@')[0],
        billingAddress: {
          email: customerEmail
        }
      } : undefined,
      invoiceRequest: {
        invoiceNumber: trackingId || 'unknown',
        notes: description || `Vorvo Services Coordination Payment - ${trackingId || 'unknown'}`
      }
    };

    console.log('[Helcim] Initializing checkout for amount:', amount, 'trackingId:', trackingId);

    // Call Helcim API to initialize checkout session
    const helcimRes = await fetch('https://api.helcim.com/v2/helcim-pay/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-token': HELCIM_API_TOKEN,
      },
      body: JSON.stringify(checkoutData),
    });

    const helcimData = await helcimRes.json();

    if (!helcimRes.ok) {
      console.error('[Helcim] Checkout initialization failed:', helcimData);
      const errMsg = helcimData.message || helcimData.error || helcimData.errors || 'Helcim API error';
      throw new Error(typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg);
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
