-- =============================================================================
-- Supabase Database Schema for Oryno Stream
-- Migration: 003_expand_user_sessions.sql
-- Description: Expand user_sessions table with device, browser, OS, and network info
-- =============================================================================

-- =============================================================================
-- ADD NEW COLUMNS TO USER_SESSIONS TABLE
-- =============================================================================

-- Device Information
ALTER TABLE public.user_sessions
    ADD COLUMN IF NOT EXISTS device_type TEXT,
    ADD COLUMN IF NOT EXISTS device_model TEXT,
    ADD COLUMN IF NOT EXISTS device_brand TEXT;

-- Browser Details
ALTER TABLE public.user_sessions
    ADD COLUMN IF NOT EXISTS browser_name TEXT,
    ADD COLUMN IF NOT EXISTS browser_version TEXT;

-- Operating System
ALTER TABLE public.user_sessions
    ADD COLUMN IF NOT EXISTS os_name TEXT,
    ADD COLUMN IF NOT EXISTS os_version TEXT;

-- Network Information
ALTER TABLE public.user_sessions
    ADD COLUMN IF NOT EXISTS ip_address INET,
    ADD COLUMN IF NOT EXISTS network_type TEXT,
    ADD COLUMN IF NOT EXISTS connection_speed TEXT;

-- Session Tracking
ALTER TABLE public.user_sessions
    ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Raw user agent for reference
ALTER TABLE public.user_sessions
    ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- =============================================================================
-- INDEXES FOR QUERY PERFORMANCE
-- =============================================================================

-- Index for filtering by device type
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_type 
    ON public.user_sessions(device_type);

-- Index for filtering by browser
CREATE INDEX IF NOT EXISTS idx_user_sessions_browser 
    ON public.user_sessions(browser_name);

-- Index for filtering by OS
CREATE INDEX IF NOT EXISTS idx_user_sessions_os 
    ON public.user_sessions(os_name);

-- Index for finding active sessions (partial index)
CREATE INDEX IF NOT EXISTS idx_user_sessions_active 
    ON public.user_sessions(user_id) WHERE is_active = TRUE;

-- Index for IP-based queries (security/analytics)
CREATE INDEX IF NOT EXISTS idx_user_sessions_ip 
    ON public.user_sessions(ip_address);

-- Composite index for user session list (ordered by last_active)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active 
    ON public.user_sessions(user_id, last_active DESC);

-- Index for ended sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_ended 
    ON public.user_sessions(user_id, ended_at) WHERE ended_at IS NOT NULL;

-- =============================================================================
-- USER-AGENT PARSING FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.parse_user_agent(user_agent_text TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}'::jsonb;
    ua TEXT := COALESCE(user_agent_text, '');
