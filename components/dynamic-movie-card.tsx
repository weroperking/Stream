"use client";

import { MoreInfoModal } from "@/components/more-info-modal";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { Movie, TVShow } from "@/lib/tmdb";
import { getCertification, getImageUrl } from "@/lib/tmdb";
import { Bookmark, Info, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type MediaType = "movie" | "tv";

interface DynamicMovieCardProps {
	movie: Movie | TVShow;
	type?: MediaType;
	priority?: boolean;
}

// Determine media type from the item
function getMediaType(item: Movie | TVShow, type?: MediaType): MediaType {
	if (type) return type;
	// Check if it has 'first_air_date' (TV show) or 'release_date' (movie)
	return "first_air_date" in item ? "tv" : "movie";
}

// Get title from movie or TV show
function getTitle(item: Movie | TVShow): string {
	return "name" in item ? (item as TVShow).name : (item as Movie).title;
}

// Get release date from movie or TV show
function getReleaseDate(item: Movie | TVShow): string {
	return "first_air_date" in item
		? (item as TVShow).first_air_date
		: (item as Movie).release_date;
}

// Get poster path from movie or TV show
function getPosterPath(item: Movie | TVShow): string | null {
	return item.poster_path;
}

// Certification badge styling based on rating
function getCertificationStyle(certification: string): {
	background: string;
	borderColor: string;
	textColor: string;
} {
	const cert = certification.toUpperCase();

	switch (cert) {
		case "G":
		case "TV-G":
			return {
				background: "bg-green-500",
				borderColor: "border-green-400",
				textColor: "text-white",
			};
		case "PG":
		case "TV-PG":
			return {
				background: "bg-yellow-500",
				borderColor: "border-yellow-400",
				textColor: "text-black",
			};
		case "PG-13":
		case "TV-14":
			return {
				background: "bg-orange-500",
				borderColor: "border-orange-400",
				textColor: "text-white",
			};
		case "R":
		case "NC-17":
		case "TV-MA":
			return {
				background: "bg-red-600",
				borderColor: "border-red-500",
				textColor: "text-white",
			};
		default:
			return {
				background: "bg-gray-600",
				borderColor: "border-gray-500",
				textColor: "text-white",
			};
	}
}

export function DynamicMovieCard({ movie, type, priority = false }: DynamicMovieCardProps) {
	const [showModal, setShowModal] = useState(false);
	const [certification, setCertification] = useState<string | null>(null);
	const [isLoadingCert, setIsLoadingCert] = useState(true);

	const mediaType = getMediaType(movie, type);
	const title = getTitle(movie);
	const releaseDate = getReleaseDate(movie);
	const posterPath = getPosterPath(movie);

	const { isSaved, toggleSave } = useWatchlist();
	const saved = isSaved(movie.id);

	const linkHref = mediaType === "tv" ? `/tv/${movie.id}` : `/movie/${movie.id}`;

	// Fetch certification on mount
	useEffect(() => {
		let mounted = true;

		async function fetchCertification() {
			try {
				const cert = await getCertification(movie.id, mediaType);
				if (mounted) {
					setCertification(cert);
				}
			} catch (error) {
				console.error("Error fetching certification:", error);
			} finally {
				if (mounted) {
					setIsLoadingCert(false);
				}
			}
		}

		fetchCertification();

		return () => {
			mounted = false;
		};
	}, [movie.id, mediaType]);

	const certStyle = certification ? getCertificationStyle(certification) : null;
	const hasCertification = !!certification && !isLoadingCert;

	return (
		<>
			<Link href={linkHref} className="block h-full">
				<div className="group cursor-pointer h-full relative">
					<div className="relative overflow-hidden rounded-lg aspect-[2/3] bg-card">
						<Image
							src={getImageUrl(posterPath, "w342") || "/placeholder.svg"}
							alt={title}
							fill
							priority={priority}
							className="object-cover transition-all duration-300 ease-in-out group-hover:scale-105"
							sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
						/>

						{/* Certification Badge - Primary Visual Element */}
						<div className="absolute top-2 left-2 z-20">
							{hasCertification && certStyle ? (
								<span
									className={`
										${certStyle.background} ${certStyle.textColor}
										px-2 py-0.5 text-xs font-bold rounded border
										${certStyle.borderColor} shadow-lg
										drop-shadow-md
									`}
								>
									{certification}
								</span>
							) : (
								// Show rating prominently if no certification
								<div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded border border-yellow-400/50">
									<Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
									<span className="text-xs font-bold text-white">
										{movie.vote_average.toFixed(1)}
									</span>
								</div>
							)}
						</div>

						{/* Rating Badge - Secondary (when certification exists) */}
						{hasCertification && (
							<div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded border border-yellow-400/30">
								<Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
								<span className="text-xs font-medium text-white">
									{movie.vote_average.toFixed(1)}
								</span>
							</div>
						)}

						{/* Overlay on hover */}
						<div className="absolute inset-0 bg-gradient-overlay opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out flex flex-col justify-end p-4">
							{/* Center Buttons */}
							<div className="absolute inset-0 flex items-center justify-center gap-4 transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100">
								<button
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										window.location.href = linkHref;
									}}
									className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:bg-white/90 shadow-lg transition-colors text-black hover:scale-110 transition-transform"
								>
									<Play size={24} fill="currentColor" />
								</button>

								<button
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										setShowModal(true);
									}}
									className="w-12 h-12 rounded-full border-2 border-gray-300 hover:border-white flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white transition-all"
								>
									<Info size={24} />
								</button>
							</div>

							{/* Save Button - Bottom Right */}
							<button
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									toggleSave(movie);
								}}
								className={`absolute bottom-4 right-4 z-20 p-2 rounded-full hover:bg-black/40 transition-colors ${saved ? "text-yellow-400" : "text-white hover:text-yellow-400"}`}
							>
								<Bookmark size={24} fill={saved ? "currentColor" : "none"} />
							</button>

							{/* Title and Year */}
							<div className="space-y-1 w-full relative z-10 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 pr-12">
								<h3 className="font-semibold text-sm text-foreground line-clamp-2 drop-shadow-md">
									{title}
								</h3>
								<div className="flex items-center gap-2 text-white/90 text-xs">
									<span>
										{releaseDate
											? new Date(releaseDate).getFullYear()
											: "N/A"}
									</span>
									<span className="text-white/50">|</span>
									<span className="uppercase text-white/70">
										{mediaType === "tv" ? "TV Series" : "Movie"}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Link>

			<MoreInfoModal
				movie={movie}
				isOpen={showModal}
				onClose={() => setShowModal(false)}
			/>
		</>
	);
}
