"use client";

import { MediaPlayer } from "@/components/media-player";
import { useSearchParams } from "next/navigation";

interface TVPlayerSectionProps {
    tvId: number;
    title: string;
}

export function TVPlayerSection({ tvId, title }: TVPlayerSectionProps) {
    const searchParams = useSearchParams();
    
    const season = parseInt(searchParams.get("season") || "1");
    const episode = parseInt(searchParams.get("episode") || "1");

    return (
        <div id="player" className="relative z-10">
            <MediaPlayer
                mediaId={tvId}
                type="tv"
                title={title}
                season={season}
                episode={episode}
            />
        </div>
    );
}
