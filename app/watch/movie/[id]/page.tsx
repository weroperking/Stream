import { MediaPlayer } from "@/components/media-player";
import { getMovieDetails } from "@/lib/tmdb";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface WatchMoviePageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        provider?: string;
    }>;
}

export default async function WatchMoviePage({ params, searchParams }: WatchMoviePageProps) {
    const { id } = await params;
    const movieId = Number(id);
    const { provider } = await searchParams;
    
    // Server-side fetch to eliminate client-side lag
    const movie = await getMovieDetails(movieId);
    
    if (!movie) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Back Navigation */}
            <div className="absolute top-4 left-4 z-50">
                <Link 
                    href={`/movie/${movieId}`}
                    className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Details</span>
                </Link>
            </div>

            {/* Media Player */}
            <MediaPlayer
                mediaId={movieId}
                type="movie"
                title={movie.title}
                runtime={movie.runtime}
                preferredProvider={provider}
            />
        </div>
    );
}
