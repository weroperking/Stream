-- Add missing INSERT policy to profiles table
-- This is needed because users cannot create their own profile during signup
-- without this policy

-- Create INSERT policy for profiles table
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
