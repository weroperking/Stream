const API_BASE_URL = process.env.NEXT_PUBLIC_TMDB_BASE_URL;
const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;
const BACKDROP_BASE_URL = process.env.NEXT_PUBLIC_TMDB_BACKDROP_BASE_URL;
const VIDSRC_BASE_URL = process.env.NEXT_PUBLIC_VIDSRC_BASE_URL;

if (!API_BASE_URL || !API_KEY) {
	console.error(
		"⚠️ TMDB API configuration is missing. Please check your .env file."
	);
}

// Helper for robust fetching with retry logic
async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
	retries = 3
) {
	if (!API_KEY) {
		console.error("❌ API Key is missing, skipping fetch.");
		throw new Error("API Key is missing");
	}

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				...options.headers,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			// Handle specific HTTP errors
			if (response.status === 401) {
				throw new Error("Unauthorized: Invalid API Key");
			}
			if (response.status === 404) {
				throw new Error("Resource not found");
			}
			if (response.status === 429) {
				throw new Error("Rate limit exceeded");
			}
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return response;
	} catch (error) {
		if (retries > 0) {
			console.warn(
				`⚠️ Request failed, retrying... (${retries} attempts left). Error: ${error}`
			);
			await new Promise((resolve) => setTimeout(resolve, 1000));
			return fetchWithRetry(url, options, retries - 1);
		}
		console.error("❌ Fetch failed after retries:", error);
		throw error;
	}
}

// TMDB API Response Types

export interface GenreResponse {
  genres: Genre[];
}

export interface MovieDiscoverResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

// Genre with thumbnail (top movie backdrop/poster)
export interface GenreWithThumbnail extends Genre {
  thumbnailUrl: string;
  topMovieId: number;
  topMovieTitle: string;
  logoUrl: string | null;
}

