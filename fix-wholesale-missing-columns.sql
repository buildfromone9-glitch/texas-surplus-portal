-- ============================================
-- FIX: Add Missing Columns to wholesale_leads
-- ============================================
-- Date: 2026-06-15
-- Issue: Production table missing columns required by application code
-- Error: "Could not find the 'access_token' column of 'wholesale_leads' in the schema cache"
-- Error: "Could not find the 'contract_terms' column of 'wholesale_leads' in the schema cache"
-- ============================================

-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/urmwrmeycimtleoeirmn/sql

-- Add missing contract/agreement columns
ALTER TABLE public.wholesale_leads ADD COLUMN IF NOT EXISTS access_token text UNIQUE;
ALTER TABLE public.wholesale_leads ADD COLUMN IF NOT EXISTS signed boolean DEFAULT false NOT NULL;
ALTER TABLE public.wholesale_leads ADD COLUMN IF NOT EXISTS signature_data text;
ALTER TABLE public.wholesale_leads ADD COLUMN IF NOT EXISTS signer_name text;
ALTER TABLE public.wholesale_leads ADD COLUMN IF NOT EXISTS signed_at timestamp with time zone;
ALTER TABLE public.wholesale_leads ADD COLUMN IF NOT EXISTS contract_terms text;
ALTER TABLE public.wholesale_leads ADD COLUMN IF NOT EXISTS property_value numeric(12,2);
ALTER TABLE public.wholesale_leads ADD COLUMN IF NOT EXISTS offer_amount numeric(12,2);
ALTER TABLE public.wholesale_leads ADD COLUMN IF NOT EXISTS deposit_amount numeric(12,2) DEFAULT 0.00;

-- Create index on access_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_wholesale_leads_access_token ON public.wholesale_leads(access_token);

-- Create index on tracking_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_wholesale_leads_tracking_id ON public.wholesale_leads(tracking_id);

-- Notify PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
