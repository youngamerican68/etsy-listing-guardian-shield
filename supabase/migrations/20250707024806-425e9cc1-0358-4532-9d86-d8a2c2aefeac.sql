-- Add unique constraint to url column in etsy_policies table
ALTER TABLE public.etsy_policies ADD CONSTRAINT etsy_policies_url_unique UNIQUE (url);