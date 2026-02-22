-- ============================================================================
-- Invenio Streaming Platform - Database Schema
-- ============================================================================
-- This schema sets up the database tables needed for user authentication,
-- profiles, onboarding flow, and content preferences.
--
-- To apply this schema:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire file
-- 3. Run the query
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";



-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

-- Onboarding step enum
CREATE TYPE onboarding_step AS ENUM (
  'pending',
  'profile_setup',
  'preferences',
  'completed'
);

-- Profile avatar options
CREATE TYPE avatar_style AS ENUM (
  'default',
  'cinema',
  'action',
  'comedy',
  'drama',
  'scifi',
  'horror',
  'romance'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- User Profiles Table
-- Stores additional user information beyond what Supabase Auth provides
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  -- Primary key - references Supabase auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User's full name (optional, can be updated later)
  full_name TEXT,
  
  -- Avatar image URL
  avatar_url TEXT,
  
  -- Onboarding status tracking
  onboarding_step onboarding_step DEFAULT 'pending'::onboarding_step,
  
  -- Whether user has completed onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  
  -- Timestamp when onboarding was completed
  onboarding_completed_at TIMESTAMPTZ,
  
  -- User preferences stored as JSON
  preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Account creation timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Last profile update
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- User Profiles Table
-- Allows multiple profiles per household (Netflix-style)
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference to the main user account
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Profile name (e.g., "John", "Kids", "Guest")
  name TEXT NOT NULL,
  
  -- Profile avatar style
  avatar_style avatar_style DEFAULT 'default'::avatar_style,
  
  -- Custom avatar image URL (optional override)
  custom_avatar_url TEXT,
  
  -- Is this the main profile (account owner)
  is_main BOOLEAN DEFAULT FALSE,
  
  -- Profile PIN for parental controls (4 digits, encrypted)
  pin_hash TEXT,
  
  -- Whether this profile is locked/requires PIN
  is_locked BOOLEAN DEFAULT FALSE,
  
  -- Profile-specific preferences
  preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Content Preferences / Taste Profile
-- Stores user preferences for content recommendations
-- ---------------------------------------------------------------------------
CREATE TABLE public.content_preferences (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference to the user
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Reference to a specific profile (optional - can be user-level)
  profile_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  
  -- The TMDB ID of the title
  tmdb_id INTEGER NOT NULL,
  
  -- Content type: 'movie' or 'tv'
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  
  -- Whether the user liked this content
  liked BOOLEAN DEFAULT TRUE,
  
  -- How the recommendation was generated (for analytics)
  source TEXT,
  
  -- Timestamp of preference
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one preference per user per content
  UNIQUE(user_id, tmdb_id)
);

-- ---------------------------------------------------------------------------
-- Watch History
-- Tracks what users have watched
-- ---------------------------------------------------------------------------
CREATE TABLE public.watch_history (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference to the user
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Reference to profile (required for data segregation)
  profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  -- TMDB content ID
  tmdb_id INTEGER NOT NULL,
  
  -- Content type
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  
  -- For TV shows - specific season/episode
  season_number INTEGER,
  episode_number INTEGER,
  
  -- Watch progress (percentage 0-100)
  progress DECIMAL(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Total duration in seconds (for resume functionality)
  duration INTEGER,
  
  -- Whether the content was completed
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Last watched timestamp
  last_watched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one watch history entry per profile/media/season/episode combination
  CONSTRAINT watch_history_profile_media_unique UNIQUE (profile_id, tmdb_id, content_type, season_number, episode_number)
);

-- ---------------------------------------------------------------------------
-- User Watchlist
-- Saved content for later
-- ---------------------------------------------------------------------------
CREATE TABLE public.watchlist (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference to the user
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Reference to profile (required for data segregation)
  profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  -- TMDB content ID
  tmdb_id INTEGER NOT NULL,
  
  -- Content type
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  
  -- Added to watchlist at
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one watchlist entry per profile/media combination
  CONSTRAINT watchlist_profile_media_unique UNIQUE (profile_id, tmdb_id, content_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Profile indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(id);
CREATE INDEX idx_profiles_onboarding ON public.profiles(onboarding_step) WHERE NOT onboarding_completed;

-- User profiles indexes
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Content preferences indexes
CREATE INDEX idx_content_preferences_user_id ON public.content_preferences(user_id);
CREATE INDEX idx_content_preferences_tmdb_id ON public.content_preferences(tmdb_id);

-- Watch history indexes
CREATE INDEX idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX idx_watch_history_progress ON public.watch_history(progress) WHERE NOT completed;

-- Watchlist indexes
CREATE INDEX idx_watchlist_user_id ON public.watchlist(user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Function to handle user signup - NOTE: Cannot be used as trigger on auth.users
-- due to ownership requirements. Profile creation is handled in application code.
-- Keeping function for reference only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function cannot be used as a trigger on auth.users
  -- Profile creation is handled in the Next.js application code
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE: Trigger on auth.users removed - requires owner privileges
-- Profile creation is handled in application code

-- ---------------------------------------------------------------------------
-- Function to update the updated_at timestamp
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Profiles RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- User Profiles RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profiles
CREATE POLICY "Users can view own user profiles"
  ON public.user_profiles FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Users can create their own profiles
CREATE POLICY "Users can create user profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Users can update their own profiles
CREATE POLICY "Users can update own user profiles"
  ON public.user_profiles FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Users can delete their own profiles
CREATE POLICY "Users can delete own user profiles"
  ON public.user_profiles FOR DELETE
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Content Preferences RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.content_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can view own content preferences"
  ON public.content_preferences FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Users can create their own preferences
CREATE POLICY "Users can create content preferences"
  ON public.content_preferences FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Users can update their own preferences
CREATE POLICY "Users can update content preferences"
  ON public.content_preferences FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Users can delete their own preferences
CREATE POLICY "Users can delete content preferences"
  ON public.content_preferences FOR DELETE
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Watch History RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- Users can read their own watch history
CREATE POLICY "Users can view own watch history"
  ON public.watch_history FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Users can create their own watch history
CREATE POLICY "Users can create watch history"
  ON public.watch_history FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Users can update their own watch history
CREATE POLICY "Users can update watch history"
  ON public.watch_history FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Users can delete their own watch history
CREATE POLICY "Users can delete watch history"
  ON public.watch_history FOR DELETE
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Watchlist RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Users can read their own watchlist
CREATE POLICY "Users can view own watchlist"
  ON public.watchlist FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Users can add to their own watchlist
CREATE POLICY "Users can create watchlist items"
  ON public.watchlist FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Users can update their own watchlist
CREATE POLICY "Users can update watchlist"
  ON public.watchlist FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Users can remove from their own watchlist
CREATE POLICY "Users can delete watchlist items"
  ON public.watchlist FOR DELETE
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================

-- Sample content IDs for the taste picker (popular titles)
-- These will be used to pre-populate the preference selection screen
INSERT INTO public.content_preferences (user_id, tmdb_id, content_type, liked)
SELECT 
  p.id,
  (ARRAY[1399, 1396, 456, 2316, 66732, 60735, 1399, 1396, 60735, 1399])[floor(random() * 10 + 1)],
  CASE WHEN random() > 0.5 THEN 'tv' ELSE 'movie' END,
  NULL
FROM public.profiles p
WHERE false;  -- Set to true to enable

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
