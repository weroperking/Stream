'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { AUTH_ERRORS } from '@/lib/auth-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn(email, password);

    if (result.error) {
      const errorMessage = result.error.message;

      // If email is not confirmed, show a more helpful message with a link to verify
      if (errorMessage === AUTH_ERRORS.EMAIL_NOT_CONFIRMED) {
        setError(
          <span>
            Please verify your email first.{' '}
            <Link href={`/verify?email=${encodeURIComponent(email)}`} className="text-red-400 underline hover:text-red-300">
              Resend verification code
            </Link>
          </span>
        );
      } else {
        setError(errorMessage);
      }
      setLoading(false);
      return;
    }

    // Check onboarding status and redirect accordingly
    // First, try to fetch the profile to check onboarding status
    const response = await fetch('/api/auth/onboarding-status');
    if (response.ok) {
      const { onboardingCompleted } = await response.json();
      if (!onboardingCompleted) {
        router.push('/profiles');
        router.refresh();
        return;
      }
    }
    
    // On success, redirect to homepage
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="block w-32">
          <div 
            className="text-3xl font-bold text-red-600"
            style={{ fontFamily: 'DEEPLY ROOTED' }}
          >
            Invenio
          </div>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-zinc-900/80 p-8 rounded-lg border border-zinc-800">
            <h1 className="text-3xl font-bold text-white mb-6">Sign In</h1>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-md p-3 mb-6 flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-zinc-400 text-sm">
                  Email or phone number
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-zinc-400 text-sm">
                  Password
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/forgot-password" className="text-zinc-400 text-sm hover:text-white">
                Forgot your password?
              </Link>
            </div>

            <div className="mt-6 text-center">
              <span className="text-zinc-400">Don't have an account? </span>
              <Link href="/register" className="text-white hover:underline">
                Sign up now
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
