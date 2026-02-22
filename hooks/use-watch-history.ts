"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getWatchHistory,
  getInProgressItems,
  updateWatchProgress,
  markAsCompleted,
  getMediaProgress,
  type WatchHistoryResponse,
} from "@/lib/watch-history-actions";
import type {
  WatchHistoryEntry,
  UpdateWatchProgressInput,
} from "@/lib/auth-types";

// ============================================================================
// Types
// ============================================================================

interface UseWatchHistoryOptions {
  /** Auto-fetch history on mount */
  autoFetch?: boolean;
  /** Debounce delay for progress updates (in ms) */
  debounceDelay?: number;
}

interface UseWatchHistoryReturn {
  /** Watch history entries */
  watchHistory: WatchHistoryEntry[];
  /** In-progress items for "Continue Watching" */
  inProgressItems: WatchHistoryEntry[];
  /** Loading state for initial fetch */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Update watch progress for a media item */
  updateProgress: (item: UpdateWatchProgressInput) => Promise<boolean>;
  /** Mark a media item as completed */
  markCompleted: (
    mediaId: number,
    mediaType: "movie" | "tv",
    seasonNumber?: number,
    episodeNumber?: number
  ) => Promise<boolean>;
  /** Get progress for a specific media item */
  getProgress: (
    mediaId: number,
    mediaType: "movie" | "tv",
    seasonNumber?: number,
    episodeNumber?: number
  ) => Promise<WatchHistoryEntry | null>;
  /** Refresh watch history data */
  refresh: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
  /** Check if there's an active profile */
  hasActiveProfile: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWatchHistory(
  options: UseWatchHistoryOptions = {}
): UseWatchHistoryReturn {
  const { autoFetch = true, debounceDelay = 5000 } = options;

  const { activeUserProfile } = useAuth();

  const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>([]);
  const [inProgressItems, setInProgressItems] = useState<WatchHistoryEntry[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for debouncing
  const pendingProgressRef = useRef<UpdateWatchProgressInput | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  /** Fetch all watch history data */
  const fetchData = useCallback(async () => {
    if (!activeUserProfile?.id) {
      setWatchHistory([]);
      setInProgressItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch both in parallel
      const [historyResult, inProgressResult] = await Promise.all([
        getWatchHistory(activeUserProfile.id, 50),
        getInProgressItems(activeUserProfile.id, 20),
      ]);

      if (historyResult.success && historyResult.data) {
        setWatchHistory(historyResult.data);
      } else if (historyResult.error) {
        console.error("Error fetching watch history:", historyResult.error);
      }

      if (inProgressResult.success && inProgressResult.data) {
        setInProgressItems(inProgressResult.data);
      } else if (inProgressResult.error) {
        console.error(
          "Error fetching in-progress items:",
          inProgressResult.error
        );
      }
    } catch (err) {
      console.error("Unexpected error fetching watch history:", err);
      setError("Failed to load watch history");
    } finally {
      setLoading(false);
    }
  }, [activeUserProfile?.id]);

  /** Refresh data */
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Auto-fetch on mount and when profile changes
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  // ============================================================================
  // Progress Updates with Debouncing
  // ============================================================================

  /** Flush pending progress update to server */
  const flushProgressUpdate = useCallback(async () => {
    if (!activeUserProfile?.id || !pendingProgressRef.current || isSavingRef.current) {
      return;
    }

    const item = pendingProgressRef.current;
    isSavingRef.current = true;

    try {
      const result = await updateWatchProgress(activeUserProfile.id, item);

      if (result.success) {
        // Update local state optimistically
        setInProgressItems((prev) => {
          const existingIndex = prev.findIndex(
            (entry) =>
              entry.tmdb_id === item.mediaId &&
              entry.content_type === item.mediaType &&
              (item.seasonNumber === undefined ||
                entry.season_number === item.seasonNumber) &&
              (item.episodeNumber === undefined ||
                entry.episode_number === item.episodeNumber)
          );

          if (result.data) {
            if (existingIndex >= 0) {
              // Update existing entry
              const updated = [...prev];
              updated[existingIndex] = result.data;
              return updated;
            } else if (!result.data.completed) {
              // Add new in-progress item
              return [result.data, ...prev];
            }
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Error updating watch progress:", err);
    } finally {
      isSavingRef.current = false;
    }
  }, [activeUserProfile?.id]);

  /** Update progress (debounced) */
  const updateProgress = useCallback(
    async (item: UpdateWatchProgressInput): Promise<boolean> => {
      if (!activeUserProfile?.id) {
        console.warn("No active profile - cannot update progress");
        return false;
      }

      // Store pending update
      pendingProgressRef.current = item;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer for debounced save
      debounceTimerRef.current = setTimeout(() => {
        flushProgressUpdate();
      }, debounceDelay);

      return true;
    },
    [activeUserProfile?.id, debounceDelay, flushProgressUpdate]
  );

  /** Force save any pending progress immediately */
  const forceSaveProgress = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await flushProgressUpdate();
  }, [flushProgressUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Force save any pending progress on unmount
      if (pendingProgressRef.current) {
        flushProgressUpdate();
      }
    };
  }, [flushProgressUpdate]);

  // ============================================================================
  // Mark as Completed
  // ============================================================================

  const markCompleted = useCallback(
    async (
      mediaId: number,
      mediaType: "movie" | "tv",
      seasonNumber?: number,
      episodeNumber?: number
    ): Promise<boolean> => {
      if (!activeUserProfile?.id) {
        console.warn("No active profile - cannot mark as completed");
        return false;
      }

      try {
        const result = await markAsCompleted(
          activeUserProfile.id,
          mediaId,
          mediaType,
          seasonNumber,
          episodeNumber
        );

        if (result.success) {
          // Remove from in-progress items
          setInProgressItems((prev) =>
            prev.filter(
              (entry) =>
                !(
                  entry.tmdb_id === mediaId &&
                  entry.content_type === mediaType &&
                  (seasonNumber === undefined ||
                    entry.season_number === seasonNumber) &&
                  (episodeNumber === undefined ||
                    entry.episode_number === episodeNumber)
                )
            )
          );

          // Refresh to get updated data
          await refresh();
          return true;
        }

        return false;
      } catch (err) {
        console.error("Error marking as completed:", err);
        return false;
      }
    },
    [activeUserProfile?.id, refresh]
  );

  // ============================================================================
  // Get Progress for Specific Media
  // ============================================================================

  const getProgress = useCallback(
    async (
      mediaId: number,
      mediaType: "movie" | "tv",
      seasonNumber?: number,
      episodeNumber?: number
    ): Promise<WatchHistoryEntry | null> => {
      if (!activeUserProfile?.id) {
        return null;
      }

      try {
        const result = await getMediaProgress(
          activeUserProfile.id,
          mediaId,
          mediaType,
          seasonNumber,
          episodeNumber
        );

        if (result.success) {
          return result.data;
        }

        return null;
      } catch (err) {
        console.error("Error getting media progress:", err);
        return null;
      }
    },
    [activeUserProfile?.id]
  );

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    watchHistory,
    inProgressItems,
    loading,
    error,
    updateProgress,
    markCompleted,
    getProgress,
    refresh,
    clearError,
    hasActiveProfile: !!activeUserProfile?.id,
  };
}

// ============================================================================
// Utility Hook for Progress Tracking in Video Player
// ============================================================================

interface UseProgressTrackerOptions {
  mediaId: number;
  mediaType: "movie" | "tv";
  seasonNumber?: number;
  episodeNumber?: number;
  duration: number;
  /** Save interval in milliseconds (default: 15000 = 15 seconds) */
  saveInterval?: number;
  /** Completion threshold percentage (default: 90) */
  completionThreshold?: number;
  /** Callback when progress is saved */
  onProgressSaved?: (progress: number) => void;
  /** Callback when marked as completed */
  onCompleted?: () => void;
}

export function useProgressTracker(options: UseProgressTrackerOptions) {
  const {
    mediaId,
    mediaType,
    seasonNumber,
    episodeNumber,
    duration,
    saveInterval = 15000,
    completionThreshold = 90,
    onProgressSaved,
    onCompleted,
  } = options;

  const { activeUserProfile } = useAuth();
  const [lastSavedTime, setLastSavedTime] = useState(0);
  const [hasMarkedCompleted, setHasMarkedCompleted] = useState(false);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef(0);

  // Calculate progress percentage
  const calculateProgress = useCallback(
    (currentTime: number): number => {
      if (duration <= 0) return 0;
      return Math.min(100, Math.round((currentTime / duration) * 100));
    },
    [duration]
  );

  // Save progress to server
  const saveProgress = useCallback(
    async (currentTime: number) => {
      if (!activeUserProfile?.id || duration <= 0) return;

      const progress = calculateProgress(currentTime);

      // Don't save if progress hasn't changed significantly
      if (Math.abs(currentTime - lastUpdateTimeRef.current) < 5) {
        return;
      }

      lastUpdateTimeRef.current = currentTime;

      try {
        const result = await updateWatchProgress(activeUserProfile.id, {
          mediaId,
          mediaType,
          seasonNumber,
          episodeNumber,
          progress,
          duration,
          completed: progress >= completionThreshold,
        });

        if (result.success) {
          setLastSavedTime(currentTime);
          onProgressSaved?.(progress);

          // Mark as completed if threshold reached
          if (progress >= completionThreshold && !hasMarkedCompleted) {
            setHasMarkedCompleted(true);
            onCompleted?.();
          }
        }
      } catch (err) {
        console.error("Error saving progress:", err);
      }
    },
    [
      activeUserProfile?.id,
      mediaId,
      mediaType,
      seasonNumber,
      episodeNumber,
      duration,
      completionThreshold,
      calculateProgress,
      hasMarkedCompleted,
      onProgressSaved,
      onCompleted,
    ]
  );

  // Handle time update from player
  const handleTimeUpdate = useCallback(
    (currentTime: number) => {
      // Save at regular intervals
      if (Math.abs(currentTime - lastSavedTime) >= saveInterval / 1000) {
        saveProgress(currentTime);
      }
    },
    [lastSavedTime, saveInterval, saveProgress]
  );

  // Handle pause event - save progress immediately
  const handlePause = useCallback(
    (currentTime: number) => {
      saveProgress(currentTime);
    },
    [saveProgress]
  );

  // Handle seek event - save progress immediately
  const handleSeek = useCallback(
    (currentTime: number) => {
      saveProgress(currentTime);
    },
    [saveProgress]
  );

  // Handle video end - mark as completed
  const handleEnded = useCallback(async () => {
    if (!activeUserProfile?.id || hasMarkedCompleted) return;

    try {
      await markAsCompleted(
        activeUserProfile.id,
        mediaId,
        mediaType,
        seasonNumber,
        episodeNumber
      );
      setHasMarkedCompleted(true);
      onCompleted?.();
    } catch (err) {
      console.error("Error marking as completed:", err);
    }
  }, [
    activeUserProfile?.id,
    mediaId,
    mediaType,
    seasonNumber,
    episodeNumber,
    hasMarkedCompleted,
    onCompleted,
  ]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, []);

  return {
    handleTimeUpdate,
    handlePause,
    handleSeek,
    handleEnded,
    saveProgress,
    calculateProgress,
    hasMarkedCompleted,
  };
}
