/**
 * Provider Priority System - Hierarchical Provider Ordering
 * 
 * This module implements a tiered provider system with the following priority order:
 * - Tier 1 (Primary): VidSrc.wtf (API endpoints 1-4) - Fastest, tried first
 * - Tier 2 (Stable): VidSrc.xyz, VidSrc.cc - Stable alternatives
 * - Tier 3 (Fallback): MultiEmbed and other fallback providers
 */

export interface Provider {
    id: string;
    name: string;
    tier: ProviderTier;
    /**
     * Generate the embed URL for a movie.
     * @param tmdbId - The TMDB ID of the movie.
     */
    getMovieUrl: (tmdbId: number) => string;
    /**
     * Generate the embed URL for a TV episode.
     * @param tmdbId - The TMDB ID of the TV show.
     * @param season - The season number.
     * @param episode - The episode number.
     */
    getTVUrl: (tmdbId: number, season: number, episode: number) => string;
}

/**
 * Provider tier levels for priority ordering
 */
export type ProviderTier = 1 | 2 | 3;

/**
 * Tier configuration with metadata
 */
export interface TierConfig {
    tier: ProviderTier;
    name: string;
    description: string;
    retryCount: number;
}

/**
 * Provider performance metrics
 */
export interface ProviderMetrics {
    providerId: string;
    successCount: number;
    failureCount: number;
    totalResponseTime: number;
    lastSuccess: number | null;
    lastFailure: number | null;
    successRate: number;
    averageResponseTime: number;
    isHealthy: boolean;
}

/**
 * Default metrics for a new provider
 */
function createDefaultMetrics(providerId: string): ProviderMetrics {
    return {
        providerId,
        successCount: 0,
        failureCount: 0,
        totalResponseTime: 0,
        lastSuccess: null,
        lastFailure: null,
        successRate: 1,
        averageResponseTime: 0,
        isHealthy: true,
    };
}

/**
 * In-memory store for provider metrics
 * In production, this could be stored in Redis or a database
 */
const providerMetricsMap = new Map<string, ProviderMetrics>();

/**
 * Initialize metrics for all providers
 */
function initializeMetrics(providers: Provider[]): void {
    providers.forEach(provider => {
        if (!providerMetricsMap.has(provider.id)) {
            providerMetricsMap.set(provider.id, createDefaultMetrics(provider.id));
        }
    });
}

/**
 * Get metrics for a specific provider
 */
export function getProviderMetrics(providerId: string): ProviderMetrics {
    if (!providerMetricsMap.has(providerId)) {
        const metrics = createDefaultMetrics(providerId);
        providerMetricsMap.set(providerId, metrics);
    }
    return providerMetricsMap.get(providerId)!;
}

/**
 * Get all provider metrics
 */
export function getAllProviderMetrics(): ProviderMetrics[] {
    return Array.from(providerMetricsMap.values());
}

/**
 * Record a successful provider attempt
 */
export function recordSuccess(providerId: string, responseTime: number): void {
    const metrics = getProviderMetrics(providerId);
    metrics.successCount++;
    metrics.totalResponseTime += responseTime;
    metrics.lastSuccess = Date.now();
    metrics.averageResponseTime = metrics.totalResponseTime / metrics.successCount;
    metrics.successRate = metrics.successCount / (metrics.successCount + metrics.failureCount);
    metrics.isHealthy = metrics.successRate >= 0.3; // Consider unhealthy if success rate < 30%
}

/**
 * Record a failed provider attempt
 */
export function recordFailure(providerId: string): void {
    const metrics = getProviderMetrics(providerId);
    metrics.failureCount++;
    metrics.lastFailure = Date.now();
    metrics.successRate = metrics.successCount / (metrics.successCount + metrics.failureCount);
    metrics.isHealthy = metrics.successRate >= 0.3;
}

/**
 * Reset metrics for a specific provider
 */
export function resetProviderMetrics(providerId: string): void {
    providerMetricsMap.set(providerId, createDefaultMetrics(providerId));
}

/**
 * Reset all provider metrics
 */
export function resetAllProviderMetrics(): void {
    providerMetricsMap.clear();
}

/**
 * Tier configuration
 */
export const tierConfigs: Record<ProviderTier, TierConfig> = {
    1: {
        tier: 1,
        name: "Primary (Fastest)",
        description: "VidSrc.wtf API endpoints - fastest response times",
        retryCount: 2,
    },
    2: {
        tier: 2,
        name: "Stable Alternatives",
        description: "VidSrc.xyz, VidSrc.cc - reliable alternatives",
        retryCount: 1,
    },
    3: {
        tier: 3,
        name: "Fallback Aggregator",
        description: "MultiEmbed and other fallback providers",
        retryCount: 1,
    },
};

