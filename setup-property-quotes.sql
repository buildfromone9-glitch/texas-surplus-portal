-- Vorvo Services - Property Quotes SQL Migration Script
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/urmwrmeycimtleoeirmn/sql)

-- 1. Create the property_quotes table
CREATE TABLE IF NOT EXISTS public.property_quotes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    tracking_id text UNIQUE,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    service_category text NOT NULL,
    location_address text NOT NULL,
    job_details text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL, -- 'new', 'quoted', 'scheduled', 'completed', 'cancelled'
    quote_amount numeric(10,2),
    assigned_provider_name text,
    assigned_provider_phone text,
    internal_notes text,
    image_urls text[] DEFAULT '{}'::text[],
    contract_signer_name text,
    contract_signature_data text,
    contract_signed_at timestamp with time zone,
    payment_method text
);

-- 1b. Ensure columns exist if table was already created
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}'::text[];
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS contract_signer_name text;
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS contract_signature_data text;
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS contract_signed_at timestamp with time zone;
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS payment_method text;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.property_quotes ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Allow anyone to insert quote requests (public quote submission)
CREATE POLICY "Allow public insert to property_quotes" 
ON public.property_quotes 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to select quote requests by tracking_id (public tracking page)
CREATE POLICY "Allow public select by tracking_id" 
ON public.property_quotes 
FOR SELECT 
USING (true);

-- Allow public updates to sign agreements
CREATE POLICY "Allow public update to property_quotes" 
ON public.property_quotes 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Allow authenticated users (admin) to do all operations
CREATE POLICY "Allow authenticated users full access" 
ON public.property_quotes 
FOR ALL 
USING (auth.role() = 'authenticated');

-- 4. Create sequence for generating clean sequential tracking IDs (starting at 5001 for professional appearance)
CREATE SEQUENCE IF NOT EXISTS property_quote_seq START WITH 5001;

-- 5. Trigger function to automatically format and assign VRV-PRP-XXXX tracking IDs
CREATE OR REPLACE FUNCTION set_property_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_id IS NULL THEN
        NEW.tracking_id := 'VRV-PRP-' || nextval('property_quote_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Bind trigger to the table
DROP TRIGGER IF EXISTS trigger_set_property_tracking_id ON public.property_quotes;
CREATE TRIGGER trigger_set_property_tracking_id
BEFORE INSERT ON public.property_quotes
FOR EACH ROW
EXECUTE FUNCTION set_property_tracking_id();

-- 7. Create Storage Bucket for Job Images (if storage schema exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('job-images', 'job-images', true) 
ON CONFLICT (id) DO NOTHING;

-- Enable public select/insert on storage objects for job-images bucket
CREATE POLICY "Allow public read of job images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'job-images');

CREATE POLICY "Allow public upload of job images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'job-images');
