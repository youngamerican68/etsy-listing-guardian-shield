
-- Create user profiles table with role support
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create compliance_rules table
CREATE TABLE public.compliance_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL UNIQUE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('high', 'warning')),
  reason TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on term for faster lookups
CREATE INDEX idx_compliance_rules_term ON public.compliance_rules(term);
CREATE INDEX idx_compliance_rules_active ON public.compliance_rules(is_active);

-- Enable RLS on compliance_rules
ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;

-- Create policies for compliance_rules
CREATE POLICY "Anyone can view active compliance rules" ON public.compliance_rules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all compliance rules" ON public.compliance_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Pre-populate compliance_rules table with initial data
INSERT INTO public.compliance_rules (term, risk_level, reason) VALUES
-- High Risk Terms
('alcohol', 'high', 'Violates Alcohol & Drugs policy'),
('tobacco', 'high', 'Violates Alcohol & Drugs policy'),
('vape', 'high', 'Violates Alcohol & Drugs policy'),
('cbd', 'high', 'Prohibited drug claims'),
('ivory', 'high', 'Violates Animal Products policy'),
('gun', 'high', 'Violates Weapons policy'),
('counterfeit', 'high', 'Violates policy on illegal items'),
('dropshipping', 'high', 'Violates the Handmade Policy'),
('pay outside of etsy', 'high', 'Violates Fee Avoidance policy'),
('disney', 'high', 'Aggressively protected trademark'),
('nike', 'high', 'Aggressively protected trademark'),
('louis vuitton', 'high', 'Aggressively protected trademark'),
('harry potter', 'high', 'Aggressively protected trademark'),
('replica', 'high', 'Term used for counterfeit goods'),
-- Warning Terms
('inspired by', 'warning', 'Implies association with a brand'),
('-style', 'warning', 'Implies association with a brand'),
('vintage', 'warning', 'Item must be verifiably 20+ years old'),
('handmade', 'warning', 'Must be made/designed by you');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_rules_updated_at
  BEFORE UPDATE ON public.compliance_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
