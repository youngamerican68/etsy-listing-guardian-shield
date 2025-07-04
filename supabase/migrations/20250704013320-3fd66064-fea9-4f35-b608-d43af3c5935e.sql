-- Create table for caching compliance analysis results
CREATE TABLE public.compliance_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_hash text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL,
  flagged_terms text[] DEFAULT '{}',
  suggestions text[] DEFAULT '{}',
  confidence numeric NOT NULL DEFAULT 0,
  rule_matches jsonb DEFAULT '[]',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  hit_count integer NOT NULL DEFAULT 1
);

-- Index for fast lookups by content hash
CREATE INDEX idx_compliance_cache_content_hash ON public.compliance_cache(content_hash);

-- Index for cleanup of expired entries
CREATE INDEX idx_compliance_cache_expires_at ON public.compliance_cache(expires_at);

-- Enable RLS
ALTER TABLE public.compliance_cache ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read cache
CREATE POLICY "Allow authenticated users to read cache" 
ON public.compliance_cache 
FOR SELECT 
TO authenticated
USING (true);

-- Policy to allow all authenticated users to insert cache entries
CREATE POLICY "Allow authenticated users to insert cache entries" 
ON public.compliance_cache 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Policy to allow all authenticated users to update cache entries (for hit_count)
CREATE POLICY "Allow authenticated users to update cache entries" 
ON public.compliance_cache 
FOR UPDATE 
TO authenticated
USING (true);

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.compliance_cache 
  WHERE expires_at < now();
END;
$$;