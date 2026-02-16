"use client";

import { Button } from "@/components/ui/button";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
	type CarouselApi,
} from "@/components/ui/carousel";
import type { Movie } from "@/lib/tmdb";
import { getMovieImages, getLogoImageUrl } from "@/lib/tmdb";
import { MoreInfoModal } from "@/components/more-info-modal";
import { getBackdropUrl } from "@/lib/tmdb";
import { Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

interface HeroSectionProps {
	movies: Movie[];
}

interface MovieWithLogo extends Movie {
	logoPath?: string;
}

export function HeroSection({ movies }: HeroSectionProps) {
	const [api, setApi] = React.useState<CarouselApi>();
	const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
	const [moviesWithLogos, setMoviesWithLogos] = React.useState<MovieWithLogo[]>([]);

	React.useEffect(() => {
		if (!api) {
			return;
		}

		const interval = setInterval(() => {
			api.scrollNext();
		}, 8000);

		return () => clearInterval(interval);
	}, [api]);

	// Fetch logos for each movie
	React.useEffect(() => {
		async function fetchLogos() {
			const moviesWithLogos: MovieWithLogo[] = await Promise.all(
				movies.map(async (movie) => {
					try {
						const images = await getMovieImages(movie.id);
						if (images?.logos && images.logos.length > 0) {
							// Sort by vote_average descending, then by vote_count
							const sortedLogos = [...images.logos].sort((a, b) => {
								if (b.vote_average !== a.vote_average) {
									return b.vote_average - a.vote_average;
								}
								return b.vote_count - a.vote_count;
							});
							return { ...movie, logoPath: sortedLogos[0].file_path };
						}
						return movie;
					} catch (error) {
						console.error(`Error fetching logo for movie ${movie.id}:`, error);
						return movie;
					}
				})
			);
			setMoviesWithLogos(moviesWithLogos);
		}

		if (movies.length > 0) {
			fetchLogos();
		}
	}, [movies]);

	if (!movies || movies.length === 0) return null;

	// Use fetched logos or fallback to original movies
	const displayMovies: MovieWithLogo[] = moviesWithLogos.length > 0 ? moviesWithLogos : movies as MovieWithLogo[];

	return (
		<>
			<Carousel
				setApi={setApi}
				className="w-full group"
				opts={{ loop: true }}>
				<CarouselContent>
					{displayMovies.map((movie) => {
						const year = new Date(movie.release_date).getFullYear();
						const logoUrl = movie.logoPath ? getLogoImageUrl(movie.logoPath) : null;

						return (
							<CarouselItem key={movie.id}>
								<div 
									className="relative w-full h-[500px] md:h-[600px] overflow-hidden transition-all duration-700"
									onMouseMove={(e) => {
										const rect = e.currentTarget.getBoundingClientRect();
										const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
										const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
										e.currentTarget.style.transform = `perspective(1200px) rotateX(${-y}deg) rotateY(${x}deg) scale3d(1.05, 1.05, 1.05)`;
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.transform = "perspective(1200px) rotateX(0) rotateY(0) scale3d(1, 1, 1)";
									}}
								>
									<Link href={`/movie/${movie.id}`} className="absolute inset-0 z-10 block">
										<span className="sr-only">Watch {movie.title}</span>
									</Link>
									{/* Background Image with 3D effect */}
									<div className="absolute inset-0 transform-style-preserve-3d">
										<Image
											src={
												getBackdropUrl(movie.backdrop_path) ||
												"/movie-backdrop.png"
											}
											alt={movie.title}
											fill
											className="object-cover transform translateZ(-50px) scale(1.1)"
											priority
											sizes="100vw"
										/>
									</div>

									{/* 3D Gradient Overlay */}
									<div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent transform translateZ(20px)" />

									{/* 3D Content Layer */}
									<div className="absolute inset-0 flex items-center px-4 sm:px-8 transform translateZ(50px)">
										<div className="max-w-2xl space-y-6">
											<div>
												{/* Logo or Title */}
												{logoUrl ? (
													<Image
														src={logoUrl}
														alt={`${movie.title} logo`}
														width={400}
														height={150}
														className="h-auto w-auto max-h-[120px] md:max-h-[150px] object-contain animate-in fade-in slide-in-from-bottom-4 duration-1000"
														priority
													/>
												) : (
													<h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground text-balance animate-in fade-in slide-in-from-bottom-4 duration-1000">
														{movie.title}
													</h1>
												)}
												<div className="flex items-center gap-4 mt-4 text-muted-foreground animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-100 text-sm sm:text-base">
													<span className="flex items-center gap-1">
														<span className="text-primary">
															★
														</span>
														{movie.vote_average.toFixed(1)}/10
													</span>
													<span>{year}</span>
												</div>
											</div>

											<p className="text-sm sm:text-lg text-muted-foreground line-clamp-3 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
												{movie.overview}
											</p>

											<div className="flex gap-4 pt-4 animate-in fade-in slide-in-from-bottom-7 duration-1000 delay-300 relative z-20">
												<Link href={`/movie/${movie.id}`}>
													<Button variant="glass-primary" size="lg" className="gap-2">
														<Play size={20} />
														Watch Now
													</Button>
												</Link>

												<Button
													variant="glass"
													size="lg"
													onClick={(e) => {
														e.stopPropagation();
														e.preventDefault();
														setSelectedMovie(movie);
													}}
													className="gap-2"
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info">
														<circle cx="12" cy="12" r="10"></circle>
														<path d="M12 16v-4"></path>
														<path d="M12 8h.01"></path>
													</svg>
													More Info
												</Button>
											</div>
										</div>
									</div>
								</div>
							</CarouselItem>
						);
					})}
				</CarouselContent>
				<CarouselPrevious className="left-4 opacity-0 group-hover:opacity-100 transition-opacity" />
				<CarouselNext className="right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
			</Carousel>

			{selectedMovie && (
				<MoreInfoModal
					movie={selectedMovie}
					isOpen={!!selectedMovie}
					onClose={() => setSelectedMovie(null)}
				/>
			)}
		</>
	);
}
