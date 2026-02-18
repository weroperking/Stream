import { CastList } from "@/components/cast-list";
import { MovieInfo } from "@/components/movie-info";
import { Navbar } from "@/components/navbar";
import { RelatedMovies } from "@/components/related-movies";
import { WatchButton } from "@/components/watch-button";
import { SpeculativePreloader } from "@/components/speculative-preloader";
import { getImageUrl, getBackdropUrl, getMovieCredits, getMovieDetails, getSimilarMovies, getMoviesByGenre } from "@/lib/tmdb";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Clock, Calendar, Globe, Film } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";

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

// ===========================================
// Skeleton Components (Inline Fallbacks)
// ===========================================

function MovieHeroSkeleton() {
    return (
        <div className="relative w-full">
            <div className="absolute inset-0 w-full h-[80vh] md:h-[85vh] bg-gray-800 animate-pulse" />
            <div className="relative z-10 pt-24">
                <div className="max-w-[1800px] mx-auto px-4 md:px-8">
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
                        <div className="hidden lg:block w-48 xl:w-56 flex-shrink-0 mt-8">
                            <div className="aspect-[2/3] rounded-2xl bg-gray-700 animate-pulse" />
                        </div>
                        <div className="flex-1 pt-8 lg:pt-16">
                            <div className="h-6 w-24 bg-gray-700 rounded mb-4 animate-pulse" />
                            <div className="h-12 w-3/4 bg-gray-700 rounded mb-4 animate-pulse" />
                            <div className="flex gap-4 mb-6">
                                <div className="h-6 w-32 bg-gray-700 rounded animate-pulse" />
                                <div className="h-6 w-24 bg-gray-700 rounded animate-pulse" />
                            </div>
                            <div className="h-8 w-full max-w-2xl bg-gray-700 rounded mb-8 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MovieInfoSkeleton() {
    return (
        <div className="space-y-4">
            <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-700 rounded animate-pulse" />
        </div>
    );
}

function CastSkeleton() {
    return (
        <div className="space-y-4">
            <div className="h-8 w-32 bg-gray-700 rounded animate-pulse" />
            <div className="flex gap-4 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-24 space-y-2">
                        <div className="w-24 h-24 rounded-full bg-gray-700 animate-pulse" />
                        <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-gray-700 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function SimilarMoviesSkeleton() {
    return (
        <div className="space-y-4">
            <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="aspect-[2/3] bg-gray-700 rounded-lg animate-pulse" />
                        <div className="h-4 w-full bg-gray-700 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ===========================================
// Async Server Components for Suspense
// ===========================================

async function MovieHero({ id }: { id: number }) {
    try {
        const movie = await getMovieDetails(id);
        if (!movie) {
            return <div className="text-white">Could not load movie info.</div>;
        }

        const releaseDate = movie.release_date ? new Date(movie.release_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        }) : "N/A";

        return (
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
                                <WatchButton movieId={id} title={movie.title} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error("Error loading movie hero:", error);
        return <div className="text-white">Could not load movie info.</div>;
    }
}

async function MovieDetailsSection({ id }: { id: number }) {
    try {
        const movie = await getMovieDetails(id);
        if (!movie) return null;
        return <MovieInfo movie={movie} />;
    } catch (error) {
        console.error("Error loading movie details:", error);
        return null;
    }
}

async function MovieCastSection({ id }: { id: number }) {
    try {
        const credits = await getMovieCredits(id);
        if (!credits) return null;
        return <CastList cast={credits.cast} />;
    } catch (error) {
        console.error("Error loading movie cast:", error);
        return null;
    }
}

async function SimilarMoviesSection({ id }: { id: number }) {
    try {
        const movie = await getMovieDetails(id);
        if (!movie) return null;

        const relatedMovies =
            movie.genres.length > 0
                ? await getMoviesByGenre(movie.genres[0].id)
                : [];

        return (
            <RelatedMovies
                initialMovies={relatedMovies.filter((m) => m.id !== id)}
                genreId={movie.genres[0]?.id || 0}
                currentMovieId={id}
            />
        );
    } catch (error) {
        console.error("Error loading similar movies:", error);
        return null;
    }
}

// ===========================================
// Main Page Component with Suspense
// ===========================================

export default async function MoviePage({ params }: MoviePageProps) {
    const movieId = Number((await params).id);
    
    // Verify movie exists for 404
    const movie = await getMovieDetails(movieId);
    if (!movie) {
        notFound();
    }

    return (
        <SpeculativePreloader movieId={movieId}>
            <div className="min-h-screen bg-background">
                <Navbar />
                
                {/* Hero Section - Suspense wrapped */}
                <Suspense fallback={<MovieHeroSkeleton />}>
                    <MovieHero id={movieId} />
                </Suspense>

                {/* Movie Details Section */}
                <div className="max-w-[1800px] mx-auto px-4 py-12 space-y-12">
                    <Suspense fallback={<MovieInfoSkeleton />}>
                        <MovieDetailsSection id={movieId} />
                    </Suspense>

                    <Suspense fallback={<CastSkeleton />}>
                        <MovieCastSection id={movieId} />
                    </Suspense>

                    <Suspense fallback={<SimilarMoviesSkeleton />}>
                        <SimilarMoviesSection id={movieId} />
                    </Suspense>
                </div>
            </div>
        </SpeculativePreloader>
    );
}
