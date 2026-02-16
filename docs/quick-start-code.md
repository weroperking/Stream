# Quick Start Code Snippets

Copy and paste these into your project to get started immediately!

---

## 1. Logger Utility (Replace console.log)

**File: `lib/logger.ts`**

```typescript
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const isDev = process.env.NODE_ENV === 'development';

class Logger {
  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (level === 'error') {
      console.error(prefix, message, data || '');
      // TODO: Send to error tracking service (Sentry, etc.)
    } else if (isDev) {
      console.log(prefix, message, data || '');
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, error?: any) {
    this.log('error', message, error);
  }

  debug(message: string, data?: any) {
    if (isDev) {
      this.log('debug', message, data);
    }
  }
}

export const logger = new Logger();
```

**Usage:**
```typescript
// Before
console.log('Fetching movie', movieId);

// After
logger.info('Fetching movie', { movieId });
```

---

## 2. Enhanced TMDB Library with Caching

**File: `lib/tmdb.ts`**

```typescript
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Cache durations in seconds
const CACHE_TIMES = {
  SHORT: 60 * 5,        // 5 minutes (trending, search)
  MEDIUM: 60 * 60,      // 1 hour (movie details)
  LONG: 60 * 60 * 24,   // 24 hours (static content)
};

export async function fetchWithCache<T>(
  endpoint: string,
  cacheTime: number = CACHE_TIMES.MEDIUM
): Promise<T> {
  const url = `${TMDB_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`;
  
  try {
    const response = await fetch(url, {
      next: { 
        revalidate: cacheTime,
        tags: ['tmdb'] 
      }
    });

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    logger.error('TMDB fetch failed', { endpoint, error });
    throw error;
  }
}

export function getOptimizedImageUrl(
  path: string | null,
  size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'
): string {
  if (!path) return '/placeholder.svg';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

// Movie APIs
export async function getMovieDetails(id: string) {
  return fetchWithCache<MovieDetails>(`/movie/${id}`, CACHE_TIMES.MEDIUM);
}

export async function getTrendingMovies(timeWindow: 'day' | 'week' = 'day') {
  return fetchWithCache<TMDBResponse<Movie>>(
    `/trending/movie/${timeWindow}`,
    CACHE_TIMES.SHORT
  );
}

export async function getPopularMovies(page: number = 1) {
  return fetchWithCache<TMDBResponse<Movie>>(
    `/movie/popular?page=${page}`,
    CACHE_TIMES.MEDIUM
  );
}

export async function searchMovies(query: string, page: number = 1) {
  // Don't cache searches - they're dynamic
  const url = `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=${page}&api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  return response.json();
}

export async function getMovieCredits(id: string) {
  return fetchWithCache<Credits>(`/movie/${id}/credits`, CACHE_TIMES.LONG);
}

export async function getSimilarMovies(id: string, page: number = 1) {
  return fetchWithCache<TMDBResponse<Movie>>(
    `/movie/${id}/similar?page=${page}`,
    CACHE_TIMES.MEDIUM
  );
}

export async function discoverMovies(params: {
  genre?: string;
  year?: number;
  sortBy?: string;
  page?: number;
}) {
  const queryParams = new URLSearchParams({
    page: String(params.page || 1),
    ...(params.genre && { with_genres: params.genre }),
    ...(params.year && { primary_release_year: String(params.year) }),
    ...(params.sortBy && { sort_by: params.sortBy })
  });

  return fetchWithCache<TMDBResponse<Movie>>(
    `/discover/movie?${queryParams}`,
    CACHE_TIMES.MEDIUM
  );
}

// Types
export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

export interface MovieDetails extends Movie {
  runtime: number;
  genres: Array<{ id: number; name: string }>;
  budget: number;
  revenue: number;
  status: string;
  tagline: string;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface Credits {
  cast: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }>;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }>;
}
```

---

## 3. Optimized Image Component

**File: `components/optimized-image.tsx`**

```typescript
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getOptimizedImageUrl } from '@/lib/tmdb';

interface OptimizedImageProps {
  src: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  size?: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
}

export function OptimizedImage({
  src,
  alt,
  width = 500,
  height = 750,
  className,
  priority = false,
  size = 'w500'
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  
  const imageUrl = error ? '/placeholder.svg' : getOptimizedImageUrl(src, size);

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      quality={85}
      onError={() => setError(true)}
      placeholder="blur"
      blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    />
  );
}
```

**Usage:**
```typescript
// Before
<img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} />

// After
<OptimizedImage src={movie.poster_path} alt={movie.title} size="w500" />
```

---

## 4. Enhanced Movie Card Component

**File: `components/movie-card-optimized.tsx`**

```typescript
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
```

---

## 5. Streaming Movie Details Page

**File: `app/movie/[id]/page.tsx`**

```typescript
import { Suspense } from 'react';
import { getMovieDetails } from '@/lib/tmdb';
import { MovieHero } from '@/components/movie-hero';
import { MovieInfo } from '@/components/movie-info';
import { CastListSkeleton, CastListAsync } from '@/components/cast-list';
import { RelatedMoviesSkeleton, RelatedMoviesAsync } from '@/components/related-movies';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const movie = await getMovieDetails(params.id);
  
  return {
    title: `${movie.title} - Watch Now`,
    description: movie.overview,
    openGraph: {
      images: [getOptimizedImageUrl(movie.backdrop_path, 'w780')],
    },
  };
}