/**
 * Provider definitions with tier assignments
 */
export const providers: Provider[] = [
    // Tier 1 - Primary (Fastest): VidSrc.wtf APIs
    {
        id: "vidsrc-wtf-1",
        name: "VidSrc.wtf (API 1)",
        tier: 1,
        getMovieUrl: (id) => `https://vidsrc.wtf/api/1/movie/?id=${id}`,
        getTVUrl: (id, s, e) => `https://vidsrc.wtf/api/1/tv/?id=${id}&s=${s}&e=${e}`,
    },
    {
        id: "vidsrc-wtf-2",
        name: "VidSrc.wtf (API 2)",
        tier: 1,
        getMovieUrl: (id) => `https://vidsrc.wtf/api/2/movie/?id=${id}&color=8B5CF6`,
        getTVUrl: (id, s, e) => `https://vidsrc.wtf/api/2/tv/?id=${id}&s=${s}&e=${e}&color=8B5CF6`,
    },
    {
        id: "vidsrc-wtf-3",
        name: "VidSrc.wtf (API 3)",
        tier: 1,
        getMovieUrl: (id) => `https://vidsrc.wtf/api/3/movie/?id=${id}`,
        getTVUrl: (id, s, e) => `https://vidsrc.wtf/api/3/tv/?id=${id}&s=${s}&e=${e}`,
    },
    {
        id: "vidsrc-wtf-4",
        name: "VidSrc.wtf (API 4)",
        tier: 1,
        getMovieUrl: (id) => `https://vidsrc.wtf/api/4/movie/?id=${id}`,
        getTVUrl: (id, s, e) => `https://vidsrc.wtf/api/4/tv/?id=${id}&s=${s}&e=${e}`,
    },
    // Tier 2 - Stable Alternatives
    {
        id: "vidsrc-xyz",
        name: "VidSrc.xyz",
        tier: 2,
        getMovieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidsrc-cc",
        name: "VidSrc.cc",
        tier: 2,
        getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
    },
    // Tier 3 - Fallback Aggregator (remaining providers)
    {
        id: "vidsrc-to",
        name: "VidSrc.to",
        tier: 3,
        getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidzee",
        name: "Vidzee",
        tier: 3,
        getMovieUrl: (id) => `https://vidzee.wtf/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidzee.wtf/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidrock",
        name: "VidRock",
        tier: 3,
        getMovieUrl: (id) => `https://vidrock.pro/e/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidrock.pro/e/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidnest",
        name: "Vidnest RiveEmbed",
        tier: 3,
        getMovieUrl: (id) => `https://vidnest.stream/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidnest.stream/tv/${id}/${s}/${e}`,
    },
    {
        id: "smashy",
        name: "SmashyStream",
        tier: 3,
        getMovieUrl: (id) => `https://player.smashy.stream/movie/${id}`,
        getTVUrl: (id, s, e) => `https://player.smashy.stream/tv/${id}?s=${s}&e=${e}`,
    },
    {
        id: "111movies",
        name: "111Movies",
        tier: 3,
        getMovieUrl: (id) => `https://111movies.com/movie/${id}`,
        getTVUrl: (id, s, e) => `https://111movies.com/tv/${id}/${s}/${e}`,
    },
    {
        id: "videasy",
        name: "Videasy",
        tier: 3,
        getMovieUrl: (id) => `https://player.videasy.net/movie/${id}`,
        getTVUrl: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidlink",
        name: "VidLink",
        tier: 3,
        getMovieUrl: (id) => `https://vidlink.pro/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidfast",
        name: "VidFast",
        tier: 3,
        getMovieUrl: (id) => `https://vidfast.pro/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}`,
    },
    {
        id: "embed-su",
        name: "Embed.su",
        tier: 3,
        getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
        getTVUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
    },
    {
        id: "2embed",
        name: "2Embed",
        tier: 3,
        getMovieUrl: (id) => `https://www.2embed.cc/embed/movie?tmdb=${id}`,
        getTVUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
    },
    {
        id: "moviesapi",
        name: "MoviesAPI",
        tier: 3,
        getMovieUrl: (id) => `https://moviesapi.club/movie/${id}`,
        getTVUrl: (id, s, e) => `https://moviesapi.club/tv/${id}/${s}/${e}`,
    },
    {
        id: "autoembed",
        name: "AutoEmbed",
        tier: 3,
        getMovieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
        getTVUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
    },
    {
        id: "multiembed",
        name: "MultiEmbed",
        tier: 3,
        getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
        getTVUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
    },
    {
        id: "primewire",
        name: "PrimeWire",
        tier: 3,
        getMovieUrl: (id) => `https://primewire.tf/embed/movie?tmdb=${id}`,
        getTVUrl: (id, s, e) => `https://primewire.tf/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
    },
    {
        id: "warezcdn",
        name: "WarezCDN",
        tier: 3,
        getMovieUrl: (id) => `https://embed.warezcdn.com/filme/${id}`,
        getTVUrl: (id, s, e) => `https://embed.warezcdn.com/serie/${id}/${s}/${e}`,
    },
    {
        id: "superflix",
        name: "SuperFlix",
        tier: 3,
        getMovieUrl: (id) => `https://superflix.dev/movie/${id}`,
        getTVUrl: (id, s, e) => `https://superflix.dev/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidup",
        name: "VidUp",
        tier: 3,
        getMovieUrl: (id) => `https://vidup.io/embed/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidup.io/embed/tv/${id}/${s}/${e}`,
    },
];

