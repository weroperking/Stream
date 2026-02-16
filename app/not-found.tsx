"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";

export default function NotFound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio object once
    audioRef.current = new Audio("/stranger-things-clock-final-sound.mp3");
    // Preload to ensure responsiveness
    audioRef.current.load();
  }, []);

  const playSound = () => {
    if (audioRef.current) {
      // Reset time to handle rapid hovers
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Silently fail if autoplay is blocked or user hasn't interacted
      });
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-end pb-24">
      {/* Full screen background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/STLSOT.png"
          alt="Stranger Things Background"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay at bottom to make text pop more against the image if needed */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
      </div>

      <div className="z-10 flex flex-col items-center gap-8 text-center px-4 mb-10">
        {/* Main Text */}
        <h1
          className="text-6xl md:text-8xl lg:text-9xl text-[#c11515] font-bold drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] animate-pulse"
          style={{ fontFamily: "Benguiat, serif" }}
        >
          Lost your way ?
        </h1>

        {/* Custom Button */}
        <Link href="/">
          <button
            onMouseEnter={playSound}
            className="group relative w-64 h-20 bg-black/80 border-2 border-[#c11515] rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(193,21,21,0.9)] hover:border-[#ff0000]"
          >
            {/* Button Text (Default State) */}
            <span
              className="absolute inset-0 flex items-center justify-center text-2xl font-bold tracking-wider text-[#c11515] group-hover:text-[#ff0000] group-hover:drop-shadow-[0_0_8px_rgba(255,0,0,0.8)] transition-all duration-300 z-20"
              style={{ fontFamily: "Benguiat, serif" }}
            >
              GO HOME
            </span>

            {/* Scary Red Overlay on Hover */}
            <div className="absolute inset-0 bg-[#c11515]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </button>
        </Link>
      </div>
    </div>
  );
}
