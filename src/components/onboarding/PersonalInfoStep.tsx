import { forwardRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Loader2, AtSign, MapPin, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AvatarSelector } from '@/components/profile/AvatarSelector';
import { AIAvatarGenerator } from '@/components/profile/AIAvatarGenerator';
import { detectCountryFromTimezone, COUNTRIES, getCountryByCode } from '@/utils/countryDetection';


interface PersonalInfoStepProps {
  onNext: () => void;
}

export const PersonalInfoStep = forwardRef<HTMLDivElement, PersonalInfoStepProps>(
  ({ onNext }, ref) => {
    const { user } = useAuth();
    const [username, setUsername] = useState('');
    const [avatarId, setAvatarId] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [country, setCountry] = useState<string | null>(null);
    const [countrySearch, setCountrySearch] = useState('');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-detect country from timezone on mount
    useEffect(() => {
      const detected = detectCountryFromTimezone();
      if (detected) {
        setCountry(detected);
      }
    }, []);

    const validateForm = (): boolean => {
      const newErrors: Record<string, string> = {};

      if (!username.trim()) {
        newErrors.username = 'Username is required';
      } else if (username.trim().length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        newErrors.username = 'Username can only contain letters, numbers, and underscores';
      }

      if (!avatarId) {
        newErrors.avatarId = 'Please select an avatar';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleContinue = async () => {
      if (!validateForm()) return;

      setIsSubmitting(true);

      try {
        if (user) {
          // Check if username is already taken
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username.trim().toLowerCase())
            .single();

          if (existingUser && existingUser.id !== user.id) {
            setErrors({ username: 'This username is already taken' });
            setIsSubmitting(false);
            return;
          }

          const updatePayload: Record<string, any> = {
              username: username.trim().toLowerCase(),
              avatar_id: avatarId,
              avatar_url: avatarUrl,
          };
          if (country) {
            updatePayload.country = country;
          }
          const { error } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', user.id);

          if (error) {
            console.error('[PersonalInfo] Error saving profile:', error);
          }
        }
      } catch (error) {
        console.error('[PersonalInfo] Unexpected error:', error);
      }

      setIsSubmitting(false);
      onNext();
    };

    return (
      <div
        ref={ref}
        className="flex flex-col h-full bg-background text-foreground overflow-hidden"
      >
        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Header */}
          <div className="px-6 pt-8 pb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
            >
              <User className="w-8 h-8 text-primary" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-2xl font-bold text-center mb-2"
            >
              Tell us about yourself
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-muted-foreground text-center text-sm"
            >
              Your name will appear on the leaderboard
            </motion.p>
          </div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="px-6 space-y-5 pb-6"
          >
            {/* Username Selection */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Create Username <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="hotstepper_king"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase());
                    if (errors.username) {
                      setErrors((prev) => ({ ...prev, username: '' }));
                    }
                  }}
                  className={`pl-10 ${errors.username ? 'border-destructive' : ''}`}
                  autoComplete="off"
                  maxLength={30}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username}</p>
              )}
            </div>

            {/* Country Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                <MapPin className="inline h-4 w-4 mr-1 -mt-0.5" />
                Your Country
              </Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {country ? (
                      <>
                        <span className="text-lg">{getCountryByCode(country)?.flag}</span>
                        <span>{getCountryByCode(country)?.name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Select your country</span>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
                </button>

                {showCountryPicker && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search countries..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="pl-8 h-9"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {COUNTRIES
                        .filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
                        .map(c => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setCountry(c.code);
                              setShowCountryPicker(false);
                              setCountrySearch('');
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${
                              country === c.code ? 'bg-primary/10 text-primary font-medium' : ''
                            }`}
                          >
                            <span className="text-lg">{c.flag}</span>
                            <span>{c.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Used for the local leaderboard. Auto-detected from your timezone.</p>
            </div>

            {/* Avatar Selection */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Choose Avatar <span className="text-destructive">*</span>
                </Label>
                {errors.avatarId && (
                  <span className="text-xs text-destructive animate-pulse">Required</span>
                )}
              </div>

              <div className="bg-secondary/20 p-4 rounded-xl border border-border">
                <AIAvatarGenerator 
                  onAvatarGenerated={(url) => {
                    setAvatarUrl(url);
                    setAvatarId('custom_ai');
                    if (errors.avatarId) {
                      setErrors((prev) => ({ ...prev, avatarId: '' }));
                    }
                  }} 
                />
                
                {avatarUrl && avatarId === 'custom_ai' && (
                  <div className="mt-4 flex flex-col items-center">
                    <div className="text-xs text-muted-foreground mb-2">Current AI Generated Avatar:</div>
                    <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                      <img src={avatarUrl} alt="AI Avatar" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center my-2">-- OR Select Classic Avatar --</div>

              <AvatarSelector 
                selectedId={avatarId} 
                onSelect={(id) => {
                  setAvatarId(id);
                  if (errors.avatarId) {
                    setErrors((prev) => ({ ...prev, avatarId: '' }));
                  }
                }} 
              />
            </div>

            {/* Identity Notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border"
            >
              <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Your username and avatar will be public on the leaderboard. Protect your privacy by choosing a creative identity.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Fixed Privacy Badge & CTA - Always Visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex-shrink-0 px-6 pt-4 space-y-4 safe-area-pb-cta"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Your data is encrypted and secure</span>
          </div>

          <Button
            onClick={handleContinue}
            disabled={isSubmitting}
            size="lg"
            className="w-full h-14 text-lg font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </motion.div>
      </div>
    );
  }
);

PersonalInfoStep.displayName = 'PersonalInfoStep';
