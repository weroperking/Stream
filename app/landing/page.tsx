import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, ChevronRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative min-h-screen flex flex-col">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black z-10" />
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1920&q=80')`,
          }}
        />

        {/* Navigation Header */}
        <header className="relative z-20 flex items-center justify-between px-6 py-4 md:px-12 md:py-6">
          <div className="flex items-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Invenio
            </h1>
          </div>
          
          <Link href="/login">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10 px-6"
            >
              Sign In
            </Button>
          </Link>
        </header>

        {/* Hero Content */}
        <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 text-center mt-20">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-4xl leading-tight">
            Unlimited movies, TV shows, and more
          </h2>
          
          <p className="text-lg md:text-xl text-zinc-300 mb-8 max-w-2xl">
            Watch anywhere. Cancel anytime. Enjoy ad-free streaming with thousands of titles - completely free.
          </p>

          {/* Email Signup Form */}
          <form action="/register" method="get" className="w-full max-w-xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                name="email"
                placeholder="Enter your email"
                required
                className="flex-1 h-14 bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-400 text-lg px-5 rounded-md focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
              <Button
                type="submit"
                size="lg"
                className="h-14 px-8 bg-red-600 hover:bg-red-700 text-lg font-medium rounded-md"
              >
                Get Started
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </form>

          {/* Feature Highlights */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Watch Anywhere</h3>
              <p className="text-zinc-400">Stream on your TV, laptop, phone, or tablet</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Download & Go</h3>
              <p className="text-zinc-400">Save your favorites easily and always have something to watch</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Profiles</h3>
              <p className="text-zinc-400">Create up to 5 profiles for everyone in your household</p>
            </div>
          </div>
        </main>
      </div>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-zinc-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            <FAQItem 
              question="What is Invenio?"
              answer="Invenio is a free streaming service that offers a wide variety of award-winning TV shows, movies, anime, documentaries, and more on thousands of internet-connected devices. Completely free, no subscription required."
            />
            
            <FAQItem 
              question="How much does it cost?"
              answer="Invenio is completely free! There are no subscription fees, no payment required, and no hidden costs. Enjoy unlimited access to thousands of movies and TV shows at no cost."
            />
            
            <FAQItem 
              question="Where can I watch?"
              answer="Watch anywhere, anytime. Sign in with your Invenio account to watch instantly on the web from your personal computer or on any internet-connected device that offers the Invenio app."
            />
            
            <FAQItem 
              question="How do I cancel?"
              answer="Invenio is free and flexible. There are no contracts and no commitments. You can stop using our service anytime with no cancellation fees."
            />
            
            <FAQItem 
              question="What can I watch on Invenio?"
              answer="Invenio has an extensive library of feature films, documentaries, TV shows, anime, award-winning originals, and more. Watch as much as you want, anytime you want - all for free."
            />
          </div>

          {/* CTA at bottom of FAQ */}
          <div className="mt-12 text-center">
            <p className="text-lg text-zinc-300 mb-6">
              Ready to watch? Enter your email to create or restart your membership.
            </p>
            <form action="/register" method="get" className="flex flex-col sm:flex-row gap-3 justify-center">
              <Input
                type="email"
                name="email"
                placeholder="Enter your email"
                required
                className="w-full sm:w-80 h-12 bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-400"
              />
              <Button
                type="submit"
                size="lg"
                className="h-12 px-6 bg-red-600 hover:bg-red-700"
              >
                Get Started
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-zinc-800/50 rounded-lg overflow-hidden">
      <summary className="flex items-center justify-between p-5 cursor-pointer font-medium text-lg hover:bg-zinc-800/70 transition-colors">
        {question}
        <span className="transition-transform group-open:rotate-180">
          <ChevronRight className="w-5 h-5 rotate-90" />
        </span>
      </summary>
      <div className="px-5 pb-5 text-zinc-300">
        {answer}
      </div>
    </details>
  );
}
