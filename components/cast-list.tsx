"use client";

import { getImageUrl } from "@/lib/tmdb";
import type { CastMember } from "@/lib/tmdb";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import Image from "next/image";

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
