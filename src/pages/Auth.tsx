import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Key, Mail, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();

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
          toast({
            title: "Registration Failed",
            description: error,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome to the Protocol",
            description: "Your account has been created successfully.",
          });
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
          toast({
            title: "Login Failed",
            description: error,
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-safe flex flex-col justify-center px-4 safe-area-y">
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold uppercase tracking-[0.25em] text-foreground mb-2">
          Hotstepper
        </h1>
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Protocol Access
        </p>
      </motion.div>

      {/* Auth Card */}
      <motion.div 
        className="tactical-card max-w-sm mx-auto w-full"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Toggle */}
        <div className="flex mb-6 rounded-lg bg-secondary p-1">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 text-sm font-semibold uppercase tracking-wider rounded-md transition-smooth touch-target ${
              !isSignUp ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 text-sm font-semibold uppercase tracking-wider rounded-md transition-smooth touch-target ${
              isSignUp ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name (Sign Up only) */}
          {isSignUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Callsign
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="THE HOTSTEPPER"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange("displayName", e.target.value)}
                  className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground uppercase"
                />
              </div>
              {errors.displayName && (
                <p className="mt-1 text-xs text-destructive">{errors.displayName}</p>
              )}
            </motion.div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="operator@protocol.io"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Password
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="pl-10 pr-10 bg-secondary border-border text-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground touch-target"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Access Code (Sign Up only) */}
          {isSignUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Access Code
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ENTER CODE"
                  value={formData.accessCode}
                  onChange={(e) => handleInputChange("accessCode", e.target.value.toUpperCase())}
                  className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground uppercase tracking-widest"
                />
              </div>
              {errors.accessCode && (
                <p className="mt-1 text-xs text-destructive">{errors.accessCode}</p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                Access codes are provided with your purchase
              </p>
            </motion.div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="tactical"
            size="full"
            disabled={loading}
            className="mt-6 press-scale"
          >
            {loading ? (
              <span className="animate-pulse">Processing...</span>
            ) : isSignUp ? (
              "Join the Protocol"
            ) : (
              "Access Dashboard"
            )}
          </Button>
        </form>
      </motion.div>

      {/* Footer */}
      <motion.p 
        className="text-center mt-6 text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {isSignUp 
          ? "Already have access? Switch to Sign In above."
          : "Need access? Purchase the Protocol to receive your code."}
      </motion.p>
    </div>
  );
};

export default Auth;
