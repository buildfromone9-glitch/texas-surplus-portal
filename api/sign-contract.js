// api/sign-contract.js
// Secure server-side endpoint for contract signing
// Uses Service Role Key to bypass RLS and validate updates server-side

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://urmwrmeycimtleoeirmn.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Method not allowed' 
    }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify Service Role Key is configured
  if (!SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Server configuration error. Please contact support.' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { 
      trackingId, 
      selectedOption, 
      signerName, 
      signatureData, 
      paymentMethod,
      stripePaymentIntentId 
    } = body;

    // ===== VALIDATION =====

    // Validate tracking ID
    if (!trackingId || typeof trackingId !== 'string') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Tracking ID is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate selected option (must be 1, 2, or 3)
    if (![1, 2, 3].includes(selectedOption)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid quote option selected' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate signer name
    if (!signerName || typeof signerName !== 'string' || signerName.trim().length < 2) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Please enter your full legal name' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate signature data (must be a data URL)
    if (!signatureData || typeof signatureData !== 'string' || !signatureData.startsWith('data:image/')) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Valid signature is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate payment method
    const validPaymentMethods = ['Credit/Debit Card', 'ACH Bank Transfer', 'Check upon Completion'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid payment method' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ===== FETCH RECORD =====

    // Create Supabase client with Service Role Key (bypasses RLS)
    const fetchResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/property_quotes?tracking_id=eq.${encodeURIComponent(trackingId)}&select=*`,
      {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!fetchResponse.ok) {
      console.error('Failed to fetch record:', await fetchResponse.text());
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to verify record' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const records = await fetchResponse.json();

    if (!records || records.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Record not found. Please check your tracking ID.' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const quote = records[0];

    // ===== BUSINESS LOGIC VALIDATION =====

    // Verify status is 'quoted' (ready for signing)
    if (quote.status !== 'quoted') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Contract cannot be signed. Current status: ${quote.status}` 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify contract hasn't already been signed
    if (quote.contract_signed_at) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'This contract has already been signed.' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ===== GET SELECTED OPTION DATA =====

    let selectedAmount, selectedProvider, selectedPhone, selectedSchedule, selectedNotes;

    if (selectedOption === 1) {
      selectedAmount = quote.quote_amount;
      selectedProvider = quote.assigned_provider_name;
      selectedPhone = quote.assigned_provider_phone;
      selectedSchedule = quote.provider_schedule_1;
      selectedNotes = quote.provider_notes_1;
    } else if (selectedOption === 2) {
      selectedAmount = quote.quote_amount_2;
      selectedProvider = quote.provider_name_2;
      selectedPhone = quote.provider_phone_2;
      selectedSchedule = quote.provider_schedule_2;
      selectedNotes = quote.provider_notes_2;
    } else if (selectedOption === 3) {
      selectedAmount = quote.quote_amount_3;
      selectedProvider = quote.provider_name_3;
      selectedPhone = quote.provider_phone_3;
      selectedSchedule = quote.provider_schedule_3;
      selectedNotes = quote.provider_notes_3;
    }

    // Verify selected option has a valid quote amount
    if (!selectedAmount || selectedAmount <= 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Selected quote option is not available. Please contact support.' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ===== PERFORM UPDATE =====

    // Build update object - ONLY customer-permitted fields
    const updateData = {
      // Status change (customer can set to 'scheduled')
      status: 'scheduled',
      
      // Selected option data (from provider quote)
      quote_amount: selectedAmount,
      assigned_provider_name: selectedProvider,
      assigned_provider_phone: selectedPhone,
      
      // Customer selection
      selected_option_index: selectedOption,
      
      // Contract signature data (customer-provided)
      contract_signer_name: signerName.trim(),
      contract_signature_data: signatureData,
      contract_signed_at: new Date().toISOString(),
      
      // Payment method (customer selection)
      payment_method: paymentMethod
    };

    // Add Stripe payment intent ID if provided (for card payments)
    if (stripePaymentIntentId && paymentMethod === 'Credit/Debit Card') {
      updateData.stripe_payment_intent_id = stripePaymentIntentId;
    }

    // Update the record using Service Role Key
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/property_quotes?id=eq.${quote.id}`,
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

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update record:', errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to save contract. Please try again.' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedRecords = await updateResponse.json();

    if (!updatedRecords || updatedRecords.length === 0) {
      console.error('No records updated');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to save contract. Please try again.' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ===== SUCCESS =====

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Contract signed successfully',
      trackingId: trackingId,
      status: 'scheduled',
      selectedOption: selectedOption,
      quoteAmount: selectedAmount,
      providerName: selectedProvider
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Contract signing error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
