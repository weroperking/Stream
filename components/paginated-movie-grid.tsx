"use client";

import { useState } from "react";
import type { Movie } from "@/lib/tmdb";
import { HorizontalMovieRow } from "./horizontal-movie-row";

interface PaginatedMovieGridProps {
	initialMovies: Movie[];
	moviesPerRow?: number;
	rowsPerPage?: number;
	title?: string;
	showAllPages?: boolean;
}

export function PaginatedMovieGrid({
	initialMovies,
	moviesPerRow = 5,
	rowsPerPage = 5,
	title = "Movies",
	showAllPages = false,
}: PaginatedMovieGridProps) {
	const [currentPage, setCurrentPage] = useState(1);
	const moviesPerPage = moviesPerRow * rowsPerPage;
	const totalMoviePages = Math.ceil(initialMovies.length / moviesPerPage);

	// Calculate which movies to show
	const effectiveTotalPages = showAllPages ? totalMoviePages : Math.min(totalMoviePages, 1);
	const effectiveMoviesPerPage = showAllPages ? moviesPerPage : initialMovies.length;
	
	// Get movies for current page
	const startIndex = (currentPage - 1) * effectiveMoviesPerPage;
	const endIndex = Math.min(startIndex + effectiveMoviesPerPage, initialMovies.length);
	const currentMovies = initialMovies.slice(startIndex, endIndex);

	// Create rows from current page movies
	const rows = [];
	for (let i = 0; i < currentMovies.length; i += moviesPerRow) {
		rows.push(currentMovies.slice(i, i + moviesPerRow));
	}

	// Create page groups (e.g., 1-5, 6-10, etc.)
	const pageGroupSize = 5;
	const currentGroup = Math.ceil(currentPage / pageGroupSize);
	const totalGroups = Math.ceil(effectiveTotalPages / pageGroupSize);

	const getPageRange = () => {
		const start = (currentGroup - 1) * pageGroupSize + 1;
		const end = Math.min(currentGroup * pageGroupSize, effectiveTotalPages);
		return { start, end };
	};

	const { start, end } = getPageRange();

	return (
		<div className="space-y-8">
			{rows.map((rowMovies, rowIndex) => (
				<HorizontalMovieRow
					key={`${title}-row-${startIndex + rowIndex * moviesPerRow}`}
					title={`${title} (${startIndex + rowIndex * moviesPerRow + 1}-${Math.min(startIndex + (rowIndex + 1) * moviesPerRow, initialMovies.length)})`}
					movies={rowMovies}
				/>
			))}

			{/* Pagination Controls */}
			<div className="flex flex-col items-center gap-4 py-6 border-t-2 border-red-600 bg-black rounded-lg mt-8">
				<div className="flex items-center gap-2">
					{/* Previous Group */}
					{currentGroup > 1 && (
						<button
							onClick={() =>
								setCurrentPage((currentGroup - 1) * pageGroupSize)
							}
							className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-red-600 text-white transition-colors font-bold"
						>
							...
						</button>
					)}

					{Array.from(
						{ length: end - start + 1 },
						(_, i) => start + i
					).map((page) => (
						<button
							key={page}
							onClick={() => setCurrentPage(page)}
							className={`w-12 h-12 rounded-lg font-bold transition-colors ${
								currentPage === page
									? "bg-red-600 text-white"
									: "bg-zinc-900 hover:bg-red-600 text-white border border-zinc-700"
							}`}
						>
							{page}
						</button>
					))}

					{/* Next Group */}
					{currentGroup < totalGroups && (
						<button
							onClick={() =>
								setCurrentPage(currentGroup * pageGroupSize + 1)
							}
							className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-red-600 text-white transition-colors font-bold"
						>
							...
						</button>
					)}
				</div>

				{/* Page Info */}
				<div className="text-zinc-400 text-sm font-medium">
					Page {currentPage} of {effectiveTotalPages} • {initialMovies.length} total
				</div>
			</div>
		</div>
	);
}
