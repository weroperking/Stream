"use server";

/**
 * Watchlist Server Actions
 * Server-side functions for watchlist operations with profile-based data segregation
 * All queries filter by profile_id to ensure strict data separation
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';
import type { 
  WatchlistEntry, 
  AddToWatchlistInput,
  ContentType 
} from '@/lib/auth-types';

// ============================================================================
// Response Types
// ============================================================================

export interface WatchlistResponse<T = WatchlistEntry[]> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface WatchlistBooleanResponse {
  data: boolean;
  error: string | null;
  success: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates that a profile belongs to the authenticated user
 * @param supabase - Supabase client instance
 * @param profileId - Profile ID to validate
 * @param userId - Authenticated user ID
 * @returns True if profile belongs to user, false otherwise
 */
async function validateProfileOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  userId: string
): Promise<boolean> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', profileId)
    .eq('user_id', userId)
    .single();

  return !error && !!profile;
}

/**
 * Get the current authenticated user
 * @param supabase - Supabase client instance
 * @returns User ID or null if not authenticated
 */
async function getCurrentUser(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user.id;
}

// ============================================================================
// Watchlist Actions
// ============================================================================

/**
 * Get all watchlist items for a specific profile
 * @param profileId - The profile ID to get watchlist items for
 * @returns Array of watchlist entries or error
 */
