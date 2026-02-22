-- =============================================================================
-- Supabase Database Schema for Oryno Stream
-- Migration: 001_initial_schema.sql
-- Description: Core authentication, profiles, and onboarding tables
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for secure password hashing and random generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- CLEAN UP EXISTING OBJECTS (for safe re-run)
-- =============================================================================
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- DROP TABLES (child-first to respect foreign keys)
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.title_preferences CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =============================================================================
-- PROFILES TABLE
-- Extends auth.users with additional user information and onboarding state
-- =============================================================================
CREATE TABLE public.profiles (
    -- Primary key - references auth.users.id
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- User email from auth.users (denormalized for easier querying)
    email TEXT NOT NULL UNIQUE,
    
    -- User's unique username (for profile URLs)
    username TEXT UNIQUE,
    
    -- User's full display name
    full_name TEXT,
    
    -- URL to user's avatar image
    avatar_url TEXT,
    
    -- User's bio/description
    bio TEXT,
    
    -- Onboarding state tracking
    onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Current step in the onboarding flow (e.g., 'profiles', 'preferences', 'complete')
    current_step TEXT DEFAULT 'started',
    
    -- User preferences stored as JSONB for flexibility
    preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- USER_PROFILES TABLE
-- For the "who will be watching" feature - supports multiple profiles per user
-- =============================================================================
CREATE TABLE public.user_profiles (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key to the main user profile
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Display name for this profile (e.g., "Dad", "Mom", "Kids")
    name TEXT NOT NULL,
    
    -- URL to custom avatar image
    avatar_url TEXT,
    
    -- Color for the avatar (hex code)
    avatar_color TEXT DEFAULT '#6366f1' NOT NULL,
    
    -- Whether this profile is currently active/selected
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- TITLE_PREFERENCES TABLE
-- For taste picker - stores movie/TV show preferences per profile
-- =============================================================================
CREATE TABLE public.title_preferences (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key to user_profiles (which links to profiles)
    profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- TMDB (The Movie Database) ID for the title
    tmdb_id INTEGER NOT NULL,
    
    -- Type of media: 'movie' or 'tv'
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
    
    -- Whether the user liked (true) or disliked (false) the title
    liked BOOLEAN NOT NULL,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Unique constraint inline
    CONSTRAINT title_preferences_profile_tmdb_unique UNIQUE (profile_id, tmdb_id, media_type)
);

-- =============================================================================
-- USER_SESSIONS TABLE
-- For session management and device tracking
-- =============================================================================
CREATE TABLE public.user_sessions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key to profiles
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Device information stored as JSON (browser, OS, device type)
    device_info JSONB DEFAULT '{}'::jsonb,
    
    -- Last time this session was active
    last_active TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- TRIGGER FUNCTIONS
-- =============================================================================

-- Function to handle user signup - NOTE: Cannot be used as trigger on auth.users
-- due to ownership requirements. Profile creation is handled in application code.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update updated_at on profile changes
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to update updated_at on user_profiles changes
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index on profiles for user lookup by email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Index on profiles for username lookup (unique)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Index on profiles for onboarding status queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(onboarding_completed, current_step);

-- Index on user_profiles for fetching profiles by user
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Index on user_profiles for fetching active profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON public.user_profiles(user_id) WHERE is_active = TRUE;

-- Index on title_preferences for fetching preferences by profile
CREATE INDEX IF NOT EXISTS idx_title_preferences_profile_id ON public.title_preferences(profile_id);

-- Index on title_preferences for fetching liked titles (for recommendations)
CREATE INDEX IF NOT EXISTS idx_title_preferences_liked ON public.title_preferences(profile_id, liked) WHERE liked = TRUE;

-- Index on user_sessions for fetching sessions by user
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);

-- Index on user_sessions for finding stale sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON public.user_sessions(last_active);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES FOR PROFILES
-- =============================================================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can insert their own profile (needed for signup)
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- =============================================================================
-- RLS POLICIES FOR USER_PROFILES
-- =============================================================================

-- Users can read profiles associated with their account
CREATE POLICY "Users can view own user_profiles"
    ON public.user_profiles FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM profiles WHERE id = auth.uid()
        )
    );

