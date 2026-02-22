"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  toggleWatchlist,
} from "@/lib/watchlist-actions";
import type { WatchlistEntry, AddToWatchlistInput } from "@/lib/auth-types";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

interface WatchlistItem {
  id: number;
  title: string;
  poster_path: string | null;
  mediaType: "movie" | "tv";
  // Additional fields for compatibility with existing components
  overview?: string;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  name?: string;
  original_language?: string;
}

// ============================================================================
// Hook
// ============================================================================

export function useWatchlist() {
  const { activeUserProfile } = useAuth();
  const [watchlistItems, setWatchlistItems] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(
    new Set()
  );

  // Track items that are in the watchlist for quick lookup
  const [watchlistIds, setWatchlistIds] = useState<Map<string, boolean>>(
    new Map()
  );

  // Fetch watchlist on mount or when profile changes
  useEffect(() => {
    const fetchWatchlist = async () => {
      if (!activeUserProfile?.id) {
        setWatchlistItems([]);
        setWatchlistIds(new Map());
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getWatchlist(activeUserProfile.id);

        if (result.success && result.data) {
          setWatchlistItems(result.data);

          // Build a map for quick lookup
          const idMap = new Map<string, boolean>();
          result.data.forEach((item) => {
            const key = `${item.content_type}-${item.tmdb_id}`;
            idMap.set(key, true);
          });
          setWatchlistIds(idMap);
        } else {
          setError(result.error || "Failed to fetch watchlist");
        }
      } catch (err) {
        console.error("Error fetching watchlist:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();
  }, [activeUserProfile?.id]);

  // Check if an item is in the watchlist
  const isSaved = useCallback(
    (mediaId: number, mediaType: "movie" | "tv" = "movie"): boolean => {
      const key = `${mediaType}-${mediaId}`;
      return watchlistIds.get(key) ?? false;
    },
    [watchlistIds]
  );

  // Add item to watchlist
  const saveMovie = useCallback(
    async (item: WatchlistItem): Promise<boolean> => {
      if (!activeUserProfile?.id) {
        toast.error("Please select a profile to save items");
        return false;
      }

      const operationKey = `${item.mediaType}-${item.id}`;
      if (pendingOperations.has(operationKey)) {
        return false;
      }

      setPendingOperations((prev) => new Set(prev).add(operationKey));

      // Optimistic update
      const key = `${item.mediaType}-${item.id}`;
      setWatchlistIds((prev) => new Map(prev).set(key, true));

      try {
        const input: AddToWatchlistInput = {
          mediaId: item.id,
          mediaType: item.mediaType,
          title: item.title,
          posterPath: item.poster_path || undefined,
        };

        const result = await addToWatchlist(activeUserProfile.id, input);

        if (result.success) {
          toast.success(`Added "${item.title}" to your list`);
          // Refresh the watchlist to get the actual data
          const refreshResult = await getWatchlist(activeUserProfile.id);
          if (refreshResult.success && refreshResult.data) {
            setWatchlistItems(refreshResult.data);
          }
          return true;
        } else {
          // Revert optimistic update
          setWatchlistIds((prev) => {
            const newMap = new Map(prev);
            newMap.delete(key);
            return newMap;
          });
          toast.error(result.error || "Failed to add to watchlist");
          return false;
        }
      } catch (err) {
        console.error("Error adding to watchlist:", err);
        // Revert optimistic update
        setWatchlistIds((prev) => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
        toast.error("An unexpected error occurred");
        return false;
      } finally {
        setPendingOperations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(operationKey);
          return newSet;
        });
      }
    },
    [activeUserProfile?.id, pendingOperations]
  );

  // Remove item from watchlist
  const removeMovie = useCallback(
    async (mediaId: number, mediaType: "movie" | "tv" = "movie"): Promise<boolean> => {
      if (!activeUserProfile?.id) {
        toast.error("Please select a profile to remove items");
        return false;
      }

      const operationKey = `${mediaType}-${mediaId}`;
      if (pendingOperations.has(operationKey)) {
        return false;
      }

      setPendingOperations((prev) => new Set(prev).add(operationKey));

      // Find the item title for the toast message
      const item = watchlistItems.find(
        (w) => w.tmdb_id === mediaId && w.content_type === mediaType
      );
      const itemTitle = item?.title || "Item";

      // Optimistic update
      const key = `${mediaType}-${mediaId}`;
      setWatchlistIds((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      setWatchlistItems((prev) =>
        prev.filter((w) => !(w.tmdb_id === mediaId && w.content_type === mediaType))
      );

      try {
        const result = await removeFromWatchlist(
          activeUserProfile.id,
          mediaId,
          mediaType
        );

        if (result.success) {
          toast.success(`Removed "${itemTitle}" from your list`);
          return true;
        } else {
          // Revert optimistic update
          setWatchlistIds((prev) => new Map(prev).set(key, true));
          const refreshResult = await getWatchlist(activeUserProfile.id);
          if (refreshResult.success && refreshResult.data) {
            setWatchlistItems(refreshResult.data);
          }
          toast.error(result.error || "Failed to remove from watchlist");
          return false;
        }
      } catch (err) {
        console.error("Error removing from watchlist:", err);
        // Revert optimistic update
        setWatchlistIds((prev) => new Map(prev).set(key, true));
        const refreshResult = await getWatchlist(activeUserProfile.id);
        if (refreshResult.success && refreshResult.data) {
          setWatchlistItems(refreshResult.data);
        }
        toast.error("An unexpected error occurred");
        return false;
      } finally {
        setPendingOperations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(operationKey);
          return newSet;
        });
      }
    },
    [activeUserProfile?.id, pendingOperations, watchlistItems]
  );

  // Toggle item in watchlist
  const toggleSave = useCallback(
    async (item: WatchlistItem): Promise<boolean> => {
      if (!activeUserProfile?.id) {
        toast.error("Please select a profile to manage your list");
        return false;
      }

      const operationKey = `${item.mediaType}-${item.id}`;
      if (pendingOperations.has(operationKey)) {
        return false;
      }

      setPendingOperations((prev) => new Set(prev).add(operationKey));

      const key = `${item.mediaType}-${item.id}`;
      const currentlySaved = watchlistIds.get(key) ?? false;

      // Optimistic update
      setWatchlistIds((prev) => {
        const newMap = new Map(prev);
        if (currentlySaved) {
          newMap.delete(key);
        } else {
          newMap.set(key, true);
        }
        return newMap;
      });

      try {
        const input: AddToWatchlistInput = {
          mediaId: item.id,
          mediaType: item.mediaType,
          title: item.title,
          posterPath: item.poster_path || undefined,
        };

        const result = await toggleWatchlist(activeUserProfile.id, input);

        if (result.success && result.data) {
          const { added } = result.data;
          toast.success(
            added
              ? `Added "${item.title}" to your list`
              : `Removed "${item.title}" from your list`
          );

          // Refresh the watchlist to get the actual data
          const refreshResult = await getWatchlist(activeUserProfile.id);
          if (refreshResult.success && refreshResult.data) {
            setWatchlistItems(refreshResult.data);
          }

          return true;
        } else {
          // Revert optimistic update
          setWatchlistIds((prev) => {
            const newMap = new Map(prev);
            if (currentlySaved) {
              newMap.set(key, true);
            } else {
              newMap.delete(key);
            }
            return newMap;
          });
          toast.error(result.error || "Failed to update watchlist");
          return false;
        }
      } catch (err) {
        console.error("Error toggling watchlist:", err);
        // Revert optimistic update
        setWatchlistIds((prev) => {
          const newMap = new Map(prev);
          if (currentlySaved) {
            newMap.set(key, true);
          } else {
            newMap.delete(key);
          }
          return newMap;
        });
        toast.error("An unexpected error occurred");
        return false;
      } finally {
        setPendingOperations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(operationKey);
          return newSet;
        });
      }
    },
    [activeUserProfile?.id, pendingOperations, watchlistIds]
  );

  // Check if an operation is pending for an item
  const isPending = useCallback(
    (mediaId: number, mediaType: "movie" | "tv" = "movie"): boolean => {
      const key = `${mediaType}-${mediaId}`;
      return pendingOperations.has(key);
    },
    [pendingOperations]
  );

  // Convert WatchlistEntry to a format compatible with existing components
  const savedMovies: WatchlistItem[] = watchlistItems.map((item) => ({
    id: item.tmdb_id,
    title: item.title,
    poster_path: item.poster_path,
    mediaType: item.content_type as "movie" | "tv",
    // Add compatibility fields
    backdrop_path: item.poster_path,
    name: item.content_type === "tv" ? item.title : undefined,
    first_air_date: item.content_type === "tv" ? "" : undefined,
  }));

  return {
    savedMovies,
    watchlistItems,
    loading,
    error,
    hasActiveProfile: !!activeUserProfile,
    saveMovie,
    removeMovie,
    isSaved,
    toggleSave,
    isPending,
  };
}

// Export type for use in other components
export type { WatchlistItem };
