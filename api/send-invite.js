export const config = { runtime: 'edge' };

const RESEND_KEY = 're_iNRTDfoC_NG2h6N7yuQp9ykTTAPC6C9wi';
const SPRG_EMAIL = 'buildfromone9@gmail.com';

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { claimantName, claimantEmail, trackingId, agreementUrl } = await req.json();

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:Georgia,serif;color:#15172b;background:#faf6ee;margin:0;padding:0}
  .wrap{max-width:620px;margin:0 auto;padding:40px 24px}
  .hdr{border-bottom:2px solid #15172b;padding-bottom:24px;margin-bottom:32px}
  .hdr h1{font-size:22px;margin:0 0 4px}
  .hdr p{margin:0;color:#5a5d75;font-size:14px}
  p{font-size:15px;line-height:1.7;color:#2a2d4a}
  .btn{display:inline-block;background:#15172b;color:#fff;padding:14px 32px;text-decoration:none;font-family:monospace;font-size:13px;letter-spacing:.08em;border-radius:2px;margin:24px 0}
  .notice{background:#f3ecdc;border-left:3px solid #a07f3d;padding:16px 20px;margin:24px 0;font-size:14px;line-height:1.6;color:#2a2d4a}
  .ftr{font-size:11px;color:#999;border-top:1px solid #d8cdb3;padding-top:16px;margin-top:32px}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <h1>Surplus Property Research Group</h1>
    <p>Texas Foreclosure Surplus Recovery</p>
  </div>
  <p>Hello ${claimantName},</p>
  <p>Your personalized SPRG service packet is ready for review. Please use the button below to view your service agreement and, after signing, access your educational claims guide.</p>
  <a href="${agreementUrl}" class="btn">VIEW YOUR SERVICE PACKET →</a>
  <div class="notice">
    <strong>Your Tracking #: ${trackingId}</strong><br/>
    This link is unique to your case. Please do not share it with others.
  </div>
  <p>The agreement outlines the research services SPRG has performed on your behalf and the 10% contingency fee that applies only if funds are disbursed to you. There is no upfront cost.</p>
  <p>If you have any questions before signing, simply reply to this email.</p>
  <p>— Surplus Property Research Group<br/><a href="mailto:${SPRG_EMAIL}" style="color:#a07f3d;">${SPRG_EMAIL}</a></p>
  <div class="ftr"><p>Tracking: ${trackingId}</p></div>
</div></body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: claimantEmail,
        reply_to: SPRG_EMAIL,
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
