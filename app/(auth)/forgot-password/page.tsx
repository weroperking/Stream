'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPassword } from '@/app/actions/auth';
import { Loader2, AlertCircle, Check } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailValid) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    const result = await forgotPassword(email);
    
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    
    // Show success message
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
                We sent a password reset link to{' '}
                <strong className="text-white">{email}</strong>.
                Click the link in the email to reset your password.
              </p>
              <Link href="/login">
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                  Back to Sign In
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
            <h1 className="text-3xl font-bold text-white mb-2">
              Forgot password?
            </h1>
            <p className="text-zinc-400 mb-6">
              No worries, we'll send you reset instructions.
            </p>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-md p-3 mb-6 flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-zinc-400 text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  required
                />
                {email && !emailValid && (
                  <p className="text-red-400 text-xs mt-1">Please enter a valid email</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!emailValid || loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Reset password'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-white hover:underline">
                ← Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
