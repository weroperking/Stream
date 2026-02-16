"use client";

import { getImageUrl } from "@/lib/tmdb";
import type { Season, Episode } from "@/lib/tmdb";
import { Play, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { getSeasonDetails } from "@/app/actions";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface TVSeasonTabsProps {
    tvId: number;
    tvName: string;
    seasons: Season[];
}

export function TVSeasonTabs({ tvId, tvName, seasons }: TVSeasonTabsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const currentSeason = parseInt(searchParams.get("season") || "1");
    const currentEpisode = parseInt(searchParams.get("episode") || "1");

    // Filter and sort seasons
    const sortedSeasons = [...seasons]
        .filter(s => s.season_number > 0)
        .sort((a, b) => a.season_number - b.season_number);

    // State for episodes of current season
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch episodes when season changes
    useEffect(() => {
        const fetchEpisodes = async () => {
            setLoading(true);
            try {
                const seasonData = await getSeasonDetails(tvId, currentSeason);
                if (seasonData && seasonData.episodes) {
                    setEpisodes(seasonData.episodes);
                }
            } catch (error) {
                console.error("Failed to fetch episodes", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEpisodes();
    }, [tvId, currentSeason]);

    const handleSeasonChange = (seasonNumber: number) => {
        // Update URL with new season, reset to episode 1
        const params = new URLSearchParams(searchParams.toString());
        params.set("season", seasonNumber.toString());
        params.set("episode", "1");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleEpisodeClick = (episodeNumber: number) => {
        // Update URL with new episode
        const params = new URLSearchParams(searchParams.toString());
        params.set("episode", episodeNumber.toString());
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const scrollEpisodes = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Check if we can scroll
    const canScrollLeft = false; // We'll manage this with scroll event
    const canScrollRight = true;

    return (
        <div className="space-y-6">
            {/* Season Tabs - Tabbed Navigation */}
            <div className="flex items-center gap-3">
                <h3 className="text-2xl md:text-3xl font-bold text-white">Seasons</h3>
                <Badge variant="outline" className="bg-white/10 border-white/20 text-white">
                    {sortedSeasons.length} Season{sortedSeasons.length > 1 ? 's' : ''}
                </Badge>
            </div>

            {/* Season Tabs - Horizontal Scrollable */}
            <div className="relative">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {sortedSeasons.map((season) => (
                        <button
                            key={season.id}
                            onClick={() => handleSeasonChange(season.season_number)}
                            className={`flex-shrink-0 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                                currentSeason === season.season_number
                                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                                    : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/10"
                            }`}
                        >
                            <div className="flex flex-col items-center gap-1">
                                <span>Season {season.season_number}</span>
                                {season.episode_count && (
                                    <span className="text-xs opacity-60">{season.episode_count} eps</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Episodes Section - Horizontal Scrollable Row at Bottom */}
            <div className="relative">
                {/* Navigation Arrows */}
                <button
                    onClick={() => scrollEpisodes('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={() => scrollEpisodes('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                    <ChevronRight size={24} />
                </button>

                {/* Episodes Horizontal Scroll Container */}
                <div 
                    ref={scrollContainerRef}
                    className="flex gap-4 overflow-x-auto pb-4 px-12 scrollbar-hide scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {loading ? (
                        // Loading skeleton
                        Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 w-[200px] aspect-video bg-white/10 rounded-xl animate-pulse"
                            />
                        ))
                    ) : (
                        episodes.map((episode) => {
                            const isCurrentEpisode = currentSeason === currentSeason && currentEpisode === episode.episode_number;
                            
                            return (
                                <button
                                    key={episode.id}
                                    onClick={() => handleEpisodeClick(episode.episode_number)}
                                    className={`flex-shrink-0 w-[200px] group text-left transition-all hover:scale-105`}
                                >
                                    {/* Episode Thumbnail */}
                                    <div className={`relative aspect-video rounded-xl overflow-hidden mb-2 ${
                                        isCurrentEpisode 
                                            ? "ring-2 ring-primary shadow-lg shadow-primary/30" 
                                            : "ring-1 ring-white/10"
                                    }`}>
                                        <Image
                                            src={getImageUrl(episode.still_path, "w300") || "/placeholder.svg"}
                                            alt={episode.name}
                                            fill
                                            className="object-cover"
                                            sizes="200px"
                                        />
                                        
                                        {/* Play overlay */}
                                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                                            isCurrentEpisode ? "bg-black/30" : "bg-black/40 opacity-0 group-hover:opacity-100"
                                        }`}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                isCurrentEpisode ? "bg-primary" : "bg-white/80"
                                            }`}>
                                                <Play className={`fill-current ${isCurrentEpisode ? "text-white" : "text-black"}`} size={20} />
                                            </div>
                                        </div>

                                        {/* Episode number badge */}
                                        <div className="absolute top-2 left-2">
                                            <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs font-medium text-white">
                                                E{episode.episode_number}
                                            </span>
                                        </div>

                                        {/* Duration badge */}
                                        {episode.runtime && (
                                            <div className="absolute bottom-2 right-2">
                                                <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs font-medium text-white">
                                                    {episode.runtime}m
                                                </span>
                                            </div>
                                        )}

                                        {/* Currently playing indicator */}
                                        {isCurrentEpisode && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="px-3 py-1.5 bg-primary rounded-full text-xs font-bold text-white flex items-center gap-1.5">
                                                    <Play size={12} className="fill-white" />
                                                    PLAYING
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Episode Info */}
                                    <div className="space-y-1">
                                        <h4 className={`font-semibold text-sm truncate ${
                                            isCurrentEpisode ? "text-primary" : "text-white"
                                        }`}>
                                            {episode.episode_number}. {episode.name}
                                        </h4>
                                        <p className="text-xs text-white/50 line-clamp-2">
                                            {episode.overview || "No description available."}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
