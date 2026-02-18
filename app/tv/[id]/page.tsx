import { CastList } from "@/components/cast-list";
import { MovieInfo } from "@/components/movie-info";
import { Navbar } from "@/components/navbar";
import { TVSeasonTabs } from "@/components/tv-season-tabs";
import { TVWatchButton } from "@/components/tv-watch-button";
import { SpeculativePreloader } from "@/components/speculative-preloader";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getImageUrl,
    getBackdropUrl,
    getTVShowDetails,
    getTVShowCredits,
} from "@/lib/tmdb";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";
import { Clock, Calendar, Globe, Tv, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Map TVShowDetails to Movie for MovieInfo to work
function mapTVToMovie(tv: any): any {
    return {
        ...tv,
        title: tv.name,
        release_date: tv.first_air_date,
        runtime: tv.episode_run_time?.[0] || 0,
    };
}

interface TVPageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        season?: string;
        episode?: string;
    }>;
}

export async function generateMetadata({
    params,
}: TVPageProps): Promise<Metadata> {
    const tvId = (await params).id;
    const tvShow = await getTVShowDetails(Number(tvId));

    if (!tvShow) {
        return {
            title: "TV Show Not Found",
        };
    }

    return {
        title: `${tvShow.name} - Watch Online | Free Streaming`,
        description: tvShow.overview || "Watch this TV show online for free",
        openGraph: {
            title: tvShow.name,
            description: tvShow.overview || undefined,
            images: tvShow.poster_path
                ? [getImageUrl(tvShow.poster_path)]
                : undefined,
            type: "video.tv_show",
        },
    };
}

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

function TVHeroSkeleton() {
    return (
        <div className="relative w-full">
            {/* Backdrop Skeleton */}
            <div className="absolute inset-0 w-full h-[80vh] md:h-[85vh] bg-muted animate-pulse" />

            {/* Content Skeleton */}
            <div className="relative z-10 pt-24">
                <div className="max-w-[1800px] mx-auto px-4 md:px-8">
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
                        {/* Poster Skeleton */}
                        <div className="hidden lg:block relative w-48 xl:w-56 flex-shrink-0 mt-8">
                            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden">
                                <Skeleton className="w-full h-full" />
                            </div>
                        </div>

                        {/* TV Show Info Skeleton */}
                        <div className="flex-1 pt-8 lg:pt-16">
                            {/* Badges Skeleton */}
                            <div className="flex items-center gap-3 flex-wrap mb-4">
                                <Skeleton className="h-7 w-24" />
                                <Skeleton className="h-7 w-20" />
                                <Skeleton className="h-7 w-24" />
                            </div>

                            {/* Title Skeleton */}
                            <Skeleton className="h-12 w-3/4 mb-4" />

                            {/* Episode Badge Skeleton */}
                            <Skeleton className="h-6 w-20 mb-4" />

                            {/* Meta Info Skeleton */}
                            <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-6">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-28" />
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-5 w-16" />
                            </div>

                            {/* Overview Skeleton */}
                            <Skeleton className="h-6 w-full mb-2" />
                            <Skeleton className="h-6 w-5/6 mb-2" />
                            <Skeleton className="h-6 w-4/6 mb-8" />

                            {/* Watch Button Skeleton */}
                            <Skeleton className="h-12 w-40" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SeasonsSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-24" />
                ))}
            </div>
        </div>
    );
}

function CastSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex-shrink-0">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <Skeleton className="h-4 w-20 mt-2" />
                        <Skeleton className="h-3 w-16 mt-1" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// ASYNC SERVER COMPONENTS (EACH WITH ITS OWN SUSPENSE)
// ============================================================================

