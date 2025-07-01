
-- First, let's check and fix the profiles table policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can INSERT their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can SELECT their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can UPDATE their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate simple, working policies for profiles
CREATE POLICY "Enable all access for users based on user_id" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Enable read access for admins" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fix compliance_rules policies
DROP POLICY IF EXISTS "Anyone can view active compliance rules" ON public.compliance_rules;
DROP POLICY IF EXISTS "Admins can manage all compliance rules" ON public.compliance_rules;

-- Create working policies for compliance_rules
CREATE POLICY "Enable read access for authenticated users" ON public.compliance_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable all access for admins" ON public.compliance_rules
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
