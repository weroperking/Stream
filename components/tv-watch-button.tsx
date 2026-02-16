"use client";

import { PlayCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TVWatchButtonProps {
    tvId: number;
    season: number;
    episode: number;
    title: string;
    showDownload?: boolean;
}

export function TVWatchButton({ tvId, season, episode, title, showDownload = true }: TVWatchButtonProps) {
    const router = useRouter();

    return (
        <div className="flex flex-wrap items-center gap-4">
            <Link
                href={`/watch/tv/${tvId}?season=${season}&episode=${episode}`}
                onClick={(e) => {
                    // Prefetch for smoother navigation
                    router.prefetch(`/watch/tv/${tvId}?season=${season}&episode=${episode}`);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent/90 transition-all hover:scale-105 shadow-lg shadow-accent/30"
            >
                <PlayCircle size={20} />
                Watch Now
            </Link>
        </div>
    );
}