async function TVHero({ id, currentSeason, currentEpisode }: { 
    id: string; 
    currentSeason: number;
    currentEpisode: number;
}) {
    try {
        const tvId = Number(id);
        const tvShow = await getTVShowDetails(tvId);

        if (!tvShow) {
            return (
                <div className="relative w-full">
                    <div className="absolute inset-0 w-full h-[80vh] md:h-[85vh] bg-muted" />
                    <div className="relative z-10 pt-24">
                        <div className="max-w-[1800px] mx-auto px-4 md:px-8">
                            <p className="text-white">Could not load TV show info.</p>
                        </div>
                    </div>
                </div>
            );
        }

        // Type assertion for additional TV properties
        const tv = tvShow as any;

        // Get production details
        const firstAirYear = tv.first_air_date 
            ? new Date(tv.first_air_date).getFullYear() 
            : "N/A";
        const lastAirYear = tv.last_air_date 
            ? new Date(tv.last_air_date).getFullYear() 
            : "N/A";
        const yearRange = firstAirYear === lastAirYear 
            ? firstAirYear 
            : `${firstAirYear} - ${lastAirYear}`;

        const releaseDate = tv.first_air_date 
            ? new Date(tv.first_air_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }) : "N/A";

        const totalEpisodes = tv.seasons?.reduce((acc: number, season: any) => {
            return acc + (season.episode_count || 0);
        }, 0) || 0;

        return (
            <div className="relative w-full">
                {/* Backdrop Image */}
                <div className="absolute inset-0 w-full h-[80vh] md:h-[85vh]">
                    <Image
                        src={getBackdropUrl(tvShow.backdrop_path) || "/movie-backdrop.png"}
                        alt={tvShow.name}
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
                                        src={getImageUrl(tvShow.poster_path, "w500") || "/placeholder.svg"}
                                        alt={tvShow.name}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                            </div>

                            {/* TV Show Info */}
                            <div className="flex-1 pt-8 lg:pt-16">
                                {/* Badges */}
                                <div className="flex items-center gap-3 flex-wrap mb-4">
                                    <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30 px-4 py-1.5">
                                        <Tv size={14} className="mr-1" />
                                        TV Series
                                    </Badge>
                                    {tv.in_production && (
                                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-1.5">
                                            On Air
                                        </Badge>
                                    )}
                                    {tvShow.genres?.slice(0, 3).map((genre: any) => (
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
                                    {tvShow.name}
                                </h1>

                                {/* Current Episode Badge */}
                                <div className="flex items-center gap-2 mb-4">
                                    <Badge className="bg-primary text-white">
                                        S{currentSeason} E{currentEpisode}
                                    </Badge>
                                </div>

                                {/* Meta Info */}
                                <div className="flex flex-wrap items-center gap-4 md:gap-6 text-white/70 mb-6">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="text-accent" size={18} />
                                        <span>{releaseDate}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="text-accent" size={18} />
                                        <span>{totalEpisodes} Episodes</span>
                                    </div>
                                    {tv.number_of_seasons && (
                                        <div className="flex items-center gap-2">
                                            <Tv className="text-accent" size={18} />
                                            <span>{tv.number_of_seasons} Seasons</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Globe className="text-accent" size={18} />
                                        <span className="uppercase">{tvShow.original_language}</span>
                                    </div>
                                </div>

                                {/* Overview */}
                                <p className="text-white/80 text-lg md:text-xl max-w-3xl leading-relaxed mb-8">
                                    {tvShow.overview}
                                </p>

                                {/* Quick Actions - Watch Now */}
                                <TVWatchButton 
                                    tvId={tvId} 
                                    season={currentSeason} 
                                    episode={currentEpisode}
                                    title={tvShow.name}
                                />

                                {/* Status Row */}
                                <div className="flex flex-wrap items-center gap-4 mb-8 mt-6">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm">
                                        <Activity className="text-white/70" size={18} />
                                        <span className="text-white">{tvShow.status}</span>
                                    </div>
                                </div>

                                {/* Tagline */}
                                {tv.tagline && (
                                    <div className="mt-8 pt-6 border-t border-white/10">
                                        <blockquote className="text-xl italic text-gray-400">
                                            "{tv.tagline}"
                                        </blockquote>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error("Error loading TV hero:", error);
        return null;
    }
}

async function TVDetails({ id }: { id: string }) {
    try {
        const tvId = Number(id);
        const tvShow = await getTVShowDetails(tvId);

        if (!tvShow) {
            return null;
        }

        const movieAdapted = mapTVToMovie(tvShow);

        return (
            <MovieInfo movie={movieAdapted} isTv={true} />
        );
    } catch (error) {
        console.error("Error loading TV details:", error);
        return null;
    }
}

async function TVSeasons({ id, tvName }: { id: string; tvName?: string }) {
    try {
        const tvId = Number(id);
        const tvShow = await getTVShowDetails(tvId);

        if (!tvShow) {
            return null;
        }

        const seasons = tvShow.seasons || [];
        const name = tvName || tvShow.name;

        if (seasons.length === 0) {
            return null;
        }

        return (
            <TVSeasonTabs 
                tvId={tvId} 
                tvName={name}
                seasons={seasons} 
            />
        );
    } catch (error) {
        console.error("Error loading TV seasons:", error);
        return null;
    }
}

async function TVCast({ id }: { id: string }) {
    try {
        const tvId = Number(id);
        const credits = await getTVShowCredits(tvId);

        if (!credits || !credits.cast) {
            return null;
        }

        return (
            <CastList cast={credits.cast} />
        );
    } catch (error) {
        console.error("Error loading TV cast:", error);
        return null;
    }
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default async function TVPage({ params, searchParams }: TVPageProps) {
    const { id } = await params;
    const { season, episode } = await searchParams;

    // Get current season and episode from URL or default to 1,1
    const currentSeason = season ? parseInt(season) : 1;
    const currentEpisode = episode ? parseInt(episode) : 1;

    // TV show name for seasons component - will be fetched in TVHero first
    // This is a fallback name that will be replaced once TVHero loads
    const tvShowName = "TV Show";

    return (
        <SpeculativePreloader movieId={Number(id)}>
            <div className="min-h-screen bg-background">
                <Navbar />
            
                {/* Hero Section with Suspense */}
                <Suspense fallback={<TVHeroSkeleton />}>
                    <TVHero 
                        id={id} 
                        currentSeason={currentSeason}
                        currentEpisode={currentEpisode}
                    />
                </Suspense>

                {/* TV Details Section with Suspense */}
                <div className="max-w-[1800px] mx-auto px-4 py-12 space-y-12">
                    <Suspense fallback={
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    }>
                        <TVDetails id={id} />
                    </Suspense>

                    {/* Seasons with Suspense */}
                    <Suspense fallback={<SeasonsSkeleton />}>
                        <TVSeasons id={id} />
                    </Suspense>

                    {/* Cast with Suspense */}
                    <Suspense fallback={<CastSkeleton />}>
                        <TVCast id={id} />
                    </Suspense>
                </div>
            </div>
        </SpeculativePreloader>
    );
}
