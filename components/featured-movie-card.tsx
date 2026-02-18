"use client";

import { MoreInfoModal } from "@/components/more-info-modal";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { Movie, TVShow } from "@/lib/tmdb";
import { getCertification, getBackdropUrl, getImageUrl } from "@/lib/tmdb";
import { Bookmark, Info, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type MediaType = "movie" | "tv";
type Orientation = "landscape" | "portrait";

interface FeaturedMovieCardProps {
	movie: Movie | TVShow;
	type?: MediaType;
	orientation?: Orientation;
	showTitleBelow?: boolean;
	priority?: boolean;
}

// Determine media type from the item
function getMediaType(item: Movie | TVShow, type?: MediaType): MediaType {
	if (type) return type;
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

// Get backdrop or poster path
function getImagePath(item: Movie | TVShow, orientation: Orientation): string | null {
	if (orientation === "landscape") {
		return item.backdrop_path || item.poster_path;
	}
	return item.poster_path || item.backdrop_path;
}

// Get appropriate image size based on orientation
function getImageSize(orientation: Orientation): string {
	return orientation === "landscape" ? "w780" : "w500";
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

// Rating color based on vote average
function getRatingColor(rating: number): string {
	if (rating >= 7.5) return "text-green-400";
	if (rating >= 6.0) return "text-yellow-400";
	if (rating >= 4.0) return "text-orange-400";
	return "text-red-400";
}

export function FeaturedMovieCard({
	movie,
	type,
	orientation = "landscape",
	showTitleBelow = false,
	priority = false,
}: FeaturedMovieCardProps) {
	const [showModal, setShowModal] = useState(false);
	const [certification, setCertification] = useState<string | null>(null);
	const [isLoadingCert, setIsLoadingCert] = useState(true);

	const mediaType = getMediaType(movie, type);
	const title = getTitle(movie);
	const releaseDate = getReleaseDate(movie);
	const imagePath = getImagePath(movie, orientation);
	const imageSize = getImageSize(orientation);

	const { isSaved, toggleSave } = useWatchlist();
	const saved = isSaved(movie.id);

	const linkHref = mediaType === "tv" ? `/tv/${movie.id}` : `/movie/${movie.id}`;
	const imageUrl =
		orientation === "landscape"
			? getBackdropUrl(imagePath)
			: getImageUrl(imagePath, imageSize);

	// Aspect ratio based on orientation
	const aspectRatioClass =
		orientation === "landscape" ? "aspect-[16/9]" : "aspect-[2/3]";

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
			<Link href={linkHref} className="block h-full group">
				<div className="h-full relative">
					{/* Card Image Container */}
					<div
						className={`
							relative overflow-hidden rounded-xl bg-card
							${aspectRatioClass}
							group-hover:ring-2 ring-primary/50 transition-all duration-300
						`}
					>
						<Image
							src={imageUrl || "/placeholder.svg"}
							alt={title}
							fill
							priority={priority}
							className="object-cover transition-all duration-500 ease-in-out group-hover:scale-110"
							sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
						/>

						{/* Gradient Overlay */}
						<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

						{/* Top Badges Container */}
						<div className="absolute top-3 left-3 right-3 flex items-start justify-between z-20">
							{/* Certification Badge - Prominent */}
							<div>
								{hasCertification && certStyle ? (
									<span
										className={`
											${certStyle.background} ${certStyle.textColor}
											px-3 py-1 text-sm font-bold rounded-md border-2
											${certStyle.borderColor} shadow-lg
											drop-shadow-md backdrop-blur-sm
										`}
									>
										{certification}
									</span>
								) : (
									// Show rating prominently if no certification
									<div
										className={`
											flex items-center gap-1.5 px-3 py-1.5 rounded-md 
											bg-black/70 backdrop-blur-sm border border-yellow-400/40 shadow-lg
										`}
									>
										<Star
											className={`w-4 h-4 ${getRatingColor(movie.vote_average)} fill-current`}
										/>
										<span
											className={`text-sm font-bold ${getRatingColor(
												movie.vote_average
											)}`}
										>
											{movie.vote_average.toFixed(1)}
										</span>
									</div>
								)}
							</div>

							{/* Rating Badge (when certification exists) */}
							{hasCertification && (
								<div
									className={`
										flex items-center gap-1.5 px-3 py-1.5 rounded-md 
										bg-black/70 backdrop-blur-sm border border-yellow-400/30 shadow-lg
									`}
								>
									<Star
										className={`w-4 h-4 ${getRatingColor(
											movie.vote_average
										)} fill-current`}
									/>
									<span
										className={`text-sm font-bold ${getRatingColor(
											movie.vote_average
										)}`}
									>
										{movie.vote_average.toFixed(1)}
									</span>
								</div>
							)}
						</div>

						{/* Center Play Button - Shows on Hover */}
						<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
							<div className="flex items-center gap-4 transform scale-75 group-hover:scale-100 transition-transform duration-300">
								<button
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										window.location.href = linkHref;
									}}
									className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:bg-white/90 shadow-xl transition-all text-black hover:scale-110"
								>
									<Play size={32} fill="currentColor" />
								</button>

								<button
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										setShowModal(true);
									}}
									className="w-14 h-14 rounded-full border-2 border-white/50 hover:border-white flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white transition-all hover:scale-110"
								>
									<Info size={28} />
								</button>
							</div>
						</div>

						{/* Save Button */}
						<button
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								toggleSave(movie);
							}}
							className={`absolute bottom-3 right-3 z-20 p-2.5 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-all hover:scale-110 ${saved ? "text-yellow-400" : "text-white hover:text-yellow-400"}`}
						>
							<Bookmark size={22} fill={saved ? "currentColor" : "none"} />
						</button>

						{/* Bottom Content - Title and Info (shown on hover or always) */}
						{!showTitleBelow && (
							<div className="absolute bottom-0 left-0 right-0 p-4 z-10">
								<h3 className="font-bold text-lg text-white line-clamp-2 drop-shadow-lg">
									{title}
								</h3>
								<div className="flex items-center gap-2 text-white/80 text-sm mt-1">
									<span>
										{releaseDate
											? new Date(releaseDate).getFullYear()
											: "N/A"}
									</span>
									<span className="text-white/30">•</span>
									<span className="uppercase text-white/70 text-xs tracking-wide">
										{mediaType === "tv" ? "TV Series" : "Movie"}
									</span>
									<span className="text-white/30">•</span>
									<span className={`font-medium ${getRatingColor(movie.vote_average)}`}>
										★ {movie.vote_average.toFixed(1)}
									</span>
								</div>
							</div>
						)}
					</div>

					{/* Title Below Card */}
					{showTitleBelow && (
						<div className="mt-3 space-y-1">
							<h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
								{title}
							</h3>
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<span>
									{releaseDate
										? new Date(releaseDate).getFullYear()
										: "N/A"}
								</span>
								<span className="text-muted">|</span>
								<span className={getRatingColor(movie.vote_average)}>
									★ {movie.vote_average.toFixed(1)}
								</span>
								{hasCertification && certification && (
									<>
										<span className="text-muted">|</span>
										<span className="font-medium text-muted-foreground">
											{certification}
										</span>
									</>
								)}
							</div>
						</div>
					)}
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