// Fetch movie logo URL
export async function getMovieLogoUrl(movieId: number): Promise<string | null> {
  try {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/movie/${movieId}/images?api_key=${API_KEY}`,
      { next: { revalidate: 86400 } }
    );
    const data: MovieImages = await response.json();
    
    if (!data.logos || data.logos.length === 0) return null;
    
    // Sort by vote average and count to get the best logo
    const sortedLogos = [...data.logos].sort((a, b) => {
      if (b.vote_average !== a.vote_average) {
        return b.vote_average - a.vote_average;
      }
      return b.vote_count - a.vote_count;
    });
    
    const logoPath = sortedLogos[0].file_path;
    return getLogoImageUrl(logoPath);
  } catch (error) {
    console.error(`Error fetching logo for movie ${movieId}:`, error);
    return null;
  }
}

// Type guard to check if movie has backdrop or poster
function getMovieThumbnail(movie: Movie): string {
  if (movie.backdrop_path) {
    return getBackdropUrl(movie.backdrop_path);
  }
  return getImageUrl(movie.poster_path, "w780");
}

// Fetch all genres with their top movie thumbnails
export async function getGenresWithThumbnails(): Promise<GenreWithThumbnail[]> {
  try {
    // Fetch all genres first
    const response = await fetchWithRetry(
      `${API_BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`,
      {
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );
    const data: GenreResponse = await response.json();
    const genres = data.genres;

    // If no genres returned, return empty array
    if (!genres || genres.length === 0) {
      return [];
    }

    // Step 1: Fetch top movie for each genre in parallel
    const genrePromises = genres.map(async (genre) => {
      try {
        const movieResponse = await fetchWithRetry(
          `${API_BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genre.id}&language=en-US&sort_by=popularity.desc&page=1`,
          { next: { revalidate: 86400 } }
        );
        const movieData: MovieDiscoverResponse = await movieResponse.json();
        const topMovie = movieData.results[0];

        if (!topMovie) {
          return {
            ...genre,
            thumbnailUrl: "/abstract-movie-poster.png",
            topMovieId: 0,
            topMovieTitle: "",
            logoUrl: null,
          };
        }

        return {
          ...genre,
          thumbnailUrl: getMovieThumbnail(topMovie),
          topMovieId: topMovie.id,
          topMovieTitle: topMovie.title,
          logoUrl: null,
        };
      } catch (error) {
        console.error(`Error fetching top movie for genre ${genre.name}:`, error);
        return {
          ...genre,
          thumbnailUrl: "/abstract-movie-poster.png",
          topMovieId: 0,
          topMovieTitle: "",
          logoUrl: null,
        };
      }
    });

    const results: GenreWithThumbnail[] = await Promise.all(genrePromises);

    // Step 2: Detect duplicates
    const movieToGenres = new Map<number, number[]>(); // movieId -> [genre indices]
    const usedMovieIds = new Set<number>();
    
    results.forEach((genre, index) => {
      if (genre.topMovieId > 0) {
        const existing = movieToGenres.get(genre.topMovieId) || [];
        movieToGenres.set(genre.topMovieId, [...existing, index]);
        usedMovieIds.add(genre.topMovieId);
      }
    });

    // Step 3: Fix duplicates - keep first occurrence, reassign others
    const fixPromises: Promise<void>[] = [];
    
    movieToGenres.forEach((indices, movieId) => {
      if (indices.length > 1) {
        // Keep the first genre's assignment, fix the rest
        for (let i = 1; i < indices.length; i++) {
          const genreIndex = indices[i];
          const genre = results[genreIndex];
          
          fixPromises.push(
            (async () => {
              try {
                // Fetch from pages 2-5 to find alternative
                for (let page = 2; page <= 5; page++) {
                  const altResponse = await fetchWithRetry(
                    `${API_BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genre.id}&language=en-US&sort_by=popularity.desc&page=${page}`,
                    { next: { revalidate: 86400 } }
                  );
                  const altData: MovieDiscoverResponse = await altResponse.json();
                  
                  // Find movie not already used (including original duplicate)
                  const alternative = altData.results.find(
                    m => m.id !== movieId && !usedMovieIds.has(m.id)
                  );
                  
                  if (alternative) {
                    usedMovieIds.add(alternative.id);
                    results[genreIndex] = {
                      id: genre.id,
                      name: genre.name,
                      thumbnailUrl: getMovieThumbnail(alternative),
                      topMovieId: alternative.id,
                      topMovieTitle: alternative.title,
                      logoUrl: null,
                    };
                    break;
                  }
                }
              } catch (error) {
                console.error(`Error fixing duplicate for ${genre.name}:`, error);
              }
            })()
          );
        }
      }
    });

    // Wait for all fixes to complete
    await Promise.all(fixPromises);

    // Step 4: Fetch logos (synchronous to avoid flickering)
    for (let i = 0; i < results.length; i++) {
      const genre = results[i];
      if (genre.topMovieId > 0) {
        try {
          const logoUrl = await getMovieLogoUrl(genre.topMovieId);
          (results[i] as GenreWithThumbnail).logoUrl = logoUrl;
        } catch {
          (results[i] as GenreWithThumbnail).logoUrl = null;
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Error fetching genres with thumbnails:", error);
    return [];
  }
}

export interface Movie {
	id: number;
	title: string;
	poster_path: string | null;
	backdrop_path: string | null;
	overview: string;
	release_date: string;
	genre_ids: number[];
	popularity: number;
	vote_average: number;
	vote_count: number;
	original_language: string;
}

export interface Genre {
	id: number;
	name: string;
}

export interface MovieDetails extends Movie {
	genres: Genre[];
	runtime: number;
	status: string;
	budget: number;
	revenue: number;
}

export interface TVShow {
	id: number;
	name: string;
	poster_path: string | null;
	backdrop_path: string | null;
	overview: string;
	first_air_date: string;
	genre_ids: number[];
	popularity: number;
	vote_average: number;
	vote_count: number;
	original_language: string;
}

export interface Episode {
	id: number;
	name: string;
	overview: string;
	vote_average: number;
	vote_count: number;
	air_date: string;
	episode_number: number;
	still_path: string | null;
	runtime: number;
}

export interface Season {
	id: number;
	name: string;
	overview: string;
	poster_path: string | null;
	season_number: number;
	episode_count: number;
	air_date: string;
	episodes?: Episode[];
}

export interface TVShowDetails extends TVShow {
	genres: Genre[];
	number_of_episodes: number;
	number_of_seasons: number;
	status: string;
	seasons: Season[];
}

export interface CastMember {
	id: number;
	name: string;
	original_name: string;
	character: string;
	profile_path: string | null;
	order: number;
}

export interface Credits {
	id: number;
	cast: CastMember[];
}

export async function getTrendingMovies(timeWindow: "day" | "week" = "week") {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/trending/movie/${timeWindow}?api_key=${API_KEY}`,
			{
				next: { revalidate: 3600 },
			}
		);
		const data = await response.json();
		return data.results as Movie[];
	} catch (error) {
		console.error("Error fetching trending movies:", error);
		return [];
	}
}

