import { CastList } from "@/components/cast-list";
import { MovieInfo } from "@/components/movie-info";
import { Navbar } from "@/components/navbar";
import { TVSeasonTabs } from "@/components/tv-season-tabs";
import { TVWatchButton } from "@/components/tv-watch-button";
import { SpeculativePreloader } from "@/components/speculative-preloader";
import {
    getImageUrl,
    getBackdropUrl,
    getTVShowCredits,
    getTVShowDetails,
} from "@/lib/tmdb";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
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

export default async function TVPage({ params, searchParams }: TVPageProps) {
    const { id } = await params;
    const { season, episode } = await searchParams;
    
    const tvId = Number(id);
    const tvShow = await getTVShowDetails(tvId);

    if (!tvShow) {
        notFound();
    }

    // Get current season and episode from URL or default to 1,1
    const currentSeason = season ? parseInt(season) : 1;
    const currentEpisode = episode ? parseInt(episode) : 1;

    const credits = await getTVShowCredits(tvId);
    const movieAdapted = mapTVToMovie(tvShow);

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
        <SpeculativePreloader movieId={tvId}>
            <div className="min-h-screen bg-background">
                <Navbar />
            
            {/* Hero Section with Backdrop */}
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

            {/* TV Details Section */}
            <div className="max-w-[1800px] mx-auto px-4 py-12 space-y-12">
                <MovieInfo movie={movieAdapted} isTv={true} />

                <TVSeasonTabs 
                    tvId={tvId} 
                    tvName={tvShow.name}
                    seasons={tvShow.seasons || []} 
                />

                <CastList cast={credits.cast} />
            </div>
        </div>
        </SpeculativePreloader>
    );
}
