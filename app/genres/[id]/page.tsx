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

export default async function GenreMoviesPage({ params }: GenrePageProps) {
	const genreId = Number((await params).id);
	const genres = await getGenres();
	const currentGenre = genres.find((g) => g.id === genreId);

	if (!currentGenre) {
		notFound();
	}

	const movies = await getAllMoviesByGenre(genreId, 10); // Fetch up to 10 pages (200 movies)

	return (
		<>
			<Navbar />
			<main className="bg-black min-h-screen">
				{/* Hero-style Genre Header */}
				<div className="relative">
					<div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black pointer-events-none" />
					<div className="max-w-7xl mx-auto px-4 md:px-12 pt-32 pb-8 relative z-10">
						{/* Genre Header */}
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

				{/* Movies Grid */}
				<div className="max-w-7xl mx-auto px-4 md:px-12 pb-16">
					{movies.length > 0 ? (
						<PaginatedMovieGrid
							initialMovies={movies}
							title={`${currentGenre.name} Movies`}
							showAllPages={true}
						/>
					) : (
						<p className="text-muted-foreground text-center py-16">
							No movies found in this genre.
						</p>
					)}
				</div>
			</main>
		</>
	);
}
