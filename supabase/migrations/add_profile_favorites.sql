-- ============================================================================
-- Add Profile Favorites Table
-- ============================================================================
-- This migration adds a dedicated favorites table that stores user's favorite
-- movies and TV shows with proper foreign key relationships to user_profiles.
-- This ensures favorites are associated with specific profiles.

-- Create the favorites table
CREATE TABLE IF NOT EXISTS public.profile_favorites (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference to the user (from auth.users)
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Reference to the specific profile (Netflix-style household profile)
  profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  -- The TMDB ID of the title
  tmdb_id INTEGER NOT NULL,
  
  -- Content type: 'movie' or 'tv'
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  
  -- Title name at time of favoriting (for display purposes)
  title TEXT NOT NULL,
  
  -- Poster path for the content
  poster_path TEXT,
  
  -- Year of release
  release_year TEXT,
  
  -- Timestamp when favorited
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one favorite per profile per content
  UNIQUE(profile_id, tmdb_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profile_favorites_user_id 
  ON public.profile_favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_profile_favorites_profile_id 
  ON public.profile_favorites(profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_favorites_tmdb_id 
  ON public.profile_favorites(tmdb_id);

CREATE INDEX IF NOT EXISTS idx_profile_favorites_content_type 
  ON public.profile_favorites(content_type);

-- Add foreign key index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profile_favorites_user_profile 
  ON public.profile_favorites(user_id, profile_id);

-- ============================================================================
-- Update content_preferences table to add proper constraints
-- ============================================================================

-- Add index on profile_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_content_preferences_profile_id 
  ON public.content_preferences(profile_id);

-- Add index on user_id + profile_id combination
CREATE INDEX IF NOT EXISTS idx_content_preferences_user_profile 
  ON public.content_preferences(user_id, profile_id);

-- ============================================================================
-- Add RLS Policies for profile_favorites
-- ============================================================================

-- Enable RLS
ALTER TABLE public.profile_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
  ON public.profile_favorites FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles 
    WHERE id = auth.uid()
  ));

-- Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites"
  ON public.profile_favorites FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM public.profiles 
    WHERE id = auth.uid()
  ));

-- Users can update their own favorites
CREATE POLICY "Users can update their own favorites"
  ON public.profile_favorites FOR UPDATE
  USING (user_id IN (
    SELECT id FROM public.profiles 
    WHERE id = auth.uid()
  ));

-- Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
  ON public.profile_favorites FOR DELETE
  USING (user_id IN (
    SELECT id FROM public.profiles 
    WHERE id = auth.uid()
  ));

-- ============================================================================
-- Add function to get favorites for a specific profile
-- ============================================================================

CREATE OR REPLACE FUNCTION get_profile_favorites(p_profile_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  profile_id UUID,
  tmdb_id INTEGER,
  content_type TEXT,
  title TEXT,
  poster_path TEXT,
  release_year TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pf.id,
    pf.user_id,
    pf.profile_id,
    pf.tmdb_id,
    pf.content_type,
    pf.title,
    pf.poster_path,
    pf.release_year,
    pf.created_at
  FROM public.profile_favorites pf
  WHERE pf.profile_id = p_profile_id
    AND pf.user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid())
  ORDER BY pf.created_at DESC;
END;
$$;

-- ============================================================================
-- Add function to add a favorite
-- ============================================================================

CREATE OR REPLACE FUNCTION add_profile_favorite(
  p_profile_id UUID,
  p_tmdb_id INTEGER,
  p_content_type TEXT,
  p_title TEXT,
  p_poster_path TEXT DEFAULT NULL,
  p_release_year TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_favorite_id UUID;
BEGIN
  -- Get the user_id from the profile
  SELECT up.user_id INTO v_user_id
  FROM public.user_profiles up
  WHERE up.id = p_profile_id;

  -- Verify the current user owns this profile
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Invalid profile or unauthorized';
  END IF;

  -- Insert the favorite
  INSERT INTO public.profile_favorites (
    user_id,
    profile_id,
    tmdb_id,
    content_type,
    title,
    poster_path,
    release_year
  ) VALUES (
    v_user_id,
    p_profile_id,
    p_tmdb_id,
    p_content_type,
    p_title,
    p_poster_path,
    p_release_year
  )
  ON CONFLICT (profile_id, tmdb_id) DO UPDATE
  SET title = EXCLUDED.title,
      poster_path = EXCLUDED.poster_path,
      release_year = EXCLUDED.release_year
  RETURNING id INTO v_favorite_id;

  RETURN v_favorite_id;
END;
$$;

-- ============================================================================
-- Add function to remove a favorite
-- ============================================================================

CREATE OR REPLACE FUNCTION remove_profile_favorite(
  p_profile_id UUID,
  p_tmdb_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get the user_id from the profile
  SELECT up.user_id INTO v_user_id
  FROM public.user_profiles up
  WHERE up.id = p_profile_id;

  -- Verify the current user owns this profile
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Invalid profile or unauthorized';
  END IF;

  -- Delete the favorite
  DELETE FROM public.profile_favorites
  WHERE profile_id = p_profile_id
    AND tmdb_id = p_tmdb_id
  RETURNING id INTO v_deleted_count;

  RETURN v_deleted_count IS NOT NULL;
END;
$$;

-- ============================================================================
-- Add trigger to also save to content_preferences when adding favorites
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_favorite_to_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Also add to content_preferences for recommendation purposes
  INSERT INTO public.content_preferences (
    user_id,
    profile_id,
    tmdb_id,
    content_type,
    liked,
    source
  ) VALUES (
    NEW.user_id,
    NEW.profile_id,
    NEW.tmdb_id,
    NEW.content_type,
    TRUE,
    'favorite'
  )
  ON CONFLICT (user_id, tmdb_id) DO UPDATE
  SET liked = TRUE,
      profile_id = COALESCE(EXCLUDED.profile_id, content_preferences.profile_id),
      source = 'favorite';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_favorite_to_preferences 
  ON public.profile_favorites;

CREATE TRIGGER trigger_sync_favorite_to_preferences
AFTER INSERT ON public.profile_favorites
FOR EACH ROW
EXECUTE FUNCTION sync_favorite_to_preferences();

-- Comment
COMMENT ON TABLE public.profile_favorites IS 'Stores favorite movies and TV shows for each user profile, with proper foreign key relationships to user_profiles table';
