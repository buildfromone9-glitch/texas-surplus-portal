export const config = { runtime: 'edge' };

const RESEND_KEY = 're_iNRTDfoC_NG2h6N7yuQp9ykTTAPC6C9wi';
const SENDER_EMAIL = 'Vorvo Services <noreply@sprggroup.com>'; // using verified domain on Resend
const VORVO_NOTIFY = 'buildfromone9@gmail.com';

function formatMoney(n) {
  return n ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const {
      typedName,
      signedAt,
      trackingId,
      sellerName,
      propertyAddress,
      offerAmount,
      depositAmount,
      contractTerms,
      clientEmail,
      ipAddress,
      ipLocation,
      agreementPageUrl,
    } = await req.json();

    const signedDate = new Date(signedAt).toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      dateStyle: 'long',
      timeStyle: 'short'
    });

    // Email to Vorvo Admin
    const adminHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;color:#FFFFFF;background:#111111;margin:0;padding:0}
  .wrap{max-width:700px;margin:0 auto;padding:40px 24px;background:#111111}
  .card{background:#181818;border:1px solid #FFCC00;padding:30px;border-radius:4px}
  .hdr{border-bottom:2px solid #FFCC00;padding-bottom:24px;margin-bottom:32px}
  .hdr h1{font-size:24px;margin:0 0 4px;color:#FFCC00;text-transform:uppercase}
  .hdr p{margin:0;color:#888888;font-size:14px}
  .badge{display:inline-block;background:#00CC66;color:black;padding:6px 14px;font-size:12px;font-family:monospace;font-weight:bold;border-radius:2px;margin-bottom:28px;letter-spacing:.05em}
  table{width:100%;border-collapse:collapse;margin-bottom:32px}
  td{padding:12px 14px;border-bottom:1px solid #222222;font-size:14px;color:#D8D8D8}
  td:first-child{font-weight:bold;color:#888888;width:200px}
  .btn{display:inline-block;background:#FFCC00;color:#111111;padding:12px 28px;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:.08em;border-radius:2px;margin:8px 0 32px;text-transform:uppercase}
  .btn:hover{background:#B88A00}
  .terms{background:#141414;padding:20px;border-left:3px solid #FFCC00;margin-bottom:32px;color:#D8D8D8;font-size:14px;line-height:1.6;white-space:pre-wrap}
  .ftr{font-size:11px;color:#888888;border-top:1px solid #222222;padding-top:16px}
</style></head><body>
<div class="wrap">
  <div class="card">
    <div class="hdr"><h1>Vorvo Services</h1><p>Wholesale Property Solutions — Signed Purchase & Sale Agreement</p></div>
    <div class="badge">✓ CONTRACT SIGNED</div>
    <table>
      <tr><td>Seller Name</td><td>${sellerName}</td></tr>
      <tr><td>Tracking ID</td><td>${trackingId}</td></tr>
      <tr><td>Property Address</td><td>${propertyAddress}</td></tr>
      <tr><td>Offer Amount</td><td>${formatMoney(offerAmount)}</td></tr>
      <tr><td>Earnest Deposit</td><td>${formatMoney(depositAmount)}</td></tr>
      <tr><td>Seller Email</td><td>${clientEmail}</td></tr>
      <tr><td>Signed Date</td><td>${signedDate} (CST)</td></tr>
      <tr><td>Signed By</td><td>${typedName}</td></tr>
      <tr><td>IP Address</td><td>${ipAddress || 'unavailable'}</td></tr>
      <tr><td>Location</td><td>${ipLocation || 'unavailable'}</td></tr>
    </table>

    <h3 style="color:#FFCC00;text-transform:uppercase;font-size:14px;letter-spacing:0.1em;margin-bottom:12px;">Contract Terms & Stipulations</h3>
    <div class="terms">${contractTerms || 'Standard terms & conditions.'}</div>

    <a href="${agreementPageUrl}" class="btn">View Signed Contract on Portal</a>

    <div class="ftr">
      <p>Generated automatically when seller signed the Vorvo Wholesale Purchase & Sale Agreement online.</p>
      <p>Tracking: ${trackingId} | Signed: ${signedAt}</p>
    </div>
  </div>
</div></body></html>`;

    // Confirmation email to Seller
    const sellerHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;color:#FFFFFF;background:#111111;margin:0;padding:0}
  .wrap{max-width:650px;margin:0 auto;padding:40px 24px;background:#111111}
  .card{background:#181818;border:1px solid #FFCC00;padding:30px;border-radius:4px}
  .hdr{border-bottom:2px solid #FFCC00;padding-bottom:24px;margin-bottom:32px}
  .hdr h1{font-size:22px;margin:0 0 4px;color:#FFCC00;text-transform:uppercase}
  .hdr p{margin:0;color:#888888;font-size:14px}
  p{font-size:15px;line-height:1.7;color:#D8D8D8}
  .trk{background:#141414;border-left:3px solid #FFCC00;padding:16px 20px;margin:24px 0;font-size:14px;color:#D8D8D8}
  .ftr{font-size:11px;color:#888888;border-top:1px solid #222222;padding-top:16px;margin-top:32px}
  .btn{display:inline-block;background:#FFCC00;color:#111111;padding:12px 28px;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:.08em;border-radius:2px;margin:8px 0 32px;text-transform:uppercase}
</style></head><body>
<div class="wrap">
  <div class="card">
    <div class="hdr"><h1>Vorvo Services</h1><p>Wholesale Property Solutions</p></div>
    <p>Dear ${sellerName},</p>
    <p>Thank you for signing the Real Estate Purchase & Sale Agreement with Vorvo Services. We are excited to work with you on a smooth, hassle-free transaction.</p>
    
    <div class="trk">
      <strong style="display:block;margin-bottom:6px;color:#FFCC00;font-size:15px;">Transaction Details:</strong>
      • <strong>Property Address:</strong> ${propertyAddress}<br/>
      • <strong>Offer Price:</strong> ${formatMoney(offerAmount)}<br/>
      • <strong>Earnest Money Deposit:</strong> ${formatMoney(depositAmount)}<br/>
      • <strong>Your Tracking ID:</strong> ${trackingId}<br/>
      • <strong>Signed:</strong> ${signedDate}
    </div>

    <p>Our transaction and title coordination team will begin processing the file immediately. We will coordinate the opening of escrow with a local title company or closing attorney in your area and contact you shortly with the next steps.</p>

    <p>You can view, print, or save a copy of your signed agreement anytime by visiting your personalized contract portal below:</p>
    
    <a href="${agreementPageUrl}" class="btn">View Signed Agreement</a>

    <p>If you have any questions in the meantime, please do not hesitate to call, text, or reply directly to this email.</p>

    <p style="margin-top:32px;">Best regards,<br/><strong>Vorvo Services</strong><br/>Phone: (832) 735-0603<br/>Email: buildfromone9@gmail.com</p>
    
    <div class="ftr"><p>Tracking ID: ${trackingId}</p></div>
  </div>
</div></body></html>`;

    // Send to Vorvo
    const adminRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        reply_to: 'buildfromone9@gmail.com',
        to: VORVO_NOTIFY,
        subject: `[SIGNED] ${trackingId} — ${sellerName}`,
        html: adminHtml,
      }),
    });

    // Send confirmation to Seller
    if (clientEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: SENDER_EMAIL,
          reply_to: 'buildfromone9@gmail.com',
          to: clientEmail,
          subject: `Your Signed Agreement Has Been Received — ${trackingId}`,
          html: sellerHtml,
        }),
      });
    }

    const adminData = await adminRes.json();
    if (!adminRes.ok) {
      return new Response(JSON.stringify({ error: adminData }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
