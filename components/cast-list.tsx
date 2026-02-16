"use client";

import { getImageUrl, getMovieCredits } from "@/lib/tmdb";
import type { CastMember } from "@/lib/tmdb";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import Image from "next/image";
import { OptimizedImage } from './optimized-image';
import { Skeleton } from './ui/skeleton';

interface CastListProps {
    cast: CastMember[];
}

export function CastList({ cast }: CastListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    if (!cast || cast.length === 0) return null;

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const scrollAmount = scrollRef.current.clientWidth * 0.8;
        scrollRef.current.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-foreground">Top Cast</h3>

                <div className="flex gap-2">
                    <button
                        onClick={() => scroll("left")}
                        className="p-2 rounded-full bg-card border border-border hover:bg-muted transition-colors"
                        aria-label="Scroll left">
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={() => scroll("right")}
                        className="p-2 rounded-full bg-card border border-border hover:bg-muted transition-colors"
                        aria-label="Scroll right">
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {cast.slice(0, 15).map((actor) => (
                    <div
                        key={actor.id}
                        className="flex-shrink-0 w-32 space-y-2 group">
                        <div className="relative w-32 h-44 rounded-lg overflow-hidden bg-muted">
                            <Image
                                src={
                                    getImageUrl(actor.profile_path, "w185") ||
                                    "/placeholder.svg"
                                }
                                alt={actor.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="128px"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-foreground truncate">
                                {actor.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {actor.character}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export async function CastListAsync({ movieId }: { movieId: string }) {
  const credits = await getMovieCredits(movieId);
  const topCast = credits.cast.slice(0, 10);

  return (
    <section className="my-8">
      <h2 className="text-2xl font-bold mb-4">Cast</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {topCast.map((actor) => (
          <div key={actor.id} className="text-center">
            <div className="aspect-square relative rounded-full overflow-hidden mb-2">
              <OptimizedImage
                src={actor.profile_path}
                alt={actor.name}
                size="w185"
                className="object-cover"
              />
            </div>
            <p className="font-semibold text-sm">{actor.name}</p>
            <p className="text-xs text-muted-foreground">{actor.character}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CastListSkeleton() {
  return (
    <section className="my-8">
      <Skeleton className="h-8 w-32 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="aspect-square rounded-full mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-3 w-3/4 mx-auto" />
          </div>
        ))}
      </div>
    </section>
  );
}
