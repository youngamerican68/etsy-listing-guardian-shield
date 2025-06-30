
-- Step 1: Delete the problematic user from the core authentication system.
DELETE FROM auth.users WHERE email = 'stockbees@gmail.com';

-- Step 2: Ensure RLS is re-enabled on the profiles table for security.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop all old policies and functions for a clean slate.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own compliance proofs" ON public.profiles;
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Step 4: Create the trusted helper function.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
    RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
  ELSE
    RETURN 'user';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create the new, correct RLS policies.
-- This policy allows a user to CREATE their own profile.
CREATE POLICY "Users can create their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- This policy allows a user to VIEW and UPDATE their own profile.
CREATE POLICY "Users can view and update their own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- This policy allows an ADMIN to view all profiles.
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_current_user_role() = 'admin');
