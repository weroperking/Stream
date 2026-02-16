import { HorizontalMovieRow } from "@/components/horizontal-movie-row";
import { Navbar } from "@/components/navbar";
import { TermsModal } from "@/components/terms-modal";
import {
    getPopularTVShows,
    getTrendingTVShows,
} from "@/lib/tmdb";

function mapTVToMovie(tv: any): any {
    return {
        ...tv,
        title: tv.name,
        release_date: tv.first_air_date,
    };
}

export const metadata = {
    title: "TV Shows - Free Streaming",
    description: "Browse popular and trending TV shows.",
};

export default async function TVShowsPage() {
    const [trendingTV, popularTV] = await Promise.all([
        getTrendingTVShows("week"),
        getPopularTVShows(),
    ]);

    const trendingMapped = trendingTV.map(mapTVToMovie);
    const popularMapped = popularTV.map(mapTVToMovie);

    return (
        <>
            <Navbar />
            <TermsModal />
            <main className="bg-black min-h-screen">
                <div className="pt-20 pb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-white px-4 md:px-12 mb-8 font-display-title">
                        TV Shows
                    </h1>

                    {/* Horizontal Scrollable TV Show Rows */}
                    <div className="space-y-8 md:space-y-12">
                        <HorizontalMovieRow
                            title="Trending TV Shows"
                            movies={trendingMapped.slice(0, 20)}
                        />
                        <HorizontalMovieRow
                            title="Popular TV Shows"
                            movies={popularMapped.slice(0, 20)}
                        />
                        <HorizontalMovieRow
                            title="Top Rated Series"
                            movies={trendingMapped.slice(10, 30)}
                        />
                        <HorizontalMovieRow
                            title="Binge-Worthy Shows"
                            movies={popularMapped.slice(10, 30)}
                        />
                    </div>
                </div>
            </main>
        </>
    );
}
