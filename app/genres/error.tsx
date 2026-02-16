"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GenresError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Genres page error:", error);
  }, [error]);

  return (
    <main className="bg-black min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-6xl font-bold text-red-500 mb-4">Oops!</h1>
          <h2 className="text-3xl font-bold text-white mb-3">Failed to load genres</h2>
          <p className="text-lg text-gray-400 max-w-md mx-auto">
            {error.message || "We encountered an error while loading genres. Please try again."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => reset()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/genres")}
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            Refresh Page
          </Button>
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/")}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            Go Home
          </Button>
        </div>
      </div>
    </main>
  );
}
