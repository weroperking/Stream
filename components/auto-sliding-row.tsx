"use client";

import type { Movie } from "@/lib/tmdb";
import { useEffect, useRef } from "react";
import { MovieCardLandscape } from "./movie-card-landscape";

interface AutoSlidingRowProps {
    title: string;
    movies: Movie[];
    direction?: "left" | "right";
    speed?: number; // pixels per second
    isSpecialTitle?: boolean;
}

export function AutoSlidingRow({
    title,
    movies,
    direction = "right",
    speed = 30,
    isSpecialTitle = false
}: AutoSlidingRowProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const lastTimeRef = useRef<number>(0);

    // Don't run animation if no movies
    const hasMovies = movies && movies.length > 0;

    // Duplicate movies to create infinite loop effect
    const duplicatedMovies = hasMovies ? [...movies, ...movies, ...movies] : [];

    useEffect(() => {
        if (!hasMovies) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        // Set initial scroll position to middle section
        const cardWidth = 400; // approximate card width
        const gap = 12; // gap between cards
        const initialOffset = movies.length * (cardWidth + gap);
        container.scrollLeft = initialOffset;

        const animate = (currentTime: number) => {
            if (!lastTimeRef.current) {
                lastTimeRef.current = currentTime;
            }

            const deltaTime = (currentTime - lastTimeRef.current) / 1000; // convert to seconds
            lastTimeRef.current = currentTime;

            if (container) {
                const scrollAmount = speed * deltaTime;

                if (direction === "right") {
                    container.scrollLeft += scrollAmount;
                } else {
                    container.scrollLeft -= scrollAmount;
                }

                // Reset scroll position when reaching boundaries for infinite loop
                const maxScroll = container.scrollWidth - container.clientWidth;
                const sectionWidth = movies.length * (cardWidth + gap);

                if (direction === "right" && container.scrollLeft >= initialOffset + sectionWidth) {
                    container.scrollLeft = initialOffset;
                } else if (direction === "left" && container.scrollLeft <= initialOffset - sectionWidth) {
                    container.scrollLeft = initialOffset;
                }
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [direction, speed, movies.length, hasMovies]);

    return (
        <section className="space-y-4 group/row">
            <h2 className={`text-lg md:text-xl font-semibold text-white px-4 md:px-8 ${isSpecialTitle ? 'font-display-title' : ''}`}>
                {title}
            </h2>

            <div className="relative">
                {/* Scrollable Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-3 overflow-x-hidden px-4 md:px-8"
                    style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                    }}
                >
                    {duplicatedMovies.map((movie, index) => (
                        <div
                            key={`${movie.id}-${index}`}
                            className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] lg:w-[400px]"
                        >
                            <MovieCardLandscape movie={movie} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
