import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup - Invenio",
  description: "Complete your account setup",
};

export default function OnboardingLayout({
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
