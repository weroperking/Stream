"use client";

import { HorizontalMovieRow } from "@/components/horizontal-movie-row";
import { Navbar } from "@/components/navbar";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useEffect, useState } from "react";

export default function SavedPage() {
    const { savedMovies } = useWatchlist();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null; // Avoid hydration mismatch
    }

    // Separate movies and TV shows
    const movies = savedMovies.filter((item) => !("name" in item) && !("first_air_date" in item));
    const tvShows = savedMovies.filter((item) => ("name" in item) || ("first_air_date" in item));

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-black text-white">
                <div className="pt-20 pb-8">
                    <div className="px-4 md:px-12 mb-8">
                        <div className="flex items-center gap-4">
                            <h1 className="text-4xl md:text-5xl font-bold font-display-title">My List</h1>
                            <span className="text-gray-400 text-xl">
                                ({savedMovies.length})
                            </span>
                        </div>
                        <p className="text-gray-400 mt-2">
                            Your saved movies and TV shows
                        </p>
                    </div>

                    {savedMovies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-gray-400"
                                >
                                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-semibold mb-3">
                                Your list is empty
                            </h2>
                            <p className="text-gray-400 max-w-md">
                                Movies and TV shows that you add to your list will appear here.
                                Start exploring and save your favorites!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8 md:space-y-12">
                            {movies.length > 0 && (
                                <HorizontalMovieRow
                                    title="Saved Movies"
                                    movies={movies}
                                />
                            )}
                            {tvShows.length > 0 && (
                                <HorizontalMovieRow
                                    title="Saved TV Shows"
                                    movies={tvShows}
                                />
                            )}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
