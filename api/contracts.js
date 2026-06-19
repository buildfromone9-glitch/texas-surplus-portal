// api/contracts.js
// Secure serverless endpoint for managing wholesale real estate contracts
// Supports Purchase Agreements and Assignment Agreements with state-specific clauses

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://urmwrmeycimtleoeirmn.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_KEY;
const SENDER_EMAIL = 'Vorvo Services <noreply@vorvoservices.com>';
const VORVO_NOTIFY = 'help@vorvoservices.com';

function formatMoney(n) {
  return n ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
}

// Generate state-specific legal disclosures, laws, and clauses
function getStateClauses(state, contractType) {
  const clauses = {
    governingLaw: `This Agreement shall be governed by, interpreted, and construed in accordance with the laws of the State of ${state || 'Texas'}.`,
    disclosures: '',
    specialLanguage: ''
  };

  if (contractType === 'purchase') {
    clauses.assignment = `ASSIGNMENT: Buyer shall have the absolute right to assign this Agreement, in whole or in part, to any third-party cash buyer or entity without requiring the prior written consent of Seller. Seller acknowledges and agrees that Buyer is entering into this Agreement with the explicit intent to wholesale, assign, or otherwise transfer its equitable interest in the Property for a fee.`;
    clauses.inspection = `INSPECTION & DUE DILIGENCE: Buyer, its agents, contractors, partners, and assigns, shall have the absolute right of access to the Property at all reasonable times during the Inspection Period for the purpose of conducting inspections, appraisals, measurements, and feasibility studies. Seller shall provide working utilities and cooperate fully with such access.`;
    
    switch (state) {
      case 'TX':
        clauses.disclosures = `TEXAS EQUITABLE INTEREST DISCLOSURE: Pursuant to Texas Property Code Section 5.086, Buyer hereby discloses in writing to Seller, and Seller explicitly acknowledges, that Buyer holds only an equitable interest under this executory contract and does not hold legal title to the Property. Buyer has the absolute right to market, assign, or sell its contract rights.`;
        break;
      case 'FL':
        clauses.disclosures = `FLORIDA DISCLOSURE OF INTEREST: Seller acknowledges that Buyer is a real estate investor purchasing the Property for investment purposes and may assign this contract. Buyer discloses that they are selling their contract rights (equitable interest) and not the fee simple legal title itself.`;
        break;
      case 'GA':
        clauses.disclosures = `GEORGIA EQUITABLE INTEREST NOTICE: Seller agrees and acknowledges that Buyer holds an equitable interest in the Property and has the right to assign or wholesale this contract to a third party.`;
        break;
      case 'AZ':
        clauses.disclosures = `ARIZONA REAL ESTATE DISCLOSURE: In compliance with Arizona law, Buyer discloses that it holds equitable interest in this Property and intends to assign its rights under this contract for a fee.`;
        break;
      case 'OH':
        clauses.disclosures = `OHIO REAL ESTATE LICENSE ACT DISCLOSURE: This transaction represents a transfer of contract rights (equitable interest) held by Buyer and does not constitute a brokerage service requiring a real estate license.`;
        break;
      case 'NC':
        clauses.disclosures = `NORTH CAROLINA EQUITABLE INTEREST DISCLOSURE: Seller acknowledges that Buyer holds equitable title and is marketing its contractual rights under this Purchase Agreement.`;
        break;
      case 'TN':
        clauses.disclosures = `TENNESSEE WHOLESALING DISCLOSURE: Seller acknowledges that Buyer is a contract purchaser and intends to assign this contract to a cash buyer.`;
        break;
      case 'MO':
        clauses.disclosures = `MISSOURI WHOLESALING DISCLOSURE: Seller acknowledges that Buyer is transferring its contract rights to an assignee and is not acting as a licensed broker.`;
        break;
      case 'OK':
        clauses.disclosures = `OKLAHOMA LICENSE ACT DISCLOSURE: Buyer discloses, and Seller acknowledges, that Buyer is marketing its equitable contract interest only, and not legal title, in full compliance with the Oklahoma Real Estate License Act.`;
        break;
      default:
        clauses.disclosures = `WHOLESALE DISCLOSURE: Seller acknowledges and agrees that Buyer is a real estate contract purchaser, holds an equitable interest in the Property, and intends to assign this contract to a third-party cash buyer for an assignment fee.`;
    }
  } else if (contractType === 'assignment') {
    clauses.disclosures = `ASSIGNMENT AS-IS: Assignee accepts the Property and the original Purchase Agreement in its current 'AS-IS, WHERE-IS' condition, with all faults. Assignor (Vorvo LLC) makes no representations or warranties, express or implied, regarding the physical condition, value, occupancy status, or title of the Property.`;
    clauses.dueDiligence = `DUE DILIGENCE: Assignee represents and warrants that they have performed all necessary inspections, appraisals, title reviews, and due diligence prior to executing this Agreement. Assignee is NOT relying on any marketing materials, estimates, or representations provided by Assignor.`;
    
    switch (state) {
      case 'TX':
        clauses.specialLanguage = `TEXAS PROPERTY CODE NOTICE: Assignee acknowledges receipt of the written disclosure of equitable interest in compliance with Texas Property Code Section 5.086. Assignee understands they are purchasing contract rights only.`;
        break;
      case 'OK':
        clauses.specialLanguage = `OKLAHOMA WHOLESALING REGULATION COMPLIANCE: Assignee acknowledges that this assignment represents a private transaction of contractual rights and complies with Oklahoma wholesaling guidelines.`;
        break;
      default:
        clauses.specialLanguage = `EQUITABLE INTEREST TRANSFER: Assignee acknowledges that they are purchasing Assignor's equitable interest under the original Purchase Agreement and are bound by all terms therein.`;
    }
  }

  return clauses;
}

