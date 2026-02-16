"use client";
import { useEffect, useState } from "react";
import type { Movie } from "@/lib/tmdb";

// Helper to check if running on client (for localStorage access)
const isBrowser = typeof window !== "undefined";

export function useWatchlist() {
    const [savedMovies, setSavedMovies] = useState<Movie[]>([]);

    // Initialize from localStorage on mount
    useEffect(() => {
        if (!isBrowser) return;

        try {
            const saved = localStorage.getItem("watchlist");
            if (saved) {
                setSavedMovies(JSON.parse(saved));
            }
        } catch (error) {
            console.error("Failed to parse watchlist from localStorage", error);
        }
    }, []);

    const saveMovie = (movie: Movie) => {
        setSavedMovies((prev) => {
            const exists = prev.some((m) => m.id === movie.id);
            if (exists) return prev;

            const updated = [...prev, movie];
            localStorage.setItem("watchlist", JSON.stringify(updated));
            return updated;
        });
    };

    const removeMovie = (movieId: number) => {
        setSavedMovies((prev) => {
            const updated = prev.filter((m) => m.id !== movieId);
            localStorage.setItem("watchlist", JSON.stringify(updated));
            return updated;
        });
    };

    const isSaved = (movieId: number) => {
        return savedMovies.some((m) => m.id === movieId);
    };

    const toggleSave = (movie: Movie) => {
        if (isSaved(movie.id)) {
            removeMovie(movie.id);
        } else {
            saveMovie(movie);
        }
    };

    return {
        savedMovies,
        saveMovie,
        removeMovie,
        isSaved,
        toggleSave,
    };
}
