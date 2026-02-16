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

export const metadata = {
    title: "Movies - Free Streaming",
    description: "Browse popular and trending movies.",
};

export default async function MoviesPage() {
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
                <div className="pt-20 pb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-white px-4 md:px-12 mb-8 font-display-title">
                        Movies
                    </h1>

                    {/* Horizontal Scrollable Movie Rows */}
                    <div className="space-y-8 md:space-y-12">
                        <HorizontalMovieRow
                            title="Trending This Week"
                            movies={trendingMovies.slice(0, 20)}
                        />
                        <HorizontalMovieRow
                            title="Popular Movies"
                            movies={popularMovies.slice(0, 20)}
                        />
                        <HorizontalMovieRow
                            title="Now Playing"
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
                </div>
            </main>
        </>
    );
}
