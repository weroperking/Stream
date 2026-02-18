# Next.js Performance & Troubleshooting Guide
### For: Oryno/Stream — Next.js 16 + TMDB API + Bun
---

> **How to use this guide:**
> Read the symptom → find the matching `IF` block → follow the `THEN` steps exactly.
> Do not skip steps. Do not guess. Each section is self-contained.

---

## TABLE OF CONTENTS

1. [Project Context](#1-project-context)
2. [IF: Page never loads / NO_FCP in Lighthouse](#2-if-page-never-loads--no_fcp-in-lighthouse)
3. [IF: API calls fail with `ENOTFOUND`](#3-if-api-calls-fail-with-enotfound)
4. [IF: First compile takes 60-90 seconds](#4-if-first-compile-takes-60-90-seconds)
5. [IF: Page renders but takes 10-20+ seconds](#5-if-page-renders-but-takes-10-20-seconds)
6. [IF: Retry loop hammering the API on every request](#6-if-retry-loop-hammering-the-api-on-every-request)
7. [IF: Cross-origin warning from `192.168.x.x`](#7-if-cross-origin-warning-from-192168xx)
8. [IF: `metadataBase` warning in terminal](#8-if-metadatabase-warning-in-terminal)
9. [IF: Lighthouse scores are all null / errored](#9-if-lighthouse-scores-are-all-null--errored)
10. [IF: Invalid source map warnings in terminal](#10-if-invalid-source-map-warnings-in-terminal)
11. [IF: Production build is also slow](#11-if-production-build-is-also-slow)
12. [IF: You want to proactively cache TMDB responses](#12-if-you-want-to-proactively-cache-tmdb-responses)
13. [IF: You want streaming / skeleton UI during data load](#13-if-you-want-streaming--skeleton-ui-during-data-load)
14. [IF: You want static generation for popular movies](#14-if-you-want-static-generation-for-popular-movies)
15. [Reference: Full `fetchWithRetry` implementation](#15-reference-full-fetchwithretry-implementation)
16. [Reference: Full `cachedFetch` implementation](#16-reference-full-cachedfetch-implementation)
17. [Reference: `next.config.js` recommended settings](#17-reference-nextconfigjs-recommended-settings)
18. [Checklist: Before every deploy](#18-checklist-before-every-deploy)

---

## 1. Project Context

**Stack:**
- Next.js 16 (App Router, Turbopack)
- Bun runtime
- TMDB REST API (`api.themoviedb.org`)
- Server-side rendering on `/`, `/genres`, `/movie/[id]`, `/saved`, `/watch/movie/[id]`

**Known architecture facts:**
- Pages are Server Components fetching TMDB data at render time
- A `fetchWithRetry` utility wraps all TMDB calls
- No caching layer exists currently
- Lighthouse was run against `http://127.0.0.1:3000/` on dev server

---

## 2. IF: Page never loads / NO_FCP in Lighthouse

**Symptoms:**
```
runtimeError: { code: "NO_FCP" }
"The page did not paint any content."
All Lighthouse audit scores: null
```

**Root cause:** The server is not responding within Lighthouse's capture window because it is blocked waiting for a network call (TMDB API) that is either failing or timing out. No HTML reaches the browser, so nothing paints.

**THEN — do these steps in order:**

### Step 2.1 — Confirm the real blocker
Run this in your terminal (Windows):
```bash
ping api.themoviedb.org
```
- **If ping fails** → Go to [Section 3](#3-if-api-calls-fail-with-enotfound) first
- **If ping succeeds** → The problem is in your fetch logic, continue to Step 2.2

### Step 2.2 — Add an `error.tsx` so the page at least renders something
Create this file at `app/error.tsx`:
```tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Something went wrong
        </h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
```

### Step 2.3 — Wrap your page-level data fetch in try/catch
Every `page.tsx` that calls TMDB must have this pattern:

```tsx
// app/movie/[id]/page.tsx
export default async function MoviePage({ params }: { params: { id: string } }) {
  let movie = null;

  try {
    movie = await getMovieDetails(params.id);
  } catch (error) {
    // Page still renders — shows fallback UI instead of crashing
    console.error(`Error fetching movie ${params.id}:`, error);
  }

  if (!movie) {
    return (
      <div>
        <h1>Movie unavailable</h1>
        <p>Could not load movie details. Please try again later.</p>
      </div>
    );
  }

  return <MovieDetails movie={movie} />;
}
```

### Step 2.4 — Re-run Lighthouse
Run Lighthouse ONLY on production build, not dev:
```bash
bun run build
bun run start
# Then run Lighthouse against http://localhost:3000
```

> ⚠️ **IMPORTANT:** Never benchmark Next.js on `next dev`. Turbopack dev mode
> is not optimized for performance. Dev compile times of 75s are NORMAL and
> irrelevant to production performance.

---

## 3. IF: API calls fail with `ENOTFOUND`

**Symptoms:**
```
TypeError: fetch failed
Error: getaddrinfo ENOTFOUND api.themoviedb.org
errno: -3008, code: 'ENOTFOUND', syscall: 'getaddrinfo'
```

**Root cause:** DNS resolution is failing. Your machine cannot resolve the hostname `api.themoviedb.org` to an IP address. This is a **network/system problem**, not a code problem.

**THEN — work through these checks:**

### Step 3.1 — Flush DNS cache (Windows)
Open PowerShell as Administrator:
```powershell
ipconfig /flushdns
ipconfig /registerdns
```
Then restart your dev server and test again.

### Step 3.2 — Test DNS manually
```powershell
nslookup api.themoviedb.org
```
- **If it returns an IP** → DNS works, problem is elsewhere (firewall, proxy)
- **If it says "can't find server"** → DNS is broken, continue to Step 3.3

### Step 3.3 — Switch to a public DNS
In Windows: Network Settings → Adapter settings → IPv4 Properties
Set DNS to:
```
Preferred:  8.8.8.8    (Google)
Alternate:  1.1.1.1    (Cloudflare)
```

### Step 3.4 — Check if antivirus/firewall is blocking it
Temporarily disable Windows Defender Firewall and test. If it works, add an exception for Node.js / Bun.

### Step 3.5 — Test the API key itself
```powershell
curl "https://api.themoviedb.org/3/movie/278?api_key=YOUR_KEY_HERE"
```
- **If 401** → Invalid API key. Check your `.env` file
- **If 200** → Key is fine, problem was DNS
- **If can't connect** → Network issue, keep debugging Step 3.2–3.4

### Step 3.6 — Add a fallback so the app doesn't die while network is down
In your `getMovieDetails` (or equivalent fetch functions), return `null` on failure:

```typescript
export async function getMovieDetails(id: string) {
  try {
    const response = await fetchWithRetry(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB responded with ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching movie details for ID ${id}:`, error);
    return null; // Return null instead of throwing — page handles this gracefully
  }
}
```

---

## 4. IF: First compile takes 60-90 seconds

**Symptoms:**
```
GET / 200 in 82s (compile: 75s, render: 7.1s)
GET /genres 200 in 16.5s (compile: 6.6s, render: 9.9s)
GET /movie/[id] 200 in 30.6s (compile: 26.6s, render: 4.0s)
```

**Root cause:** This is **expected behavior** on first load in `next dev` with Turbopack. Each route compiles on first visit. Subsequent requests to the same route are fast. This is NOT a bug.

**THEN — understand the numbers:**

| Request | Compile time | Render time | Status |
|---|---|---|---|
| First visit to `/` | 75s | 7.1s | Normal (one-time cost) |
| Second visit to `/` | 0.25s | 0.4s | Normal (cached) |
| First visit to `/genres` | 6.6s | 9.9s | Normal |
| First visit to `/movie/[id]` | 26.6s | 4.0s | Normal |

**THEN — if you want to reduce cold start time:**

### Step 4.1 — Enable Turbopack persistent caching
In `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      // Persistent cache survives restarts
    },
  },
};

module.exports = nextConfig;
```

### Step 4.2 — Warm up routes on startup
Create a script `scripts/warm-up.js`:
```javascript
const routes = ['/', '/genres', '/saved'];

async function warmUp() {
  console.log('Warming up routes...');
  for (const route of routes) {
    try {
      await fetch(`http://localhost:3000${route}`);
      console.log(`✓ Warmed: ${route}`);
    } catch (e) {
      console.log(`✗ Failed: ${route}`);
    }
  }
}

warmUp();
```

Run after starting dev server:
```bash
bun run dev &
sleep 5 && node scripts/warm-up.js
```

### Step 4.3 — Check if the real problem is render time, not compile time
Look at this log line:
```
GET /movie/1317672 200 in 19.0s (compile: 557ms, render: 18.4s)
```
Compile is only 557ms — but **render took 18.4 seconds**. That means TMDB calls are blocking render. Go to [Section 5](#5-if-page-renders-but-takes-10-20-seconds).

---

## 5. IF: Page renders but takes 10-20+ seconds

**Symptoms:**
```
GET /movie/1317672 200 in 19.0s (compile: 557ms, render: 18.4s)
GET /movie/425274 200 in 9.2s (compile: 20ms, render: 9.2s)
```
Compile time is low, but render time is enormous. The page is waiting for API calls.

**Root cause:** Server Components are fetching data sequentially (one after another), and each TMDB call has a slow timeout or retry loop. All of this happens before any HTML is sent to the browser.

**THEN:**

### Step 5.1 — Identify how many TMDB calls happen per page render
Open your `app/movie/[id]/page.tsx` and count every `await` that calls TMDB. Common pattern:

```typescript
// ❌ SLOW: Sequential — each waits for the previous to finish
const movie = await getMovieDetails(id);
const credits = await getMovieCredits(id);
const similar = await getSimilarMovies(id);
const videos = await getMovieVideos(id);
// Total time = time1 + time2 + time3 + time4
```

### Step 5.2 — Parallelize all independent fetches with `Promise.all`
```typescript
// ✅ FAST: Parallel — all run at the same time
const [movie, credits, similar, videos] = await Promise.all([
  getMovieDetails(id).catch(() => null),
  getMovieCredits(id).catch(() => null),
  getSimilarMovies(id).catch(() => null),
  getMovieVideos(id).catch(() => null),
]);
// Total time = slowest single call (not the sum of all)
```

> **Rule:** If fetch B does not need the result of fetch A to build its URL or
> params, they should ALWAYS run in parallel with `Promise.all`.

### Step 5.3 — Add a hard timeout to every fetch
Your current retry logic waits for the OS-level TCP timeout, which can be 20+ seconds. Add a 5-second abort:

```typescript
// lib/tmdb.ts

const FETCH_TIMEOUT_MS = 5000; // 5 seconds max per request

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms: ${url}`);
    }
    throw error;
  }
}
```

### Step 5.4 — Use Suspense to unblock the initial render
The browser gets HTML immediately; data streams in afterward.

```tsx
// app/movie/[id]/page.tsx
import { Suspense } from 'react';

// Page renders INSTANTLY — sends skeleton HTML right away
export default function MoviePage({ params }: { params: { id: string } }) {
  return (
    <main>
      <Suspense fallback={<MovieHeroSkeleton />}>
        <MovieHero id={params.id} />
      </Suspense>

      <Suspense fallback={<CastSkeleton />}>
        <MovieCast id={params.id} />
      </Suspense>

      <Suspense fallback={<SimilarSkeleton />}>
        <SimilarMovies id={params.id} />
      </Suspense>
    </main>
  );
}

// Each of these is an async Server Component
async function MovieHero({ id }: { id: string }) {
  const movie = await getMovieDetails(id); // streams in independently
  if (!movie) return <div>Could not load movie info.</div>;
  return <HeroUI movie={movie} />;
}

async function MovieCast({ id }: { id: string }) {
  const credits = await getMovieCredits(id); // streams in independently
  if (!credits) return null;
  return <CastUI credits={credits} />;
}
```

---

## 6. IF: Retry loop hammering the API on every request

**Symptoms:**
```
⚠️ Request failed, retrying... (3 attempts left). Error: TypeError: fetch failed
⚠️ Request failed, retrying... (2 attempts left). Error: TypeError: fetch failed
⚠️ Request failed, retrying... (1 attempts left). Error: TypeError: fetch failed
❌ Fetch failed after retries: TypeError: fetch failed
```
This appears multiple times in rapid succession. Every page visit triggers 4 total attempts × N parallel calls.

**Root cause:** When the network is down, your retry logic blindly retries a network-unreachable host. `ENOTFOUND` means DNS failed — retrying instantly won't help, it will just hammer for no reason and waste 12+ seconds.

**THEN — rewrite `fetchWithRetry` to not retry on DNS errors:**

```typescript
// lib/fetch-utils.ts

const RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 5000;

// These error codes mean retrying is pointless
const NON_RETRYABLE_CODES = new Set([
  'ENOTFOUND',      // DNS failed — host doesn't exist or no internet
  'ECONNREFUSED',   // Server actively refused connection
  'ERR_INVALID_URL', // Malformed URL
]);

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    // Don't retry on 4xx client errors (bad API key, not found, etc.)
    if (response.status >= 400 && response.status < 500) {
      throw new Error(`Client error: ${response.status} ${response.statusText}`);
    }

    // Retry on 5xx server errors if we have attempts left
    if (!response.ok && retries > 0) {
      console.warn(`⚠️ Server error ${response.status}, retrying... (${retries} left)`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      return fetchWithRetry(url, options, retries - 1);
    }

    return response;

  } catch (error) {
    clearTimeout(timeoutId);

    const errorCode = (error as NodeJS.ErrnoException).code ?? '';

    // ❌ Do NOT retry DNS/connection errors — fail fast
    if (NON_RETRYABLE_CODES.has(errorCode)) {
      throw new Error(
        `Non-retryable network error (${errorCode}): ${(error as Error).message}`
      );
    }

    // ❌ Do NOT retry user-aborted requests
    if ((error as Error).name === 'AbortError') {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }

    // ✅ Retry on transient errors (ECONNRESET, ETIMEDOUT, etc.)
    if (retries > 0) {
      console.warn(`⚠️ Transient error, retrying... (${retries} left): ${errorCode}`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      return fetchWithRetry(url, options, retries - 1);
    }

    throw error;
  }
}
```

---

## 7. IF: Cross-origin warning from `192.168.x.x`

**Symptom:**
```
⚠️ Blocked cross-origin request from 192.168.1.3 to /_next/* resource.
To allow this, configure "allowedDevOrigins" in next.config
```

**Root cause:** You are accessing your dev server from another device on your network (phone, tablet, another PC) using the network IP `192.168.1.3`, but Next.js dev mode blocks cross-origin requests to `/_next/*` by default.

**THEN — add `allowedDevOrigins` to `next.config.js`:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '192.168.1.3',   // The specific device IP from the warning
    '192.168.1.*',   // Or allow the whole local subnet
  ],
};

module.exports = nextConfig;
```

> ⚠️ Only do this in dev. This config has no effect in production builds.

---

## 8. IF: `metadataBase` warning in terminal

**Symptom:**
```
⚠️ metadataBase property in metadata export is not set for resolving social
open graph or twitter images, using "http://localhost:3000"
```

**Root cause:** Your `layout.tsx` or `page.tsx` exports a `metadata` object with relative image URLs (e.g. for Open Graph / Twitter cards) but Next.js doesn't know the production base URL to resolve them.

**THEN — add `metadataBase` to your root layout:**

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  ),
  title: 'Oryno Stream',
  description: 'Your streaming platform',
  openGraph: {
    images: ['/og-image.png'], // Now resolves correctly against metadataBase
  },
};
```

Add to `.env`:
```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

Add to `.env.local` (for dev):
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 9. IF: Lighthouse scores are all null / errored

**Symptom:**
```json
"score": null,
"scoreDisplayMode": "error",
"errorMessage": "The page did not paint any content. (NO_FCP)"
```
Every single Lighthouse audit returns null.

**Root cause:** Lighthouse uses `NO_FCP` when no content appeared during the capture window. This is always caused by one of:
1. Page crashed / threw an unhandled error
2. Server response was so slow Lighthouse timed out
3. Lighthouse was run against `next dev` while a long compile was happening
4. Browser window was minimized during the test (Lighthouse requires it in foreground)

**THEN — follow this decision tree:**

```
Did the page eventually load when you visited it manually?
│
├─ NO → Go to Section 2 (page never loads) and Section 3 (ENOTFOUND)
│
└─ YES → Was the dev server still compiling when you ran Lighthouse?
         │
         ├─ YES → Wait for the page to fully load once manually,
         │        THEN run Lighthouse again
         │
         └─ NO → Are you running Lighthouse on next dev?
                 │
                 ├─ YES → Switch to production: bun run build && bun run start
                 │        Then run Lighthouse on http://localhost:3000
                 │
                 └─ NO → Was the browser window minimized or unfocused?
                         │
                         ├─ YES → Re-run with window fully visible and focused
                         │
                         └─ NO → Check for JS errors in browser console
                                 that prevent rendering
```

---

## 10. IF: Invalid source map warnings in terminal

**Symptom:**
```
B:\Ziad\Oryno\Stream\.next\dev\server\chunks\ssr\_2ca9d51f._.js:
Invalid source map. Only conformant source maps can be used to find
the original code. Cause: Error: sourceMapURL could not be parsed
```

**Root cause:** Turbopack generated a malformed source map for a compiled chunk. This is a known Turbopack dev bug. It does **not** affect your app's functionality or production build.

**THEN:**
- In dev: **Ignore it.** It's cosmetic noise in the terminal.
- If you need accurate stack traces for debugging: add this to `next.config.js`:

```javascript
const nextConfig = {
  productionBrowserSourceMaps: true, // Enables source maps in production build
};
```

- To suppress the noise in dev, you can't cleanly disable it without disabling source maps entirely. Just treat these lines as invisible.

---

## 11. IF: Production build is also slow

**Symptoms:**
- `bun run build` takes very long
- First load after `bun run start` is still slow (not just cold compile)

**Root cause:** Either the bundle is too large, or data fetching is happening at request time for pages that could be statically generated.

**THEN:**

### Step 11.1 — Analyze your bundle
```bash
# Install analyzer
bun add @next/bundle-analyzer -D

# Run analysis
ANALYZE=true bun run build
```

In `next.config.js`:
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // your existing config
});
```

Look for:
- Any single chunk over 500kb → needs code splitting
- Duplicate packages (e.g., two versions of lodash)
- Libraries imported fully when only one function is used

### Step 11.2 — Optimize heavy imports
```typescript
// ❌ Imports entire library
import _ from 'lodash';
const result = _.debounce(fn, 300);

// ✅ Imports only what you need
import debounce from 'lodash/debounce';
const result = debounce(fn, 300);
```

Add to `next.config.js`:
```javascript
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
    ],
  },
};
```

### Step 11.3 — Check if pages that could be static are dynamic
In your terminal after `bun run build`, look at the route map:
```
Route (app)                    Size     First Load JS
○ /                            5.2 kB   108 kB
ƒ /movie/[id]                  3.1 kB   106 kB
```
- `○` = static (fast)
- `ƒ` = dynamic/server rendered on every request (slower)

If `/movie/[id]` is `ƒ` but movie data doesn't change by the minute, go to [Section 14](#14-if-you-want-static-generation-for-popular-movies).

---

## 12. IF: You want to proactively cache TMDB responses

**When to use this:** Your app makes the same TMDB calls repeatedly (e.g. every time any user visits `/movie/278`), and you want those to be fast without fetching TMDB on every single request.

**THEN — choose the right caching strategy:**

### Option A: Next.js Built-in `fetch` Cache (Recommended — zero config)
```typescript
export async function getMovieDetails(id: string) {
  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}`,
    {
      next: {
        revalidate: 3600, // Re-fetch from TMDB at most once per hour
        // OR: revalidate: false  → cache forever (never stale)
        // OR: revalidate: 60    → cache for 1 minute
      },
    }
  );
  
  if (!response.ok) throw new Error(`TMDB error: ${response.status}`);
  return response.json();
}
```

> **How it works:** Next.js deduplicates and caches `fetch()` calls automatically
> across all requests. The first visitor triggers the fetch; everyone else for
> the next hour gets the cached response instantly.

### Option B: In-memory cache (for things that can't use fetch cache)
```typescript
// lib/cache.ts

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// Singleton instance
export const tmdbCache = new MemoryCache();
```

Usage:
```typescript
import { tmdbCache } from '@/lib/cache';

export async function getMovieDetails(id: string) {
  const cacheKey = `movie:${id}`;
  
  // Return cached data if fresh
  const cached = tmdbCache.get<MovieDetails>(cacheKey);
  if (cached) return cached;
  
  // Fetch fresh data
  const response = await fetchWithRetry(
    `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}`
  );
  
  if (!response.ok) throw new Error(`TMDB error: ${response.status}`);
  
  const data: MovieDetails = await response.json();
  
  // Cache for 1 hour
  tmdbCache.set(cacheKey, data, 60 * 60 * 1000);
  
  return data;
}
```

---

## 13. IF: You want streaming / skeleton UI during data load

**When to use this:** Data fetches take 1-4 seconds and you don't want users to stare at a blank page.

**THEN — implement this pattern:**

### Step 13.1 — Create skeleton components
```tsx
// components/skeletons/MovieHeroSkeleton.tsx
export function MovieHeroSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Backdrop placeholder */}
      <div className="w-full h-64 bg-gray-800 rounded-lg mb-4" />
      
      {/* Title placeholder */}
      <div className="h-8 bg-gray-700 rounded w-3/4 mb-2" />
      
      {/* Subtitle placeholder */}
      <div className="h-4 bg-gray-700 rounded w-1/2 mb-4" />
      
      {/* Description placeholder */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-700 rounded" />
        <div className="h-3 bg-gray-700 rounded" />
        <div className="h-3 bg-gray-700 rounded w-4/5" />
      </div>
    </div>
  );
}

export function CastSkeleton() {
  return (
    <div className="flex gap-4 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-gray-700 rounded-full" />
          <div className="h-3 bg-gray-700 rounded w-16" />
        </div>
      ))}
    </div>
  );
}
```

### Step 13.2 — Convert page to streaming
```tsx
// app/movie/[id]/page.tsx
import { Suspense } from 'react';
import { MovieHeroSkeleton, CastSkeleton } from '@/components/skeletons';

// This page renders INSTANTLY — it sends HTML with skeletons right away
export default function MoviePage({ params }: { params: { id: string } }) {
  return (
    <main>
      {/* Hero streams in first — most important */}
      <Suspense fallback={<MovieHeroSkeleton />}>
        <MovieHero id={params.id} />
      </Suspense>

      {/* Cast streams in independently — doesn't block hero */}
      <Suspense fallback={<CastSkeleton />}>
        <MovieCast id={params.id} />
      </Suspense>

      {/* Similar movies lowest priority — user scrolls down anyway */}
      <Suspense fallback={<div className="h-48 bg-gray-800 animate-pulse rounded" />}>
        <SimilarMovies id={params.id} />
      </Suspense>
    </main>
  );
}

// Each is a separate async Server Component
async function MovieHero({ id }: { id: string }) {
  const movie = await getMovieDetails(id);
  if (!movie) return <div className="text-gray-400">Movie info unavailable.</div>;
  return <HeroUI movie={movie} />;
}

async function MovieCast({ id }: { id: string }) {
  const credits = await getMovieCredits(id);
  if (!credits) return null;
  return <CastUI credits={credits} />;
}

async function SimilarMovies({ id }: { id: string }) {
  const similar = await getSimilarMovies(id);
  if (!similar?.results?.length) return null;
  return <SimilarUI movies={similar.results} />;
}
```

---

## 14. IF: You want static generation for popular movies

**When to use this:** Movie data for well-known films rarely changes. You can pre-render the top 100-500 movies at build time so they load instantly for every user.

**THEN:**

```typescript
// app/movie/[id]/page.tsx

// This tells Next.js which IDs to pre-render at build time
export async function generateStaticParams() {
  try {
    // Fetch top 5 pages of popular movies (100 total)
    const pages = await Promise.all(
      [1, 2, 3, 4, 5].map(page =>
        fetch(
          `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_API_KEY}&page=${page}`
        ).then(r => r.json())
      )
    );

    const movies = pages.flatMap(p => p.results ?? []);
    
    return movies.map((movie: { id: number }) => ({
      id: movie.id.toString(),
    }));
  } catch {
    // If this fails at build time, return empty array
    // Pages will still work — they'll just be rendered on demand
    return [];
  }
}

// Allow non-pre-rendered movie IDs to still work (rendered on demand)
export const dynamicParams = true;

// Re-generate static pages at most once per day
export const revalidate = 86400; // 24 hours in seconds
```

---

## 15. Reference: Full `fetchWithRetry` implementation

This is the complete, production-ready version. Replace whatever `fetchWithRetry` you have currently with this.

```typescript
// lib/fetch-utils.ts

const FETCH_TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 2;

const NON_RETRYABLE_ERROR_CODES = new Set([
  'ENOTFOUND',
  'ECONNREFUSED',
  'ERR_INVALID_URL',
  'ERR_CERT_AUTHORITY_INVALID',
]);

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // 4xx = client error, don't retry (bad key, not found, etc.)
    if (response.status >= 400 && response.status < 500) {
      const body = await response.text().catch(() => '');
      throw Object.assign(
        new Error(`HTTP ${response.status}: ${response.statusText}. ${body}`),
        { status: response.status, retryable: false }
      );
    }

    // 5xx = server error, retry if we can
    if (!response.ok && retries > 0) {
      console.warn(`⚠️ HTTP ${response.status} from TMDB, retrying... (${retries} left)`);
      await delay(RETRY_DELAY_MS);
      return fetchWithRetry(url, options, retries - 1);
    }

    return response;

  } catch (error) {
    clearTimeout(timeoutId);

    const err = error as NodeJS.ErrnoException & { retryable?: boolean };

    // Non-retryable: fail immediately
    if (
      err.retryable === false ||
      NON_RETRYABLE_ERROR_CODES.has(err.code ?? '')
    ) {
      throw error;
    }

    // Timed out: fail immediately (no point retrying a timeout right away)
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms: ${url}`);
    }

    // Retryable transient error
    if (retries > 0) {
      console.warn(`⚠️ Transient error (${err.code ?? err.message}), retrying... (${retries} left)`);
      await delay(RETRY_DELAY_MS);
      return fetchWithRetry(url, options, retries - 1);
    }

    console.error(`❌ Fetch failed after all retries: ${url}`);
    throw error;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 16. Reference: Full `cachedFetch` implementation

```typescript
// lib/tmdb-cache.ts

const CACHE_TTL_MS = {
  movie_details:    60 * 60 * 1000,      // 1 hour
  movie_credits:    60 * 60 * 1000,      // 1 hour
  popular_movies:   15 * 60 * 1000,      // 15 minutes (changes more often)
  similar_movies:   60 * 60 * 1000,      // 1 hour
  genres:           24 * 60 * 60 * 1000, // 24 hours (almost never changes)
};

type CacheName = keyof typeof CACHE_TTL_MS;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export async function cachedFetch<T>(
  cacheName: CacheName,
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const fullKey = `${cacheName}:${key}`;
  const entry = store.get(fullKey) as CacheEntry<T> | undefined;

  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }

  const data = await fetcher();

  store.set(fullKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS[cacheName],
  });

  return data;
}

// Usage example:
// const movie = await cachedFetch('movie_details', id, () => getMovieFromTMDB(id));
```

---

## 17. Reference: `next.config.js` recommended settings

```javascript
// next.config.js

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow dev access from local network devices (phones, etc.)
  allowedDevOrigins: [
    '192.168.1.*',
  ],

  // Optimize tree-shaking for these libraries
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
    ],
  },

  // Enable source maps in production (useful for debugging)
  productionBrowserSourceMaps: false, // Set true only when debugging prod

  // Image optimization — tell Next.js about TMDB image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
};

