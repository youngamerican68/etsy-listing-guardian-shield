
-- Step 1: Drop ALL existing policies on the profiles table to ensure a clean slate.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Step 2: Create a trusted helper function to get the current user's role.
-- SECURITY DEFINER gives it a "security pass" to bypass RLS and prevent recursion.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  -- We must check if the user exists in profiles first, otherwise it can error.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
    RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
  ELSE
    RETURN 'user'; -- Default to 'user' if profile doesn't exist yet
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the new, simple RLS policies that use the trusted function.
-- This policy allows a user to see their own profile.
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- This policy allows an admin to see ALL profiles. It is now safe from recursion.
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_current_user_role() = 'admin');

-- This policy allows a user to update their own profile.
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
