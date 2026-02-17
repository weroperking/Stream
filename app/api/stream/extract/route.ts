import { NextRequest, NextResponse } from "next/server";

/**
 * Video URL Extraction API
 * 
 * This endpoint fetches the provider page and extracts the direct video URL
 * for playback in the custom video.js player.
 * 
 * Supports extraction from:
 * - VidSrc.wtf API endpoints (JSON responses)
 * - Embed pages (HTML parsing for video sources)
 * - HLS/DASH streams
 */

type ExtractResult = {
    success: boolean;
    videoUrl?: string;
    type?: "mp4" | "hls" | "dash" | "iframe";
    quality?: string;
    provider?: string;
    error?: string;
};

// Cache for extracted URLs (in-memory)
const urlCache = new Map<string, { storedAt: number; result: ExtractResult }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(providerId: string, mediaId: number, season?: number, episode?: number): string {
    return `${providerId}:${mediaId}:${season || "movie"}:${episode || "0"}`;
}

function cleanupCache(now: number) {
    for (const [key, entry] of urlCache.entries()) {
        if (now - entry.storedAt > CACHE_TTL_MS) {
            urlCache.delete(key);
        }
    }
}

/**
 * Extract video URL from VidSrc.wtf API endpoints
 * These endpoints return JSON with the video source
 */
async function extractFromVidSrcWtf(url: string, providerId: string): Promise<ExtractResult> {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Referer": new URL(url).origin + "/",
            },
        });

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        
        // The API returns various formats depending on the endpoint
        // Try to find the video URL in common locations
        let videoUrl = data.url || data.videoUrl || data.link || data.source;
        
        if (videoUrl) {
            // Check if it's an HLS stream
            if (videoUrl.includes(".m3u8") || data.type === "hls") {
                return {
                    success: true,
                    videoUrl,
                    type: "hls",
                    quality: data.quality || "auto",
                    provider: providerId,
                };
            }
            
            // Check for MP4 direct link
            if (videoUrl.includes(".mp4")) {
                return {
                    success: true,
                    videoUrl,
                    type: "mp4",
                    quality: data.quality || "unknown",
                    provider: providerId,
                };
            }
            
            // If it's a relative URL, make it absolute
            if (videoUrl.startsWith("//")) {
                videoUrl = "https:" + videoUrl;
            }
            
            return {
                success: true,
                videoUrl,
                type: videoUrl.includes(".m3u8") ? "hls" : "iframe",
                quality: data.quality || "auto",
                provider: providerId,
            };
        }
        
        // Check for error in response
        if (data.error || data.message) {
            return { success: false, error: data.error || data.message };
        }
        
        return { success: false, error: "No video URL found in response" };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

/**
 * Extract video URL from embed pages by parsing HTML
 */
