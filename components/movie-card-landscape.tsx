"use client";

import { MoreInfoModal } from "@/components/more-info-modal";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { Movie } from "@/lib/tmdb";
import { getImageUrl } from "@/lib/tmdb";
import { Bookmark, Info, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface MovieCardLandscapeProps {
    movie: Movie;
}

export function MovieCardLandscape({ movie }: MovieCardLandscapeProps) {
    const [showModal, setShowModal] = useState(false);

    const linkHref = "name" in movie || !!(movie as any).first_air_date ? `/tv/${movie.id}` : `/movie/${movie.id}`;
    const releaseDate = "first_air_date" in movie ? (movie as any).first_air_date : movie.release_date;
    const title = "name" in movie ? (movie as any).name : movie.title;

    const { isSaved, toggleSave } = useWatchlist();
    const saved = isSaved(movie.id);

    // Use backdrop image for landscape cards
    const imageUrl = getImageUrl(movie.backdrop_path || movie.poster_path, "w780") || "/placeholder.svg";

    return (
        <>
            <Link href={linkHref} className="block h-full">
                <div className="group cursor-pointer h-full relative rounded-md overflow-hidden transition-all duration-300 hover:scale-105 hover:z-10">
                    <div className="relative overflow-hidden rounded-md aspect-video bg-card">
                        <Image
                            src={imageUrl}
                            alt={title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 280px, (max-width: 768px) 320px, (max-width: 1024px) 360px, 400px"
                        />

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300" />

                        {/* Content Overlay */}
                        <div className="absolute inset-0 flex flex-col justify-end p-4">
                            {/* Center Buttons - Show on hover */}
                            <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                {/* Play Button */}
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:bg-white/90 shadow-lg transition-colors text-black">
                                    <Play size={20} fill="currentColor" />
                                </div>

                                {/* Info Button */}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowModal(true);
                                    }}
                                    className="w-12 h-12 rounded-full border-2 border-gray-300 hover:border-white flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white transition-all"
                                >
                                    <Info size={20} />
                                </button>

                                {/* Save Button */}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleSave(movie);
                                    }}
                                    className={`w-12 h-12 rounded-full border-2 ${saved ? "border-yellow-400 bg-yellow-400/20" : "border-gray-300 bg-black/40"} hover:border-white flex items-center justify-center backdrop-blur-sm transition-all ${saved ? "text-yellow-400" : "text-white hover:text-yellow-400"}`}
                                >
                                    <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
                                </button>
                            </div>

                            {/* Title and Info - Always visible at bottom */}
                            <div className="relative z-10 space-y-1">
                                <h3 className="font-semibold text-white text-sm md:text-base line-clamp-1 drop-shadow-lg">
                                    {title}
                                </h3>
                                <div className="flex items-center gap-2 text-white/90 text-xs md:text-sm">
                                    <span className="font-medium text-green-400">
                                        ★ {movie.vote_average.toFixed(1)}
                                    </span>
                                    <span>
                                        {releaseDate ? new Date(releaseDate).getFullYear() : "N/A"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>

            <MoreInfoModal
                movie={movie}
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            />
        </>
    );
}
