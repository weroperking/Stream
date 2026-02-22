'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { addContentPreferences, completeOnboarding, getUserProfiles } from '@/app/actions/auth';
import { getTrendingMovies, getTrendingTVShows, Movie, TVShow } from '@/lib/tmdb';
import { 
  Loader2, 
  Check, 
  Sparkles, 
  Search, 
  Film, 
  Tv, 
  Grid3X3,
  Heart,
  X,
  ChevronRight,
  Star
} from 'lucide-react';

// TMDB image base URL
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const MIN_SELECTIONS = 6;
const MAX_SELECTIONS = 6;

type ContentItem = (Movie | TVShow) & { media_type: 'movie' | 'tv' };

type FilterType = 'all' | 'movies' | 'tv';

export default function TastePage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Fetch trending content on mount
  useEffect(() => {
    async function fetchContent() {
      try {
        const [movies, tvShows] = await Promise.all([
          getTrendingMovies('week'),
          getTrendingTVShows('week'),
        ]);

        // Combine and shuffle
        const combined: ContentItem[] = [
          ...movies.map((m) => ({ ...m, media_type: 'movie' as const })),
          ...tvShows.map((t) => ({ ...t, media_type: 'tv' as const })),
        ];

        // Shuffle array
        const shuffled = combined.sort(() => Math.random() - 0.5);
        setItems(shuffled);
      } catch (err) {
        console.error('Error fetching content:', err);
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, []);

  // Get user profiles for associating favorites
  useEffect(() => {
    async function loadProfiles() {
      try {
        const profiles = await getUserProfiles();
        if (profiles.length > 0) {
          // Set the first profile as default, or the main profile
          const mainProfile = profiles.find(p => p.is_main) || profiles[0];
          setSelectedProfileId(mainProfile.id);
        }
      } catch (err) {
        console.error('Error loading profiles:', err);
      }
    }
    loadProfiles();
  }, []);

  // Filter items based on search and filter type
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const title = 'title' in item ? item.title : item.name;
      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeFilter === 'movies') {
        return item.media_type === 'movie' && matchesSearch;
      }
      if (activeFilter === 'tv') {
        return item.media_type === 'tv' && matchesSearch;
      }
      return matchesSearch;
    });
  }, [items, searchQuery, activeFilter]);

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else if (newSet.size < MIN_SELECTIONS) {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const isAtLimit = selectedIds.size >= MIN_SELECTIONS;

  const isSelectionComplete = selectedIds.size >= MIN_SELECTIONS;
  const progress = (selectedIds.size / MIN_SELECTIONS) * 100;

  const handleDone = async () => {
    if (selectedIds.size < MIN_SELECTIONS) {
      setError(`Please select at least ${MIN_SELECTIONS} titles`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Prepare preferences using existing content_preferences table
      const preferences = items
        .filter((item) => selectedIds.has(item.id))
        .map((item) => ({
          tmdb_id: item.id,
          content_type: item.media_type,
          liked: true,
          profile_id: selectedProfileId || undefined,
        }));

      // Save preferences using existing function
      const result = await addContentPreferences(preferences);
      
      if (!result.success) {
        const errorToThrow = result.error instanceof Error 
          ? result.error 
          : new Error(result.error?.message || 'Failed to save preferences');
        throw errorToThrow;
      }

      // Complete onboarding
      const onboardingResult = await completeOnboarding();
      
      if (!onboardingResult.success) {
        throw onboardingResult.error || new Error('Failed to complete onboarding');
      }
      
      // Refresh auth state
      await refreshProfile();

      // Small delay to ensure database update is committed before navigation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect to homepage
      router.push('/');
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                What do you like to watch?
              </h1>
              <p className="text-muted-foreground mt-1">
                Select at least {MIN_SELECTIONS} titles to personalize your experience
              </p>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center gap-4 bg-muted/50 rounded-full px-4 py-2">
              <div className="flex items-center gap-2">
                <Heart className={`h-5 w-5 ${isSelectionComplete ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">
                  {selectedIds.size} / {MIN_SELECTIONS}
                </span>
              </div>
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-red-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              {isSelectionComplete ? (
                <span className="text-green-500 text-sm font-medium animate-pulse">
                  Ready!
                </span>
              ) : (
                <span className="text-orange-500 text-xs font-medium">
                  {MIN_SELECTIONS - selectedIds.size} more needed
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filter */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search movies and TV shows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          
          {/* Filter tabs */}
          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeFilter === 'all' 
                  ? 'bg-background shadow-sm text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              All
            </button>
            <button
              onClick={() => setActiveFilter('movies')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeFilter === 'movies' 
                  ? 'bg-background shadow-sm text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Film className="h-4 w-4" />
              Movies
            </button>
            <button
              onClick={() => setActiveFilter('tv')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeFilter === 'tv' 
                  ? 'bg-background shadow-sm text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Tv className="h-4 w-4" />
              TV Shows
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="container mx-auto px-4 py-2">
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto hover:bg-destructive/20 p-1 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Selected Items Strip */}
      {selectedIds.size > 0 && (
        <div className="container mx-auto px-4 py-3 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-4 border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <span className="text-sm font-medium">Your selection ({selectedIds.size})</span>
              </div>
              <button 
                onClick={clearSelection}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {items
                .filter(item => selectedIds.has(item.id))
                .map(item => {
                  const posterPath = item.poster_path
                    ? `${IMAGE_BASE_URL}${item.poster_path}`
                    : null;
                  const title = 'title' in item ? item.title : item.name;
                  
                  return (
                    <div
                      key={item.id}
                      className="relative flex-shrink-0 w-16 h-24 rounded-md overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => toggleSelection(item.id)}
                    >
                      {posterPath ? (
                        <img
                          src={posterPath}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-[8px] text-center px-1">{title}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-primary/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const posterPath = item.poster_path
              ? `${IMAGE_BASE_URL}${item.poster_path}`
              : null;
            const title = 'title' in item ? item.title : item.name;
            const year = 'release_date' in item 
              ? item.release_date?.split('-')[0] 
              : 'first_air_date' in item 
                ? item.first_air_date?.split('-')[0] 
                : '';

            return (
              <button
                key={`${item.media_type}-${item.id}`}
                onClick={() => toggleSelection(item.id)}
                disabled={!isSelected && isSelectionComplete}
                className={`relative group aspect-[2/3] rounded-xl overflow-hidden transition-all duration-300 active:scale-95 ${
                  isSelected
                    ? 'ring-4 ring-primary shadow-lg shadow-primary/25 scale-95 cursor-pointer'
                    : isSelectionComplete
                      ? 'opacity-50 cursor-not-allowed grayscale'
                      : 'hover:scale-[1.02] hover:shadow-xl hover:ring-2 hover:ring-primary/30 cursor-pointer'
                }`}
              >
                {posterPath ? (
                  <img
                    src={posterPath}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm text-center px-2">
                      {title}
                    </span>
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Type badge */}
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    item.media_type === 'movie' 
                      ? 'bg-blue-500/80 text-white' 
                      : 'bg-purple-500/80 text-white'
                  }`}>
                    {item.media_type === 'movie' ? 'Movie' : 'TV'}
                  </span>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1.5 shadow-lg animate-in zoom-in duration-200">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}

                {/* Title and year */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-medium truncate drop-shadow-md">
                    {title}
                  </p>
                  {year && (
                    <p className="text-white/70 text-xs mt-0.5">
                      {year}
                    </p>
                  )}
                </div>

                {/* Hover overlay */}
                <div
                  className={`absolute inset-0 transition-opacity duration-200 ${
                    isSelected
                      ? 'bg-primary/40 opacity-100'
                      : 'bg-black/40 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {!isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <Heart className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {isSelectionComplete 
                  ? `Great! You've selected ${selectedIds.size} favorites` 
                  : `Select ${MIN_SELECTIONS - selectedIds.size} more to continue`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  onClick={clearSelection}
                  className="text-muted-foreground"
                >
                  Clear
                </Button>
              )}
              <Button
                onClick={handleDone}
                disabled={saving || !isSelectionComplete}
                size="lg"
                className="min-w-[200px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to Home
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