BEGIN
    -- Browser Detection (order matters - check specific browsers first)
    result := jsonb_set(result, '{browser_name}', 
        to_jsonb(CASE
            WHEN ua ~* 'Edg/' THEN 'Edge'
            WHEN ua ~* 'OPR/|Opera' THEN 'Opera'
            WHEN ua ~* 'Firefox/' THEN 'Firefox'
            WHEN ua ~* 'Chrome/' AND ua !~* 'Chromium' THEN 'Chrome'
            WHEN ua ~* 'Safari/' AND ua !~* 'Chrome/' THEN 'Safari'
            WHEN ua ~* 'MSIE|Trident/' THEN 'Internet Explorer'
            ELSE 'Unknown'
        END)
    );
    
    -- Browser Version Extraction
    result := jsonb_set(result, '{browser_version}',
        to_jsonb(CASE
            WHEN ua ~* 'Edg/' THEN 
                COALESCE(regexp_replace(ua, '.*Edg/([0-9]+(?:\.[0-9]+)?).*', '\1'), NULL)
            WHEN ua ~* 'OPR/' THEN 
                COALESCE(regexp_replace(ua, '.*OPR/([0-9]+(?:\.[0-9]+)?).*', '\1'), NULL)
            WHEN ua ~* 'Opera/' THEN 
                COALESCE(regexp_replace(ua, '.*Opera/([0-9]+(?:\.[0-9]+)?).*', '\1'), NULL)
            WHEN ua ~* 'Firefox/' THEN 
                COALESCE(regexp_replace(ua, '.*Firefox/([0-9]+(?:\.[0-9]+)?).*', '\1'), NULL)
            WHEN ua ~* 'Chrome/' THEN 
                COALESCE(regexp_replace(ua, '.*Chrome/([0-9]+(?:\.[0-9]+)?).*', '\1'), NULL)
            WHEN ua ~* 'Version/' AND ua ~* 'Safari/' THEN 
                COALESCE(regexp_replace(ua, '.*Version/([0-9]+(?:\.[0-9]+)?).*', '\1'), NULL)
            WHEN ua ~* 'MSIE' THEN 
                COALESCE(regexp_replace(ua, '.*MSIE ([0-9]+(?:\.[0-9]+)?).*', '\1'), NULL)
            WHEN ua ~* 'Trident/' THEN 
                COALESCE(regexp_replace(ua, '.*rv:([0-9]+(?:\.[0-9]+)?).*', '\1'), NULL)
            ELSE NULL
        END)
    );
    
    -- Operating System Detection
    result := jsonb_set(result, '{os_name}',
        to_jsonb(CASE
            WHEN ua ~* 'Windows NT 10' THEN 'Windows'
            WHEN ua ~* 'Windows NT 6\.3' THEN 'Windows'
            WHEN ua ~* 'Windows NT 6\.2' THEN 'Windows'
            WHEN ua ~* 'Windows NT 6\.1' THEN 'Windows'
            WHEN ua ~* 'Windows' THEN 'Windows'
            WHEN ua ~* 'Mac OS X|macOS' THEN 'macOS'
            WHEN ua ~* 'Android' THEN 'Android'
            WHEN ua ~* 'iPhone|iPad|iPod' THEN 'iOS'
            WHEN ua ~* 'Linux' THEN 'Linux'
            WHEN ua ~* 'CrOS' THEN 'Chrome OS'
            WHEN ua ~* 'Ubuntu' THEN 'Ubuntu'
            WHEN ua ~* 'Fedora' THEN 'Fedora'
            ELSE 'Unknown'
        END)
    );
    
    -- OS Version Extraction
    result := jsonb_set(result, '{os_version}',
        to_jsonb(CASE
            WHEN ua ~* 'Windows NT 10' THEN '10/11'
            WHEN ua ~* 'Windows NT 6\.3' THEN '8.1'
            WHEN ua ~* 'Windows NT 6\.2' THEN '8'
            WHEN ua ~* 'Windows NT 6\.1' THEN '7'
            WHEN ua ~* 'Mac OS X ([0-9]+[._][0-9]+)' THEN 
                REPLACE(regexp_replace(ua, '.*Mac OS X ([0-9]+[._][0-9]+).*', '\1'), '_', '.')
            WHEN ua ~* 'Android ([0-9]+(?:\.[0-9]+)?)' THEN 
                regexp_replace(ua, '.*Android ([0-9]+(?:\.[0-9]+)?).*', '\1')
            WHEN ua ~* 'iPhone OS ([0-9]+[._][0-9]+)' THEN 
                REPLACE(regexp_replace(ua, '.*iPhone OS ([0-9]+[._][0-9]+).*', '\1'), '_', '.')
            WHEN ua ~* 'iPad.*OS ([0-9]+[._][0-9]+)' THEN 
                REPLACE(regexp_replace(ua, '.*iPad.*OS ([0-9]+[._][0-9]+).*', '\1'), '_', '.')
            ELSE NULL
        END)
    );
    
    -- Device Type Detection
    result := jsonb_set(result, '{device_type}',
        to_jsonb(CASE
            WHEN ua ~* 'Mobile|Android.*Mobile|iPhone' THEN 'mobile'
            WHEN ua ~* 'Tablet|iPad|Android(?!.*Mobile)' THEN 'tablet'
            WHEN ua ~* 'SmartTV|Smart-TV|TV|HbbTV' THEN 'smarttv'
            WHEN ua ~* 'PlayStation|Xbox|Nintendo' THEN 'console'
            WHEN ua ~* 'Watch|Wearable' THEN 'wearable'
            WHEN ua ~* 'Bot|Spider|Crawler|Scraper' THEN 'bot'
            ELSE 'desktop'
        END)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.parse_user_agent(TEXT) IS 'Parses a user-agent string and returns device type, browser name/version, and OS name/version as JSONB. Uses regex-based detection for common browsers and operating systems.';

-- =============================================================================
-- VIEW: USER SESSIONS WITH DETAILS
-- =============================================================================

CREATE OR REPLACE VIEW public.user_sessions_with_details AS
SELECT 
    -- Session identifiers
    us.id AS session_id,
    us.user_id,
    
    -- User info from profiles
    p.email,
    p.username,
    p.full_name,
    
    -- Device Information
    us.device_type,
    us.device_model,
    us.device_brand,
    
    -- Browser Details
    us.browser_name,
    us.browser_version,
    
    -- Operating System
    us.os_name,
    us.os_version,
    
    -- Network Information
    us.ip_address,
    us.network_type,
    us.connection_speed,
    
    -- Session Timestamps
    us.created_at AS session_started,
    us.last_active,
    us.ended_at,
    us.is_active,
    
    -- Duration calculations
    EXTRACT(EPOCH FROM (COALESCE(us.ended_at, NOW()) - us.created_at)) AS duration_seconds,
    
    -- Formatted duration (human-readable)
    CONCAT(
        FLOOR(EXTRACT(EPOCH FROM (COALESCE(us.ended_at, NOW()) - us.created_at)) / 3600), 'h ',
        FLOOR(MOD(EXTRACT(EPOCH FROM (COALESCE(us.ended_at, NOW()) - us.created_at))::bigint, 3600) / 60), 'm'
    ) AS duration_formatted,
    
    -- Relative time since last activity
    CASE
        WHEN NOW() - us.last_active < INTERVAL '5 minutes' THEN 'Active now'
        WHEN NOW() - us.last_active < INTERVAL '1 hour' THEN 
            CONCAT(EXTRACT(MINUTE FROM (NOW() - us.last_active))::int, ' minutes ago')
        WHEN NOW() - us.last_active < INTERVAL '24 hours' THEN 
            CONCAT(EXTRACT(HOUR FROM (NOW() - us.last_active))::int, ' hours ago')
        ELSE CONCAT(EXTRACT(DAY FROM (NOW() - us.last_active))::int, ' days ago')
    END AS last_activity_relative,
    
    -- Raw user agent
    us.user_agent,
    
    -- Legacy device_info JSONB (for backward compatibility)
    us.device_info

FROM public.user_sessions us
LEFT JOIN public.profiles p ON us.user_id = p.id;

COMMENT ON VIEW public.user_sessions_with_details IS 'View that joins user_sessions with profiles and calculates session duration. Provides human-readable duration formatting and relative time for last activity.';

-- =============================================================================
-- FUNCTION: GET USER SESSIONS SUMMARY
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_sessions_summary(user_uuid UUID)
RETURNS TABLE (
    -- User info
    user_email TEXT,
    user_username TEXT,
    user_full_name TEXT,
    
    -- Session counts
    total_sessions BIGINT,
    active_sessions BIGINT,
    completed_sessions BIGINT,
    
    -- Duration stats
    total_duration_seconds NUMERIC,
    average_duration_seconds NUMERIC,
    longest_duration_seconds NUMERIC,
    total_duration_formatted TEXT,
    
    -- Device stats
    unique_devices BIGINT,
    unique_ips BIGINT,
    
    -- Device breakdown
    device_types JSONB,
    browser_breakdown JSONB,
    os_breakdown JSONB,
    
    -- Last session info
    last_session_id UUID,
    last_session_at TIMESTAMPTZ,
    last_session_device TEXT,
    last_session_browser TEXT,
    last_session_os TEXT,
    last_session_ip INET,
    last_session_duration_seconds NUMERIC,
    
    -- First session info
    first_session_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Security check: only allow users to query their own session summary
    IF user_uuid != auth.uid() THEN
        RAISE EXCEPTION 'Permission denied: can only query own session summary';
    END IF;
    
    RETURN QUERY
    SELECT 
        -- User info
        p.email::TEXT,
        p.username::TEXT,
        p.full_name::TEXT,
        
        -- Session counts
        COUNT(us.id) AS total_sessions,
        COUNT(us.id) FILTER (WHERE us.is_active = TRUE) AS active_sessions,
        COUNT(us.id) FILTER (WHERE us.ended_at IS NOT NULL) AS completed_sessions,
        
        -- Duration stats
        COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(us.ended_at, NOW()) - us.created_at))), 0) AS total_duration_seconds,
        COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(us.ended_at, NOW()) - us.created_at))), 0) AS average_duration_seconds,
        COALESCE(MAX(EXTRACT(EPOCH FROM (COALESCE(us.ended_at, NOW()) - us.created_at))), 0) AS longest_duration_seconds,
        
        -- Formatted total duration
        CONCAT(
            FLOOR(COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(us.ended_at, NOW()) - us.created_at))), 0) / 3600), 'h ',
            FLOOR(MOD(COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(us.ended_at, NOW()) - us.created_at))), 0)::bigint, 3600) / 60), 'm'
        ) AS total_duration_formatted,
        
        -- Device stats
        COUNT(DISTINCT CONCAT(us.device_type, '-', us.device_model)) FILTER (WHERE us.device_type IS NOT NULL) AS unique_devices,
        COUNT(DISTINCT us.ip_address) FILTER (WHERE us.ip_address IS NOT NULL) AS unique_ips,
        
        -- Device breakdown as JSONB
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('device_type', t.device_type, 'count', t.cnt))
             FROM (
                 SELECT us2.device_type, COUNT(*) AS cnt
                 FROM public.user_sessions us2
                 WHERE us2.user_id = user_uuid AND us2.device_type IS NOT NULL
                 GROUP BY us2.device_type
                 ORDER BY cnt DESC
             ) t),
            '[]'::jsonb
        ) AS device_types,
        
        -- Browser breakdown as JSONB
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('browser', t.browser_name, 'count', t.cnt))
             FROM (
                 SELECT us2.browser_name, COUNT(*) AS cnt
                 FROM public.user_sessions us2
                 WHERE us2.user_id = user_uuid AND us2.browser_name IS NOT NULL
                 GROUP BY us2.browser_name
                 ORDER BY cnt DESC
             ) t),
            '[]'::jsonb
        ) AS browser_breakdown,
        
        -- OS breakdown as JSONB
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('os', t.os_name, 'count', t.cnt))
             FROM (
                 SELECT us2.os_name, COUNT(*) AS cnt
                 FROM public.user_sessions us2
                 WHERE us2.user_id = user_uuid AND us2.os_name IS NOT NULL
                 GROUP BY us2.os_name
                 ORDER BY cnt DESC
             ) t),
            '[]'::jsonb
        ) AS os_breakdown,
        
        -- Last session info
        (SELECT us_last.id FROM public.user_sessions us_last 
         WHERE us_last.user_id = user_uuid 
         ORDER BY us_last.last_active DESC LIMIT 1) AS last_session_id,
        
        (SELECT us_last.last_active FROM public.user_sessions us_last 
         WHERE us_last.user_id = user_uuid 
         ORDER BY us_last.last_active DESC LIMIT 1) AS last_session_at,
        
        (SELECT us_last.device_type FROM public.user_sessions us_last 
         WHERE us_last.user_id = user_uuid 
         ORDER BY us_last.last_active DESC LIMIT 1) AS last_session_device,
        
        (SELECT us_last.browser_name FROM public.user_sessions us_last 
         WHERE us_last.user_id = user_uuid 
         ORDER BY us_last.last_active DESC LIMIT 1) AS last_session_browser,
        
        (SELECT us_last.os_name FROM public.user_sessions us_last 
         WHERE us_last.user_id = user_uuid 
         ORDER BY us_last.last_active DESC LIMIT 1) AS last_session_os,
        
        (SELECT us_last.ip_address FROM public.user_sessions us_last 
         WHERE us_last.user_id = user_uuid 
         ORDER BY us_last.last_active DESC LIMIT 1) AS last_session_ip,
        
        (SELECT EXTRACT(EPOCH FROM (COALESCE(us_last.ended_at, NOW()) - us_last.created_at))
         FROM public.user_sessions us_last 
         WHERE us_last.user_id = user_uuid 
         ORDER BY us_last.last_active DESC LIMIT 1) AS last_session_duration_seconds,
        
        -- First session info
        (SELECT MIN(us_first.created_at) FROM public.user_sessions us_first 
         WHERE us_first.user_id = user_uuid) AS first_session_at
        
    FROM public.profiles p
    LEFT JOIN public.user_sessions us ON us.user_id = p.id
    WHERE p.id = user_uuid
    GROUP BY p.id, p.email, p.username, p.full_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_sessions_summary(UUID) IS 'Returns aggregated session data for a user including total sessions, duration statistics, unique devices, and last session information. Users can only query their own session summary.';

