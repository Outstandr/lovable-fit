import { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Eye, EyeOff, Loader2, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

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
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const signInSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const SignUpStep = forwardRef<HTMLDivElement, SignUpStepProps>(
  ({ onNext }, ref) => {
    const { signUp, signIn, signInWithGoogle } = useAuth();
    const [isSignIn, setIsSignIn] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
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
          const { error } = await signUp(
            formData.email,
            formData.password,
            formData.firstName.trim(),
            formData.lastName.trim()
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

    const handleGoogleSignIn = async () => {
      setIsGoogleLoading(true);
      setGeneralError('');

      try {
        const { error } = await signInWithGoogle();
        if (error) {
          setGeneralError(error);
        }
        // OAuth redirects, so onNext will be handled after redirect
      } catch (err) {
        setGeneralError('Failed to connect with Google');
      }

      setIsGoogleLoading(false);
    };

    return (
      <div
        ref={ref}
        className="flex flex-col min-h-screen bg-background text-foreground overflow-y-auto"
      >
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

        {/* Social Sign In */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="px-6 mb-4"
        >
          <Button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            variant="outline"
            size="lg"
            className="w-full h-12 font-medium"
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="px-6 mb-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex-1 px-6 space-y-4"
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
                placeholder={isSignIn ? '••••••••' : 'Min 8 characters'}
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

        {/* CTA & Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="px-6 pb-8 pt-4 space-y-4"
        >
          <Button
            onClick={handleEmailAuth}
            disabled={isLoading || isGoogleLoading}
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

          <p className="text-center text-sm text-muted-foreground">
            {isSignIn ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setIsSignIn(!isSignIn);
                setErrors({});
                setGeneralError('');
              }}
              className="text-primary font-medium hover:underline"
            >
              {isSignIn ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </motion.div>
      </div>
    );
  }
);

SignUpStep.displayName = 'SignUpStep';
