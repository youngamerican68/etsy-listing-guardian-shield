-- Create tables for Etsy policy storage and management

-- Main policies table for storing full policy documents
CREATE TABLE public.etsy_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('terms', 'prohibited_items', 'handmade', 'intellectual_property', 'fees_payments', 'community_conduct')),
  last_updated TIMESTAMP WITH TIME ZONE,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Policy sections for categorized rule segments
CREATE TABLE public.policy_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.etsy_policies(id) ON DELETE CASCADE,
  section_title TEXT NOT NULL,
  section_content TEXT NOT NULL,
  plain_english_summary TEXT,
  category TEXT NOT NULL CHECK (category IN ('account_integrity', 'intellectual_property', 'prohibited_items', 'handmade_reselling', 'fees_payments', 'community_conduct')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Keywords extracted from policy sections
CREATE TABLE public.policy_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_section_id UUID NOT NULL REFERENCES public.policy_sections(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  context TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cross-references between policy sections
CREATE TABLE public.policy_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_section_id UUID NOT NULL REFERENCES public.policy_sections(id) ON DELETE CASCADE,
  target_section_id UUID NOT NULL REFERENCES public.policy_sections(id) ON DELETE CASCADE,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('related', 'exception', 'clarification', 'see_also')) DEFAULT 'related',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_etsy_policies_category ON public.etsy_policies(category);
CREATE INDEX idx_etsy_policies_active ON public.etsy_policies(is_active);
CREATE INDEX idx_policy_sections_policy_id ON public.policy_sections(policy_id);
CREATE INDEX idx_policy_sections_category ON public.policy_sections(category);
CREATE INDEX idx_policy_sections_risk_level ON public.policy_sections(risk_level);
CREATE INDEX idx_policy_keywords_section_id ON public.policy_keywords(policy_section_id);
CREATE INDEX idx_policy_keywords_keyword ON public.policy_keywords(keyword);
CREATE INDEX idx_policy_keywords_active ON public.policy_keywords(is_active);

-- Enable Row Level Security
ALTER TABLE public.etsy_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_references ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can read, only admins can modify
CREATE POLICY "Authenticated users can read policies" 
ON public.etsy_policies 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage policies" 
ON public.etsy_policies 
FOR ALL 
USING (is_admin_user());

CREATE POLICY "Authenticated users can read policy sections" 
ON public.policy_sections 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage policy sections" 
ON public.policy_sections 
FOR ALL 
USING (is_admin_user());

CREATE POLICY "Authenticated users can read policy keywords" 
ON public.policy_keywords 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage policy keywords" 
ON public.policy_keywords 
FOR ALL 
USING (is_admin_user());

CREATE POLICY "Authenticated users can read policy references" 
ON public.policy_references 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage policy references" 
ON public.policy_references 
FOR ALL 
USING (is_admin_user());

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_etsy_policies_updated_at
BEFORE UPDATE ON public.etsy_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policy_sections_updated_at
BEFORE UPDATE ON public.policy_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policy_keywords_updated_at
BEFORE UPDATE ON public.policy_keywords
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();