import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Key, Mail, User, ShieldCheck, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";


const signUpSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters").max(20, "Name must be less than 20 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  accessCode: z.string().min(4, "Access code is required"),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    accessCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const { user, signUp, signIn } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/onboarding");
    }
  }, [user, navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isSignUp) {
        const result = signUpSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.displayName,
          formData.accessCode
        );

        if (error) {
          setErrors({ general: error });
        } else {
          console.log("Registration successful");
        }
      } else {
        const result = signInSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);

        if (error) {
          setErrors({ general: error });
        }
      }
    } catch (err) {
      setErrors({ general: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col justify-center px-4 py-8 overflow-hidden">
      {/* Background effects - FIXED: removed pointer-events-none from container */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[80px]" />
      </div>

      {/* Scrollable content wrapper */}
      <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full py-8">
          {/* Header */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo icon */}
            <motion.div
              className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center"
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Footprints className="h-10 w-10 text-primary" />
            </motion.div>

            <motion.h1
              className="text-3xl font-bold tracking-[0.2em] uppercase text-gradient-cyan mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              HOTSTEPPER
            </motion.h1>
            <motion.p
              className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              The Hotstepper Challenge
            </motion.p>
          </motion.div>

          {/* Auth Card */}
          <motion.div
            className="tactical-card max-w-sm mx-auto w-full p-6"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            {/* Toggle - FIXED: Added explicit z-index */}
            <div className="flex mb-6 rounded-xl bg-secondary/80 p-1 border border-border/50 relative z-20">
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg transition-all duration-300 touch-target ${
                  !isSignUp
                    ? 'bg-gradient-to-r from-primary to-cyan-dark text-primary-foreground shadow-glow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg transition-all duration-300 touch-target ${
                  isSignUp
                    ? 'bg-gradient-to-r from-primary to-cyan-dark text-primary-foreground shadow-glow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* Display Name (Sign Up only) */}
              <AnimatePresence mode="wait">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Callsign
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                      <Input
                        type="text"
                        placeholder="THE HOTSTEPPER"
                        value={formData.displayName}
                        onChange={(e) => handleInputChange("displayName", e.target.value)}
                        className="pl-10 bg-secondary/50 border-border/60 text-foreground placeholder:text-muted-foreground/50 uppercase focus:border-primary/50 focus:ring-primary/20 transition-all relative z-10"
                      />
                    </div>
                    {errors.displayName && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.displayName}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type="email"
                    placeholder="operator@protocol.io"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10 bg-secondary/50 border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 transition-all relative z-10"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pl-10 pr-10 bg-secondary/50 border-border/60 text-foreground focus:border-primary/50 focus:ring-primary/20 transition-all relative z-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground touch-target transition-colors z-20"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Access Code (Sign Up only) */}
              <AnimatePresence mode="wait">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Verification Code
                    </label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                      <Input
                        type="text"
                        placeholder="XXXX-XXXX"
                        value={formData.accessCode}
                        onChange={(e) => handleInputChange("accessCode", e.target.value.toUpperCase())}
                        className="pl-10 bg-secondary/50 border-border/60 text-foreground placeholder:text-muted-foreground/50 uppercase tracking-widest focus:border-primary/50 focus:ring-primary/20 transition-all relative z-10"
                      />
                    </div>
                    {errors.accessCode && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.accessCode}</p>
                    )}
                    <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                      Enter the code sent through email
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* General Error Message */}
              {errors.general && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center"
                >
                  <p className="text-sm text-destructive font-semibold">{errors.general}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.div
                className="pt-2"
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  variant="tactical"
                  size="full"
                  disabled={loading}
                  className="h-14 text-base font-bold uppercase tracking-widest shadow-glow-md hover:shadow-glow-lg transition-all relative z-10"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : isSignUp ? (
                    "Join the Protocol"
                  ) : (
                    "Access Dashboard"
                  )}
                </Button>
              </motion.div>
            </form>
          </motion.div>

          {/* Footer - FIXED: Added clickable link to switch modes */}
          <motion.div
            className="text-center mt-8 text-xs text-muted-foreground/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {isSignUp ? (
              <p>
                Already have access?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-primary hover:text-primary/80 underline font-semibold transition-colors"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Need access?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-primary hover:text-primary/80 underline font-semibold transition-colors"
                >
                  Register
                </button>
                {' '}to receive your code.
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
