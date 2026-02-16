"use client";

import { fetchPopularMoviesAction } from "@/app/actions";
import { SearchModal } from "@/components/search-modal";
import type { Movie } from "@/lib/tmdb";
import {
	Menu,
	Search,
	X,
	Home,
	Clapperboard,
	Tv,
	List,
	Bookmark,
	Calendar
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Navbar() {
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
	const router = useRouter();

	// Pre-fetch trending/popular movies for instant search load
	useEffect(() => {
		const loadTrending = async () => {
			try {
				const data = await fetchPopularMoviesAction(1);
				setTrendingMovies(data.slice(0, 18));
			} catch (e) {
				console.error("Failed to load trending for search", e);
			}
		};
		loadTrending();
	}, []);

	const currentYear = new Date().getFullYear();

	const navLinks = [
		{ label: "Home", href: "/", icon: Home },
		{ label: "Movies", href: "/movies", icon: Clapperboard },
		{ label: "TV Shows", href: "/tv", icon: Tv },
		{ label: "Genres", href: "/genres", icon: List },
		{ label: "Saved", href: "/saved", icon: Bookmark },
		{ label: `${currentYear}`, href: `/year/${currentYear}`, icon: Calendar },
	];

	return (
		<>
			{/* 
              Floating Pill Navbar 
              - Fixed at top
              - Centered
              - Pill shaped
              - Glassy background
            */}
			<nav className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-full px-4 sm:px-6 lg:px-8 pointer-events-none">
				<div className="mx-auto max-w-7xl w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-full shadow-2xl px-6 py-3 flex items-center justify-between pointer-events-auto">
					{/* Logo */}
					<Link
						href="/"
						className="flex-shrink-0 font-bold text-lg text-white hover:text-primary transition-colors flex items-center gap-2 mr-4"
					>
						<Image
							src="/invenio-logo.png"
							alt="Free Streaming"
							width={180}
							height={40}
							className="hidden sm:inline h-8 w-auto"
						/>
					</Link>

					{/* Desktop Navigation */}
					<div className="hidden md:flex items-center gap-2 lg:gap-4 ml-8">
						{navLinks.map((link) => {
							const isActive = pathname === link.href;
							const Icon = link.icon;
							return (
								<Link
									key={link.href}
									href={link.href}
									className={`
                                        flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap
                                        ${isActive
											? "bg-white/10 text-white shadow-lg shadow-primary/10 border border-white/5"
											: "text-zinc-400 hover:text-white hover:bg-white/5"
										}
                                    `}
								>
									<Icon size={16} className={isActive ? "text-primary" : ""} />
									<span className="hidden lg:inline">{link.label}</span>
									<span className="lg:hidden">{link.label === "Home" ? "" : link.label}</span>
								</Link>
							);
						})}
					</div>

					{/* Right Side: Search & Mobile Menu */}
					<div className="flex items-center gap-4 pl-4 border-l border-white/10">
						<button
							onClick={() => setIsSearchOpen(true)}
							className="flex items-center gap-2 px-4 lg:px-6 py-2.5 rounded-full bg-gradient-to-r from-primary/80 to-accent/80 hover:from-primary hover:to-accent text-white text-sm font-medium transition-all shadow-lg hover:shadow-primary/25 group whitespace-nowrap"
						>
							<span className="hidden sm:inline">Search</span>
							<Search size={16} className="group-hover:scale-110 transition-transform" />
						</button>

						<button
							onClick={() => setIsOpen(!isOpen)}
							className="md:hidden p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
						>
							{isOpen ? <X size={24} /> : <Menu size={24} />}
						</button>
					</div>
				</div>

				{/* Mobile Menu Dropdown (Floating below) */}
				{isOpen && (
					<div className="absolute top-full left-0 right-0 mt-4 p-4 mx-2 bg-[#141414] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-5 fade-in duration-200">
						<div className="grid grid-cols-2 gap-2">
							{navLinks.map((link) => {
								const isActive = pathname === link.href;
								const Icon = link.icon;
								return (
									<Link
										key={link.href}
										href={link.href}
										onClick={() => setIsOpen(false)}
										className={`
                                            flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all
                                            ${isActive
												? "bg-primary/20 text-primary border border-primary/20"
												: "bg-zinc-900/50 text-zinc-400 hover:bg-white/5 hover:text-white"
											}
                                        `}
									>
										<Icon size={24} />
										<span className="text-sm font-medium">{link.label}</span>
									</Link>
								);
							})}
						</div>
					</div>
				)}
			</nav>

			<SearchModal
				isOpen={isSearchOpen}
				onClose={() => setIsSearchOpen(false)}
				initialMovies={trendingMovies}
			/>
		</>
	);
}