// Generate the fully formatted HTML of the contract based on type and state
function generateContractHTML(contract, lead) {
  const type = contract.contract_type;
  const state = contract.state;
  const deal = contract.deal_data;
  const buyer = contract.buyer_info || {};
  const clauses = getStateClauses(state, type);
  
  const createdDate = new Date(contract.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const closingDate = deal.closing_date ? new Date(deal.closing_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '[Closing Date Pending]';
  const contractDate = deal.original_contract_date ? new Date(deal.original_contract_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '[Original Contract Date Pending]';

  if (type === 'purchase') {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Georgia, serif; color: #111111; line-height: 1.6; margin: 0; padding: 40px; background: #ffffff; }
  .contract-container { max-width: 800px; margin: 0 auto; color: #111111 !important; }
  .contract-container, .contract-container * { color: #111111 !important; }
  .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #111111; padding-bottom: 20px; }
  .title { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 10px 0; }
  .subtitle { font-size: 14px; font-style: italic; color: #555555; margin: 0; }
  .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  .meta-table td { padding: 8px 12px; border: 1px solid #dddddd; font-size: 14px; }
  .meta-table td.label { font-weight: bold; background: #f9f9f9; width: 30%; }
  h3 { font-size: 16px; font-weight: bold; border-bottom: 1px solid #111111; padding-bottom: 5px; margin-top: 30px; text-transform: uppercase; }
  p { font-size: 14px; text-align: justify; margin-bottom: 15px; }
  ol { font-size: 14px; margin-bottom: 20px; padding-left: 20px; }
  li { margin-bottom: 10px; text-align: justify; }
  .clause-box { padding: 15px; background: #f9f9f9; border-left: 3px solid #111111; margin: 15px 0; font-size: 13.5px; }
  .signature-section { margin-top: 50px; page-break-inside: avoid; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
  .sig-box { border-top: 1px solid #111111; padding-top: 10px; font-size: 13px; }
  .sig-img { max-height: 60px; display: block; margin-bottom: 5px; }
  .footer { font-size: 11px; color: #777777; text-align: center; margin-top: 50px; border-top: 1px solid #eeeeee; padding-top: 10px; }
</style>
</head>
<body>
<div class="contract-container">
  <div class="header">
    <div class="title">Real Estate Purchase &amp; Sale Agreement</div>
    <div class="subtitle">Governing State: ${state} · Tracking ID: ${lead.tracking_id}</div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="label">Seller Name</td>
      <td>${esc(lead.full_name)}</td>
      <td class="label">Agreement Date</td>
      <td>${createdDate}</td>
    </tr>
    <tr>
      <td class="label">Property Address</td>
      <td colspan="3">${esc(lead.property_address)}</td>
    </tr>
    <tr>
      <td class="label">Purchase Price</td>
      <td><strong>${formatMoney(lead.asking_price)}</strong></td>
      <td class="label">Earnest Money</td>
      <td>${formatMoney(lead.deposit_amount || 0)}</td>
    </tr>
    <tr>
      <td class="label">Inspection Period</td>
      <td>${deal.inspection_period || '15'} Days</td>
      <td class="label">Closing Date</td>
      <td>${closingDate}</td>
    </tr>
  </table>

  <p>This Purchase and Sale Agreement ("Agreement") is made and entered into on this ${createdDate}, by and between the Seller listed above ("Seller"), and <strong>Vorvo Services, LLC</strong>, and/or its permitted assigns ("Buyer").</p>

  <h3>1. Purchase and Sale of Property</h3>
  <p>Seller agrees to sell and convey, and Buyer agrees to purchase, all of Seller's right, title, and interest in and to the real property located at the address specified above, together with all improvements, fixtures, and appurtenances thereto.</p>

  <h3>2. Purchase Price &amp; Escrow Deposit</h3>
  <p>The total Purchase Price to be paid by Buyer at closing shall be ${formatMoney(lead.asking_price)}. Buyer shall deposit the Earnest Money of ${formatMoney(lead.deposit_amount || 0)} with a mutually agreeable licensed title company or escrow agent within three (3) business days of the fully executed Agreement. The balance of the Purchase Price shall be paid in cash or certified funds at Closing.</p>

  <h3>3. Due Diligence &amp; Access</h3>
  <div class="clause-box">${clauses.inspection}</div>
  <p>If Buyer determines, in its sole and absolute discretion, that the Property is not suitable for Buyer's investment purposes, Buyer shall have the absolute right to terminate this Agreement by providing written notice to Seller at any time prior to the expiration of the Inspection Period, in which case the Earnest Money Deposit shall be immediately returned to Buyer in full, and neither party shall have any further obligations hereunder.</p>

  <h3>4. Assignment &amp; Wholesaling Rights</h3>
  <div class="clause-box"><strong>${clauses.assignment}</strong></div>

  <h3>5. State-Specific Disclosures &amp; Disclaimers</h3>
  <div class="clause-box" style="background:#fff9e6; border-left-color:#b88a00;">
    <strong>LEGAL DISCLOSURES:</strong><br/><br/>
    ${clauses.disclosures}
  </div>

  <h3>6. Title, Conveyance, and Closing</h3>
  <p>Seller warrants that Seller holds good, marketable, and insurable title to the Property, free and clear of all liens, encumbrances, and clouds, except for standard utility easements and zoning restrictions. Conveyance shall be by General Warranty Deed. Closing shall take place on or before the Closing Date specified above. All standard closing costs, including title search, title insurance, escrow fees, and transfer taxes, shall be allocated according to standard local real estate customs.</p>

  <h3>7. As-Is Condition</h3>
  <p>Buyer acknowledges that it is purchasing the Property in its current "AS-IS, WHERE-IS" physical condition, with all faults. Seller makes no warranties, express or implied, regarding the structural, mechanical, or environmental condition of the Property, except as explicitly set forth in this Agreement.</p>

  <h3>8. Default Provisions</h3>
  <p>In the event of a default by Buyer, Seller's sole and exclusive remedy shall be to retain the Earnest Money Deposit as liquidated damages, and Seller hereby waives any right to seek specific performance or additional damages. In the event of a default by Seller, Buyer shall have the right to seek return of its Earnest Money Deposit, sue for specific performance, or pursue any other remedies available at law or in equity.</p>

  <h3>9. Governing Law</h3>
  <p>${clauses.governingLaw}</p>

  <div class="signature-section">
    <h3>Electronic Signatures &amp; Execution</h3>
    <p>By signing below, the parties agree to be legally bound by this Agreement. The parties consent to the use of electronic signatures, which shall carry the same legal weight and validity as handwritten original signatures.</p>
    
    <div class="sig-grid">
      <div class="sig-box">
        <strong>SELLER:</strong><br/><br/>
        <div style="height:60px;">
          ${contract.status === 'signed' ? `<img src="${contract.signature_data}" class="sig-img" alt="Seller Signature" />` : '<em>Awaiting Seller Signature</em>'}
        </div>
        <div>Name: ${esc(contract.signer_name || lead.full_name)}</div>
        <div>Date: ${contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div>
        ${contract.ip_address ? `<div style="font-size:10px; color:#777777;">IP: ${contract.ip_address}</div>` : ''}
      </div>
      <div class="sig-box">
        <strong>BUYER (Vorvo Services, LLC):</strong><br/><br/>
        <div style="height:60px; line-height:60px; font-size:20px; font-family:'Brush Script MT', cursive; color:#15172b;">
          D. S. &nbsp;·&nbsp; J. V.
        </div>
        <div>Name: Dennis S. / Joel V.</div>
        <div>Title: Authorized Co-Operators</div>
        <div>Date: ${createdDate}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Vorvo Services LLC · help@vorvoservices.com · (832) 735-0603</p>
    <p>Tracking ID: ${lead.tracking_id} · Secure Token: ${contract.secure_token}</p>
  </div>
</div>
</body>
</html>`;
  } else if (type === 'assignment') {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Georgia, serif; color: #111111; line-height: 1.6; margin: 0; padding: 40px; background: #ffffff; }
  .contract-container { max-width: 800px; margin: 0 auto; color: #111111 !important; }
  .contract-container, .contract-container * { color: #111111 !important; }
  .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #111111; padding-bottom: 20px; }
  .title { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 10px 0; }
  .subtitle { font-size: 14px; font-style: italic; color: #555555; margin: 0; }
  .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  .meta-table td { padding: 8px 12px; border: 1px solid #dddddd; font-size: 14px; }
  .meta-table td.label { font-weight: bold; background: #f9f9f9; width: 30%; }
  h3 { font-size: 16px; font-weight: bold; border-bottom: 1px solid #111111; padding-bottom: 5px; margin-top: 30px; text-transform: uppercase; }
  p { font-size: 14px; text-align: justify; margin-bottom: 15px; }
  .clause-box { padding: 15px; background: #f9f9f9; border-left: 3px solid #111111; margin: 15px 0; font-size: 13.5px; }
  .signature-section { margin-top: 50px; page-break-inside: avoid; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
  .sig-box { border-top: 1px solid #111111; padding-top: 10px; font-size: 13px; }
  .sig-img { max-height: 60px; display: block; margin-bottom: 5px; }
  .footer { font-size: 11px; color: #777777; text-align: center; margin-top: 50px; border-top: 1px solid #eeeeee; padding-top: 10px; }
</style>
</head>
<body>
<div class="contract-container">
  <div class="header">
    <div class="title">Assignment of Real Estate Purchase Contract</div>
    <div class="subtitle">Governing State: ${state} · Transaction Ref: ${lead.tracking_id}</div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="label">Assignor (Wholesaler)</td>
      <td>Vorvo Services, LLC</td>
      <td class="label">Assignee (Cash Buyer)</td>
      <td>${esc(buyer.legal_name || '[Assignee Pending]')} ${buyer.entity_name ? `(${esc(buyer.entity_name)})` : ''}</td>
    </tr>
    <tr>
      <td class="label">Property Address</td>
      <td colspan="3">${esc(lead.property_address)}</td>
    </tr>
    <tr>
      <td class="label">Original Contract Date</td>
      <td>${contractDate}</td>
      <td class="label">Original Purchase Price</td>
      <td>${formatMoney(deal.purchase_price || lead.asking_price)}</td>
    </tr>
    <tr>
      <td class="label">Assignment Fee</td>
      <td><strong>${formatMoney(deal.assignment_fee)}</strong></td>
      <td class="label">Earnest Deposit</td>
      <td>${formatMoney(deal.earnest_money !== undefined && deal.earnest_money !== null ? deal.earnest_money : (lead.deposit_amount || 0))}</td>
    </tr>
    <tr>
      <td class="label">Total Acquisition Price</td>
      <td><strong>${formatMoney((deal.purchase_price || lead.asking_price) + (deal.assignment_fee || 0))}</strong></td>
      <td class="label">Closing Date</td>
      <td>${closingDate}</td>
    </tr>
  </table>

  <p>This Assignment of Real Estate Purchase Contract ("Assignment Agreement") is made and executed on this ${createdDate}, by and between <strong>Vorvo Services, LLC</strong> ("Assignor"), and the Assignee listed above ("Assignee").</p>

  <h3>Recitals</h3>
  <p>WHEREAS, Assignor entered into a certain Real Estate Purchase &amp; Sale Agreement dated ${contractDate} ("Original Contract") as Buyer, with the legal owner of the Property as Seller, for the purchase of the real property located at the address specified above; and</p>
  <p>WHEREAS, Assignor desires to assign, transfer, and convey all of its rights, title, interest, and obligations under said Original Contract to Assignee, and Assignee desires to accept said assignment under the terms and conditions set forth herein.</p>

  <h3>1. Assignment of Rights and Obligations</h3>
  <p>For valuable consideration, the receipt and sufficiency of which are hereby acknowledged, Assignor hereby transfers, assigns, and conveys to Assignee all of Assignor's rights, benefits, privileges, and obligations under the Original Contract. Assignee hereby completely assumes all obligations, covenants, and closing requirements of the Buyer under the Original Contract.</p>

  <h3>2. Financial Terms &amp; Assignment Fee</h3>
  <p>Assignee agrees to pay Assignor a non-refundable Assignment Fee of <strong>${formatMoney(deal.assignment_fee)}</strong>. This Assignment Fee shall be paid as follows:</p>
  <ol>
    <li>An Earnest Money Deposit of ${formatMoney(deal.earnest_money !== undefined && deal.earnest_money !== null ? deal.earnest_money : (lead.deposit_amount || 0))} shall be deposited by Assignee with the designated escrow agent/title company within twenty-four (24) hours of execution of this Assignment Agreement.</li>
    <li>The remaining balance of the Assignment Fee shall be paid to Assignor in cash or wire transfer at the time of closing.</li>
  </ol>

  <h3>3. Due Diligence and Inspection Disclaimer</h3>
  <div class="clause-box"><strong>${clauses.dueDiligence}</strong></div>
  <div class="clause-box">${clauses.disclosures}</div>

  <h3>4. Closing &amp; Title</h3>
  <p>Closing shall take place on or before the Closing Date specified above. Assignee shall be solely responsible for all of Assignee's closing costs, title insurance premiums, and transfer taxes. Assignor shall cooperate with the title company to facilitate a simultaneous or double-closing as required. Any default by Assignee under this Assignment Agreement or the Original Contract shall result in the immediate forfeiture of the Earnest Money Deposit to Assignor as liquidated damages.</p>

  <h3>5. State-Specific Clauses &amp; Disclosures</h3>
  <div class="clause-box" style="background:#fff9e6; border-left-color:#b88a00;">
    <strong>LEGAL NOTICE:</strong><br/><br/>
    ${clauses.specialLanguage}
  </div>

  <h3>6. Governing Law</h3>
  <p>${clauses.governingLaw}</p>

  <div class="signature-section">
    <h3>Electronic Signatures &amp; Execution</h3>
    <p>By signing below, the parties agree to be legally bound by this Assignment Agreement. The parties consent to the use of electronic signatures, which shall carry the same legal weight and validity as handwritten original signatures.</p>
    
    <div class="sig-grid">
      <div class="sig-box">
        <strong>ASSIGNOR (Vorvo Services, LLC):</strong><br/><br/>
        <div style="height:60px; line-height:60px; font-size:20px; font-family:'Brush Script MT', cursive; color:#15172b;">
          D. S. &nbsp;·&nbsp; J. V.
        </div>
        <div>Name: Dennis S. / Joel V.</div>
        <div>Title: Authorized Assignors</div>
        <div>Date: ${createdDate}</div>
      </div>
      <div class="sig-box">
        <strong>ASSIGNEE (Cash Buyer):</strong><br/><br/>
        <div style="height:60px;">
          ${contract.status === 'signed' ? `<img src="${contract.signature_data}" class="sig-img" alt="Buyer Signature" />` : '<em>Awaiting Assignee Signature</em>'}
        </div>
        <div>Name: ${esc(contract.signer_name || buyer.legal_name)}</div>
        ${buyer.entity_name ? `<div>Entity: ${esc(buyer.entity_name)}</div>` : ''}
        <div>Date: ${contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div>
        ${contract.ip_address ? `<div style="font-size:10px; color:#777777;">IP: ${contract.ip_address}</div>` : ''}
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Vorvo Services LLC · help@vorvoservices.com · (832) 735-0603</p>
    <p>Tracking ID: ${lead.tracking_id} · Secure Token: ${contract.secure_token}</p>
  </div>
</div>
</body>
</html>`;
  }
  return '';
}

function esc(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req) {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const url = new URL(req.url);
    const method = req.method;
    const tokenParam = url.searchParams.get('token');
    const actionParam = url.searchParams.get('action');

    // ==========================================
    // 1. PUBLIC GET: Load contract by token
    // ==========================================
    if (method === 'GET' && tokenParam) {
      // Query contracts table
      const contractRes = await fetch(
        `${SUPABASE_URL}/rest/v1/contracts?secure_token=eq.${encodeURIComponent(tokenParam)}&select=*`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          }
        }
      );

      if (!contractRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to load contract' }), { status: 500, headers });
      }

      const contracts = await contractRes.json();
      if (!contracts || contracts.length === 0) {
        return new Response(JSON.stringify({ error: 'Contract not found' }), { status: 404, headers });
      }

      const contract = contracts[0];

      // Load signer info if signed
      if (contract.status === 'signed') {
        const signerRes = await fetch(
          `${SUPABASE_URL}/rest/v1/contract_signers?contract_id=eq.${contract.id}&select=*`,
          {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
            }
          }
        );
        if (signerRes.ok) {
          const signers = await signerRes.json();
          if (signers && signers.length > 0) {
            const signer = signers[0];
            contract.signer_name = signer.signer_name;
            contract.signature_data = signer.signature_data;
            contract.ip_address = signer.ip_address;
            contract.user_agent = signer.user_agent;
          }
        }
      }

      // Load associated lead
      const leadRes = await fetch(
        `${SUPABASE_URL}/rest/v1/wholesale_leads?id=eq.${contract.deal_id}&select=*`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          }
        }
      );

      if (!leadRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to load associated deal' }), { status: 500, headers });
      }

      const leads = await leadRes.json();
      if (!leads || leads.length === 0) {
        return new Response(JSON.stringify({ error: 'Associated deal not found' }), { status: 404, headers });
      }

      const lead = leads[0];

      // Generate actual contract HTML
      contract.generated_html = generateContractHTML(contract, lead);

      return new Response(JSON.stringify({ success: true, contract, lead }), { status: 200, headers });
    }

    // ==========================================
    // 2. PUBLIC POST: Sign contract
    // ==========================================
    if (method === 'POST' && (url.pathname.endsWith('/sign') || actionParam === 'sign')) {
      const body = await req.json();
      const { token, signerName, signerEmail, signatureData, ipAddress, userAgent, buyerInfo } = body;

      if (!token || !signerName || !signatureData) {
        return new Response(JSON.stringify({ error: 'Missing required signature fields' }), { status: 400, headers });
      }

      // Load contract
      const contractRes = await fetch(
        `${SUPABASE_URL}/rest/v1/contracts?secure_token=eq.${encodeURIComponent(token)}&select=*`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          }
        }
      );

      const contracts = await contractRes.json();
      if (!contracts || contracts.length === 0) {
        return new Response(JSON.stringify({ error: 'Contract not found' }), { status: 404, headers });
      }

      const contract = contracts[0];
      if (contract.status === 'signed') {
        return new Response(JSON.stringify({ error: 'Contract is already signed' }), { status: 400, headers });
      }
      if (contract.status === 'void') {
        return new Response(JSON.stringify({ error: 'Contract has been voided' }), { status: 400, headers });
      }

      // Load lead
      const leadRes = await fetch(
        `${SUPABASE_URL}/rest/v1/wholesale_leads?id=eq.${contract.deal_id}&select=*`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          }
        }
      );
      const lead = (await leadRes.json())[0];

      const signedAt = new Date().toISOString();

      // Update contract status
      const contractUpdatePayload = {
        status: 'signed',
        signed_at: signedAt
      };

      if (buyerInfo) {
        contractUpdatePayload.buyer_info = buyerInfo;
      }

      // Regenerate and save the updated contract HTML with signature populated!
      const finalContract = { 
        ...contract, 
        ...contractUpdatePayload,
        signer_name: signerName,
        signature_data: signatureData,
        ip_address: ipAddress || 'unknown',
        user_agent: userAgent || 'unknown'
      };
      const finalLead = { ...lead };
      contractUpdatePayload.generated_html = generateContractHTML(finalContract, finalLead);

      const contractUpdateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/contracts?id=eq.${contract.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(contractUpdatePayload)
        }
      );

      if (!contractUpdateRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to save signature' }), { status: 500, headers });
      }

      // Record in contract_signers
      await fetch(
        `${SUPABASE_URL}/rest/v1/contract_signers`,
        {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contract_id: contract.id,
            signer_name: signerName,
            signer_email: signerEmail || lead.email,
            signer_role: contract.contract_type === 'purchase' ? 'seller' : 'buyer',
            signed_at: signedAt,
            signature_data: signatureData,
            ip_address: ipAddress || 'unknown',
            user_agent: userAgent || 'unknown'
          })
        }
      );

      // If Purchase Agreement: update wholesale_leads table
      if (contract.contract_type === 'purchase') {
        await fetch(
          `${SUPABASE_URL}/rest/v1/wholesale_leads?id=eq.${contract.deal_id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'under_contract',
              signed: true,
              signature_data: signatureData,
              signer_name: signerName,
              signed_at: signedAt
            })
          }
        );
      }

      // ===== EMAIL SENDING VIA RESEND =====
      if (RESEND_KEY) {
        try {
          const signedDateFormatted = new Date(signedAt).toLocaleString('en-US', {
            timeZone: 'America/Chicago',
            dateStyle: 'long',
            timeStyle: 'short'
          });

          // Generate final contract HTML with signature populated
          const finalContract = { ...contract, ...contractUpdatePayload };
          const finalLead = { ...lead };
          const contractHtmlContent = generateContractHTML(finalContract, finalLead);

          const emailSubject = contract.contract_type === 'purchase'
            ? `[SIGNED] Purchase Agreement — ${lead.tracking_id} — ${lead.full_name}`
            : `[SIGNED] Assignment Agreement — ${lead.tracking_id} — ${signerName}`;

          const clientSubject = contract.contract_type === 'purchase'
            ? `Your Signed Purchase Agreement Received — ${lead.tracking_id}`
            : `Your Signed Assignment Agreement Received — ${lead.tracking_id}`;

          // Notify Admin
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: SENDER_EMAIL,
              reply_to: 'help@vorvoservices.com',
              to: VORVO_NOTIFY,
              subject: emailSubject,
              html: contractHtmlContent
            })
          });

          // Notify Client/Buyer
          const targetEmail = contract.contract_type === 'purchase' ? lead.email : signerEmail;
          if (targetEmail) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: SENDER_EMAIL,
                reply_to: 'help@vorvoservices.com',
                to: targetEmail,
                subject: clientSubject,
                html: contractHtmlContent
              })
            });
          }
        } catch (emailErr) {
          console.error('Failed to send confirmation emails:', emailErr);
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Contract signed successfully' }), { status: 200, headers });
    }

    // ==========================================
    // ADMIN AUTHENTICATED ENDPOINTS
    // ==========================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing token' }), { status: 401, headers });
    }
    const token = authHeader.split(' ')[1];

    // Verify token with Supabase Auth
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { status: 401, headers });
    }

    // ==========================================
    // 3. ADMIN GET: List all contracts
    // ==========================================
    if (method === 'GET') {
      const contractsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/contracts?select=*,wholesale_leads(tracking_id,full_name,property_address)&order=created_at.desc`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          }
        }
      );

      if (!contractsRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to load contracts list' }), { status: 500, headers });
      }

      const contracts = await contractsRes.json();
      return new Response(JSON.stringify({ success: true, contracts }), { status: 200, headers });
    }

    // ==========================================
    // 4. ADMIN POST: Create contract
    // ==========================================
    if (method === 'POST') {
      const body = await req.json();
      const { dealId, contractType, state, dealData, buyerInfo } = body;

      if (!dealId || !contractType || !state || !dealData) {
        return new Response(JSON.stringify({ error: 'Missing required contract fields' }), { status: 400, headers });
      }

      // Generate VRV-CTR-###### format token (random 6-digit number)
      const randomNum = Math.floor(Math.random() * 900000) + 100000; // 100000-999999
      const secureToken = 'VRV-CTR-' + randomNum.toString().padStart(6, '0');

      const contractPayload = {
        deal_id: dealId,
        contract_type: contractType,
        state,
        status: 'sent',
        secure_token: secureToken,
        deal_data: dealData,
        buyer_info: buyerInfo || null
      };

      const createRes = await fetch(
        `${SUPABASE_URL}/rest/v1/contracts`,
        {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(contractPayload)
        }
      );

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error('Failed to create contract:', errText);
        return new Response(JSON.stringify({ error: 'Failed to create contract' }), { status: 500, headers });
      }

      const createdContracts = await createRes.json();
      
      // If Purchase Agreement: generate access token in wholesale_leads
      if (contractType === 'purchase') {
        await fetch(
          `${SUPABASE_URL}/rest/v1/wholesale_leads?id=eq.${dealId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              access_token: secureToken,
              governing_state: state,
              offer_amount: dealData.purchase_price,
              deposit_amount: dealData.earnest_money,
              contract_terms: dealData.contract_terms || ''
            })
          }
        );
      }

      return new Response(JSON.stringify({ success: true, contract: createdContracts[0] }), { status: 200, headers });
    }

    // ==========================================
    // 5. ADMIN POST: Void contract
    // ==========================================
    if (method === 'PATCH' && (url.pathname.endsWith('/void') || actionParam === 'void')) {
      const body = await req.json();
      const { contractId } = body;

      const voidRes = await fetch(
        `${SUPABASE_URL}/rest/v1/contracts?id=eq.${contractId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'void' })
        }
      );

      if (!voidRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to void contract' }), { status: 500, headers });
      }

      return new Response(JSON.stringify({ success: true, message: 'Contract voided successfully' }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  } catch (err) {
    console.error('Contracts API Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
