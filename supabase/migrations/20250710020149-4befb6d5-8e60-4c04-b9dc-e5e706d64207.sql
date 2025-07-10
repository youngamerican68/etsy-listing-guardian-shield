-- Add content_hash column to policy_sections table for reliable duplicate detection
ALTER TABLE public.policy_sections 
ADD COLUMN content_hash TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_policy_sections_content_hash ON public.policy_sections(content_hash);