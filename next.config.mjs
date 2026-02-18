/** @type {import('next').NextConfig} */
const nextConfig = {
	// Allow cross-origin requests from local network devices (Section 7)
	allowedDevOrigins: [
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://192.168.0.109:3000",
	],

	// Image optimization
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "image.tmdb.org",
				pathname: "/t/p/**",
			},
		],
	},

	// Enable React strict mode for better development error detection
	reactStrictMode: true,

	typescript: {
		ignoreBuildErrors: true,
	},
};

export default nextConfig;
