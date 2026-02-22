import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invenio - Unlimited Movies, TV Shows & More",
  description: "Watch unlimited movies, TV shows, and more. Stream anywhere, anytime, ad-free - completely free.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      {children}
    </div>
  );
}
