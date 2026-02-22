"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

interface VideoPlayerProps {
    src: string;
    type?: "mp4" | "hls" | "video/mp4" | "application/x-mpegURL";
    poster?: string;
    title?: string;
    onError?: (error: Error) => void;
    onReady?: () => void;
    onEnded?: () => void;
    autoplay?: boolean;
    initialTime?: number;
    /** Callback when time updates - receives current time in seconds */
    onTimeUpdate?: (currentTime: number) => void;
    /** Callback when video is paused */
    onPause?: () => void;
    /** Callback when user seeks - receives new time in seconds */
    onSeek?: (time: number) => void;
    /** Callback when duration is determined */
    onDurationChange?: (duration: number) => void;
}

export function VideoPlayer({
    src,
    type = "video/mp4",
    poster,
    title,
    onError,
    onReady,
    onEnded,
    autoplay = false,
    initialTime = 0,
    onTimeUpdate,
    onPause,
    onSeek,
    onDurationChange,
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<videojs.Player | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Format time for display
    const formatTime = (seconds: number): string => {
        if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        }
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    // Initialize video.js player
    useEffect(() => {
        if (!videoRef.current) return;

        // Dynamic import to avoid SSR issues
        import("video.js").then((videojs) => {
            if (!videoRef.current || playerRef.current) return;

            // Determine the correct MIME type
            let mimeType = type;
            if (src.includes(".m3u8") || type === "application/x-mpegURL" || type === "hls") {
                mimeType = "application/x-mpegURL";
            } else if (type === "mp4" || type === "video/mp4") {
                mimeType = "video/mp4";
            }

            const player = videojs.default(videoRef.current, {
                autoplay: autoplay,
                controls: false, // We'll use custom controls
                responsive: true,
                fluid: false,
                preload: "auto",
                poster: poster,
                sources: [{
                    src: src,
                    type: mimeType as string,
                }],
                html5: {
                    vhs: {
                        overrideNative: true,
                    },
                },
            });

            playerRef.current = player;

            // Player event handlers
            player.on("ready", () => {
                setIsLoading(false);
                if (initialTime > 0) {
                    player.currentTime(initialTime);
                }
                const dur = player.duration() || 0;
                setDuration(dur);
                onDurationChange?.(dur);
                onReady?.();
            });

            player.on("play", () => {
                setIsPlaying(true);
                setIsPaused(false);
            });

            player.on("pause", () => {
                setIsPaused(true);
                onPause?.();
            });

            player.on("timeupdate", () => {
                const time = player.currentTime() || 0;
                setCurrentTime(time);
                onTimeUpdate?.(time);
            });

            player.on("durationchange", () => {
                const dur = player.duration() || 0;
                setDuration(dur);
                onDurationChange?.(dur);
            });

            player.on("seeked", () => {
                const time = player.currentTime() || 0;
                onSeek?.(time);
            });

            player.on("progress", () => {
                if (player.buffered().length > 0) {
                    const bufferedEnd = player.buffered().end(player.buffered().length - 1);
                    setBuffered((bufferedEnd / player.duration()) * 100);
                }
            });

            player.on("volumechange", () => {
                setVolume(player.volume() || 1);
                setIsMuted(player.muted() || false);
            });

            player.on("ended", () => {
                setIsPlaying(false);
                onEnded?.();
            });

            player.on("error", () => {
                const error = player.error();
                setError(error?.message || "Video playback error");
                onError?.(new Error(error?.message || "Video playback error"));
            });

            player.on("waiting", () => {
                setIsLoading(true);
            });

            player.on("canplay", () => {
                setIsLoading(false);
            });

            // Cleanup
            return () => {
                if (playerRef.current) {
                    playerRef.current.dispose();
                    playerRef.current = null;
                }
            };
        });
    }, [src, type, poster, autoplay, initialTime, onError, onReady, onEnded, onTimeUpdate, onPause, onSeek, onDurationChange]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!playerRef.current) return;

            // Ignore if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case " ":
                case "k":
                    e.preventDefault();
                    if (isPlaying) {
                        playerRef.current.pause();
                    } else {
                        playerRef.current.play();
                    }
                    break;
                case "f":
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case "m":
                    e.preventDefault();
                    toggleMute();
                    break;
                case "arrowup":
                    e.preventDefault();
                    adjustVolume(0.1);
                    break;
                case "arrowdown":
                    e.preventDefault();
                    adjustVolume(-0.1);
                    break;
                case "arrowleft":
                    e.preventDefault();
                    seek(-10);
                    break;
                case "arrowright":
                    e.preventDefault();
                    seek(10);
                    break;
                case "0":
                case "home":
                    e.preventDefault();
                    seekTo(0);
                    break;
                case "end":
                    e.preventDefault();
                    seekTo(duration);
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isPlaying, duration]);

    // Fullscreen change handler
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    // Auto-hide controls
    const resetControlsTimeout = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    }, [isPlaying]);

    // Player control functions
    const togglePlay = () => {
        if (!playerRef.current) return;
        if (isPlaying) {
            playerRef.current.pause();
        } else {
            playerRef.current.play();
        }
    };

    const toggleMute = () => {
        if (!playerRef.current) return;
        playerRef.current.muted(!isMuted);
    };

    const adjustVolume = (delta: number) => {
        if (!playerRef.current) return;
        const newVolume = Math.max(0, Math.min(1, volume + delta));
        playerRef.current.volume(newVolume);
    };

    const seek = (seconds: number) => {
        if (!playerRef.current) return;
        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        playerRef.current.currentTime(newTime);
    };

    const seekTo = (time: number) => {
        if (!playerRef.current) return;
        playerRef.current.currentTime(time);
    };

    const toggleFullscreen = async () => {
        if (!containerRef.current) return;

        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error("Fullscreen error:", err);
        }
    };

    const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!playerRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        playerRef.current.currentTime(pos * duration);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!playerRef.current) return;
        playerRef.current.volume(parseFloat(e.target.value));
    };

    // Calculate progress percentage
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const bufferedPercent = duration > 0 ? buffered : 0;

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-black group"
            onMouseMove={resetControlsTimeout}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
            />

            {/* Loading Spinner */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">                    <div className="text-center p-6">
                        <div className="text-red-500 mb-2">
                            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <p className="text-white text-lg font-medium">Playback Error</p>
                        <p className="text-gray-400 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Click to play overlay (when paused) */}
            {!isPlaying && !isLoading && !error && (
                <div
                    className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
                    onClick={togglePlay}
                >
                    <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-all transform hover:scale-110 shadow-lg shadow-primary/30">
                        <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Custom Controls Overlay */}
            <div
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-4 px-4 transition-opacity duration-300 z-20 ${
                    showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            >
                {/* Title (if provided) */}
                {title && (
                    <div className="mb-3">
                        <h3 className="text-white font-semibold text-lg truncate">{title}</h3>
                    </div>
                )}

                {/* Progress Bar */}
                <div className="mb-3 group/progress">
                    <div
                        className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group-hover/progress:h-2 transition-all"
                        onClick={handleSeekBarClick}
                    >
                        {/* Buffered */}
                        <div
                            className="absolute h-full bg-white/30 rounded-full"
                            style={{ width: `${bufferedPercent}%` }}
                        />
                        {/* Progress */}
                        <div
                            className="absolute h-full bg-primary rounded-full"
                            style={{ width: `${progressPercent}%` }}
                        />
                        {/* Seek Handle */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                            style={{ left: `${progressPercent}%`, transform: "translate(-50%, -50%)" }}
                        />
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Play/Pause */}
                        <button
                            onClick={togglePlay}
                            className="text-white hover:text-primary transition-colors p-1"
                            aria-label={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? (
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                            ) : (
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            )}
                        </button>

                        {/* Skip Backward */}
                        <button
                            onClick={() => seek(-10)}
                            className="text-white hover:text-primary transition-colors"
                            aria-label="Rewind 10 seconds"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                            </svg>
                        </button>

                        {/* Skip Forward */}
                        <button
                            onClick={() => seek(10)}
                            className="text-white hover:text-primary transition-colors"
                            aria-label="Forward 10 seconds"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                            </svg>
                        </button>

                        {/* Volume */}
                        <div
                            className="relative flex items-center"
                            onMouseEnter={() => setShowVolumeSlider(true)}
                            onMouseLeave={() => setShowVolumeSlider(false)}
                        >
                            <button
                                onClick={toggleMute}
                                className="text-white hover:text-primary transition-colors"
                                aria-label={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted || volume === 0 ? (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    </svg>
                                ) : volume < 0.5 ? (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                )}
                            </button>

                            {/* Volume Slider */}
                            <div
                                className={`absolute left-full ml-2 flex items-center bg-black/80 rounded-lg px-3 py-2 transition-all duration-200 ${
                                    showVolumeSlider ? "opacity-100 visible" : "opacity-0 invisible"
                                }`}
                            >
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                        </div>

                        {/* Time Display */}
                        <div className="text-white text-sm font-medium tabular-nums">
                            <span>{formatTime(currentTime)}</span>
                            <span className="text-white/50 mx-1">/</span>
                            <span className="text-white/70">{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Quality Selector (placeholder) */}
                        <div className="relative">
                            <button
                                onClick={() => setShowQualityMenu(!showQualityMenu)}
                                className="text-white hover:text-primary transition-colors text-sm font-medium px-2 py-1"
                            >
                                HD
                            </button>
                            {showQualityMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg py-2 min-w-[100px]">
                                    <button className="w-full text-left px-4 py-2 text-white hover:bg-white/10 text-sm">
                                        Auto
                                    </button>
                                    <button className="w-full text-left px-4 py-2 text-white hover:bg-white/10 text-sm">
                                        1080p
                                    </button>
                                    <button className="w-full text-left px-4 py-2 text-white hover:bg-white/10 text-sm">
                                        720p
                                    </button>
                                    <button className="w-full text-left px-4 py-2 text-white hover:bg-white/10 text-sm">
                                        480p
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Fullscreen */}
                        <button
                            onClick={toggleFullscreen}
                            className="text-white hover:text-primary transition-colors"
                            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                        >
                            {isFullscreen ? (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Center Play Button (appears on pause) */}
            {isPaused && !isLoading && (
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                    onClick={togglePlay}
                >
                    <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-all transform hover:scale-110 shadow-lg shadow-primary/30 cursor-pointer">
                        <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
}
