import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { GenreGrid } from "@/components/genre-grid";
import { getGenresWithThumbnails } from "@/lib/tmdb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Genres - Free Streaming",
  description: "Browse movies by genre. Find your favorite movies organized by category.",
};

// Loading skeleton component
function GenresLoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-lg h-32 md:h-40 animate-pulse bg-gray-800"
        />
      ))}
    </div>
  );
}

// Error fallback component
function GenresErrorFallback({ error }: { error: Error }) {
  return (
    <div className="text-center py-16">
      <p className="text-red-400 text-lg mb-4">Failed to load genres</p>
      <p className="text-gray-400">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

interface GenresPageContentProps {
  genresPromise: Promise<import("@/lib/tmdb").GenreWithThumbnail[]>;
}

async function GenresPageContent({ genresPromise }: GenresPageContentProps) {
  const genres = await genresPromise;

  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen">
        <div className="pt-20 pb-8">
          <div className="px-4 md:px-12 mb-8 md:mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 font-display-title">Browse Genres</h1>
            <p className="text-gray-400 text-lg">
              Explore movies organized by genre. Click on any genre to discover amazing content.
            </p>
          </div>

          {/* Genres Grid */}
          <div className="px-4 md:px-12">
            {genres.length > 0 ? (
              <GenreGrid genres={genres} />
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-400">Unable to load genres. Please try again later.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default function GenresPage() {
  const genresPromise = getGenresWithThumbnails();

  return (
    <Suspense fallback={<GenresLoadingSkeleton />}>
      <GenresPageContent genresPromise={genresPromise} />
    </Suspense>
  );
}