async function extractFromEmbedPage(url: string, providerId: string): Promise<ExtractResult> {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": new URL(url).origin + "/",
            },
        });

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }

        const html = await response.text();
        
        // Try to find video source in various patterns
        
        // Pattern 1: <video src="...">
        let match = html.match(/<video[^>]+src=["']([^"']+)["']/i);
        if (match) {
            return {
                success: true,
                videoUrl: match[1],
                type: "mp4",
                provider: providerId,
            };
        }
        
        // Pattern 2: source src="..." type="application/x-mpegURL" (HLS)
        match = html.match(/<source[^>]+src=["']([^"']+)["'][^>]+type=["']application\/x-mpegURL["']/i);
        if (match) {
            return {
                success: true,
                videoUrl: match[1],
                type: "hls",
                provider: providerId,
            };
        }
        
        // Pattern 3: data-src for lazy loaded videos
        match = html.match(/data-src=["']([^"']+\.m3u8[^"']*)["']/i);
        if (match) {
            return {
                success: true,
                videoUrl: match[1],
                type: "hls",
                provider: providerId,
            };
        }
        
        // Pattern 4: iframe embed (return the embed URL)
        match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        if (match) {
            const iframeSrc = match[1];
            // If it's an absolute URL, return it
            if (iframeSrc.startsWith("http")) {
                return {
                    success: true,
                    videoUrl: iframeSrc,
                    type: "iframe",
                    provider: providerId,
                };
            }
        }
        
        // Pattern 5: Look for JavaScript variable assignments
        match = html.match(/(?:videoUrl|video_src|streamUrl|file|source|file_name)\s*=\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
        if (match) {
            const videoUrl = match[1];
            return {
                success: true,
                videoUrl: videoUrl,
                type: videoUrl.includes(".m3u8") ? "hls" : "mp4",
                provider: providerId,
            };
        }
        
        // Pattern 6: try to find cloudflare stream or similar CDN URLs
        match = html.match(/(?:cloudflare| Bunny|jwplayer|vimeo|mp4upload|vidguard|streamtape)[^"']*["']([^"']+)["']/i);
        if (match) {
            return {
                success: true,
                videoUrl: match[1],
                type: "iframe",
                provider: providerId,
            };
        }
        
        return { success: false, error: "No video source found in page" };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

/**
 * Main extraction function that tries multiple strategies
 */
async function extractVideoUrl(
    providerBaseUrl: string,
    providerId: string,
    mediaId: number,
    type: "movie" | "tv",
    season?: number,
    episode?: number
): Promise<ExtractResult> {
    // Build the target URL based on provider type
    let targetUrl: string;
    
    if (providerBaseUrl.includes("vidsrc.wtf/api")) {
        // VidSrc.wtf API endpoint - use as is
        targetUrl = providerBaseUrl;
        if (type === "tv") {
            targetUrl = `${providerBaseUrl.replace("/movie/", "/tv/")}?id=${mediaId}&s=${season}&e=${episode}`;
        } else {
            targetUrl = `${providerBaseUrl}?id=${mediaId}`;
        }
        return extractFromVidSrcWtf(targetUrl, providerId);
    }
    
    // For embed pages
    if (type === "movie") {
        targetUrl = `${providerBaseUrl}/embed/movie/${mediaId}`;
    } else {
        targetUrl = `${providerBaseUrl}/embed/tv/${mediaId}/${season}/${episode}`;
    }
    
    return extractFromEmbedPage(targetUrl, providerId);
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mediaId = searchParams.get("mediaId");
    const type = searchParams.get("type") || "movie";
    const season = searchParams.get("season");
    const episode = searchParams.get("episode");
    const provider = searchParams.get("provider"); // Optional: specific provider to try

    if (!mediaId) {
        return NextResponse.json(
            { success: false, error: "Missing mediaId parameter" },
            { status: 400 }
        );
    }

    const id = parseInt(mediaId, 10);
    if (isNaN(id)) {
        return NextResponse.json(
            { success: false, error: "Invalid mediaId parameter" },
            { status: 400 }
        );
    }

    const now = Date.now();
    cleanupCache(now);

    // If a specific provider is requested, try only that one
    const providerBaseUrl = provider ? getProviderBaseUrl(provider) : null;
    
    // Only use specific provider if we found a valid baseUrl
    let providersToTry: Array<{ id: string; baseUrl: string }>;
    if (providerBaseUrl) {
        providersToTry = [{ id: provider, baseUrl: providerBaseUrl }];
    } else if (provider) {
        // Provider was specified but not found - log warning and fall back to list
        console.warn(`Provider "${provider}" not found, falling back to provider list`);
        providersToTry = getProviderList();
    } else {
        providersToTry = getProviderList();
    }

    let lastError = "No providers available";

    for (const prov of providersToTry) {
        const cacheKey = getCacheKey(prov.id, id, season ? parseInt(season) : undefined, episode ? parseInt(episode) : undefined);
        
        // Check cache first
        const cached = urlCache.get(cacheKey);
        if (cached && now - cached.storedAt <= CACHE_TTL_MS) {
            return NextResponse.json(cached.result);
        }

        // Skip disabled providers
        if (prov.baseUrl === "disabled") {
            continue;
        }

        const result = await extractVideoUrl(
            prov.baseUrl,
            prov.id,
            id,
            type as "movie" | "tv",
            season ? parseInt(season) : undefined,
            episode ? parseInt(episode) : undefined
        );

        if (result.success && result.videoUrl) {
            // Cache successful result
            urlCache.set(cacheKey, { storedAt: now, result });
            return NextResponse.json(result);
        }

        lastError = result.error || "Unknown error";
    }

    return NextResponse.json(
        { success: false, error: lastError },
        { status: 404 }
    );
}

/**
 * Get list of providers to try for extraction
 * Ordered by priority (Tier 1 first)
 */
function getProviderList(): Array<{ id: string; baseUrl: string }> {
    return [
        // Tier 1 - VidSrc.wtf APIs (most likely to return direct URLs)
        { id: "vidsrc-wtf-1", baseUrl: "https://vidsrc.wtf/api/1/movie" },
        { id: "vidsrc-wtf-2", baseUrl: "https://vidsrc.wtf/api/2/movie" },
        { id: "vidsrc-wtf-3", baseUrl: "https://vidsrc.wtf/api/3/movie" },
        { id: "vidsrc-wtf-4", baseUrl: "https://vidsrc.wtf/api/4/movie" },
        // Tier 2 - Embed providers
        { id: "vidsrc-xyz", baseUrl: "https://vidsrc.xyz" },
        { id: "vidsrc-cc", baseUrl: "https://vidsrc.cc/v2/embed" },
    ];
}

/**
 * Get the base URL for a specific provider ID
 */
function getProviderBaseUrl(providerId: string): string | null {
    const providers = getProviderList();
    const provider = providers.find(p => p.id === providerId);
    return provider ? provider.baseUrl : null;
}
