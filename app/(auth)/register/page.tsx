'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, AlertCircle, Check } from 'lucide-react';
import { signUpWithOTP } from '@/app/actions/auth';

export default function RegisterPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptOffers, setAcceptOffers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Strong password validation: min 8 chars, max 60, must have letter and number
  const passwordValid = password.length >= 8 && password.length <= 60 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = emailValid && passwordValid && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Use OTP signup instead of regular signup
    const result = await signUpWithOTP(email, password);
    
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    // If no error, user was created and OTP was sent
    // Redirect to verification page
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
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

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="bg-zinc-900/80 p-8 rounded-lg border border-zinc-800">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">
                Check your email
              </h1>
              <p className="text-zinc-400 mb-6">
                We sent an 8-digit verification code to <strong className="text-white">{email}</strong>.
                Enter the code to activate your account.
              </p>
              <Link href={`/verify?email=${encodeURIComponent(email)}`}>
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                  Enter Verification Code
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
            {/* Step Indicator */}
            <div className="text-sm text-zinc-500 mb-2">Step 1 of 3</div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              Create a password to start your membership
            </h1>
            <p className="text-zinc-400 mb-6">
              Just a few more steps and you're done!
            </p>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-md p-3 mb-6 flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
                {email && !emailValid && (
                  <p className="text-red-400 text-xs mt-1">Please enter a valid email</p>
                )}
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Add a password"
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
                {password && !passwordValid && (
                  <p className="text-red-400 text-xs mt-1">
                    Password must be 8-60 characters with letters and numbers
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="offers"
                  checked={acceptOffers}
                  onCheckedChange={(checked) => setAcceptOffers(checked as boolean)}
                />
                <Label htmlFor="offers" className="text-zinc-400 text-sm cursor-pointer">
                  Please do not email me Invenio special offers
                </Label>
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Next'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-zinc-400">Already have an account? </span>
              <Link href="/login" className="text-white hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
