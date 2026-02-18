import { MovieCategorySection } from "@/components/movie-category-section";
import { getPopularMovies, getTopRatedMovies, getTrendingMovies, getUpcomingMovies, type Movie } from "@/lib/tmdb";

interface Category {
	id: string;
	title: string;
	fetchFn: () => Promise<Movie[]>;
}

const CATEGORIES: Category[] = [
	{
		id: "trending",
		title: "Trending Now",
		fetchFn: () => getTrendingMovies("week"),
	},
	{
		id: "popular",
		title: "Popular",
		fetchFn: () => getPopularMovies(1),
	},
	{
		id: "top-rated",
		title: "Top Rated",
		fetchFn: () => getTopRatedMovies(1),
	},
	{
		id: "upcoming",
		title: "Upcoming",
		fetchFn: () => getUpcomingMovies(1),
	},
];

interface MovieSectionsContainerProps {
	showFeaturedRow?: boolean;
	maxCategories?: number;
}

export async function MovieSectionsContainer({
	showFeaturedRow = true,
	maxCategories,
}: MovieSectionsContainerProps) {
	// Fetch all category data in parallel
	const categoriesToShow = maxCategories ? CATEGORIES.slice(0, maxCategories) : CATEGORIES;

	const categoryData = await Promise.all(
		categoriesToShow.map(async (category) => {
			try {
				const movies = await category.fetchFn();
				return {
					...category,
					movies,
				};
			} catch (error) {
				console.error(`Error fetching ${category.id}:`, error);
				return {
					...category,
					movies: [],
				};
			}
		})
	);

	return (
		<div className="space-y-12">
			{categoryData.map((category) => (
				<MovieCategorySection
					key={category.id}
					title={category.title}
					movies={category.movies}
					showFeaturedRow={showFeaturedRow}
				/>
			))}
		</div>
	);
}
