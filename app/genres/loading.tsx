import { Navbar } from "@/components/navbar";

function GenreCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-lg h-32 md:h-40 animate-pulse bg-gray-800">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800" />
    </div>
  );
}

export default function GenresLoading() {
  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen">
        <div className="pt-20 pb-8">
          <div className="px-4 md:px-12 mb-8 md:mb-12">
            <div className="h-12 w-64 bg-gray-700 rounded animate-pulse mb-3" />
            <div className="h-6 w-96 bg-gray-800 rounded animate-pulse" />
          </div>

          <div className="px-4 md:px-12">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <GenreCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
