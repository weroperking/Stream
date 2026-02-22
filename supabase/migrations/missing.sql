-- Add missing columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pin_hash TEXT,
ADD COLUMN IF NOT EXISTS pin_location TEXT,
ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS avatar_style TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'pending';

-- Add column to profiles table for default profile
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_profile_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Ensure the user has a row in the profiles table
-- This syncs auth.users with the profiles table
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.users.id)
ON CONFLICT (id) DO NOTHING;

-- Update RLS policy to allow users to insert their own profiles
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can insert own user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create user profiles" ON public.user_profiles;

-- Create permissive policy for development
CREATE POLICY "Users can insert own user_profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Also update other policies to be consistent
DROP POLICY IF EXISTS "Users can view own user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own user profiles" ON public.user_profiles;

CREATE POLICY "Users can view own user_profiles"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own user profiles" ON public.user_profiles;

CREATE POLICY "Users can update own user_profiles"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own user profiles" ON public.user_profiles;

CREATE POLICY "Users can delete own user_profiles"
  ON public.user_profiles FOR DELETE
  USING (auth.uid() = user_id);
