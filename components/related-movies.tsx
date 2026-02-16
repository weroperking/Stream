"use client";

import { fetchMoreRelatedMovies } from "@/app/actions";
import type { Movie } from "@/lib/tmdb";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { MovieCard } from "./movie-card";

interface RelatedMoviesProps {
	initialMovies: Movie[];
	genreId: number;
	currentMovieId: number;
}

export function RelatedMovies({
	initialMovies,
	genreId,
	currentMovieId,
}: RelatedMoviesProps) {
	const [movies, setMovies] = useState<Movie[]>(initialMovies);
	const [page, setPage] = useState(2);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const scrollRef = useRef<HTMLDivElement>(null);

	const loadMore = useCallback(async () => {
		if (loading || !hasMore) return;

		setLoading(true);
		try {
			const newMovies = await fetchMoreRelatedMovies(genreId, page);

			if (newMovies.length === 0) {
				setHasMore(false);
			} else {
				const filteredNewMovies = newMovies.filter(
					(movie) =>
						movie.id !== currentMovieId &&
						!movies.some((existing) => existing.id === movie.id)
				);

				if (filteredNewMovies.length > 0) {
					setMovies((prev) => [...prev, ...filteredNewMovies]);
				}
				setPage((prev) => prev + 1);
			}
		} catch (error) {
			console.error("Error loading more movies:", error);
		} finally {
			setLoading(false);
		}
	}, [genreId, page, loading, hasMore, currentMovieId, movies]);

	const scroll = (direction: "left" | "right") => {
		if (!scrollRef.current) return;
		const scrollAmount = scrollRef.current.clientWidth * 0.8;
		scrollRef.current.scrollBy({
			left: direction === "left" ? -scrollAmount : scrollAmount,
			behavior: "smooth",
		});

		// Load more when scrolling right and near the end
		if (direction === "right" && hasMore) {
			const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
			if (scrollLeft + clientWidth >= scrollWidth - 200) {
				loadMore();
			}
		}
	};

	if (movies.length === 0) {
		return null;
	}

	return (
		<section className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-foreground">Related Movies</h2>
					<div className="h-1 w-16 bg-primary rounded mt-2" />
				</div>

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
				{movies.map((movie) => (
					<div
						key={movie.id}
						className="flex-shrink-0 w-40 sm:w-48 md:w-52">
						<MovieCard movie={movie} />
					</div>
				))}

				{loading && (
					<div className="flex-shrink-0 w-40 sm:w-48 md:w-52 flex items-center justify-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
					</div>
				)}
			</div>
		</section>
	);
}