-- =============================================================================
-- HELPER FUNCTIONS FOR SESSION MANAGEMENT
-- =============================================================================

-- Function to end a specific session (only own sessions)
CREATE OR REPLACE FUNCTION public.end_session(session_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_sessions
    SET 
        ended_at = NOW(),
        is_active = FALSE
    WHERE id = session_uuid
      AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.end_session(UUID) IS 'Ends a specific session by setting ended_at and is_active = FALSE. Only allows ending own sessions.';

-- Function to end all active sessions for the current user (except current session)
CREATE OR REPLACE FUNCTION public.end_all_other_sessions(current_session_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    ended_count INTEGER;
BEGIN
    UPDATE public.user_sessions
    SET 
        ended_at = NOW(),
        is_active = FALSE
    WHERE user_id = auth.uid()
      AND is_active = TRUE
      AND (current_session_uuid IS NULL OR id != current_session_uuid);
    
    GET DIAGNOSTICS ended_count = ROW_COUNT;
    RETURN ended_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.end_all_other_sessions(UUID) IS 'Ends all active sessions for the current user except the current session. Returns the number of sessions ended. Uses auth.uid() for security.';

-- Function to auto-end inactive sessions (can be called by cron job)
CREATE OR REPLACE FUNCTION public.auto_end_inactive_sessions(inactivity_interval INTERVAL DEFAULT INTERVAL '30 minutes')
RETURNS INTEGER AS $$
DECLARE
    ended_count INTEGER;
BEGIN
    UPDATE public.user_sessions
    SET 
        ended_at = last_active,
        is_active = FALSE
    WHERE is_active = TRUE
      AND last_active < NOW() - inactivity_interval;
    
    GET DIAGNOSTICS ended_count = ROW_COUNT;
    RETURN ended_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.auto_end_inactive_sessions(INTERVAL) IS 'Automatically ends sessions that have been inactive for the specified interval. Returns the number of sessions ended.';

-- =============================================================================
-- FUNCTION TO CREATE SESSION WITH PARSED USER AGENT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_session_with_ua(
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_network_type TEXT DEFAULT NULL,
    p_connection_speed TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    parsed_ua JSONB;
    new_session_id UUID;
BEGIN
    -- Verify user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required to create session';
    END IF;
    
    -- Parse user agent if provided
    IF p_user_agent IS NOT NULL THEN
        parsed_ua := public.parse_user_agent(p_user_agent);
    ELSE
        parsed_ua := '{}'::jsonb;
    END IF;
    
    -- Insert new session with all parsed data (uses auth.uid() for security)
    INSERT INTO public.user_sessions (
        user_id,
        device_type,
        device_model,
        device_brand,
        browser_name,
        browser_version,
        os_name,
        os_version,
        ip_address,
        network_type,
        connection_speed,
        user_agent,
        device_info,
        is_active
    ) VALUES (
        auth.uid(),
        COALESCE(parsed_ua->>'device_type', NULL),
        COALESCE(p_device_info->>'model', NULL),
        COALESCE(p_device_info->>'brand', NULL),
        COALESCE(parsed_ua->>'browser_name', NULL),
        COALESCE(parsed_ua->>'browser_version', NULL),
        COALESCE(parsed_ua->>'os_name', NULL),
        COALESCE(parsed_ua->>'os_version', NULL),
        p_ip_address,
        p_network_type,
        p_connection_speed,
        p_user_agent,
        p_device_info,
        TRUE
    ) RETURNING id INTO new_session_id;
    
    RETURN new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_session_with_ua(TEXT, INET, TEXT, TEXT, JSONB) IS 'Creates a new user session with automatic user-agent parsing for the authenticated user. Returns the new session ID. Uses auth.uid() for security.';

-- =============================================================================
-- UPDATE EXISTING SESSIONS WITH PARSED USER AGENT DATA
-- =============================================================================

-- Optional: Update existing sessions that have user_agent but no parsed data
-- This is commented out by default to avoid unexpected data changes
-- Uncomment and run if you want to backfill existing sessions

/*
UPDATE public.user_sessions us
SET 
    device_type = (public.parse_user_agent(us.user_agent)->>'device_type')::TEXT,
    browser_name = (public.parse_user_agent(us.user_agent)->>'browser_name')::TEXT,
    browser_version = (public.parse_user_agent(us.user_agent)->>'browser_version')::TEXT,
    os_name = (public.parse_user_agent(us.user_agent)->>'os_name')::TEXT,
    os_version = (public.parse_user_agent(us.user_agent)->>'os_version')::TEXT
WHERE us.user_agent IS NOT NULL 
  AND us.device_type IS NULL;
*/

-- =============================================================================
-- COMMENTS FOR NEW COLUMNS
-- =============================================================================

COMMENT ON COLUMN public.user_sessions.device_type IS 'Type of device: mobile, tablet, desktop, smarttv, console, wearable, or bot';
COMMENT ON COLUMN public.user_sessions.device_model IS 'Device model name (e.g., "iPhone 14 Pro", "Galaxy S23")';
COMMENT ON COLUMN public.user_sessions.device_brand IS 'Device manufacturer/brand (e.g., "Apple", "Samsung")';
COMMENT ON COLUMN public.user_sessions.browser_name IS 'Browser name (e.g., "Chrome", "Firefox", "Safari", "Edge")';
COMMENT ON COLUMN public.user_sessions.browser_version IS 'Browser version number';
COMMENT ON COLUMN public.user_sessions.os_name IS 'Operating system name (e.g., "Windows", "macOS", "Android", "iOS")';
COMMENT ON COLUMN public.user_sessions.os_version IS 'Operating system version';
COMMENT ON COLUMN public.user_sessions.ip_address IS 'IP address of the client (INET type for efficient storage and querying)';
COMMENT ON COLUMN public.user_sessions.network_type IS 'Type of network connection: wifi, cellular, ethernet, unknown';
COMMENT ON COLUMN public.user_sessions.connection_speed IS 'Connection speed indicator: 4g, 3g, 2g, slow-2g';
COMMENT ON COLUMN public.user_sessions.ended_at IS 'Timestamp when the session ended (NULL if still active)';
COMMENT ON COLUMN public.user_sessions.is_active IS 'Whether the session is currently active';
COMMENT ON COLUMN public.user_sessions.user_agent IS 'Raw user-agent string from the client request';

-- =============================================================================
-- GRANT PERMISSIONS FOR NEW FUNCTIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.parse_user_agent(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sessions_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_all_other_sessions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_end_inactive_sessions(INTERVAL) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_session_with_ua(TEXT, INET, TEXT, TEXT, JSONB) TO authenticated;

-- =============================================================================
-- END OF MIGRATION 003_expand_user_sessions.sql
-- =============================================================================
