
-- Step 1: Drop ALL existing policies on the profiles table to ensure a clean slate.
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Step 2: Create the essential policies with explicit permissions.
-- THIS IS THE CRITICAL NEW POLICY THAT WAS MISSING:
CREATE POLICY "Users can INSERT their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- This policy allows users to SELECT their own profile.
CREATE POLICY "Users can SELECT their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- This policy allows users to UPDATE their own profile.
CREATE POLICY "Users can UPDATE their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- The admin policy remains the same, allowing them to view all profiles.
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_current_user_role() = 'admin');
