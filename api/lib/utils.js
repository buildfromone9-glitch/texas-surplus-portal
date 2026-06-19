/**
 * Utility Library for Vorvo Services
 * 
 * Shared helper functions used across API endpoints.
 * This file is NOT an API endpoint - it's imported by other files.
 * 
 * Usage:
 *   const { formatCurrency, sendEmail, generatePDF } = require('./lib/utils');
 */

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format number as US currency
 * @param {number} cents - Amount in cents
 * @returns {string} Formatted currency string
 */
function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - 'short', 'long', 'datetime'
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'short') {
  const d = new Date(date);
  const options = {
    short: { month: 'numeric', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    datetime: { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
  };
  return d.toLocaleDateString('en-US', options[format] || options.short);
}

/**
 * Format phone number for display
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone (xxx) xxx-xxxx
 */
function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Format tracking ID for display
 * @param {string} id - Raw tracking ID
 * @returns {string} Uppercase tracking ID
 */
function formatTrackingId(id) {
  return (id || '').toUpperCase().trim();
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (US)
 * @param {string} phone - Phone to validate
 * @returns {boolean} True if valid
 */
function isValidPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned[0] === '1');
}

/**
 * Validate tracking ID format
 * @param {string} id - Tracking ID to validate
 * @returns {boolean} True if valid
 */
function isValidTrackingId(id) {
  const patterns = [
    /^TRK-\d{4}-\d{4}$/,        // Surplus: TRK-2026-0001
    /^VRV-MOV-\d{4}$/,          // Moving
    /^VRV-JNK-\d{4}$/,          // Junk
    /^VRV-WSH-\d{4}$/,          // Pressure Wash
    /^VRV-YRD-\d{4}$/,          // Yard
    /^VRV-PRP-\d{4}$/,          // Property (generic)
    /^VRV-WHL-\d{4}$/,          // Wholesale
    /^VRV-AST-\d{4}$/           // Asset
  ];
  return patterns.some(p => p.test(id.toUpperCase()));
}

/**
 * Validate Texas Property ID
 * @param {string} id - Property ID to validate
 * @returns {boolean} True if valid
 */
function isValidTexasPropertyId(id) {
  // Texas Comptroller Property IDs are typically 8-12 characters
  return /^[A-Z0-9]{8,12}$/i.test(id);
}

// =============================================================================
// EMAIL UTILITIES
// =============================================================================

/**
 * Send email via Resend
 * @param {object} options - Email options
 * @returns {Promise<object>} Send result
 */
async function sendEmail({ to, subject, html, text, replyTo, attachments }) {
  const RESEND_KEY = process.env.RESEND_KEY;
  
  if (!RESEND_KEY) {
    console.log('[EMAIL] Resend not configured - logging email:', {
      to, subject, hasHtml: !!html, hasText: !!text
    });
    return { success: false, logged: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Vorvo Services <noreply@vorvoservices.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      reply_to: replyTo,
      attachments
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend API error: ${error.message}`);
  }

  return response.json();
}

/**
 * Email templates
 */
const emailTemplates = {
  paymentConfirmation: (data) => ({
    subject: `Payment Confirmed - ${formatCurrency(data.amount)}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Payment Confirmed</h2>
        <p>Your payment of <strong>${formatCurrency(data.amount)}</strong> has been successfully processed.</p>
        <p><strong>Tracking ID:</strong> ${data.tracking_id}</p>
        <p><strong>Service:</strong> ${data.service_type}</p>
        <p>Thank you for choosing Vorvo Services!</p>
      </div>
    `
  }),

  quoteReady: (data) => ({
    subject: `Your Quote is Ready - ${data.tracking_id}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Your Quote is Ready</h2>
        <p>Hello ${data.name},</p>
        <p>Your quote for ${data.service_type} services is ready for review.</p>
        <p><a href="https://www.vorvoservices.com/#/track?id=${data.tracking_id}" 
           style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Your Quote
        </a></p>
        <p>This quote will expire in 14 days.</p>
      </div>
    `
  }),

  invoice: (data) => ({
    subject: `Invoice #${data.invoice_number} - ${formatCurrency(data.amount)}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Invoice from Vorvo Services</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Invoice #:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${data.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Amount Due:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(data.amount)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Due Date:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatDate(data.due_date)}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">
          <a href="${data.payment_url}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Pay Now
          </a>
        </p>
      </div>
    `
  })
};

// =============================================================================
// PDF GENERATION (FUTURE)
// =============================================================================

/**
 * Generate PDF from HTML (requires puppeteer or similar)
 * @param {string} html - HTML content
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePDF(html) {
  // TODO: Implement with puppeteer or @vercel/og
  // For now, return null to indicate not implemented
  console.log('[PDF] PDF generation not yet implemented');
  return null;
}

// =============================================================================
// TRACKING ID GENERATION
// =============================================================================

/**
 * Generate a unique tracking ID
 * @param {string} prefix - Tracking ID prefix (TRK, VRV-MOV, etc.)
 * @returns {string} Formatted tracking ID
 */
function generateTrackingId(prefix) {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}-${random}`;
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Log an audit event to the database
 * @param {object} params - Audit parameters
 */
async function logAudit({ 
  supabase, 
  action, 
  targetTable, 
  targetId, 
  oldValues, 
  newValues,
  userId,
  ipAddress 
}) {
  try {
    await supabase
      .from('audit_log')
      .insert({
        actor_user_id: userId,
        actor_ip_address: ipAddress,
        action,
        target_table: targetTable,
        target_id: targetId,
        old_values: oldValues,
        new_values: newValues
      });
  } catch (error) {
    console.error('[AUDIT] Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

// =============================================================================
// IP ADDRESS UTILITIES
// =============================================================================

/**
 * Get IP address location info
 * @param {string} ip - IP address
 * @returns {Promise<object>} Location data
 */
async function getIpLocation(ip) {
  try {
    const response = await fetch(`https://ipinfo.io/${ip}/json?token=${process.env.IPINFO_TOKEN || ''}`);
    const data = await response.json();
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country,
      loc: data.loc,
      timezone: data.timezone
    };
  } catch (error) {
    console.error('[IP] Failed to get IP location:', error);
    return { ip };
  }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Standard API error response
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Handle API error and send appropriate response
 */
function handleError(res, error) {
  console.error('[API ERROR]', error);

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details
    });
  }

  return res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Formatting
  formatCurrency,
  formatDate,
  formatPhone,
  formatTrackingId,
  
  // Validation
  isValidEmail,
  isValidPhone,
  isValidTrackingId,
  isValidTexasPropertyId,
  
  // Email
  sendEmail,
  emailTemplates,
  
  // PDF
  generatePDF,
  
  // Tracking
  generateTrackingId,
  
  // Audit
  logAudit,
  
  // IP
  getIpLocation,
  
  // Error handling
  ApiError,
  handleError
};