// Initialize metrics for all providers
initializeMetrics(providers);

/**
 * Get providers sorted by tier (priority order)
 * @param includeUnhealthy - Whether to include unhealthy providers in the list
 */
export function getProvidersByPriority(includeUnhealthy = false): Provider[] {
    const sortedProviders = [...providers].sort((a, b) => {
        // First sort by tier
        if (a.tier !== b.tier) {
            return a.tier - b.tier;
        }
        
        // Within same tier, sort by performance (success rate) if metrics available
        const metricsA = getProviderMetrics(a.id);
        const metricsB = getProviderMetrics(b.id);
        
        // If both have been tested, prefer better success rate
        if (metricsA.successCount + metricsA.failureCount > 0 && 
            metricsB.successCount + metricsB.failureCount > 0) {
            // Higher success rate first
            if (metricsA.successRate !== metricsB.successRate) {
                return metricsB.successRate - metricsA.successRate;
            }
            // Then faster average response time
            return metricsA.averageResponseTime - metricsB.averageResponseTime;
        }
        
        // If one has been tested, prefer the tested one
        const totalA = metricsA.successCount + metricsA.failureCount;
        const totalB = metricsB.successCount + metricsB.failureCount;
        if (totalA > 0 && totalB === 0) return -1;
        if (totalB > 0 && totalA === 0) return 1;
        
        return 0;
    });
    
    // Filter out unhealthy providers if requested
    if (!includeUnhealthy) {
        return sortedProviders.filter(p => getProviderMetrics(p.id).isHealthy);
    }
    
    return sortedProviders;
}

/**
 * Get providers by specific tier
 */
export function getProvidersByTier(tier: ProviderTier): Provider[] {
    return providers.filter(p => p.tier === tier);
}

/**
 * Get the next available provider in priority order
 * @param failedProviderIds - Array of provider IDs that have already failed
 * @param maxTier - Maximum tier to try (useful for limiting to primary providers only)
 */
export function getNextProvider(
    failedProviderIds: string[] = [], 
    maxTier: ProviderTier = 3
): Provider | null {
    const sortedProviders = getProvidersByPriority(false);
    
    for (const provider of sortedProviders) {
        if (provider.tier > maxTier) continue;
        if (failedProviderIds.includes(provider.id)) continue;
        
        return provider;
    }
    
    // If no healthy providers found, try unhealthy ones as last resort
    const allProviders = getProvidersByPriority(true);
    for (const provider of allProviders) {
        if (provider.tier > maxTier) continue;
        if (failedProviderIds.includes(provider.id)) continue;
        
        return provider;
    }
    
    return null;
}

/**
 * Get movie URL with smart fallback
 * Tries providers in priority order until one works
 */
export function getMovieUrlWithFallback(
    tmdbId: number,
    preferredProviderId?: string
): string {
    // If a preferred provider is specified, try it first
    if (preferredProviderId) {
        const preferredProvider = providers.find(p => p.id === preferredProviderId);
        if (preferredProvider) {
            return preferredProvider.getMovieUrl(tmdbId);
        }
    }
    
    // Otherwise, use the default primary provider
    const defaultProvider = providers.find(p => p.tier === 1);
    if (defaultProvider) {
        return defaultProvider.getMovieUrl(tmdbId);
    }
    
    // Fallback to first provider
    return providers[0].getMovieUrl(tmdbId);
}

/**
 * Get TV URL with smart fallback
 * Tries providers in priority order until one works
 */
