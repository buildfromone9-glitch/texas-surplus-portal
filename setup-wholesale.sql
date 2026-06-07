-- Vorvo Services - Wholesale Property Solutions SQL Migration Script
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/urmwrmeycimtleoeirmn/sql)

-- 1. Create the wholesale_leads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wholesale_leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    tracking_id text UNIQUE,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    property_address text NOT NULL,
    property_details text NOT NULL,
    asking_price numeric(12,2),
    estimated_value numeric(12,2),
    status text DEFAULT 'new'::text NOT NULL, -- 'new', 'analyzing', 'offer_sent', 'under_contract', 'closed', 'cancelled'
    internal_notes text,
    
    -- Contract / Agreement Columns
    access_token text UNIQUE,
    signed boolean DEFAULT false NOT NULL,
    signature_data text,
    signer_name text,
    signed_at timestamp with time zone,
    contract_terms text,
    property_value numeric(12,2),
    offer_amount numeric(12,2),
    deposit_amount numeric(12,2) DEFAULT 0.00
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.wholesale_leads ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Allow anyone to insert leads (public lead submission)
DROP POLICY IF EXISTS "Allow public insert to wholesale_leads" ON public.wholesale_leads;
CREATE POLICY "Allow public insert to wholesale_leads" 
ON public.wholesale_leads FOR INSERT 
WITH CHECK (true);

-- Allow anyone to select leads by tracking_id or access_token (public tracking & signing)
DROP POLICY IF EXISTS "Allow public select by tracking_id wholesale" ON public.wholesale_leads;
CREATE POLICY "Allow public select by tracking_id wholesale" 
ON public.wholesale_leads FOR SELECT 
USING (true);

-- Allow authenticated users (admin) to do all operations
DROP POLICY IF EXISTS "Allow authenticated users full access wholesale" ON public.wholesale_leads;
CREATE POLICY "Allow authenticated users full access wholesale" 
ON public.wholesale_leads FOR ALL 
USING (auth.role() = 'authenticated');

-- 4. Create sequence for generating clean sequential tracking IDs (starting at 3001)
CREATE SEQUENCE IF NOT EXISTS wholesale_lead_seq START WITH 3001;

-- 5. Trigger function to automatically format and assign VRV-WHL-XXXX tracking IDs
CREATE OR REPLACE FUNCTION set_wholesale_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_id IS NULL THEN
        NEW.tracking_id := 'VRV-WHL-' || nextval('wholesale_lead_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Bind trigger to the table
DROP TRIGGER IF EXISTS trigger_set_wholesale_tracking_id ON public.wholesale_leads;
CREATE TRIGGER trigger_set_wholesale_tracking_id
BEFORE INSERT ON public.wholesale_leads
FOR EACH ROW
EXECUTE FUNCTION set_wholesale_tracking_id();

-- 7. Grant sequence permissions to public/anon roles
GRANT USAGE, SELECT ON SEQUENCE public.wholesale_lead_seq TO anon, authenticated, service_role;
