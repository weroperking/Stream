"use client";

import type { MovieDetails } from "@/lib/tmdb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface MovieInfoProps {
    movie: MovieDetails
    isTv?: boolean;
}

export function MovieInfo({ movie, isTv = false }: MovieInfoProps) {
    // For TV shows, only show tagline
    if (isTv) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Tagline */}
                {(movie as any).tagline && (
                    <section className="py-6 border-t border-b border-white/10">
                        <blockquote className="text-center">
                            <p className="text-2xl md:text-3xl italic text-gray-400 font-light">
                                "{(movie as any).tagline}"
                            </p>
                        </blockquote>
                    </section>
                )}
            </div>
        );
    }

    // For movies, show synopsis and tagline only (no financial info)
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Synopsis Section */}
            <section className="relative">
                <div className="flex items-center gap-2 mb-6">
                    <h2 className="text-3xl md:text-4xl font-bold text-white">Synopsis</h2>
                </div>
                
                <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-background border-white/10 rounded-2xl">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
                    
                    <CardContent className="p-8 md:p-12 relative z-10">
                        <p className="text-xl md:text-2xl lg:text-3xl leading-relaxed text-gray-200 font-light">
                            {movie.overview || "No synopsis available for this title. The story awaits your discovery."}
                        </p>
                    </CardContent>
                </Card>
            </section>

            {/* Tagline */}
            {(movie as any).tagline && (
                <section className="py-6 border-t border-b border-white/10">
                    <blockquote className="text-center">
                        <p className="text-2xl md:text-3xl italic text-gray-400 font-light">
                            "{(movie as any).tagline}"
                        </p>
                    </blockquote>
                </section>
            )}
        </div>
    )
}
