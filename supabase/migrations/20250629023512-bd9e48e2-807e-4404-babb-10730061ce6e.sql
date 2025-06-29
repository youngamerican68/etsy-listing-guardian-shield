
-- Create compliance_proofs table to store generated certificates
CREATE TABLE public.compliance_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_check_id TEXT NOT NULL,
  public_token TEXT NOT NULL UNIQUE,
  archived_title TEXT NOT NULL,
  archived_description TEXT NOT NULL,
  compliance_status TEXT NOT NULL CHECK (compliance_status IN ('pass', 'warning', 'fail')),
  flagged_terms TEXT[] DEFAULT '{}',
  suggestions TEXT[] DEFAULT '{}',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on public_token for fast lookups
CREATE INDEX idx_compliance_proofs_token ON public.compliance_proofs(public_token);
CREATE INDEX idx_compliance_proofs_user ON public.compliance_proofs(user_id);
CREATE INDEX idx_compliance_proofs_active ON public.compliance_proofs(is_active);

-- Enable RLS on compliance_proofs
ALTER TABLE public.compliance_proofs ENABLE ROW LEVEL SECURITY;

-- Create policies for compliance_proofs
CREATE POLICY "Users can view their own compliance proofs" ON public.compliance_proofs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own compliance proofs" ON public.compliance_proofs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compliance proofs" ON public.compliance_proofs
  FOR UPDATE USING (auth.uid() = user_id);

-- Public policy for proof verification (anyone can view active proofs by token)
CREATE POLICY "Anyone can view active proofs by token" ON public.compliance_proofs
  FOR SELECT USING (is_active = true AND expires_at > NOW());

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_compliance_proofs_updated_at
  BEFORE UPDATE ON public.compliance_proofs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