export async function getLatestMovies() {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`,
			{
				next: { revalidate: 3600 },
			}
		);
		const data = await response.json();
		return data.results as Movie[];
	} catch (error) {
		console.error("Error fetching latest movies:", error);
		return [];
	}
}

export async function getPopularMovies(page: number = 1) {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=${page}`,
			{
				next: { revalidate: 3600 },
			}
		);
		const data = await response.json();
		return data.results as Movie[];
	} catch (error) {
		console.error("Error fetching popular movies:", error);
		return [];
	}
}

export async function getTopRatedMovies(page: number = 1) {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=${page}`,
			{
				next: { revalidate: 3600 },
			}
		);
		const data = await response.json();
		return data.results as Movie[];
	} catch (error) {
		console.error("Error fetching top rated movies:", error);
		return [];
	}
}

export async function getUpcomingMovies(page: number = 1) {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=en-US&page=${page}`,
			{
				next: { revalidate: 3600 },
			}
		);
		const data = await response.json();
		return data.results as Movie[];
	} catch (error) {
		console.error("Error fetching upcoming movies:", error);
		return [];
	}
}

export async function getPopularTVShows(page: number = 1) {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/tv/popular?api_key=${API_KEY}&language=en-US&page=${page}`,
			{
				next: { revalidate: 3600 },
			}
		);
		const data = await response.json();
		return data.results as TVShow[];
	} catch (error) {
		console.error("Error fetching popular TV shows:", error);
		return [];
	}
}

export async function getTrendingTVShows(timeWindow: "day" | "week" = "week") {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/trending/tv/${timeWindow}?api_key=${API_KEY}`,
			{
				next: { revalidate: 3600 },
			}
		);
		const data = await response.json();
		return data.results as TVShow[];
	} catch (error) {
		console.error("Error fetching trending TV shows:", error);
		return [];
	}
}

export async function getMoviesByYear(year: number, page: number = 1) {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&primary_release_year=${year}&page=${page}`,
			{ next: { revalidate: 3600 } }
		);
		const data = await response.json();
		return data.results as Movie[];
	} catch (error) {
		console.error(`Error fetching movies for year ${year}:`, error);
		return [];
	}
}

export async function getGenres() {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`,
			{
				next: { revalidate: 86400 },
			}
		);
		const data = await response.json();
		return data.genres as Genre[];
	} catch (error) {
		console.error("Error fetching genres:", error);
		return [];
	}
}

export async function searchMovies(query: string, page = 1) {
	if (!query.trim()) return [];
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
				query
			)}&language=en-US&page=${page}`,
			{ next: { revalidate: 300 } }
		);
		const data = await response.json();
		return data.results as Movie[];
	} catch (error) {
		console.error("Error searching movies:", error);
		return [];
	}
}

// Multi-search result type (can be movie or TV show)
export interface MultiSearchResult {
	id: number;
	media_type: "movie" | "tv" | "person";
	title?: string;
	name?: string;
	poster_path: string | null;
	backdrop_path: string | null;
	overview: string;
	release_date?: string;
	first_air_date?: string;
	genre_ids: number[];
	popularity: number;
	vote_average: number;
	vote_count: number;
	original_language: string;
}

// Global search - searches both movies and TV shows
export async function searchMulti(query: string, page = 1): Promise<MultiSearchResult[]> {
	if (!query.trim()) return [];
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(
				query
			)}&language=en-US&page=${page}`,
			{ next: { revalidate: 300 } }
		);
		const data = await response.json();
		// Filter out person results, only keep movies and TV shows
		const results = data.results as MultiSearchResult[];
		return results.filter(
			(item) => item.media_type === "movie" || item.media_type === "tv"
		);
	} catch (error) {
		console.error("Error in multi-search:", error);
		return [];
	}
}

// Custom feed options interface
export interface CustomFeedOptions {
	region?: string;
	language?: string;
	genre?: number;
	year?: number;
	sortBy?: string;
	page?: number;
	type?: "movie" | "tv";
}

