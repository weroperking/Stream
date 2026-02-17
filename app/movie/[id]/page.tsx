import { CastList } from "@/components/cast-list";
import { MovieInfo } from "@/components/movie-info";
import { Navbar } from "@/components/navbar";
import { RelatedMovies } from "@/components/related-movies";
import { WatchButton } from "@/components/watch-button";
import { SpeculativePreloader } from "@/components/speculative-preloader";
import { getImageUrl, getBackdropUrl, getMovieCredits, getMovieDetails, getMoviesByGenre } from "@/lib/tmdb";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Clock, Calendar, Globe, Film, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MoviePageProps {
    params: Promise<{
        id: string;
    }>;
}

export async function generateMetadata({
    params,
}: MoviePageProps): Promise<Metadata> {
    const movieId = (await params).id;
    const movie = await getMovieDetails(Number(movieId));

    if (!movie) {
        return {
            title: "Movie Not Found",
        };
    }

    return {
        title: `${movie.title} - Watch Online | Free Streaming`,
        description: movie.overview || "Watch this movie online for free",
        openGraph: {
            title: movie.title,
            description: movie.overview || undefined,
            images: movie.poster_path
                ? [getImageUrl(movie.poster_path)]
                : undefined,
            type: "video.movie",
        },
    };
}

export default async function MoviePage({ params }: MoviePageProps) {
    const movieId = Number((await params).id);
    const movie = await getMovieDetails(movieId);

    if (!movie) {
        notFound();
    }

    // Get related movies from the first genre
    const relatedMovies =
        movie.genres.length > 0
            ? await getMoviesByGenre(movie.genres[0].id)
            : [];

    const credits = await getMovieCredits(movieId);
    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";
    const releaseDate = movie.release_date ? new Date(movie.release_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }) : "N/A";

    return (
        <SpeculativePreloader movieId={movieId}>
            <div className="min-h-screen bg-background">
                <Navbar />
                
                {/* Hero Section with Backdrop */}
                <div className="relative w-full">
                    {/* Backdrop Image */}
                    <div className="absolute inset-0 w-full h-[80vh] md:h-[85vh]">
                        <Image
                            src={getBackdropUrl(movie.backdrop_path) || "/movie-backdrop.png"}
                            alt={movie.title}
                            fill
                            className="object-cover"
                            priority
                        />
                        {/* Gradient Overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
                        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 pt-24">
                        <div className="max-w-[1800px] mx-auto px-4 md:px-8">
                            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
                                {/* Poster */}
                                <div className="hidden lg:block relative w-48 xl:w-56 flex-shrink-0 mt-8">
                                    <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                                        <Image
                                            src={getImageUrl(movie.poster_path, "w500") || "/placeholder.svg"}
                                            alt={movie.title}
                                            fill
                                            className="object-cover"
                                            priority
                                        />
                                    </div>
                                </div>

                                {/* Movie Info */}
                                <div className="flex-1 pt-8 lg:pt-16">
                                    {/* Badges */}
                                    <div className="flex items-center gap-3 flex-wrap mb-4">
                                        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 px-4 py-1.5">
                                            <Film size={14} className="mr-1" />
                                            Movie
                                        </Badge>
                                        {movie.genres.slice(0, 3).map((genre) => (
                                            <Badge 
                                                key={genre.id}
                                                variant="outline" 
                                                className="bg-white/10 border-white/20 text-white/90 px-4 py-1.5"
                                            >
                                                {genre.name}
                                            </Badge>
                                        ))}
                                    </div>

                                    {/* Title */}
                                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
                                        {movie.title}
                                    </h1>

                                    {/* Meta Info */}
                                    <div className="flex flex-wrap items-center gap-4 md:gap-6 text-white/70 mb-6">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="text-primary" size={18} />
                                            <span>{releaseDate}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="text-primary" size={18} />
                                            <span>{movie.runtime} min</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Globe className="text-primary" size={18} />
                                            <span className="uppercase">{movie.original_language}</span>
                                        </div>
                                    </div>

                                    {/* Overview */}
                                    <p className="text-white/80 text-lg md:text-xl max-w-3xl leading-relaxed mb-8">
                                        {movie.overview}
                                    </p>

                                    {/* Quick Actions - Watch Now + Download */}
                                    <WatchButton movieId={movieId} title={movie.title} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Movie Details Section */}
                <div className="max-w-[1800px] mx-auto px-4 py-12 space-y-12">
                    <MovieInfo movie={movie} />
                    <CastList cast={credits.cast} />

                    {/* Related Movies */}
                    <RelatedMovies
                        initialMovies={relatedMovies.filter(
                            (m) => m.id !== movieId
                        )}
                        genreId={movie.genres[0]?.id || 0}
                        currentMovieId={movieId}
                    />
                </div>
            </div>
        </SpeculativePreloader>
    );
}
