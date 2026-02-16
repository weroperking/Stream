export interface Provider {
    id: string;
    name: string;
    /**
     * Generate the embed URL for a movie.
     * @param tmdbId - The TMDB ID of the movie.
     */
    getMovieUrl: (tmdbId: number) => string;
    /**
     * Generate the embed URL for a TV episode.
     * @param tmdbId - The TMDB ID of the TV show.
     * @param season - The season number.
     * @param episode - The episode number.
     */
    getTVUrl: (tmdbId: number, season: number, episode: number) => string;
}

export const providers: Provider[] = [
    {
        id: "vidsrc-wtf-1",
        name: "VidSrc.wtf (API 1)",
        getMovieUrl: (id) => `https://vidsrc.wtf/api/1/movie/?id=${id}`,
        getTVUrl: (id, s, e) => `https://vidsrc.wtf/api/1/tv/?id=${id}&s=${s}&e=${e}`,
    },
    {
        id: "vidsrc-xyz",
        name: "VidSrc.xyz",
        getMovieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidsrc-to",
        name: "VidSrc.to",
        getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidsrc-cc",
        name: "VidSrc.cc",
        getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidsrc-wtf-2",
        name: "VidSrc.wtf (API 2)",
        getMovieUrl: (id) => `https://vidsrc.wtf/api/2/movie/?id=${id}&color=8B5CF6`,
        getTVUrl: (id, s, e) => `https://vidsrc.wtf/api/2/tv/?id=${id}&s=${s}&e=${e}&color=8B5CF6`,
    },
    {
        id: "vidsrc-wtf-3",
        name: "VidSrc.wtf (API 3)",
        getMovieUrl: (id) => `https://vidsrc.wtf/api/3/movie/?id=${id}`,
        getTVUrl: (id, s, e) => `https://vidsrc.wtf/api/3/tv/?id=${id}&s=${s}&e=${e}`,
    },
    {
        id: "vidsrc-wtf-4",
        name: "VidSrc.wtf (API 4)",
        getMovieUrl: (id) => `https://vidsrc.wtf/api/4/movie/?id=${id}`,
        getTVUrl: (id, s, e) => `https://vidsrc.wtf/api/4/tv/?id=${id}&s=${s}&e=${e}`,
    },
    {
        id: "vidzee",
        name: "Vidzee",
        getMovieUrl: (id) => `https://vidzee.wtf/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidzee.wtf/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidrock",
        name: "VidRock",
        getMovieUrl: (id) => `https://vidrock.pro/e/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidrock.pro/e/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidnest",
        name: "Vidnest RiveEmbed",
        getMovieUrl: (id) => `https://vidnest.stream/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidnest.stream/tv/${id}/${s}/${e}`,
    },
    {
        id: "smashy",
        name: "SmashyStream",
        getMovieUrl: (id) => `https://player.smashy.stream/movie/${id}`,
        getTVUrl: (id, s, e) => `https://player.smashy.stream/tv/${id}?s=${s}&e=${e}`,
    },
    {
        id: "111movies",
        name: "111Movies",
        getMovieUrl: (id) => `https://111movies.com/movie/${id}`,
        getTVUrl: (id, s, e) => `https://111movies.com/tv/${id}/${s}/${e}`,
    },
    {
        id: "videasy",
        name: "Videasy",
        getMovieUrl: (id) => `https://player.videasy.net/movie/${id}`,
        getTVUrl: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidlink",
        name: "VidLink",
        getMovieUrl: (id) => `https://vidlink.pro/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidfast",
        name: "VidFast",
        getMovieUrl: (id) => `https://vidfast.pro/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}`,
    },
    {
        id: "embed-su",
        name: "Embed.su",
        getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
        getTVUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
    },
    {
        id: "2embed",
        name: "2Embed",
        getMovieUrl: (id) => `https://www.2embed.cc/embed/movie?tmdb=${id}`,
        getTVUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
    },
    {
        id: "moviesapi",
        name: "MoviesAPI",
        getMovieUrl: (id) => `https://moviesapi.club/movie/${id}`,
        getTVUrl: (id, s, e) => `https://moviesapi.club/tv/${id}/${s}/${e}`,
    },
    {
        id: "autoembed",
        name: "AutoEmbed",
        getMovieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
        getTVUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
    },
    {
        id: "multiembed",
        name: "MultiEmbed",
        getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
        getTVUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
    },
    {
        id: "primewire",
        name: "PrimeWire",
        getMovieUrl: (id) => `https://primewire.tf/embed/movie?tmdb=${id}`,
        getTVUrl: (id, s, e) => `https://primewire.tf/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
    },
    {
        id: "warezcdn",
        name: "WarezCDN",
        getMovieUrl: (id) => `https://embed.warezcdn.com/filme/${id}`,
        getTVUrl: (id, s, e) => `https://embed.warezcdn.com/serie/${id}/${s}/${e}`,
    },
    {
        id: "superflix",
        name: "SuperFlix",
        getMovieUrl: (id) => `https://superflix.dev/movie/${id}`,
        getTVUrl: (id, s, e) => `https://superflix.dev/tv/${id}/${s}/${e}`,
    },
    {
        id: "vidup",
        name: "VidUp",
        getMovieUrl: (id) => `https://vidup.io/embed/movie/${id}`,
        getTVUrl: (id, s, e) => `https://vidup.io/embed/tv/${id}/${s}/${e}`,
    },
];

export const defaultProvider = providers[0];