export function getTVUrlWithFallback(
    tmdbId: number,
    season: number,
    episode: number,
    preferredProviderId?: string
): string {
    // If a preferred provider is specified, try it first
    if (preferredProviderId) {
        const preferredProvider = providers.find(p => p.id === preferredProviderId);
        if (preferredProvider) {
            return preferredProvider.getTVUrl(tmdbId, season, episode);
        }
    }
    
    // Otherwise, use the default primary provider
    const defaultProvider = providers.find(p => p.tier === 1);
    if (defaultProvider) {
        return defaultProvider.getTVUrl(tmdbId, season, episode);
    }
    
    // Fallback to first provider
    return providers[0].getTVUrl(tmdbId, season, episode);
}

/**
 * Get provider by ID
 */
export function getProviderById(id: string): Provider | undefined {
    return providers.find(p => p.id === id);
}

/**
 * Provider result from probing
 */
export interface ProbedProviderResult {
    providerId: string;
    providerName: string;
    url: string;
    responseTime: number;
    success: boolean;
    timestamp: number;
}

/**
 * Cached probing results for a movie
 */
export interface CachedProbingResults {
    movieId: number;
    results: ProbedProviderResult[];
    fastestProvider: ProbedProviderResult | null;
    timestamp: number;
}

/**
 * Get top 3 providers for probing
 */
export function getTopProvidersForProbing(): Provider[] {
    return getProvidersByPriority(false).slice(0, 3);
}

/**
 * Probe a single provider URL and measure response time
 */
export async function probeProvider(
    provider: Provider,
    tmdbId: number
): Promise<ProbedProviderResult> {
    const url = provider.getMovieUrl(tmdbId);
    const startTime = performance.now();
    
    try {
        // Use fetch with HEAD request to check if the URL is accessible
        // Use mode: 'no-cors' to avoid CORS issues, we'll consider any response as success
        const response = await fetch(url, {
            method: 'HEAD',
            cache: 'no-store',
            signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        // Consider success if we get any response (even errors mean the URL is reachable)
        const success = response.ok || response.status === 404 || response.status === 403;
        
        return {
            providerId: provider.id,
            providerName: provider.name,
            url,
            responseTime,
            success,
            timestamp: Date.now(),
        };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        return {
            providerId: provider.id,
            providerName: provider.name,
            url,
            responseTime,
            success: false,
            timestamp: Date.now(),
        };
    }
}

/**
 * Probe multiple providers in parallel
 */
export async function probeProviders(
    providersToProbe: Provider[],
    tmdbId: number
): Promise<CachedProbingResults> {
    const probePromises = providersToProbe.map(provider => 
        probeProvider(provider, tmdbId)
    );
    
    const results = await Promise.all(probePromises);
    
    // Find the fastest successful provider
    const successfulProviders = results.filter(r => r.success);
    const fastestProvider = successfulProviders.length > 0 
        ? successfulProviders.sort((a, b) => a.responseTime - b.responseTime)[0]
        : null;
    
    return {
        movieId: tmdbId,
        results,
        fastestProvider,
        timestamp: Date.now(),
    };
}

/**
 * Get cached probing results from sessionStorage
 */
export function getCachedProbingResults(movieId: number): CachedProbingResults | null {
    if (typeof window === 'undefined') return null;
    
    try {
        const cacheKey = `probing_${movieId}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (!cached) return null;
        
        const parsed = JSON.parse(cached) as CachedProbingResults;
        
        // Check if cache is still valid (less than 5 minutes old)
        const cacheAge = Date.now() - parsed.timestamp;
        const maxCacheAge = 5 * 60 * 1000; // 5 minutes
        
        if (cacheAge > maxCacheAge) {
            sessionStorage.removeItem(cacheKey);
            return null;
        }
        
        return parsed;
    } catch (error) {
        return null;
    }
}

/**
 * Save probing results to sessionStorage
 */
export function cacheProbingResults(results: CachedProbingResults): void {
    if (typeof window === 'undefined') return;
    
    try {
        const cacheKey = `probing_${results.movieId}`;
        sessionStorage.setItem(cacheKey, JSON.stringify(results));
    } catch (error) {
        console.error('Failed to cache probing results:', error);
    }
}

/**
 * Get all tier names for display
 */
export function getTierNames(): Record<ProviderTier, string> {
    return {
        1: "Primary (Fastest)",
        2: "Stable Alternatives",
        3: "Fallback Aggregator",
    };
}

// Default provider remains the first primary provider for backwards compatibility
export const defaultProvider = providers.find(p => p.tier === 1) || providers[0];
