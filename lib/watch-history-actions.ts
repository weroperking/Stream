"use server";

/**
 * Watch History Server Actions
 * Server-side functions for watch history operations with profile-based data segregation
 * All queries filter by profile_id to ensure strict data separation
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';
import type { 
  WatchHistoryEntry, 
  UpdateWatchProgressInput 
} from '@/lib/auth-types';

// ============================================================================
// Response Types
// ============================================================================

export interface WatchHistoryResponse<T = WatchHistoryEntry[]> {
  data: T | null;
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
// Watch History Actions
// ============================================================================

/**
 * Get watch history for a specific profile
 * @param profileId - The profile ID to get watch history for
 * @param limit - Optional limit on number of results (default: 50)
 * @returns Array of watch history entries or error
 */
export async function getWatchHistory(
  profileId: string,
  limit: number = 50
): Promise<WatchHistoryResponse<WatchHistoryEntry[]>> {
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

    // Fetch watch history for the profile
    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('profile_id', profileId)
      .order('last_watched_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching watch history:', error);
      return {
        data: null,
        error: 'Failed to fetch watch history',
        success: false,
      };
    }

    return {
      data: data as WatchHistoryEntry[],
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in getWatchHistory:', error);
    return {
      data: null,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Get in-progress items for "Continue Watching" feature
 * Returns items that have been started but not completed
 * @param profileId - The profile ID to get in-progress items for
 * @param limit - Optional limit on number of results (default: 20)
 * @returns Array of in-progress watch history entries or error
 */
export async function getInProgressItems(
  profileId: string,
  limit: number = 20
): Promise<WatchHistoryResponse<WatchHistoryEntry[]>> {
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

    // Fetch in-progress items (not completed, progress > 0)
    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('profile_id', profileId)
      .eq('completed', false)
      .gt('progress', 0)
      .order('last_watched_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching in-progress items:', error);
      return {
        data: null,
        error: 'Failed to fetch in-progress items',
        success: false,
      };
    }

    return {
      data: data as WatchHistoryEntry[],
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in getInProgressItems:', error);
    return {
      data: null,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Update or create watch progress for a media item
 * Uses upsert to handle both insert and update cases
 * @param profileId - The profile ID to update progress for
 * @param item - The watch progress data
 * @returns The created/updated watch history entry or error
 */
export async function updateWatchProgress(
  profileId: string,
  item: UpdateWatchProgressInput
): Promise<WatchHistoryResponse<WatchHistoryEntry>> {
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

    // Validate progress value
    if (item.progress < 0 || item.progress > 100) {
      return {
        data: null,
        error: 'Progress must be between 0 and 100',
        success: false,
      };
    }

    // Determine if content is completed (progress >= 95%)
    const isCompleted = item.completed ?? (item.progress >= 95);

    // Upsert the watch history entry
    // The unique constraint is on (profile_id, tmdb_id, content_type, season_number, episode_number)
    const { data, error } = await supabase
      .from('watch_history')
      .upsert(
        {
          user_id: userId,
          profile_id: profileId,
          tmdb_id: item.mediaId,
          content_type: item.mediaType,
          season_number: item.seasonNumber ?? null,
          episode_number: item.episodeNumber ?? null,
          progress: item.progress,
          duration: item.duration ?? null,
          completed: isCompleted,
          last_watched_at: new Date().toISOString(),
        },
        {
          onConflict: 'profile_id,tmdb_id,content_type,season_number,episode_number',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error updating watch progress:', error);
      return {
        data: null,
        error: 'Failed to update watch progress',
        success: false,
      };
    }

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/movie/[id]');
    revalidatePath('/tv/[id]');

    return {
      data: data as WatchHistoryEntry,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in updateWatchProgress:', error);
    return {
      data: null,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Mark a media item as completed
 * @param profileId - The profile ID to mark as completed for
 * @param mediaId - The TMDB ID of the media
 * @param mediaType - The type of media ('movie' or 'tv')
 * @param seasonNumber - Optional season number for TV shows
 * @param episodeNumber - Optional episode number for TV shows
 * @returns Success status or error
 */
export async function markAsCompleted(
  profileId: string,
  mediaId: number,
  mediaType: 'movie' | 'tv',
  seasonNumber?: number,
  episodeNumber?: number
): Promise<WatchHistoryResponse<null>> {
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

    // Update the watch history entry to mark as completed
    const { error } = await supabase
      .from('watch_history')
      .update({
        completed: true,
        progress: 100,
        last_watched_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId)
      .eq('tmdb_id', mediaId)
      .eq('content_type', mediaType)
      .is('season_number', seasonNumber ?? null)
      .is('episode_number', episodeNumber ?? null);

    if (error) {
      console.error('Error marking as completed:', error);
      return {
        data: null,
        error: 'Failed to mark as completed',
        success: false,
      };
    }

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/movie/[id]');
    revalidatePath('/tv/[id]');

    return {
      data: null,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in markAsCompleted:', error);
    return {
      data: null,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Get watch progress for a specific media item
 * @param profileId - The profile ID to get progress for
 * @param mediaId - The TMDB ID of the media
 * @param mediaType - The type of media ('movie' or 'tv')
 * @param seasonNumber - Optional season number for TV shows
 * @param episodeNumber - Optional episode number for TV shows
 * @returns Watch history entry with progress or null if not found
 */
export async function getMediaProgress(
  profileId: string,
  mediaId: number,
  mediaType: 'movie' | 'tv',
  seasonNumber?: number,
  episodeNumber?: number
): Promise<WatchHistoryResponse<WatchHistoryEntry | null>> {
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

    // Query for the specific media progress
    let query = supabase
      .from('watch_history')
      .select('*')
      .eq('profile_id', profileId)
      .eq('tmdb_id', mediaId)
      .eq('content_type', mediaType);

    // Add season/episode filters for TV shows
    if (seasonNumber !== undefined) {
      query = query.eq('season_number', seasonNumber);
    } else {
      query = query.is('season_number', null);
    }

    if (episodeNumber !== undefined) {
      query = query.eq('episode_number', episodeNumber);
    } else {
      query = query.is('episode_number', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching media progress:', error);
      return {
        data: null,
        error: 'Failed to fetch media progress',
        success: false,
      };
    }

    return {
      data: data as WatchHistoryEntry | null,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in getMediaProgress:', error);
    return {
      data: null,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Clear all watch history for a profile
 * @param profileId - The profile ID to clear history for
 * @returns Success status or error
 */
export async function clearWatchHistory(
  profileId: string
): Promise<WatchHistoryResponse<null>> {
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

    // Delete all watch history for the profile
    const { error } = await supabase
      .from('watch_history')
      .delete()
      .eq('profile_id', profileId);

    if (error) {
      console.error('Error clearing watch history:', error);
      return {
        data: null,
        error: 'Failed to clear watch history',
        success: false,
      };
    }

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/account');

    return {
      data: null,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in clearWatchHistory:', error);
    return {
      data: null,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Delete a single watch history entry
 * @param profileId - The profile ID
 * @param historyId - The watch history entry ID to delete
 * @returns Success status or error
 */
export async function deleteWatchHistoryEntry(
  profileId: string,
  historyId: string
): Promise<WatchHistoryResponse<null>> {
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

    // Delete the specific watch history entry
    const { error } = await supabase
      .from('watch_history')
      .delete()
      .eq('id', historyId)
      .eq('profile_id', profileId);

    if (error) {
      console.error('Error deleting watch history entry:', error);
      return {
        data: null,
        error: 'Failed to delete watch history entry',
        success: false,
      };
    }

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/account');

    return {
      data: null,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in deleteWatchHistoryEntry:', error);
    return {
      data: null,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Get recently completed items for a profile
 * @param profileId - The profile ID to get completed items for
 * @param limit - Optional limit on number of results (default: 20)
 * @returns Array of completed watch history entries or error
 */
export async function getRecentlyCompleted(
  profileId: string,
  limit: number = 20
): Promise<WatchHistoryResponse<WatchHistoryEntry[]>> {
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

    // Fetch completed items
    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('profile_id', profileId)
      .eq('completed', true)
      .order('last_watched_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recently completed:', error);
      return {
        data: null,
        error: 'Failed to fetch recently completed items',
        success: false,
      };
    }

    return {
      data: data as WatchHistoryEntry[],
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in getRecentlyCompleted:', error);
    return {
      data: null,
      error: 'An unexpected error occurred',
      success: false,
    };
  }
}
