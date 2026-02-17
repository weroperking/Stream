"use client";

import { providers, type Provider, type ProviderTier } from "@/lib/providers";
import { Play, ChevronDown, MonitorPlay, Wifi, WifiOff, Loader2, CheckCircle2, XCircle, ChevronRight, Zap, Film } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { VideoPlayer } from "./video-player";

// Premium brand name mappings - maps provider IDs to exclusive brand names
const PREMIUM_BRANDS: Record<string, { name: string; tagline: string }> = {
    // Tier 1 - Premium
    "vidsrc-wtf-1": { name: "StellarCast", tagline: "Elite Streaming" },
    "vidsrc-wtf-2": { name: "TitanWave", tagline: "High-Velocity" },
    "vidsrc-wtf-3": { name: "ApexStream", tagline: "Peak Performance" },
    "vidsrc-wtf-4": { name: "NovaLink", tagline: "Next-Gen" },
    // Tier 2 - Stable
    "vidsrc-xyz": { name: "PrimeCast", tagline: "Reliable Edge" },
    "vidsrc-cc": { name: "QuantumNode", tagline: "Stable Flow" },
    // Tier 3 - Fallback
    "vidsrc-to": { name: "VeloxStream", tagline: "Swift Access" },
    "vidzee": { name: "CipherLink", tagline: "Secure Stream" },
    "vidrock": { name: "AetherLink", tagline: "Cloud Connect" },
    "vidnest": { name: "Nexus Stream", tagline: "Hub Network" },
    "smashy": { name: "FlashPoint", tagline: "Rapid Playback" },
    "111movies": { name: "PrimeVault", tagline: "Content Vault" },
    "videasy": { name: "StreamLite", tagline: "Easy Access" },
    "vidlink": { name: "LinkPro", tagline: "Pro Links" },
    "vidfast": { name: "TurboStream", tagline: "Fast Lane" },
    "embed-su": { name: "EmbedCore", tagline: "Core Embed" },
    "2embed": { name: "DualEmbed", tagline: "Dual Stack" },
    "moviesapi": { name: "MovieVault", tagline: "Vault API" },
    "myvi": { name: "MyVI", tagline: "Video Hub" },
    "vidguard": { name: "GuardStream", tagline: "Protected" },
};

// Get premium brand name for a provider
function getPremiumBrand(providerId: string): { name: string; tagline: string } {
    return PREMIUM_BRANDS[providerId] || { name: `Stream ${providerId.replace(/[^0-9]/g, "")}`, tagline: "Provider" };
}

// Connection attempt tracking
interface ConnectionAttempt {
    provider: Provider;
    status: "attempting" | "success" | "failed";
    timestamp: number;
}

interface MediaPlayerProps {
    mediaId: number;
    type: "movie" | "tv";
    title: string;
    season?: number;
    episode?: number;
    runtime?: number;
    preferredProvider?: string;
}

