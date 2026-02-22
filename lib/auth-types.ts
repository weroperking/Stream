/**
 * Authentication and User Types
 * TypeScript definitions for Supabase auth and custom profile types
 */

import type { User, Session } from '@supabase/supabase-js';

// ============================================================================
// Enums (must match database schema)
// ============================================================================

export type OnboardingStep = 
  | 'pending' 
  | 'profile_setup' 
  | 'preferences' 
  | 'completed';

export type AvatarStyle = 
  | 'default' 
  | 'cinema' 
  | 'action' 
  | 'comedy' 
  | 'drama' 
  | 'scifi' 
  | 'horror' 
  | 'romance';

export type ContentType = 'movie' | 'tv';

// ============================================================================
// Database Table Types
// ============================================================================

/**
 * User profile - extends Supabase user with app-specific data
 */
export interface Profile {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  onboarding_completed: boolean;
  onboarding_step?: string; // Legacy field name
  current_step: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Additional profiles for household members (Netflix-style)
 */
export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  avatar_style: AvatarStyle;
  avatar_url: string | null;
  custom_avatar_url: string | null;
  avatar_color: string;
  is_main: boolean;
  is_active: boolean;
  pin_hash: string | null;
  pin_location: string | null;
  is_locked: boolean;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Content preference - tracks what titles user has liked/disliked
 */
export interface ContentPreference {
  id: string;
  user_id: string;
  profile_id: string | null;
  tmdb_id: number;
  content_type: ContentType;
  liked: boolean | null;
  source: string | null;
  created_at: string;
}

/**
 * Watch history entry (legacy - prefer WatchHistoryEntry)
 */
export interface WatchHistoryItem {
  id: string;
  user_id: string;
  profile_id: string | null;
  tmdb_id: number;
  content_type: ContentType;
  season_number: number | null;
  episode_number: number | null;
  progress: number;
  completed: boolean;
  last_watched_at: string;
  created_at: string;
}

/**
 * Watchlist item (legacy - prefer WatchlistEntry)
 */
export interface WatchlistItem {
  id: string;
  user_id: string;
  profile_id: string | null;
  tmdb_id: number;
  content_type: ContentType;
  created_at: string;
}

// ============================================================================
// Profile-Based Data Types (matching 002_profile_data_segregation.sql)
// ============================================================================

/**
 * Watch history entry - matches watch_history table schema
 * Used for profile-based watch history tracking
 */
export interface WatchHistoryEntry {
  id: string;
  user_id: string;
  profile_id: string;
  tmdb_id: number;
  content_type: ContentType;
  season_number: number | null;
  episode_number: number | null;
  progress: number;
  duration: number | null;
  completed: boolean;
  last_watched_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Watchlist entry - matches watchlist table schema
 * Used for profile-based watchlist management
 */
export interface WatchlistEntry {
  id: string;
  user_id: string;
  profile_id: string;
  tmdb_id: number;
  content_type: ContentType;
  poster_path: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * Input type for adding items to watchlist
 */
export interface AddToWatchlistInput {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string;
}

/**
 * Input type for updating watch progress
 */
export interface UpdateWatchProgressInput {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  seasonNumber?: number;
  episodeNumber?: number;
  progress: number;
  duration?: number;
  completed?: boolean;
}

/**
 * Profile favorite - stores favorite movies/TV shows for specific profiles
 */
export interface ProfileFavorite {
  id: string;
  user_id: string;
  profile_id: string;
  tmdb_id: number;
  content_type: ContentType;
  title: string;
  poster_path: string | null;
  release_year: string | null;
  created_at: string;
}

/**
 * Add profile favorite input
 */
export interface AddProfileFavoriteInput {
  profile_id: string;
  tmdb_id: number;
  content_type: ContentType;
  title: string;
  poster_path?: string;
  release_year?: string;
}

// ============================================================================
// Auth Action Types
// ============================================================================

/**
 * Sign up credentials
 */
export interface SignUpCredentials {
  email: string;
  password: string;
  options?: {
    emailRedirectTo?: string;
    data?: Record<string, unknown>;
    /** Full name for the user */
    full_name?: string;
  };
}

/**
 * Sign in credentials
 */
export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * Update profile data
 */
export interface UpdateProfileData {
  full_name?: string | null;
  username?: string | null;
  bio?: string | null;
  language?: string | null;
  avatar_url?: string | null;
  onboarding_step?: OnboardingStep;
  onboarding_completed?: boolean;
  preferences?: Record<string, unknown>;
}

/**
 * Create user profile data
 */
export interface CreateUserProfileData {
  name: string;
  avatar_style?: AvatarStyle;
  custom_avatar_url?: string | null;
  is_main?: boolean;
  pin?: string;
  pin_location?: string;
  is_locked?: boolean;
}

/**
 * Content preference input
 */
export interface ContentPreferenceInput {
  tmdb_id: number;
  content_type: ContentType;
  liked: boolean;
  profile_id?: string;
}

// ============================================================================
// Auth Response Types
// ============================================================================

/**
 * Auth result with optional profile data
 */
export interface AuthResult {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  error: Error | null;
}

/**
 * Onboarding status
 */
export interface OnboardingStatus {
  step: OnboardingStep;
  completed: boolean;
  profileCount?: number;
  preferencesCount?: number;
}

// ============================================================================
// Auth Error Messages
// ============================================================================

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_EXISTS: 'An account with this email already exists',
  WEAK_PASSWORD: 'Password must be at least 8 characters and include both letters and numbers',
  EMAIL_NOT_CONFIRMED: 'Please check your email to confirm your account',
  INVALID_OTP: 'Invalid verification code. Please try again',
  NETWORK_ERROR: 'Network error. Please check your connection',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Type for extracting the user ID from a profile
 */
export type UserId = Profile['id'];

/**
 * Type for avatar display options
 */
export interface AvatarOption {
  id: AvatarStyle;
  emoji: string;
  label: string;
}

/**
 * Predefined avatar options matching the database enum
 */
export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'default', emoji: '👤', label: 'Default' },
  { id: 'cinema', emoji: '🎬', label: 'Cinema' },
  { id: 'action', emoji: '💥', label: 'Action' },
  { id: 'comedy', emoji: '😂', label: 'Comedy' },
  { id: 'drama', emoji: '🎭', label: 'Drama' },
  { id: 'scifi', emoji: '🚀', label: 'Sci-Fi' },
  { id: 'horror', emoji: '👻', label: 'Horror' },
  { id: 'romance', emoji: '💕', label: 'Romance' },
];

/**
 * Maximum number of profiles allowed per user
 */
export const MAX_PROFILES = 5;

/**
 * Minimum password length
 */
export const MIN_PASSWORD_LENGTH = 4;

/**
 * Maximum password length
 */
export const MAX_PASSWORD_LENGTH = 60;
