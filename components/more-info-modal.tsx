"use client";

import { getSeasonDetails, getTVShowDetails } from "@/app/actions";
import { getImageUrl, getVidSrcUrl, type Movie, type Season, type Episode, type TVShowDetails } from "@/lib/tmdb";
import { X, Play, ChevronDown, Check, Plus, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useWatchlist } from "@/hooks/use-watchlist";

interface MoreInfoModalProps {
    movie: Movie;
    isOpen: boolean;
    onClose: () => void;
}

export function MoreInfoModal({ movie, isOpen, onClose }: MoreInfoModalProps) {
    const [tvDetails, setTvDetails] = useState<TVShowDetails | null>(null);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [selectedSeason, setSelectedSeason] = useState<number>(1);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);
    const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    const { 
        isSaved, 
        toggleSave, 
        isPending, 
        hasActiveProfile,
        loading: watchlistLoading 
    } = useWatchlist();

    const isTV = "name" in movie || !!(movie as any).first_air_date;
    const mediaType = isTV ? "tv" : "movie";

    // Fetch TV details (seasons) if it's a TV show
    useEffect(() => {
        if (isOpen && isTV) {
            const fetchDetails = async () => {
                try {
                    const data = await getTVShowDetails(movie.id);
                    if (data) {
                        setTvDetails(data);
                        setSeasons(data.seasons || []);
                        // Auto-select first season
                        if (data.seasons && data.seasons.length > 0) {
                            setSelectedSeason(data.seasons[0].season_number);
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch TV details", error);
                }
            };
            fetchDetails();
        }
    }, [isOpen, isTV, movie.id]);

    // Fetch episodes when selected season changes
    useEffect(() => {
        if (isOpen && isTV && selectedSeason) {
            const fetchEpisodes = async () => {
                setLoadingEpisodes(true);
                try {
                    const data = await getSeasonDetails(movie.id, selectedSeason);
                    if (data && data.episodes) {
                        setEpisodes(data.episodes);
                    }
                } catch (error) {
                    console.error("Failed to fetch episodes", error);
                } finally {
                    setLoadingEpisodes(false);
                }
            };
            fetchEpisodes();
        }
    }, [isOpen, isTV, movie.id, selectedSeason]);

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    // Close on click outside
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    }

    // Handle watchlist toggle
    const handleWatchlistToggle = async () => {
        if (!hasActiveProfile) {
            return;
        }

        const title = isTV ? (movie as any).name : movie.title;
        
        await toggleSave({
            id: movie.id,
            title,
            poster_path: movie.poster_path,
            mediaType,
        });
    };

    if (!isOpen) return null;

    const releaseDate = isTV ? (movie as any).first_air_date : movie.release_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : "N/A";
    const title = isTV ? (movie as any).name : movie.title;
    // For play button: default to the first episode if TV, or movie player
    const playLinkHref = isTV
        ? getVidSrcUrl(movie.id, "tv", selectedSeason, episodes.length > 0 ? episodes[0].episode_number : 1)
        : getVidSrcUrl(movie.id, "movie");

    const isInWatchlist = isSaved(movie.id, mediaType);
    const isWatchlistPending = isPending(movie.id, mediaType);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="relative w-full max-w-5xl bg-[#141414] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 ring-1 ring-white/10"
                style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-[#181818] text-white hover:bg-[#333] transition-colors border border-white/10">
                    <X size={24} />
                </button>

                {/* Header / Backdrop */}
                <div className="relative aspect-video w-full shrink-0 max-h-[50vh]">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent z-10" />
                    <Image
                        src={getImageUrl(movie.backdrop_path || movie.poster_path, "original")}
                        alt={title}
                        fill
                        className="object-cover"
                    />
                    <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                        <h2 className="text-4xl md:text-6xl font-black text-white mb-6 drop-shadow-2xl">
                            {title}
                        </h2>
                        <div className="flex items-center gap-4">
                            <Link
                                href={isTV ? `/watch/tv/${movie.id}?season=1&episode=1` : `/watch/movie/${movie.id}`}
                                className="flex items-center gap-3 px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-white/90 transition-all transform hover:scale-105 shadow-xl">
                                <Play fill="black" size={28} />
                                <span className="text-xl">Play</span>
                            </Link>

                            <button
                                onClick={handleWatchlistToggle}
                                disabled={!hasActiveProfile || isWatchlistPending || watchlistLoading}
                                className={`flex items-center gap-3 px-6 py-3 rounded-lg font-bold border-2 transition-all transform hover:scale-105 ${
                                    !hasActiveProfile
                                        ? "bg-gray-700/50 border-gray-600 text-gray-400 cursor-not-allowed"
                                        : isInWatchlist
                                            ? "bg-green-500/20 border-green-500 text-green-500"
                                            : "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white"
                                }`}
                                title={!hasActiveProfile ? "Select a profile to add to your list" : isInWatchlist ? "Remove from My List" : "Add to My List"}
                            >
                                {isWatchlistPending ? (
                                    <>
                                        <Loader2 size={24} className="animate-spin" />
                                        <span className="text-lg">Updating...</span>
                                    </>
                                ) : isInWatchlist ? (
                                    <>
                                        <Check size={24} />
                                        <span className="text-lg">Saved</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus size={24} />
                                        <span className="text-lg">My List</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#141414]">
                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-sm md:text-base">
                        <span className="text-green-500 font-bold text-lg">98% Match</span>
                        <span className="text-gray-300">{year}</span>
                        <span className="border border-gray-500 px-1.5 py-0.5 text-xs rounded text-gray-300">HD</span>
                        {isTV && tvDetails && (
                            <span className="text-gray-300">{tvDetails.number_of_seasons} Seasons</span>
                        )}
                        <div className="flex items-center gap-2 text-gray-300 border-l border-gray-600 pl-4">
                            <span className="text-gray-500">Genres:</span>
                            <span className="text-white">Action, Adventure, Sci-Fi</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                            <span className="text-gray-500">Language:</span>
                            <span className="text-white uppercase">{movie.original_language || "EN"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-300 border-l border-gray-600 pl-4">
                            <span className="text-yellow-500">★</span>
                            <span className="text-white">{movie.vote_average?.toFixed(1)}</span>
                        </div>
                    </div>

                    {/* Overview */}
                    <div className="max-w-4xl">
                        <p className="text-white text-lg leading-relaxed text-gray-200">
                            {movie.overview}
                        </p>
                    </div>

                    {/* TV Episodes Section */}
                    {isTV && (
                        <div className="mt-10">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-white">Episodes</h3>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                                        className="flex items-center gap-3 bg-[#242424] px-6 py-3 rounded-lg text-white font-bold border border-gray-700 min-w-[180px] justify-between hover:bg-[#333] transition-colors"
                                    >
                                        <span className="text-lg">
                                            {seasons.find(s => s.season_number === selectedSeason)?.name || `Season ${selectedSeason}`}
                                        </span>
                                        <ChevronDown size={20} className={`transition-transform duration-300 ${isSeasonDropdownOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    {isSeasonDropdownOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-full min-w-[180px] bg-[#242424] border border-gray-700 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                            {seasons.map(season => (
                                                <button
                                                    key={season.id}
                                                    onClick={() => {
                                                        setSelectedSeason(season.season_number);
                                                        setIsSeasonDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-6 py-3 text-base hover:bg-gray-700 transition-colors ${selectedSeason === season.season_number ? "text-primary font-bold bg-white/5" : "text-white"}`}
                                                >
                                                    {season.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {loadingEpisodes ? (
                                    <div className="flex justify-center py-20">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                                    </div>
                                ) : (
                                    episodes.map((episode) => (
                                        <Link
                                            key={episode.id}
                                            href={getVidSrcUrl(movie.id, "tv", selectedSeason, episode.episode_number)}
                                            className="group flex flex-col md:flex-row gap-6 p-6 rounded-xl hover:bg-[#202020] transition-colors border border-transparent hover:border-white/5"
                                        >
                                            <div className="flex items-start gap-6 shrink-0">
                                                <span className="text-2xl font-bold text-gray-500 w-8 pt-8">{episode.episode_number}</span>
                                                <div className="relative w-48 aspect-video rounded-lg overflow-hidden bg-gray-800 shrink-0 shadow-lg group-hover:shadow-xl transition-all">
                                                    <Image
                                                        src={getImageUrl(episode.still_path, "w300")}
                                                        alt={episode.name}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                                            <Play className="fill-white text-white ml-1" size={20} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0 py-2 space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{episode.name}</h4>
                                                    <span className="text-sm font-medium text-gray-400 shrink-0 ml-4">{episode.runtime}m</span>
                                                </div>
                                                <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 group-hover:text-gray-300 transition-colors">
                                                    {episode.overview || "No description available for this episode."}
                                                </p>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
