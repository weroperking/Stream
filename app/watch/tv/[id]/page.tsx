import { MediaPlayer } from "@/components/media-player";
import { getTVShowDetails } from "@/lib/tmdb";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface WatchTVPageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        season?: string;
        episode?: string;
    }>;
}

export default async function WatchTVPage({ params, searchParams }: WatchTVPageProps) {
    const { id } = await params;
    const { season, episode } = await searchParams;
    
    const tvId = Number(id);
    const currentSeason = season ? parseInt(season) : 1;
    const currentEpisode = episode ? parseInt(episode) : 1;

    // Server-side fetch to eliminate client-side lag
    const tvShow = await getTVShowDetails(tvId);
    
    if (!tvShow) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Back Navigation */}
            <div className="absolute top-4 left-4 z-50">
                <Link 
                    href={`/tv/${tvId}?season=${currentSeason}&episode=${currentEpisode}`}
                    className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Details</span>
                </Link>
            </div>

            {/* Media Player */}
            <MediaPlayer
                mediaId={tvId}
                type="tv"
                title={tvShow.name}
                season={currentSeason}
                episode={currentEpisode}
            />
        </div>
    );
}
