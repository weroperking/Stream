"use client";

import { DynamicMovieCard } from "@/components/dynamic-movie-card";
import { FeaturedMovieCard } from "@/components/featured-movie-card";
import type { Movie, TVShow } from "@/lib/tmdb";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

type CardVariant = "featured" | "dynamic";

interface MovieCategorySectionProps {
	title: string;
	movies: (Movie | TVShow)[];
	variant?: CardVariant;
	showFeaturedRow?: boolean;
}

export function MovieCategorySection({
	title,
	movies,
	variant = "dynamic",
	showFeaturedRow = false,
}: MovieCategorySectionProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(movies.length > 4);

	const scroll = (direction: "left" | "right") => {
		const container = scrollContainerRef.current;
		if (!container) return;

		// Get the first visible card's width
		const containerWidth = container.clientWidth;
		let cardsToShow = 1;
		if (containerWidth >= 1280) {
			cardsToShow = 5; // xl: 5 cards
		} else if (containerWidth >= 1024) {
			cardsToShow = 4; // lg: 4 cards
		} else if (containerWidth >= 768) {
			cardsToShow = 3; // md: 3 cards
		} else {
			cardsToShow = 2; // sm: 2 cards
		}

		const cardWidth = containerWidth / cardsToShow;
		const gap = 16; // gap-4
		const scrollAmount = cardWidth - gap;

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

	// Get the card width based on screen size
	const getCardWidthClass = () => {
		return "w-[45%] sm:w-[35%] md:w-[28%] lg:w-[22%] xl:w-[18%]";
	};

	// Featured movies (first 3) and remaining movies
	const featuredMovies = showFeaturedRow ? movies.slice(0, 3) : [];
	const remainingMovies = showFeaturedRow ? movies.slice(3) : movies;

	return (
		<section className="space-y-6">
			{/* Section Title */}
			<div className="flex items-center justify-between px-4 md:px-8">
				<h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
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
			</div>

			{/* Featured Row (if enabled) */}
			{showFeaturedRow && featuredMovies.length > 0 && (
				<div className="px-4 md:px-8">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{featuredMovies.map((movie, index) => (
							<div key={movie.id} className="w-full">
								<FeaturedMovieCard
									movie={movie}
									orientation="landscape"
									priority={index < 2}
								/>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Horizontal Scrolling Movies */}
			{remainingMovies.length > 0 && (
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
						{remainingMovies.map((movie, index) => (
							<div
								key={movie.id}
								className={`flex-shrink-0 ${getCardWidthClass()}`}
								style={{
									snapAlign: index === 0 ? "start" : "center",
								}}
							>
								{variant === "featured" ? (
									<FeaturedMovieCard
										movie={movie}
										orientation="landscape"
										showTitleBelow
										priority={index < 2}
									/>
								) : (
									<DynamicMovieCard movie={movie} priority={index < 4} />
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</section>
	);
}
