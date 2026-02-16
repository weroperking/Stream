"use client";

import { PlayCircle, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface WatchButtonProps {
    movieId: number;
    title: string;
    showDownload?: boolean;
}

export function WatchButton({ movieId, title, showDownload = true }: WatchButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleWatchClick = (e: React.MouseEvent) => {
        // Prefetch the watch page for smoother transition
        router.prefetch(`/watch/movie/${movieId}`);
        
        // Navigate directly - Next.js will handle the transition smoothly
        router.push(`/watch/movie/${movieId}`);
    };

    return (
        <div className="flex flex-wrap items-center gap-4">
            <Link
                href={`/watch/movie/${movieId}`}
                onClick={(e) => {
                    // Start prefetching immediately
                    router.prefetch(`/watch/movie/${movieId}`);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/30"
            >
                <PlayCircle size={20} />
                Watch Now
            </Link>
            
            {showDownload && (
                <button
                    className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white hover:bg-white/10 hover:border-white/40 rounded-full transition-all"
                >
                    <Download size={18} className="mr-2" />
                    Download
                </button>
            )}
        </div>
    );
}
