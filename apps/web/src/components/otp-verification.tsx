'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Input } from '@smartduka/ui';
import { Loader2, Mail, CheckCircle, RefreshCw, Shield, AlertCircle } from 'lucide-react';
import { config } from '@/lib/config';

interface OtpVerificationProps {
  email: string;
  shopName: string;
  onVerified: () => void;
  onCancel?: () => void;
}

export function OtpVerification({ email, shopName, onVerified, onCancel }: OtpVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Send OTP on mount
  useEffect(() => {
    sendOtp();
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendOtp = async () => {
    setIsSending(true);
    setError('');
    
    try {
      const res = await fetch(`${config.apiUrl}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, shopName }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }
      
      setOtpSent(true);
      setResendCooldown(60); // 60 second cooldown
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');
    
    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all digits entered
    if (digit && index === 5) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        verifyOtp(fullOtp);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace - move to previous input
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6);
        if (digits.length > 0) {
          const newOtp = [...otp];
          for (let i = 0; i < digits.length && i < 6; i++) {
            newOtp[i] = digits[i];
          }
          setOtp(newOtp);
          
          // Focus last filled input or submit
          if (digits.length >= 6) {
            verifyOtp(digits.slice(0, 6));
          } else {
            inputRefs.current[digits.length]?.focus();
          }
        }
      });
    }
  };

  const verifyOtp = async (code?: string) => {
    const otpCode = code || otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${config.apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode, type: 'registration' }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Invalid verification code');
      }
      
      setSuccess(true);
      setTimeout(() => onVerified(), 1000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setOtp(['', '', '', '', '', '']);
    setError('');
    await sendOtp();
    inputRefs.current[0]?.focus();
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Email Verified!</h3>
        <p className="text-muted-foreground">Completing your registration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-full mb-4">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Verify Your Email</h3>
        <p className="text-muted-foreground text-sm">
          We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          <p className="font-medium">Security Verification</p>
          <p className="text-amber-700 dark:text-amber-400 mt-0.5">
            This helps us verify you own this email address.
          </p>
        </div>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-2 sm:gap-3">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={isLoading || isSending}
            className={`
              w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold
              border-2 rounded-lg transition-all
              focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              ${digit ? 'border-primary bg-primary/5' : 'border-border bg-background'}
              ${error ? 'border-red-400 shake' : ''}
            `}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Verify Button */}
      <Button
        type="button"
        onClick={() => verifyOtp()}
        disabled={isLoading || otp.join('').length !== 6}
        className="w-full h-12 text-base font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Verifying...
          </>
        ) : (
          'Verify Email'
        )}
      </Button>

      {/* Resend */}
      <div className="text-center text-sm">
        <span className="text-muted-foreground">Didn&apos;t receive the code? </span>
        {resendCooldown > 0 ? (
          <span className="text-muted-foreground">Resend in {resendCooldown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isSending}
            className="text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            {isSending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                Resend Code
              </>
            )}
          </button>
        )}
      </div>

      {/* Check spam notice */}
      <p className="text-xs text-center text-muted-foreground">
        Check your spam folder if you don&apos;t see the email in your inbox.
      </p>

      {/* Cancel */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
        >
          ← Go back
        </button>
      )}

      <style jsx>{`
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
