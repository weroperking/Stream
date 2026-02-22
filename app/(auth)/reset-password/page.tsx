'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPassword } from '@/app/actions/auth';
import { Loader2, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  
  // Check if user has a valid session (from reset link)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsValidToken(false);
      } else {
        setIsValidToken(true);
      }
    };
    checkSession();
  }, [supabase]);
  
  const passwordValid = password.length >= 4 && password.length <= 60;
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const canSubmit = passwordValid && passwordsMatch && !loading;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordValid) {
      setError('Password must be between 4 and 60 characters');
      return;
    }
    
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    const result = await resetPassword(password);
    
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    
    // Success
    setSuccess(true);
    setLoading(false);
    
    // Redirect to login after a delay
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };
  
  // Loading state - checking token
  if (isValidToken === null) {
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
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </main>
      </div>
    );
  }
  
  // Invalid token - link expired or invalid
  if (isValidToken === false) {
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
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">
                Invalid or expired link
              </h1>
              <p className="text-zinc-400 mb-6">
                This password reset link has expired or is invalid. 
                Please request a new password reset.
              </p>
              <Link href="/forgot-password">
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                  Request new reset link
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Success state
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
                Password reset!
              </h1>
              <p className="text-zinc-400 mb-6">
                Your password has been successfully reset.
              </p>
              <p className="text-zinc-500 text-sm">
                Redirecting to sign in...
              </p>
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
              Reset password
            </h1>
            <p className="text-zinc-400 mb-6">
              Enter a new password for your account.
            </p>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-md p-3 mb-6 flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-zinc-400 text-sm">
                  New password
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
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
                {password && !passwordValid && (
                  <p className="text-red-400 text-xs mt-1">
                    Password must be between 4 and 60 characters
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-zinc-400 text-sm">
                  Confirm new password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  required
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-red-400 text-xs mt-1">
                    Passwords do not match
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Reset password'
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
