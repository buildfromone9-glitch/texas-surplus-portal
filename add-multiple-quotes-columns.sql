-- SQL script to add multiple contractor quote options to property_quotes
-- Copy-paste this script into your Supabase SQL Editor (https://supabase.com/dashboard/project/urmwrmeycimtleoeirmn/sql)

-- 1. Add columns for Option 1 additional details
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS provider_schedule_1 text;
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS provider_notes_1 text;

-- 2. Add columns for Option 2 details
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS provider_name_2 text;
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS provider_phone_2 text;
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS quote_amount_2 numeric(10,2);
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS provider_schedule_2 text;
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS provider_notes_2 text;

-- 3. Add columns for Option 3 details
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS provider_name_3 text;
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS provider_phone_3 text;
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS quote_amount_3 numeric(10,2);
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS provider_schedule_3 text;
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS provider_notes_3 text;

-- 4. Add column to track which option index the client selected (1, 2, or 3)
ALTER TABLE public.property_quotes ADD COLUMN IF NOT EXISTS selected_option_index integer DEFAULT 1;

-- 5. Update the tracking ID generation trigger to automatically set prefix based on service category
CREATE OR REPLACE FUNCTION set_property_tracking_id()
RETURNS TRIGGER AS $$
DECLARE
    prefix text := 'VRV-PRP-';
BEGIN
    IF NEW.tracking_id IS NULL THEN
        IF NEW.service_category = 'moving' THEN
            prefix := 'VRV-MOV-';
        ELSIF NEW.service_category = 'junk' THEN
            prefix := 'VRV-JNK-';
        ELSIF NEW.service_category = 'pressure' THEN
            prefix := 'VRV-WSH-';
        ELSIF NEW.service_category = 'yard' THEN
            prefix := 'VRV-YRD-';
        END IF;
        NEW.tracking_id := prefix || nextval('property_quote_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
