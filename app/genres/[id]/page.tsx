import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { PaginatedMovieGrid } from "@/components/paginated-movie-grid";
import { getAllMoviesByGenre, getGenres } from "@/lib/tmdb";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface GenrePageProps {
	params: Promise<{
		id: string;
	}>;
}

export async function generateMetadata({
	params,
}: GenrePageProps): Promise<Metadata> {
	const genreId = Number((await params).id);
	const genres = await getGenres();
	const genre = genres.find((g) => g.id === genreId);

	if (!genre) {
		return {
			title: "Genre Not Found",
		};
	}

	return {
		title: `${genre.name} Movies - Free Streaming`,
		description: `Browse all ${genre.name} movies available on Free Streaming`,
	};
}

// ===========================================
// Skeleton Components (Inline Fallbacks)
// ===========================================

function GenreHeaderSkeleton() {
	return (
		<div className="relative">
			<div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black pointer-events-none" />
			<div className="max-w-7xl mx-auto px-4 md:px-12 pt-32 pb-8 relative z-10">
				<div className="mb-8">
					<div className="h-12 w-48 bg-gray-700 rounded animate-pulse mb-3" />
					<div className="h-6 w-64 bg-gray-800 rounded animate-pulse" />
				</div>
			</div>
		</div>
	);
}

function MoviesGridSkeleton() {
	return (
		<div className="max-w-7xl mx-auto px-4 md:px-12 pb-16">
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
				{[...Array(10)].map((_, i) => (
					<div key={i} className="space-y-2">
						<div className="aspect-[2/3] rounded-lg bg-gray-800 animate-pulse" />
						<div className="h-4 w-full bg-gray-800 rounded animate-pulse" />
						<div className="h-3 w-2/3 bg-gray-800 rounded animate-pulse" />
					</div>
				))}
			</div>
		</div>
	);
}

// ===========================================
// Async Data Components
// ===========================================

async function GenreHeaderComponent({ genreId }: { genreId: number }) {
	const genres = await getGenres();
	const currentGenre = genres.find((g) => g.id === genreId);

	if (!currentGenre) {
		notFound();
	}

	return (
		<div className="relative">
			<div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black pointer-events-none" />
			<div className="max-w-7xl mx-auto px-4 md:px-12 pt-32 pb-8 relative z-10">
				<div className="mb-8">
					<h1 className="text-4xl md:text-5xl font-bold text-white mb-3 font-display-title">
						{currentGenre.name}
					</h1>
					<p className="text-gray-400 text-lg">
						Browse all {currentGenre.name} movies available for streaming
					</p>
				</div>
			</div>
		</div>
	);
}

async function MoviesGridComponent({ genreId }: { genreId: number }) {
	const movies = await getAllMoviesByGenre(genreId, 10); // Fetch up to 10 pages (200 movies)

	if (!movies || movies.length === 0) {
		return (
			<div className="max-w-7xl mx-auto px-4 md:px-12 pb-16">
				<p className="text-muted-foreground text-center py-16">
					No movies found in this genre.
				</p>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 md:px-12 pb-16">
			<PaginatedMovieGrid
				initialMovies={movies}
				title={`${(await getGenres()).find(g => g.id === genreId)?.name || 'Movies'}`}
				showAllPages={true}
			/>
		</div>
	);
}

// ===========================================
// Main Page Component
// ===========================================

export default async function GenreMoviesPage({ params }: GenrePageProps) {
	const genreId = Number((await params).id);

	return (
		<>
			<Navbar />
			<main className="bg-black min-h-screen">
				{/* Genre Header */}
				<Suspense fallback={<GenreHeaderSkeleton />}>
					<GenreHeaderComponent genreId={genreId} />
				</Suspense>

				{/* Movies Grid - Streams independently */}
				<Suspense fallback={<MoviesGridSkeleton />}>
					<MoviesGridComponent genreId={genreId} />
				</Suspense>
			</main>
		</>
	);
}