-- Users can insert profiles for their account
CREATE POLICY "Users can insert own user_profiles"
    ON public.user_profiles FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT id FROM profiles WHERE id = auth.uid()
        )
    );

-- Users can update their own user profiles
CREATE POLICY "Users can update own user_profiles"
    ON public.user_profiles FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM profiles WHERE id = auth.uid()
        )
    );

-- Users can delete their own user profiles
CREATE POLICY "Users can delete own user_profiles"
    ON public.user_profiles FOR DELETE
    USING (
        user_id IN (
            SELECT id FROM profiles WHERE id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES FOR TITLE_PREFERENCES
-- =============================================================================

-- Users can read title preferences for their profiles
CREATE POLICY "Users can view own title_preferences"
    ON public.title_preferences FOR SELECT
    USING (
        profile_id IN (
            SELECT up.id FROM user_profiles up
            JOIN profiles p ON up.user_id = p.id
            WHERE p.id = auth.uid()
        )
    );

-- Users can insert title preferences for their profiles
CREATE POLICY "Users can insert own title_preferences"
    ON public.title_preferences FOR INSERT
    WITH CHECK (
        profile_id IN (
            SELECT up.id FROM user_profiles up
            JOIN profiles p ON up.user_id = p.id
            WHERE p.id = auth.uid()
        )
    );

-- Users can update their own title preferences
CREATE POLICY "Users can update own title_preferences"
    ON public.title_preferences FOR UPDATE
    USING (
        profile_id IN (
            SELECT up.id FROM user_profiles up
            JOIN profiles p ON up.user_id = p.id
            WHERE p.id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES FOR USER_SESSIONS
-- =============================================================================

-- Users can read their own sessions
CREATE POLICY "Users can view own sessions"
    ON public.user_sessions FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
    ON public.user_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
    ON public.user_sessions FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
    ON public.user_sessions FOR DELETE
    USING (user_id = auth.uid());

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE public.profiles IS 'Extended user profile data linked to auth.users. Contains onboarding state and user preferences.';
COMMENT ON TABLE public.user_profiles IS 'Sub-profiles for the "who will be watching" feature. Each user can have multiple profiles (e.g., for family members).';
COMMENT ON TABLE public.title_preferences IS 'Movie and TV show preferences for each user profile. Used for the taste picker and recommendations.';
COMMENT ON TABLE public.user_sessions IS 'Session tracking for device management and security.';

COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether the user has completed the onboarding flow';
COMMENT ON COLUMN public.profiles.current_step IS 'Current step in the onboarding flow: started, profiles, preferences, complete';
COMMENT ON COLUMN public.profiles.preferences IS 'JSON object storing user preferences like notifications, theme, language';

COMMENT ON COLUMN public.user_profiles.name IS 'Display name for this profile (e.g., "Dad", "Mom", "Kids")';
COMMENT ON COLUMN public.user_profiles.avatar_color IS 'Hex color code for the profile avatar';
COMMENT ON COLUMN public.user_profiles.is_active IS 'Whether this profile is currently selected/active';

COMMENT ON COLUMN public.title_preferences.tmdb_id IS 'The Movie Database (TMDB) ID for the movie or TV show';
COMMENT ON COLUMN public.title_preferences.media_type IS 'Type of media: movie or tv';
COMMENT ON COLUMN public.title_preferences.liked IS 'User preference: true = liked, false = disliked';

COMMENT ON COLUMN public.user_sessions.device_info IS 'JSON object containing browser, OS, and device information';
COMMENT ON COLUMN public.user_sessions.last_active IS 'Timestamp of the last activity in this session';

-- =============================================================================
-- END OF MIGRATION 001_initial_schema.sql
-- =============================================================================