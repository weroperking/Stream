"use client";

import { providers, type Provider } from "@/lib/providers";
import { Play, ChevronDown, MonitorPlay } from "lucide-react";
import { useState } from "react";

interface MediaPlayerProps {
    mediaId: number;
    type: "movie" | "tv";
    title: string;
    season?: number;
    episode?: number;
    runtime?: number;
}

export function MediaPlayer({
    mediaId,
    type,
    title,
    season = 1,
    episode = 1,
    runtime,
}: MediaPlayerProps) {
    const [showPlayer, setShowPlayer] = useState(true); // Auto-show player
    const [currentProvider, setCurrentProvider] = useState<Provider>(providers[0]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const streamUrl =
        type === "movie"
            ? currentProvider.getMovieUrl(mediaId)
            : currentProvider.getTVUrl(mediaId, season, episode);

    return (
        <div className="relative w-full bg-card">
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
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
                                            {currentProvider.name}
                                            {runtime && ` • ${runtime} minutes`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <iframe
                            src={streamUrl}
                            className="w-full h-full border-0"
                            allowFullScreen
                            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                            referrerPolicy="no-referrer"
                            loading="eager"
                            title={title}
                        />
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
                            <span className="font-medium">{currentProvider.name}</span>
                            <ChevronDown
                                size={16}
                                className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                            />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-card border border-border rounded-xl shadow-2xl z-50">
                                <div className="p-2">
                                    <p className="text-xs text-muted-foreground px-3 py-2 uppercase tracking-wider font-semibold">
                                        Select Streaming Source
                                    </p>
                                    {providers.map((provider) => (
                                        <button
                                            key={provider.id}
                                            onClick={() => {
                                                setCurrentProvider(provider);
                                                setIsDropdownOpen(false);
                                                // Reset player to show new source
                                                if (showPlayer) {
                                                    setShowPlayer(false);
                                                    setTimeout(() => setShowPlayer(true), 100);
                                                }
                                            }}
                                            className={`w-full text-left px-4 py-3 rounded-lg text-sm hover:bg-muted transition-colors flex items-center justify-between ${currentProvider.id === provider.id
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-foreground"
                                                }`}>
                                            <span>{provider.name}</span>
                                            {currentProvider.id === provider.id && (
                                                <span className="w-2 h-2 bg-primary rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