export function MediaPlayer({
    mediaId,
    type,
    title,
    season = 1,
    episode = 1,
    runtime,
    preferredProvider,
}: MediaPlayerProps) {
    const [showPlayer, setShowPlayer] = useState(true); // Auto-show player
    const [currentProvider, setCurrentProvider] = useState<Provider>(() => {
        // Use preferred provider if provided and available
        if (preferredProvider) {
            const found = providers.find(p => p.id === preferredProvider);
            if (found) return found;
        }
        return providers[0];
    });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState<ConnectionAttempt[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);
    const [currentAttemptIndex, setCurrentAttemptIndex] = useState(-1);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const failTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Video extraction state
    const [extractedUrl, setExtractedUrl] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionFailed, setExtractionFailed] = useState(false);
    const [useCustomPlayer, setUseCustomPlayer] = useState(false);

    const streamUrl =
        type === "movie"
            ? currentProvider.getMovieUrl(mediaId)
            : currentProvider.getTVUrl(mediaId, season, episode);

    // Get premium brand info for current provider
    const currentBrand = getPremiumBrand(currentProvider.id);

    // Auto-failover logic - try next provider on failure
    const tryNextProvider = useCallback(() => {
        const currentIndex = providers.findIndex(p => p.id === currentProvider.id);
        const nextIndex = currentIndex + 1;
        
        if (nextIndex < providers.length) {
            const nextProvider = providers[nextIndex];
            setCurrentProvider(nextProvider);
            setCurrentAttemptIndex(nextIndex);
            setIsConnecting(true);
            
            // Reset player with new provider
            setShowPlayer(false);
            setTimeout(() => setShowPlayer(true), 100);
            
            // Reset extraction state for new provider
            setExtractedUrl(null);
            setExtractionFailed(false);
            setUseCustomPlayer(false);
        } else {
            setIsConnecting(false);
        }
    }, [currentProvider.id]);

    // Handle iframe load error
    const handleIframeError = useCallback(() => {
        // Mark current provider as failed
        setConnectionAttempts(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].status === "attempting") {
                updated[lastIndex] = { ...updated[lastIndex], status: "failed" };
            }
            return updated;
        });

        // Try next provider after a short delay
        setTimeout(() => {
            tryNextProvider();
        }, 1500);
    }, [tryNextProvider]);

    // Handle successful connection
    const handleIframeLoad = useCallback(() => {
        setIsConnecting(false);
        // Mark current provider as success
        setConnectionAttempts(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].status === "attempting") {
                updated[lastIndex] = { ...updated[lastIndex], status: "success" };
            }
            return updated;
        });
    }, []);

    // Initialize first connection attempt
    useEffect(() => {
        const initialAttempt: ConnectionAttempt = {
            provider: providers[0],
            status: "attempting",
            timestamp: Date.now()
        };
        setConnectionAttempts([initialAttempt]);
        setCurrentAttemptIndex(0);
        setIsConnecting(true);
    }, []);

    // Extract video URL when player is shown
    const extractVideoUrl = useCallback(async () => {
        if (extractedUrl || isExtracting || extractionFailed) return;
        
        setIsExtracting(true);
        
        try {
            const params = new URLSearchParams({
                mediaId: mediaId.toString(),
                type,
                provider: currentProvider.id,
            });
            
            if (type === "tv") {
                params.set("season", season.toString());
                params.set("episode", episode.toString());
            }
            
            const response = await fetch(`/api/stream/extract?${params}`);
            const data = await response.json();
            
            if (data.success && data.videoUrl) {
                setExtractedUrl(data.videoUrl);
                setUseCustomPlayer(true);
            } else {
                setExtractionFailed(true);
                setUseCustomPlayer(false);
            }
        } catch (error) {
            console.error("Video extraction error:", error);
            setExtractionFailed(true);
            setUseCustomPlayer(false);
        } finally {
            setIsExtracting(false);
        }
    }, [mediaId, type, season, episode, currentProvider.id, extractedUrl, isExtracting, extractionFailed]);

    // Trigger video extraction when player is shown
    useEffect(() => {
        if (showPlayer && !extractedUrl && !extractionFailed && !isExtracting) {
            // Delay extraction slightly to allow player to initialize
            const timer = setTimeout(() => {
                extractVideoUrl();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [showPlayer, extractedUrl, extractionFailed, isExtracting, extractVideoUrl]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (failTimeoutRef.current) {
                clearTimeout(failTimeoutRef.current);
            }
        };
    }, []);

    // Handle manual provider selection
    const handleProviderSelect = (provider: Provider) => {
        setCurrentProvider(provider);
        setIsDropdownOpen(false);
        
        // Add new attempt
        const newAttempt: ConnectionAttempt = {
            provider,
            status: "attempting",
            timestamp: Date.now()
        };
        setConnectionAttempts(prev => [...prev, newAttempt]);
        
        // Reset player to show new source
        if (showPlayer) {
            setShowPlayer(false);
            setTimeout(() => {
                setShowPlayer(true);
                setIsConnecting(true);
            }, 100);
        }
    };

    // Get status color class
    const getStatusColor = (status: "attempting" | "success" | "failed") => {
        switch (status) {
            case "success": return "text-emerald-400";
            case "failed": return "text-rose-500";
            default: return "text-amber-400";
        }
    };

    // Get status icon
    const getStatusIcon = (status: "attempting" | "success" | "failed") => {
        switch (status) {
            case "success": return <CheckCircle2 size={14} className="text-emerald-400" />;
            case "failed": return <XCircle size={14} className="text-rose-500" />;
            default: return <Loader2 size={14} className="text-amber-400 animate-spin" />;
        }
    };

    return (
        <div className="relative w-full bg-card">
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                {/* Premium Status Indicator Bar */}
                {connectionAttempts.length > 0 && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-background via-background/95 to-background rounded-xl border border-border/50 shadow-lg">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            {/* Connection Status */}
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isConnecting ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-emerald-500/10 border border-emerald-500/30'}`}>
                                    {isConnecting ? (
                                        <Loader2 size={14} className="text-amber-400 animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                    )}
                                    <span className={`text-xs font-semibold ${isConnecting ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {isConnecting ? 'CONNECTING' : 'CONNECTED'}
                                    </span>
                                </div>
                                
                                {/* Current Source */}
                                <div className="flex items-center gap-2">
                                    <Zap size={14} className="text-primary/70" />
                                    <span className="text-sm font-medium text-foreground">
                                        {currentBrand.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {currentBrand.tagline}
                                    </span>
                                    {/* Extraction Status */}
                                    {isExtracting && (
                                        <span className="text-xs text-amber-400 animate-pulse">
                                            • Extracting...
                                        </span>
                                    )}
                                    {useCustomPlayer && extractedUrl && (
                                        <span className="text-xs text-emerald-400">
                                            • Direct Play
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Attempt Timeline */}
                            <div className="flex items-center gap-2 overflow-x-auto max-w-[400px] pb-1">
                                {connectionAttempts.map((attempt, index) => {
                                    const brand = getPremiumBrand(attempt.provider.id);
                                    return (
                                        <div key={`${attempt.provider.id}-${index}`} className="flex items-center gap-1">
                                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all duration-300 ${
                                                attempt.status === 'success' 
                                                    ? 'bg-emerald-500/15 border border-emerald-500/30' 
                                                    : attempt.status === 'failed'
                                                    ? 'bg-rose-500/10 border border-rose-500/20'
                                                    : 'bg-amber-500/15 border border-amber-500/30'
                                            }`}>
                                                {getStatusIcon(attempt.status)}
                                                <span className={getStatusColor(attempt.status)}>
                                                    {brand.name}
                                                </span>
                                            </div>
                                            {index < connectionAttempts.length - 1 && (
                                                <ChevronRight size={12} className="text-muted-foreground/50" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {isConnecting && (
                            <div className="mt-3 h-0.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 animate-pulse" style={{ width: '60%' }} />
                            </div>
                        )}
                    </div>
                )}

                {/* Player Container */}
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                    {!showPlayer ? (
                        <div
                            className="w-full h-full relative group cursor-pointer"
                            onClick={() => setShowPlayer(true)}>
                            {/* Placeholder with play button */}
                            <div className="w-full h-full bg-gradient-to-b from-black/50 to-black/80 flex items-center justify-center relative">
                                {/* Animated background effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                
                                <button className="relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary hover:bg-primary/90 transition-all duration-300 ease-in-out group-hover:scale-110 shadow-lg shadow-primary/30 z-10">
                                    <Play
                                        size={44}
                                        className="text-white ml-1"
                                        fill="white"
                                    />
                                </button>
                            </div>

                            {/* Instructions */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-overlay flex items-end">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/20 rounded-lg">
                                        <MonitorPlay className="text-primary" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-lg">
                                            Click to Watch {title}
                                        </p>
                                        <p className="text-gray-300 text-sm mt-1 flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-white/10 rounded text-xs">Streaming</span>
                                            {currentBrand.name}
                                            {runtime && ` • ${runtime} minutes`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative w-full h-full">
                            {/* Custom Video Player */}
                            {useCustomPlayer && extractedUrl ? (
                                <div className="relative w-full h-full">
                                    <VideoPlayer
                                        src={extractedUrl}
                                        type={extractedUrl.includes(".m3u8") ? "hls" : "mp4"}
                                        title={title}
                                        onError={() => {
                                            // Fall back to iframe on error
                                            setUseCustomPlayer(false);
                                            setExtractionFailed(true);
                                        }}
                                    />
                                    {/* Premium Overlay Badge */}
                                    <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/10 z-50">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                        <span className="text-xs font-medium text-white/90">{currentBrand.name} Direct</span>
                                    </div>
                                </div>
                            ) : (
                                <iframe
                                    ref={iframeRef}
                                    src={streamUrl}
                                    className="w-full h-full border-0"
                                    allowFullScreen
                                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                                    referrerPolicy="no-referrer"
                                    loading="eager"
                                    title={title}
                                    onError={handleIframeError}
                                    onLoad={handleIframeLoad}
                                />
                            )}
                            
                            {/* Premium Overlay Badge */}
                            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
                                <div className={`w-2 h-2 rounded-full ${isConnecting ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                                <span className="text-xs font-medium text-white/90">{currentBrand.name}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Provider Selector & Player Info */}
                <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                            {type === "tv" && (
                                <span className="text-sm px-3 py-1 bg-accent/20 text-accent rounded-full font-medium">
                                    TV Series
                                </span>
                            )}
                            {title}
                        </h1>
                        {type === "tv" && (
                            <p className="text-muted-foreground flex items-center gap-2">
                                <span className="text-primary font-semibold">Season {season}</span>
                                <span className="text-white/30">•</span>
                                <span>Episode {episode}</span>
                                {runtime && (
                                    <>
                                        <span className="text-white/30">•</span>
                                        <span>{runtime} min</span>
                                    </>
                                )}
                            </p>
                        )}
                    </div>

                    {/* Provider Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-muted hover:border-primary/50 transition-all">
                            <span className="text-muted-foreground">Source:</span>
                            <span className="font-medium">{currentBrand.name}</span>
                            <ChevronDown
                                size={16}
                                className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                            />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto bg-card border border-border rounded-xl shadow-2xl z-50">
                                <div className="p-2">
                                    <p className="text-xs text-muted-foreground px-3 py-2 uppercase tracking-wider font-semibold">
                                        Premium Streaming Sources
                                    </p>
                                    {providers.map((provider) => {
                                        const brand = getPremiumBrand(provider.id);
                                        const attempt = connectionAttempts.find(a => a.provider.id === provider.id);
                                        const status = attempt?.status;
                                        
                                        return (
                                            <button
                                                key={provider.id}
                                                onClick={() => handleProviderSelect(provider)}
                                                className={`w-full text-left px-4 py-3 rounded-lg text-sm hover:bg-muted transition-all duration-200 ${currentProvider.id === provider.id
                                                        ? "bg-primary/10 text-primary border border-primary/20"
                                                        : "text-foreground"
                                                    }`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold">{brand.name}</span>
                                                        <span className="text-xs text-muted-foreground">{brand.tagline}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {/* Tier Badge */}
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                                            provider.tier === 1 
                                                                ? 'bg-amber-500/20 text-amber-400' 
                                                                : provider.tier === 2
                                                                ? 'bg-blue-500/20 text-blue-400'
                                                                : 'bg-purple-500/20 text-purple-400'
                                                        }`}>
                                                            Tier {provider.tier}
                                                        </span>
                                                        {/* Status Indicator */}
                                                        {status && (
                                                            <div className="flex items-center">
                                                                {status === 'success' && <CheckCircle2 size={14} className="text-emerald-400" />}
                                                                {status === 'failed' && <XCircle size={14} className="text-rose-500" />}
                                                                {status === 'attempting' && <Loader2 size={14} className="text-amber-400 animate-spin" />}
                                                            </div>
                                                        )}
                                                        {currentProvider.id === provider.id && !status && (
                                                            <span className="w-2 h-2 bg-primary rounded-full" />
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    
                                    {/* Direct Play Button */}
                                    <div className="border-t border-border mt-2 pt-2">
                                        <button
                                            onClick={() => {
                                                setExtractedUrl(null);
                                                setExtractionFailed(false);
                                                setUseCustomPlayer(false);
                                                extractVideoUrl();
                                                setIsDropdownOpen(false);
                                            }}
                                            disabled={isExtracting}
                                            className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                                                isExtracting 
                                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                                    : "hover:bg-primary/10 text-primary border border-primary/20"
                                            }`}>
                                            <Film size={16} />
                                            <div className="flex flex-col text-left">
                                                <span className="font-semibold">
                                                    {isExtracting ? "Extracting..." : "Try Direct Play"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Extract direct video URL
                                                </span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
