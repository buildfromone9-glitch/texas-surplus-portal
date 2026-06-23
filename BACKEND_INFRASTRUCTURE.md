# Backend Infrastructure - Implementation Guide

**Branch:** `backend-infrastructure-test`
**Created:** June 19, 2026
**Status:** Ready for testing, NOT YET CONNECTED to frontend

---

## Overview

This branch contains backend infrastructure code that is **ready for future use** but not yet integrated into the live website. All endpoints are functional but operate in "logging mode" - they log actions without making database changes until the connected tables are created.

---

## New Files Added

### API Endpoints

| File | Purpose | Status |
|------|---------|--------|
| `api/capture-payment.js` | Capture authorized Stripe payments after job completion | Ready |
| `api/refund-payment.js` | Process full or partial refunds | Ready |
| `api/send-sms.js` | Send SMS notifications via Twilio | Ready (Twilio not configured) |
| `api/admin/analytics.js` | Dashboard analytics and metrics | Ready (returns empty data) |
| `api/admin/export.js` | Export data as CSV/JSON | Ready |
| `api/webhooks/stripe.js` | Handle Stripe webhook events | Ready |
| `api/cron/payment-reminders.js` | Daily payment reminder job | Ready |
| `api/cron/quote-expiration.js` | Daily quote expiration job | Ready |
| `api/cron/status-updates.js` | Daily status escalation job | Ready |

### Database Schema

| File | Purpose |
|------|---------|
| `setup-extended-schema.sql` | Extended database tables and functions |

### Utility Library

| File | Purpose |
|------|---------|
| `api/lib/utils.js` | Shared helper functions for all API endpoints |

---

## Database Schema (setup-extended-schema.sql)

### New Tables

#### 1. `payments`
Tracks all payment transactions across all divisions.

```sql
-- Key fields
id UUID PRIMARY KEY
quote_id UUID -- Links to labor jobs
agreement_id UUID -- Links to surplus agreements
stripe_payment_intent_id TEXT
amount_cents INTEGER
status TEXT -- pending, authorized, captured, succeeded, failed, refunded, disputed
```

#### 2. `providers`
Manages service providers (contractors) for labor services.

```sql
-- Key fields
id UUID PRIMARY KEY
business_name TEXT
contact_name TEXT
phone TEXT
services TEXT[] -- ['moving', 'junk', 'pressure', 'yard']
rating NUMERIC(3,2)
active BOOLEAN
```

#### 3. `communications`
Logs all communications with clients and providers.

```sql
-- Key fields
id UUID PRIMARY KEY
related_id UUID -- quote_id, agreement_id, etc.
type TEXT -- 'email', 'sms', 'phone', 'note'
direction TEXT -- 'inbound', 'outbound'
status TEXT -- 'sent', 'delivered', 'opened', 'failed'
```

#### 4. `notifications`
Stores notifications for admin/client/provider dashboards.

```sql
-- Key fields
id UUID PRIMARY KEY
recipient_type TEXT -- 'admin', 'client', 'provider'
title TEXT
message TEXT
read BOOLEAN
action_url TEXT
```

#### 5. `audit_log`
Comprehensive audit trail for all sensitive operations.

```sql
-- Key fields
id UUID PRIMARY KEY
action TEXT -- 'agreement.signed', 'payment.captured', etc.
target_table TEXT
target_id UUID
old_values JSONB
new_values JSONB
actor_ip_address INET
```

#### 6. `settings`
Application configuration stored in database.

```sql
-- Key fields
key TEXT UNIQUE
value JSONB
```

---

## Environment Variables Required

Add these to Vercel environment variables when ready to enable:

```bash
# Stripe Webhooks
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio SMS
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Cron Jobs
CRON_SECRET=your-secret-key-here

# IP Info (for audit logging)
IPINFO_TOKEN=...
```

---

## Cron Job Schedule

Configured in `vercel.json`:

| Job | Schedule | Purpose |
|-----|----------|---------|
| `payment-reminders` | Daily at 9 AM | Send overdue payment reminders |
| `quote-expiration` | Daily at midnight | Mark old quotes as expired |
| `status-updates` | Daily at 8 AM | Escalate stale records |

---

## Utility Functions (api/lib/utils.js)

### Formatting
- `formatCurrency(cents)` - Format cents as USD
- `formatDate(date, format)` - Format dates for display
- `formatPhone(phone)` - Format phone numbers
- `formatTrackingId(id)` - Normalize tracking IDs

### Validation
- `isValidEmail(email)` - Email validation
- `isValidPhone(phone)` - US phone validation
- `isValidTrackingId(id)` - Tracking ID format validation
- `isValidTexasPropertyId(id)` - Texas Comptroller ID validation

