import { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Eye, EyeOff, Loader2, AlertCircle, User, Phone, ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { countryCodes } from '@/utils/countryCodes';
import { validatePhoneNumber, formatPhoneE164, cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface SignUpStepProps {
  onNext: () => void;
}

const signUpSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  phoneNumber: z.string().optional(),
});

const signInSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const SignUpStep = forwardRef<HTMLDivElement, SignUpStepProps>(
  ({ onNext }, ref) => {
    const { signUp, signIn, resetPassword } = useAuth();
    const [isSignIn, setIsSignIn] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetStep, setResetStep] = useState<'email' | 'code' | 'newpass' | 'done'>('email');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [openCountry, setOpenCountry] = useState(false);
    const [countryCode, setCountryCode] = useState('+1');
    const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phoneNumber: '',
    });

    const handleInputChange = (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: '' }));
      setGeneralError('');
    };

    const handleEmailAuth = async () => {
      setIsLoading(true);
      setGeneralError('');
      setErrors({});

      try {
        const schema = isSignIn ? signInSchema : signUpSchema;
        const result = schema.safeParse(formData);

        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        if (isSignIn) {
          const { error } = await signIn(formData.email, formData.password);
          if (error) {
            setGeneralError(error);
          } else {
            onNext();
          }
        } else {
          let formattedPhone = undefined;
          if (formData.phoneNumber.trim()) {
            formattedPhone = formatPhoneE164(formData.phoneNumber, countryCode);
            if (!validatePhoneNumber(formattedPhone)) {
              setErrors((prev) => ({ ...prev, phoneNumber: 'Please enter a valid phone number' }));
              setIsLoading(false);
              return;
            }
          }

          const { error } = await signUp(
            formData.email,
            formData.password,
            formData.firstName.trim(),
            formData.lastName.trim(),
            formattedPhone
          );
          if (error) {
            setGeneralError(error);
          } else {
            onNext();
          }
        }
      } catch (err) {
        setGeneralError('An unexpected error occurred');
      }

      setIsLoading(false);
    };

    const handleForgotPassword = async () => {
      if (!forgotEmail.trim()) {
        setGeneralError('Please enter your email address');
        return;
      }
      setResetLoading(true);
      setGeneralError('');
      try {
        // Use signInWithOtp — sends a 6-digit code by default, no template config needed
        const { error } = await supabase.auth.signInWithOtp({
          email: forgotEmail.trim(),
          options: { shouldCreateUser: false },
        });
        if (error) {
          setGeneralError(error.message);
        } else {
          setResetSent(true);
          setResetStep('code');
        }
      } catch {
        setGeneralError('Failed to send code');
      }
      setResetLoading(false);
    };

    const handleVerifyCode = async () => {
      if (!resetCode.trim() || resetCode.length < 6) {
        setGeneralError('Please enter the 6-digit code from your email');
        return;
      }
      setResetLoading(true);
      setGeneralError('');
      try {
        const { error } = await supabase.auth.verifyOtp({
          email: forgotEmail.trim(),
          token: resetCode.trim(),
          type: 'email',
        });
        if (error) {
          setGeneralError(error.message);
        } else {
          // User is now authenticated — move to new password step
          setResetStep('newpass');
        }
      } catch {
        setGeneralError('Invalid or expired code');
      }
      setResetLoading(false);
    };

    const handleSetNewPassword = async () => {
      if (newPassword.length < 4) {
        setGeneralError('Password must be at least 4 characters');
        return;
      }
      setResetLoading(true);
      setGeneralError('');
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          setGeneralError(error.message);
        } else {
          // Sign out so they re-login with the new password
          await supabase.auth.signOut();
          setResetStep('done');
        }
      } catch {
        setGeneralError('Failed to update password');
      }
      setResetLoading(false);
    };

    return (
      <div
        ref={ref}
        className="flex flex-col h-full text-foreground overflow-hidden"
      >
        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Header */}
          <div className="px-6 pt-8 pb-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold text-center mb-2"
            >
              {isSignIn ? 'Welcome Back' : 'Create Account'}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-muted-foreground text-center text-sm"
            >
              {isSignIn
                ? 'Sign in to continue your journey'
                : 'Join the 10,000 steps challenge'}
            </motion.p>
          </div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="px-6 space-y-4 pb-48"
          >
            {/* Name Fields - Only for Sign Up */}
            <AnimatePresence mode="wait">
              {!isSignIn && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm">
                        First Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={(e) =>
                            handleInputChange('firstName', e.target.value)
                          }
                          className={`pl-10 ${errors.firstName ? 'border-destructive' : ''}`}
                          autoComplete="given-name"
                          maxLength={50}
                        />
                      </div>
                      {errors.firstName && (
                        <p className="text-xs text-destructive">{errors.firstName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Smith"
                        value={formData.lastName}
                        onChange={(e) =>
                          handleInputChange('lastName', e.target.value)
                        }
                        className={errors.lastName ? 'border-destructive' : ''}
                        autoComplete="family-name"
                        maxLength={50}
                      />
                      {errors.lastName && (
                        <p className="text-xs text-destructive">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2 pb-1">
                    <Label htmlFor="phoneNumber" className="text-sm">
                      Phone Number <span className="text-muted-foreground">(Optional)</span>
                    </Label>
                    <div className="flex gap-2">
                      <Popover open={openCountry} onOpenChange={setOpenCountry}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCountry}
                            className="w-24 justify-between px-3"
                          >
                            {countryCode}
                            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search country..." />
                            <CommandList>
                              <CommandEmpty>No country found.</CommandEmpty>
                              <CommandGroup>
                                {countryCodes.map((c, index) => (
                                  <CommandItem
                                    key={`${c.code}-${c.name}-${index}`}
                                    value={`${c.name} ${c.code}`}
                                    onSelect={() => {
                                      setCountryCode(c.code);
                                      setOpenCountry(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        countryCode === c.code ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="flex-1 text-sm">{c.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">{c.code} {c.flag}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="555 123 4567"
                        value={formData.phoneNumber}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[^\d\s]/g, '');
                          handleInputChange('phoneNumber', cleaned);
                        }}
                        className={`flex-1 ${errors.phoneNumber ? 'border-destructive' : ''}`}
                        autoComplete="tel-national"
                        maxLength={15}
                      />
                    </div>
                    {errors.phoneNumber && (
                      <p className="text-xs text-destructive mt-1">{errors.phoneNumber}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isSignIn ? '••••••••' : 'Min 4 characters'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                  autoComplete={isSignIn ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
              {isSignIn && (
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setForgotEmail(formData.email); setResetSent(false); setGeneralError(''); }}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  Forgot password?
                </button>
              )}
            </div>

            {/* General Error */}
            <AnimatePresence>
              {generalError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{generalError}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Fixed CTA & Toggle - Always Visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex-shrink-0 px-6 pt-4 space-y-4 safe-area-pb-cta"
        >
          <Button
            onClick={handleEmailAuth}
            disabled={isLoading}
            size="lg"
            className="w-full h-12 text-base font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {isSignIn ? 'Signing in...' : 'Creating account...'}
              </>
            ) : isSignIn ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground pb-2">
            {isSignIn ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setIsSignIn(!isSignIn);
                setErrors({});
                setGeneralError('');
                setShowForgotPassword(false);
                setResetSent(false);
              }}
              className="text-primary font-medium hover:underline"
            >
              {isSignIn ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </motion.div>

        {/* Forgot Password Dialog — OTP Code Flow */}
        {showForgotPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm bg-background border border-border rounded-2xl p-6 shadow-xl"
            >
              {/* Step 1: Enter Email */}
              {resetStep === 'email' && (
                <>
                  <h3 className="text-lg font-bold mb-1 text-center">Reset Password</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    We'll send a 6-digit code to your email
                  </p>
                  <div className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => { setForgotEmail(e.target.value); setGeneralError(''); }}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                    {generalError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {generalError}
                      </p>
                    )}
                    <Button onClick={handleForgotPassword} disabled={resetLoading} className="w-full">
                      {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Send Code
                    </Button>
                    <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setShowForgotPassword(false); setGeneralError(''); setResetStep('email'); }}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}

              {/* Step 2: Enter Code */}
              {resetStep === 'code' && (
                <>
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-1 text-center">Enter Code</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Check <strong>{forgotEmail}</strong> for a 6-digit code
                  </p>
                  <div className="space-y-3">
                    <Input
                      type="text"
                      placeholder="000000"
                      value={resetCode}
                      onChange={(e) => { setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setGeneralError(''); }}
                      className="text-center text-2xl tracking-[0.5em] font-mono"
                      maxLength={6}
                      autoFocus
                    />
                    {generalError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {generalError}
                      </p>
                    )}
                    <Button onClick={handleVerifyCode} disabled={resetLoading || resetCode.length < 6} className="w-full">
                      {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Verify Code
                    </Button>
                    <Button variant="ghost" className="w-full text-muted-foreground text-xs" onClick={() => { setResetStep('email'); setResetCode(''); setGeneralError(''); }}>
                      Didn't get it? Try again
                    </Button>
                  </div>
                </>
              )}

              {/* Step 3: New Password */}
              {resetStep === 'newpass' && (
                <>
                  <h3 className="text-lg font-bold mb-1 text-center">New Password</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Choose your new password
                  </p>
                  <div className="space-y-3">
                    <Input
                      type="password"
                      placeholder="Enter new password (min 4 chars)"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setGeneralError(''); }}
                      autoFocus
                    />
                    {generalError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {generalError}
                      </p>
                    )}
                    <Button onClick={handleSetNewPassword} disabled={resetLoading || newPassword.length < 4} className="w-full">
                      {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Update Password
                    </Button>
                  </div>
                </>
              )}

              {/* Step 4: Done */}
              {resetStep === 'done' && (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-7 w-7 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Password Updated!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You can now sign in with your new password
                  </p>
                  <Button onClick={() => { setShowForgotPassword(false); setResetStep('email'); setResetCode(''); setNewPassword(''); setResetSent(false); }} className="w-full">
                    Back to Sign In
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    );
  }
);

SignUpStep.displayName = 'SignUpStep';
