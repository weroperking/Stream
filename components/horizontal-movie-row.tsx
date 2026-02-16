"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import type { Movie } from "@/lib/tmdb";
import { MovieCardLandscape } from "./movie-card-landscape";

interface HorizontalMovieRowProps {
	title: string;
	movies: Movie[];
	isSpecialTitle?: boolean;
}

export function HorizontalMovieRow({ title, movies, isSpecialTitle }: HorizontalMovieRowProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(movies.length > 0);

	const scroll = (direction: "left" | "right") => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const cardWidth = 360; // md:w-[360px]
		const gap = 16; // gap-4
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

	return (
		<section className="space-y-6">
			<div className="flex items-center justify-between px-4 md:px-8">
				<h2 className={`text-lg md:text-xl font-semibold text-white ${isSpecialTitle ? 'font-display-title' : ''}`}>
					{title}
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
					{movies.map((movie) => (
						<div
							key={movie.id}
							className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px]"
						>
							<MovieCardLandscape movie={movie} />
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