### Email
- `sendEmail(options)` - Send via Resend
- `emailTemplates.paymentConfirmation(data)` - Pre-built templates
- `emailTemplates.quoteReady(data)`
- `emailTemplates.invoice(data)`

### Other
- `generateTrackingId(prefix)` - Create unique tracking IDs
- `logAudit(params)` - Log to audit table
- `getIpLocation(ip)` - Get IP geolocation
- `ApiError` - Custom error class
- `handleError(res, error)` - Standard error responses

---

## How to Enable

### Step 1: Run Database Migrations
```sql
-- In Supabase SQL Editor, run:
\i setup-extended-schema.sql
```

### Step 2: Add Environment Variables
Add the required environment variables to Vercel.

### Step 3: Configure Stripe Webhooks
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://www.vorvoservices.com/api/webhooks/stripe`
3. Select events: `payment_intent.*`, `charge.*`, `checkout.session.*`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

### Step 4: Configure Twilio (Optional)
1. Create Twilio account
2. Buy a phone number
3. Add credentials to Vercel environment variables

### Step 5: Merge to Main
When ready to go live:
```bash
git checkout main
git merge backend-infrastructure-test
git push origin main
```

---

## Testing the Endpoints

### Test Payment Capture
```bash
curl -X POST https://vorvoservices.com/api/capture-payment \
  -H "Content-Type: application/json" \
  -d '{"payment_intent_id": "pi_test_123"}'
```

### Test Analytics (requires auth)
```bash
curl https://vorvoservices.com/api/admin/analytics \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

### Test Export (requires auth)
```bash
curl https://vorvoservices.com/api/admin/export?type=agreements&format=csv \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

---

## API Endpoint Reference

### Payment Endpoints

#### `POST /api/capture-payment`
Capture an authorized payment.

**Request:**
```json
{
  "payment_intent_id": "pi_xxx",
  "amount": 5000,  // Optional: partial capture amount in cents
  "quote_id": "uuid"  // Optional: for database linking
}
```

**Response:**
```json
{
  "success": true,
  "payment_intent": {
    "id": "pi_xxx",
    "amount_captured": 5000,
    "status": "succeeded"
  }
}
```

#### `POST /api/refund-payment`
Refund a payment.

**Request:**
```json
{
  "payment_intent_id": "pi_xxx",
  "amount": 5000,  // Optional: partial refund
  "reason": "requested_by_customer",
  "quote_id": "uuid",
  "notes": "Customer cancelled"
}
```

### SMS Endpoint

#### `POST /api/send-sms`
Send SMS notification.

**Request:**
```json
{
  "to": "+12345678900",
  "message": "Your quote is ready!",
  "type": "confirmation",
  "related_id": "quote-uuid"
}
```

**Or use templates:**
```json
{
  "to": "+12345678900",
  "template": "quote_ready",
  "template_data": {
    "tracking_id": "VRV-MOV-0001"
  }
}
```

### Analytics Endpoint

#### `GET /api/admin/analytics`
Get dashboard metrics.

**Query params:**
- `period` - `week`, `month`, `quarter`, `year`, `all`
- `division` - `surplus`, `labor`, `wholesale`, `all`

**Response:**
```json
{
  "success": true,
  "period": "month",
  "data": {
    "surplus": { "total_leads": 10, "signed_agreements": 5 },
    "labor": { "total_requests": 20, "completed_jobs": 15 },
    "wholesale": { "total_leads": 5, "closed_deals": 2 },
    "revenue": { "by_division": { "surplus": 5000, "labor": 3000 } }
  }
}
```

### Export Endpoint

#### `GET /api/admin/export`
Export data as CSV or JSON.

**Query params:**
- `type` - `agreements`, `quotes`, `wholesale`, `payments`
- `format` - `csv`, `json`
- `startDate` - ISO date string
- `endDate` - ISO date string

### Webhook Endpoint

#### `POST /api/webhooks/stripe`
Handle Stripe events. Automatically called by Stripe.

---

## Security Notes

1. **All admin endpoints require authentication** via Supabase Bearer token
2. **Cron endpoints verify secret** via `x-cron-secret` header or `Authorization` header
3. **Stripe webhooks verify signature** when `STRIPE_WEBHOOK_SECRET` is configured
4. **Row Level Security** enabled on all new tables

---

## Next Steps

1. **Review and test** the endpoints locally or on a preview deployment
2. **Run database migrations** in Supabase when ready
3. **Configure external services** (Stripe webhooks, Twilio)
4. **Merge to main** when ready for production
5. **Connect frontend** to use the new endpoints

---

## Questions?

Contact: help@vorvoservices.com
