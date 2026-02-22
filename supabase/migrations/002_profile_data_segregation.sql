-- =============================================================================
-- Supabase Database Schema for Oryno Stream
-- Migration: 002_profile_data_segregation.sql
-- Description: Profile-based data segregation for watch_history and watchlist
-- =============================================================================

-- =============================================================================
-- WATCH_HISTORY TABLE - Handle both fresh installs and existing tables
-- =============================================================================

-- Create watch_history table if it doesn't exist (for fresh installs)
CREATE TABLE IF NOT EXISTS public.watch_history (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference to the user (for RLS and quick user-level queries)
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Reference to profile (REQUIRED for data segregation)
    profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- TMDB content ID
    tmdb_id INTEGER NOT NULL,
    
    -- Content type (movie or tv)
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

-- Add missing columns to existing watch_history table (if they don't exist)
-- These will only add columns if they don't already exist

-- Add duration column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'watch_history' 
        AND column_name = 'duration'
    ) THEN
        ALTER TABLE public.watch_history ADD COLUMN duration INTEGER;
    END IF;
END $$;

-- Add updated_at column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'watch_history' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.watch_history ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- Make profile_id NOT NULL if it's currently nullable
-- First, handle any NULL values by assigning to a default profile
DO $$
DECLARE
    rec RECORD;
    default_profile_id UUID;
BEGIN
    -- Check if profile_id column exists and is nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'watch_history' 
        AND column_name = 'profile_id' 
        AND is_nullable = 'YES'
    ) THEN
        -- For each watch_history item with NULL profile_id, assign to user's main profile
        FOR rec IN 
            SELECT w.id, w.user_id 
            FROM public.watch_history w 
            WHERE w.profile_id IS NULL
        LOOP
            -- Get the user's main profile (is_main = true) or first active profile
            SELECT up.id INTO default_profile_id
            FROM public.user_profiles up
            WHERE up.user_id = rec.user_id
            AND (up.is_main = true OR up.is_active = true)
            ORDER BY up.is_main DESC, up.created_at ASC
            LIMIT 1;
            
            -- If a profile exists, update the watch_history item
            IF default_profile_id IS NOT NULL THEN
                UPDATE public.watch_history 
                SET profile_id = default_profile_id 
                WHERE id = rec.id;
            ELSE
                -- If no profile exists, delete the orphaned watch_history item
                DELETE FROM public.watch_history WHERE id = rec.id;
            END IF;
        END LOOP;
        
        -- Now make profile_id NOT NULL
        ALTER TABLE public.watch_history ALTER COLUMN profile_id SET NOT NULL;
    END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'watch_history_profile_media_unique' 
        AND conrelid = 'public.watch_history'::regclass
    ) THEN
        ALTER TABLE public.watch_history 
        ADD CONSTRAINT watch_history_profile_media_unique 
        UNIQUE (profile_id, tmdb_id, content_type, season_number, episode_number);
    END IF;
END $$;

-- =============================================================================
-- WATCHLIST TABLE MODIFICATIONS
-- Update existing watchlist to enforce profile-based segregation
-- =============================================================================

-- First, handle existing NULL profile_id values
-- Option 1: Delete records with NULL profile_id (clean slate approach)
-- DELETE FROM public.watchlist WHERE profile_id IS NULL;

-- Option 2: Assign to default/main profile (preservation approach)
-- We'll use a DO block to handle this safely
DO $$
DECLARE
    rec RECORD;
    default_profile_id UUID;
BEGIN
    -- For each watchlist item with NULL profile_id, assign to user's main profile
    FOR rec IN 
        SELECT w.id, w.user_id 
        FROM public.watchlist w 
        WHERE w.profile_id IS NULL
    LOOP
        -- Get the user's main profile (is_main = true) or first active profile
        SELECT up.id INTO default_profile_id
        FROM public.user_profiles up
        WHERE up.user_id = rec.user_id
        AND (up.is_main = true OR up.is_active = true)
        ORDER BY up.is_main DESC, up.created_at ASC
        LIMIT 1;
        
        -- If a profile exists, update the watchlist item
        IF default_profile_id IS NOT NULL THEN
            UPDATE public.watchlist 
            SET profile_id = default_profile_id 
            WHERE id = rec.id;
        ELSE
            -- If no profile exists, delete the orphaned watchlist item
            DELETE FROM public.watchlist WHERE id = rec.id;
        END IF;
    END LOOP;
END $$;

-- Now make profile_id NOT NULL
ALTER TABLE public.watchlist 
    ALTER COLUMN profile_id SET NOT NULL;

-- Update the ON DELETE behavior for profile_id
ALTER TABLE public.watchlist 
    DROP CONSTRAINT IF EXISTS watchlist_profile_id_fkey,
    ADD CONSTRAINT watchlist_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Drop the old unique constraint if it exists (user_id, tmdb_id)
ALTER TABLE public.watchlist 
    DROP CONSTRAINT IF EXISTS watchlist_user_id_tmdb_id_key;

-- Add new unique constraint based on profile_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'watchlist_profile_media_unique' 
        AND conrelid = 'public.watchlist'::regclass
    ) THEN
        ALTER TABLE public.watchlist 
        ADD CONSTRAINT watchlist_profile_media_unique 
        UNIQUE (profile_id, tmdb_id, content_type);
    END IF;
