-- Update the CHECK constraint on the category column to include 'terms_of_use'
ALTER TABLE public.etsy_policies DROP CONSTRAINT etsy_policies_category_check;
ALTER TABLE public.etsy_policies ADD CONSTRAINT etsy_policies_category_check 
CHECK (category IN ('terms', 'prohibited_items', 'handmade', 'intellectual_property', 'fees_payments', 'community_conduct', 'terms_of_use'));