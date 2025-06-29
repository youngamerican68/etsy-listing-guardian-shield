
-- Create a security definer function to get current user role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop the problematic admin policy that causes recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate the admin policy using the security definer function
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    public.get_current_user_role() = 'admin'
  );
