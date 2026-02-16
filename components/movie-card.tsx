"use client";

import { MoreInfoModal } from "@/components/more-info-modal";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { Movie } from "@/lib/tmdb";
import { getImageUrl } from "@/lib/tmdb";
import { Bookmark, Info, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface MovieCardProps {
	movie: Movie;
}

import { useRouter } from "next/navigation";

export function MovieCard({ movie }: MovieCardProps) {
	const [showModal, setShowModal] = useState(false);
	const router = useRouter();

	const linkHref = "name" in movie || !!(movie as any).first_air_date ? `/tv/${movie.id}` : `/movie/${movie.id}`;
	const releaseDate = "first_air_date" in movie ? (movie as any).first_air_date : movie.release_date;
	const title = "name" in movie ? (movie as any).name : movie.title;

	const { isSaved, toggleSave } = useWatchlist();
	const saved = isSaved(movie.id);

	return (
		<>
			<Link href={linkHref} className="block h-full">
				<div className="group cursor-pointer h-full relative">
					<div className="relative overflow-hidden rounded-lg aspect-[2/3] bg-card">
						<Image
							src={getImageUrl(movie.poster_path, "w342") || "/placeholder.svg"}
							alt={title}
							fill
							className="object-cover transition-all duration-300 ease-in-out"
							sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
						/>
						{/* Overlay on hover */}
						<div className="absolute inset-0 bg-gradient-overlay opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out flex flex-col justify-end p-4">

							{/* Center Buttons */}
							<div className="absolute inset-0 flex items-center justify-center gap-4 transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100">
								{/* Play Button - Links to movie/TV page */}
								<button
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										router.push(linkHref);
									}}
									className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:bg-white/90 shadow-lg transition-colors text-black hover:scale-110 transition-transform"
								>
									<Play size={24} fill="currentColor" />
								</button>

								{/* Info Button - Stops propagation to open modal */}
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

							<div className="space-y-2 w-full relative z-10 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 pr-12">
								<h3 className="font-semibold text-foreground line-clamp-2 drop-shadow-md">
									{title}
								</h3>
								<div className="flex items-center gap-2 text-white/90">
									<span className="text-sm font-medium text-green-400">
										★ {movie.vote_average.toFixed(1)}
									</span>
									<span className="text-sm">
										{releaseDate ? new Date(releaseDate).getFullYear() : "N/A"}
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
