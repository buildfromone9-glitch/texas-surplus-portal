/**
 * API: Send SMS Notification
 * 
 * Sends SMS notifications via Twilio for:
 * - Job confirmations
 * - Status updates
 * - Payment reminders
 * - Provider alerts
 * 
 * Future Use: Enable when ready for SMS notifications
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
      to,           // Phone number (E.164 format: +12345678900)
      message,      // SMS body
      type,         // 'confirmation', 'reminder', 'status_update', 'alert'
      related_id,   // quote_id, agreement_id, etc.
      template      // Use predefined template instead of custom message
    } = req.body;

    if (!to && !template) {
      return res.status(400).json({ error: 'Recipient phone number is required' });
    }

    // Check if Twilio is configured
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhone) {
      console.log('[SEND-SMS] Twilio not configured - logging message:', {
        to,
        message: message || getTemplate(template, {}),
        type,
        related_id,
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({ 
        success: false,
        message: 'SMS logging only - Twilio not configured',
        logged: true
      });
    }

    // Get message from template or use custom
    let smsBody = message;
    
    if (template) {
      const templateData = req.body.template_data || {};
      smsBody = getTemplate(template, templateData);
    }

    // Validate message length (160 chars for SMS, 1600 for MMS)
    if (smsBody.length > 1600) {
      return res.status(400).json({ error: 'Message too long (max 1600 characters)' });
    }

    // Initialize Twilio
    const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);

    // Send the SMS
    const smsResult = await twilio.messages.create({
      body: smsBody,
      from: twilioPhone,
      to: formatPhoneNumber(to),
      statusCallback: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/webhooks/twilio`
    });

    console.log('[SEND-SMS] SMS sent:', {
      sid: smsResult.sid,
      to: smsResult.to,
      status: smsResult.status,
      type,
      related_id,
      timestamp: new Date().toISOString()
    });

    // TODO: Log to database
    // await supabase
    //   .from('communications')
    //   .insert({
    //     related_id,
    //     related_type: 'quote',
    //     type: 'sms',
    //     direction: 'outbound',
    //     content: smsBody,
    //     external_id: smsResult.sid,
    //     status: smsResult.status
    //   });

    res.status(200).json({
      success: true,
      sid: smsResult.sid,
      status: smsResult.status
    });

  } catch (error) {
    console.error('[SEND-SMS] Error:', error);
    
    if (error.code === 21211) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    res.status(500).json({ 
      error: 'Failed to send SMS',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Predefined SMS templates
 */
function getTemplate(template, data) {
  const templates = {
    'quote_ready': 
      `Vorvo Services: Your quote is ready! View your options at vorvoservices.com/#/track?id=${data.tracking_id}`,

    'job_confirmed':
      `Vorvo Services: Your ${data.service_type} job is confirmed for ${data.date}. Provider: ${data.provider_name}. Questions? Call (832) 735-0603`,

    'job_reminder':
      `Vorvo Services: Reminder - Your ${data.service_type} job is scheduled for tomorrow at ${data.time}. Reply C to confirm or call (832) 735-0603 to reschedule.`,

    'job_completed':
      `Vorvo Services: Your job is complete! Thank you for choosing us. Leave a review at vorvoservices.com/review?id=${data.tracking_id}`,

    'payment_reminder':
      `Vorvo Services: Payment reminder - $${data.amount} is due for your ${data.service_type} service. Pay at vorvoservices.com/pay/${data.tracking_id}`,

    'invoice_sent':
      `Vorvo Services: Invoice #${data.invoice_number} for $${data.amount} has been sent. Due date: ${data.due_date}. View: vorvoservices.com/invoice/${data.invoice_id}`,

    'surplus_update':
      `Vorvo Services: Update on your surplus claim (TRK-${data.tracking_id}). Status: ${data.status}. View details: vorvoservices.com/#/track`,

    'provider_new_job':
      `Vorvo Services: New job available! ${data.service_type} at ${data.address}. ${data.distance} miles away. Respond within 2 hours.`
  };

  return templates[template] || template;
}

/**
 * Format phone number to E.164
 */
function formatPhoneNumber(phone) {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add US country code if missing
  if (cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }
  
  // Add + prefix for E.164 format
  return '+' + cleaned;
}