// Custom feed/discover function for filtered searches
export async function getCustomFeed(options: CustomFeedOptions = {}): Promise<MultiSearchResult[]> {
	const {
		region = "US",
		language = "en-US",
		genre = 0,
		year = 0,
		sortBy = "popularity.desc",
		page = 1,
		type = "movie"
	} = options;

	try {
		let url = `${API_BASE_URL}/discover/${type}?api_key=${API_KEY}`;
		url += `&with_origin_country=${region}`;
		url += `&language=${language}`;
		url += `&sort_by=${sortBy}`;
		url += `&page=${page}`;
		
		if (genre > 0) url += `&with_genres=${genre}`;
		if (year > 0) url += type === "movie" 
			? `&primary_release_year=${year}` 
			: `&first_air_date_year=${year}`;

		const response = await fetchWithRetry(url, { next: { revalidate: 3600 } });
		const data = await response.json();
		
		// Add media_type to each result
		const results = (data.results || []) as any[];
		return results.map(item => ({
			...item,
			media_type: type
		})) as MultiSearchResult[];
	} catch (error) {
		console.error("Error fetching custom feed:", error);
		return [];
	}
}

export async function getMovieDetails(movieId: number) {
	if (!movieId || isNaN(movieId)) return null;
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=en-US`,
			{
				next: { revalidate: 3600 },
			}
		);
		const data = await response.json();
		return data as MovieDetails;
	} catch (error) {
		console.error(`Error fetching movie details for ID ${movieId}:`, error);
		return null;
	}
}

export async function getTVShowDetails(tvId: number) {
	if (!tvId || isNaN(tvId)) return null;
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/tv/${tvId}?api_key=${API_KEY}&language=en-US&append_to_response=seasons`,
			{
				next: { revalidate: 3600 },
			}
		);
		const data = await response.json();
		return data as TVShowDetails;
	} catch (error) {
		console.error(`Error fetching TV show details for ID ${tvId}:`, error);
		return null;
	}
}

export async function getSeasonDetails(tvId: number, seasonNumber: number) {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}&language=en-US`,
			{
				next: { revalidate: 3600 },
			}
		);
		const data = await response.json();
		return data as Season;
	} catch (error) {
		console.error(
			`Error fetching season ${seasonNumber} for TV ID ${tvId}:`,
			error
		);
		return null;
	}
}

export async function getMovieCredits(movieId: number) {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}&language=en-US`,
			{ next: { revalidate: 3600 } }
		);
		const data = await response.json();
		return data as Credits;
	} catch (error) {
		console.error(`Error fetching credits for movie ${movieId}:`, error);
		return { id: movieId, cast: [] };
	}
}

export async function getTVShowCredits(tvId: number) {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/tv/${tvId}/credits?api_key=${API_KEY}&language=en-US`,
			{ next: { revalidate: 3600 } }
		);
		const data = await response.json();
		return data as Credits;
	} catch (error) {
		console.error(`Error fetching credits for TV show ${tvId}:`, error);
		return { id: tvId, cast: [] };
	}
}

export async function getMoviesByGenre(genreId: number, page = 1) {
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&language=en-US&sort_by=popularity.desc&page=${page}`,
			{ next: { revalidate: 3600 } }
		);
		const data = await response.json();
		return data.results as Movie[];
	} catch (error) {
		console.error("Error fetching movies by genre:", error);
		return [];
	}
}

export function getImageUrl(path: string | null, size = "w500") {
	if (!path) return "/abstract-movie-poster.png";

	const envBase =
		process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL ||
		"https://image.tmdb.org/t/p/w500";

	// If the requested size matches the env var's implied size (w500), just use it.
	if (size === "w500" && envBase.endsWith("/w500")) {
		return `${envBase}${path}`;
	}

	// If envBase has a size at the end, replace it.
	const sizeRegex = /\/w\d+$/;
	if (sizeRegex.test(envBase)) {
		return `${envBase.replace(sizeRegex, "/" + size)}${path}`;
	}

	// Otherwise append size
	return `${envBase}/${size}${path}`;
}

export function getBackdropUrl(path: string | null) {
	if (!path) return "/movie-backdrop.png";
	const envBase =
		process.env.NEXT_PUBLIC_TMDB_BACKDROP_BASE_URL ||
		"https://image.tmdb.org/t/p/w1280";
	return `${envBase}${path}`;
}

// Image types
interface Logo {
	file_path: string;
	vote_average: number;
	vote_count: number;
	width: number;
	height: number;
	iso_639_1: string | null;
}

