"use client";

import { Suspense } from "react";
import { HorizontalMovieRow } from "@/components/horizontal-movie-row";
import { Navbar } from "@/components/navbar";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";

// ===========================================
// Skeleton Components (Inline Fallbacks)
// ===========================================

function SavedPageSkeleton() {
	return (
		<main className="min-h-screen bg-black text-white">
			<div className="pt-20 pb-8">
				<div className="px-4 md:px-12 mb-8">
					<div className="h-12 w-48 bg-gray-800 rounded animate-pulse mb-3" />
					<div className="h-6 w-64 bg-gray-800 rounded animate-pulse" />
				</div>

				<div className="space-y-8 md:space-y-12 px-4 md:px-12">
					{/* Movie row skeleton */}
					<div className="space-y-4">
						<div className="h-8 w-40 bg-gray-800 rounded animate-pulse" />
						<div className="flex gap-4 overflow-hidden">
							{[...Array(6)].map((_, i) => (
								<div key={i} className="flex-shrink-0 w-48 md:w-56 space-y-2">
									<div className="aspect-[2/3] rounded-lg bg-gray-800 animate-pulse" />
									<div className="h-4 w-full bg-gray-800 rounded animate-pulse" />
								</div>
							))}
						</div>
					</div>

					{/* TV show row skeleton */}
					<div className="space-y-4">
						<div className="h-8 w-40 bg-gray-800 rounded animate-pulse" />
						<div className="flex gap-4 overflow-hidden">
							{[...Array(6)].map((_, i) => (
								<div key={i} className="flex-shrink-0 w-48 md:w-56 space-y-2">
									<div className="aspect-[2/3] rounded-lg bg-gray-800 animate-pulse" />
									<div className="h-4 w-full bg-gray-800 rounded animate-pulse" />
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}

function EmptyStateSkeleton() {
	return (
		<main className="min-h-screen bg-black text-white">
			<div className="pt-20 pb-8">
				<div className="px-4 md:px-12 mb-8">
					<div className="h-12 w-48 bg-gray-800 rounded animate-pulse mb-3" />
					<div className="h-6 w-64 bg-gray-800 rounded animate-pulse" />
				</div>

				<div className="flex flex-col items-center justify-center py-20 text-center px-4">
					<div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
						<div className="w-8 h-8 bg-gray-700 rounded animate-pulse" />
					</div>
					<div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-3" />
					<div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
				</div>
			</div>
		</main>
	);
}

// ===========================================
// No Profile Selected State
// ===========================================

function NoProfileState() {
	return (
		<main className="min-h-screen bg-black text-white">
			<div className="pt-20 pb-8">
				<div className="px-4 md:px-12 mb-8">
					<div className="flex items-center gap-4">
						<h1 className="text-4xl md:text-5xl font-bold font-display-title">My List</h1>
					</div>
					<p className="text-gray-400 mt-2">
						Your saved movies and TV shows
					</p>
				</div>

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
							<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
							<circle cx="12" cy="7" r="4" />
						</svg>
					</div>
					<h2 className="text-2xl font-semibold mb-3">
						Select a Profile
					</h2>
					<p className="text-gray-400 max-w-md mb-6">
						Please select a profile to view your saved movies and TV shows.
					</p>
					<Link
						href="/profiles"
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all"
					>
						Go to Profiles
					</Link>
				</div>
			</div>
		</main>
	);
}

// ===========================================
// Error State
// ===========================================

function ErrorState({ error }: { error: string }) {
	return (
		<main className="min-h-screen bg-black text-white">
			<div className="pt-20 pb-8">
				<div className="px-4 md:px-12 mb-8">
					<div className="flex items-center gap-4">
						<h1 className="text-4xl md:text-5xl font-bold font-display-title">My List</h1>
					</div>
					<p className="text-gray-400 mt-2">
						Your saved movies and TV shows
					</p>
				</div>

				<div className="flex flex-col items-center justify-center py-20 text-center px-4">
					<div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mb-6">
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
							className="text-red-400"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
					</div>
					<h2 className="text-2xl font-semibold mb-3">
						Something went wrong
					</h2>
					<p className="text-gray-400 max-w-md mb-6">
						{error || "Failed to load your watchlist. Please try again later."}
					</p>
					<button
						onClick={() => window.location.reload()}
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all"
					>
						Try Again
					</button>
				</div>
			</div>
		</main>
	);
}

// ===========================================
// Loading State
// ===========================================

function LoadingState() {
	return (
		<main className="min-h-screen bg-black text-white">
			<div className="pt-20 pb-8">
				<div className="px-4 md:px-12 mb-8">
					<div className="flex items-center gap-4">
						<h1 className="text-4xl md:text-5xl font-bold font-display-title">My List</h1>
					</div>
					<p className="text-gray-400 mt-2">
						Your saved movies and TV shows
					</p>
				</div>

				<div className="flex flex-col items-center justify-center py-20 text-center px-4">
					<Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
					<p className="text-gray-400">Loading your watchlist...</p>
				</div>
			</div>
		</main>
	);
}

// ===========================================
// Client Component for Watchlist Content
// ===========================================

function WatchlistContent() {
	const { savedMovies, loading, error, hasActiveProfile } = useWatchlist();
	const { loading: authLoading } = useAuth();
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted || authLoading) {
		return <EmptyStateSkeleton />;
	}

	// Show no profile state if no active profile
	if (!hasActiveProfile) {
		return <NoProfileState />;
	}

	// Show loading state
	if (loading) {
		return <LoadingState />;
	}

	// Show error state
	if (error) {
		return <ErrorState error={error} />;
	}

	// Separate movies and TV shows
	const movies = savedMovies.filter((item) => item.mediaType === "movie");
	const tvShows = savedMovies.filter((item) => item.mediaType === "tv");

	if (savedMovies.length === 0) {
		return (
			<main className="min-h-screen bg-black text-white">
				<div className="pt-20 pb-8">
					<div className="px-4 md:px-12 mb-8">
						<div className="flex items-center gap-4">
							<h1 className="text-4xl md:text-5xl font-bold font-display-title">My List</h1>
							<span className="text-gray-400 text-xl">
								(0)
							</span>
						</div>
						<p className="text-gray-400 mt-2">
							Your saved movies and TV shows
						</p>
					</div>

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
				</div>
			</main>
		);
	}

	return (
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

				<div className="space-y-8 md:space-y-12">
					{movies.length > 0 && (
						<HorizontalMovieRow
							title="Saved Movies"
							movies={movies as any}
						/>
					)}
					{tvShows.length > 0 && (
						<HorizontalMovieRow
							title="Saved TV Shows"
							movies={tvShows as any}
						/>
					)}
				</div>
			</div>
		</main>
	);
}

// ===========================================
// Main Page Component with Suspense
// ===========================================

export default function SavedPage() {
	return (
		<>
			<Navbar />
			<Suspense fallback={<SavedPageSkeleton />}>
				<WatchlistContent />
			</Suspense>
		</>
	);
}