module.exports = withBundleAnalyzer(nextConfig);
```

---

## 18. Checklist: Before every deploy

Run through this list before pushing to production.

```
PRE-DEPLOY CHECKLIST
─────────────────────────────────────────────────────────────
Performance
  □ bun run build completes without errors
  □ bun run start — homepage loads in < 3s
  □ /movie/[id] loads in < 3s (after build)
  □ No page takes > 5s to render

Error Handling
  □ All getMovie*, getGenres*, etc. functions return null on failure
  □ All page.tsx files handle null data and show fallback UI
  □ app/error.tsx exists and renders properly
  □ app/not-found.tsx exists

Environment
  □ TMDB_API_KEY is set in .env (not committed to git)
  □ NEXT_PUBLIC_SITE_URL is set in .env
  □ .env is in .gitignore

Caching
  □ All TMDB fetch calls use next: { revalidate: N } or cachedFetch
  □ fetchWithRetry has a timeout and doesn't retry ENOTFOUND

Lighthouse (run against bun run start, not dev)
  □ FCP < 2.5s
  □ LCP < 4.0s
  □ No console errors on homepage
  □ metadataBase warning is gone
─────────────────────────────────────────────────────────────
```

---

*Last updated: February 2026. Covers Next.js 16, App Router, Turbopack, Bun runtime.*
