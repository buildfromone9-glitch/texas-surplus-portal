-- ============================================================
-- Update Tracking ID Generation to Use Random 6-Digit Numbers
-- ============================================================
-- This replaces the sequential number generation with random 6-digit numbers
-- Format: VRV-WHL-###### (e.g., VRV-WHL-847293)
-- ============================================================

-- 1. Update wholesale_leads tracking ID trigger
CREATE OR REPLACE FUNCTION set_wholesale_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_id IS NULL THEN
        -- Generate random 6-digit number (100000-999999)
        NEW.tracking_id := 'VRV-WHL-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update property_quotes tracking ID trigger - ALL use VRV-WHL prefix now
CREATE OR REPLACE FUNCTION set_property_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_id IS NULL THEN
        -- All property quotes now use VRV-WHL prefix with random 6-digit number
        NEW.tracking_id := 'VRV-WHL-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create contracts tracking ID trigger (if not exists)
CREATE OR REPLACE FUNCTION set_contract_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.secure_token IS NULL THEN
        -- Contracts use VRV-CTR prefix with random 6-digit number
        NEW.secure_token := 'VRV-CTR-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Bind trigger to contracts table
DROP TRIGGER IF EXISTS trigger_set_contract_tracking_id ON public.contracts;
CREATE TRIGGER trigger_set_contract_tracking_id
BEFORE INSERT ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION set_contract_tracking_id();

-- 5. Drop the old sequences (no longer needed)
DROP SEQUENCE IF EXISTS public.wholesale_lead_seq;
DROP SEQUENCE IF EXISTS public.property_quote_seq;

-- 6. Notify PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