END $$;

-- Rename content_type to media_type for consistency (optional, commented out to avoid breaking changes)
-- ALTER TABLE public.watchlist RENAME COLUMN content_type TO media_type;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Watch history indexes
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_profile_id ON public.watch_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_media ON public.watch_history(tmdb_id, content_type);
CREATE INDEX IF NOT EXISTS idx_watch_history_last_watched ON public.watch_history(profile_id, last_watched_at DESC);

-- Create partial indexes only if the columns exist
DO $$
BEGIN
    -- Index for in-progress items
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'watch_history' 
        AND column_name = 'completed'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_watch_history_in_progress 
        ON public.watch_history(profile_id, last_watched_at DESC) 
        WHERE completed = FALSE AND progress > 0;
        
        CREATE INDEX IF NOT EXISTS idx_watch_history_completed 
        ON public.watch_history(profile_id, last_watched_at DESC) 
        WHERE completed = TRUE;
    END IF;
END $$;

-- Watchlist indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_profile_id ON public.watchlist(profile_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_media ON public.watchlist(tmdb_id, content_type);
CREATE INDEX IF NOT EXISTS idx_watchlist_created ON public.watchlist(profile_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on watch_history
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can create watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can update watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can delete watch history" ON public.watch_history;

-- RLS Policies for watch_history
-- Users can view watch history for their own profiles
CREATE POLICY "Users can view own watch history"
    ON public.watch_history FOR SELECT
    USING (
        profile_id IN (
            SELECT up.id FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
        )
    );

-- Users can insert watch history for their own profiles
CREATE POLICY "Users can create watch history"
    ON public.watch_history FOR INSERT
    WITH CHECK (
        profile_id IN (
            SELECT up.id FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
        )
    );

-- Users can update watch history for their own profiles
CREATE POLICY "Users can update watch history"
    ON public.watch_history FOR UPDATE
    USING (
        profile_id IN (
            SELECT up.id FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
        )
    );

-- Users can delete watch history for their own profiles
CREATE POLICY "Users can delete watch history"
    ON public.watch_history FOR DELETE
    USING (
        profile_id IN (
            SELECT up.id FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
        )
    );

-- =============================================================================
-- UPDATE WATCHLIST RLS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can create watchlist items" ON public.watchlist;
DROP POLICY IF EXISTS "Users can update watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can delete watchlist items" ON public.watchlist;

-- RLS Policies for watchlist (updated for profile-based access)
-- Users can view watchlist for their own profiles
CREATE POLICY "Users can view own watchlist"
    ON public.watchlist FOR SELECT
    USING (
        profile_id IN (
            SELECT up.id FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
        )
    );

-- Users can insert watchlist items for their own profiles
CREATE POLICY "Users can create watchlist items"
    ON public.watchlist FOR INSERT
    WITH CHECK (
        profile_id IN (
            SELECT up.id FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
        )
    );

-- Users can update watchlist items for their own profiles
CREATE POLICY "Users can update watchlist"
    ON public.watchlist FOR UPDATE
    USING (
        profile_id IN (
            SELECT up.id FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
        )
    );

-- Users can delete watchlist items for their own profiles
CREATE POLICY "Users can delete watchlist items"
    ON public.watchlist FOR DELETE
    USING (
        profile_id IN (
            SELECT up.id FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
        )
    );

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- =============================================================================

-- Create trigger for watch_history updated_at
DROP TRIGGER IF EXISTS update_watch_history_updated_at ON public.watch_history;
CREATE TRIGGER update_watch_history_updated_at
    BEFORE UPDATE ON public.watch_history
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE public.watch_history IS 'Watch history tracking with profile-based data segregation. Each profile has its own watch history.';
COMMENT ON TABLE public.watchlist IS 'User watchlist with profile-based data segregation. Each profile has its own watchlist.';

COMMENT ON COLUMN public.watch_history.profile_id IS 'Reference to the user profile. Required for data segregation - each profile has separate watch history.';
COMMENT ON COLUMN public.watch_history.tmdb_id IS 'TMDB (The Movie Database) ID for the movie or TV show.';
COMMENT ON COLUMN public.watch_history.content_type IS 'Type of media: movie or tv.';
COMMENT ON COLUMN public.watch_history.progress IS 'Watch progress as percentage (0-100).';
COMMENT ON COLUMN public.watch_history.duration IS 'Total duration of the content in seconds. Used for resume functionality.';
COMMENT ON COLUMN public.watch_history.completed IS 'Whether the user has finished watching this content.';
COMMENT ON COLUMN public.watch_history.last_watched_at IS 'Timestamp of when this content was last watched.';

COMMENT ON COLUMN public.watchlist.profile_id IS 'Reference to the user profile. Required for data segregation - each profile has separate watchlist.';

-- =============================================================================
-- HELPER FUNCTION FOR PROFILE VALIDATION
-- =============================================================================

-- Function to check if a profile belongs to the current user
CREATE OR REPLACE FUNCTION public.is_profile_owner(profile_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = profile_uuid AND up.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_profile_owner(UUID) IS 'Helper function to check if the current user owns a specific profile. Used in RLS policies.';

-- =============================================================================
-- END OF MIGRATION 002_profile_data_segregation.sql
-- =============================================================================
