"use client";

import { X, Search, SlidersHorizontal, Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchMultiSearchAction, fetchCustomFeedAction } from "@/app/actions";
import { getImageUrl, type Movie, type MultiSearchResult } from "@/lib/tmdb";
import Image from "next/image";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";
import { AutoSlidingRow } from "./auto-sliding-row";

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMovies: Movie[]; // For instant loading - trending movies
}

// Filter options interface
interface FilterOptions {
    type: "movie" | "tv" | "all";
    region: string;
    genre: number;
    year: number;
    sortBy: string;
}

// Predefined filter options
const REGIONS = [
    { code: "US", name: "United States" },
    { code: "EG", name: "Egypt" },
    { code: "KR", name: "South Korea" },
    { code: "IN", name: "India" },
    { code: "NG", name: "Nigeria" },
    { code: "GB", name: "United Kingdom" },
    { code: "JP", name: "Japan" },
    { code: "MX", name: "Mexico" },
    { code: "BR", name: "Brazil" },
    { code: "FR", name: "France" },
];

const GENRES = [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" },
    { id: 99, name: "Documentary" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
    { id: 14, name: "Fantasy" },
    { id: 36, name: "History" },
    { id: 27, name: "Horror" },
    { id: 10402, name: "Music" },
    { id: 9648, name: "Mystery" },
    { id: 10749, name: "Romance" },
    { id: 878, name: "Science Fiction" },
    { id: 10770, name: "TV Movie" },
    { id: 53, name: "Thriller" },
    { id: 10752, name: "War" },
    { id: 37, name: "Western" },
];

const SORT_OPTIONS = [
    { value: "popularity.desc", name: "Most Popular" },
    { value: "vote_average.desc", name: "Top Rated" },
    { value: "release_date.desc", name: "Latest" },
    { value: "revenue.desc", name: "Highest Revenue" },
];

const TYPE_OPTIONS = [
    { value: "all", name: "All" },
    { value: "movie", name: "Movies" },
    { value: "tv", name: "TV Shows" },
];

export function SearchModal({
    isOpen,
    onClose,
    initialMovies,
}: SearchModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MultiSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterOptions>({
        type: "all",
        region: "US",
        genre: 0,
        year: 0,
        sortBy: "popularity.desc",
    });
    const [hasActiveFilters, setHasActiveFilters] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debouncedQuery = useDebounce(query, 300);

    // Check for active filters
    useEffect(() => {
        const active = filters.type !== "all" || filters.region !== "US" || 
                       filters.genre > 0 || filters.year > 0 || 
                       filters.sortBy !== "popularity.desc";
        setHasActiveFilters(active);
    }, [filters]);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setResults([]);
            setFilters({
                type: "all",
                region: "US",
                genre: 0,
                year: 0,
                sortBy: "popularity.desc",
            });
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Search logic
    useEffect(() => {
        const search = async () => {
            // If there's a query, use multi-search
            if (debouncedQuery.trim().length > 0) {
                setIsLoading(true);
                try {
                    const data = await fetchMultiSearchAction(debouncedQuery, 1);
                    // Filter by type if not "all"
                    let filteredData = data;
                    if (filters.type !== "all") {
                        filteredData = data.filter(item => item.media_type === filters.type);
                    }
                    setResults(filteredData);
                } catch (error) {
                    console.error("Search failed", error);
                } finally {
                    setIsLoading(false);
                }
                return;
            }

            // If no query but has filters, use custom feed
            if (hasActiveFilters) {
                setIsLoading(true);
                try {
                    const type = filters.type === "all" ? "movie" : filters.type;
                    const data = await fetchCustomFeedAction({
                        type,
                        region: filters.region,
                        genre: filters.genre,
                        year: filters.year,
                        sortBy: filters.sortBy,
                        page: 1
                    });
                    setResults(data);
                } catch (error) {
                    console.error("Custom feed failed", error);
                } finally {
                    setIsLoading(false);
                }
                return;
            }

            // Default: show trending
            setResults([]);
        };

        search();
    }, [debouncedQuery, filters, hasActiveFilters]);

    // Close on esc
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    if (!isOpen) return null;

    // Split trending movies into rows
    const row1 = initialMovies.slice(0, 10);
    const row2 = initialMovies.slice(10, 20);
    const row3 = initialMovies.slice(0, 10); // Reuse for third row

    return (
        <div
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-lg flex items-start justify-center overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="relative w-full min-h-screen bg-black"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="fixed top-6 right-6 z-20 p-3 rounded-full bg-black/80 text-white hover:bg-white/20 transition-all border border-white/20 hover:scale-110"
                >
                    <X size={24} />
                </button>

                {/* Header with Search Input */}
                <div className="sticky top-0 z-10 bg-gradient-to-b from-black via-black to-transparent pt-4 pb-4">
                    <div className="max-w-3xl mx-auto px-4 md:px-8">
                        <div 
                            className="relative group"
                            ref={containerRef}
                            onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                setMousePos({ x, y });
                            }}
                        >
                            {/* Background gradient that follows cursor */}
                            <div 
                                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none -z-10"
                                style={{
                                    background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(220, 38, 38, 0.4) 0%, rgba(220, 38, 38, 0.15) 40%, transparent 70%)`,
                                }}
                            />
                            <Search
                                className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 z-10"
                                size={24}
                            />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search for movies, TV shows..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-transparent border-0 rounded-full py-4 md:py-5 pl-14 pr-32 text-lg md:text-xl text-white placeholder-white/40 focus:outline-none transition-all backdrop-blur-md relative z-0"
                                style={{
                                    background: `linear-gradient(135deg, rgba(30, 30, 30, 0.4) 0%, rgba(20, 20, 20, 0.6) 100%)`,
                                }}
                            />
                            {/* Filter Button */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all z-10 ${
                                    showFilters || hasActiveFilters 
                                        ? "bg-red-600 text-white" 
                                        : "bg-white/10 text-white/60 hover:bg-white/20"
                                }`}
                            >
                                <SlidersHorizontal size={20} />
                            </button>
                        </div>

                        {/* Filter Dropdown */}
                        {showFilters && (
                            <div className="mt-4 p-4 bg-zinc-900/95 backdrop-blur-lg rounded-2xl border border-white/10 animate-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {/* Type */}
                                    <div>
                                        <label className="text-white/60 text-xs uppercase tracking-wider mb-2 block">Type</label>
                                        <div className="flex flex-wrap gap-1">
                                            {TYPE_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setFilters({ ...filters, type: opt.value as any })}
                                                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                                                        filters.type === opt.value
                                                            ? "bg-red-600 text-white"
                                                            : "bg-white/10 text-white/60 hover:bg-white/20"
                                                    }`}
                                                >
                                                    {opt.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Region */}
                                    <div>
                                        <label className="text-white/60 text-xs uppercase tracking-wider mb-2 block">Region</label>
                                        <select
                                            value={filters.region}
                                            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                                            className="w-full bg-white/10 border-0 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                                        >
                                            {REGIONS.map((r) => (
                                                <option key={r.code} value={r.code} className="bg-zinc-900">
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Genre */}
                                    <div>
                                        <label className="text-white/60 text-xs uppercase tracking-wider mb-2 block">Genre</label>
                                        <select
                                            value={filters.genre}
                                            onChange={(e) => setFilters({ ...filters, genre: parseInt(e.target.value) })}
                                            className="w-full bg-white/10 border-0 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                                        >
                                            <option value={0} className="bg-zinc-900">All Genres</option>
                                            {GENRES.map((g) => (
                                                <option key={g.id} value={g.id} className="bg-zinc-900">
                                                    {g.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Sort By */}
                                    <div>
                                        <label className="text-white/60 text-xs uppercase tracking-wider mb-2 block">Sort By</label>
                                        <select
                                            value={filters.sortBy}
                                            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                                            className="w-full bg-white/10 border-0 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                                        >
                                            {SORT_OPTIONS.map((s) => (
                                                <option key={s.value} value={s.value} className="bg-zinc-900">
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Year */}
                                <div className="mt-4">
                                    <label className="text-white/60 text-xs uppercase tracking-wider mb-2 block">Year</label>
                                    <input
                                        type="number"
                                        min="1900"
                                        max="2030"
                                        value={filters.year || ""}
                                        onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) || 0 })}
                                        placeholder="Any year"
                                        className="w-full md:w-48 bg-white/10 border-0 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                                    />
                                </div>

                                {/* Active Filters Display */}
                                {hasActiveFilters && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-wrap gap-2">
                                                {filters.type !== "all" && (
                                                    <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded-full">
                                                        {filters.type === "movie" ? "Movies" : "TV Shows"}
                                                    </span>
                                                )}
                                                {filters.region !== "US" && (
                                                    <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded-full">
                                                        {REGIONS.find(r => r.code === filters.region)?.name}
                                                    </span>
                                                )}
                                                {filters.genre > 0 && (
                                                    <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded-full">
                                                        {GENRES.find(g => g.id === filters.genre)?.name}
                                                    </span>
                                                )}
                                                {filters.year > 0 && (
                                                    <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded-full">
                                                        {filters.year}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setFilters({
                                                    type: "all",
                                                    region: "US",
                                                    genre: 0,
                                                    year: 0,
                                                    sortBy: "popularity.desc",
                                                })}
                                                className="text-white/60 hover:text-white text-sm transition-colors"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="pb-12">
                    {query.trim() === "" && !hasActiveFilters ? (
                        // Auto-sliding trending rows when no search query and no filters
                        <div className="space-y-8 md:space-y-12 mt-8">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 font-display-title">
                                    Trending Now
                                </h2>
                            </div>

                            <AutoSlidingRow
                                title="Popular This Week"
                                movies={row1}
                                direction="right"
                                speed={30}
                            />
                            <AutoSlidingRow
                                title="Trending Movies"
                                movies={row2}
                                direction="left"
                                speed={25}
                            />
                            <AutoSlidingRow
                                title="Must Watch"
                                movies={row3}
                                direction="right"
                                speed={35}
                            />
                        </div>
                    ) : (
                        // Search results
                        <div className="px-4 md:px-8 mt-8">
                            <h3 className="text-white/60 text-sm font-medium uppercase tracking-wider mb-6">
                                {isLoading 
                                    ? "Searching..." 
                                    : hasActiveFilters 
                                        ? `Filtered Results (${results.length})` 
                                        : `Results for "${query}"`
                                }
                            </h3>

                            {isLoading ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-pulse">
                                    {[...Array(10)].map((_, i) => (
                                        <div key={i} className="aspect-video bg-zinc-800 rounded-lg" />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                                    {results.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={`/${item.media_type}/${item.id}`}
                                            onClick={onClose}
                                            className="group"
                                        >
                                            <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 shadow-lg border border-white/10 group-hover:border-red-600/50 transition-all group-hover:scale-105">
                                                <Image
                                                    src={
                                                        getImageUrl(
                                                            item.backdrop_path || item.poster_path,
                                                            "w780"
                                                        ) || "/placeholder.svg"
                                                    }
                                                    alt={item.title || item.name || ""}
                                                    fill
                                                    className="object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                                                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                                                    <p className="text-white font-bold text-sm md:text-base line-clamp-2 mb-1">
                                                        {item.title || item.name}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-green-400 text-xs font-bold">
                                                            ★ {item.vote_average.toFixed(1)}
                                                        </span>
                                                        <span className="text-white/60 text-xs">
                                                            {item.release_date?.split("-")[0] || item.first_air_date?.split("-")[0]}
                                                        </span>
                                                        <span className="text-white/40 text-xs uppercase">
                                                            {item.media_type}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                    {results.length === 0 && !isLoading && (
                                        <div className="col-span-full py-20 text-center">
                                            <p className="text-white/40 text-xl">No results found</p>
                                            <p className="text-white/30 text-sm mt-2">Try searching for something else</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
