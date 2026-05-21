export const config = { runtime: 'edge' };

const RESEND_KEY = 're_iNRTDfoC_NG2h6N7yuQp9ykTTAPC6C9wi';
const SPRG_EMAIL = 'claims@sprggroup.com';
const SPRG_NOTIFY = 'buildfromone9@gmail.com';

function usd(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const {
      claimantName, clientEmail, trackingId, propertyId,
      disbursementDate, dateOfNotice, grossAmount,
      invoiceNumber, invoiceDate, feeAmount, paymentDueDate,
    } = await req.json();

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:Georgia,serif;color:#15172b;background:#faf6ee;margin:0;padding:0}
  .wrap{max-width:680px;margin:0 auto;padding:40px 24px}
  .hdr{border-bottom:2px solid #15172b;padding-bottom:20px;margin-bottom:28px}
  .hdr h1{font-size:22px;margin:0 0 4px}
  .hdr p{margin:0;color:#5a5d75;font-size:13px}
  .badge{display:inline-block;background:#a07f3d;color:#fff;padding:3px 12px;font-size:11px;font-family:monospace;border-radius:2px;margin-bottom:20px;letter-spacing:.1em}
  table{width:100%;border-collapse:collapse;margin-bottom:28px}
  td{padding:9px 12px;border-bottom:1px solid #d8cdb3;font-size:14px}
  td:first-child{font-weight:bold;color:#5a5d75;width:210px}
  .total td{font-size:15px;font-weight:bold;color:#15172b;border-bottom:2px solid #15172b}
  .lbl{font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:#5a5d75;margin:0 0 10px}
  p{font-size:14px;line-height:1.7;color:#2a2d4a}
  .ftr{font-size:11px;color:#999;border-top:1px solid #d8cdb3;padding-top:14px;margin-top:28px}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>Surplus Property Research Group</h1><p>Texas Foreclosure Surplus Recovery — Invoice</p></div>
  <div class="badge">INVOICE</div>
  <p>Dear ${claimantName},</p>
  <p>Thank you for your notice of disbursement dated ${dateOfNotice}. Pursuant to Section 2 of our Agreement, please find below the invoice for the 10% contingency service fee.</p>
  <p class="lbl">Invoice Details</p>
  <table>
    <tr><td>Invoice Number</td><td>${invoiceNumber}</td></tr>
    <tr><td>Invoice Date</td><td>${invoiceDate}</td></tr>
    <tr><td>Tracking #</td><td>${trackingId}</td></tr>
    <tr><td>Property / Claim Ref.</td><td>${propertyId}</td></tr>
    <tr><td>Disbursement Received</td><td>${usd(grossAmount)} on ${disbursementDate}</td></tr>
    <tr class="total"><td>Service Fee Due (10%)</td><td>${usd(feeAmount)}</td></tr>
    <tr><td>Payment Due By</td><td>${paymentDueDate}</td></tr>
  </table>
  <p class="lbl">Payment Methods</p>
  <table>
    <tr><td>Check</td><td>Payable to Surplus Property Research Group — reply to this email for mailing address</td></tr>
    <tr><td>ACH / Other</td><td>Reply to this email to request ACH transfer details</td></tr>
  </table>
  <p>If you have any questions about this invoice, please reply to this email. We appreciate the opportunity to have assisted with your claim.</p>
  <p>Regards,<br><strong>Surplus Property Research Group</strong><br><a href="mailto:${SPRG_EMAIL}">${SPRG_EMAIL}</a></p>
  <div class="ftr"><p>Invoice ${invoiceNumber} · Tracking: ${trackingId} · Generated ${invoiceDate}</p></div>
</div></body></html>`;

    const send = (to, subject) => fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Surplus Property Research Group <noreply@sprggroup.com>',
        to,
        reply_to: 'claims@sprggroup.com',
        subject,
        html,
      }),
    });

    await send(clientEmail, `Invoice — 10% Contingency Service Fee — ${propertyId}`);
    await send(SPRG_NOTIFY, `[COPY] Invoice ${invoiceNumber} sent to ${claimantName}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
