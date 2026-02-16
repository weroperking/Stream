import { HeroSection } from "@/components/hero-section";
import { HorizontalMovieRow } from "@/components/horizontal-movie-row";
import { Navbar } from "@/components/navbar";
import { TermsModal } from "@/components/terms-modal";
import {
	getLatestMovies,
	getPopularMovies,
	getTrendingMovies,
	getTopRatedMovies,
	getUpcomingMovies,
} from "@/lib/tmdb";

export default async function Home() {
	const [trendingMovies, popularMovies, latestMovies, topRatedMovies, upcomingMovies] = await Promise.all([
		getTrendingMovies("week"),
		getPopularMovies(),
		getLatestMovies(),
		getTopRatedMovies(),
		getUpcomingMovies(),
	]);

	return (
		<>
			<Navbar />
			<TermsModal />

			<main className="bg-black min-h-screen">
				{/* Hero Section with Featured Movie */}
				{trendingMovies.length > 0 && (
					<HeroSection movies={trendingMovies.slice(0, 10)} />
				)}

				{/* Horizontal Scrollable Movie Rows */}
				<div className="space-y-8 md:space-y-12 py-8 md:py-12">
					<HorizontalMovieRow
						title="Trending This Week"
						movies={trendingMovies.slice(0, 20)}
					/>
					<HorizontalMovieRow
						title="Popular on Stream"
						movies={popularMovies.slice(0, 20)}
					/>
					<HorizontalMovieRow
						title="New Releases"
						movies={latestMovies.slice(0, 20)}
					/>
					<HorizontalMovieRow
						title="Top Rated"
						movies={topRatedMovies.slice(0, 20)}
					/>
					<HorizontalMovieRow
						title="Coming Soon"
						movies={upcomingMovies.slice(0, 20)}
					/>
				</div>
			</main>
		</>
	);
}
