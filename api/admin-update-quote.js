// api/admin-update-quote.js
// Secure server-side endpoint for admin operations on quotes
// Uses Service Role Key to bypass RLS

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://urmwrmeycimtleoeirmn.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Simple admin password check (in production, use proper authentication)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vorvo-admin-2024';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { 
      status: 405, headers: { 'Content-Type': 'application/json' } 
    });
  }

  if (!SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'Server configuration error' }), { 
      status: 500, headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const body = await req.json();
    const { adminPassword, trackingId, updateData } = body;

    // Verify admin password
    if (adminPassword !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { 
        status: 401, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Validate tracking ID
    if (!trackingId) {
      return new Response(JSON.stringify({ success: false, error: 'Tracking ID required' }), { 
        status: 400, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Update the record using Service Role Key
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/property_quotes?tracking_id=eq.${encodeURIComponent(trackingId)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update failed:', errorText);
      return new Response(JSON.stringify({ success: false, error: 'Update failed' }), { 
        status: 500, headers: { 'Content-Type': 'application/json' } 
      });
    }

    const updatedRecords = await response.json();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Quote updated successfully',
      records: updatedRecords
    }), { 
      status: 200, headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Admin update error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), { 
      status: 500, headers: { 'Content-Type': 'application/json' } 
    });
  }
}
