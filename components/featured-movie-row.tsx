"use client";

import { FeaturedMovieCard } from "@/components/featured-movie-card";
import type { Movie, TVShow } from "@/lib/tmdb";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

interface FeaturedMovieRowProps {
	movies: (Movie | TVShow)[];
	title?: string;
	showNavigation?: boolean;
}

export function FeaturedMovieRow({
	movies,
	title = "Featured",
	showNavigation = true,
}: FeaturedMovieRowProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(movies.length > 3);

	// Only show first 3 movies as featured
	const featuredMovies = movies.slice(0, 3);

	const scroll = (direction: "left" | "right") => {
		const container = scrollContainerRef.current;
		if (!container) return;

		// Calculate scroll amount based on card width + gap
		const containerWidth = container.clientWidth;
		const cardWidth = containerWidth / 3; // Show 3 cards at a time
		const scrollAmount = cardWidth;

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

	return (
		<section className="space-y-4">
			{/* Section Title */}
			<div className="flex items-center justify-between px-4 md:px-8">
				<h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
				{showNavigation && movies.length > 3 && (
					<div className="flex items-center gap-2">
						<button
							onClick={() => scroll("left")}
							disabled={!canScrollLeft}
							className="p-2 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
							aria-label="Scroll left"
						>
							<ChevronLeft size={20} className="text-white" />
						</button>
						<button
							onClick={() => scroll("right")}
							disabled={!canScrollRight}
							className="p-2 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
							aria-label="Scroll right"
						>
							<ChevronRight size={20} className="text-white" />
						</button>
					</div>
				)}
			</div>

			{/* Featured Movies Row */}
			<div className="relative">
				<div
					ref={scrollContainerRef}
					onScroll={handleScroll}
					className="flex gap-4 overflow-x-auto px-4 md:px-8 pb-4 scrollbar-hide"
					style={{
						scrollbarWidth: "none",
						msOverflowStyle: "none",
						snapType: "x mandatory",
					}}
				>
					{featuredMovies.map((movie, index) => (
						<div
							key={movie.id}
							className="flex-shrink-0 w-[85%] sm:w-[45%] md:w-[35%] lg:w-[30%]"
							style={{
								snapAlign: index === 0 ? "start" : "center",
							}}
						>
							<FeaturedMovieCard
								movie={movie}
								orientation="landscape"
								priority={index < 2}
							/>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
