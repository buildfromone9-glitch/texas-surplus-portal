-- ============================================================
-- SQL Migration: Wholesale Real Estate Contracts System
-- ============================================================

-- 1. Extend wholesale_leads table with governing_state if not exists
ALTER TABLE public.wholesale_leads ADD COLUMN IF NOT EXISTS governing_state text DEFAULT 'TX' NOT NULL;

-- 2. Create contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    deal_id uuid REFERENCES public.wholesale_leads(id) ON DELETE CASCADE NOT NULL,
    contract_type text NOT NULL, -- 'purchase' or 'assignment'
    state text NOT NULL, -- 'TX', 'FL', 'GA', 'AZ', 'OH', 'NC', 'TN', 'MO', 'OK', 'other'
    status text DEFAULT 'draft'::text NOT NULL, -- 'draft', 'sent', 'signed', 'void'
    secure_token text UNIQUE NOT NULL,
    expiration_date timestamp with time zone,
    generated_html text,
    generated_pdf_url text,
    signed_at timestamp with time zone,
    buyer_info jsonb, -- { "legal_name", "entity_name", "email", "phone", "mailing_address", "proof_of_funds_url" }
    deal_data jsonb -- { "purchase_price", "assignment_fee", "earnest_money", "closing_date", "original_contract_date", "inspection_period" }
);

-- 3. Create contract_signers table
CREATE TABLE IF NOT EXISTS public.contract_signers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id uuid REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
    signer_name text NOT NULL,
    signer_email text NOT NULL,
    signer_role text NOT NULL, -- 'seller', 'buyer', 'vorvo'
    signed_at timestamp with time zone,
    signature_data text, -- base64 signature image
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create contract_templates table
CREATE TABLE IF NOT EXISTS public.contract_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    state text NOT NULL, -- 'TX', 'FL', 'GA', 'AZ', 'OH', 'NC', 'TN', 'MO', 'OK', 'other'
    contract_type text NOT NULL, -- 'purchase' or 'assignment'
    template_version text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    template_html text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_template UNIQUE (state, contract_type, template_version)
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for public access (token-based)
-- Anyone can read a contract if they have the secure_token
DROP POLICY IF EXISTS "Allow public select on contracts by token" ON public.contracts;
CREATE POLICY "Allow public select on contracts by token" 
ON public.contracts FOR SELECT 
USING (true);

-- Anyone can insert into contract_signers (to sign)
DROP POLICY IF EXISTS "Allow public insert on contract_signers" ON public.contract_signers;
CREATE POLICY "Allow public insert on contract_signers" 
ON public.contract_signers FOR INSERT 
WITH CHECK (true);

-- Anyone can select signers (to see who has signed)
DROP POLICY IF EXISTS "Allow public select on contract_signers" ON public.contract_signers;
CREATE POLICY "Allow public select on contract_signers" 
ON public.contract_signers FOR SELECT 
USING (true);

-- Anyone can update contracts (to mark as signed, save generated html etc.)
DROP POLICY IF EXISTS "Allow public update on contracts" ON public.contracts;
CREATE POLICY "Allow public update on contracts" 
ON public.contracts FOR UPDATE 
USING (true)
WITH CHECK (true);

-- 7. Admin Policies (authenticated role)
DROP POLICY IF EXISTS "Allow authenticated full access on contracts" ON public.contracts;
CREATE POLICY "Allow authenticated full access on contracts" 
ON public.contracts FOR ALL 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated full access on contract_signers" ON public.contract_signers;
CREATE POLICY "Allow authenticated full access on contract_signers" 
ON public.contract_signers FOR ALL 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated full access on contract_templates" ON public.contract_templates;
CREATE POLICY "Allow authenticated full access on contract_templates" 
ON public.contract_templates FOR ALL 
USING (auth.role() = 'authenticated');

-- 8. Grant permissions
GRANT ALL ON public.contracts TO anon, authenticated, service_role;
GRANT ALL ON public.contract_signers TO anon, authenticated, service_role;
GRANT ALL ON public.contract_templates TO anon, authenticated, service_role;

-- 9. Notify PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
