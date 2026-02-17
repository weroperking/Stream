"use client";

import { PlayCircle, Zap, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    getCachedProbingResults,
    type CachedProbingResults,
} from "@/lib/providers";

interface TVWatchButtonProps {
    tvId: number;
    season: number;
    episode: number;
    title: string;
    showDownload?: boolean;
}

export function TVWatchButton({ tvId, season, episode, title, showDownload = true }: TVWatchButtonProps) {
    const router = useRouter();
    const [probingResults, setProbingResults] = useState<CachedProbingResults | null>(null);
    const [isCheckingCache, setIsCheckingCache] = useState(true);

    // Check for cached probing results on mount
    useEffect(() => {
        const cached = getCachedProbingResults(tvId);
        if (cached) {
            setProbingResults(cached);
        }
        setIsCheckingCache(false);
    }, [tvId]);

    const fastestProvider = probingResults?.fastestProvider;

    return (
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
                <Link
                    href={`/watch/tv/${tvId}?season=${season}&episode=${episode}${fastestProvider ? `&provider=${fastestProvider.providerId}` : ''}`}
                    onClick={(e) => {
                        // Prefetch for smoother navigation
                        router.prefetch(`/watch/tv/${tvId}?season=${season}&episode=${episode}`);
                        
                        if (fastestProvider) {
                            e.preventDefault();
                            router.push(`/watch/tv/${tvId}?season=${season}&episode=${episode}&provider=${fastestProvider.providerId}`);
                        }
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent/90 transition-all hover:scale-105 shadow-lg shadow-accent/30"
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
        </div>
    );
}
