export const config = { runtime: 'edge' };

const RESEND_KEY = process.env.RESEND_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SPRG_EMAIL = 'help@vorvoservices.com';
const SPRG_NOTIFY = 'help@vorvoservices.com';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    
    // Admin authentication required
    if (!body.adminPassword || body.adminPassword !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Verify RESEND_KEY is configured
    if (!RESEND_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    
    const {
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
    } = await req.json();

    const signedDate = new Date(signedAt).toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      dateStyle: 'long',
      timeStyle: 'short'
    });

    const fmt = (n) => n ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—';
    const feeAmount = estimatedValue ? (estimatedValue * 0.10).toFixed(2) : null;
    const netAmount = estimatedValue ? (estimatedValue * 0.90).toFixed(2) : null;

    // Email to SPRG
    const sprgHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:Georgia,serif;color:#15172b;background:#faf6ee;margin:0;padding:0}
  .wrap{max-width:700px;margin:0 auto;padding:40px 24px}
  .hdr{border-bottom:2px solid #15172b;padding-bottom:24px;margin-bottom:32px}
  .hdr h1{font-size:24px;margin:0 0 4px}
  .hdr p{margin:0;color:#5a5d75;font-size:14px}
  .badge{display:inline-block;background:#3d5c44;color:white;padding:4px 14px;font-size:12px;font-family:monospace;border-radius:2px;margin-bottom:28px;letter-spacing:.05em}
  table{width:100%;border-collapse:collapse;margin-bottom:32px}
  td{padding:10px 12px;border-bottom:1px solid #d8cdb3;font-size:14px}
  td:first-child{font-weight:bold;color:#5a5d75;width:200px}
  .btn{display:inline-block;background:#15172b;color:#fff;padding:12px 28px;text-decoration:none;font-family:monospace;font-size:13px;letter-spacing:.08em;border-radius:2px;margin:8px 0 32px}
  .audit{background:#f9f9f9;padding:20px;border-left:3px solid #a07f3d;margin-bottom:32px}
  .audit-title{font-family:monospace;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#5a5d75;margin:0 0 14px}
  .audit table{margin:0}
  .audit td{border:none;padding:4px 0;font-family:monospace;font-size:12px}
  .audit td:first-child{color:#a07f3d;width:110px;font-weight:normal}
  .ftr{font-size:11px;color:#999;border-top:1px solid #d8cdb3;padding-top:16px}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>Surplus Property Research Group</h1><p>Texas Foreclosure Surplus Recovery — Signed Agreement</p></div>
  <div class="badge">✓ SIGNED</div>
  <table>
    <tr><td>Claimant</td><td>${claimantName}</td></tr>
    <tr><td>Tracking #</td><td>${trackingId}</td></tr>
    <tr><td>Property ID</td><td>${propertyId}</td></tr>
    <tr><td>Reported Owner</td><td>${reportedOwner || '—'}</td></tr>
    <tr><td>Estimated Value</td><td>${fmt(estimatedValue)}</td></tr>
    <tr><td>SPRG Fee (10%)</td><td>${fmt(feeAmount)}</td></tr>
    <tr><td>Net to Claimant</td><td>${fmt(netAmount)}</td></tr>
    <tr><td>Client Email</td><td>${clientEmail}</td></tr>
    <tr><td>Signed</td><td>${signedDate} (CST)</td></tr>
    <tr><td>Signed By</td><td>${typedName}</td></tr>
    <tr><td>IP Address</td><td>${ipAddress || 'unavailable'}</td></tr>
    <tr><td>Location</td><td>${ipLocation || 'unavailable'}</td></tr>
  </table>

  <a href="${agreementPageUrl}" class="btn">VIEW FULL SIGNED AGREEMENT →</a>

  ${auditLog && auditLog.length > 0 ? `
  <div class="audit">
    <p class="audit-title">Audit Log</p>
    <table>${auditLog.map(e => `
      <tr><td>${e.time}</td><td>${e.event}</td></tr>`).join('')}
    </table>
  </div>` : ''}

  <div class="ftr">
    <p>Generated automatically when claimant signed the SPRG service agreement online.</p>
    <p>Tracking: ${trackingId} | Signed: ${signedAt}</p>
  </div>
</div></body></html>`;

    // Confirmation email to client
    const clientHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:Georgia,serif;color:#15172b;background:#faf6ee;margin:0;padding:0}
  .wrap{max-width:600px;margin:0 auto;padding:40px 24px}
  .hdr{border-bottom:2px solid #15172b;padding-bottom:24px;margin-bottom:32px}
  .hdr h1{font-size:22px;margin:0 0 4px}
  .hdr p{margin:0;color:#5a5d75;font-size:14px}
  p{font-size:15px;line-height:1.7;color:#2a2d4a}
  .trk{background:#f3ecdc;border-left:3px solid #a07f3d;padding:12px 16px;margin:24px 0;font-size:14px}
  .notice{margin:24px 0;padding:16px 20px;background:#f3ecdc;border-left:3px solid #a07f3d}
  .notice-title{font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:#a07f3d;margin:0 0 10px}
  ul{font-size:14px;line-height:1.9;color:#2a2d4a;margin:0;padding-left:18px}
  .ftr{font-size:11px;color:#999;border-top:1px solid #d8cdb3;padding-top:16px;margin-top:32px}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>Surplus Property Research Group</h1><p>Texas Foreclosure Surplus Recovery</p></div>
  <p>Hi ${claimantName},</p>
  <p>We have received your signed Texas Surplus Property Research Service Agreement.</p>
  <div class="trk"><strong style="display:block;margin-bottom:4px;">Your Tracking #: ${trackingId}</strong>Signed: ${signedDate}</div>
  <p>To access your educational claims guide, open the link we sent you and click "Claims Guide" in the navigation.</p>
  <div class="notice">
    <p class="notice-title">Important: When You Receive Your Disbursement</p>
    <p style="font-size:14px;line-height:1.6;color:#2a2d4a;margin:0 0 8px;">Per Section 1 of your Agreement, notify SPRG in writing within <strong>3 business days</strong> of receiving your disbursement. Reply to this email with:</p>
    <ul>
      <li>Date of disbursement</li>
      <li>Gross amount received ($)</li>
      <li>Method of payment (check, ACH, or other)</li>
    </ul>
  </div>
  <p>— Surplus Property Research Group</p>
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
