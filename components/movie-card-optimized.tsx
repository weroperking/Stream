'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OptimizedImage } from './optimized-image';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import type { Movie } from '@/lib/tmdb';

interface MovieCardProps {
  movie: Movie;
  priority?: boolean;
}

export function MovieCardOptimized({ movie, priority = false }: MovieCardProps) {
  const router = useRouter();

  return (
    <Link
      href={`/movie/${movie.id}`}
      onMouseEnter={() => {
        // Prefetch on hover for instant navigation
        router.prefetch(`/movie/${movie.id}`);
      }}
      prefetch={false}
    >
      <Card className="overflow-hidden transition-transform hover:scale-105 hover:shadow-xl">
        <div className="aspect-[2/3] relative">
          <OptimizedImage
            src={movie.poster_path}
            alt={movie.title}
            size="w342"
            className="object-cover"
            priority={priority}
          />
          {movie.vote_average >= 7.5 && (
            <Badge className="absolute top-2 right-2">
              ⭐ {movie.vote_average.toFixed(1)}
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold truncate">{movie.title}</h3>
          <p className="text-sm text-muted-foreground">
            {new Date(movie.release_date).getFullYear()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
