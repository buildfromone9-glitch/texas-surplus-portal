export const config = { runtime: 'edge' };

const RESEND_KEY = process.env.RESEND_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SPRG_EMAIL = 'help@vorvoservices.com';
const SPRG_NOTIFY = 'help@vorvoservices.com';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    
    // Verify RESEND_KEY is configured
    if (!RESEND_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const {
      accessToken,
      typedName,
      signedAt,
      trackingId,
      claimantName,
      propertyId,
      estimatedValue,
      reportedOwner,
      clientEmail,
      ipAddress,
      ipLocation,
      auditLog,
      agreementPageUrl,
    } = body;

    // ===== SECURITY VALIDATION =====
    // Verify accessToken and trackingId in Supabase agreements table
    if (!accessToken || !trackingId) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing token or tracking ID' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = 'https://urmwrmeycimtleoeirmn.supabase.co';
    const fetchResponse = await fetch(
      `${supabaseUrl}/rest/v1/agreements?tracking_id=eq.${encodeURIComponent(trackingId)}&access_token=eq.${encodeURIComponent(accessToken)}&select=id`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!fetchResponse.ok) {
      console.error('Failed to verify agreement with Supabase:', await fetchResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to verify authorization' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const records = await fetchResponse.json();
    if (!records || records.length === 0) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or tracking ID' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // ===== CONSTRUCT EMAIL =====

    const signedDate = new Date(signedAt).toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      dateStyle: 'long',
      timeStyle: 'short'
    });

    const fmt = (n) => n ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—';
    const feeAmount = estimatedValue ? (estimatedValue * 0.10).toFixed(2) : null;
    const netAmount = estimatedValue ? (estimatedValue * 0.90).toFixed(2) : null;

    const sprgHtml = `<!DOCTYPE html>
<html><head><style>
  body { font-family: sans-serif; color: #111; line-height: 1.6; }
  .wrap { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
  h2 { border-bottom: 2px solid #a07f3d; padding-bottom: 8px; color: #a07f3d; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  .lbl { font-weight: bold; width: 180px; }
  .audit { background: #f9f9f9; padding: 12px; font-family: monospace; font-size: 11px; white-space: pre-wrap; border-left: 3px solid #ccc; }
  .ftr { font-size: 11px; color: #777; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
</style></head><body>
<div class="wrap">
  <h2>Client Service Agreement Signed</h2>
  <p>A new Surplus Property Recovery Client Service Agreement has been electronically signed and executed.</p>
  <table>
    <tr><td class="lbl">Tracking ID</td><td>${trackingId}</td></tr>
    <tr><td class="lbl">Claimant Name</td><td>${claimantName}</td></tr>
    <tr><td class="lbl">Property ID</td><td>${propertyId}</td></tr>
    <tr><td class="lbl">Est. Surplus Value</td><td>${fmt(estimatedValue)}</td></tr>
    <tr><td class="lbl">Reported Owner</td><td>${reportedOwner}</td></tr>
    <tr><td class="lbl">Client Email</td><td>${clientEmail || 'None'}</td></tr>
    <tr><td class="lbl">Signature Name</td><td>${typedName}</td></tr>
    <tr><td class="lbl">Signed At</td><td>${signedDate} (Central)</td></tr>
    <tr><td class="lbl">Agreement Link</td><td><a href="${agreementPageUrl}">${agreementPageUrl}</a></td></tr>
  </table>
  <h3>Security Audit Trail</h3>
  <div class="audit">Signer IP: ${ipAddress}
Location: ${ipLocation}
Browser Agent: ${auditLog || 'unavailable'}</div>
  <div class="ftr"><p>Surplus Property Research Group · help@vorvoservices.com</p></div>
</div></body></html>`;

    const clientHtml = `<!DOCTYPE html>
<html><head><style>
  body { font-family: sans-serif; color: #111; line-height: 1.6; }
  .wrap { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
  h2 { color: #a07f3d; }
  .box { background: #f9f6f0; border-left: 3px solid #a07f3d; padding: 15px; margin: 15px 0; }
  .ftr { font-size: 11px; color: #777; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
</style></head><body>
<div class="wrap">
  <h2>Agreement Received ✓</h2>
  <p>Dear ${claimantName},</p>
  <p>Thank you for signing the Client Service Agreement with Surplus Property Research Group (SPRG). We have successfully received your signed agreement and logged the secure audit trail.</p>
  <div class="box">
    <strong>Agreement Details:</strong><br>
    • Tracking ID: ${trackingId}<br>
    • Property ID: ${propertyId}<br>
    • Signed By: ${typedName}<br>
    • Signed At: ${signedDate}
  </div>
  <p><strong>What Happens Next:</strong></p>
  <p>Our research team will now proceed with preparing your full recovery packet. You can track the status of your claim at any time by entering your Tracking ID on our website.</p>
  <p>A copy of your signed agreement is always accessible at: <a href="${agreementPageUrl}">${agreementPageUrl}</a></p>
  <p>If you have any questions, please feel free to reply directly to this email.</p>
  <p>Regards,<br><strong>Surplus Property Research Group</strong><br><a href="mailto:${SPRG_EMAIL}">${SPRG_EMAIL}</a></p>
  <div class="ftr"><p>Tracking: ${trackingId}</p></div>
</div></body></html>`;

    // Send to SPRG
    const sprgRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Surplus Property Research Group <noreply@vorvoservices.com>',
        reply_to: SPRG_EMAIL,
        to: SPRG_NOTIFY,
        subject: `[SIGNED] ${trackingId} — ${claimantName}`,
        html: sprgHtml,
      }),
    });

    // Send confirmation to client
    if (clientEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Surplus Property Research Group <noreply@vorvoservices.com>',
          reply_to: SPRG_EMAIL,
          to: clientEmail,
          subject: `Your SPRG Agreement Has Been Received — ${trackingId}`,
          html: clientHtml,
        }),
      });
    }

    const sprgData = await sprgRes.json();
    if (!sprgRes.ok) {
      return new Response(JSON.stringify({ error: sprgData }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
