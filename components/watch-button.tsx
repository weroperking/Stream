"use client";

import { PlayCircle, Download, Zap, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    getCachedProbingResults,
    type ProbedProviderResult,
    type CachedProbingResults,
} from "@/lib/providers";

interface WatchButtonProps {
    movieId: number;
    title: string;
    showDownload?: boolean;
}

export function WatchButton({ movieId, title, showDownload = true }: WatchButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [probingResults, setProbingResults] = useState<CachedProbingResults | null>(null);
    const [isCheckingCache, setIsCheckingCache] = useState(true);

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
        router.prefetch(`/watch/movie/${movieId}`);
        
        // If we have a preloaded provider, we could pass it via query params
        // For now, we'll use the cached results in the watch page
        if (probingResults?.fastestProvider) {
            router.push(`/watch/movie/${movieId}?provider=${probingResults.fastestProvider.providerId}`);
        } else {
            router.push(`/watch/movie/${movieId}`);
        }
    };

    const fastestProvider = probingResults?.fastestProvider;

    return (
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
                <Link
                    href={`/watch/movie/${movieId}${fastestProvider ? `?provider=${fastestProvider.providerId}` : ''}`}
                    onClick={(e) => {
                        // Start prefetching immediately
                        router.prefetch(`/watch/movie/${movieId}`);
                        
                        if (fastestProvider) {
                            // Use fastest provider URL
                            e.preventDefault();
                            router.push(`/watch/movie/${movieId}?provider=${fastestProvider.providerId}`);
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
