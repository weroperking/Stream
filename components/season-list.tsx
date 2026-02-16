"use client";

import { getImageUrl } from "@/lib/tmdb";
import type { Season } from "@/lib/tmdb";
import { ChevronDown, ChevronUp, Play, CheckCircle, Circle } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { getSeasonDetails } from "@/app/actions";
import type { Episode } from "@/lib/tmdb";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";

interface SeasonListProps {
    tvId: number;
    seasons: Season[];
}

export function SeasonList({ tvId, seasons }: SeasonListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const currentSeason = parseInt(searchParams.get("season") || "1");
    const currentEpisode = parseInt(searchParams.get("episode") || "1");

    const [expandedSeason, setExpandedSeason] = useState<number | null>(
        currentSeason
    );

    const toggleSeason = (seasonNumber: number) => {
        if (expandedSeason === seasonNumber) {
            setExpandedSeason(null);
        } else {
            setExpandedSeason(seasonNumber);
        }
    };

    const handleEpisodeClick = (season: number, episode: number) => {
        // Update URL without page reload
        const params = new URLSearchParams(searchParams.toString());
        params.set("season", season.toString());
        params.set("episode", episode.toString());
        router.push(`?${params.toString()}`, { scroll: false });
    };

    // Filter out season 0 (specials) and sort
    const sortedSeasons = [...seasons]
        .filter(s => s.season_number > 0)
        .sort((a, b) => a.season_number - b.season_number);

    if (sortedSeasons.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <h3 className="text-2xl md:text-3xl font-bold text-white">Episodes</h3>
                <Badge variant="outline" className="bg-white/10 border-white/20 text-white">
                    {sortedSeasons.length} Season{sortedSeasons.length > 1 ? 's' : ''}
                </Badge>
            </div>
            
            {/* Seasons Tabs - Horizontal */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {sortedSeasons.map((season) => (
                    <button
                        key={season.id}
                        onClick={() => toggleSeason(season.season_number)}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            expandedSeason === season.season_number
                                ? "bg-primary text-white"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                    >
                        Season {season.season_number}
                    </button>
                ))}
            </div>

            {/* Episodes List */}
            <div className="space-y-3">
                {sortedSeasons.map((season) => (
                    <div key={season.id}>
                        {expandedSeason === season.season_number && (
                            <SeasonEpisodes
                                tvId={tvId}
                                seasonNumber={season.season_number}
                                currentSeason={currentSeason}
                                currentEpisode={currentEpisode}
                                onEpisodeClick={handleEpisodeClick}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function SeasonEpisodes({
    tvId,
    seasonNumber,
    currentSeason,
    currentEpisode,
    onEpisodeClick,
}: {
    tvId: number;
    seasonNumber: number;
    currentSeason: number;
    currentEpisode: number;
    onEpisodeClick: (season: number, episode: number) => void;
}) {
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEpisodes = async () => {
            setLoading(true);
            try {
                const seasonData = await getSeasonDetails(tvId, seasonNumber);
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
    }, [tvId, seasonNumber]);

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-gray-400 mt-4">Loading episodes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {episodes.map((episode, index) => {
                const isCurrentEpisode = currentSeason === seasonNumber && currentEpisode === episode.episode_number;
                const isPastEpisode = currentSeason > seasonNumber || 
                    (currentSeason === seasonNumber && currentEpisode > episode.episode_number);
                
                return (
                    <button
                        key={episode.id}
                        onClick={() => onEpisodeClick(seasonNumber, episode.episode_number)}
                        className={`w-full flex items-start gap-4 p-3 rounded-xl transition-all group text-left ${
                            isCurrentEpisode 
                                ? "bg-primary/20 border border-primary" 
                                : isPastEpisode
                                    ? "bg-white/5 border border-white/5 hover:bg-white/10"
                                    : "bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20"
                        }`}
                    >
                        {/* Episode Number / Status */}
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                            {isCurrentEpisode ? (
                                <Play className="text-primary fill-primary" size={16} />
                            ) : isPastEpisode ? (
                                <CheckCircle className="text-green-400" size={16} />
                            ) : (
                                <span className="text-white/50 text-sm font-medium">{episode.episode_number}</span>
                            )}
                        </div>

                        {/* Thumbnail */}
                        <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 group-hover:ring-2 ring-primary transition-all">
                            <Image
                                src={getImageUrl(episode.still_path, "w300") || "/placeholder.svg"}
                                alt={episode.name}
                                fill
                                className="object-cover"
                            />
                            {/* Play overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="fill-white text-white" size={24} />
                            </div>
                            {/* Duration badge */}
                            {episode.runtime && (
                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white">
                                    {episode.runtime}m
                                </div>
                            )}
                        </div>

                        {/* Episode Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <h5 className={`font-semibold truncate ${
                                    isCurrentEpisode ? "text-primary" : "text-white"
                                }`}>
                                    {episode.episode_number}. {episode.name}
                                </h5>
                                {isCurrentEpisode && (
                                    <Badge className="bg-primary text-white text-xs flex-shrink-0">
                                        Playing Now
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-gray-400 line-clamp-2">
                                {episode.overview || "No description available."}
                            </p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
