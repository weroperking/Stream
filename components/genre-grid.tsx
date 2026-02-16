"use client";

import Link from "next/link";
import Image from "next/image";
import type { GenreWithThumbnail } from "@/lib/tmdb";
import { useState } from "react";

interface GenreGridProps {
  genres: GenreWithThumbnail[];
}

const GENRE_COLORS = {
  28: "#f87171", // Action - Light Red
  12: "#fb923c", // Adventure - Light Orange
  16: "#facc15", // Animation - Yellow
  35: "#a3e635", // Comedy - Light Lime
  80: "#4ade80", // Crime - Green
  99: "#22d3ee", // Documentary - Cyan
  18: "#60a5fa", // Drama - Light Blue
  10751: "#a78bfa", // Family - Light Purple
  14: "#c084fc", // Fantasy - Light Fuchsia
  27: "#f472b6", // Horror - Pink
  10749: "#f472b6", // Romance - Pink
  878: "#38bdf8", // Sci-Fi - Light Sky
  10770: "#fbbf24", // TV Movie - Amber
  53: "#fb7185", // Thriller - Light Red
  10752: "#d97706", // War - Dark Amber
  37: "#94a3b8", // Western - Slate
};

function GenreCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl h-40 md:h-56 animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
    </div>
  );
}

export function GenreGrid({ genres }: GenreGridProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const handleImageError = (genreId: number) => {
    setImageErrors((prev) => new Set(prev).add(genreId));
  };

  if (genres.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <GenreCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {genres.map((genre) => {
        const colorHex = GENRE_COLORS[genre.id as keyof typeof GENRE_COLORS] || "#6366f1";
        const isHovered = hoveredId === genre.id;
        const showFallback = imageErrors.has(genre.id) || !genre.thumbnailUrl || genre.thumbnailUrl.includes("abstract");
        const hasLogo = genre.logoUrl && !imageErrors.has(genre.id);

        return (
          <Link
            key={genre.id}
            href={`/genres/${genre.id}`}
            onMouseEnter={() => setHoveredId(genre.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              className="group relative overflow-hidden rounded-xl h-40 md:h-56 cursor-pointer transition-all duration-500 hover:z-10"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
                const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
                e.currentTarget.style.transform = `perspective(1000px) rotateX(${-y}deg) rotateY(${x}deg)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
              }}
            >
              {/* Background Image */}
              {!showFallback && genre.thumbnailUrl ? (
                <div className="absolute inset-0">
                  <Image
                    src={genre.thumbnailUrl}
                    alt={`${genre.name} movies`}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    className="object-cover transition-all duration-700 ease-out"
                    style={{
                      transform: isHovered ? "scale(1.05)" : "scale(1)",
                    }}
                    onError={() => handleImageError(genre.id)}
                    placeholder="blur"
                    blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                  />
                  {/* Gradient Overlay */}
                  <div
                    className="absolute inset-0 transition-all duration-500 ease-out"
                    style={{
                      background: isHovered
                        ? `linear-gradient(180deg, ${colorHex}30 0%, ${colorHex}50 30%, rgba(0,0,0,0.85) 100%)`
                        : `linear-gradient(180deg, ${colorHex}15 0%, ${colorHex}35 40%, rgba(0,0,0,0.8) 100%)`,
                    }}
                  />
                </div>
              ) : (
                <div
                  className="absolute inset-0 transition-all duration-500 ease-out"
                  style={{
                    background: isHovered
                      ? `linear-gradient(180deg, ${colorHex}50 0%, ${colorHex}70 50%, rgba(0,0,0,0.85) 100%)`
                      : `linear-gradient(180deg, ${colorHex}30 0%, ${colorHex}50 100%)`,
                  }}
                />
              )}

              {/* Gradient Border - Full card border on hover */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  border: `2px solid ${colorHex}`,
                  boxShadow: `0 0 20px ${colorHex}60, inset 0 0 20px ${colorHex}20`,
                }}
              />

              {/* Top Movie Logo with Gradient Shadow */}
              {hasLogo && genre.logoUrl && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[55%] z-10">
                  <div
                    className="absolute inset-0 blur-2xl opacity-50 transform scale-110"
                    style={{
                      background: `linear-gradient(180deg, ${colorHex}60 0%, transparent 100%)`,
                    }}
                  />
                  <Image
                    src={genre.logoUrl}
                    alt={`${genre.topMovieTitle} logo`}
                    width={280}
                    height={100}
                    className="max-w-[180px] md:max-w-[240px] h-auto object-contain drop-shadow-2xl transition-all duration-500"
                    style={{
                      filter: isHovered
                        ? "drop-shadow(0 0 25px rgba(255,255,255,0.4))"
                        : "drop-shadow(0 4px 15px rgba(0,0,0,0.5))",
                      transform: isHovered ? "scale(1.05)" : "scale(1)",
                    }}
                    onError={() => handleImageError(genre.id)}
                  />
                </div>
              )}

              {/* Glassy Genre Title Box - Positioned at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3"
                style={{
                  transform: isHovered ? "translateY(-5px)" : "translateY(0)",
                }}
              >
                {/* Glassy Background */}
                <div
                  className="rounded-lg backdrop-blur-md transition-all duration-300"
                  style={{
                    background: isHovered
                      ? `linear-gradient(180deg, ${colorHex}60 0%, ${colorHex}40 100%)`
                      : "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.95) 100%)",
                    border: `1px solid ${colorHex}70`,
                    boxShadow: isHovered
                      ? `0 0 25px ${colorHex}50, inset 0 0 15px ${colorHex}30`
                      : "0 4px 20px rgba(0,0,0,0.4)",
                    padding: "12px 20px",
                  }}
                >
                  {/* Top border highlight */}
                  <div
                    className="absolute inset-x-2 top-0 h-[1px] rounded-full opacity-60"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${colorHex}, transparent)`,
                    }}
                  />
                  
                  {/* Genre Name */}
                  <h3
                    className="text-base md:text-lg font-bold text-white text-center transition-all duration-300"
                    style={{
                      textShadow: isHovered
                        ? `0 0 25px ${colorHex}80`
                        : "0 2px 10px rgba(0,0,0,0.8)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {genre.name}
                  </h3>
                </div>
              </div>

              {/* Shine Effect */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none rounded-xl"
                style={{
                  background: "linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)",
                  transform: isHovered ? "translateX(100%)" : "translateX(-100%)",
                  animation: isHovered ? "shine 1s ease-in-out" : "none",
                }}
              />

              {/* Top Movie Label */}
              <div
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0 z-20"
                style={{
                  background: `linear-gradient(135deg, ${colorHex}80 0%, ${colorHex}60 100%)`,
                  backdropFilter: "blur(8px)",
                  border: `1px solid ${colorHex}70`,
                  boxShadow: `0 0 15px ${colorHex}40`,
                }}
              >
                <p className="text-xs text-white truncate max-w-[140px] font-medium">
                  {genre.topMovieTitle}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
