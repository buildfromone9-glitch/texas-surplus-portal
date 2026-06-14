export const config = { runtime: 'edge' };

const RESEND_KEY = process.env.RESEND_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SPRG_EMAIL = 'help@vorvoservices.com';
const SPRG_NOTIFY = 'help@vorvoservices.com';

function usd(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    // ===== SECURITY VALIDATION =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const userRes = await fetch('https://urmwrmeycimtleoeirmn.supabase.co/auth/v1/user', {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Verify RESEND_KEY is configured
    if (!RESEND_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const {
      claimantName, clientEmail, trackingId, propertyId,
      invoiceNumber, invoiceDate, feeAmount,
      originalDueDate, daysPastDue,
      noticeSentDate, noticePeriodEnd,
      certifiedMailTracking,
    } = body;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:Georgia,serif;color:#15172b;background:#faf6ee;margin:0;padding:0}
  .wrap{max-width:680px;margin:0 auto;padding:40px 24px}
  .hdr{border-bottom:2px solid #8b3a2a;padding-bottom:20px;margin-bottom:28px}
  .hdr h1{font-size:22px;margin:0 0 4px;color:#8b3a2a}
  .hdr p{margin:0;color:#5a5d75;font-size:13px}
  .badge{display:inline-block;background:#8b3a2a;color:#fff;padding:3px 12px;font-size:11px;font-family:monospace;border-radius:2px;margin-bottom:20px;letter-spacing:.1em}
  table{width:100%;border-collapse:collapse;margin-bottom:28px}
  td{padding:9px 12px;border-bottom:1px solid #d8cdb3;font-size:14px}
  td:first-child{font-weight:bold;color:#5a5d75;width:210px}
  .cure{background:#fff5f3;border-left:3px solid #8b3a2a;padding:14px 18px;margin:20px 0;font-size:14px;line-height:1.6}
  .lbl{font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:#5a5d75;margin:0 0 10px}
  p{font-size:14px;line-height:1.7;color:#2a2d4a}
  .ftr{font-size:11px;color:#999;border-top:1px solid #d8cdb3;padding-top:14px;margin-top:28px}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>DEMAND FOR PAYMENT — Notice of Default</h1><p>Surplus Property Research Group · Texas Foreclosure Surplus Recovery</p></div>
  <div class="badge">FORMAL DEMAND</div>
  <p>Dear ${claimantName},</p>
  <p>This letter constitutes formal written demand for payment under Section 4 of our Agreement (Notice-and-Cure; Demand Letter). A duplicate of this notice is being sent concurrently by certified U.S. mail, return receipt requested, to your last known mailing address on file.</p>
  <p>Per our Agreement, this notice is valid and sufficient when both methods of delivery are used, regardless of whether the certified mail is physically claimed.</p>
  <p class="lbl">Notice of Default</p>
  <table>
    <tr><td>Invoice Number</td><td>${invoiceNumber}</td></tr>
    <tr><td>Invoice Date</td><td>${invoiceDate}</td></tr>
    <tr><td>Amount Due</td><td>${usd(feeAmount)}</td></tr>
    <tr><td>Original Due Date</td><td>${originalDueDate}</td></tr>
    <tr><td>Days Past Due</td><td>${daysPastDue}</td></tr>
    <tr><td>Property / Claim Ref.</td><td>${propertyId}</td></tr>
    <tr><td>Tracking #</td><td>${trackingId}</td></tr>
  </table>
  <div class="cure">
    <strong>Cure Period</strong><br>
    You have <strong>fifteen (15) days</strong> from the date this demand letter is sent to cure the default by remitting payment in full.<br><br>
    Notice Period began: <strong>${noticeSentDate}</strong><br>
    Notice Period ends: <strong>${noticePeriodEnd}</strong>
  </div>
  <p class="lbl">Payment Methods</p>
  <table>
    <tr><td>Check</td><td>Payable to Surplus Property Research Group — reply to this email for mailing address</td></tr>
    <tr><td>ACH / Other</td><td>Reply to this email to request ACH transfer details</td></tr>
  </table>
  <p>If full payment is not received by the end of the Notice Period, SPRG will pursue any and all further remedies available under the Agreement and applicable law, which may include collection action and recovery of additional costs.</p>
  <p>If you believe you have received this notice in error or wish to discuss the matter, please contact us immediately. However, communication alone will not toll the Notice Period — only receipt of full payment will cure the default.</p>
  <p>Regards,<br><strong>Surplus Property Research Group</strong><br><a href="mailto:${SPRG_EMAIL}">${SPRG_EMAIL}</a></p>
  <div class="ftr">
    <p>Sent via: (1) email to claimant's address on file; (2) certified U.S. mail, return receipt requested${certifiedMailTracking ? ', tracking #' + certifiedMailTracking : ''}.</p>
    <p>Invoice ${invoiceNumber} · Tracking: ${trackingId} · Demand sent ${noticeSentDate}</p>
  </div>
</div></body></html>`;

    const send = (to, subject) => fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Surplus Property Research Group <noreply@vorvoservices.com>',
        to,
        reply_to: SPRG_EMAIL,
        subject,
        html,
      }),
    });

    await send(clientEmail, `DEMAND FOR PAYMENT — Notice of Default — Invoice ${invoiceNumber}`);
    await send(SPRG_NOTIFY, `[COPY] Demand Letter ${invoiceNumber} sent to ${claimantName}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
