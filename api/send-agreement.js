export const config = { runtime: 'nodejs' };

const SUPABASE_URL = 'https://urmwrmeycimtleoeirmn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVybXdybWV5Y2ltdGxlb2Vpcm1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI0Mzc1NiwiZXhwIjoyMDk0ODE5NzU2fQ.3yTbW4w3iy1j9Nez_WCjc9NuNJ8RQSxGG2GGS2PiXak';
const RESEND_KEY = 're_iNRTDfoC_NG2h6N7yuQp9ykTTAPC6C9wi';
const SPRG_EMAIL = 'buildfromone9@gmail.com';

async function uploadSignatureToSupabase(base64Sig, trackingId) {
  try {
    const base64Data = base64Sig.replace(/^data:image\/png;base64,/, '');
    const binaryStr = Buffer.from(base64Data, 'base64');
    const filename = `${trackingId}_${Date.now()}.png`;
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/signatures/${filename}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'image/png',
          'x-upsert': 'true',
        },
        body: binaryStr,
      }
    );
    if (!uploadRes.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/signatures/${filename}`;
  } catch (err) {
    console.error('Signature upload error:', err);
    return null;
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const {
      signature,
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
      pdfBase64,
    } = body;

    // Upload signature image to Supabase Storage
    const signatureUrl = await uploadSignatureToSupabase(signature, trackingId);

    const signedDate = new Date(signedAt).toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      dateStyle: 'long',
      timeStyle: 'short'
    });

    const feeAmount = estimatedValue ? (estimatedValue * 0.10).toFixed(2) : null;
    const netAmount = estimatedValue ? (estimatedValue * 0.90).toFixed(2) : null;
    const fmt = (n) => n ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '$ ______________';

    const sprgEmailHtml = `
      <!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <style>
        body{font-family:Georgia,serif;color:#15172b;background:#faf6ee;margin:0;padding:0}
        .wrapper{max-width:700px;margin:0 auto;padding:40px 24px}
        .header{border-bottom:2px solid #15172b;padding-bottom:24px;margin-bottom:32px}
        .header h1{font-size:24px;margin:0 0 4px}
        .header p{margin:0;color:#5a5d75;font-size:14px}
        .badge{display:inline-block;background:#3d5c44;color:white;padding:4px 12px;font-size:12px;font-family:monospace;border-radius:2px;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;margin-bottom:32px}
        td{padding:10px 12px;border-bottom:1px solid #d8cdb3;font-size:14px}
        td:first-child{font-weight:bold;color:#5a5d75;width:200px}
        .sig-box{border:1px solid #d8cdb3;padding:16px;background:#fffcf5;margin-bottom:32px}
        .footer{font-size:11px;color:#999;border-top:1px solid #d8cdb3;padding-top:16px}
      </style></head><body>
      <div class="wrapper">
        <div class="header"><h1>Surplus Property Research Group</h1><p>Texas Foreclosure Surplus Recovery — Signed Agreement</p></div>
        <div class="badge">✓ SIGNED</div>
        <p style="font-size:14px;color:#2a2d4a;">The full signed agreement is attached as a PDF.</p>
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
          <tr><td>Typed Name</td><td>${typedName}</td></tr>
          <tr><td>IP Address</td><td>${ipAddress || 'unavailable'}</td></tr>
          <tr><td>Location</td><td>${ipLocation || 'unavailable'}</td></tr>
        </table>
        ${auditLog && auditLog.length > 0 ? `
        <div style="margin-bottom:32px;background:#f9f9f9;padding:16px;border-left:3px solid #a07f3d;">
          <p style="font-family:monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#5a5d75;margin:0 0 12px;">Audit Log</p>
          <table style="width:100%;border-collapse:collapse;font-family:monospace;">
            ${auditLog.map(entry => `
              <tr>
                <td style="padding:4px 16px 4px 0;font-size:12px;color:#a07f3d;white-space:nowrap;">${entry.time}</td>
                <td style="padding:4px 0;font-size:12px;color:#2a2d4a;">${entry.event}</td>
              </tr>`).join('')}
          </table>
        </div>` : ''}
        <div class="sig-box">
          <p style="margin:0 0 8px;font-size:12px;color:#5a5d75;text-transform:uppercase;letter-spacing:0.1em;">Claimant Signature</p>
          ${signatureUrl ? `<img src="${signatureUrl}" alt="Claimant signature" style="max-height:80px;max-width:300px;display:block;"/>` : `<p style="color:#999;font-style:italic;">Signature captured digitally on ${signedDate}</p>`}
          <p style="margin:8px 0 0;font-size:12px;color:#5a5d75;border-top:1px solid #15172b;padding-top:8px;">${typedName} — ${signedDate}</p>
        </div>
        <div class="footer">
          <p>This email was automatically generated when the claimant signed the SPRG service agreement online.</p>
          <p>Tracking: ${trackingId} | Signed: ${signedAt}</p>
        </div>
      </div></body></html>`;

    const clientEmailHtml = `
      <!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <style>
        body{font-family:Georgia,serif;color:#15172b;background:#faf6ee;margin:0;padding:0}
        .wrapper{max-width:600px;margin:0 auto;padding:40px 24px}
        .header{border-bottom:2px solid #15172b;padding-bottom:24px;margin-bottom:32px}
        .header h1{font-size:22px;margin:0 0 4px}
        .header p{margin:0;color:#5a5d75;font-size:14px}
        .footer{font-size:11px;color:#999;border-top:1px solid #d8cdb3;padding-top:16px;margin-top:32px}
      </style></head><body>
      <div class="wrapper">
        <div class="header"><h1>Surplus Property Research Group</h1><p>Texas Foreclosure Surplus Recovery</p></div>
        <p style="font-size:15px;line-height:1.7;color:#2a2d4a;">Hi ${claimantName},</p>
        <p style="font-size:15px;line-height:1.7;color:#2a2d4a;">We have received your signed Texas Surplus Property Research Service Agreement. Your fully signed agreement is attached to this email as a PDF for your records.</p>
        <div style="background:#f3ecdc;border-left:3px solid #a07f3d;padding:12px 16px;margin:24px 0;font-size:14px;">
          <strong style="display:block;margin-bottom:4px;">Your Tracking #: ${trackingId}</strong>
          Signed: ${signedDate}
        </div>
        <p style="font-size:15px;line-height:1.7;color:#2a2d4a;">To access your educational claims guide, open the link we sent you and click "Claims Guide" in the navigation.</p>
        <div style="margin:24px 0;padding:16px 20px;background:#f3ecdc;border-left:3px solid #a07f3d;">
          <p style="font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:#a07f3d;margin:0 0 10px;">Important: When You Receive Your Disbursement</p>
          <p style="font-size:14px;line-height:1.6;color:#2a2d4a;margin:0 0 8px;">Per Section 1 of your Agreement, notify SPRG in writing within <strong>3 business days</strong> of receiving your disbursement. Reply to this email with:</p>
          <ul style="font-size:14px;line-height:1.9;color:#2a2d4a;margin:0;padding-left:18px;">
            <li>Date of disbursement</li>
            <li>Gross amount received ($)</li>
            <li>Method of payment (check, ACH, or other)</li>
          </ul>
        </div>
        <p style="font-size:15px;line-height:1.7;color:#2a2d4a;">— Surplus Property Research Group</p>
        <div class="footer"><p>Tracking: ${trackingId}</p></div>
      </div></body></html>`;

    // Build attachments — use client-generated PDF
    const attachments = [];
    if (pdfBase64) {
      attachments.push({
        filename: `SPRG-Agreement-${trackingId}.pdf`,
        content: pdfBase64,
        type: 'application/pdf',
        disposition: 'attachment',
      });
    }

    // Send to SPRG
    const sprgRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: SPRG_EMAIL,
        subject: `[SIGNED] ${trackingId} — ${claimantName}`,
        html: sprgEmailHtml,
        attachments,
      }),
    });

    // Send to client
    if (clientEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: clientEmail,
          subject: `Your SPRG Agreement Has Been Received — ${trackingId}`,
          html: clientEmailHtml,
          attachments,
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
