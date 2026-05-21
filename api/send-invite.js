export const config = { runtime: 'edge' };

const RESEND_KEY = 're_iNRTDfoC_NG2h6N7yuQp9ykTTAPC6C9wi';
const SPRG_EMAIL = 'claims@sprggroup.com';
const SPRG_NOTIFY = 'buildfromone9@gmail.com';

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { claimantName, claimantEmail, trackingId, agreementUrl } = await req.json();

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  body { margin:0; padding:0; background:#f0ebe0; font-family:Georgia,'Times New Roman',serif; }
  .outer { background:#f0ebe0; padding:40px 16px; }
  .card { background:#faf6ee; max-width:600px; margin:0 auto; border:1px solid #d8cdb3; }
  .top-bar { background:#15172b; padding:28px 40px; }
  .top-bar h1 { margin:0; color:#faf6ee; font-size:20px; font-weight:normal; letter-spacing:0.02em; }
  .top-bar p { margin:6px 0 0; color:#a07f3d; font-size:12px; font-family:'Courier New',monospace; letter-spacing:0.15em; text-transform:uppercase; }
  .body { padding:40px; }
  .greeting { font-size:17px; color:#15172b; margin:0 0 20px; line-height:1.6; }
  .intro { font-size:15px; color:#2a2d4a; line-height:1.75; margin:0 0 32px; }
  .cta-wrap { text-align:center; margin:36px 0; }
  .cta-btn { display:inline-block; background:#15172b; color:#faf6ee !important; text-decoration:none; padding:16px 48px; font-family:'Courier New',monospace; font-size:13px; letter-spacing:0.12em; text-transform:uppercase; border:none; }
  .cta-sub { text-align:center; font-size:12px; color:#8a8d9f; margin-top:10px; font-family:'Courier New',monospace; }
  .divider { border:none; border-top:1px solid #d8cdb3; margin:32px 0; }
  .tracking-box { background:#f3ecdc; border-left:3px solid #a07f3d; padding:16px 20px; margin:0 0 28px; }
  .tracking-box .label { font-family:'Courier New',monospace; font-size:10px; text-transform:uppercase; letter-spacing:0.15em; color:#a07f3d; margin:0 0 6px; }
  .tracking-box .value { font-size:16px; color:#15172b; font-weight:bold; margin:0 0 4px; }
  .tracking-box .note { font-size:12px; color:#5a5d75; margin:0; }
  .body-text { font-size:14px; color:#2a2d4a; line-height:1.75; margin:0 0 16px; }
  .sign-off { font-size:14px; color:#2a2d4a; line-height:1.75; margin:24px 0 0; }
  .footer { background:#15172b; padding:20px 40px; text-align:center; }
  .footer p { margin:0; font-size:11px; color:#5a5d75; font-family:'Courier New',monospace; letter-spacing:0.05em; }
</style>
</head>
<body>
<div class="outer">
<div class="card">

  <div class="top-bar">
    <h1>Surplus Property Research Group</h1>
    <p>Texas Foreclosure Surplus Recovery</p>
  </div>

  <div class="body">
    <p class="greeting">Hello ${claimantName},</p>
    <p class="intro">Your personalized service packet is ready for review. We have identified unclaimed surplus funds that may belong to you and prepared a service agreement for your records.</p>

    <div class="cta-wrap">
      <a href="${agreementUrl}" class="cta-btn">View Your Service Packet</a>
      <p class="cta-sub">Click above to review and sign your agreement</p>
    </div>

    <hr class="divider"/>

    <div class="tracking-box">
      <p class="label">Your Tracking Number</p>
      <p class="value">${trackingId}</p>
      <p class="note">This link is unique to your case — please do not share it.</p>
    </div>

    <p class="body-text">The agreement outlines the research services SPRG has performed on your behalf and the 10% contingency fee, which applies <strong>only if funds are disbursed to you</strong>. There is no upfront cost and no obligation until you sign.</p>

    <p class="body-text">After signing, you will gain immediate access to your educational claims guide with step-by-step instructions for filing your claim directly with the Texas Comptroller.</p>

    <p class="body-text">If you have any questions before signing, simply reply to this email.</p>

    <p class="sign-off">Regards,<br/><strong>Surplus Property Research Group</strong><br/><a href="mailto:${SPRG_EMAIL}" style="color:#a07f3d;text-decoration:none;">${SPRG_EMAIL}</a></p>
  </div>

  <div class="footer">
    <p>Surplus Property Research Group &nbsp;·&nbsp; Tracking: ${trackingId}</p>
  </div>

</div>
</div>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Surplus Property Research Group <noreply@sprggroup.com>',
        to: claimantEmail,
        reply_to: 'claims@sprggroup.com',
        subject: `Your Texas Surplus Property Research Packet — Tracking ${trackingId}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: data }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
