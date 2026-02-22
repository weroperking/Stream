"use client";

import { PlayCircle, Download, Zap, Loader2, CheckCircle2, Plus, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    getCachedProbingResults,
    type CachedProbingResults,
} from "@/lib/providers";
import { useWatchlist } from "@/hooks/use-watchlist";

interface WatchButtonProps {
    movieId: number;
    title: string;
    posterPath?: string | null;
    mediaType?: "movie" | "tv";
    showDownload?: boolean;
    showWatchlist?: boolean;
}

export function WatchButton({ 
    movieId, 
    title, 
    posterPath,
    mediaType = "movie",
    showDownload = true,
    showWatchlist = true 
}: WatchButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [probingResults, setProbingResults] = useState<CachedProbingResults | null>(null);
    const [isCheckingCache, setIsCheckingCache] = useState(true);

    const { 
        isSaved, 
        toggleSave, 
        isPending, 
        hasActiveProfile,
        loading: watchlistLoading 
    } = useWatchlist();

    // Check for cached probing results on mount
    useEffect(() => {
        const cached = getCachedProbingResults(movieId);
        if (cached) {
            setProbingResults(cached);
        }
        setIsCheckingCache(false);
    }, [movieId]);

    const handleWatchClick = (e: React.MouseEvent) => {
        // Prefetch the watch page for smoother transition
        router.prefetch(`/watch/${mediaType}/${movieId}`);
        
        // If we have a preloaded provider, we could pass it via query params
        if (probingResults?.fastestProvider) {
            router.push(`/watch/${mediaType}/${movieId}?provider=${probingResults.fastestProvider.providerId}`);
        } else {
            router.push(`/watch/${mediaType}/${movieId}`);
        }
    };

    const handleWatchlistToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!hasActiveProfile) {
            return;
        }

        await toggleSave({
            id: movieId,
            title,
            poster_path: posterPath,
            mediaType,
        });
    };

    const fastestProvider = probingResults?.fastestProvider;
    const isInWatchlist = isSaved(movieId, mediaType);
    const isWatchlistPending = isPending(movieId, mediaType);

    return (
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
                <Link
                    href={`/watch/${mediaType}/${movieId}${fastestProvider ? `?provider=${fastestProvider.providerId}` : ''}`}
                    onClick={(e) => {
                        // Start prefetching immediately
                        router.prefetch(`/watch/${mediaType}/${movieId}`);
                        
                        if (fastestProvider) {
                            // Use fastest provider URL
                            e.preventDefault();
                            router.push(`/watch/${mediaType}/${movieId}?provider=${fastestProvider.providerId}`);
                        }
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/30"
                >
                    {isCheckingCache ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : fastestProvider ? (
                        <Zap size={20} className="text-yellow-400" />
                    ) : (
                        <PlayCircle size={20} />
                    )}
                    {isCheckingCache ? "Preparing..." : fastestProvider ? "Play Instantly" : "Watch Now"}
                </Link>
                
                {/* Preloading Status Indicator */}
                {!isCheckingCache && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2">
                        {fastestProvider ? (
                            <>
                                <Zap className="w-3 h-3 text-green-500" />
                                <span className="text-green-500">
                                    Ready • {fastestProvider.providerName} ({fastestProvider.responseTime}ms)
                                </span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Ready to play</span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Watchlist Button */}
            {showWatchlist && (
                <button
                    onClick={handleWatchlistToggle}
                    disabled={!hasActiveProfile || isWatchlistPending || watchlistLoading}
                    className={`inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-full transition-all hover:scale-105 ${
                        !hasActiveProfile 
                            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                            : isInWatchlist
                                ? "bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30"
                                : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                    }`}
                    title={!hasActiveProfile ? "Select a profile to add to your list" : isInWatchlist ? "Remove from My List" : "Add to My List"}
                >
                    {isWatchlistPending ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : isInWatchlist ? (
                        <Check size={18} />
                    ) : (
                        <Plus size={18} />
                    )}
                    {isWatchlistPending 
                        ? "Updating..." 
                        : isInWatchlist 
                            ? "In My List" 
                            : "My List"
                    }
                </button>
            )}
            
            {showDownload && (
                <button
                    className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white hover:bg-white/10 hover:border-white/40 rounded-full transition-all"
                >
                    <Download size={18} className="mr-2" />
                    Download
                </button>
            )}
        </div>
    );
}