export async function getWatchlist(
  profileId: string
): Promise<WatchlistResponse<WatchlistEntry[]>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const userId = await getCurrentUser(supabase);
    if (!userId) {
      return {
        data: null,
        error: 'Not authenticated',
        success: false,
      };
    }

    // Validate profile ownership
    const isOwner = await validateProfileOwnership(supabase, profileId, userId);
    if (!isOwner) {
      return {
        data: null,
        error: 'Profile not found or access denied',
        success: false,
      };
    }

    // Fetch watchlist items for the profile
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching watchlist:', error);
      return {
        data: null,
        error: 'Failed to fetch watchlist',
        success: false,
      };
    }

    return {
      data: data as WatchlistEntry[],
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in getWatchlist:', error);
    return {
      data: null,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Add an item to the watchlist
 * @param profileId - The profile ID to add the item to
 * @param item - The watchlist item data to add
 * @returns The created watchlist entry or error
 */
export async function addToWatchlist(
  profileId: string,
  item: AddToWatchlistInput
): Promise<WatchlistResponse<WatchlistEntry>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const userId = await getCurrentUser(supabase);
    if (!userId) {
      return {
        data: null,
        error: 'Not authenticated',
        success: false,
      };
    }

    // Validate profile ownership
    const isOwner = await validateProfileOwnership(supabase, profileId, userId);
    if (!isOwner) {
      return {
        data: null,
        error: 'Profile not found or access denied',
        success: false,
      };
    }

    // Check if item already exists in watchlist
    const { data: existing } = await supabase
      .from('watchlist')
      .select('id')
      .eq('profile_id', profileId)
      .eq('tmdb_id', item.mediaId)
      .eq('content_type', item.mediaType)
      .single();

    if (existing) {
      return {
        data: null,
        error: 'Item already in watchlist',
        success: false,
      };
    }

    // Insert the watchlist item
    const { data, error } = await supabase
      .from('watchlist')
      .insert({
        user_id: userId,
        profile_id: profileId,
        tmdb_id: item.mediaId,
        content_type: item.mediaType as ContentType,
        title: item.title,
        poster_path: item.posterPath || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding to watchlist:', error);
      return {
        data: null,
        error: 'Failed to add to watchlist',
        success: false,
      };
    }

    // Revalidate relevant paths
    revalidatePath('/saved');
    revalidatePath('/');

    return {
      data: data as WatchlistEntry,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in addToWatchlist:', error);
    return {
      data: null,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Remove an item from the watchlist
 * @param profileId - The profile ID to remove the item from
 * @param mediaId - The TMDB ID of the media
 * @param mediaType - The type of media ('movie' or 'tv')
 * @returns Success status or error
 */
export async function removeFromWatchlist(
  profileId: string,
  mediaId: number,
  mediaType: 'movie' | 'tv'
): Promise<WatchlistResponse<null>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const userId = await getCurrentUser(supabase);
    if (!userId) {
      return {
        data: null,
        error: 'Not authenticated',
        success: false,
      };
    }

    // Validate profile ownership
    const isOwner = await validateProfileOwnership(supabase, profileId, userId);
    if (!isOwner) {
      return {
        data: null,
        error: 'Profile not found or access denied',
        success: false,
      };
    }

    // Delete the watchlist item
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('profile_id', profileId)
      .eq('tmdb_id', mediaId)
      .eq('content_type', mediaType);

    if (error) {
      console.error('Error removing from watchlist:', error);
      return {
        data: null,
        error: 'Failed to remove from watchlist',
        success: false,
      };
    }

    // Revalidate relevant paths
    revalidatePath('/saved');
    revalidatePath('/');

    return {
      data: null,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in removeFromWatchlist:', error);
    return {
      data: null,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Check if an item is in the watchlist
 * @param profileId - The profile ID to check
 * @param mediaId - The TMDB ID of the media
 * @param mediaType - The type of media ('movie' or 'tv')
 * @returns Boolean indicating if item is in watchlist
 */
export async function isInWatchlist(
  profileId: string,
  mediaId: number,
  mediaType: 'movie' | 'tv'
): Promise<WatchlistBooleanResponse> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const userId = await getCurrentUser(supabase);
    if (!userId) {
      return {
        data: false,
        error: 'Not authenticated',
        success: false,
      };
    }

    // Validate profile ownership
    const isOwner = await validateProfileOwnership(supabase, profileId, userId);
    if (!isOwner) {
      return {
        data: false,
        error: 'Profile not found or access denied',
        success: false,
      };
    }

    // Check if item exists in watchlist
    const { data, error } = await supabase
      .from('watchlist')
      .select('id')
      .eq('profile_id', profileId)
      .eq('tmdb_id', mediaId)
      .eq('content_type', mediaType)
      .maybeSingle();

    if (error) {
      console.error('Error checking watchlist:', error);
      return {
        data: false,
        error: 'Failed to check watchlist',
        success: false,
      };
    }

    return {
      data: !!data,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in isInWatchlist:', error);
    return {
      data: false,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Toggle an item in the watchlist (add if not present, remove if present)
 * @param profileId - The profile ID
 * @param item - The watchlist item data
 * @returns Object with added/removed status and current watchlist state
 */
export async function toggleWatchlist(
  profileId: string,
  item: AddToWatchlistInput
): Promise<WatchlistResponse<{ added: boolean; isInWatchlist: boolean }>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const userId = await getCurrentUser(supabase);
    if (!userId) {
      return {
        data: null,
        error: 'Not authenticated',
        success: false,
      };
    }

    // Validate profile ownership
    const isOwner = await validateProfileOwnership(supabase, profileId, userId);
    if (!isOwner) {
      return {
        data: null,
        error: 'Profile not found or access denied',
        success: false,
      };
    }

    // Check if item exists
    const { data: existing } = await supabase
      .from('watchlist')
      .select('id')
      .eq('profile_id', profileId)
      .eq('tmdb_id', item.mediaId)
      .eq('content_type', item.mediaType)
      .maybeSingle();

    if (existing) {
      // Remove from watchlist
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('id', existing.id);

      if (error) {
        console.error('Error removing from watchlist:', error);
        return {
          data: null,
          error: 'Failed to remove from watchlist',
          success: false,
        };
      }

      revalidatePath('/saved');
      revalidatePath('/');

      return {
        data: { added: false, isInWatchlist: false },
        error: null,
        success: true,
      };
    } else {
      // Add to watchlist
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: userId,
          profile_id: profileId,
          tmdb_id: item.mediaId,
          content_type: item.mediaType as ContentType,
          title: item.title,
          poster_path: item.posterPath || null,
        });

      if (error) {
        console.error('Error adding to watchlist:', error);
        return {
          data: null,
          error: 'Failed to add to watchlist',
          success: false,
        };
      }

      revalidatePath('/saved');
      revalidatePath('/');

      return {
        data: { added: true, isInWatchlist: true },
        error: null,
        success: true,
      };
    }
  } catch (error) {
    console.error('Unexpected error in toggleWatchlist:', error);
    return {
      data: null,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}
