export const config = { runtime: 'edge' };

const RESEND_KEY = process.env.RESEND_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SPRG_EMAIL = 'help@vorvoservices.com';
const SPRG_NOTIFY = 'help@vorvoservices.com';

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
    const { claimantName, claimantEmail, trackingId, agreementUrl } = body;

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  body { margin:0; padding:0; background:#f0ebe0; font-family:Georgia,'Times New Roman',serif; }
  .wrapper { width:100%; table-layout:fixed; background-color:#f0ebe0; padding-bottom:40px; padding-top:40px; }
  .main-table { max-width:600px; margin:0 auto; background-color:#ffffff; border:1px solid #d3c9b7; border-radius:3px; box-shadow:0 4px 10px rgba(0,0,0,0.03); }
  .header { padding:40px 40px 20px 40px; text-align:center; border-bottom:1px solid #f0ebe0; }
  .logo { font-family:'Times New Roman',Georgia,serif; font-size:24px; font-weight:bold; letter-spacing:0.15em; color:#111111; text-transform:uppercase; margin:0; }
  .subtitle { font-family:sans-serif; font-size:10px; font-weight:600; letter-spacing:0.1em; color:#a07f3d; text-transform:uppercase; margin-top:5px; }
  .content { padding:40px; }
  .welcome { font-size:18px; font-weight:normal; line-height:1.4; color:#111111; margin-top:0; margin-bottom:25px; }
  .body-text { font-size:14px; line-height:1.7; color:#444444; margin-bottom:20px; font-family:sans-serif; }
  .btn-container { text-align:center; margin:35px 0; }
  .btn { display:inline-block; background-color:#a07f3d; color:#ffffff !important; padding:14px 30px; font-family:sans-serif; font-size:12px; font-weight:600; letter-spacing:0.1em; text-decoration:none; text-transform:uppercase; border-radius:2px; }
  .sign-off { margin-top:35px; border-top:1px solid #f0ebe0; padding-top:25px; font-size:14px; line-height:1.5; color:#111111; }
  .footer { padding:20px 40px; text-align:center; font-family:sans-serif; font-size:10px; color:#999999; letter-spacing:0.05em; border-top:1px solid #f0ebe0; }
</style>
</head>
<body>
<div class="wrapper">
<table class="main-table" cellpadding="0" cellspacing="0">
  <tr>
    <td class="header">
      <h1 class="logo">Surplus Property</h1>
      <div class="subtitle">Research Group</div>
    </td>
  </tr>
  <tr>
    <td class="content">
      <h2 class="welcome">Dear ${claimantName},</h2>
      
      <p class="body-text">We are pleased to inform you that our research department has completed its audit of public records for your property. We have identified unclaimed foreclosure surplus funds that you may be legally entitled to recover.</p>

      <p class="body-text">To view the estimated value of your surplus funds and access your recovery packet, please click the secure link below to review and sign your Client Service Agreement:</p>

      <div class="btn-container">
        <a href="${agreementUrl}" class="btn" target="_blank">Review &amp; Sign Agreement →</a>
      </div>

      <p class="body-text">After signing, you will gain immediate access to your educational claims guide with step-by-step instructions for filing your claim directly with the Texas Comptroller.</p>

      <p class="body-text">If you have any questions before signing, simply reply to this email.</p>

      <p class="sign-off">Regards,<br/><strong>Surplus Property Research Group</strong><br/><a href="mailto:${SPRG_EMAIL}" style="color:#a07f3d;text-decoration:none;">${SPRG_EMAIL}</a></p>
    </td>
  </tr>
  <tr>
    <td class="footer">
      <p>Surplus Property Research Group &nbsp;·&nbsp; Tracking: ${trackingId}</p>
    </td>
  </tr>
</table>
</div>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Surplus Property Research Group <noreply@vorvoservices.com>',
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
