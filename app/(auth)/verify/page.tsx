'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { verifyEmailOTP, resendOTP } from '@/app/actions/auth';
import { Loader2, AlertCircle, Check, Timer } from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();
  
  // Get email from query params
  const email = searchParams.get('email');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.push('/register');
    }
  }, [email, router]);
  
  // Focus the input on mount
  useEffect(() => {
    if (email) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [email]);
  
  // Countdown for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || otp.length !== 8) {
      setError('Please enter the 8-digit code');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    const result = await verifyEmailOTP(email, otp);
    
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    
    // Success - profile should now be created
    setSuccess(true);
    setLoading(false);
    
    // Wait a moment then redirect to onboarding
    await refreshProfile();
    setTimeout(() => {
      router.push('/profiles');
      router.refresh();
    }, 1500);
  };
  
  const handleResend = async () => {
    if (!email || resendLoading || countdown > 0) return;
    
    setResendLoading(true);
    setError(null);
    
    const result = await resendOTP(email);
    
    if (result.error) {
      setError(result.error.message);
    } else {
      setResendSuccess(true);
      setCountdown(60); // 60 second cooldown
      setTimeout(() => setResendSuccess(false), 3000);
    }
    
    setResendLoading(false);
  };
  
  // Handle paste event
  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedData = e.clipboardData.getData('text');
    // Only allow digits
    const digits = pastedData.replace(/\D/g, '');
    if (digits.length === 8) {
      setOtp(digits);
      e.preventDefault();
    }
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
                Email Verified!
              </h1>
              <p className="text-zinc-400 mb-6">
                Your account has been created successfully.
              </p>
              <p className="text-zinc-500 text-sm">
                Redirecting to setup...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  if (!email) {
    return null; // Will redirect
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
              Check your email
            </h1>
            <p className="text-zinc-400 mb-6">
              We sent an 8-digit verification code to{' '}
              <strong className="text-white">{email}</strong>
            </p>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-md p-3 mb-6 flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={8}
                  value={otp}
                  onChange={setOtp}
                  onPaste={handlePaste}
                  className="gap-2"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} ref={inputRef} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                    <InputOTPSlot index={6} />
                    <InputOTPSlot index={7} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                disabled={otp.length !== 8 || loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Verify'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-zinc-400 text-sm mb-3">
                Didn't receive the code?
              </p>
              <Button
                variant="link"
                onClick={handleResend}
                disabled={resendLoading || countdown > 0}
                className="text-white"
              >
                {resendLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : countdown > 0 ? (
                  <Timer className="w-4 h-4 mr-2" />
                ) : null}
                {countdown > 0 
                  ? `Resend in ${countdown}s` 
                  : resendSuccess 
                    ? 'Code sent!' 
                    : 'Resend code'}
              </Button>
            </div>

            <div className="mt-6 text-center">
              <span className="text-zinc-400">Wrong email? </span>
              <Link href="/register" className="text-white hover:underline">
                Go back
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
