"use client";

import { ChevronLeft, ChevronRight, Play, Clock } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWatchHistory } from "@/hooks/use-watch-history";
import type { WatchHistoryEntry } from "@/lib/auth-types";

interface ContinueWatchingRowProps {
  /** Optional limit on number of items to show */
  limit?: number;
}

interface MediaDetails {
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
}

export function ContinueWatchingRow({ limit = 10 }: ContinueWatchingRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [mediaDetails, setMediaDetails] = useState<Record<string, MediaDetails>>({});
  
  const { inProgressItems, loading, hasActiveProfile } = useWatchHistory();

  // Limit items
  const items = inProgressItems.slice(0, limit);

  // Fetch media details for each item
  useEffect(() => {
    const fetchMediaDetails = async () => {
      const details: Record<string, MediaDetails> = {};
      
      for (const item of items) {
        const key = `${item.content_type}-${item.tmdb_id}`;
        if (!details[key]) {
          try {
            const response = await fetch(
              `https://api.themoviedb.org/3/${item.content_type}/${item.tmdb_id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
            );
            if (response.ok) {
              const data = await response.json();
              details[key] = {
                title: data.title || data.name,
                poster_path: data.poster_path,
                backdrop_path: data.backdrop_path,
                overview: data.overview,
              };
            }
          } catch (error) {
            console.error(`Error fetching details for ${key}:`, error);
          }
        }
      }
      
      setMediaDetails(details);
    };

    if (items.length > 0) {
      fetchMediaDetails();
    }
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cardWidth = 320;
    const gap = 16;
    const scrollAmount = cardWidth + gap;

    if (direction === "left") {
      container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  // Update scroll buttons on mount and when items change
  useEffect(() => {
    handleScroll();
  }, [items]);

  // Don't render if no active profile, loading, or no items
  if (!hasActiveProfile || loading || items.length === 0) {
    return null;
  }

  // Format time remaining
  const formatTimeRemaining = (entry: WatchHistoryEntry): string => {
    if (!entry.duration || entry.progress >= 95) return "Almost done";
    const remainingSeconds = entry.duration * (1 - entry.progress / 100);
    const minutes = Math.ceil(remainingSeconds / 60);
    return `${minutes} min left`;
  };

  // Get watch URL for the item
  const getWatchUrl = (item: WatchHistoryEntry): string => {
    if (item.content_type === "movie") {
      return `/watch/movie/${item.tmdb_id}`;
    }
    return `/watch/tv/${item.tmdb_id}?season=${item.season_number ?? 1}&episode=${item.episode_number ?? 1}`;
  };

  // Get info URL for the item
  const getInfoUrl = (item: WatchHistoryEntry): string => {
    if (item.content_type === "movie") {
      return `/movie/${item.tmdb_id}`;
    }
    return `/tv/${item.tmdb_id}`;
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-4 md:px-8">
        <h2 className="text-lg md:text-xl font-semibold text-white flex items-center gap-2">
          <Clock size={20} className="text-primary" />
          Continue Watching
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={20} className="text-white" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto px-4 md:px-8 pb-4 scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {items.map((item) => {
            const key = `${item.content_type}-${item.tmdb_id}`;
            const details = mediaDetails[key];
            const title = details?.title || `Loading...`;
            const backdropUrl = details?.backdrop_path
              ? `https://image.tmdb.org/t/p/w500${details.backdrop_path}`
              : null;

            return (
              <Link
                key={item.id}
                href={getWatchUrl(item)}
                className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] group"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800">
                  {/* Backdrop Image */}
                  {backdropUrl ? (
                    <Image
                      src={backdropUrl}
                      alt={title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 280px, (max-width: 768px) 300px, 320px"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800" />
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play size={24} className="text-black ml-1" fill="black" />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  {/* Episode Badge for TV Shows */}
                  {item.content_type === "tv" && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-xs text-white font-medium">
                      S{item.season_number ?? 1} E{item.episode_number ?? 1}
                    </div>
                  )}

                  {/* Time Remaining */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-xs text-white">
                    {formatTimeRemaining(item)}
                  </div>
                </div>

                {/* Title and Info */}
                <div className="mt-2 px-1">
                  <h3 className="text-white font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                  {item.content_type === "tv" && (
                    <p className="text-gray-400 text-xs mt-0.5">
                      Season {item.season_number ?? 1} • Episode {item.episode_number ?? 1}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
