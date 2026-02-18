import Image from "next/image";
import Link from "next/link";

const currentYear = new Date().getFullYear();

const navigationLinks = [
	{ label: "Home", href: "/" },
	{ label: "Movies", href: "/movies" },
	{ label: "TV Shows", href: "/tv" },
	{ label: "Genres", href: "/genres" },
	{ label: "Search", href: "/search" },
];

const companyLinks = [
	{ label: "About", href: "#about" },
	{ label: "Contact", href: "#contact" },
	{ label: "Help/FAQ", href: "#help" },
];

const legalLinks = [
	{ label: "Privacy Policy", href: "/privacy" },
	{ label: "Terms of Service", href: "/terms" },
	{ label: "DMCA Policy", href: "/dmca" },
	{ label: "Cookie Policy", href: "#cookie" },
];

export function GlobalFooter() {
	return (
		<footer className="bg-[#0a0a0a] border-t border-white/10 mt-auto">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				{/* Main Footer Content */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
					{/* Company Logo and Description */}
					<div className="lg:col-span-1">
						<Link href="/" className="flex items-center gap-3 mb-4">
							<Image
								src="/invenio-logo.png"
								alt="Stream"
								width={140}
								height={32}
								className="h-8 w-auto"
							/>
						</Link>
						<p className="text-zinc-400 text-sm leading-relaxed mb-4">
							Your destination for free streaming of movies and TV shows. Enjoy
							unlimited entertainment without any subscription.
						</p>
						<p className="text-zinc-500 text-xs">
							© {currentYear} Stream. All rights reserved.
						</p>
					</div>

					{/* Navigation Links */}
					<div>
						<h3 className="text-white font-semibold mb-4">Browse</h3>
						<ul className="space-y-3">
							{navigationLinks.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-zinc-400 hover:text-white text-sm transition-colors"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Company Links */}
					<div>
						<h3 className="text-white font-semibold mb-4">Company</h3>
						<ul className="space-y-3">
							{companyLinks.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-zinc-400 hover:text-white text-sm transition-colors"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Legal Links */}
					<div>
						<h3 className="text-white font-semibold mb-4">Legal</h3>
						<ul className="space-y-3">
							{legalLinks.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-zinc-400 hover:text-white text-sm transition-colors"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Legal Disclaimer */}
				<div className="mt-12 pt-8 border-t border-white/10">
					<div className="bg-zinc-900/50 rounded-lg p-4 md:p-6">
						<p className="text-zinc-400 text-sm text-center leading-relaxed">
							<span className="text-primary font-medium">Disclaimer:</span>{" "}
							This site does not store any files on our servers, we only link
							to media hosted in third-party providers. All media content is
							provided by external sources and we do not host or upload any
							videos. We are not responsible for the accuracy, completeness,
							or legality of the content on linked external sites.
						</p>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
					<p className="text-zinc-500 text-xs text-center md:text-left">
						Designed with passion for movie enthusiasts.
					</p>
					<div className="flex items-center gap-6">
						<Link
							href="/privacy"
							className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
						>
							Privacy
						</Link>
						<Link
							href="/terms"
							className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
						>
							Terms
						</Link>
						<Link
							href="/dmca"
							className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
						>
							DMCA
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
