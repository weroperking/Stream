"use server";

import { getMoviesByGenre } from "@/lib/tmdb";

export async function fetchMoreRelatedMovies(genreId: number, page: number) {
	return await getMoviesByGenre(genreId, page);
}

export async function fetchMoviesByGenreAction(genreId: number, page: number) {
	return await getMoviesByGenre(genreId, page);
}

import { getPopularMovies, searchMovies, searchMulti, getCustomFeed, type CustomFeedOptions } from "@/lib/tmdb";

export async function fetchMoviesBySearchAction(query: string, page: number) {
	return await searchMovies(query, page);
}

export async function fetchMultiSearchAction(query: string, page: number) {
	return await searchMulti(query, page);
}

export async function fetchCustomFeedAction(options: CustomFeedOptions) {
	return await getCustomFeed(options);
}

export async function fetchPopularMoviesAction(page: number) {
	return await getPopularMovies(page);
}

import {
	getSeasonDetails as getSeasonDetailsLib,
	getTVShowDetails as getTVShowDetailsLib,
	getPopularTVShows as getPopularTVShowsLib,
	getTrendingTVShows as getTrendingTVShowsLib
} from "@/lib/tmdb";

export async function getSeasonDetails(tvId: number, seasonNumber: number) {
	return await getSeasonDetailsLib(tvId, seasonNumber);
}

export async function getTVShowDetails(tvId: number) {
	return await getTVShowDetailsLib(tvId);
}

export async function fetchPopularTVShowsAction(page: number) {
	return await getPopularTVShowsLib(page);
}

export async function fetchTrendingTVShowsAction(timeWindow: "day" | "week") {
	return await getTrendingTVShowsLib(timeWindow);
}
