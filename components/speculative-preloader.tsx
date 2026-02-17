"use client";

import { useEffect, useState } from "react";
import {
    probeProviders,
    getTopProvidersForProbing,
    getCachedProbingResults,
    cacheProbingResults,
    type CachedProbingResults,
    type ProbedProviderResult,
} from "@/lib/providers";
import { Loader2, Zap, CheckCircle2 } from "lucide-react";

interface SpeculativePreloaderProps {
    movieId: number;
    onPreloadComplete?: (results: CachedProbingResults) => void;
    children?: React.ReactNode;
}

export function SpeculativePreloader({
    movieId,
    onPreloadComplete,
    children,
}: SpeculativePreloaderProps) {
    const [isProbing, setIsProbing] = useState(false);
    const [probingResults, setProbingResults] = useState<CachedProbingResults | null>(null);

    useEffect(() => {
        // Check for cached results first
        const cachedResults = getCachedProbingResults(movieId);
        if (cachedResults) {
            setProbingResults(cachedResults);
            onPreloadComplete?.(cachedResults);
            return;
        }

        // Start background probing
        const startProbing = async () => {
            setIsProbing(true);
            
            try {
                const topProviders = getTopProvidersForProbing();
                const results = await probeProviders(topProviders, movieId);
                
                // Cache the results
                cacheProbingResults(results);
                
                // Update state
                setProbingResults(results);
                onPreloadComplete?.(results);
            } catch (error) {
                console.error("Background probing failed:", error);
            } finally {
                setIsProbing(false);
            }
        };

        startProbing();
    }, [movieId, onPreloadComplete]);

    return (
        <>
            {children}
        </>
    );
}

/**
 * Hook to access probing results for a movie
 */
export function useProbingResults(movieId: number) {
    const [results, setResults] = useState<CachedProbingResults | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const cachedResults = getCachedProbingResults(movieId);
        if (cachedResults) {
            setResults(cachedResults);
        }
        setIsLoading(false);
    }, [movieId]);

    return { results, isLoading };
}

/**
 * Hook to get the fastest provider for a movie
 */
export function useFastestProvider(movieId: number) {
    const { results, isLoading } = useProbingResults(movieId);
    
    return {
        fastestProvider: results?.fastestProvider ?? null,
        isLoading,
        isReady: !!results?.fastestProvider,
    };
}

interface PreloadIndicatorProps {
    movieId: number;
    showLabel?: boolean;
}

export function PreloadIndicator({ movieId, showLabel = true }: PreloadIndicatorProps) {
    const { fastestProvider, isLoading, isReady } = useFastestProvider(movieId);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                {showLabel && <span>Preparing stream...</span>}
            </div>
        );
    }

    if (isReady && fastestProvider) {
        return (
            <div className="flex items-center gap-2 text-xs text-green-500">
                <Zap className="w-3 h-3" />
                {showLabel && (
                    <span>
                        Ready • {fastestProvider.providerName} ({fastestProvider.responseTime}ms)
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3 h-3" />
            {showLabel && <span>Ready to play</span>}
        </div>
    );
}
