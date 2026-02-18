import { Suspense } from "react";
import { HeroSection } from "@/components/hero-section";
import { HorizontalMovieRow } from "@/components/horizontal-movie-row";
import { Navbar } from "@/components/navbar";
import { TermsModal } from "@/components/terms-modal";
import {
	getLatestMovies,
	getPopularMovies,
	getTrendingMovies,
	getTopRatedMovies,
	getUpcomingMovies,
} from "@/lib/tmdb";

// ===========================================
// Skeleton Components (Inline Fallbacks)
// ===========================================

function HeroSkeleton() {
	return (
		<div className="relative w-full h-[80vh] md:h-[85vh]">
			<div className="absolute inset-0 bg-gray-800 animate-pulse" />
			<div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
		</div>
	);
}

function MovieRowSkeleton({ title }: { title: string }) {
	return (
		<div className="space-y-4">
			<div className="px-4 md:px-12">
				<div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
			</div>
			<div className="flex gap-4 overflow-hidden px-4 md:px-12">
				{[...Array(6)].map((_, i) => (
					<div
						key={i}
						className="flex-shrink-0 w-48 md:w-56 space-y-2"
					>
						<div className="aspect-[2/3] rounded-lg bg-gray-800 animate-pulse" />
						<div className="h-4 w-full bg-gray-800 rounded animate-pulse" />
					</div>
				))}
			</div>
		</div>
	);
}

// ===========================================
// Async Data Components (Stream Independently)
// ===========================================

async function HeroSectionComponent() {
	const trendingMovies = await getTrendingMovies("week");
	if (!trendingMovies || trendingMovies.length === 0) return null;
	
	return <HeroSection movies={trendingMovies.slice(0, 10)} />;
}

async function TrendingRowComponent() {
	const trendingMovies = await getTrendingMovies("week");
	if (!trendingMovies || trendingMovies.length === 0) return null;
	
	return (
		<HorizontalMovieRow
			title="Trending This Week"
			movies={trendingMovies.slice(0, 20)}
		/>
	);
}

async function PopularRowComponent() {
	const popularMovies = await getPopularMovies();
	if (!popularMovies || popularMovies.length === 0) return null;
	
	return (
		<HorizontalMovieRow
			title="Popular on Stream"
			movies={popularMovies.slice(0, 20)}
		/>
	);
}

async function LatestRowComponent() {
	const latestMovies = await getLatestMovies();
	if (!latestMovies || latestMovies.length === 0) return null;
	
	return (
		<HorizontalMovieRow
			title="New Releases"
			movies={latestMovies.slice(0, 20)}
		/>
	);
}

async function TopRatedRowComponent() {
	const topRatedMovies = await getTopRatedMovies();
	if (!topRatedMovies || topRatedMovies.length === 0) return null;
	
	return (
		<HorizontalMovieRow
			title="Top Rated"
			movies={topRatedMovies.slice(0, 20)}
		/>
	);
}

async function UpcomingRowComponent() {
	const upcomingMovies = await getUpcomingMovies();
	if (!upcomingMovies || upcomingMovies.length === 0) return null;
	
	return (
		<HorizontalMovieRow
			title="Coming Soon"
			movies={upcomingMovies.slice(0, 20)}
		/>
	);
}

// ===========================================
// Main Page Component
// ===========================================

export default function Home() {
	return (
		<>
			<Navbar />
			<TermsModal />

			<main className="bg-black min-h-screen">
				{/* Hero Section - Streams independently */}
				<Suspense fallback={<HeroSkeleton />}>
					<HeroSectionComponent />
				</Suspense>

				{/* Horizontal Scrollable Movie Rows - Each streams independently */}
				<div className="space-y-8 md:space-y-12 py-8 md:py-12">
					<Suspense fallback={<MovieRowSkeleton title="Trending This Week" />}>
						<TrendingRowComponent />
					</Suspense>
					
					<Suspense fallback={<MovieRowSkeleton title="Popular on Stream" />}>
						<PopularRowComponent />
					</Suspense>
					
					<Suspense fallback={<MovieRowSkeleton title="New Releases" />}>
						<LatestRowComponent />
					</Suspense>
					
					<Suspense fallback={<MovieRowSkeleton title="Top Rated" />}>
						<TopRatedRowComponent />
					</Suspense>
					
					<Suspense fallback={<MovieRowSkeleton title="Coming Soon" />}>
						<UpcomingRowComponent />
					</Suspense>
				</div>
			</main>
		</>
	);
}
