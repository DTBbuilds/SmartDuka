'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge, Input, Label, Separator } from '@smartduka/ui';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Shield, Eye, EyeOff, Check, X, Loader2, AlertTriangle, Mail, Key, Smartphone, History } from 'lucide-react';
import { cn } from '@smartduka/ui';

interface SecuritySettingsProps {
  userEmail: string;
  onPasswordChange: (data: { currentPassword: string; newPassword: string; otpCode: string }) => Promise<void>;
  onRequestOtp: () => Promise<void>;
  isLoading: boolean;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['bg-red-500', 'bg-red-400', 'bg-yellow-500', 'bg-yellow-400', 'bg-green-500', 'bg-green-600'];

  return {
    score,
    label: labels[score],
    color: colors[score],
  };
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={cn(
      "flex items-center gap-2 text-sm transition-colors",
      met ? "text-green-600" : "text-muted-foreground"
    )}>
      {met ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-gray-400" />
      )}
      <span>{text}</span>
    </div>
  );
}

export function SecuritySettings({ userEmail, onPasswordChange, onRequestOtp, isLoading }: SecuritySettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const strength = calculatePasswordStrength(newPassword);

  const requirements = [
    { met: newPassword.length >= 6, text: 'At least 6 characters' },
    { met: newPassword.length >= 10, text: 'At least 10 characters (recommended)' },
    { met: /[A-Z]/.test(newPassword), text: 'Contains uppercase letter' },
    { met: /[0-9]/.test(newPassword), text: 'Contains number' },
    { met: /[^A-Za-z0-9]/.test(newPassword), text: 'Contains special character' },
  ];

  const metRequirements = requirements.filter(r => r.met).length;

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleRequestOtp = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    setError(null);
    try {
      await onRequestOtp();
      setStep('otp');
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    }
  };

  const handleSubmit = async () => {
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setError(null);
    try {
      await onPasswordChange({
        currentPassword,
        newPassword,
        otpCode,
      });
      // Reset on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setStep('form');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Status Card */}
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-300">Your account is secure</h3>
              <p className="text-sm text-green-800/80 dark:text-green-300/70">
                Password changes require email verification for added security
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure. You'll need to verify with an email code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'form' ? (
            <>
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Separator />

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Password Strength</span>
                      <span className={cn(
                        "font-medium",
                        strength.score >= 4 ? "text-green-600" : strength.score >= 2 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {strength.label}
                      </span>
                    </div>
                    <Progress value={(strength.score / 5) * 100} className="h-2" />
                  </div>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium mb-3">Password Requirements</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {requirements.map((req, index) => (
                    <PasswordRequirement key={index} met={req.met} text={req.text} />
                  ))}
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Check className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className={cn(
                      "pl-9 pr-10",
                      confirmPassword && newPassword !== confirmPassword && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleRequestOtp} 
                disabled={isLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* OTP Verification Step */}
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-300">Check your email</h4>
                    <p className="text-sm text-blue-800/80 dark:text-blue-300/70 mt-1">
                      We've sent a 6-digit verification code to <strong>{userEmail}</strong>. Enter it below to confirm your password change.
                    </p>
                  </div>
                </div>
              </div>

              {/* OTP Input */}
              <div className="space-y-2">
                <Label htmlFor="otpCode">Verification Code</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Smartphone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="otpCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="pl-10 text-center text-2xl tracking-[0.5em] font-mono h-12"
                    />
                  </div>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isLoading || otpCode.length !== 6}
                    className="h-12 px-8"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Verify & Change
                  </Button>
                </div>
              </div>

              {/* Resend & Cancel */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                  disabled={cooldown > 0}
                  onClick={handleRequestOtp}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend verification code'}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep('form');
                    setOtpCode('');
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>Use a unique password that you don't use on other sites</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>Include a mix of uppercase, lowercase, numbers, and symbols</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>Avoid using personal information like birthdays or names</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>Change your password regularly for better security</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