export interface MovieImages {
	id: number;
	backdrops: {
		file_path: string;
		vote_average: number;
		vote_count: number;
		width: number;
		height: number;
	}[];
	logos: Logo[];
	posters: {
		file_path: string;
		vote_average: number;
		vote_count: number;
		width: number;
		height: number;
	}[];
}

export interface TVImages {
	id: number;
	backdrops: {
		file_path: string;
		vote_average: number;
		vote_count: number;
		width: number;
		height: number;
	}[];
	logos: Logo[];
	posters: {
		file_path: string;
		vote_average: number;
		vote_count: number;
		width: number;
		height: number;
	}[];
}

// Get logo URL from images response - returns highest voted logo
export function getLogoUrl(images: MovieImages | TVImages | null): string | null {
	if (!images?.logos || images.logos.length === 0) return null;

	// Sort by vote_average descending, then by vote_count descending
	const sortedLogos = [...images.logos].sort((a, b) => {
		if (b.vote_average !== a.vote_average) {
			return b.vote_average - a.vote_average;
		}
		return b.vote_count - a.vote_count;
	});

	return sortedLogos[0].file_path;
}

// Get the full logo URL with base URL
export function getLogoImageUrl(path: string | null): string | null {
	if (!path) return null;

	const envBase =
		process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL ||
		"https://image.tmdb.org/t/p/w500";

	// Logos typically look best at larger sizes, use w780 or original
	const sizeRegex = /\/w\d+$/;
	if (sizeRegex.test(envBase)) {
		return `${envBase.replace(sizeRegex, "/w780")}${path}`;
	}

	return `${envBase}/w780${path}`;
}

export async function getMovieImages(movieId: number) {
	if (!movieId || isNaN(movieId)) return null;
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/movie/${movieId}/images?api_key=${API_KEY}`,
			{ next: { revalidate: 86400 } }
		);
		const data = await response.json();
		return data as MovieImages;
	} catch (error) {
		console.error(`Error fetching images for movie ${movieId}:`, error);
		return null;
	}
}

export async function getTVImages(tvId: number) {
	if (!tvId || isNaN(tvId)) return null;
	try {
		const response = await fetchWithRetry(
			`${API_BASE_URL}/tv/${tvId}/images?api_key=${API_KEY}`,
			{ next: { revalidate: 86400 } }
		);
		const data = await response.json();
		return data as TVImages;
	} catch (error) {
		console.error(`Error fetching images for TV show ${tvId}:`, error);
		return null;
	}
}

export function getVidSrcUrl(
	mediaId: number,
	type: "movie" | "tv" = "movie",
	season?: number,
	episode?: number
) {
	const baseUrl =
		process.env.NEXT_PUBLIC_VIDSRC_BASE_URL || "https://vidsrc.cc";
	if (type === "movie") {
		return `${baseUrl}/v2/embed/movie/${mediaId}?autoPlay=true`;
	}
	if (type === "tv" && season && episode) {
		return `${baseUrl}/v2/embed/tv/${mediaId}/${season}/${episode}?autoPlay=true`;
	}
	return "#";
}

// Fetch all movies for a specific year across multiple pages
export async function getAllMoviesByYear(year: number, maxPages: number = 5): Promise<Movie[]> {
	try {
		const allMovies: Movie[] = [];
		for (let page = 1; page <= maxPages; page++) {
			const response = await fetchWithRetry(
				`${API_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&primary_release_year=${year}&page=${page}`,
				{ next: { revalidate: 3600 } }
			);
			const data = await response.json();
			if (data.results && data.results.length > 0) {
				allMovies.push(...data.results);
			} else {
				break; // No more results
			}
		}
		return allMovies;
	} catch (error) {
		console.error(`Error fetching all movies for year ${year}:`, error);
		return [];
	}
}

// Fetch all movies for a specific genre across multiple pages
export async function getAllMoviesByGenre(genreId: number, maxPages: number = 5): Promise<Movie[]> {
	try {
		const allMovies: Movie[] = [];
		for (let page = 1; page <= maxPages; page++) {
			const response = await fetchWithRetry(
				`${API_BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&language=en-US&sort_by=popularity.desc&page=${page}`,
				{ next: { revalidate: 3600 } }
			);
			const data = await response.json();
			if (data.results && data.results.length > 0) {
				allMovies.push(...data.results);
			} else {
				break; // No more results
			}
		}
		return allMovies;
	} catch (error) {
		console.error(`Error fetching all movies for genre ${genreId}:`, error);
		return [];
	}
}