export default async function MoviePage({ params }: { params: { id: string } }) {
  // Fetch critical data immediately
  const movie = await getMovieDetails(params.id);

  return (
    <div className="min-h-screen">
      {/* Show hero immediately */}
      <MovieHero movie={movie} />
      
      <div className="container mx-auto px-4 py-8">
        <MovieInfo movie={movie} />
        
        {/* Stream in cast when ready */}
        <Suspense fallback={<CastListSkeleton />}>
          <CastListAsync movieId={params.id} />
        </Suspense>
        
        {/* Stream in similar movies when ready */}
        <Suspense fallback={<RelatedMoviesSkeleton />}>
          <RelatedMoviesAsync movieId={params.id} />
        </Suspense>
      </div>
    </div>
  );
}

// Parallel data fetching for better performance
export async function generateStaticParams() {
  // Pre-render popular movies at build time
  const popular = await getPopularMovies(1);
  
  return popular.results.slice(0, 20).map((movie) => ({
    id: String(movie.id),
  }));
}
```

---

## 6. Cast List with Streaming

**File: `components/cast-list.tsx`**

```typescript
import { getMovieCredits } from '@/lib/tmdb';
import { OptimizedImage } from './optimized-image';
import { Skeleton } from './ui/skeleton';

export async function CastListAsync({ movieId }: { movieId: string }) {
  const credits = await getMovieCredits(movieId);
  const topCast = credits.cast.slice(0, 10);

  return (
    <section className="my-8">
      <h2 className="text-2xl font-bold mb-4">Cast</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {topCast.map((actor) => (
          <div key={actor.id} className="text-center">
            <div className="aspect-square relative rounded-full overflow-hidden mb-2">
              <OptimizedImage
                src={actor.profile_path}
                alt={actor.name}
                size="w185"
                className="object-cover"
              />
            </div>
            <p className="font-semibold text-sm">{actor.name}</p>
            <p className="text-xs text-muted-foreground">{actor.character}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CastListSkeleton() {
  return (
    <section className="my-8">
      <Skeleton className="h-8 w-32 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="aspect-square rounded-full mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-3 w-3/4 mx-auto" />
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

## 7. Debounce Hook for Search

**File: `hooks/use-debounce.ts`**

```typescript
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**Usage:**
```typescript
'use client';

import { useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { searchMovies } from '@/lib/tmdb';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (debouncedQuery.length > 2) {
      searchMovies(debouncedQuery).then(data => {
        setResults(data.results);
      });
    }
  }, [debouncedQuery]);

  return (
    <Input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search movies..."
    />
  );
}
```

---

## 8. Update next.config.mjs

**File: `next.config.mjs`**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['image.tmdb.org'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Enable React Compiler (Next.js 15+)
  experimental: {
    reactCompiler: true,
  },

  // Optimize production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Add bundle analyzer (optional)
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
  //     config.plugins.push(
  //       new BundleAnalyzerPlugin({
  //         analyzerMode: 'static',
  //         openAnalyzer: false,
  //       })
  //     );
  //   }
  //   return config;
  // },
};

export default nextConfig;
```

---

## 9. Environment Variables Template

**File: `.env.example`**

```bash
# TMDB API
NEXT_PUBLIC_TMDB_API_KEY=your_api_key_here
NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN=your_read_token_here

# Database (choose one)
# Vercel KV
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Authentication (if using)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_ID=

# Error Tracking (optional)
SENTRY_DSN=

# Environment
NODE_ENV=development
```

---

## 10. Package.json Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "clean": "rm -rf .next node_modules",
    "analyze": "ANALYZE=true npm run build",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

---

## 11. Update .gitignore

Add these lines:

```
# Logs
*.log
debug.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.production
.env.development

# Next.js
.next/
out/
build/

# Dependencies
node_modules/

# IDE
.vscode/
.idea/

# OS
.DS_Store
```

---

## 12. Clean Up Debug Logs

Run this command in your project root:

```bash
# Remove all debug.log files
find . -name "debug.log" -type f -delete

# Verify they're gone
find . -name "debug.log"
```

---

## Implementation Order

1. **Day 1:** Logger utility + Clean debug logs
2. **Day 2:** Enhanced TMDB library with caching
3. **Day 3:** Image optimization (OptimizedImage component)
4. **Day 4:** Update next.config.mjs + environment variables
5. **Day 5:** Movie card optimization + prefetching
6. **Week 2:** Streaming pages with Suspense
7. **Week 3:** Start adding new features

---

## Testing Your Improvements

After implementing, test with:

```bash
# Check build
npm run build

# Lighthouse audit
npm install -g lighthouse
lighthouse http://localhost:3000 --view

# Bundle analysis
npm run analyze
```

---

## Quick Performance Checklist

After implementing the above:

- [ ] No console.log in production
- [ ] All images using Next/Image
- [ ] TMDB responses cached
- [ ] Suspense boundaries added
- [ ] Hover prefetching works
- [ ] Build completes without errors
- [ ] Lighthouse score > 80

---

Ready to get started? Copy these files into your project and let me know if you hit any issues!
