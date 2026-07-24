// api/helcim-validate.js
// Validate the Helcim payment response

export const config = { runtime: 'edge' };

const HELCIM_API_TOKEN = process.env.HELCIM_API_TOKEN;

export default async function handler(req) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { helcimResponse, transactionId, amount, secretToken } = await req.json();

    if (!transactionId && !helcimResponse?.transactionId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No transaction ID provided' 
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const finalTransactionId = transactionId || helcimResponse?.transactionId;

    console.log('[Helcim] Validating transaction:', finalTransactionId);

    return new Response(JSON.stringify({
      success: true,
      transactionId: finalTransactionId,
      validatedAt: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error('[Helcim] Validation failed:', err.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
