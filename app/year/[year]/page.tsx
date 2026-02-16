import { Navbar } from "@/components/navbar";
import { PaginatedMovieGrid } from "@/components/paginated-movie-grid";
import { getAllMoviesByYear } from "@/lib/tmdb";
import type { Metadata } from "next";

interface YearPageProps {
	params: Promise<{
		year: string;
	}>;
}

export async function generateMetadata({
	params,
}: YearPageProps): Promise<Metadata> {
	const year = (await params).year;
	return {
		title: `Movies from ${year} - Free Streaming`,
		description: `Watch popular movies released in ${year}.`,
	};
}

export default async function YearPage({ params }: YearPageProps) {
	const year = Number((await params).year);
	const movies = await getAllMoviesByYear(year, 10); // Fetch up to 10 pages (200 movies)

	return (
		<>
			<Navbar />
			<main className="bg-black min-h-screen pt-24">
				<div className="space-y-6 px-4 py-8 max-w-7xl mx-auto">
					<h1 className="text-4xl font-bold text-foreground mb-8 font-display-title">
						Movies from {year}
					</h1>

					{movies.length > 0 ? (
						<PaginatedMovieGrid
							initialMovies={movies}
							title={`Movies from ${year}`}
							showAllPages={true}
						/>
					) : (
						<p className="text-muted-foreground">
							No movies found for this year.
						</p>
					)}
				</div>
			</main>
		</>
	);
}
